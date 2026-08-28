"use client";

import { useState } from "react";
import { Trash2, Plus } from "lucide-react";
import {
  addAvailability,
  removeAvailability,
  addTimeOff,
  removeTimeOff,
} from "@/app/admin/doctors/actions";
import { DAY_NAMES } from "@/lib/slug";
import { FormError } from "./FormError";

export function AvailabilityRow({
  id,
  doctorId,
  label,
  detail,
}: {
  id: string;
  doctorId: string;
  label: string;
  detail?: string;
}) {
  return (
    <li className="flex items-center justify-between gap-2 rounded-lg border border-ink-200 px-3 py-1.5">
      <span className="text-sm text-ink-800">
        {label}
        {detail && <span className="ml-2 text-xs text-ink-500">{detail}</span>}
      </span>
      <form action={removeAvailability}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="doctorId" value={doctorId} />
        <button className="btn-ghost px-1.5 py-1" aria-label="Remove window">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </form>
    </li>
  );
}

export function TimeOffRow({
  id,
  doctorId,
  label,
  detail,
}: {
  id: string;
  doctorId: string;
  label: string;
  detail?: string;
}) {
  return (
    <li className="flex items-center justify-between gap-2 rounded-lg border border-ink-200 px-3 py-1.5">
      <span className="text-sm text-ink-800">
        {label}
        {detail && <span className="ml-2 text-xs text-ink-500">{detail}</span>}
      </span>
      <form action={removeTimeOff}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="doctorId" value={doctorId} />
        <button className="btn-ghost px-1.5 py-1" aria-label="Remove block">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </form>
    </li>
  );
}

export function AddAvailabilityForm({ doctorId }: { doctorId: string }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-secondary mt-4 w-full text-xs">
        <Plus className="h-3.5 w-3.5" /> Add consulting hours
      </button>
    );
  }

  return (
    <form
      action={async (formData) => {
        setError(null);
        try {
          await addAvailability(formData);
          setOpen(false);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Could not add that window.");
        }
      }}
      className="mt-4 space-y-3 rounded-lg border border-ink-200 p-3"
    >
      <input type="hidden" name="doctorId" value={doctorId} />

      <div>
        <label className="label text-xs" htmlFor="dayOfWeek">
          Day
        </label>
        <select id="dayOfWeek" name="dayOfWeek" className="input" defaultValue="1">
          {DAY_NAMES.map((name, index) => (
            <option key={name} value={index}>
              {name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label text-xs" htmlFor="start">
            From
          </label>
          <input id="start" name="start" type="time" required defaultValue="09:00" className="input" />
        </div>
        <div>
          <label className="label text-xs" htmlFor="end">
            To
          </label>
          <input id="end" name="end" type="time" required defaultValue="13:00" className="input" />
        </div>
      </div>

      <div>
        <label className="label text-xs" htmlFor="slotMin">
          Appointment length (minutes)
        </label>
        <input
          id="slotMin"
          name="slotMin"
          type="number"
          min={5}
          max={240}
          step={5}
          defaultValue={15}
          className="input"
        />
      </div>

      <FormError message={error} />

      <div className="flex gap-2">
        <button type="button" onClick={() => setOpen(false)} className="btn-secondary flex-1 text-xs">
          Cancel
        </button>
        <button type="submit" className="btn-primary flex-1 text-xs">
          Add
        </button>
      </div>
    </form>
  );
}

export function AddTimeOffForm({ doctorId }: { doctorId: string }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-secondary mt-4 w-full text-xs">
        <Plus className="h-3.5 w-3.5" /> Block time
      </button>
    );
  }

  return (
    <form
      action={async (formData) => {
        setError(null);
        try {
          await addTimeOff(formData);
          setOpen(false);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Could not block that time.");
        }
      }}
      className="mt-4 space-y-3 rounded-lg border border-ink-200 p-3"
    >
      <input type="hidden" name="doctorId" value={doctorId} />

      <div>
        <label className="label text-xs" htmlFor="tstart">
          From
        </label>
        <input id="tstart" name="start" type="datetime-local" required className="input" />
      </div>
      <div>
        <label className="label text-xs" htmlFor="tend">
          To
        </label>
        <input id="tend" name="end" type="datetime-local" required className="input" />
      </div>
      <div>
        <label className="label text-xs" htmlFor="reason">
          Reason
        </label>
        <input id="reason" name="reason" placeholder="Leave, conference…" className="input" />
      </div>

      <FormError message={error} />

      <div className="flex gap-2">
        <button type="button" onClick={() => setOpen(false)} className="btn-secondary flex-1 text-xs">
          Cancel
        </button>
        <button type="submit" className="btn-primary flex-1 text-xs">
          Block
        </button>
      </div>
    </form>
  );
}
