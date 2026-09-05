import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

export function isPasswordWithinLimit(plain: string): boolean {
  return !bcrypt.truncates(plain);
}

export async function hashPassword(plain: string): Promise<string> {
  if (!isPasswordWithinLimit(plain)) throw new Error('密码不能超过 72 字节');
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  if (!isPasswordWithinLimit(plain)) return false;
  return bcrypt.compare(plain, hash);
}
