import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/response.js';
import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void {
  logger.error(`Unhandled Error [${req.method} ${req.originalUrl}]:`, err);

  const statusCode = err.statusCode || err.status || 500;
  let message = err.message || 'Internal server error occurred';
  const code = err.code || 'INTERNAL_SERVER_ERROR';

  // In production, prevent leaking internal SQL, filesystem paths, or system exceptions
  const isDbOrPrismaError =
    err?.name?.includes?.('Prisma') ||
    err?.constructor?.name?.includes?.('Prisma') ||
    (typeof message === 'string' &&
      (message.toLowerCase().includes('prisma') ||
        message.toLowerCase().includes('postgres') ||
        message.toLowerCase().includes('database') ||
        message.toLowerCase().includes('foreign key') ||
        message.toLowerCase().includes('unique constraint') ||
        message.toLowerCase().includes('select ') ||
        message.toLowerCase().includes('insert into') ||
        message.toLowerCase().includes('update ') ||
        message.toLowerCase().includes('delete from')));

  if (config.isProduction) {
    if (statusCode >= 500 || isDbOrPrismaError) {
      message = 'An internal server error occurred. Please try again or contact support.';
    }
  } else if (typeof message === 'string') {
    // Sanitize any accidental database connection strings with passwords in non-prod
    message = message.replace(/postgresql:\/\/[^@]+@/gi, 'postgresql://***:***@');
  }

  const details = config.isProduction ? undefined : (typeof err.stack === 'string' ? err.stack.replace(/postgresql:\/\/[^@]+@/gi, 'postgresql://***:***@') : undefined);

  sendError(res, message, statusCode, code, details);
}

export function notFoundHandler(req: Request, res: Response): void {
  sendError(res, `Route not found: [${req.method}] ${req.originalUrl}`, 404, 'NOT_FOUND');
}
