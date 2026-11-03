/**
 * Idempotent RebarCheck map seed.
 *
 * Inserts ~10 evidence items with metadata.seeded = true and
 * submitter = "demo-seed" across existing Kilimani cases so the
 * "Rebar inspections" layer is not empty in a demo. Never mistake
 * these for real field inspections.
 *
 * Usage (PowerShell): node scripts/seed_rebarcheck.js
 */

"use strict";

const { v4: uuidv4 } = require("uuid");
const caseRepository = require("../src/repositories/caseRepository");
const { DISCLAIMER } = require("../src/services/rebarCheckService");

const SUBMITTER = "demo-seed";

const RESULTS = [
  "within_tolerance",
  "outside_tolerance",
  "inconclusive",
  "within_tolerance",
  "outside_tolerance",
  "within_tolerance",
  "inconclusive",
  "outside_tolerance",
  "within_tolerance",
  "inconclusive",
];

function rebarMetadata(caseItem, result, index) {
  const jitter = (index % 5) * 0.00012;
  const lat = caseItem.centroidLat + jitter;
  const lon = caseItem.centroidLon - jitter * 0.6;
  const mean = result === "outside_tolerance" ? 188 : result === "inconclusive" ? 0 : 148;
  const worst = result === "outside_tolerance" ? 212 : mean;
  return {
    source: "rebarcheck",
    seeded: true,
    latitude: lat,
    longitude: lon,
    accuracyM: 8,
    capturedAt: new Date(Date.now() - index * 3600_000).toISOString(),
    parcelRef: caseItem.parcelRef || null,
    rebarCheck: {
      aiAnalysed: true,
      version: "1",
      spec: { barSpacingMm: 150, toleranceMm: 15 },
      reference: { type: "a4", knownLengthMm: 297 },
      result,
      confidence: result === "inconclusive" ? 0.28 : result === "outside_tolerance" ? 0.71 : 0.84,
      spacingMm: {
        horizontal: result === "inconclusive" ? [] : [mean, 150, worst],
        vertical: result === "inconclusive" ? [] : [149, 151, 150],
      },
      summary: {
        horizontal: { meanMm: mean, minMm: Math.min(mean, 150), maxMm: worst, count: result === "inconclusive" ? 1 : 4 },
        vertical: { meanMm: 150, minMm: 149, maxMm: 151, count: result === "inconclusive" ? 0 : 4 },
      },
      violations:
        result === "outside_tolerance"
          ? [
              {
                direction: "horizontal",
                between: [2, 3],
                measuredMm: worst,
                expectedMm: 150,
                deviationMm: worst - 150,
              },
            ]
          : [],
      barCount: {
        horizontal: result === "inconclusive" ? 1 : 4,
        vertical: result === "inconclusive" ? 0 : 4,
      },
      overlayUrl: null,
      explanation:
        result === "outside_tolerance"
          ? `Visual spacing check of a seeded demo cage: result is outside tolerance. Largest gap ${worst} mm vs spec 150 mm. ${DISCLAIMER}`
          : result === "inconclusive"
            ? `Seeded demo pin with too few bars to measure a mesh. ${DISCLAIMER}`
            : `Seeded demo pin within 150 mm ± 15 mm. ${DISCLAIMER}`,
      gpsWithinParcel: result !== "inconclusive",
      distanceToParcelM: result === "inconclusive" ? 42 : 6,
      submitter: SUBMITTER,
      channel: "web",
      disclaimer: DISCLAIMER,
    },
  };
}

async function alreadySeeded(caseItem) {
  return (caseItem.evidenceItems || []).some(
    (item) => item.metadata?.seeded === true && item.metadata?.rebarCheck,
  );
}

async function main() {
  const { data } = await caseRepository.findAll({ limit: 20, offset: 0 });
  if (!data.length) {
    console.error("No cases found. Start the backend once so the file store can seed cases, or run db:setup.");
    process.exit(1);
  }
  let created = 0;
  let skipped = 0;
  const targets = data.slice(0, 10);
  for (let i = 0; i < targets.length; i += 1) {
    const caseItem = targets[i];
    if (await alreadySeeded(caseItem)) {
      skipped += 1;
      continue;
    }
    const result = RESULTS[i % RESULTS.length];
    const item = {
      id: uuidv4(),
      type: "photo",
      fileName: `rebarcheck-seed-${i + 1}.jpg`,
      url: "",
      uploadedBy: SUBMITTER,
      uploadedAt: new Date().toISOString(),
      status: "submitted",
      metadata: rebarMetadata(caseItem, result, i),
    };
    const audit = {
      id: uuidv4(),
      action: "EVIDENCE_SUBMITTED",
      actor_role: "system",
      actor_id: "rebarcheck-seed",
      actor_name: SUBMITTER,
      timestamp: new Date().toISOString(),
      details: `Seeded RebarCheck pin (${result}) — not a real inspection`,
    };
    await caseRepository.addEvidence(caseItem.id, item, audit);
    created += 1;
    console.log(`seeded ${result} on ${caseItem.caseNumber}`);
  }
  console.log(`done. created=${created} skipped=${skipped}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
