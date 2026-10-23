import { createHash, timingSafeEqual } from 'node:crypto';

export interface AdminCredentials {
  email: string;
  password: string;
}

function digest(value: string): Buffer {
  return createHash('sha256').update(value).digest();
}

// So sánh qua digest cùng độ dài để timingSafeEqual không làm lộ độ dài mật khẩu qua thời gian phản hồi.
function safeEqual(actual: string, expected: string): boolean {
  return timingSafeEqual(digest(actual), digest(expected));
}

export function areValidAdminCredentials(input: AdminCredentials, expected: AdminCredentials): boolean {
  const emailMatches = safeEqual(input.email.trim().toLowerCase(), expected.email);
  const passwordMatches = safeEqual(input.password, expected.password);
  return emailMatches && passwordMatches;
}
