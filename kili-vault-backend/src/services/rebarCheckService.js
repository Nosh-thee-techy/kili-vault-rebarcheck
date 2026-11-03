/**
 * RebarCheck orchestration: validate, analyze, explain, geotag, save evidence.
 *
 * Results are visual spacing evidence on an existing development case. They
 * stay status `submitted` with metadata.rebarCheck.aiAnalysed = true so an
 * agency still verifies them through the existing /verify flow. This module
 * also implements evidence-to-geometry distance validation (listed as deferred
 * in the root README) using PostGIS when available, with a centroid fallback
 * for the file store.
 */

"use strict";

const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const caseRepository = require("../repositories/caseRepository");
const caseService = require("./caseService");
const db = require("../repositories/db");
const logger = require("../utils/logger");
const { AppError } = require("../middleware/errorHandler");
const metaModelClient = require("./metaModelClient");

const BACKEND_ROOT = path.resolve(__dirname, "../..");
const PYTHON = process.env.REBARCHECK_PYTHON || "python";
const ANALYZER_TIMEOUT_MS = 45_000;
const DISCLAIMER = metaModelClient.DISCLAIMER;
const GPS_FLOOR_M = 15;

/**
 * Spawn the Python analyzer. JSON on stdin, JSON on stdout, stderr for logs.
 *
 * @param {object} payload
 * @returns {Promise<object>}
 */
function stubAnalysis() {
  return {
    ok: true,
    result: "within_tolerance",
    confidence: 0.82,
    mmPerPixel: 3,
    spacingMm: { horizontal: [150, 149], vertical: [151, 150] },
    summary: {
      horizontal: { meanMm: 149.5, minMm: 149, maxMm: 150, count: 3 },
      vertical: { meanMm: 150.5, minMm: 150, maxMm: 151, count: 3 },
    },
    violations: [],
    barCount: { horizontal: 3, vertical: 3 },
    overlayPath: "",
    warnings: ["Node test stub (REBARCHECK_NODE_STUB=1); Python analyzer not invoked."],
  };
}

function runAnalyzer(payload) {
  if (process.env.REBARCHECK_NODE_STUB === "1") {
    return Promise.resolve(stubAnalysis());
  }
  return new Promise((resolve, reject) => {
    const child = spawn(PYTHON, ["-m", "rebarcheck.analyze"], {
      cwd: BACKEND_ROOT,
      env: { ...process.env, PYTHONUNBUFFERED: "1" },
    });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.killed = true;
      child.kill("SIGTERM");
      reject(new AppError("TIMEOUT", "RebarCheck analyzer timed out", 504));
    }, ANALYZER_TIMEOUT_MS);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString("utf8");
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString("utf8");
    });
    child.on("error", (err) => {
      clearTimeout(timer);
      reject(
        new AppError(
          "ANALYZER_ERROR",
          `Could not start Python analyzer (${PYTHON})`,
          500,
          { message: err.message },
        ),
      );
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      const trimmed = stdout.trim();
      const lastLine = trimmed.split(/\r?\n/).filter(Boolean).pop() || "";
      try {
        const parsed = JSON.parse(lastLine);
        if (stderr) logger.warn("[rebarcheck] analyzer stderr", { stderr: stderr.slice(0, 2000) });
        resolve(parsed);
      } catch {
        reject(
          new AppError(
            "ANALYZER_ERROR",
            "Analyzer did not return JSON",
            500,
            { exitCode: code, stderr: stderr.slice(0, 500) },
          ),
        );
      }
    });
    child.stdin.write(JSON.stringify(payload));
    child.stdin.end();
  });
}

/**
 * Deterministic plain-language fallback when Muse Spark is unavailable.
 * Uses only numbers already present on the structured result.
 *
 * @param {object} analysis
 * @param {object} spec
 * @returns {string}
 */
function templateExplanation(analysis, spec) {
  const h = analysis.summary?.horizontal || {};
  const v = analysis.summary?.vertical || {};
  const label = String(analysis.result || "inconclusive").replace(/_/g, " ");
  const worst = [...(analysis.violations || [])].sort(
    (a, b) => Math.abs(b.deviationMm || 0) - Math.abs(a.deviationMm || 0),
  )[0];
  const lines = [
    `Visual spacing check of the rebar cage: result is ${label}.`,
    `Engineer spec was ${spec.barSpacingMm} mm with a ${spec.toleranceMm} mm tolerance.`,
    `Horizontal gaps: mean ${h.meanMm || 0} mm across ${h.count || 0} bars. Vertical gaps: mean ${v.meanMm || 0} mm across ${v.count || 0} bars.`,
  ];
  if (worst) {
    lines.push(
      `Largest departure from spec was ${worst.measuredMm} mm on the ${worst.direction} direction (${worst.deviationMm} mm off).`,
    );
  } else {
    lines.push("No gap outside the stated tolerance was measured in this photo.");
  }
  lines.push(DISCLAIMER);
  return lines.join(" ");
}

