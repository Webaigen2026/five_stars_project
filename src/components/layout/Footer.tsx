"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type FooterLink = {
  label: string;
  href: string;
};

const travelLinks: FooterLink[] = [
  { label: "Search flights", href: "/flights" },
  { label: "Find My Trip", href: "/find-trip" },
  { label: "My Trips", href: "/my-trips" },
  { label: "Saved Travelers", href: "/account/travelers" },
];

const serviceLinks: FooterLink[] = [
  { label: "Passenger travel", href: "/flights" },
  { label: "Cargo services", href: "/cargo" },
  { label: "Private charter", href: "/charter" },
];

const supportLinks: FooterLink[] = [
  { label: "Contact us", href: "/contact" },
  { label: "Sign in", href: "/login" },
  { label: "Create account", href: "/register" },
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
      <h2 className="text-[14px] font-semibold text-white">
        {title}
      </h2>

      <ul className="mt-5 space-y-3">
        {links.map((link) => (
          <li key={`${title}-${link.label}`}>
            <Link
              href={link.href}
              className="
                inline-block
                text-[14px]
                leading-6
                text-slate-300
                transition-colors
                duration-150
                hover:text-white
                focus-visible:outline-none
                focus-visible:ring-2
                focus-visible:ring-white/40
                focus-visible:ring-offset-4
                focus-visible:ring-offset-[#101a2b]
              "
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function InfoIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="h-5 w-5"
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
      <footer className="bg-[#101a2b] text-white">
        <div className="fs-container">
          {/* Main footer */}
          <div
            className="
              grid
              gap-12
              py-12
              sm:py-14
              lg:grid-cols-[1.55fr_0.75fr_0.75fr_0.75fr]
              lg:gap-16
              lg:py-16
            "
          >
            {/* Brand */}
            <div className="max-w-[370px]">
              <Link
                href="/"
                className="
                  inline-block
                  font-american-sans
                  text-[28px]
                  font-light
                  tracking-[-0.03em]
                  text-white
                "
              >
                Five Stars
              </Link>

              <p className="mt-5 text-[15px] leading-7 text-slate-300">
                Travel and transportation connecting Haiti and the
                United States.
              </p>

              <p className="mt-2 text-[14px] leading-6 text-slate-400">
                Passenger flights, cargo services, and private
                charter travel in one place.
              </p>

              <Link
                href="/flights"
                className="
                  mt-7
                  inline-flex
                  items-center
                  gap-3
                  border-b
                  border-white/50
                  pb-1
                  text-[14px]
                  font-semibold
                  text-white
                  transition
                  hover:border-[#35a7ff]
                  hover:text-[#5bb8ff]
                "
              >
                Book a flight
                <span aria-hidden="true">→</span>
              </Link>
            </div>

            {/* Navigation */}
            <FooterColumn title="Travel" links={travelLinks} />

            <FooterColumn title="Services" links={serviceLinks} />

            <FooterColumn title="Support" links={supportLinks} />
          </div>

          {/* Bottom footer */}
          <div
            className="
              flex
              flex-col
              gap-4
              border-t
              border-white/15
              py-6
              text-[12px]
              text-slate-400
              sm:flex-row
              sm:items-center
              sm:justify-between
            "
          >
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              <span>© 2026 Five Stars. All rights reserved.</span>

              <Link
                href="/contact"
                className="transition-colors hover:text-white"
              >
                Contact
              </Link>

              <Link
                href="/find-trip"
                className="transition-colors hover:text-white"
              >
                Find My Trip
              </Link>
            </div>

            <div className="flex items-center gap-3">
              <span>Haiti</span>

              <span
                aria-hidden="true"
                className="text-slate-600"
              >
                ↔
              </span>

              <span>United States</span>
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
          bg-[#0078D2]
          px-2.5
          py-4
          text-[11px]
          font-medium
          tracking-wide
          text-white
          transition-colors
          hover:bg-[#0068b8]
          lg:block
          [writing-mode:vertical-rl]
          rotate-180
        "
      >
        Feedback
      </Link>

      {/* Cookie notice */}
      {cookieNoticeVisible ? (
        <div
          role="dialog"
          aria-label="Privacy and cookies"
          className="
            fixed
            bottom-5
            left-4
            right-4
            z-50
            border
            border-slate-200
            bg-white
            p-5
            shadow-[0_12px_40px_rgba(15,23,42,0.16)]
            sm:left-auto
            sm:right-6
            sm:w-[370px]
          "
        >
          <div className="flex items-start gap-3">
            <span className="mt-0.5 shrink-0 text-slate-500">
              <InfoIcon />
            </span>

            <div className="min-w-0">
              <h2 className="text-[14px] font-semibold text-slate-950">
                Privacy and cookies
              </h2>

              <p className="mt-2 text-[13px] leading-5 text-slate-600">
                We use cookies to support essential website
                functionality and improve your experience.
              </p>

              <div className="mt-4 flex items-center gap-5">
                <button
                  type="button"
                  onClick={dismissCookieNotice}
                  className="
                    text-[13px]
                    font-semibold
                    text-[#0078D2]
                    transition-colors
                    hover:text-[#005a9e]
                    hover:underline
                  "
                >
                  Dismiss
                </button>

                <Link
                  href="/contact"
                  className="
                    text-[13px]
                    text-slate-500
                    transition-colors
                    hover:text-slate-900
                  "
                >
                  Contact us
                </Link>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}