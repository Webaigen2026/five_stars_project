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

      <main className="min-h-screen bg-white">
        <section className="border-b border-slate-200">
          <div className="mx-auto max-w-6xl px-6 py-8 lg:px-8">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
              Cargo
            </p>

            <h1 className="font-american-sans mt-2 text-[30px] font-medium leading-[1.15] tracking-[-0.02em] text-slate-950 sm:text-[32px]">
              Cargo shipping
            </h1>

            <p className="mt-2 max-w-2xl text-[14px] leading-6 text-slate-600">
              Send documents, boxes, barrels, pallets, and other cargo
              between Haiti and the United States.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-8 lg:px-8">
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