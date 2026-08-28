"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";

export function ContactForm({ services }: { services: string[] }) {
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    setError(null);

    const form = new FormData(event.currentTarget);
    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        phone: form.get("phone"),
        email: form.get("email") || undefined,
        city: form.get("city") || undefined,
        interest: form.get("interest") || undefined,
        message: form.get("message") || undefined,
        source: "WEBSITE_FORM",
      }),
    });

    const json = await res.json();
    if (json.ok) {
      setStatus("sent");
    } else {
      setStatus("idle");
      setError(json.error ?? "Could not send your message. Please call us instead.");
    }
  }

  if (status === "sent") {
    return (
      <div className="card flex flex-col items-start gap-3 p-8">
        <CheckCircle2 className="h-8 w-8 text-emerald-600" />
        <p className="text-lg font-semibold text-ink-900">Thank you — we have your message.</p>
        <p className="text-sm text-ink-600">
          A member of our team will call you back, usually within one working day.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card space-y-4 p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="name">
            Your name *
          </label>
          <input id="name" name="name" required className="input" placeholder="Full name" />
        </div>
        <div>
          <label className="label" htmlFor="phone">
            Phone *
          </label>
          <input
            id="phone"
            name="phone"
            required
            inputMode="tel"
            className="input"
            placeholder="10-digit mobile number"
          />
        </div>
        <div>
          <label className="label" htmlFor="email">
            Email
          </label>
          <input id="email" name="email" type="email" className="input" placeholder="you@example.com" />
        </div>
        <div>
          <label className="label" htmlFor="city">
            City
          </label>
          <input id="city" name="city" className="input" placeholder="City" />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="interest">
          What is this about?
        </label>
        <select id="interest" name="interest" className="input" defaultValue="">
          <option value="">General enquiry</option>
          {services.map((service) => (
            <option key={service} value={service}>
              {service}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="label" htmlFor="message">
          Message
        </label>
        <textarea
          id="message"
          name="message"
          rows={5}
          className="input"
          placeholder="Tell us how we can help. Please do not include sensitive medical details."
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button type="submit" disabled={status === "sending"} className="btn-primary w-full py-3">
        {status === "sending" ? "Sending…" : "Send message"}
      </button>
      <p className="text-xs text-ink-500">
        By sending this you agree we may contact you about your enquiry.
      </p>
    </form>
  );
}
