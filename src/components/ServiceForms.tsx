"use client";

import { useState } from "react";
import { Plus, X, ChevronDown } from "lucide-react";
import { createService, updateService, setServiceActive } from "@/app/admin/services/actions";
import { FormError } from "./FormError";

type Doctor = { id: string; name: string };

type Service = {
  id: string;
  name: string;
  slug: string;
  kind: string;
  description: string;
  durationMin: number;
  priceMinor: number;
  depositMinor: number;
  requiresDeposit: boolean;
  displayOrder: number;
  active: boolean;
  doctorIds: string[];
};

function ServiceFields({ service, doctors }: { service?: Service; doctors: Doctor[] }) {
  const [requiresDeposit, setRequiresDeposit] = useState(service?.requiresDeposit ?? false);

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Name *</label>
          <input name="name" required defaultValue={service?.name} className="input" />
        </div>
        <div>
          <label className="label">Type *</label>
          <select name="kind" className="input" defaultValue={service?.kind ?? "OPD"}>
            <option value="OPD">OPD consultation</option>
            <option value="DIAGNOSTIC">Diagnostic</option>
            <option value="TELECONSULT">Teleconsultation</option>
            <option value="OT">Surgical procedure (theatre)</option>
          </select>
        </div>
      </div>

      <div>
        <label className="label">Description *</label>
        <textarea
          name="description"
          required
          rows={3}
          defaultValue={service?.description}
          placeholder="Shown on the website. What it involves and what the patient should expect."
          className="input"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="label">Duration (minutes) *</label>
          <input
            name="durationMin"
            type="number"
            min={5}
            max={720}
            step={5}
            required
            defaultValue={service?.durationMin ?? 15}
            className="input"
          />
        </div>
        <div>
          <label className="label">Price (₹)</label>
          <input
            name="priceMinor"
            type="number"
            min={0}
            step="1"
            defaultValue={service ? service.priceMinor / 100 : 0}
            className="input"
          />
        </div>
        <div>
          <label className="label">Order on website</label>
          <input
            name="displayOrder"
            type="number"
            min={0}
            max={9999}
            defaultValue={service?.displayOrder ?? 100}
            className="input"
          />
          <p className="mt-1 text-xs text-ink-500">Lower shows first.</p>
        </div>
      </div>

      <div className="rounded-lg border border-ink-200 p-3">
        <label className="flex items-center gap-2.5 text-sm text-ink-800">
          <input
            type="checkbox"
            name="requiresDeposit"
            checked={requiresDeposit}
            onChange={(e) => setRequiresDeposit(e.target.checked)}
            className="h-4 w-4 rounded border-ink-300 text-brand-600"
          />
          Require a deposit to confirm the booking
        </label>

        {requiresDeposit && (
          <div className="mt-3">
            <label className="label text-xs">Deposit (₹)</label>
            <input
              name="depositMinor"
              type="number"
              min={1}
              step="1"
              defaultValue={service ? service.depositMinor / 100 : 0}
              className="input"
            />
            <p className="mt-1 text-xs text-ink-500">
              The slot is held only once this is paid. Adjusted against the final bill.
            </p>
          </div>
        )}
        {!requiresDeposit && (
          <input type="hidden" name="depositMinor" value={service ? service.depositMinor / 100 : 0} />
        )}
      </div>

      <fieldset>
        <legend className="label">Provided by</legend>
        {doctors.length === 0 ? (
          <p className="text-xs text-ink-500">No active doctors to assign yet.</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {doctors.map((doctor) => (
              <label key={doctor.id} className="flex items-center gap-2 text-sm text-ink-800">
                <input
                  type="checkbox"
                  name="doctorIds"
                  value={doctor.id}
                  defaultChecked={service?.doctorIds.includes(doctor.id) ?? true}
                  className="h-4 w-4 rounded border-ink-300 text-brand-600"
                />
                {doctor.name}
              </label>
            ))}
          </div>
        )}
      </fieldset>

      <div>
        <label className="label">Web address</label>
        <input
          name="slug"
          defaultValue={service?.slug}
          placeholder="Leave blank to generate from the name"
          className="input"
        />
      </div>

      <label className="flex items-center gap-2.5 text-sm text-ink-800">
        <input
          type="checkbox"
          name="active"
          defaultChecked={service?.active ?? true}
          className="h-4 w-4 rounded border-ink-300 text-brand-600"
        />
        Listed on the website
      </label>
    </>
  );
}

export function NewServiceForm({ doctors }: { doctors: Doctor[] }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-primary">
        <Plus className="h-4 w-4" /> Add service
      </button>
    );
  }

  return (
    <form
      action={async (formData) => {
        setError(null);
        try {
          await createService(formData);
          setOpen(false);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Could not save the service.");
        }
      }}
      className="card space-y-4 p-5"
    >
      <div className="flex items-center justify-between">
        <p className="font-semibold text-ink-900">New service</p>
        <button type="button" onClick={() => setOpen(false)} className="btn-ghost px-2 py-1">
          <X className="h-4 w-4" />
        </button>
      </div>

      <ServiceFields doctors={doctors} />
      <FormError message={error} />

      <button type="submit" className="btn-primary">
        Create service
      </button>
    </form>
  );
}

export function ServiceCard({
  service,
  doctors,
  summary,
}: {
  service: Service;
  doctors: Doctor[];
  summary: string;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <button onClick={() => setOpen((v) => !v)} className="min-w-0 flex-1 text-left">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium text-ink-900">{service.name}</p>
            {!service.active && (
              <span className="badge bg-ink-100 text-ink-600 ring-ink-200">Hidden</span>
            )}
            {service.requiresDeposit && (
              <span className="badge bg-amber-50 text-amber-800 ring-amber-200">Deposit</span>
            )}
            {service.kind === "OT" && (
              <span className="badge bg-violet-50 text-violet-800 ring-violet-200">
                Not self-bookable
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-ink-500">{summary}</p>
        </button>

        <div className="flex items-center gap-2">
          <form action={setServiceActive}>
            <input type="hidden" name="id" value={service.id} />
            <input type="hidden" name="active" value={service.active ? "false" : "true"} />
            <button className="btn-secondary px-2.5 py-1.5 text-xs">
              {service.active ? "Hide" : "Show"}
            </button>
          </form>
          <button onClick={() => setOpen((v) => !v)} className="btn-ghost px-2 py-1.5 text-xs">
            <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
          </button>
        </div>
      </div>

      {open && (
        <form
          action={async (formData) => {
            setError(null);
            try {
              await updateService(formData);
              setOpen(false);
            } catch (err) {
              setError(err instanceof Error ? err.message : "Could not save the service.");
            }
          }}
          className="space-y-4 border-t border-ink-200 bg-ink-50 p-5"
        >
          <input type="hidden" name="id" value={service.id} />
          <ServiceFields service={service} doctors={doctors} />
          <FormError message={error} />
          <button type="submit" className="btn-primary">
            Save changes
          </button>
        </form>
      )}
    </div>
  );
}
