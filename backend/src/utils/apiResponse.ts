import { Response } from 'express';

interface ApiResponseOptions {
  success: boolean;
  message: string;
  data?: unknown;
  errors?: unknown;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

export class ApiResponse {
  static success(res: Response, message: string, data?: unknown, statusCode = 200, meta?: ApiResponseOptions['meta']): Response {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
      ...(meta && { meta }),
    });
  }

  static created(res: Response, message: string, data?: unknown): Response {
    return this.success(res, message, data, 201);
  }

  static error(res: Response, message: string, statusCode = 400, errors?: unknown): Response {
    return res.status(statusCode).json({
      success: false,
      message,
      errors,
    });
  }

  static notFound(res: Response, message = 'Resource not found'): Response {
    return this.error(res, message, 404);
  }

  static unauthorized(res: Response, message = 'Unauthorized'): Response {
    return this.error(res, message, 401);
  }

  static forbidden(res: Response, message = 'Forbidden'): Response {
    return this.error(res, message, 403);
  }

  static validationError(res: Response, errors: unknown): Response {
    return this.error(res, 'Validation failed', 422, errors);
  }

  static serverError(res: Response, message = 'Internal server error'): Response {
    return this.error(res, message, 500);
  }

  static paginated(
    res: Response,
    message: string,
    data: unknown[],
    page: number,
    limit: number,
    total: number
  ): Response {
    const totalPages = Math.ceil(total / limit);
    return this.success(res, message, data, 200, {
      page,
      limit,
      total,
      totalPages,
    });
  }
}
