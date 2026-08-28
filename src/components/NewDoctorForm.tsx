"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { createDoctor } from "@/app/admin/doctors/actions";
import { DoctorFields } from "./DoctorFields";
import { FormError } from "./FormError";

export function NewDoctorForm() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-primary">
        <Plus className="h-4 w-4" /> Add doctor
      </button>
    );
  }

  return (
    <form
      action={async (formData) => {
        setError(null);
        try {
          await createDoctor(formData);
        } catch (err) {
          // A redirect on success throws a control-flow signal Next.js handles;
          // only surface anything that is genuinely an error.
          if (err instanceof Error && err.message.includes("NEXT_REDIRECT")) throw err;
          setError(err instanceof Error ? err.message : "Could not save the doctor.");
        }
      }}
      className="card space-y-4 p-5"
    >
      <div className="flex items-center justify-between">
        <p className="font-semibold text-ink-900">New doctor</p>
        <button type="button" onClick={() => setOpen(false)} className="btn-ghost px-2 py-1">
          <X className="h-4 w-4" />
        </button>
      </div>

      <DoctorFields />
      <FormError message={error} />

      <button type="submit" className="btn-primary">
        Create doctor
      </button>
    </form>
  );
}
