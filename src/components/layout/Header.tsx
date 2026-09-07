"use client";

import { useEffect, useId, useState } from "react";
import Image from "next/image";

import Link from "next/link";

import HeaderAccountNav from "./HeaderAccountNav";

function MenuIcon({
  open,
}: {
  open: boolean;
}) {
  return (
    <span
      aria-hidden="true"
      className="relative block h-5 w-5"
    >
      {/* Top line */}
      <span
        className={[
          "absolute left-1/2 top-[4px] h-[1.8px] w-5 -translate-x-1/2 rounded-full bg-current",
          "transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
          open
            ? "top-1/2 -translate-y-1/2 rotate-45"
            : "",
        ].join(" ")}
      />

      {/* Middle line */}
      <span
        className={[
          "absolute left-1/2 top-1/2 h-[1.8px] w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-current",
          "transition-all duration-200 ease-out",
          open
            ? "scale-x-0 opacity-0"
            : "scale-x-100 opacity-100",
        ].join(" ")}
      />

      {/* Bottom line */}
      <span
        className={[
          "absolute bottom-[4px] left-1/2 h-[1.8px] w-5 -translate-x-1/2 rounded-full bg-current",
          "transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
          open
            ? "bottom-1/2 translate-y-1/2 -rotate-45"
            : "",
        ].join(" ")}
      />
    </span>
  );
}

function ChevronRightIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
      className="h-4 w-4"
    >
      <path
        d="m7.5 5 5 5-5 5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const navigation = [
  {
    label: "Flights",
    href: "/flights",
    description: "Search and book available flights",
  },
  {
    label: "Cargo",
    href: "/cargo",
    description: "Request cargo transportation",
  },
  {
    label: "Charter",
    href: "/charter",
    description: "Request private air travel",
  },
  {
    label: "Contact",
    href: "/contact",
    description: "Get help from the Five Stars team",
  },
  {
    label: "Find My Trip",
    href: "/find-trip",
    description: "Access a reservation or guest booking",
  },
];

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  const mobileMenuId = useId();

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

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

      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [menuOpen]);

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <>
      <header className="relative z-40 border-b border-slate-200 bg-white">
        <div className="fs-container flex h-[72px] items-center justify-between">
