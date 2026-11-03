/**
 * RebarCheck: route validation, explainer fallback, webhook signatures, GeoJSON.
 */

"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("crypto");
const path = require("path");
const fs = require("fs");
const request = require("supertest");

process.env.REBARCHECK_NODE_STUB = "1";
process.env.REBARCHECK_SEGMENTER = "mock";
process.env.WHATSAPP_APP_SECRET = "test-app-secret";
process.env.WHATSAPP_VERIFY_TOKEN = "test-verify";

const app = require("../../src/app");
const db = require("../../src/repositories/db");
const caseRepository = require("../../src/repositories/caseRepository");
const { templateExplanation, DISCLAIMER } = require("../../src/services/rebarCheckService");
const { explanationUsesOnlyKnownNumbers } = require("../../src/services/metaModelClient");
const { verifySignature, parseCaseId } = require("../../src/services/whatsappService");

test.after(async () => {
  await db.closePool();
});

function tinyPng() {
  return Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64",
  );
}

test("explainer template uses only known numbers and the disclaimer", () => {
  const analysis = {
    result: "outside_tolerance",
    summary: {
      horizontal: { meanMm: 188, minMm: 150, maxMm: 212, count: 4 },
      vertical: { meanMm: 150, minMm: 149, maxMm: 151, count: 4 },
    },
    violations: [
      {
        direction: "horizontal",
        between: [2, 3],
        measuredMm: 212,
        expectedMm: 150,
        deviationMm: 62,
      },
    ],
  };
  const spec = { barSpacingMm: 150, toleranceMm: 15 };
  const text = templateExplanation(analysis, spec);
  assert.match(text, /outside tolerance/);
  assert.match(text, /Pending human verification/);
  assert.equal(text.includes("approved"), false);
  assert.ok(explanationUsesOnlyKnownNumbers(text, { ...analysis, spec }));
});

test("explainer rejects invented millimetre values", () => {
  const structured = { result: "within_tolerance", summary: { horizontal: { meanMm: 150 } } };
  assert.equal(
    explanationUsesOnlyKnownNumbers("The gap was 999 mm.", structured),
    false,
  );
  assert.equal(
    explanationUsesOnlyKnownNumbers("Mean 150 mm. within_tolerance", structured),
    true,
  );
});

test("WhatsApp signature accepts a valid HMAC and rejects a bad one", () => {
  const body = Buffer.from(JSON.stringify({ object: "whatsapp_business_account" }));
  const good =
    "sha256=" +
    crypto.createHmac("sha256", "test-app-secret").update(body).digest("hex");
  assert.equal(verifySignature(body, good), true);
  assert.equal(verifySignature(body, "sha256=" + "00".repeat(32)), false);
  assert.equal(verifySignature(body, ""), false);
});

test("GET WhatsApp webhook echoes hub.challenge when the verify token matches", async () => {
  const res = await request(app)
    .get("/api/v1/whatsapp/webhook")
    .query({
      "hub.mode": "subscribe",
      "hub.verify_token": "test-verify",
      "hub.challenge": "challenge-token",
    });
  assert.equal(res.status, 200);
  assert.equal(res.text, "challenge-token");
});

test("POST WhatsApp webhook rejects a missing signature", async () => {
  const res = await request(app)
    .post("/api/v1/whatsapp/webhook")
    .set("Content-Type", "application/json")
    .send({ entry: [] });
  assert.equal(res.status, 401);
});

test("POST WhatsApp webhook accepts a valid signature and returns 200", async () => {
  const payload = { entry: [] };
  const raw = JSON.stringify(payload);
  const sig =
    "sha256=" +
    crypto.createHmac("sha256", "test-app-secret").update(raw).digest("hex");
  const res = await request(app)
    .post("/api/v1/whatsapp/webhook")
    .set("Content-Type", "application/json")
    .set("X-Hub-Signature-256", sig)
    .send(payload);
  assert.equal(res.status, 200);
});

test("parseCaseId accepts KV- and case_ ids", () => {
  assert.equal(parseCaseId("please use case KV-10127"), "KV-10127");
  assert.equal(parseCaseId("case_deadbeef tonight"), "case_deadbeef");
  assert.equal(parseCaseId("hello"), null);
});

test("rebar-check POST rejects a missing file", async () => {
  const { data } = await caseRepository.findAll({ limit: 1 });
  assert.ok(data[0], "expected a seeded case");
  const res = await request(app)
    .post(`/api/v1/cases/${data[0].id}/evidence/rebar-check`)
    .set("X-User-Role", "planner")
    .set("X-User-Id", "test-planner")
    .field("specSpacingMm", "150");
  assert.equal(res.status, 400);
  assert.equal(res.body.error.code, "VALIDATION_ERROR");
});

test("rebar-check POST rejects a non-image type", async () => {
  const { data } = await caseRepository.findAll({ limit: 1 });
  const res = await request(app)
    .post(`/api/v1/cases/${data[0].id}/evidence/rebar-check`)
    .set("X-User-Role", "planner")
    .attach("file", Buffer.from("not-an-image"), "notes.txt");
  assert.equal(res.status, 400);
});

test("rebar-check POST with mock analyzer stores evidence metadata", async () => {
  const { data } = await caseRepository.findAll({ limit: 1 });
  const res = await request(app)
    .post(`/api/v1/cases/${data[0].id}/evidence/rebar-check`)
    .set("X-User-Role", "planner")
    .set("X-User-Id", "test-planner")
    .set("X-User-Name", "Test Planner")
    .field("latitude", "-1.2921")
    .field("longitude", "36.782")
    .field("accuracy", "8")
    .field("specSpacingMm", "150")
    .field("toleranceMm", "15")
    .field("channel", "web")
    .attach("file", tinyPng(), { filename: "cage.png", contentType: "image/png" });
  assert.equal(res.status, 201);
  assert.equal(res.body.success, true);
  assert.equal(res.body.data.rebarCheck.aiAnalysed, true);
  assert.equal(res.body.data.rebarCheck.result, "within_tolerance");
  assert.match(res.body.data.rebarCheck.disclaimer, /Pending human verification/);
  assert.equal(res.body.data.evidenceItem.status, "submitted");
  assert.equal(res.body.data.evidenceItem.metadata.rebarCheck.aiAnalysed, true);
});

test("existing evidence upload still works", async () => {
  const { data } = await caseRepository.findAll({ limit: 1 });
  const res = await request(app)
    .post(`/api/v1/cases/${data[0].id}/evidence`)
    .set("X-User-Role", "planner")
    .attach("file", tinyPng(), { filename: "site.png", contentType: "image/png" });
  assert.equal(res.status, 201);
  assert.equal(res.body.success, true);
  assert.ok(res.body.data.evidenceItems);
});

test("GET /api/v1/rebar-checks/geojson returns a FeatureCollection", async () => {
  const res = await request(app)
    .get("/api/v1/rebar-checks/geojson")
    .set("X-User-Role", "planner");
  assert.equal(res.status, 200);
  assert.equal(res.body.type, "FeatureCollection");
  assert.ok(Array.isArray(res.body.features));
});
