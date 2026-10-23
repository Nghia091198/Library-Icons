import { describe, expect, it } from 'vitest';
import { ERROR_CODE } from '@/shared/constants/errorCodes';
import { isApiErrorBody } from '@/shared/lib/apiErrorBody';

describe('isApiErrorBody', () => {
  it('accepts a well-formed error body', () => {
    expect(isApiErrorBody({ error: { code: ERROR_CODE.notFound, message: 'Route not found' } })).toBe(true);
  });

  it('accepts an error body with details', () => {
    expect(
      isApiErrorBody({ error: { code: ERROR_CODE.validationFailed, message: 'Invalid', details: { field: 'x' } } }),
    ).toBe(true);
  });

  it.each([
    ['null', null],
    ['a string', 'error'],
    ['an object without error', { message: 'x' }],
    ['an unknown error code', { error: { code: 'SOMETHING_ELSE', message: 'x' } }],
    ['a non-string message', { error: { code: ERROR_CODE.internal, message: 42 } }],
  ])('rejects %s', (_label, value) => {
    expect(isApiErrorBody(value)).toBe(false);
  });
});
