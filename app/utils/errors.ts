/**
 * Error handling utilities for consistent error management
 */

// Base error class for application errors
export class AppError extends Error {
  public code: string;
  public details?: any;
  public userMessage: string;
  public isUserVisible: boolean;

  constructor(options: {
    message: string;
    code: string;
    details?: any;
    userMessage?: string;
    isUserVisible?: boolean;
  }) {
    super(options.message);
    this.name = this.constructor.name;
    this.code = options.code;
    this.details = options.details;
    this.userMessage = options.userMessage || options.message;
    this.isUserVisible = options.isUserVisible !== undefined ? options.isUserVisible : true;

    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

// Specific error classes

/**
 * Error for validation failures
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super({
      message,
      code: 'VALIDATION_ERROR',
      details,
      userMessage: message,
      isUserVisible: true
    });
  }
}

/**
 * Error for database operation failures
 */
export class DatabaseError extends AppError {
  constructor(message: string, details?: any) {
    super({
      message,
      code: 'DATABASE_ERROR',
      details,
      userMessage: 'A database error occurred. Please try again later.',
      isUserVisible: true
    });
  }
}

/**
 * Error for geographic data processing failures
 */
export class GeoDataError extends AppError {
  constructor(message: string, details?: any) {
    super({
      message,
      code: 'GEO_DATA_ERROR',
      details,
      userMessage: message,
      isUserVisible: true
    });
  }
}

/**
 * Error for CSV import failures
 */
export class ImportError extends AppError {
  constructor(message: string, details?: any) {
    super({
      message,
      code: 'IMPORT_ERROR',
      details,
      userMessage: message,
      isUserVisible: true
    });
  }
}

/**
 * Error for hierarchy validation failures
 */
export class HierarchyError extends AppError {
  constructor(message: string, details?: any) {
    super({
      message,
      code: 'HIERARCHY_ERROR',
      details,
      userMessage: message,
      isUserVisible: true
    });
  }
}

/**
 * Error for transaction failures
 */
export class TransactionError extends AppError {
  constructor(message: string, details?: any) {
    super({
      message,
      code: 'TRANSACTION_ERROR',
      details,
      userMessage: 'A transaction error occurred. Please try again later.',
      isUserVisible: true
    });
  }
}

/**
 * Error for trigger-related failures
 */
export class TriggerError extends AppError {
  constructor(message: string, details?: any) {
    super({
      message,
      code: 'TRIGGER_ERROR',
      details,
      userMessage: message,
      isUserVisible: true
    });
  }
}

/**
 * Format error for client response
 * @param error - Error to format
 * @returns Formatted error object
 */
export function formatErrorForClient(error: unknown): {
  message: string;
  code: string;
  details?: any;
} {
  if (error instanceof AppError) {
    return {
      message: error.userMessage,
      code: error.code,
      details: error.isUserVisible ? error.details : undefined
    };
  } else if (error instanceof Error) {
    return {
      message: 'An unexpected error occurred',
      code: 'UNKNOWN_ERROR',
      details: process.env.NODE_ENV !== 'production' ? error.message : undefined
    };
  } else {
    return {
      message: 'An unknown error occurred',
      code: 'UNKNOWN_ERROR'
    };
  }
}
