"use client";

import { useState } from "react";
import { StickyNote } from "lucide-react";
import { updateAppointmentStatus, saveStaffNote } from "@/app/admin/appointments/actions";

/// The next sensible transitions for each status, so reception sees one or two
/// buttons rather than the whole state machine.
const NEXT: Record<string, { status: string; label: string; tone: string }[]> = {
  REQUESTED: [
    { status: "CONFIRMED", label: "Confirm", tone: "btn-primary" },
    { status: "CANCELLED", label: "Decline", tone: "btn-secondary" },
  ],
  PENDING_PAYMENT: [
    { status: "CONFIRMED", label: "Mark paid & confirm", tone: "btn-primary" },
    { status: "CANCELLED", label: "Cancel", tone: "btn-secondary" },
  ],
  CONFIRMED: [
    { status: "CHECKED_IN", label: "Check in", tone: "btn-primary" },
    { status: "NO_SHOW", label: "No show", tone: "btn-secondary" },
    { status: "CANCELLED", label: "Cancel", tone: "btn-secondary" },
  ],
  CHECKED_IN: [{ status: "COMPLETED", label: "Complete", tone: "btn-primary" }],
};

export function AppointmentRowActions({
  id,
  status,
  staffNote,
}: {
  id: string;
  status: string;
  staffNote: string | null;
}) {
  const [noteOpen, setNoteOpen] = useState(false);
  const actions = NEXT[status] ?? [];

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap justify-end gap-1.5">
        {actions.map((action) => (
          <form key={action.status} action={updateAppointmentStatus}>
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="status" value={action.status} />
            <button className={`${action.tone} px-2.5 py-1.5 text-xs`}>{action.label}</button>
          </form>
        ))}
        <button
          onClick={() => setNoteOpen((v) => !v)}
          className="btn-ghost px-2 py-1.5 text-xs"
          title="Staff note"
        >
          <StickyNote className="h-3.5 w-3.5" />
        </button>
      </div>

      {noteOpen && (
        <form action={saveStaffNote} className="w-64 space-y-2 text-left">
          <input type="hidden" name="id" value={id} />
          <textarea
            name="staffNote"
            rows={3}
            defaultValue={staffNote ?? ""}
            placeholder="Internal note — not shown to the patient"
            className="input text-xs"
          />
          <button className="btn-secondary w-full px-2 py-1.5 text-xs">Save note</button>
        </form>
      )}

      {!noteOpen && staffNote && (
        <p className="max-w-xs text-right text-xs italic text-ink-400">{staffNote}</p>
      )}
    </div>
  );
}
