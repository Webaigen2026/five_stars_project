"use client";

import { FormEvent, useState, type ReactNode } from "react";
import { CONTACT_CATEGORIES } from "../../lib/contact";

const inputClassName =
  "w-full rounded-[5px] border border-slate-300 bg-white px-3 py-[9px] text-[13px] leading-5 text-slate-900 outline-none transition-colors placeholder:text-slate-400 hover:border-slate-400 focus:border-[#0078D2] focus:ring-1 focus:ring-[#0078D2]";

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
        | {
            error?: string;
            success?: boolean;
            message?: CreatedMessage;
          }
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
      <div className="max-w-[620px] py-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#0078D2]">
          Message received
        </p>

        <h3 className="mt-2 text-[18px] font-semibold tracking-[-0.015em] text-slate-950">
          Thank you for contacting Five Stars
        </h3>

        <p className="mt-2 text-[12px] leading-5 text-slate-600">
          We received your message. Keep your reference number below in case
          you need to contact us about this request.
        </p>

        <div className="mt-5 border-y border-slate-200 py-3.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Reference number
          </p>

          <p className="mt-1 text-[13px] font-semibold text-slate-950">
            {created.reference}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setCreated(null)}
          className="mt-5 inline-flex h-9 items-center justify-center rounded-[4px] bg-[#0078D2] px-4 text-[12px] font-semibold text-white transition-colors hover:bg-[#006bbd]"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Contact information */}
      <FormSection title="Contact information" first>
        <div className="grid gap-x-5 gap-y-[14px] md:grid-cols-2">
          <Field label="Full name" htmlFor="fullName" required>
            <input
              id="fullName"
              name="fullName"
              type="text"
              required
              autoComplete="name"
              placeholder="Your name"
              defaultValue={defaultFullName}
              className={inputClassName}
            />
          </Field>

          <Field label="Email" htmlFor="email" required>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              defaultValue={defaultEmail}
              className={inputClassName}
            />
          </Field>

          <Field label="Phone" htmlFor="phone" required>
            <input
              id="phone"
              name="phone"
              type="tel"
              required
              autoComplete="tel"
              placeholder="Phone number"
              className={inputClassName}
            />
          </Field>

          <Field label="Category" htmlFor="category" required>
            <select
              id="category"
              name="category"
              required
              defaultValue="GENERAL"
              className={`${inputClassName} cursor-pointer`}
            >
              {CONTACT_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {formatCategory(category)}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </FormSection>

      {/* Message */}
      <FormSection title="Your message">
        <div className="space-y-[14px]">
          <Field label="Subject" htmlFor="subject" required>
            <input
              id="subject"
              name="subject"
              type="text"
              required
              maxLength={200}
              placeholder="Briefly describe your question"
              className={inputClassName}
            />
          </Field>

          <Field label="Message" htmlFor="message" required>
            <textarea
              id="message"
              name="message"
              required
              maxLength={5000}
              rows={4}
              placeholder="Tell us how we can help"
              className={`${inputClassName} min-h-[112px] resize-y`}
            />
          </Field>
        </div>
      </FormSection>

      {error && (
        <div
          role="alert"
          className="mt-4 border-l-2 border-red-500 bg-red-50 px-3.5 py-2.5"
        >
          <p className="text-[12px] font-medium leading-5 text-red-700">
            {error}
          </p>
        </div>
      )}

      {/* Submit */}
      <div className="mt-5 flex flex-col gap-4 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-[470px] text-[10.5px] leading-[18px] text-slate-500">
          <span className="font-medium text-red-500">*</span> Required fields.
          Our customer care team will review your message and follow up.
        </p>

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex h-9 shrink-0 items-center justify-center rounded-[4px] bg-[#0078D2] px-5 text-[12px] font-semibold text-white transition-colors hover:bg-[#006bbd] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Sending..." : "Send message"}
        </button>
      </div>
    </form>
  );
}

function FormSection({
  title,
  first = false,
  children,
}: {
  title: string;
  first?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      className={
        first
          ? "pb-5"
          : "border-t border-slate-200 py-5"
      }
    >
      <h3 className="mb-4 text-[12px] font-semibold leading-5 text-slate-900">
        {title}
      </h3>

      {children}
    </section>
  );
}

function Field({
  label,
  htmlFor,
  required = false,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-1.5 block text-[11.5px] font-medium leading-4 text-slate-700"
      >
        {label}

        {required && (
          <span className="ml-0.5 text-red-500" aria-hidden="true">
            *
          </span>
        )}
      </label>

      {children}
    </div>
  );
}

function formatCategory(category: string) {
  return category
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}