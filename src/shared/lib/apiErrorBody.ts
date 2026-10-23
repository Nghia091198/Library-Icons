import { isErrorCode } from '@/shared/constants/errorCodes';
import type { ApiErrorBody } from '@/shared/types/api';

export function isApiErrorBody(value: unknown): value is ApiErrorBody {
  if (typeof value !== 'object' || value === null || !('error' in value)) return false;
  const { error } = value;
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    isErrorCode(error.code) &&
    'message' in error &&
    typeof error.message === 'string'
  );
}
