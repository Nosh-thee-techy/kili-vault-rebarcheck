/**
 * RebarCheck Meta Model API adapter.
 *
 * This is the ONLY module that talks to the Meta Model API (SAM 3.1 and
 * Muse Spark). Request and response field names that are not confirmed in
 * official docs are marked TODO(verify against Meta Model API docs). When
 * the call fails or env is missing, callers fall back to classical
 * segmentation / template explanation.
 */

"use strict";

const logger = require("../utils/logger");

const DEFAULT_TIMEOUT_MS = 30_000;
const DISCLAIMER =
  "Visual spacing check from a photo. Not an engineer's sign-off. Pending human verification.";

class MetaModelError extends Error {
  /**
   * @param {string} code typed error code (CONFIG | TIMEOUT | HTTP | PARSE)
   * @param {string} message
   * @param {number} [statusCode]
   */
  constructor(code, message, statusCode = 502) {
    super(message);
    this.name = "MetaModelError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

function getConfig() {
  const apiKey = process.env.META_API_KEY;
  const baseUrl = (process.env.META_API_BASE_URL || "").replace(/\/$/, "");
  return { apiKey, baseUrl };
}

/**
 * Fetch with a timeout and a single retry on 5xx / network timeout.
 *
 * @param {string} url
 * @param {RequestInit} init
 * @param {number} [timeoutMs]
 */
async function fetchWithRetry(url, init, timeoutMs = DEFAULT_TIMEOUT_MS) {
  let lastError;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { ...init, signal: controller.signal });
      clearTimeout(timer);
      if (response.status >= 500 && attempt === 0) {
        lastError = new MetaModelError(
          "HTTP",
          `Meta Model API ${response.status}`,
          response.status,
        );
        continue;
      }
      return response;
    } catch (err) {
      clearTimeout(timer);
      const timedOut = err && (err.name === "AbortError" || err.code === "ABORT_ERR");
      lastError = new MetaModelError(
        timedOut ? "TIMEOUT" : "HTTP",
        timedOut ? "Meta Model API timed out" : err.message,
      );
      if (attempt === 0) continue;
      throw lastError;
    }
  }
  throw lastError;
}

/**
 * Segment an image with SAM 3.1 via the Meta Model API.
 *
 * @param {Buffer} imageBuffer JPEG/PNG bytes
 * @param {string[]} prompts concept prompts (bars, then reference object)
 * @returns {Promise<{ bars: object[], reference: object | null, raw: object }>}
 */
async function segmentWithSam(imageBuffer, prompts) {
  const { apiKey, baseUrl } = getConfig();
  if (!apiKey || !baseUrl) {
    throw new MetaModelError(
      "CONFIG",
      "META_API_KEY or META_API_BASE_URL is not set",
      503,
    );
  }

  // TODO(verify against Meta Model API docs): path, multipart field names,
  // and whether SAM 3.1 wants a text/concept prompt per mask or a single
  // multi-prompt payload. Do not invent a production contract here.
  const url = `${baseUrl}/v1/segment`;
  const form = new FormData();
  form.append(
    "image",
    new Blob([imageBuffer]),
    "rebar.jpg",
  );
  form.append("prompts", JSON.stringify(prompts || []));

  const response = await fetchWithRetry(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });

  if (!response.ok) {
    throw new MetaModelError(
      "HTTP",
      `SAM 3.1 request failed (${response.status})`,
      response.status,
    );
  }

  let body;
  try {
    body = await response.json();
  } catch {
    throw new MetaModelError("PARSE", "SAM 3.1 response was not JSON");
  }

  // TODO(verify against Meta Model API docs): map the real mask encoding
  // (dense array vs RLE vs polygons) onto { bars, reference }.
  const bars = Array.isArray(body.bars) ? body.bars : body.masks || [];
  const reference = body.reference || null;
  return { bars, reference, raw: body };
}

/**
 * Ask Muse Spark to restate a numeric RebarCheck result in plain language.
 *
 * Only the structured numbers are sent. The model is forbidden from inventing
 * measurements or using "approved" / "safe" / "compliant".
 *
 * @param {object} structuredResult analyzer JSON (ok/result/summary/...)
 * @returns {Promise<string>}
 */
async function explainWithMuseSpark(structuredResult) {
  const { apiKey, baseUrl } = getConfig();
  if (!apiKey || !baseUrl) {
    throw new MetaModelError(
      "CONFIG",
      "META_API_KEY or META_API_BASE_URL is not set",
      503,
    );
  }

  const numericPayload = {
    result: structuredResult.result,
    confidence: structuredResult.confidence,
    spec: structuredResult.spec,
    summary: structuredResult.summary,
    violations: structuredResult.violations,
    barCount: structuredResult.barCount,
    warnings: structuredResult.warnings,
  };

  // TODO(verify against Meta Model API docs): model id, messages schema,
  // and whether Muse Spark uses a chat-completions style endpoint.
  const url = `${baseUrl}/v1/generate`;
  const response = await fetchWithRetry(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "muse-spark",
      system:
        "You explain rebar spacing measurements to a site foreman in 3 to 5 short English sentences. Use only numbers present in the JSON. Never invent measurements. Never say approved, safe, compliant, or certified. End with: " +
        DISCLAIMER,
      input: numericPayload,
    }),
  });

  if (!response.ok) {
    throw new MetaModelError(
      "HTTP",
      `Muse Spark request failed (${response.status})`,
      response.status,
    );
  }

  let body;
  try {
    body = await response.json();
  } catch {
    throw new MetaModelError("PARSE", "Muse Spark response was not JSON");
  }

  // TODO(verify against Meta Model API docs): text field name.
  const text = body.text || body.output || body.choices?.[0]?.message?.content;
  if (!text || typeof text !== "string") {
    throw new MetaModelError("PARSE", "Muse Spark returned no text");
  }
  return text.trim();
}

/**
 * Reject model copy that contains numbers not present in the structured result.
 * Prevents the explainer from inventing millimetre values.
 *
 * @param {string} text
 * @param {object} structuredResult
 * @returns {boolean}
 */
function explanationUsesOnlyKnownNumbers(text, structuredResult) {
  const allowed = new Set();
  const add = (value) => {
    if (value == null || value === "") return;
    const num = Number(value);
    if (Number.isFinite(num)) {
      allowed.add(String(Math.round(num)));
      allowed.add(num.toFixed(1).replace(/\.0$/, ""));
      allowed.add(num.toFixed(2).replace(/\.00$/, ""));
    }
  };
  const walk = (node) => {
    if (node == null) return;
    if (typeof node === "number") add(node);
    else if (Array.isArray(node)) node.forEach(walk);
    else if (typeof node === "object") Object.values(node).forEach(walk);
  };
  walk(structuredResult);
  const numbers = text.match(/\d+(?:\.\d+)?/g) || [];
  return numbers.every((token) => {
    const rounded = String(Math.round(Number(token)));
    return (
      allowed.has(token) ||
      allowed.has(rounded) ||
      allowed.has(Number(token).toFixed(1).replace(/\.0$/, ""))
    );
  });
}

module.exports = {
  MetaModelError,
  segmentWithSam,
  explainWithMuseSpark,
  explanationUsesOnlyKnownNumbers,
  DISCLAIMER,
};
