import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { sendError } from '../utils/response.js';

export function validateBody(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        const detailedMsg = errors.map((e) => `${e.field ? e.field + ': ' : ''}${e.message}`).join(', ');
        sendError(res, detailedMsg ? `Validation error: ${detailedMsg}` : 'Validation error in request body', 422, 'VALIDATION_ERROR', errors);
        return;
      }
      next(error);
    }
  };
}

export function validateQuery(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.query = schema.parse(req.query);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        const detailedMsg = errors.map((e) => `${e.field ? e.field + ': ' : ''}${e.message}`).join(', ');
        sendError(res, detailedMsg ? `Validation error: ${detailedMsg}` : 'Validation error in query parameters', 422, 'VALIDATION_ERROR', errors);
        return;
      }
      next(error);
    }
  };
}
