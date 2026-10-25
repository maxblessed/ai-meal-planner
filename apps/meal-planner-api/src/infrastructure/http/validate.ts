import type { ValidationIssue } from '@ai-meal-planner/shared';
import type { RequestHandler } from 'express';
import type { z } from 'zod';

import { AppError } from './errors';

type Schemas = { body?: z.ZodTypeAny; params?: z.ZodTypeAny };

/** Validates and replaces `req.body` / `req.params` with the parsed values, or responds 400. */
export function validate(schemas: Schemas): RequestHandler {
  return (req, _res, next) => {
    const issues: ValidationIssue[] = [];

    for (const part of ['params', 'body'] as const) {
      const schema = schemas[part];
      if (!schema) continue;
      // Express 5 leaves `req.body` undefined when no body was sent.
      const result = schema.safeParse(part === 'body' ? (req.body ?? {}) : req[part]);
      if (result.success) {
        (req as unknown as Record<string, unknown>)[part] = result.data;
      } else {
        issues.push(
          ...result.error.issues.map((issue) => ({
            path: [part, ...issue.path].join('.'),
            message: issue.message,
          })),
        );
      }
    }

    next(issues.length ? new AppError('VALIDATION_ERROR', 400, 'The request is not valid.', issues) : undefined);
  };
}
