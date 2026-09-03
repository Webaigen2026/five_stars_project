"use client";

import { FormEvent, useState, type ReactNode } from "react";

import { CONTACT_CATEGORIES } from "../../lib/contact";

const inputClassName =
  "w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

type CreatedMessage = {
  reference: string;
  status: string;
};

export default function ContactForm({
  defaultFullName = "",
  defaultEmail = "",
}: {
  defaultFullName?: string;
  defaultEmail?: string;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedMessage | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);

    setError(null);
    setCreated(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/contact-messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName: String(formData.get("fullName") ?? ""),
          email: String(formData.get("email") ?? ""),
          phone: String(formData.get("phone") ?? ""),
          category: String(formData.get("category") ?? ""),
          subject: String(formData.get("subject") ?? ""),
          message: String(formData.get("message") ?? ""),
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { error?: string; success?: boolean; message?: CreatedMessage }
        | null;

      if (!response.ok) {
        setError(payload?.error ?? "Unable to send message.");
        return;
      }

      if (!payload?.message?.reference) {
        setError("Message was sent, but no reference was returned.");
        return;
      }

      form.reset();
      setCreated(payload.message);
    } catch {
      setError("Unable to send message.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (created) {
    return (
      <div>
        <p className="text-lg font-semibold text-slate-950">
          Thanks. Your message has been received.
        </p>
        <p className="mt-3 text-slate-600">Reference: {created.reference}</p>
        <button
          type="button"
          onClick={() => setCreated(null)}
          className="mt-6 rounded-xl bg-primary px-6 py-3 font-semibold text-white transition hover:bg-primary-hover"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Field label="Full name" htmlFor="fullName">
        <input
          id="fullName"
          name="fullName"
          type="text"
          required
          placeholder="Your name"
          defaultValue={defaultFullName}
          className={inputClassName}
        />
      </Field>

      <Field label="Email" htmlFor="email">
        <input
          id="email"
          name="email"
          type="email"
          required
          placeholder="you@example.com"
          defaultValue={defaultEmail}
          className={inputClassName}
        />
      </Field>

      <Field label="Phone" htmlFor="phone">
        <input
          id="phone"
          name="phone"
          type="tel"
          placeholder="Optional"
          className={inputClassName}
        />
      </Field>

      <Field label="Category" htmlFor="category">
        <select
          id="category"
          name="category"
          defaultValue="GENERAL"
          className={inputClassName}
        >
          {CONTACT_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Subject" htmlFor="subject">
        <input
          id="subject"
          name="subject"
          type="text"
          required
          maxLength={200}
          placeholder="How can we help?"
          className={inputClassName}
        />
      </Field>

      <Field label="Message" htmlFor="message">
        <textarea
          id="message"
          name="message"
          required
          maxLength={5000}
          rows={6}
          placeholder="How can we help?"
          className={`${inputClassName} resize-none`}
        />
      </Field>

      {error && <p className="text-sm font-medium text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-xl bg-primary px-6 py-3 font-semibold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isSubmitting ? "Sending..." : "Send Message"}
      </button>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-2 block text-sm font-medium text-slate-700"
      >
        {label}
      </label>
      {children}
    </div>
  );
}
