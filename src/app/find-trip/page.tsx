import FindTripContent from "../../components/auth/FindTripContent";
import Footer from "../../components/layout/Footer";
import Header from "../../components/layout/Header";

export default function FindTripPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-slate-50">
        <section className="fs-container flex justify-center fs-auth-shell">
          <FindTripContent />
        </section>
      </main>
      <Footer />
    </>
  );
}
