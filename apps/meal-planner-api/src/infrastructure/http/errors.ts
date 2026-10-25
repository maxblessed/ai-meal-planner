import type { ApiErrorCode, ValidationIssue } from '@ai-meal-planner/shared';

/** An error that is safe to show to API clients. Anything else becomes a generic 500. */
export class AppError extends Error {
  constructor(
    readonly code: ApiErrorCode,
    readonly status: number,
    message: string,
    readonly details?: ValidationIssue[],
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const notFound = (message: string) => new AppError('NOT_FOUND', 404, message);
