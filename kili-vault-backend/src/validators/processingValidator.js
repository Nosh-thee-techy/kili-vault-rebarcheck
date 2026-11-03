/**
 * Kili-Vault Backend: Admin Processing Validators
 */
'use strict';

const { z } = require('zod');

const runProcessingSchema = z.object({
  baseline_start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD').optional(),
  baseline_end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD').optional(),
  recent_start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD').optional(),
  recent_end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD').optional(),
  cloud_threshold: z.coerce.number().min(0).max(100).optional(),
  min_area_m2: z.coerce.number().positive().optional(),
  min_confidence: z.coerce.number().min(0).max(1).optional(),
  dry_run: z.coerce.boolean().default(false),
});

const processingRunIdParamsSchema = z.object({
  id: z.string().uuid('Run ID must be a valid UUID'),
});

module.exports = {
  runProcessingSchema,
  processingRunIdParamsSchema,
};
