import Link from "next/link";

export default function ForgotPasswordSuccessContent() {
  return (
    <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
        Five Stars
      </p>

      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
        Password updated
      </h1>

      <p className="mt-4 text-slate-600">
        Your password has been changed successfully.
      </p>

      <p className="mt-2 text-slate-600">
        For security, please sign in again.
      </p>

      <Link
        href="/login"
        className="mt-8 inline-flex w-full items-center justify-center rounded-xl bg-primary px-5 py-3 font-semibold text-white transition hover:bg-primary-hover"
      >
        Sign in
      </Link>
    </div>
  );
}
