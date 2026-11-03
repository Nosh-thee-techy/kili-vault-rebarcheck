/**
 * RebarCheck routes.
 *
 * POST /api/v1/cases/:id/evidence/rebar-check is mounted from caseRoutes so
 * it shares multer + case id without colliding with POST /:id/evidence.
 * This file owns GET /api/v1/rebar-checks/geojson.
 */

"use strict";

const express = require("express");
const rebarCheckController = require("../controllers/rebarCheckController");
const { devAuthMiddleware } = require("../middleware/devAuth");

const router = express.Router();
router.use(devAuthMiddleware);

router.get("/geojson", rebarCheckController.getGeoJSON);

module.exports = router;
