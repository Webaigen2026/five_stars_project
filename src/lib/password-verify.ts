import bcrypt from "bcryptjs";

/**
 * Narrow password check against a stored bcrypt hash.
 * Never logs plaintext or hash values.
 */
export async function verifyUserPassword(
  password: string,
  passwordHash: string
) {
  return bcrypt.compare(password, passwordHash);
}
