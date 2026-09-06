import ForgotPasswordSuccessContent from "../../../components/auth/ForgotPasswordSuccessContent";
import Footer from "../../../components/layout/Footer";
import Header from "../../../components/layout/Header";

export default function ForgotPasswordSuccessPage() {
  return (
    <>
      <Header />

      <main className="min-h-screen bg-slate-50">
        <section className="fs-container flex justify-center fs-auth-shell">
          <ForgotPasswordSuccessContent />
        </section>
      </main>

      <Footer />
    </>
  );
}