/**
 * Muse Spark restatement, or the template if the call fails / invents numbers.
 *
 * @param {object} analysis
 * @param {object} spec
 * @returns {Promise<{ explanation: string, warnings: string[] }>}
 */
async function explain(analysis, spec) {
  const warnings = [];
  const structured = { ...analysis, spec };
  try {
    const text = await metaModelClient.explainWithMuseSpark(structured);
    if (!metaModelClient.explanationUsesOnlyKnownNumbers(text, structured)) {
      warnings.push("Explainer output contained unknown numbers; using the template instead.");
      return { explanation: templateExplanation(analysis, spec), warnings };
    }
    const banned = /(approved|safe|compliant|certified)/i;
    if (banned.test(text)) {
      warnings.push("Explainer used banned wording; using the template instead.");
      return { explanation: templateExplanation(analysis, spec), warnings };
    }
    const withDisclaimer = text.includes("Pending human verification")
      ? text
      : `${text} ${DISCLAIMER}`;
    return { explanation: withDisclaimer, warnings };
  } catch (err) {
    warnings.push(`Muse Spark unavailable (${err.code || err.message}); using the template explanation.`);
    return { explanation: templateExplanation(analysis, spec), warnings };
  }
}

/**
 * Distance from a GPS point to the case geometry.
 *
 * PostGIS ST_Distance on geography (metres) when the database is up. File
 * store falls back to haversine-to-centroid so demos still record a number.
 *
 * @param {object} caseItem
 * @param {number|null} lat
 * @param {number|null} lon
 * @returns {Promise<{ distanceToParcelM: number|null, gpsWithinParcel: boolean|null, warning?: string }>}
 */
async function distanceToCaseGeometry(caseItem, lat, lon) {
  if (lat == null || lon == null || !Number.isFinite(lat) || !Number.isFinite(lon)) {
    return {
      distanceToParcelM: null,
      gpsWithinParcel: null,
      warning: "No GPS pin supplied; distance to the parcel was not checked.",
    };
  }
  const mode = await caseRepository.detectStorageMode();
  if (mode === "postgres") {
    try {
      const res = await db.query(
        `SELECT ST_Distance(
           geometry::geography,
           ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
         ) AS distance_m
         FROM development_cases
         WHERE id = $3`,
        [lon, lat, caseItem.id],
      );
      const distance = res.rows[0] ? Number(res.rows[0].distance_m) : null;
      return {
        distanceToParcelM: distance == null ? null : Math.round(distance * 10) / 10,
        gpsWithinParcel: distance == null ? null : distance <= GPS_FLOOR_M,
      };
    } catch (err) {
      logger.warn("[rebarcheck] PostGIS distance failed", { error: err.message });
    }
  }
  const distance = haversineMeters(lat, lon, caseItem.centroidLat, caseItem.centroidLon);
  return {
    distanceToParcelM: Math.round(distance * 10) / 10,
    gpsWithinParcel: distance <= GPS_FLOOR_M,
    warning:
      mode !== "postgres"
        ? "Parcel distance used the case centroid (file store); PostGIS ST_Distance is used when the database is available."
        : undefined,
  };
}

function haversineMeters(lat1, lon1, lat2, lon2) {
  const earth = 6371000;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * earth * Math.asin(Math.min(1, Math.sqrt(a)));
}

/**
 * Run RebarCheck on an uploaded photo and attach it as case evidence.
 *
 * @param {object} input
 * @param {object} user req.user (developer or planner)
 */
