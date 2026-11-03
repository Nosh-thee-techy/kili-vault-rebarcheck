/**
 * WhatsApp Cloud API conversation for RebarCheck.
 *
 * In-memory Map of per-sender state is enough for the demo. Production needs
 * a persistent store (Redis / Postgres) so a process restart does not drop
 * an in-flight photo. WhatsApp strips EXIF GPS, so we always ask for a
 * location pin rather than reading the image file.
 */

"use strict";

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const logger = require("../utils/logger");
const caseRepository = require("../repositories/caseRepository");
const rebarCheckService = require("./rebarCheckService");

const GRAPH_VERSION = process.env.WHATSAPP_GRAPH_VERSION || "v25.0";
const sessions = new Map();
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const BOT_USER = {
  id: "rebarcheck-bot",
  role: "planner",
  name: "RebarCheck WhatsApp",
};

/**
 * Constant-time compare of Meta's X-Hub-Signature-256 vs the raw body.
 *
 * @param {Buffer|undefined} rawBody
 * @param {string} signatureHeader
 * @returns {boolean}
 */
function verifySignature(rawBody, signatureHeader) {
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret || !rawBody || !signatureHeader) return false;
  const expected =
    "sha256=" + crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(signatureHeader);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function graphUrl(suffix) {
  return `https://graph.facebook.com/${GRAPH_VERSION}/${suffix}`;
}

function getSession(from) {
  if (!sessions.has(from)) {
    sessions.set(from, { state: "idle", caseId: process.env.REBARCHECK_DEFAULT_CASE_ID || null });
  }
  return sessions.get(from);
}

/**
 * Download WhatsApp media by id (never log the bearer token).
 *
 * @param {string} mediaId
 * @returns {Promise<{ buffer: Buffer, mimeType: string, fileName: string }>}
 */
async function downloadMedia(mediaId) {
  const token = process.env.WHATSAPP_TOKEN;
  const meta = await fetch(graphUrl(mediaId), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!meta.ok) throw new Error(`media lookup failed (${meta.status})`);
  const info = await meta.json();
  const url = info.url;
  const mimeType = info.mime_type || "image/jpeg";
  if (!url) throw new Error("media URL missing");
  const file = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!file.ok) throw new Error(`media download failed (${file.status})`);
  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.length > MAX_IMAGE_BYTES) throw new Error("photo is larger than 10 MB");
  if (!/^image\/(jpeg|jpg|png)$/i.test(mimeType)) {
    throw new Error("only JPEG and PNG photos can be analysed");
  }
  const ext = /png/i.test(mimeType) ? "png" : "jpg";
  return { buffer, mimeType, fileName: `whatsapp_${Date.now()}.${ext}` };
}

async function sendText(to, body) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneId) {
    logger.warn("[whatsapp] send skipped; token or phone id missing");
    return;
  }
  await fetch(graphUrl(`${phoneId}/messages`), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body },
    }),
  });
}

async function sendImage(to, link, caption) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneId) return;
  await fetch(graphUrl(`${phoneId}/messages`), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "image",
      image: { link, caption },
    }),
  });
}

function helpText() {
  return (
    "RebarCheck: take a top-down photo of the cage with an A4 sheet laid flat on it, then share your location pin. " +
    "Optional: text \"case KV-10127\" first. Visual spacing check from a photo. Not an engineer's sign-off. Pending human verification."
  );
}

function parseCaseId(text) {
  if (!text) return null;
  const match = text.match(/\b(KV-\d{3,6}|case_[a-f0-9]{8})\b/i);
  return match ? match[1] : null;
}

async function handleText(from, text) {
  const session = getSession(from);
  const lower = (text || "").trim().toLowerCase();
  if (lower === "hi" || lower === "start" || lower === "help") {
    session.state = "awaiting_photo";
    await sendText(from, helpText());
    return;
  }
  const caseId = parseCaseId(text);
  if (caseId) {
    const found = await caseRepository.findById(caseId);
    if (!found) {
      await sendText(from, `I could not find case ${caseId}. Try KV-10127 or send the photo for the default demo case.`);
      return;
    }
    session.caseId = found.id;
    session.state = session.state === "idle" ? "awaiting_photo" : session.state;
    await sendText(from, `Using case ${found.caseNumber}. Send a top-down photo with an A4 sheet in frame.`);
    return;
  }
  await sendText(from, helpText());
}

