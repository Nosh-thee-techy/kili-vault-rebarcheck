/**
 * Kili-Vault Backend: Request Validation Middleware
 * Validates request params, query, and body using Zod schemas.
 */
"use strict";

const { AppError } = require("./errorHandler");

function validateRequest(schemas) {
  return (req, res, next) => {
    try {
      if (schemas.params) {
        req.params = schemas.params.parse(req.params);
      }
      if (schemas.query) {
        req.query = schemas.query.parse(req.query);
      }
      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }
      next();
    } catch (err) {
      const issues = err.errors || err.issues;
      if (Array.isArray(issues)) {
        const formattedDetails = issues.reduce((acc, current) => {
          const field = current.path.join(".");
          acc[field] = current.message;
          return acc;
        }, {});

        return next(
          new AppError(
            "VALIDATION_ERROR",
            "Request validation failed",
            400,
            formattedDetails,
          ),
        );
      }
      return next(err);
    }
  };
}

module.exports = validateRequest;