async function analyzeAndStore(input, user) {
  const caseItem = await caseService.getCaseById(input.caseId, user);
  const spec = {
    barSpacingMm: Number(input.specSpacingMm ?? 150),
    toleranceMm: Number(input.toleranceMm ?? 15),
  };
  const reference = {
    type: input.referenceType || "a4",
    knownLengthMm: Number(input.referenceLengthMm ?? 297),
  };
  if (input.mmPerPixel) reference.mmPerPixel = Number(input.mmPerPixel);

  const warnings = [];
  const evidenceDir = caseRepository.getEvidenceDir(caseItem.id);
  const outputDir = evidenceDir;
  let segmenter =
    input.segmenter || process.env.REBARCHECK_SEGMENTER || "classical";
  const masksPath = path.join(outputDir, `${path.parse(input.storedFileName).name}.sam.json`);

  if (segmenter === "meta") {
    try {
      const imageBuffer = fs.readFileSync(input.storedFilePath);
      const sam = await metaModelClient.segmentWithSam(imageBuffer, [
        "steel reinforcement bar",
        reference.type === "a4" ? "A4 paper sheet" : "measuring tape",
      ]);
      fs.writeFileSync(masksPath, JSON.stringify(sam), "utf8");
    } catch (err) {
      warnings.push(`SAM 3.1 unavailable (${err.code || err.message}); using the classical segmenter.`);
      segmenter = "classical";
    }
  }

  const analysis = await runAnalyzer({
    imagePath: input.storedFilePath,
    spec,
    reference,
    segmenter,
    outputDir,
    masksPath: fs.existsSync(masksPath) ? masksPath : undefined,
  });
  if (!analysis.ok) {
    throw new AppError(
      analysis.error?.code || "ANALYZER_ERROR",
      analysis.error?.message || "Analyzer failed",
      422,
      analysis.error?.details || {},
    );
  }
  warnings.push(...(analysis.warnings || []));

  const explained = await explain(analysis, spec);
  warnings.push(...explained.warnings);

  const lat = input.latitude != null ? Number(input.latitude) : null;
  const lon = input.longitude != null ? Number(input.longitude) : null;
  const accuracy = input.accuracy != null ? Number(input.accuracy) : null;
  const geo = await distanceToCaseGeometry(caseItem, lat, lon);
  if (geo.warning) warnings.push(geo.warning);
  const gpsWithinParcel =
    geo.distanceToParcelM == null
      ? null
      : geo.distanceToParcelM <= Math.max(accuracy || 0, GPS_FLOOR_M);

  const overlayFileName = path.basename(analysis.overlayPath || "overlay.png");
  const overlayUrl = analysis.overlayPath
    ? `/api/v1/cases/${caseItem.id}/evidence/${overlayFileName}`
    : null;
  const photoUrl = `/api/v1/cases/${caseItem.id}/evidence/${input.storedFileName}`;

  const metadata = {
    source: "rebarcheck",
    latitude: Number.isFinite(lat) ? lat : null,
    longitude: Number.isFinite(lon) ? lon : null,
    accuracyM: Number.isFinite(accuracy) ? accuracy : null,
    capturedAt: input.capturedAt || new Date().toISOString(),
    parcelRef: input.parcelRef || caseItem.parcelRef || null,
    rebarCheck: {
      aiAnalysed: true,
      version: "1",
      spec,
      reference,
      result: analysis.result,
      confidence: analysis.confidence,
      spacingMm: analysis.spacingMm,
      summary: analysis.summary,
      violations: analysis.violations,
      barCount: analysis.barCount,
      overlayUrl,
      explanation: explained.explanation,
      gpsWithinParcel,
      distanceToParcelM: geo.distanceToParcelM,
      submitter: input.submitter || user.name,
      channel: input.channel || "web",
      segmenter,
      warnings,
      disclaimer: DISCLAIMER,
    },
  };

  const updatedCase = await caseService.addEvidence(
    caseItem.id,
    {
      fileName: input.originalFileName,
      url: photoUrl,
      type: "photo",
      metadata,
    },
    user,
  );
  const evidenceItem = (updatedCase.evidenceItems || [])[0];
  return {
    evidenceItem,
    rebarCheck: metadata.rebarCheck,
    case: updatedCase,
  };
}

/**
 * GeoJSON FeatureCollection of every evidence item with metadata.rebarCheck.
 *
 * @returns {Promise<GeoJSON.FeatureCollection>}
 */
async function getGeoJSON() {
  const { data } = await caseRepository.findAll({ limit: 500, offset: 0 });
  const features = [];
  for (const caseItem of data) {
    for (const item of caseItem.evidenceItems || []) {
      const rc = item.metadata?.rebarCheck;
      if (!rc) continue;
      const lat = item.metadata.latitude ?? caseItem.centroidLat;
      const lon = item.metadata.longitude ?? caseItem.centroidLon;
      if (lat == null || lon == null) continue;
      features.push({
        type: "Feature",
        id: item.id,
        geometry: { type: "Point", coordinates: [lon, lat] },
        properties: {
          caseId: caseItem.id,
          caseNumber: caseItem.caseNumber,
          evidenceId: item.id,
          result: rc.result,
          confidence: rc.confidence,
          summary: rc.summary,
          overlayUrl: rc.overlayUrl,
          explanation: rc.explanation,
          submitter: rc.submitter,
          capturedAt: item.metadata.capturedAt || item.uploadedAt,
          gpsWithinParcel: rc.gpsWithinParcel,
          disclaimer: rc.disclaimer || DISCLAIMER,
          seeded: Boolean(item.metadata.seeded),
        },
      });
    }
  }
  return { type: "FeatureCollection", features };
}

module.exports = {
  analyzeAndStore,
  getGeoJSON,
  runAnalyzer,
  templateExplanation,
  distanceToCaseGeometry,
  DISCLAIMER,
};
