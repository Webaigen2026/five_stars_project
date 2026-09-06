import ContactForm from "../../components/contact/ContactForm";
import Footer from "../../components/layout/Footer";
import Header from "../../components/layout/Header";
import { getCurrentUser } from "../../lib/auth";

export default async function ContactPage() {
  const user = await getCurrentUser();

  const defaultFullName = [user?.firstName, user?.lastName]
    .filter((value) => Boolean(value?.trim()))
    .join(" ")
    .trim();

  return (
    <>
      <Header />

      <main className="min-h-screen bg-slate-50">
        <section className="border-b border-slate-200 bg-white">
          <div className="fs-container fs-page-header">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
              Contact
            </p>

            <h1 className="font-american-sans mt-2 text-4xl font-light tracking-[-0.025em] text-slate-950 sm:text-5xl">
              How can we help?
            </h1>

            <p className="mt-4 max-w-2xl text-lg font-normal leading-8 text-slate-600">
              Contact the Five Stars team with questions about flights, cargo,
              charter services, or an existing reservation.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
            <ContactForm
              defaultFullName={defaultFullName}
              defaultEmail={user?.email ?? ""}
            />
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}