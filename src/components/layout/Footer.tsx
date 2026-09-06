"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type FooterLink = {
  label: string;
  href: string;
  external?: boolean;
};

const helpLinks: FooterLink[] = [
  {
    label: "Contact Five Stars",
    href: "/contact",
  },
  {
    label: "Find My Trip",
    href: "/find-trip",
  },
  {
    label: "My Trips",
    href: "/my-trips",
  },
  {
    label: "Cargo",
    href: "/cargo",
  },
  {
    label: "Charter services",
    href: "/charter",
  },
];

const companyLinks: FooterLink[] = [
  {
    label: "Flights",
    href: "/flights",
  },
  {
    label: "Passenger travel",
    href: "/flights",
  },
  {
    label: "Cargo services",
    href: "/cargo",
  },
  {
    label: "Private charter",
    href: "/charter",
  },
  {
    label: "Customer support",
    href: "/contact",
  },
];

const extraLinks: FooterLink[] = [
  {
    label: "Saved Travelers",
    href: "/account/travelers",
  },
  {
    label: "Sign in",
    href: "/login",
  },
  {
    label: "Create account",
    href: "/register",
  },
  {
    label: "Find a reservation",
    href: "/find-trip",
  },
];

const utilityLinks: FooterLink[] = [
  {
    label: "Flights",
    href: "/flights",
  },
  {
    label: "Cargo",
    href: "/cargo",
  },
  {
    label: "Charter",
    href: "/charter",
  },
  {
    label: "Contact",
    href: "/contact",
  },
  {
    label: "Find My Trip",
    href: "/find-trip",
  },
];

function InfoIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="h-6 w-6"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="1.6"
      />

      <path
        d="M12 10.5v6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />

      <circle cx="12" cy="7.5" r="1" fill="currentColor" />
    </svg>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: FooterLink[];
}) {
  return (
    <div>
      <h2 className="text-xl font-medium tracking-[-0.02em] text-slate-700">
        {title}
      </h2>

      <ul className="mt-5 space-y-3.5">
        {links.map((link) => (
          <li key={`${title}-${link.label}`}>
            <Link
              href={link.href}
              target={link.external ? "_blank" : undefined}
              rel={link.external ? "noreferrer" : undefined}
              className="
                inline-flex
                items-center
                gap-1.5
                text-[15px]
                font-normal
                leading-6
                text-[#0078D2]
                transition-colors
                hover:text-[#005a9e]
                hover:underline
                focus-visible:outline-none
                focus-visible:ring-2
                focus-visible:ring-[#0078D2]/30
                focus-visible:ring-offset-2
              "
            >
              {link.label}

              {link.external ? (
                <span aria-hidden="true">↗</span>
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
    const dismissed =
      window.localStorage.getItem(
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
        {/* Main footer */}
        <div
          className="
            fs-container
            grid
            gap-10
            py-12
            sm:py-14
            md:grid-cols-2
            lg:grid-cols-3
            lg:gap-16
            lg:py-16
          "
        >
          <FooterColumn
            title="Help"
            links={helpLinks}
          />

          <FooterColumn
            title="About Five Stars"
            links={companyLinks}
          />

          <FooterColumn
            title="Extras"
            links={extraLinks}
          />
        </div>

        {/* Lower utility area */}
        <div className="border-t border-slate-200 bg-[#eef2f5]">
          <div className="fs-container py-7">
            <nav
              aria-label="Footer links"
              className="
                flex
                flex-wrap
                items-center
                gap-x-0
                gap-y-2
                text-sm
              "
            >
              {utilityLinks.map((link, index) => (
                <span
                  key={link.label}
                  className="flex items-center"
                >
                  {index > 0 ? (
                    <span
                      aria-hidden="true"
                      className="mx-3 text-slate-300"
                    >
                      |
                    </span>
                  ) : null}

                  <Link
                    href={link.href}
                    className="
                      text-[#0078D2]
                      transition
                      hover:text-[#005a9e]
                      hover:underline
                      focus-visible:outline-none
                      focus-visible:ring-2
                      focus-visible:ring-[#0078D2]/25
                    "
                  >
                    {link.label}
                  </Link>
                </span>
              ))}
            </nav>

            <div
              className="
                mt-6
                flex
                flex-col
                gap-2
                border-t
                border-slate-300/70
                pt-5
                text-sm
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
                Passenger, cargo, and charter services
                between Haiti and the United States.
              </p>
            </div>
          </div>
        </div>
      </footer>

      {/* Feedback tab */}
      <Link
        href="/contact"
        aria-label="Send feedback"
        className="
          fixed
          right-0
          top-1/2
          z-30
          hidden
          -translate-y-1/2
          rounded-l-lg
          bg-[#0078D2]
          px-2.5
          py-4
          text-xs
          font-semibold
          text-white
          shadow-lg
          transition
          hover:bg-[#006bbd]
          lg:block
          [writing-mode:vertical-rl]
          rotate-180
        "
      >
        Feedback
      </Link>

      {/* Privacy notice */}
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
            bg-[#f4f6f8]
            p-5
            shadow-[0_14px_40px_rgba(15,23,42,0.24)]
            sm:left-auto
            sm:right-6
            sm:w-[26rem]
            sm:p-6
            lg:bottom-6
          "
        >
          <div className="flex items-start gap-3">
            <span className="mt-0.5 shrink-0 text-slate-900">
              <InfoIcon />
            </span>

            <div className="min-w-0">
              <h2 className="text-base font-semibold text-slate-950">
                Privacy and cookies
              </h2>

              <p className="mt-4 text-sm leading-6 text-slate-700">
                We use cookies and similar technologies to
                support core website functionality and improve
                your experience with Five Stars.
              </p>

              <p className="mt-3 text-sm leading-6 text-slate-700">
                You can dismiss this notice and continue using
                the site.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={dismissCookieNotice}
            className="
              mt-5
              flex
              min-h-12
              w-full
              items-center
              justify-center
              rounded-sm
              bg-[#0078D2]
              px-5
              text-sm
              font-semibold
              text-white
              transition
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
      ) : null}
    </>
  );
}