"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const app = require("../../src/app");
const db = require("../../src/repositories/db");

test("community observation API supports submission, listing, and review", async () => {
  const payload = {
    lat: -1.2921,
    lon: 36.782,
    description: "Observed physical land-surface change near the road.",
  };
  const createdIds = [];

  try {
    const created = await request(app)
      .post("/api/v1/observations")
      .set("X-User-Id", "integration-test")
      .set("X-User-Name", "Integration Test")
      .send(payload);
    assert.equal(created.status, 201);
    assert.equal(created.body.data.status, "SUBMITTED");
    assert.equal(created.body.data.latitude, payload.lat);
    createdIds.push(created.body.data.id);

    const compatibility = await request(app)
      .post("/api/v1/cases/observations")
      .send(payload);
    assert.equal(compatibility.status, 201);
    createdIds.push(compatibility.body.data.id);

    const listed = await request(app).get(
      "/api/v1/observations?status=SUBMITTED&limit=10",
    );
    assert.equal(listed.status, 200);
    assert.ok(
      listed.body.data.some((item) => item.id === created.body.data.id),
    );

    const reviewed = await request(app)
      .patch(`/api/v1/observations/${created.body.data.id}/review`)
      .set("X-User-Id", "planner-test")
      .send({
        status: "ACCEPTED",
        review_notes: "Reviewed in integration test.",
      });
    assert.equal(reviewed.status, 200);
    assert.equal(reviewed.body.data.status, "ACCEPTED");
  } finally {
    if (createdIds.length) {
      await db.query(
        "DELETE FROM community_observations WHERE id = ANY($1::uuid[])",
        [createdIds],
      );
    }
  }
});

test.after(async () => db.closePool());
