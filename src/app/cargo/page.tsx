import CargoRequestForm from "../../components/cargo/CargoRequestForm";
import Footer from "../../components/layout/Footer";
import Header from "../../components/layout/Header";
import { getCurrentUser } from "../../lib/auth";

export default async function CargoPage() {
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
              Cargo
            </p>

            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
              Ship cargo with confidence
            </h1>

            <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
              Request transportation for documents, boxes, barrels, pallets,
              and other cargo.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-6 py-12">
          <CargoRequestForm
            defaultFullName={defaultFullName}
            defaultEmail={user?.email ?? ""}
          />
        </section>
      </main>

      <Footer />
    </>
  );
}
