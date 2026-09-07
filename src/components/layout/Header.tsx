"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import HeaderAccountNav from "./HeaderAccountNav";

const navigation = [
  { label: "Flights", href: "/flights" },
  { label: "Cargo", href: "/cargo" },
  { label: "Charter", href: "/charter" },
  { label: "Contact", href: "/contact" },
  { label: "Find My Trip", href: "/find-trip" },
];

function MenuIcon({ open }: { open: boolean }) {
  return (
    <span
      aria-hidden="true"
      className="relative block h-[18px] w-[22px]"
    >
      <span
        className={[
          "absolute left-0 top-[3px] h-px w-[22px] bg-current",
          "transition-all duration-200",
          open ? "top-1/2 -translate-y-1/2 rotate-45" : "",
        ].join(" ")}
      />

      <span
        className={[
          "absolute left-0 top-1/2 h-px w-[22px] -translate-y-1/2 bg-current",
          "transition-all duration-150",
          open ? "opacity-0" : "opacity-100",
        ].join(" ")}
      />

      <span
        className={[
          "absolute bottom-[3px] left-0 h-px w-[22px] bg-current",
          "transition-all duration-200",
          open ? "bottom-1/2 translate-y-1/2 -rotate-45" : "",
        ].join(" ")}
      />
    </span>
  );
}

