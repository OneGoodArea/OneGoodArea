/**
 * Custom error classes for structured error handling.
 * Use these instead of generic Error to enable type-safe catch blocks
 * and consistent error responses.
 */

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;

  constructor(message: string, statusCode: number, code: string) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

export class RateLimitError extends AppError {
  public readonly retryAfter: number;

  constructor(retryAfter: number) {
    super("Too many requests. Please try again later.", 429, "RATE_LIMIT_EXCEEDED");
    this.name = "RateLimitError";
    this.retryAfter = retryAfter;
  }
}

export class DataSourceError extends AppError {
  public readonly source: string;

  constructor(source: string, message?: string) {
    super(message || `Failed to fetch data from ${source}`, 502, "DATA_SOURCE_ERROR");
    this.name = "DataSourceError";
    this.source = source;
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = "Authentication required") {
    super(message, 401, "UNAUTHORIZED");
    this.name = "AuthenticationError";
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = "Access denied") {
    super(message, 403, "FORBIDDEN");
    this.name = "ForbiddenError";
  }
}

export class ValidationError extends AppError {
  public readonly field?: string;

  constructor(message: string, field?: string) {
    super(message, 400, "VALIDATION_ERROR");
    this.name = "ValidationError";
    this.field = field;
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = "Resource") {
    super(`${resource} not found`, 404, "NOT_FOUND");
    this.name = "NotFoundError";
  }
}

export class AIParseError extends AppError {
  constructor(message: string = "Failed to parse AI response") {
    super(message, 500, "AI_PARSE_ERROR");
    this.name = "AIParseError";
  }
}

/**
 * Check if an error is a known AppError.
 * Use in catch blocks to return structured responses.
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
