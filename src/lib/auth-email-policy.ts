/**
 * Email verification auth policy (D14.1.1).
 *
 * Verification remains available and persisted, but does NOT gate
 * ordinary email/password sign-in for customers.
 */

/** Ordinary login must not require emailVerified. */
export const EMAIL_VERIFICATION_REQUIRED_FOR_LOGIN = false;

/**
 * Whether valid credentials may establish a session regardless of
 * emailVerified. Password/lockout/role checks remain elsewhere.
 */
export function canSignInWithCredentials(_input: {
  emailVerified: boolean;
}) {
  if (EMAIL_VERIFICATION_REQUIRED_FOR_LOGIN) {
    return _input.emailVerified === true;
  }

  // D14.1.1: registered + valid password is enough for normal sign-in.
  return true;
}

/** Copy helpers for optional verification UX. */
export const OPTIONAL_VERIFICATION_COPY = {
  loginAfterRegister:
    "You can sign in now. We also sent an optional email verification link to help secure your account.",
  loginAfterRegisterEmailFailed:
    "Your account was created. We couldn't send the verification email right now — you can still sign in, and resend verification later from your account.",
  emailEncourage:
    "Confirm your email so we know we can reach you and help keep your account secure.",
  emailOptionalNote:
    "Your account can still be used if you choose to verify later.",
} as const;