async function handleImage(from, image) {
  const session = getSession(from);
  try {
    const media = await downloadMedia(image.id);
    session.photo = media;
    session.state = "awaiting_location";
    await sendText(
      from,
      "Photo received. WhatsApp strips GPS from photos, so please share your location pin next.",
    );
  } catch (err) {
    logger.warn("[whatsapp] image handling failed", { error: err.message });
    await sendText(from, `I could not use that photo (${err.message}). Send a JPEG or PNG under 10 MB, top-down, with an A4 sheet.`);
    session.state = "awaiting_photo";
  }
}

async function handleLocation(from, location) {
  const session = getSession(from);
  if (!session.photo) {
    session.state = "awaiting_photo";
    await sendText(from, "I still need the photo first. Send a top-down shot with an A4 sheet, then the location pin.");
    return;
  }
  session.state = "analysing";
  const caseId = session.caseId || process.env.REBARCHECK_DEFAULT_CASE_ID;
  if (!caseId) {
    await sendText(from, "No demo case is configured (REBARCHECK_DEFAULT_CASE_ID). Text \"case KV-10127\" and retry.");
    session.state = "idle";
    return;
  }
  try {
    await sendText(from, "Analysing the cage. This is a visual spacing check, not an engineer's sign-off.");
    const caseItem = await caseRepository.findById(caseId);
    if (!caseItem) throw new Error("case not found");
    const evidenceDir = caseRepository.getEvidenceDir(caseItem.id);
    const safeName = session.photo.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const stored = path.join(evidenceDir, safeName);
    fs.writeFileSync(stored, session.photo.buffer);
    const result = await rebarCheckService.analyzeAndStore(
      {
        caseId: caseItem.id,
        storedFilePath: stored,
        storedFileName: safeName,
        originalFileName: safeName,
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy || null,
        channel: "whatsapp",
        submitter: from,
        segmenter: process.env.REBARCHECK_SEGMENTER,
      },
      { ...BOT_USER, name: `WhatsApp ${from.slice(-4)}` },
    );
    const rc = result.rebarCheck;
    const worst = [...(rc.violations || [])].sort(
      (a, b) => Math.abs(b.deviationMm || 0) - Math.abs(a.deviationMm || 0),
    )[0];
    const label = String(rc.result || "inconclusive").replace(/_/g, " ");
    const worstLine = worst
      ? `Worst gap ${worst.measuredMm} mm vs spec ${rc.spec.barSpacingMm} mm.`
      : `Mean horizontal ${rc.summary?.horizontal?.meanMm ?? "—"} mm.`;
    const caption = `${label}. ${worstLine} ${rc.disclaimer}`;
    const publicBase = (process.env.PUBLIC_BASE_URL || "").replace(/\/$/, "");
    if (rc.overlayUrl && publicBase) {
      await sendImage(from, `${publicBase}${rc.overlayUrl}`, caption);
    } else {
      await sendText(from, caption);
    }
    session.state = "done";
    session.photo = null;
  } catch (err) {
    logger.warn("[whatsapp] analysis failed", { error: err.message });
    const friendly = /reference|scale/i.test(err.message)
      ? "I could not find the A4 reference in the photo. Lay the sheet flat on the cage and shoot from above."
      : /dark|empty/i.test(err.message)
        ? "That photo looks too dark or empty. Use even light and fill the frame with the cage."
        : "I could not finish that check. Try a clearer top-down photo with the A4 sheet visible.";
    await sendText(from, friendly);
    session.state = "awaiting_photo";
    session.photo = null;
  }
}

/**
 * Process one inbound webhook payload after the 200 response.
 *
 * @param {object} body
 */
async function handleWebhookPayload(body) {
  const messages = body?.entry?.[0]?.changes?.[0]?.value?.messages || [];
  for (const msg of messages) {
    const from = msg.from;
    if (!from) continue;
    if (msg.type === "text") await handleText(from, msg.text?.body || "");
    else if (msg.type === "image") await handleImage(from, msg.image || {});
    else if (msg.type === "location") await handleLocation(from, msg.location || {});
    else await sendText(from, helpText());
  }
}

module.exports = {
  verifySignature,
  handleWebhookPayload,
  parseCaseId,
  helpText,
  sessions,
};
