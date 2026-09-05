import ForgotPasswordContent from "../../components/auth/ForgotPasswordContent";
import Footer from "../../components/layout/Footer";
import Header from "../../components/layout/Header";

export default function ForgotPasswordPage() {
  return (
    <>
      <Header />

      <main className="min-h-screen bg-slate-50">
        <section className="mx-auto flex max-w-7xl justify-center px-6 py-20">
          <ForgotPasswordContent />
        </section>
      </main>

      <Footer />
    </>
  );
}
