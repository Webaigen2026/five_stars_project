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
          <div className="mx-auto max-w-7xl px-6 py-16">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
              Contact
            </p>

            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
              How can we help?
            </h1>

            <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
              Contact the StarJet team with questions about flights, cargo,
              charter services, or an existing reservation.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-6 py-12">
          <div className="rounded-3xl border border-slate-200 bg-white p-8">
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
