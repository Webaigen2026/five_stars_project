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

      <main className="min-h-screen bg-white">
        {/* Page heading */}
        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-[1180px] px-6 py-9 sm:px-8 lg:px-10 lg:py-10">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#0078D2]">
              Contact
            </p>

            <h1 className="mt-2 text-[28px] font-semibold tracking-[-0.025em] text-slate-950 sm:text-[30px]">
              How can we help?
            </h1>

            <p className="mt-2 max-w-[650px] text-[13px] leading-[21px] text-slate-600">
              Get in touch with Five Stars about flights, cargo, private
              charter, or an existing reservation.
            </p>
          </div>
        </section>

        {/* Contact form */}
        <section className="bg-white">
          <div className="mx-auto max-w-[900px] px-6 py-9 sm:px-8 lg:py-10">
            <div className="border-b border-slate-200 pb-5">
              <h2 className="text-[18px] font-semibold tracking-[-0.015em] text-slate-950">
                Contact Five Stars
              </h2>

              <p className="mt-1 text-[12px] leading-5 text-slate-500">
                Send us a message and our customer care team will review your
                request.
              </p>
            </div>

            <div className="pt-6">
              <ContactForm
                defaultFullName={defaultFullName}
                defaultEmail={user?.email ?? ""}
              />
            </div>

            {/* Contact guidance */}
            <div className="mt-9 border-t border-slate-200 pt-6">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                What can we help with?
              </p>

              <div className="mt-4 grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
                <SupportItem
                  title="Flights"
                  description="Booking and reservation support."
                />

                <SupportItem
                  title="Cargo"
                  description="Cargo requests and shipment questions."
                />

                <SupportItem
                  title="Private charter"
                  description="Private travel and charter requests."
                />

                <SupportItem
                  title="Existing trip"
                  description="Help with an existing reservation."
                />
              </div>
            </div>

            {/* Reservation note */}
            <div className="mt-6 border-t border-slate-200 pt-5">
              <p className="max-w-[680px] text-[11px] leading-[18px] text-slate-500">
                For questions about an existing trip, include your booking
                reference in the message so our team can locate your
                reservation more quickly.
              </p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}

function SupportItem({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <h3 className="text-[12px] font-semibold leading-5 text-slate-900">
        {title}
      </h3>

      <p className="mt-1 text-[11px] leading-[17px] text-slate-500">
        {description}
      </p>
    </div>
  );
}