import crypto from 'crypto';

export function hashPassword(password: string): { hash: string; salt: string } {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { hash, salt };
}

export function verifyPassword(password: string, storedHash: string, salt: string): boolean {
  try {
    const hashToVerify = crypto.scryptSync(password, salt, 64).toString('hex');
    const storedBuffer = Buffer.from(storedHash, 'hex');
    const verifyBuffer = Buffer.from(hashToVerify, 'hex');

    if (storedBuffer.length !== verifyBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(storedBuffer, verifyBuffer);
  } catch (err) {
    return false;
  }
}
