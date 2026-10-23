export const ERROR_CODE = {
  unauthorized: 'UNAUTHORIZED',
  invalidCredentials: 'INVALID_CREDENTIALS',
  tooManyRequests: 'TOO_MANY_REQUESTS',
  forbidden: 'FORBIDDEN',
  notFound: 'NOT_FOUND',
  validationFailed: 'VALIDATION_FAILED',
  payloadTooLarge: 'PAYLOAD_TOO_LARGE',
  slugTaken: 'SLUG_TAKEN',
  duplicateIcon: 'DUPLICATE_ICON',
  invalidIcon: 'INVALID_ICON',
  invalidState: 'INVALID_STATE',
  internal: 'INTERNAL_ERROR',
} as const;

export type ErrorCode = (typeof ERROR_CODE)[keyof typeof ERROR_CODE];

const ERROR_CODE_VALUES: ReadonlySet<string> = new Set(Object.values(ERROR_CODE));

export function isErrorCode(value: unknown): value is ErrorCode {
  return typeof value === 'string' && ERROR_CODE_VALUES.has(value);
}
