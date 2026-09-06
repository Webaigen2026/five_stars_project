import ForgotPasswordContent from "../../components/auth/ForgotPasswordContent";
import Footer from "../../components/layout/Footer";
import Header from "../../components/layout/Header";

export default function ForgotPasswordPage() {
  return (
    <>
      <Header />

      <main className="min-h-screen bg-slate-50">
        <section className="fs-container flex justify-center fs-auth-shell">
          <ForgotPasswordContent />
        </section>
      </main>

      <Footer />
    </>
  );
}
