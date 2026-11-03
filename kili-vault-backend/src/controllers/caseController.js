"use strict";

const cases = require("../repositories/caseRepository");
const { AppError } = require("../middleware/errorHandler");

function actor(req) {
  return { role: req.get("X-User-Role") || "system", id: req.get("X-User-Id") || "anonymous", name: req.get("X-User-Name") || "System" };
}

async function list(req, res, next) { try { const result = await cases.findAll(req.query); res.json({ success: true, data: result.data, pagination: { total: result.total, limit: result.limit, offset: result.offset } }); } catch (error) { next(error); } }
async function get(req, res, next) { try { const result = await cases.findById(req.params.id); if (!result) return next(new AppError("NOT_FOUND", "Case not found", 404)); res.json({ success: true, data: result }); } catch (error) { next(error); } }
async function geojson(req, res, next) { try { res.json(await cases.getGeoJson(req.query)); } catch (error) { next(error); } }
async function stats(req, res, next) { try { res.json({ success: true, data: await cases.getStats() }); } catch (error) { next(error); } }
async function updateStatus(req, res, next) { try { const result = await cases.updateStatus(req.params.id, req.body.status, { ...actor(req), details: req.body.note }); if (!result) return next(new AppError("NOT_FOUND", "Case not found", 404)); res.json({ success: true, data: result }); } catch (error) { next(error); } }
async function mitigation(req, res, next) { try { const result = await cases.updateMitigation(req.params.id, req.body.requirements, actor(req)); if (!result) return next(new AppError("NOT_FOUND", "Case not found", 404)); res.json({ success: true, data: result }); } catch (error) { next(error); } }
async function verify(req, res, next) { try { const result = await cases.verify(req.params.id, req.body.decision, { ...actor(req), details: req.body.note }); if (!result) return next(new AppError("NOT_FOUND", "Case not found", 404)); res.json({ success: true, data: result }); } catch (error) { next(error); } }
async function evidence(req, res, next) { try { if (!req.file) return next(new AppError("VALIDATION_ERROR", "A file is required", 400)); const result = await cases.addEvidence(req.params.id, req.file, actor(req)); if (!result) return next(new AppError("NOT_FOUND", "Case not found", 404)); res.json({ success: true, data: result }); } catch (error) { next(error); } }

module.exports = { list, get, geojson, stats, updateStatus, mitigation, verify, evidence };