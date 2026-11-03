/**
 * Integration Tests: REST API Endpoints & Health Probes
 */
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const app = require("../../src/app");
const db = require("../../src/repositories/db");

test.after(async () => {
  await db.closePool();
});

test("GET /health returns 200 and service metadata", async () => {
  const res = await request(app).get("/health");
  assert.equal(res.status, 200);
  assert.equal(res.body.status, "ok");
  assert.equal(res.body.service, "kili-vault-backend");
});

test("GET /health/live returns 200 liveness", async () => {
  const res = await request(app).get("/health/live");
  assert.equal(res.status, 200);
  assert.equal(res.body.status, "live");
});

test("GET /health/ready returns readiness probe", async () => {
  const res = await request(app).get("/health/ready");
  assert.ok(res.status === 200 || res.status === 503);
  assert.ok(res.body.checks);
});

test("GET /api/v1/detections returns paginated list", async () => {
  const res = await request(app).get("/api/v1/detections?limit=10&offset=0");
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body.data));
  assert.ok(res.body.pagination);
  assert.equal(res.body.pagination.limit, 10);
});

test("GET /api/v1/detections/geojson returns valid GeoJSON FeatureCollection", async () => {
  const res = await request(app).get("/api/v1/detections/geojson");
  assert.equal(res.status, 200);
  assert.equal(res.body.type, "FeatureCollection");
  assert.ok(Array.isArray(res.body.features));
});

test("GET /api/v1/detections/stats returns detection metrics and breakdown", async () => {
  const res = await request(app).get("/api/v1/detections/stats");
  assert.equal(res.status, 200);
  assert.ok(res.body.data);
  assert.ok(typeof res.body.data.total_detections === "number");
  assert.ok(res.body.data.breakdown);
});

test("GET /api/v1/detections/:id returns 404 for an unknown detection", async () => {
  const res = await request(app).get("/api/v1/detections/not-a-real-id");
  assert.equal(res.status, 404);
  assert.equal(res.body.error.code, "NOT_FOUND");
});

test("GET /api/v1/processing/runs returns execution runs", async () => {
  const res = await request(app).get("/api/v1/processing/runs");
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body.data));
});

test("GET /api/v1/nonexistent returns standardized 404 error schema", async () => {
  const res = await request(app).get("/api/v1/nonexistent");
  assert.equal(res.status, 404);
  assert.equal(res.body.error.code, "NOT_FOUND");
  assert.ok(res.body.error.message);
});
