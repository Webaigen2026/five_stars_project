import { Suspense } from "react";

import ForgotPasswordVerifyContent from "../../../components/auth/ForgotPasswordVerifyContent";
import Footer from "../../../components/layout/Footer";
import Header from "../../../components/layout/Header";

function VerifyFallback() {
  return (
    <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
        Five Stars
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
        Enter verification code
      </h1>
      <p className="mt-3 text-slate-600">Loading...</p>
    </div>
  );
}

export default function ForgotPasswordVerifyPage() {
  return (
    <>
      <Header />

      <main className="min-h-screen bg-slate-50">
        <section className="mx-auto flex max-w-7xl justify-center px-6 py-20">
          <Suspense fallback={<VerifyFallback />}>
            <ForgotPasswordVerifyContent />
          </Suspense>
        </section>
      </main>

      <Footer />
    </>
  );
}