<span className="flex items-center gap-2 mt-2 ">

  {/* Brand */}
  <Link
    href="/"
    className="
      font-american-sans
      flex
      items-center
      gap-2
      shrink-0
      text-2xl
      font-light
      tracking-[-0.025em]
      text-slate-950
      transition
      hover:text-[#0078D2]
      focus-visible:outline-none
      focus-visible:ring-2
      focus-visible:ring-[#0078D2]/30
      focus-visible:ring-offset-4
    "
  >
    <Image src="/airplane/logo_blue_upgrade.png" alt="Five Stars" width={90} height={90} />
    <span>
      Five Stars
    </span>
  </Link>
     
</span>

        

          {/* Desktop primary navigation */}
          <nav
            aria-label="Primary navigation"
            className="hidden items-center gap-1 lg:flex"
          >
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="
                  rounded-lg
                  px-3.5
                  py-2.5
                  text-sm
                  font-medium
                  text-slate-700
                  transition
                  hover:bg-slate-50
                  hover:text-[#0078D2]
                  focus-visible:outline-none
                  focus-visible:ring-2
                  focus-visible:ring-[#0078D2]/25
                "
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Desktop account / CTA */}
          <div className="hidden items-center gap-2 lg:flex">
            <HeaderAccountNav />

            <Link
              href="/flights"
              className="
                ml-1
                inline-flex
                min-h-10
                items-center
                justify-center
            
                bg-[#0078D2]
                px-5
                text-sm
                font-semibold
                text-white
                shadow-[0_3px_10px_rgba(0,120,210,0.18)]
                transition
                hover:bg-[#006bbd]
                hover:shadow-[0_5px_14px_rgba(0,120,210,0.22)]
                focus-visible:outline-none
                focus-visible:ring-2
                focus-visible:ring-[#0078D2]/30
                focus-visible:ring-offset-2
              "
              style={{ color: "#fff" }}
            >
              Book a Flight
            </Link>
       
          </div>

          {/* Mobile menu trigger */}
          <button
            type="button"
            onClick={() =>
              setMenuOpen((current) => !current)
            }
            className="
              group
              inline-flex
              h-11
              w-11
              items-center
              justify-center
              rounded-xl
             
            
              text-slate-700
              
              transition-all
              duration-200
              
           
              hover:text-[#0078D2]
             
              focus-visible:outline-none
              focus-visible:ring-2
              focus-visible:ring-[#0078D2]/30
              focus-visible:ring-offset-2
              active:scale-[0.96]
              lg:hidden
            "
            aria-label={
              menuOpen
                ? "Close navigation"
                : "Open navigation"
            }
            aria-expanded={menuOpen}
            aria-controls={mobileMenuId}
          >
            <MenuIcon open={menuOpen} />
          </button>
        </div>
      </header>

      {/* Backdrop */}
      <div
        aria-hidden="true"
        onClick={closeMenu}
        className={[
          "fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-[2px] transition-opacity duration-300 lg:hidden",
          menuOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0",
        ].join(" ")}
      />

      {/* Mobile / tablet right drawer */}
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
            w-[min(86vw,22.5rem)]
            flex-col
            border-l
            border-slate-200
            bg-white
            shadow-[-18px_0_45px_rgba(15,23,42,0.16)]
            transition-transform
            duration-300
            ease-out
            sm:w-[22.5rem]
            lg:hidden
          `,
          menuOpen
            ? "translate-x-0"
            : "translate-x-full",
        ].join(" ")}
      >
        {/* Drawer header */}
        <div className="flex h-[68px] shrink-0 items-center justify-between border-b border-slate-200 px-5 sm:h-[72px] sm:px-6">
          <Link
            href="/"
            onClick={closeMenu}
            className="font-american-sans text-[1.7rem] font-light tracking-[-0.025em] text-slate-950 sm:text-2xl"
          >
            Five Stars
          </Link>

          {/* Animated close control */}
          <button
            type="button"
            onClick={closeMenu}
            className="
              inline-flex
              h-10
              w-10
              items-center
              justify-center
              rounded-xl
              text-slate-600
              transition-all
              duration-200
              hover:bg-slate-100
              hover:text-[#0078D2]
              focus-visible:outline-none
              focus-visible:ring-2
              focus-visible:ring-[#0078D2]/30
              active:scale-[0.96]
            "
            aria-label="Close navigation"
          >
            <MenuIcon open />
          </button>
        </div>

        {/* Scrollable drawer body */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {/* Navigation */}
          <div className="px-4 py-5">
            <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Explore
            </p>

            <nav
              aria-label="Mobile primary navigation"
              className="space-y-1"
            >
              {navigation.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeMenu}
                  className="
                    group
                    flex
                    min-h-[58px]
                    items-center
                    justify-between
                    gap-3
                    rounded-xl
                    px-3
                    py-2.5
                    transition
                    hover:bg-[#f5faff]
                    focus-visible:outline-none
                    focus-visible:ring-2
                    focus-visible:ring-[#0078D2]/25
                  "
                >
                  <span className="min-w-0">
                    <span className="block text-[15px] font-semibold text-slate-950 transition group-hover:text-[#0078D2]">
                      {item.label}
                    </span>

                    <span className="mt-0.5 block text-xs leading-5 text-slate-500">
                      {item.description}
                    </span>
                  </span>

                  <span className="shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-[#0078D2]">
                    <ChevronRightIcon />
                  </span>
                </Link>
              ))}
            </nav>
          </div>

          {/* Account navigation */}
          <div className="border-t border-slate-200 px-4 py-5">
            <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Account
            </p>

            <div
              onClickCapture={closeMenu}
              className="
                mt-2
                flex
                flex-col
                gap-1
                [&_a]:flex
                [&_a]:min-h-11
                [&_a]:w-full
                [&_a]:items-center
                [&_a]:rounded-xl
                [&_a]:px-3
                [&_a]:py-2.5
                [&_a]:text-sm
                [&_a]:font-medium
                [&_a]:text-slate-700
                [&_a]:transition
                [&_a:hover]:bg-slate-50
                [&_a:hover]:text-[#0078D2]
                [&_button]:min-h-11
                [&_button]:w-full
                [&_button]:rounded-xl
                [&_button]:px-3
                [&_button]:py-2.5
                [&_button]:text-left
              "
            >
              <HeaderAccountNav />
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="shrink-0 border-t border-slate-200 bg-white px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Link
            href="/flights"
            onClick={closeMenu}
            className="
              flex
              min-h-12
              w-full
              items-center
              justify-center
              rounded-xl
              bg-[#0078D2]
              px-5
              text-sm
              font-semibold
              text-white
              shadow-[0_4px_14px_rgba(0,120,210,0.22)]
              transition
              hover:bg-[#006bbd]
              focus-visible:outline-none
              focus-visible:ring-2
              focus-visible:ring-[#0078D2]/30
              focus-visible:ring-offset-2
            "
          >
            Book a Flight.
          </Link>

          <p className="mt-2.5 text-center text-[10.5px] leading-4 text-slate-400">
            Flights, cargo, and charter services between Haiti and the United
            States.
          </p>
        </div>
      </aside>
    </>
  );
}