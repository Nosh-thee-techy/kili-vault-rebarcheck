/**
 * Kili-Vault: Detection Input Validators
 */
'use strict';

const { z } = require('zod');

const detectionQuerySchema = z.object({
  change_type: z.enum([
    'BUILDING_DEVELOPMENT',
    'INFRASTRUCTURE_CHANGE',
    'LAND_CLEARING',
    'VEGETATION_CHANGE',
    'SURFACE_CHANGE',
    'UNKNOWN'
  ]).optional(),
  min_confidence: z.coerce.number().min(0).max(1).optional(),
  max_confidence: z.coerce.number().min(0).max(1).optional(),
  run_id: z.string().optional(),
  event_id: z.string().optional(),
  bbox: z.string().regex(/^-?\d+(\.\d+)?,-?\d+(\.\d+)?,-?\d+(\.\d+)?,-?\d+(\.\d+)?$/, 'bbox must be minLon,minLat,maxLon,maxLat').optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

const detectionIdParamsSchema = z.object({
  id: z.string().min(1, 'Detection ID is required'),
});

module.exports = {
  detectionQuerySchema,
  detectionIdParamsSchema,
};
