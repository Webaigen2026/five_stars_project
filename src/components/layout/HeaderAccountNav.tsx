"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import Link from "next/link";

import LogoutButton from "../auth/LogoutButton";

type HeaderUser = {
  firstName: string | null;
  email: string;
  role?: string;
};

type HeaderAccountNavProps = {
  /**
   * desktop: compact trigger + floating dropdown
   * mobile: stacked links for the existing drawer (no floating menu)
   */
  variant?: "desktop" | "mobile";
};

function ChevronDownIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
      className={[
        "h-4 w-4 shrink-0 transition-transform duration-200",
        open ? "rotate-180" : "",
      ].join(" ")}
    >
      <path
        d="m5.5 7.5 4.5 4.5 4.5-4.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
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

const linkClassName =
  "flex min-h-11 items-center rounded-lg px-3 text-sm font-medium text-slate-700 transition hover:bg-[#f5faff] hover:text-[#0078D2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0078D2]/25";

export default function HeaderAccountNav({
  variant = "desktop",
}: HeaderAccountNavProps) {
  const [user, setUser] = useState<HeaderUser | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    let cancelled = false;

    async function loadUser() {
      try {
        const response = await fetch("/api/auth/me");
        const payload = (await response.json().catch(() => null)) as
          | { user?: HeaderUser }
          | null;

        if (!cancelled && response.ok && payload?.user) {
          setUser(payload.user);
        }
      } catch {
        if (!cancelled) {
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setLoaded(true);
        }
      }
    }

    void loadUser();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!open || variant !== "desktop") {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, variant]);

  if (!loaded) {
    return (
      <div
        className="h-10 w-[7.5rem] animate-pulse rounded-lg bg-slate-100"
        aria-hidden="true"
      />
    );
  }

  if (!user) {
    return (
      <Link
        href="/login"
        className="
          inline-flex
          min-h-10
          items-center
          justify-center
          rounded-lg
          px-4
          text-sm
          font-medium
          text-slate-700
          transition
          hover:bg-slate-50
          hover:text-[#0078D2]
          focus-visible:outline-none
          focus-visible:ring-2
          focus-visible:ring-[#0078D2]/30
        "
      >
        Sign In
      </Link>
    );
  }

  const displayName = user.firstName?.trim() || "My Account";
  const isStaffOrAdmin = user.role === "STAFF" || user.role === "ADMIN";

  function closeMenu() {
    setOpen(false);
  }

  function accountLinks(asMenuItems: boolean) {
    const itemRole = asMenuItems ? ("menuitem" as const) : undefined;
    return (
      <>
        <Link
          href="/dashboard"
          onClick={closeMenu}
          role={itemRole}
          className={linkClassName}
        >
          Dashboard
        </Link>
        <Link
          href="/my-trips"
          onClick={closeMenu}
          role={itemRole}
          className={linkClassName}
        >
          My Trips
        </Link>
        <Link
          href="/account"
          onClick={closeMenu}
          role={itemRole}
          className={linkClassName}
        >
          Account
        </Link>
      </>
    );
  }

  function adminLink(asMenuItem: boolean) {
    if (!isStaffOrAdmin) {
      return null;
    }

    return (
      <Link
        href="/admin"
        onClick={closeMenu}
        role={asMenuItem ? "menuitem" : undefined}
        className={`${linkClassName} group justify-between`}
      >
        <span>Admin</span>
        <span className="text-slate-300 transition group-hover:text-[#0078D2]">
          <ChevronRightIcon />
        </span>
      </Link>
    );
  }

  const logoutBlock = (
    <div
      className="
        [&_button]:flex
        [&_button]:min-h-11
        [&_button]:w-full
        [&_button]:items-center
        [&_button]:rounded-lg
        [&_button]:px-3
        [&_button]:text-left
        [&_button]:text-sm
        [&_button]:font-medium
        [&_button]:text-slate-600
        [&_button]:transition
        [&_button:hover]:bg-slate-50
        [&_button:hover]:text-slate-950
        [&_button]:focus-visible:outline-none
        [&_button]:focus-visible:ring-2
        [&_button]:focus-visible:ring-[#0078D2]/25
      "
    >
      <LogoutButton />
    </div>
  );

  // Mobile drawer: stacked destinations (drawer styles applied by Header parent).
  if (variant === "mobile") {
    return (
      <div className="flex flex-col gap-1">
        <div className="mb-2 px-3">
          <p className="truncate text-sm font-semibold text-slate-950">
            {user.firstName?.trim() || "Five Stars traveler"}
          </p>
          <p className="mt-0.5 truncate text-xs text-slate-500">{user.email}</p>
        </div>
        {accountLinks(false)}
        {adminLink(false)}
        {logoutBlock}
      </div>
    );
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        className="
          inline-flex
          min-h-10
          items-center
          gap-2
          rounded-lg
          px-3.5
          text-sm
          font-medium
          text-slate-700
          transition
          hover:bg-slate-50
          hover:text-[#0078D2]
          focus-visible:outline-none
          focus-visible:ring-2
          focus-visible:ring-[#0078D2]/30
        "
      >
        <span className="max-w-[8.5rem] truncate">{displayName}</span>
        <ChevronDownIcon open={open} />
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label="Account menu"
          className="
            absolute
            right-0
            top-full
            z-50
            mt-2
            w-[260px]
            overflow-hidden
            rounded-xl
            border
            border-slate-200
            bg-white
            p-2
            shadow-[0_16px_40px_rgba(15,23,42,0.14)]
          "
        >
          <div className="border-b border-slate-100 px-3 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#0078D2]">
              My Account
            </p>
            <p className="mt-1 truncate text-sm font-semibold text-slate-950">
              {user.firstName?.trim() || "Five Stars traveler"}
            </p>
            <p className="mt-0.5 truncate text-xs text-slate-500">{user.email}</p>
          </div>

          <div className="py-2">{accountLinks(true)}</div>

          {isStaffOrAdmin ? (
            <div className="border-t border-slate-100 py-2">{adminLink(true)}</div>
          ) : null}

          <div className="border-t border-slate-100 pt-2">{logoutBlock}</div>
        </div>
      ) : null}
    </div>
  );
}
