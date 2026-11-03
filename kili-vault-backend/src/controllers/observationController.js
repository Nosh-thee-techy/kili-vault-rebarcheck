"use strict";

const observations = require("../repositories/observationRepository");
const { AppError } = require("../middleware/errorHandler");

function actor(req) {
  return {
    id: req.get("X-User-Id") || "anonymous",
    name: req.get("X-User-Name") || "Community user",
  };
}

function parseCreate(body) {
  const latitude = Number(body.latitude ?? body.lat);
  const longitude = Number(body.longitude ?? body.lon);
  const description = typeof body.description === "string" ? body.description.trim() : "";
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) throw new AppError("VALIDATION_ERROR", "latitude must be between -90 and 90", 400);
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) throw new AppError("VALIDATION_ERROR", "longitude must be between -180 and 180", 400);
  if (!description || description.length > 5000) throw new AppError("VALIDATION_ERROR", "description must contain 1 to 5000 characters", 400);
  return { latitude, longitude, description, observation_type: body.observation_type || body.observationType, photo_url: body.photo_url || body.photoUrl };
}

async function create(req, res, next) { try { res.status(201).json({ success: true, data: await observations.create(parseCreate(req.body), actor(req)) }); } catch (error) { next(error); } }
async function list(req, res, next) { try { const result = await observations.findAll(req.query); res.json({ success: true, data: result.data, pagination: { total: result.total, limit: result.limit, offset: result.offset } }); } catch (error) { next(error); } }
async function get(req, res, next) { try { const result = await observations.findById(req.params.id); if (!result) return next(new AppError("NOT_FOUND", "Observation not found", 404)); res.json({ success: true, data: result }); } catch (error) { next(error); } }
async function review(req, res, next) { try { if (!['UNDER_REVIEW', 'ACCEPTED', 'REJECTED'].includes(req.body.status)) return next(new AppError("VALIDATION_ERROR", "status must be UNDER_REVIEW, ACCEPTED, or REJECTED", 400)); const result = await observations.review(req.params.id, req.body, actor(req)); if (!result) return next(new AppError("NOT_FOUND", "Observation not found", 404)); res.json({ success: true, data: result }); } catch (error) { next(error); } }

module.exports = { create, list, get, review };