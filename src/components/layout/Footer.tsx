import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-slate-50">
      <div className="fs-container fs-section-y">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <Link
              href="/"
              className="font-american-sans text-2xl font-light tracking-[-0.02em] text-slate-950"
            >
              Five Stars
            </Link>

            <p className="mt-4 max-w-sm text-sm font-normal leading-6 text-slate-600">
              Modern passenger, cargo, and charter travel services connecting
              Haiti and the United States.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-950">
              Services
            </h3>

            <div className="mt-4 flex flex-col gap-3 text-sm text-slate-600">
              <Link
                href="/flights"
                className="transition hover:text-primary"
              >
                Flights
              </Link>

              <Link
                href="/cargo"
                className="transition hover:text-primary"
              >
                Cargo
              </Link>

              <Link
                href="/charter"
                className="transition hover:text-primary"
              >
                Charter
              </Link>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-950">
              Company
            </h3>

            <div className="mt-4 flex flex-col gap-3 text-sm text-slate-600">
              <Link
                href="/contact"
                className="transition hover:text-primary"
              >
                Contact
              </Link>

              <Link
                href="/find-trip"
                className="transition hover:text-primary"
              >
                Find My Trip
              </Link>

              <Link
                href="/login"
                className="transition hover:text-primary"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-slate-200 pt-6 text-sm text-slate-500">
          © 2026 Five Stars. All rights reserved.
        </div>
      </div>
    </footer>
  );
}