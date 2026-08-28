"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { createOtCase } from "@/app/admin/ot/actions";

type Option = { id: string; name: string };

export function NewOtCaseForm({
  patients,
  surgeons,
  services,
  theatres,
}: {
  patients: { id: string; name: string; mrn: string; phone: string }[];
  surgeons: Option[];
  services: { id: string; name: string; durationMin: number }[];
  theatres: Option[];
}) {
  const [open, setOpen] = useState(false);
  const [duration, setDuration] = useState(services[0]?.durationMin ?? 60);

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-primary">
        <Plus className="h-4 w-4" /> Schedule a case
      </button>
    );
  }

  if (services.length === 0 || surgeons.length === 0 || patients.length === 0) {
    return (
      <div className="card p-5 text-sm text-ink-600">
        To schedule a case you need at least one patient, one surgeon and one service of type OT.
        <button onClick={() => setOpen(false)} className="btn-ghost ml-2 px-2 py-1 text-xs">
          Close
        </button>
      </div>
    );
  }

  return (
    <form
      action={async (formData) => {
        await createOtCase(formData);
        setOpen(false);
      }}
      className="card space-y-4 p-5"
    >
      <div className="flex items-center justify-between">
        <p className="font-semibold text-ink-900">Schedule a theatre case</p>
        <button type="button" onClick={() => setOpen(false)} className="btn-ghost px-2 py-1">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <label className="label" htmlFor="patientId">
            Patient
          </label>
          <select id="patientId" name="patientId" required className="input">
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {p.mrn}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label" htmlFor="serviceId">
            Procedure
          </label>
          <select
            id="serviceId"
            name="serviceId"
            required
            className="input"
            onChange={(e) => {
              const service = services.find((s) => s.id === e.target.value);
              if (service) setDuration(service.durationMin);
            }}
          >
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label" htmlFor="surgeonId">
            Surgeon
          </label>
          <select id="surgeonId" name="surgeonId" required className="input">
            {surgeons.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label" htmlFor="scheduledStart">
            Start
          </label>
          <input
            id="scheduledStart"
            name="scheduledStart"
            type="datetime-local"
            required
            className="input"
          />
        </div>

        <div>
          <label className="label" htmlFor="durationMin">
            Duration (minutes)
          </label>
          <input
            id="durationMin"
            name="durationMin"
            type="number"
            min={15}
            max={720}
            step={5}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="input"
          />
        </div>

        <div>
          <label className="label" htmlFor="theatreId">
            Theatre
          </label>
          <select id="theatreId" name="theatreId" className="input" defaultValue="">
            <option value="">Assign later</option>
            {theatres.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label" htmlFor="anaesthesia">
            Anaesthesia
          </label>
          <select id="anaesthesia" name="anaesthesia" className="input" defaultValue="LOCAL">
            <option value="LOCAL">Local</option>
            <option value="REGIONAL">Regional</option>
            <option value="SEDATION">Sedation</option>
            <option value="GENERAL">General</option>
          </select>
        </div>

        <div>
          <label className="label" htmlFor="anaesthetist">
            Anaesthetist
          </label>
          <input id="anaesthetist" name="anaesthetist" className="input" />
        </div>

        <div>
          <label className="label" htmlFor="assistants">
            Assistants
          </label>
          <input id="assistants" name="assistants" className="input" placeholder="Comma separated" />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="procedureNote">
          Planned procedure notes
        </label>
        <textarea id="procedureNote" name="procedureNote" rows={3} className="input" />
      </div>

      <button type="submit" className="btn-primary">
        Schedule case
      </button>
    </form>
  );
}
