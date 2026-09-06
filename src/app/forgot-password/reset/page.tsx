import ForgotPasswordResetContent from "../../../components/auth/ForgotPasswordResetContent";
import Footer from "../../../components/layout/Footer";
import Header from "../../../components/layout/Header";

export default function ForgotPasswordResetPage() {
  return (
    <>
      <Header />

      <main className="min-h-screen bg-slate-50">
        <section className="fs-container flex justify-center fs-auth-shell">
          <ForgotPasswordResetContent />
        </section>
      </main>

      <Footer />
    </>
  );
}
