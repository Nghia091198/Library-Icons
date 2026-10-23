import { ERROR_CODE, type ErrorCode } from '@/shared/constants/errorCodes';
import { isApiErrorBody } from '@/shared/lib/apiErrorBody';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestOptions {
  body?: unknown;
}

async function request<TResponse>(method: string, path: string, options: RequestOptions = {}): Promise<TResponse> {
  const headers = new Headers({ Accept: 'application/json' });
  const init: RequestInit = { method, headers, credentials: 'same-origin' };
  if (options.body !== undefined) {
    headers.set('Content-Type', 'application/json');
    init.body = JSON.stringify(options.body);
  }

  const response = await fetch(path, init);
  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    if (isApiErrorBody(body)) throw new ApiError(response.status, body.error.code, body.error.message);
    throw new ApiError(response.status, ERROR_CODE.internal, `Request failed with status ${response.status}`);
  }
  return body as TResponse;
}

export const api = {
  get: <TResponse>(path: string) => request<TResponse>('GET', path),
  post: <TResponse>(path: string, body?: unknown) => request<TResponse>('POST', path, { body }),
  put: <TResponse>(path: string, body: unknown) => request<TResponse>('PUT', path, { body }),
  patch: <TResponse>(path: string, body: unknown) => request<TResponse>('PATCH', path, { body }),
  delete: <TResponse>(path: string) => request<TResponse>('DELETE', path),
};
