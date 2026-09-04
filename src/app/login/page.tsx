import { Suspense } from "react";

import LoginContent from "../../components/auth/LoginContent";
import Footer from "../../components/layout/Footer";
import Header from "../../components/layout/Header";

function LoginFallback() {
  return (
    <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
        Welcome Back
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
        Sign in to Five Stars
      </h1>
      <p className="mt-3 text-slate-600">Loading sign-in form...</p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <>
      <Header />

      <main className="min-h-screen bg-slate-50">
        <section className="mx-auto flex max-w-7xl justify-center px-6 py-20">
          <Suspense fallback={<LoginFallback />}>
            <LoginContent />
          </Suspense>
        </section>
      </main>

      <Footer />
    </>
  );
}
