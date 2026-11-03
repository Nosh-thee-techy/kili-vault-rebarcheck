/**
 * WhatsApp Cloud API webhook.
 *
 * GET: Meta hub.challenge handshake.
 * POST: verify X-Hub-Signature-256, respond 200, process asynchronously.
 * These routes are unauthenticated — Meta cannot send our demo auth headers.
 */

"use strict";

const express = require("express");
const whatsappService = require("../services/whatsappService");
const logger = require("../utils/logger");

const router = express.Router();

router.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  if (mode === "subscribe" && token && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

router.post("/webhook", (req, res) => {
  const valid = whatsappService.verifySignature(
    req.rawBody,
    req.get("x-hub-signature-256"),
  );
  if (!valid) {
    return res.sendStatus(401);
  }
  res.sendStatus(200);
  setImmediate(() => {
    whatsappService.handleWebhookPayload(req.body).catch((err) => {
      logger.warn("[whatsapp] async handler failed", { error: err.message });
    });
  });
});

module.exports = router;
