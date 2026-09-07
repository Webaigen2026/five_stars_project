import Link from "next/link";
import { redirect } from "next/navigation";

import LogoutButton from "../../components/auth/LogoutButton";
import ResendVerificationButton from "../../components/auth/ResendVerificationButton";
import Footer from "../../components/layout/Footer";
import Header from "../../components/layout/Header";

import { getCurrentUser } from "../../lib/auth";

const dashboardItems = [
  {
    eyebrow: "Travel",
    title: "My Trips",
    description: "View and continue your flight bookings.",
    href: "/my-trips",
  },
  {
    eyebrow: "Travel",
    title: "Saved Travelers",
    description:
      "Manage traveler profiles and reuse details for faster bookings.",
    href: "/account/travelers",
  },
  {
    eyebrow: "Shipping",
    title: "My Cargo",
    description: "Track cargo requests submitted from your account.",
    href: "/my-cargo",
  },
  {
    eyebrow: "Private",
    title: "My Charter",
    description: "Track charter requests submitted from your account.",
    href: "/my-charter",
  },
  {
    eyebrow: "Support",
    title: "My Messages",
    description: "Track contact messages submitted from your account.",
    href: "/my-messages",
  },
  {
    eyebrow: "Account",
    title: "Profile",
    description: "Update your personal details and password.",
    href: "/account",
  },
];

function ArrowIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="m5 12 4 4L19 6" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M4 4h16v16H4z" />
      <path d="m4 7 8 6 8-6" />
    </svg>
  );
}

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const welcomeName = user.firstName?.trim() || user.email;

  const profileName = [user.firstName, user.lastName]
    .filter((value) => Boolean(value?.trim()))
    .join(" ")
    .trim();

  return (
    <>
      <Header />

      <main className="min-h-screen bg-slate-50">
        {/* Page header */}
        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto w-full max-w-[1540px] px-4 py-10 sm:px-6 sm:py-12 lg:px-8 lg:py-14 xl:px-10">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0078D2]">
              Account
            </p>

            <h1
              className="
                font-american-sans
                mt-3
                max-w-4xl
                break-words
                text-4xl
                font-light
                leading-[1.05]
                tracking-[-0.03em]
                text-slate-950
                sm:text-5xl
              "
            >
              Welcome, {welcomeName}
            </h1>

            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
              Manage your Five Stars trips, saved travelers, cargo requests,
              charter requests, and account information from one place.
            </p>
          </div>
        </section>

        {/* Dashboard */}
        <section className="mx-auto w-full max-w-[1540px] px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12 xl:px-10">
          <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_340px] xl:gap-8">
            {/* Main navigation tickets */}
            <div className="grid min-w-0 gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {dashboardItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="
                    group
                    relative
                    isolate
                    min-w-0
                    focus-visible:outline-none
                  "
                >
                  {/* Floating ticket shadow */}
                  <span
                    aria-hidden="true"
                    className="
                      pointer-events-none
                      absolute
                      inset-x-7
                      -bottom-2
                      -z-10
                      h-7
                      rounded-[50%]
                      bg-slate-950/10
                      blur-xl
                      transition-all
                      duration-300
                      group-hover:bg-slate-950/15
                    "
                  />

                  {/* Ticket body */}
                  <article
                    className="
                      relative
                      flex
                      min-h-[190px]
                      w-full
                      min-w-0
                      overflow-hidden
                      bg-white
                      shadow-[0_6px_22px_rgba(15,23,42,0.06)]
                      ring-1
                      ring-slate-200/90
                      transition-all
                      duration-300
                      group-hover:-translate-y-1
                      group-hover:shadow-[0_14px_32px_rgba(15,23,42,0.10)]
                      group-focus-visible:ring-2
                      group-focus-visible:ring-[#0078D2]/40
                      group-focus-visible:ring-offset-2
                    "
                  >
                    {/* Extreme corner cutouts */}
                    <span
                      aria-hidden="true"
                      className="
                        pointer-events-none
                        absolute
                        -left-4
                        -top-4
                        z-20
                        h-8
                        w-8
                        rounded-full
                        bg-slate-50
                      "
                    />

                    <span
                      aria-hidden="true"
                      className="
                        pointer-events-none
                        absolute
                        -right-4
                        -top-4
                        z-20
                        h-8
                        w-8
                        rounded-full
                        bg-slate-50
                      "
                    />

                    <span
                      aria-hidden="true"
                      className="
                        pointer-events-none
                        absolute
                        -bottom-4
                        -left-4
                        z-20
                        h-8
                        w-8
                        rounded-full
                        bg-slate-50
                      "
                    />

                    <span
                      aria-hidden="true"
                      className="
                        pointer-events-none
                        absolute
                        -bottom-4
                        -right-4
                        z-20
                        h-8
                        w-8
                        rounded-full
                        bg-slate-50
                      "
                    />

                    {/* Main ticket content */}
                    <div
                      className="
                        flex
                        min-w-0
                        flex-1
                        flex-col
                        justify-between
                        px-5
                        py-5
                        sm:px-6
                        sm:py-6
                      "
                    >
                      <div className="min-w-0">
                        {/* Ticket category */}
                        <div className="flex items-center gap-2">
                          <span
                            className="
                              h-1.5
                              w-1.5
                              shrink-0
                              rounded-full
                              bg-[#0078D2]
                            "
                          />

                          <p
                            className="
                              truncate
                              text-[11px]
                              font-semibold
                              uppercase
                              tracking-[0.16em]
                              text-[#0078D2]
                            "
                          >
                            {item.eyebrow}
                          </p>
                        </div>

                        <h2
                          className="
                            font-american-sans
                            mt-3
                            text-[1.7rem]
                            font-light
                            leading-[1.1]
                            tracking-[-0.025em]
                            text-slate-950
                          "
                        >
                          {item.title}
                        </h2>

                        <p
                          className="
                            mt-3
                            max-w-[30ch]
                            text-sm
                            leading-6
                            text-slate-600
                          "
                        >
                          {item.description}
                        </p>
                      </div>

                      {/* Ticket footer */}
                      <div
                        className="
                          mt-6
                          flex
                          items-center
                          gap-2
                          text-[11px]
                          font-medium
                          uppercase
                          tracking-[0.12em]
                          text-slate-400
                        "
                      >
                        <span>Five Stars</span>

                        <span
                          aria-hidden="true"
                          className="h-1 w-1 rounded-full bg-slate-300"
                        />

                        <span>Account</span>
                      </div>
                    </div>

                    {/* Perforated ticket stub */}
                    <div
                      className="
                        relative
                        flex
                        w-[72px]
                        shrink-0
                        flex-col
                        items-center
                        justify-center
                        border-l
                        border-dashed
                        border-slate-300
                        bg-slate-50/80
                        sm:w-[78px]
                      "
                    >
                      {/* Top perforation notch */}
                      <span
                        aria-hidden="true"
                        className="
                          pointer-events-none
                          absolute
                          -left-3
                          -top-3
                          h-6
                          w-6
                          rounded-full
                          bg-slate-50
                          ring-1
                          ring-slate-200/70
                        "
                      />

                      {/* Bottom perforation notch */}
                      <span
                        aria-hidden="true"
                        className="
                          pointer-events-none
                          absolute
                          -bottom-3
                          -left-3
                          h-6
                          w-6
                          rounded-full
                          bg-slate-50
                          ring-1
                          ring-slate-200/70
                        "
                      />

                      {/* Action circle */}
                      <span
                        className="
                          flex
                          h-10
                          w-10
                          items-center
                          justify-center
                          rounded-full
                          border
                          border-slate-200
                          bg-white
                          text-[#0078D2]
                          shadow-sm
                          transition-all
                          duration-200
                          group-hover:border-[#0078D2]/30
                          group-hover:bg-[#0078D2]
                          group-hover:text-white
                          group-hover:shadow-[0_5px_14px_rgba(0,120,210,0.20)]
                        "
                      >
                        <ArrowIcon />
                      </span>

                      <span
                        className="
                          mt-3
                          rotate-180
                          text-[10px]
                          font-semibold
                          uppercase
                          tracking-[0.12em]
                          text-slate-400
                          transition-colors
                          group-hover:text-[#0078D2]
                          [writing-mode:vertical-rl]
                        "
                      >
                        Open
                      </span>
                    </div>
                  </article>
                </Link>
              ))}
            </div>

            {/* Profile rail */}
           {/* Profile ticket */}
<aside
  className="
    group
    relative
    isolate
    min-w-0
    self-start
    lg:sticky
    lg:top-6
  "
>
  {/* Floating shadow */}
  <span
    aria-hidden="true"
    className="
      pointer-events-none
      absolute
      inset-x-8
      -bottom-3
      -z-10
      h-8
      rounded-[50%]
      bg-slate-950/10
      blur-2xl
    "
  />

  {/* Ticket body */}
  <div
    className="
      relative
      overflow-hidden
      bg-white
      shadow-[0_8px_28px_rgba(15,23,42,0.07)]
      ring-1
      ring-slate-200/90
    "
  >
    {/* Extreme corner cutouts */}
    <span
      aria-hidden="true"
      className="
        pointer-events-none
        absolute
        -left-5
        -top-5
        z-30
        h-10
        w-10
        rounded-full
        bg-slate-50
      "
    />

    <span
      aria-hidden="true"
      className="
        pointer-events-none
        absolute
        -right-5
        -top-5
        z-30
        h-10
        w-10
        rounded-full
        bg-slate-50
      "
    />

    <span
      aria-hidden="true"
      className="
        pointer-events-none
        absolute
        -bottom-5
        -left-5
        z-30
        h-10
        w-10
        rounded-full
        bg-slate-50
      "
    />

    <span
      aria-hidden="true"
      className="
        pointer-events-none
        absolute
        -bottom-5
        -right-5
        z-30
        h-10
        w-10
        rounded-full
        bg-slate-50
      "
    />

    {/* Middle side notches */}
    <span
      aria-hidden="true"
      className="
        pointer-events-none
        absolute
        -left-3
        top-1/2
        z-30
        h-6
        w-6
        -translate-y-1/2
        rounded-full
        bg-slate-50
      "
    />

    <span
      aria-hidden="true"
      className="
        pointer-events-none
        absolute
        -right-3
        top-1/2
        z-30
        h-6
        w-6
        -translate-y-1/2
        rounded-full
        bg-slate-50
      "
    />

    {/* Ticket header */}
    <div className="relative border-b border-dashed border-slate-300 px-5 py-6 sm:px-6">
      {/* Perforation notches */}
      <span
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          -bottom-3
          -left-3
          h-6
          w-6
          rounded-full
          bg-slate-50
          ring-1
          ring-slate-200
        "
      />

      <span
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          -bottom-3
          -right-3
          h-6
          w-6
          rounded-full
          bg-slate-50
          ring-1
          ring-slate-200
        "
      />

      <div className="flex items-start gap-4">
        {/* Initial */}
        <div
          className="
            flex
            h-12
            w-12
            shrink-0
            items-center
            justify-center
            rounded-lg
            bg-[#0078D2]
            font-american-sans
            text-xl
            font-light
            text-white
            shadow-[0_5px_14px_rgba(0,120,210,0.18)]
          "
        >
          {(user.firstName?.trim()?.charAt(0) ||
            user.email.charAt(0) ||
            "F").toUpperCase()}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <p
              className="
                text-[11px]
                font-semibold
                uppercase
                tracking-[0.16em]
                text-[#0078D2]
              "
            >
              Account ticket
            </p>

            <span
              className="
                shrink-0
                text-[10px]
                font-semibold
                uppercase
                tracking-[0.12em]
                text-slate-400
              "
            >
              Five Stars
            </span>
          </div>

          <h2
            className="
              font-american-sans
              mt-2
              truncate
              text-2xl
              font-light
              leading-tight
              tracking-[-0.025em]
              text-slate-950
            "
          >
            {profileName || "Your account"}
          </h2>

          <p className="mt-1 truncate text-sm text-slate-500">
            {user.email}
          </p>
        </div>
      </div>
    </div>

    {/* Ticket details */}
    <div className="px-5 py-5 sm:px-6">
      <dl className="space-y-4">
        <div
          className="
            flex
            items-start
            justify-between
            gap-4
            border-b
            border-slate-100
            pb-4
          "
        >
          <dt
            className="
              text-[11px]
              font-semibold
              uppercase
              tracking-[0.12em]
              text-slate-400
            "
          >
            Email
          </dt>

          <dd
            className="
              min-w-0
              break-all
              text-right
              text-sm
              font-medium
              text-slate-900
            "
          >
            {user.email}
          </dd>
        </div>

        <div
          className="
            flex
            items-center
            justify-between
            gap-4
            border-b
            border-slate-100
            pb-4
          "
        >
          <dt
            className="
              text-[11px]
              font-semibold
              uppercase
              tracking-[0.12em]
              text-slate-400
            "
          >
            Role
          </dt>

          <dd>
            <span
              className="
                inline-flex
                rounded-md
                border
                border-slate-200
                bg-slate-50
                px-2.5
                py-1
                text-xs
                font-semibold
                text-slate-700
              "
            >
              {user.role}
            </span>
          </dd>
        </div>

        <div>
          <dt
            className="
              text-[11px]
              font-semibold
              uppercase
              tracking-[0.12em]
              text-slate-400
            "
          >
            Email verification
          </dt>

          <dd className="mt-3">
            {user.emailVerified ? (
              <div
                className="
                  flex
                  items-center
                  justify-between
                  gap-3
                  rounded-lg
                  border
                  border-emerald-100
                  bg-emerald-50/60
                  px-3.5
                  py-3
                "
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className="
                      flex
                      h-7
                      w-7
                      items-center
                      justify-center
                      rounded-full
                      bg-white
                      text-emerald-700
                      shadow-sm
                    "
                  >
                    <CheckIcon />
                  </span>

                  <span className="text-sm font-semibold text-emerald-800">
                    Verified
                  </span>
                </div>

                <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-emerald-700/70">
                  Confirmed
                </span>
              </div>
            ) : (
              <div
                className="
                  rounded-lg
                  border
                  border-amber-100
                  bg-amber-50/60
                  px-3.5
                  py-3
                "
              >
                <div className="flex items-start gap-2.5">
                  <span
                    className="
                      flex
                      h-7
                      w-7
                      shrink-0
                      items-center
                      justify-center
                      rounded-full
                      bg-white
                      text-amber-700
                      shadow-sm
                    "
                  >
                    <MailIcon />
                  </span>

                  <div>
                    <p className="text-sm font-semibold text-amber-800">
                      Not verified
                    </p>

                    <p className="mt-1 text-xs leading-5 text-amber-700/80">
                      Verification is optional, but confirming your email helps
                      us know we can reach you.
                    </p>
                  </div>
                </div>

                <div className="mt-3">
                  <ResendVerificationButton email={user.email} />
                </div>
              </div>
            )}
          </dd>
        </div>
      </dl>
    </div>

    {/* Ticket stub / actions */}
    <div
      className="
        relative
        border-t
        border-dashed
        border-slate-300
        bg-slate-50/80
        px-5
        py-5
        sm:px-6
      "
    >
      {/* Stub cutouts */}
      <span
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          -left-3
          -top-3
          h-6
          w-6
          rounded-full
          bg-slate-50
          ring-1
          ring-slate-200
        "
      />

      <span
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          -right-3
          -top-3
          h-6
          w-6
          rounded-full
          bg-slate-50
          ring-1
          ring-slate-200
        "
      />

      <Link
        href="/account"
        className="
          group/action
          flex
          min-h-12
          w-full
          items-center
          justify-between
         
          bg-[#0078D2]
          px-4
          text-sm
          font-semibold
          text-white
          shadow-[0_5px_14px_rgba(0,120,210,0.18)]
          transition
          hover:bg-[#006bbd]
          hover:shadow-[0_8px_20px_rgba(0,120,210,0.24)]
          focus-visible:outline-none
          focus-visible:ring-2
          focus-visible:ring-[#0078D2]/30
          focus-visible:ring-offset-2
        "
      >
        <span className="text-white">Manage account</span>

        <span className="transition-transform duration-200 group-hover/action:translate-x-0.5 text-white">
          <ArrowIcon />
        </span>
      </Link>
 

      <div className="mt-3">
        <LogoutButton
          className="
            w-full
            rounded-lg
            px-4
            py-3
            text-sm
            font-semibold
            text-slate-600
            transition
            hover:bg-white
            hover:text-slate-950
            hover:shadow-sm
            focus-visible:outline-none
            focus-visible:ring-2
            focus-visible:ring-slate-300
            disabled:cursor-not-allowed
            disabled:opacity-70
          "
        />
      </div>

      <p
        className="
          mt-4
          text-center
          text-[10px]
          font-medium
          uppercase
          tracking-[0.12em]
          text-slate-400
        "
      >
        Five Stars • Account
      </p>
    </div>
  </div>
</aside>

            
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}