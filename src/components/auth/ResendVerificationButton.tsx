"use client";

import { useState } from "react";

type ResendVerificationButtonProps = {
  email: string;
};

export default function ResendVerificationButton({
  email,
}: ResendVerificationButtonProps) {
  const [isSending, setIsSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleResend() {
    if (isSending) {
      return;
    }

    setIsSending(true);
    setMessage(null);

    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { message?: string }
        | null;

      setMessage(
        payload?.message ??
          "If an eligible account exists, a verification link has been sent."
      );
    } catch {
      setMessage(
        "If an eligible account exists, a verification link has been sent."
      );
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={handleResend}
        disabled={isSending}
        className="text-sm font-semibold text-primary transition hover:text-primary-hover disabled:opacity-70"
      >
        {isSending ? "Sending..." : "Resend verification"}
      </button>

      {message && (
        <p className="mt-2 text-xs text-slate-500">{message}</p>
      )}
    </div>
  );
}
