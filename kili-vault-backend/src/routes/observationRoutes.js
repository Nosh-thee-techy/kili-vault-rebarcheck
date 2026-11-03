"use strict";

const express = require("express");
const controller = require("../controllers/observationController");

const router = express.Router();
router.post("/", controller.create);
router.get("/", controller.list);
router.get("/:id", controller.get);
router.patch("/:id/review", controller.review);

module.exports = router;