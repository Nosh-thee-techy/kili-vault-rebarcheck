"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const app = require("../../src/app");
const db = require("../../src/repositories/db");

test("community observation API supports submission and role-scoped listing", async () => {
  const payload = {
    lat: -1.2921,
    lon: 36.782,
    description: "Observed physical land-surface change near the road.",
  };
  const createdIds = [];

  try {
    const created = await request(app)
      .post("/api/v1/cases/observations")
      .set("X-User-Role", "community")
      .set("X-User-Id", "integration-test")
      .set("X-User-Name", "Integration Test")
      .send(payload);
    assert.equal(created.status, 201);
    assert.equal(created.body.data.status, "PENDING_REVIEW");
    assert.equal(created.body.data.lat, payload.lat);
    createdIds.push(created.body.data.id);

    const mine = await request(app)
      .post("/api/v1/cases/observations")
      .set("X-User-Role", "community")
      .set("X-User-Id", "integration-test")
      .send(payload);
    assert.equal(mine.status, 201);
    createdIds.push(mine.body.data.id);

    const listed = await request(app)
      .get("/api/v1/cases/observations")
      .set("X-User-Role", "planner")
      .query({ limit: 10 });
    assert.equal(listed.status, 200);
    assert.ok(
      listed.body.data.observations.some(
        (item) => item.id === created.body.data.id,
      ),
    );

    const mineListed = await request(app)
      .get("/api/v1/cases/observations/mine")
      .set("X-User-Role", "community")
      .set("X-User-Id", "integration-test");
    assert.equal(mineListed.status, 200);
    assert.equal(mineListed.body.data.total, 2);
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
