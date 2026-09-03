import { Suspense } from "react";

import VerifyEmailContent from "../../components/auth/VerifyEmailContent";
import Footer from "../../components/layout/Footer";
import Header from "../../components/layout/Header";

function VerifyEmailFallback() {
  return (
    <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
        Email Verification
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
        Verifying your email
      </h1>
      <p className="mt-4 text-slate-600">
        Please wait while we confirm your verification link.
      </p>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <>
      <Header />

      <main className="min-h-screen bg-slate-50">
        <section className="mx-auto flex max-w-7xl justify-center px-6 py-20">
          <Suspense fallback={<VerifyEmailFallback />}>
            <VerifyEmailContent />
          </Suspense>
        </section>
      </main>

      <Footer />
    </>
  );
}
