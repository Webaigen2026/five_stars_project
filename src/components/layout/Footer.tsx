"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Info,
  Plane,
} from "lucide-react";

type FooterLink = {
  label: string;
  href: string;
  external?: boolean;
};

const helpLinks: FooterLink[] = [
  { label: "Contact Five Stars", href: "/contact" },
  { label: "Find My Trip", href: "/find-trip" },
  { label: "My Trips", href: "/my-trips" },
  { label: "Cargo", href: "/cargo" },
  { label: "Charter services", href: "/charter" },
];

const companyLinks: FooterLink[] = [
  { label: "Flights", href: "/flights" },
  { label: "Passenger travel", href: "/flights" },
  { label: "Cargo services", href: "/cargo" },
  { label: "Private charter", href: "/charter" },
  { label: "Customer support", href: "/contact" },
];

const extraLinks: FooterLink[] = [
  { label: "Saved Travelers", href: "/account/travelers" },
  { label: "Sign in", href: "/login" },
  { label: "Create account", href: "/register" },
  { label: "Find a reservation", href: "/find-trip" },
];

const utilityLinks: FooterLink[] = [
  { label: "Flights", href: "/flights" },
  { label: "Cargo", href: "/cargo" },
  { label: "Charter", href: "/charter" },
  { label: "Contact", href: "/contact" },
  { label: "Find My Trip", href: "/find-trip" },
];

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: FooterLink[];
}) {
  return (
    <div>
      <h2
        className="
          text-[11px]
          font-semibold
          uppercase
          tracking-[0.17em]
          text-slate-500
        "
      >
        {title}
      </h2>

      <ul className="mt-5 space-y-3">
        {links.map((link) => (
          <li key={`${title}-${link.label}`}>
            <Link
              href={link.href}
              target={link.external ? "_blank" : undefined}
              rel={link.external ? "noreferrer" : undefined}
              className="
                group
                inline-flex
                items-center
                gap-1.5
                text-[14px]
                font-medium
                leading-6
                text-slate-700
                transition-colors
                hover:text-[#0078D2]
                focus-visible:outline-none
                focus-visible:ring-2
                focus-visible:ring-[#0078D2]/30
                focus-visible:ring-offset-2
              "
            >
              {link.label}

              {link.external ? (
                <ArrowUpRight
                  aria-hidden="true"
                  className="
                    h-3.5
                    w-3.5
                    transition-transform
                    group-hover:-translate-y-0.5
                    group-hover:translate-x-0.5
                  "
                />
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Footer() {
  const [cookieNoticeVisible, setCookieNoticeVisible] =
    useState(false);

  useEffect(() => {
    const dismissed = window.localStorage.getItem(
      "five-stars-cookie-notice-dismissed"
    );

    if (dismissed !== "1") {
      setCookieNoticeVisible(true);
    }
  }, []);

  function dismissCookieNotice() {
    window.localStorage.setItem(
      "five-stars-cookie-notice-dismissed",
      "1"
    );

    setCookieNoticeVisible(false);
  }

  return (
    <>
      <footer className="border-t border-slate-200 bg-white">
        {/* =====================================================
            MAIN FOOTER
        ====================================================== */}

        <div
          className="
            mx-auto
            grid
            w-full
            max-w-[1540px]
            gap-12
            px-5
            py-12
            sm:px-6
            sm:py-14
            md:grid-cols-2
            lg:grid-cols-[1.25fr_0.75fr_0.75fr_0.75fr]
            lg:gap-14
            lg:px-10
            lg:py-16
            xl:px-12
            xl:gap-20
          "
        >
          {/* BRAND / COMPANY INTRO */}

          <div className="max-w-[340px]">
            <Link
              href="/"
              aria-label="Five Stars home"
              className="
                inline-flex
                items-center
                gap-3
                focus-visible:outline-none
                focus-visible:ring-2
                focus-visible:ring-[#0078D2]/30
                focus-visible:ring-offset-4
              "
            >
              <span
                className="
                  flex
                  h-9
                  w-9
                  items-center
                  justify-center
                  bg-[#0078D2]
                  text-white
                "
              >
                <Plane
                  aria-hidden="true"
                  className="h-4 w-4 -rotate-12"
                />
              </span>

              <span
                className="
                  font-american-sans
                  text-[22px]
                  font-medium
                  tracking-[-0.025em]
                  text-slate-950
                "
              >
                Five Stars
              </span>
            </Link>

            <p
              className="
                mt-5
                max-w-[320px]
                text-[14px]
                leading-6
                text-slate-600
              "
            >
              Passenger travel, cargo, and private charter
              services connecting Haiti and the United States.
            </p>

            <Link
              href="/flights"
              className="
                group
                mt-6
                inline-flex
                items-center
                gap-2
                text-sm
                font-semibold
                text-[#0078D2]
                transition-colors
                hover:text-[#005a9e]
                focus-visible:outline-none
                focus-visible:ring-2
                focus-visible:ring-[#0078D2]/30
                focus-visible:ring-offset-4
              "
            >
              Explore flights

              <ArrowUpRight
                aria-hidden="true"
                className="
                  h-4
                  w-4
                  transition-transform
                  duration-200
                  group-hover:-translate-y-0.5
                  group-hover:translate-x-0.5
                "
              />
            </Link>
          </div>

          <FooterColumn title="Help" links={helpLinks} />

          <FooterColumn
            title="About Five Stars"
            links={companyLinks}
          />

          <FooterColumn title="Extras" links={extraLinks} />
        </div>

        {/* =====================================================
            LOWER FOOTER
        ====================================================== */}

        <div
          className="
            border-t
            border-slate-200
            bg-[#F7F9FB]
          "
        >
          <div
            className="
              mx-auto
              w-full
              max-w-[1540px]
              px-5
              py-6
              sm:px-6
              lg:px-10
              xl:px-12
            "
          >
            {/* UTILITY LINKS */}

            <div
              className="
                flex
                flex-col
                gap-5
                lg:flex-row
                lg:items-center
                lg:justify-between
              "
            >
              <nav
                aria-label="Footer links"
                className="
                  flex
                  flex-wrap
                  items-center
                  gap-x-6
                  gap-y-3
                "
              >
                {utilityLinks.map((link) => (
                  <Link
                    key={link.label}
                    href={link.href}
                    className="
                      text-[13px]
                      font-medium
                      text-slate-600
                      transition-colors
                      hover:text-[#0078D2]
                      focus-visible:outline-none
                      focus-visible:ring-2
                      focus-visible:ring-[#0078D2]/25
                    "
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>

              <p
                className="
                  text-[12px]
                  leading-5
                  text-slate-500
                "
              >
                Haiti ↔ United States
              </p>
            </div>

            {/* COPYRIGHT */}

            <div
              className="
                mt-5
                flex
                flex-col
                gap-2
                border-t
                border-slate-200
                pt-5
                text-[12px]
                leading-5
                text-slate-500
                sm:flex-row
                sm:items-center
                sm:justify-between
              "
            >
              <p>
                © 2026 Five Stars. All rights reserved.
              </p>

              <p>
                Passenger, cargo, and charter services between
                Haiti and the United States.
              </p>
            </div>
          </div>
        </div>
      </footer>

      {/* =====================================================
          PRIVACY / COOKIE NOTICE
      ====================================================== */}

      {cookieNoticeVisible ? (
        <div
          role="dialog"
          aria-label="Privacy and cookies"
          className="
            fixed
            bottom-4
            left-4
            right-4
            z-50
            border
            border-slate-200
            bg-white
            p-5
            shadow-[0_16px_45px_rgba(15,23,42,0.16)]
            sm:left-auto
            sm:right-6
            sm:w-[25rem]
            sm:p-6
            lg:bottom-6
          "
        >
          <div className="flex items-start gap-3">
            <span
              className="
                mt-0.5
                flex
                h-8
                w-8
                shrink-0
                items-center
                justify-center
                bg-[#0078D2]/[0.08]
                text-[#0078D2]
              "
            >
              <Info
                aria-hidden="true"
                className="h-4 w-4"
              />
            </span>

            <div className="min-w-0">
              <h2
                className="
                  text-[15px]
                  font-semibold
                  text-slate-950
                "
              >
                Privacy and cookies
              </h2>

              <p
                className="
                  mt-2
                  text-[13px]
                  leading-6
                  text-slate-600
                "
              >
                We use cookies and similar technologies to
                support core website functionality and improve
                your experience with Five Stars.
              </p>
            </div>
          </div>

          <div
            className="
              mt-5
              flex
              items-center
              justify-between
              gap-4
              border-t
              border-slate-200
              pt-4
            "
          >
            <span
              className="
                text-[12px]
                text-slate-500
              "
            >
              Essential website cookies
            </span>

            <button
              type="button"
              onClick={dismissCookieNotice}
              className="
                inline-flex
                min-h-10
                items-center
                justify-center
                bg-[#0078D2]
                px-5
                text-[13px]
                font-semibold
                text-white
                transition-colors
                hover:bg-[#006bbd]
                focus-visible:outline-none
                focus-visible:ring-2
                focus-visible:ring-[#0078D2]/30
                focus-visible:ring-offset-2
              "
            >
              Dismiss
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}