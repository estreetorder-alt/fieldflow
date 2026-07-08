import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

/** Hash a plaintext password for storage. Always use this when writing a password. */
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

/** True if a stored password value looks like a bcrypt hash (vs. legacy plaintext). */
export function isHashed(stored: string): boolean {
  return /^\$2[aby]?\$\d{2}\$/.test(stored);
}

/**
 * Verify a login attempt against a stored password value.
 * Supports legacy plaintext rows (pre-hashing) via direct comparison so existing
 * accounts keep working — callers should re-hash and save on a successful legacy match.
 */
export async function verifyPassword(plain: string, stored: string): Promise<boolean> {
  if (isHashed(stored)) return bcrypt.compare(plain, stored);
  return plain === stored; // legacy plaintext row
}
