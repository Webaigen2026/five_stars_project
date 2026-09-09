import CharterRequestForm from "../../components/charter/CharterRequestForm";
import Footer from "../../components/layout/Footer";
import Header from "../../components/layout/Header";
import { getCurrentUser } from "../../lib/auth";

export default async function CharterPage() {
  const user = await getCurrentUser();

  const defaultFullName = [user?.firstName, user?.lastName]
    .filter((value) => Boolean(value?.trim()))
    .join(" ")
    .trim();

  return (
    <>
      <Header />

      <main className="min-h-screen bg-white">
        {/* Page heading */}
        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-[1080px] px-6 py-10 sm:px-8 sm:py-11">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
              Charter
            </p>

            <h1 className="font-american-sans mt-2.5 text-[30px] font-medium leading-[1.15] tracking-[-0.025em] text-slate-950 sm:text-[32px]">
              Private charter requests
            </h1>

            <p className="mt-3 max-w-[680px] text-[14px] font-normal leading-6 text-slate-600">
              Request customized private air travel based on your schedule,
              route, passenger count, and aircraft preferences.
            </p>
          </div>
        </section>

        {/* Charter request form */}
        <section className="bg-slate-50/60">
          <div className="mx-auto max-w-[800px] px-6 py-10 sm:px-8 sm:py-12">
            <CharterRequestForm
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