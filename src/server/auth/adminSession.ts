import { sign, verify } from 'hono/jwt';

export const ADMIN_SESSION_COOKIE = 'lib_icons_admin_session';
export const ADMIN_SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

const JWT_ALGORITHM = 'HS256';

export function currentUnixSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

export function createAdminSessionToken(
  email: string,
  secret: string,
  issuedAtSeconds: number = currentUnixSeconds(),
): Promise<string> {
  return sign(
    { sub: email, iat: issuedAtSeconds, exp: issuedAtSeconds + ADMIN_SESSION_TTL_SECONDS },
    secret,
    JWT_ALGORITHM,
  );
}

export async function readAdminSessionEmail(token: string, secret: string): Promise<string | null> {
  try {
    const payload = await verify(token, secret, JWT_ALGORITHM);
    return typeof payload.sub === 'string' ? payload.sub : null;
  } catch {
    return null;
  }
}
