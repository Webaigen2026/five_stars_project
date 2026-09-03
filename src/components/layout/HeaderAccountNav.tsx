"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import LogoutButton from "../auth/LogoutButton";

type HeaderUser = {
  firstName: string | null;
  email: string;
  role?: string;
};

export default function HeaderAccountNav() {
  const [user, setUser] = useState<HeaderUser | null>(null);
  const [loaded, setLoaded] = useState(false);

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

  if (!loaded) {
    return (
      <Link
        href="/login"
        className="rounded-xl px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
      >
        Sign In
      </Link>
    );
  }

  if (!user) {
    return (
      <Link
        href="/login"
        className="rounded-xl px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
      >
        Sign In
      </Link>
    );
  }

  return (
    <>
      <Link
        href="/dashboard"
        className="rounded-xl px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
      >
        Dashboard
      </Link>

      <Link
        href="/my-trips"
        className="rounded-xl px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
      >
        My Trips
      </Link>

      {(user.role === "STAFF" || user.role === "ADMIN") && (
        <Link
          href="/admin"
          className="rounded-xl px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
        >
          Admin
        </Link>
      )}

      <Link
        href="/account"
        className="rounded-xl px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
      >
        Account
      </Link>

      <LogoutButton />
    </>
  );
}