function ArrowRight() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
      className="h-4 w-4"
    >
      <path
        d="M4 10h11M11 6l4 4-4 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  const pathname = usePathname();
  const mobileMenuId = useId();

  useEffect(() => {
    if (!menuOpen) return;

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  function closeMenu() {
    setMenuOpen(false);
  }

  function isActive(href: string) {
    if (href === "/") {
      return pathname === "/";
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <>
      {/* =========================================================
          DESKTOP / MOBILE HEADER
      ========================================================= */}

      <header className="relative z-40 border-b border-slate-200/80 bg-white">
        <div className="fs-container flex h-[76px] items-center">
          {/* Brand */}

          <Link
            href="/"
            aria-label="Five Stars home"
            className="
              shrink-0
              font-american-sans
              text-[26px]
              font-light
              tracking-[-0.035em]
              text-slate-950
              transition-opacity
              duration-150
              hover:opacity-70
              focus-visible:outline-none
              focus-visible:ring-2
              focus-visible:ring-[#0078D2]/30
              focus-visible:ring-offset-4
            "
          >
            Five Stars
          </Link>

          {/* Desktop navigation */}

          <nav
            aria-label="Primary navigation"
            className="
              ml-[clamp(4rem,8vw,8rem)]
              hidden
              h-full
              items-center
              gap-8
              lg:flex
            "
          >
            {navigation.map((item) => {
              const active = isActive(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={[
                    "group relative flex h-full items-center",
                    "text-[14px] font-medium",
                    "transition-colors duration-150",
                    "focus-visible:outline-none",
                    active
                      ? "text-slate-950"
                      : "text-slate-700 hover:text-slate-950",
                  ].join(" ")}
                >
                  {item.label}

                  <span
                    aria-hidden="true"
                    className={[
                      "absolute bottom-0 left-0 right-0 h-[2px]",
                      "origin-left bg-[#0078D2]",
                      "transition-transform duration-200",
                      active
                        ? "scale-x-100"
                        : "scale-x-0 group-hover:scale-x-100",
                    ].join(" ")}
                  />
                </Link>
              );
            })}
          </nav>

          {/* Desktop account / booking */}

          <div className="ml-auto hidden h-full items-center lg:flex">
            <div
              className="
                mr-8
                flex
                items-center
                text-[14px]
                font-medium
                text-slate-800

                [&_a]:transition-colors
                [&_a]:duration-150
                [&_a:hover]:text-slate-500

                [&_button]:transition-colors
                [&_button]:duration-150
                [&_button:hover]:text-slate-500
              "
            >
              <HeaderAccountNav />
            </div>

            <Link
              href="/flights"
              className="
                group
                inline-flex
                h-11
                items-center
                justify-center
                gap-3
                bg-[#0078D2]
                px-5
                text-[14px]
                font-semibold
                text-white
                transition-colors
                duration-150
                hover:bg-[#006ab9]
                focus-visible:outline-none
                focus-visible:ring-2
                focus-visible:ring-[#0078D2]/30
                focus-visible:ring-offset-2
              "
            >
              <span>Book a Flight</span>

              <span className="transition-transform duration-150 group-hover:translate-x-0.5">
                <ArrowRight />
              </span>
            </Link>
          </div>

          {/* Mobile trigger */}

          <div className="ml-auto flex items-center lg:hidden">
            <button
              type="button"
              onClick={() => setMenuOpen((current) => !current)}
              aria-label={
                menuOpen ? "Close navigation" : "Open navigation"
              }
              aria-expanded={menuOpen}
              aria-controls={mobileMenuId}
              className="
                flex
                h-11
                w-11
                items-center
                justify-center
                text-slate-950
                transition-colors
                hover:text-[#0078D2]
                focus-visible:outline-none
                focus-visible:ring-2
                focus-visible:ring-[#0078D2]/25
              "
            >
              <MenuIcon open={menuOpen} />
            </button>
          </div>
        </div>
      </header>

      {/* =========================================================
          MOBILE BACKDROP
      ========================================================= */}

      <div
        aria-hidden="true"
        onClick={closeMenu}
        className={[
          "fixed inset-0 z-50 bg-slate-950/30",
          "transition-opacity duration-300",
          "lg:hidden",
          menuOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0",
        ].join(" ")}
      />

      {/* =========================================================
          MOBILE DRAWER
      ========================================================= */}

      <aside
        id={mobileMenuId}
        aria-label="Mobile navigation"
        aria-hidden={!menuOpen}
        className={[
          `
            fixed
            inset-y-0
            right-0
            z-[60]
            flex
            w-[min(88vw,390px)]
            flex-col
            bg-white
            shadow-[-20px_0_60px_rgba(15,23,42,0.12)]
            transition-transform
            duration-300
            ease-out
            lg:hidden
          `,
          menuOpen ? "translate-x-0" : "translate-x-full",
        ].join(" ")}
      >
        {/* Drawer header */}

        <div className="flex h-[76px] shrink-0 items-center justify-between border-b border-slate-200 px-6">
          <Link
            href="/"
            onClick={closeMenu}
            className="
              font-american-sans
              text-[25px]
              font-light
              tracking-[-0.035em]
              text-slate-950
            "
          >
            Five Stars
          </Link>

          <button
            type="button"
            onClick={closeMenu}
            aria-label="Close navigation"
            className="
              flex
              h-10
              w-10
              items-center
              justify-center
              text-slate-950
              transition-colors
              hover:text-[#0078D2]
              focus-visible:outline-none
            "
          >
            <MenuIcon open />
          </button>
        </div>

        {/* Scrollable drawer content */}

        <div className="flex-1 overflow-y-auto px-6">
          {/* Primary mobile navigation */}

          <nav
            aria-label="Mobile primary navigation"
            className="py-5"
          >
            {navigation.map((item, index) => {
              const active = isActive(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeMenu}
                  aria-current={active ? "page" : undefined}
                  className={[
                    "group flex min-h-[56px] items-center justify-between",
                    index !== navigation.length - 1
                      ? "border-b border-slate-100"
                      : "",
                    "text-[16px] font-medium",
                    "transition-colors duration-150",
                    active
                      ? "text-[#0078D2]"
                      : "text-slate-950 hover:text-[#0078D2]",
                  ].join(" ")}
                >
                  <span>{item.label}</span>

                  <span
                    className={[
                      "transition-all duration-150",
                      active
                        ? "text-[#0078D2]"
                        : "text-slate-400 group-hover:translate-x-0.5 group-hover:text-[#0078D2]",
                    ].join(" ")}
                  >
                    <ArrowRight />
                  </span>
                </Link>
              );
            })}
          </nav>

          {/* Account */}

          <div className="border-t border-slate-200 py-6">
            <p
              className="
                mb-3
                text-[11px]
                font-semibold
                uppercase
                tracking-[0.16em]
                text-slate-500
              "
            >
              Account
            </p>

            <div
              onClickCapture={closeMenu}
              className="
                flex
                flex-col

                [&_a]:flex
                [&_a]:min-h-[48px]
                [&_a]:items-center
                [&_a]:border-b
                [&_a]:border-slate-100
                [&_a]:text-[15px]
                [&_a]:font-medium
                [&_a]:text-slate-800
                [&_a]:transition-colors
                [&_a:hover]:text-[#0078D2]

                [&_button]:min-h-[48px]
                [&_button]:border-b
                [&_button]:border-slate-100
                [&_button]:text-left
                [&_button]:text-[15px]
                [&_button]:font-medium
                [&_button]:text-slate-800
              "
            >
              <HeaderAccountNav />
            </div>
          </div>
        </div>

        {/* Mobile booking CTA */}

        <div
          className="
            shrink-0
            border-t
            border-slate-200
            bg-white
            px-6
            pb-[max(1.5rem,env(safe-area-inset-bottom))]
            pt-5
          "
        >
          <Link
            href="/flights"
            onClick={closeMenu}
            className="
              group
              flex
              min-h-[50px]
              w-full
              items-center
              justify-between
              bg-[#0078D2]
              px-5
              text-[15px]
              font-semibold
              text-white
              transition-colors
              duration-150
              hover:bg-[#006ab9]
            "
          >
            <span>Book a Flight</span>

            <span className="transition-transform duration-150 group-hover:translate-x-0.5">
              <ArrowRight />
            </span>
          </Link>
        </div>
      </aside>
    </>
  );
}