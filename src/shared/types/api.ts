import type { ErrorCode } from '@/shared/constants/errorCodes';

export interface ApiErrorBody {
  error: {
    code: ErrorCode;
    message: string;
    details?: unknown;
  };
}

export interface HealthResponse {
  status: 'ok';
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AdminMeResponse {
  email: string;
}
