import type { ApiErrorResponse } from '@ai-meal-planner/shared';
import type { ErrorRequestHandler, RequestHandler } from 'express';

import type { Logger } from '../logging/logger';
import { DatabaseUnavailableError } from '../database/mongodb';
import { AppError, notFound } from './errors';

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(notFound(`No route for ${req.method} ${req.path}`));
};

export function createErrorHandler(logger: Logger): ErrorRequestHandler {
  // Express identifies error handlers by their four-argument signature.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return (error, req, res, _next) => {
    let status = 500;
    let body: ApiErrorResponse = {
      error: { code: 'INTERNAL_ERROR', message: 'Something went wrong on our side. Please try again.' },
    };

    if (error instanceof AppError) {
      status = error.status;
      body = { error: { code: error.code, message: error.message, details: error.details } };
    } else if (error instanceof DatabaseUnavailableError) {
      status = 503;
      body = { error: { code: 'SERVICE_UNAVAILABLE', message: 'The meal planner database is unavailable. Please try again later.' } };
      logger.error('database unavailable', { reason: error.message, path: req.path });
    } else if ((error as { type?: string }).type === 'entity.parse.failed') {
      status = 400;
      body = { error: { code: 'VALIDATION_ERROR', message: 'The request body is not valid JSON.' } };
    } else {
      logger.error('unhandled error', { path: req.path, error: error instanceof Error ? error.stack : String(error) });
    }

    res.status(status).json(body);
  };
}
