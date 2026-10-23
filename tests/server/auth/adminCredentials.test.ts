import { describe, expect, it } from 'vitest';
import { areValidAdminCredentials } from '@/server/auth/adminCredentials';

const EXPECTED = { email: 'admin@example.com', password: 'correct-password' };

describe('areValidAdminCredentials', () => {
  it('accepts matching credentials', () => {
    expect(areValidAdminCredentials(EXPECTED, EXPECTED)).toBe(true);
  });

  it('ignores email case and surrounding whitespace', () => {
    expect(areValidAdminCredentials({ ...EXPECTED, email: '  ADMIN@example.com ' }, EXPECTED)).toBe(true);
  });

  it('rejects a wrong password', () => {
    expect(areValidAdminCredentials({ ...EXPECTED, password: 'correct-passwor' }, EXPECTED)).toBe(false);
  });

  it('treats the password as case-sensitive', () => {
    expect(areValidAdminCredentials({ ...EXPECTED, password: 'Correct-Password' }, EXPECTED)).toBe(false);
  });

  it('rejects a wrong email', () => {
    expect(areValidAdminCredentials({ ...EXPECTED, email: 'other@example.com' }, EXPECTED)).toBe(false);
  });
});
