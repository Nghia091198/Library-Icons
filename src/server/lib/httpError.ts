import { z } from '@hono/zod-openapi';
import { ERROR_CODE, type ErrorCode } from '@/shared/constants/errorCodes';
import type { ApiErrorBody } from '@/shared/types/api';

export const HTTP_STATUS = {
  badRequest: 400,
  unauthorized: 401,
  forbidden: 403,
  notFound: 404,
  conflict: 409,
  payloadTooLarge: 413,
  unprocessable: 422,
  tooManyRequests: 429,
  internal: 500,
} as const;

export type ErrorStatus = (typeof HTTP_STATUS)[keyof typeof HTTP_STATUS];

export class HttpError extends Error {
  constructor(
    readonly status: ErrorStatus,
    readonly code: ErrorCode,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export function toErrorBody(code: ErrorCode, message: string, details?: unknown): ApiErrorBody {
  return details === undefined ? { error: { code, message } } : { error: { code, message, details } };
}

export const ErrorBodySchema = z
  .object({
    error: z.object({
      code: z.nativeEnum(ERROR_CODE),
      message: z.string(),
      details: z.unknown().optional(),
    }),
  })
  .openapi('ErrorBody') satisfies z.ZodType<ApiErrorBody>;
