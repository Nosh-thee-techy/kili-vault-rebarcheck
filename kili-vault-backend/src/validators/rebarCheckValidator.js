/**
 * RebarCheck request validators (Zod), matching detectionValidator style.
 */

"use strict";

const { z } = require("zod");

const optionalNumber = z
  .union([z.string(), z.number(), z.null(), z.undefined()])
  .transform((value) => {
    if (value == null || value === "") return undefined;
    const num = Number(value);
    return Number.isFinite(num) ? num : undefined;
  });

const rebarCheckBodySchema = z.object({
  latitude: optionalNumber.optional(),
  longitude: optionalNumber.optional(),
  accuracy: optionalNumber.optional(),
  capturedAt: z.string().optional(),
  parcelRef: z.string().optional(),
  specSpacingMm: optionalNumber.optional(),
  toleranceMm: optionalNumber.optional(),
  referenceType: z.string().optional(),
  referenceLengthMm: optionalNumber.optional(),
  mmPerPixel: optionalNumber.optional(),
  submitter: z.string().optional(),
  channel: z.enum(["whatsapp", "web"]).optional(),
  segmenter: z.enum(["meta", "classical", "mock"]).optional(),
});

const rebarCheckParamsSchema = z.object({
  id: z.string().min(1, "Case ID is required"),
});

module.exports = {
  rebarCheckBodySchema,
  rebarCheckParamsSchema,
};
