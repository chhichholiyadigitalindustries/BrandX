import { Response } from 'express';
import { ApiResponse } from '../types/index.js';

export function sendSuccess<T>(
  res: Response,
  data: T,
  message: string = 'Success',
  statusCode: number = 200,
  meta?: ApiResponse['meta']
): void {
  const payload: ApiResponse<T> = {
    success: true,
    message,
    data,
    meta,
  };
  res.status(statusCode).json(payload);
}

export function sendError(
  res: Response,
  message: string,
  statusCode: number = 400,
  code: string = 'BAD_REQUEST',
  details?: any
): void {
  const payload: ApiResponse = {
    success: false,
    error: {
      code,
      message,
      details,
    },
  };
  res.status(statusCode).json(payload);
}

export function sendPaginated<T>(
  res: Response,
  items: T[],
  total: number,
  page: number,
  limit: number,
  message: string = 'Data retrieved successfully'
): void {
  const totalPages = Math.ceil(total / limit) || 1;
  const payload: ApiResponse<T[]> = {
    success: true,
    message,
    data: items,
    meta: {
      page,
      limit,
      total,
      totalPages,
    },
  };
  res.status(200).json(payload);
}
