import { Suspense } from "react";

import LoginContent from "../../components/auth/LoginContent";
import Footer from "../../components/layout/Footer";
import Header from "../../components/layout/Header";

function LoginFallback() {
  return (
    <div className="fs-auth-card w-full max-w-md rounded-3xl border border-slate-200 bg-white shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
        Welcome Back
      </p>

      <h1 className="font-american-sans mt-3 text-3xl font-light tracking-[-0.02em] text-slate-950">
        Sign in to Five Stars.
      </h1>

      <p className="mt-3 font-normal leading-6 text-slate-600">
        Loading sign-in form...
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <>
      <Header />

      <main className="min-h-screen bg-slate-50">
        <section className="fs-container flex justify-center fs-auth-shell">
          <Suspense fallback={<LoginFallback />}>
            <LoginContent />
          </Suspense>
        </section>
      </main>

      <Footer />
    </>
  );
}