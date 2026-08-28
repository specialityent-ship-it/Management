"use client";

import { useState } from "react";
import { Plus, X, KeyRound } from "lucide-react";
import {
  createStaff,
  updateStaffRole,
  setStaffActive,
  resetStaffPassword,
} from "@/app/admin/staff/actions";
import { FormError } from "./FormError";

const ROLES = ["ADMIN", "DOCTOR", "RECEPTION", "OT_COORDINATOR", "MARKETING"];

function label(role: string) {
  return role
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function NewStaffForm() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-primary">
        <Plus className="h-4 w-4" /> Add staff account
      </button>
    );
  }

  return (
    <form
      action={async (formData) => {
        setError(null);
        try {
          await createStaff(formData);
          setOpen(false);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Could not create the account.");
        }
      }}
      className="card w-full max-w-lg space-y-4 p-5"
    >
      <div className="flex items-center justify-between">
        <p className="font-semibold text-ink-900">New staff account</p>
        <button type="button" onClick={() => setOpen(false)} className="btn-ghost px-2 py-1">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Name *</label>
          <input name="name" required className="input" />
        </div>
        <div>
          <label className="label">Email *</label>
          <input name="email" type="email" required className="input" />
        </div>
      </div>

      <div>
        <label className="label">Role *</label>
        <select name="role" className="input" defaultValue="RECEPTION">
          {ROLES.map((role) => (
            <option key={role} value={role}>
              {label(role)}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="label">Temporary password *</label>
        <input name="password" type="text" required minLength={12} className="input" />
        <p className="mt-1 text-xs text-ink-500">
          At least 12 characters. Share it with them directly and ask them to change it.
        </p>
      </div>

      <FormError message={error} />

      <button type="submit" className="btn-primary w-full">
        Create account
      </button>
    </form>
  );
}

export function StaffRow({
  member,
  isSelf,
  addedOn,
}: {
  member: { id: string; name: string; email: string; role: string; active: boolean };
  isSelf: boolean;
  addedOn: string;
}) {
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <tr className="align-top">
      <td className="td">
        <p className="font-medium">
          {member.name}
          {isSelf && <span className="ml-2 text-xs font-normal text-ink-500">(you)</span>}
        </p>
        <p className="text-xs text-ink-500">{member.email}</p>
      </td>

      <td className="td">
        <form action={updateStaffRole} className="flex items-center gap-2">
          <input type="hidden" name="id" value={member.id} />
          <select name="role" defaultValue={member.role} className="input py-1 text-xs">
            {ROLES.map((role) => (
              <option key={role} value={role}>
                {label(role)}
              </option>
            ))}
          </select>
          <button className="btn-secondary px-2 py-1 text-xs">Set</button>
        </form>
      </td>

      <td className="td text-sm text-ink-500">{addedOn}</td>

      <td className="td">
        <div className="flex flex-col items-end gap-2">
          <div className="flex justify-end gap-1.5">
            <button
              onClick={() => setResetting((v) => !v)}
              className="btn-ghost px-2 py-1.5 text-xs"
              title="Reset password"
            >
              <KeyRound className="h-3.5 w-3.5" />
            </button>

            {!isSelf && (
              <form
                action={async (formData) => {
                  setError(null);
                  try {
                    await setStaffActive(formData);
                  } catch (err) {
                    setError(err instanceof Error ? err.message : "Could not update.");
                  }
                }}
              >
                <input type="hidden" name="id" value={member.id} />
                <input type="hidden" name="active" value={member.active ? "false" : "true"} />
                <button className="btn-secondary px-2.5 py-1.5 text-xs">
                  {member.active ? "Disable" : "Enable"}
                </button>
              </form>
            )}

            {!member.active && (
              <span className="badge bg-red-50 text-red-700 ring-red-200">Disabled</span>
            )}
          </div>

          {resetting && (
            <form
              action={async (formData) => {
                setError(null);
                try {
                  await resetStaffPassword(formData);
                  setResetting(false);
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Could not reset.");
                }
              }}
              className="w-56 space-y-2"
            >
              <input type="hidden" name="id" value={member.id} />
              <input
                name="password"
                type="text"
                required
                minLength={12}
                placeholder="New password (12+ chars)"
                className="input text-xs"
              />
              <button className="btn-secondary w-full px-2 py-1 text-xs">Set password</button>
            </form>
          )}

          {error && <p className="max-w-[14rem] text-right text-xs text-red-600">{error}</p>}
        </div>
      </td>
    </tr>
  );
}
