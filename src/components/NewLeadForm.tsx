"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { createLead } from "@/app/admin/crm/actions";

export function NewLeadForm() {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-primary">
        <Plus className="h-4 w-4" /> Add lead
      </button>
    );
  }

  return (
    <form
      action={async (formData) => {
        await createLead(formData);
        setOpen(false);
      }}
      className="card w-full max-w-md space-y-3 p-5"
    >
      <div className="flex items-center justify-between">
        <p className="font-semibold text-ink-900">New lead</p>
        <button type="button" onClick={() => setOpen(false)} className="btn-ghost px-2 py-1">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="lead-name">
            Name
          </label>
          <input id="lead-name" name="name" required className="input" />
        </div>
        <div>
          <label className="label" htmlFor="lead-phone">
            Phone
          </label>
          <input id="lead-phone" name="phone" required inputMode="tel" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="lead-email">
            Email
          </label>
          <input id="lead-email" name="email" type="email" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="lead-city">
            City
          </label>
          <input id="lead-city" name="city" className="input" />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="lead-interest">
          Interested in
        </label>
        <input id="lead-interest" name="interest" className="input" />
      </div>

      <div>
        <label className="label" htmlFor="lead-source">
          Source
        </label>
        <select id="lead-source" name="source" className="input" defaultValue="PHONE">
          {["PHONE", "WALK_IN", "REFERRAL", "INSTAGRAM", "YOUTUBE", "GOOGLE", "CAMPAIGN", "WEBSITE_FORM"].map(
            (source) => (
              <option key={source} value={source}>
                {source.replace(/_/g, " ")}
              </option>
            ),
          )}
        </select>
      </div>

      <div>
        <label className="label" htmlFor="lead-message">
          Notes
        </label>
        <textarea id="lead-message" name="message" rows={3} className="input" />
      </div>

      <button type="submit" className="btn-primary w-full">
        Create lead
      </button>
    </form>
  );
}
