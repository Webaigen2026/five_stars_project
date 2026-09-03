import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-slate-50">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="grid gap-10 md:grid-cols-3">
          <div>
            <Link
              href="/"
              className="text-2xl font-bold tracking-tight text-slate-950"
            >
              StarJet
            </Link>

            <p className="mt-4 max-w-sm text-sm leading-6 text-slate-600">
              Modern passenger, cargo, and charter travel services connecting
              Haiti and the United States.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-950">Services</h3>

            <div className="mt-4 flex flex-col gap-3 text-sm text-slate-600">
              <Link href="/flights" className="hover:text-primary">
                Flights
              </Link>

              <Link href="/cargo" className="hover:text-primary">
                Cargo
              </Link>

              <Link href="/charter" className="hover:text-primary">
                Charter
              </Link>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-950">Company</h3>

            <div className="mt-4 flex flex-col gap-3 text-sm text-slate-600">
              <Link href="/contact" className="hover:text-primary">
                Contact
              </Link>

              <Link href="/login" className="hover:text-primary">
                Sign In
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-slate-200 pt-6 text-sm text-slate-500">
          © 2026 StarJet. All rights reserved.
        </div>
      </div>
    </footer>
  );
}