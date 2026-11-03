"use strict";

const express = require("express");
const multer = require("multer");
const controller = require("../controllers/caseController");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.get("/", controller.list);
router.get("/geojson", controller.geojson);
router.get("/stats", controller.stats);
router.get("/:id", controller.get);
router.patch("/:id/status", controller.updateStatus);
router.post("/:id/mitigation", controller.mitigation);
router.post("/:id/verify", controller.verify);
router.post("/:id/evidence", upload.single("file"), controller.evidence);

module.exports = router;