import ContactForm from "../../components/contact/ContactForm";
import Footer from "../../components/layout/Footer";
import Header from "../../components/layout/Header";
import { getCurrentUser } from "../../lib/auth";

function TicketCutouts() {
  return (
    <>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -left-4 -top-4 z-20 hidden h-8 w-8 rounded-full bg-slate-50 sm:block"
      />

      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-4 -top-4 z-20 hidden h-8 w-8 rounded-full bg-slate-50 sm:block"
      />

      <span
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-4 -left-4 z-20 hidden h-8 w-8 rounded-full bg-slate-50 sm:block"
      />

      <span
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-4 -right-4 z-20 hidden h-8 w-8 rounded-full bg-slate-50 sm:block"
      />
    </>
  );
}

function DesktopPerforationCutouts() {
  return (
    <>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -left-[11px] -top-[11px] z-30 hidden h-[22px] w-[22px] rounded-full bg-slate-50 lg:block"
      />

      <span
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-[11px] -left-[11px] z-30 hidden h-[22px] w-[22px] rounded-full bg-slate-50 lg:block"
      />
    </>
  );
}

function MobilePerforationCutouts() {
  return (
    <>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -left-[11px] -top-[11px] z-30 h-[22px] w-[22px] rounded-full bg-slate-50 lg:hidden"
      />

      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-[11px] -top-[11px] z-30 h-[22px] w-[22px] rounded-full bg-slate-50 lg:hidden"
      />
    </>
  );
}

function MessageIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-6 w-6"
      aria-hidden="true"
    >
      <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z" />
    </svg>
  );
}

export default async function ContactPage() {
  const user = await getCurrentUser();

  const defaultFullName = [user?.firstName, user?.lastName]
    .filter((value) => Boolean(value?.trim()))
    .join(" ")
    .trim();

  return (
    <>
      <Header />

      <main className="min-h-screen overflow-x-hidden bg-slate-50">
        {/* =========================================================
            PAGE HEADER
        ========================================================= */}
        <section className="border-b border-slate-200 bg-white">
          <div className="fs-container fs-page-header">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#0078D2]">
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

        {/* =========================================================
            CONTACT TICKET
        ========================================================= */}
        <section className="fs-container py-8 sm:py-10 lg:py-12">
          <div className="relative isolate mx-auto w-full max-w-6xl">
            {/* Soft floating shadow */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-10 -bottom-4 -z-10 h-10 rounded-[50%] bg-slate-950/[0.08] blur-2xl"
            />

            <div className="relative overflow-hidden bg-white shadow-[0_8px_30px_rgba(15,23,42,0.07)]">
              <TicketCutouts />

              <div className="grid min-w-0 lg:grid-cols-[minmax(0,1fr)_300px]">
                {/* =================================================
                    MAIN FORM
                ================================================= */}
                <div className="min-w-0 px-5 py-6 sm:px-7 sm:py-8 lg:px-9 lg:py-10">
                  <div className="flex items-start gap-4">
                    {/* <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#0078D2]/[0.07] text-[#0078D2]">
                      <MessageIcon />
                    </div> */}

                    <div className="min-w-0">
                      {/* <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0078D2]">
                        Send us a message
                      </p> */}

                      <h2 className="font-american-sans mt-2 text-2xl font-light tracking-[-0.02em] text-slate-950 sm:text-3xl">
                        Tell us how we can help
                      </h2>

                      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                        Complete the form below and provide as much detail as
                        possible about your question or request.
                      </p>
                    </div>
                  </div>

                  <div className="my-7 border-t border-dashed border-slate-200" />

                  <ContactForm
                    defaultFullName={defaultFullName}
                    defaultEmail={user?.email ?? ""}
                  />

                  <div className="mt-8 flex flex-col gap-2 border-t border-dashed border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                      Five Stars • Customer Care
                    </p>

                    <p className="text-xs text-slate-400">
                      Contact request
                    </p>
                  </div>
                </div>

                {/* =================================================
                    CONTACT STUB
                ================================================= */}
                <aside
                  className="
                    relative
                    min-w-0
                    border-t
                    border-dashed
                    border-slate-300
                    bg-slate-50/45
                    px-5
                    py-6
                    sm:px-7
                    lg:border-l
                    lg:border-t-0
                    lg:px-6
                    lg:py-10
                  "
                  aria-label="Contact information"
                >
                  <DesktopPerforationCutouts />
                  <MobilePerforationCutouts />

                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#0078D2]">
                      Five Stars
                    </p>

                    <h2 className="font-american-sans mt-2 text-2xl font-light tracking-[-0.02em] text-slate-950">
                      Customer care
                    </h2>

                    <p className="mt-3 text-sm leading-6 text-slate-600">
                      We&apos;re here to help with your Five Stars travel and
                      service questions.
                    </p>
                  </div>

                  <div className="my-7 border-t border-dashed border-slate-300" />

                  <dl className="space-y-6">
                    <div>
                      <dt className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                        Flights
                      </dt>

                      <dd className="mt-1.5 text-sm font-medium leading-6 text-slate-800">
                        Booking and reservation questions
                      </dd>
                    </div>

                    <div>
                      <dt className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                        Cargo
                      </dt>

                      <dd className="mt-1.5 text-sm font-medium leading-6 text-slate-800">
                        Cargo service inquiries
                      </dd>
                    </div>

                    <div>
                      <dt className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                        Charter
                      </dt>

                      <dd className="mt-1.5 text-sm font-medium leading-6 text-slate-800">
                        Private charter requests
                      </dd>
                    </div>

                    <div>
                      <dt className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                        Existing trip
                      </dt>

                      <dd className="mt-1.5 text-sm font-medium leading-6 text-slate-800">
                        Questions about an existing reservation
                      </dd>
                    </div>
                  </dl>

                  <div className="my-7 border-t border-dashed border-slate-300" />

                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#0078D2]/[0.07] text-[#0078D2]">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-3.5 w-3.5"
                        aria-hidden="true"
                      >
                        <path d="M12 8v4l3 2" />
                        <circle cx="12" cy="12" r="9" />
                      </svg>
                    </span>

                    <p className="text-xs leading-5 text-slate-500">
                      Include your booking reference in your message when
                      contacting us about an existing reservation.
                    </p>
                  </div>

                  {/* Ticket stub branding */}
                  <div className="mt-10 border-t border-dashed border-slate-300 pt-5">
                    <p className="text-center text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                      Five Stars
                    </p>

                    <div
                      aria-hidden="true"
                      className="mx-auto mt-3 flex h-7 max-w-[145px] items-stretch justify-center gap-[2px] overflow-hidden opacity-25"
                    >
                      <span className="w-px bg-slate-950" />
                      <span className="w-[3px] bg-slate-950" />
                      <span className="w-px bg-slate-950" />
                      <span className="w-[2px] bg-slate-950" />
                      <span className="w-px bg-slate-950" />
                      <span className="w-[4px] bg-slate-950" />
                      <span className="w-[2px] bg-slate-950" />
                      <span className="w-px bg-slate-950" />
                      <span className="w-[3px] bg-slate-950" />
                      <span className="w-px bg-slate-950" />
                      <span className="w-[2px] bg-slate-950" />
                      <span className="w-[4px] bg-slate-950" />
                      <span className="w-px bg-slate-950" />
                      <span className="w-[2px] bg-slate-950" />
                      <span className="w-px bg-slate-950" />
                      <span className="w-[3px] bg-slate-950" />
                      <span className="w-px bg-slate-950" />
                      <span className="w-[2px] bg-slate-950" />
                      <span className="w-px bg-slate-950" />
                    </div>
                  </div>
                </aside>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}