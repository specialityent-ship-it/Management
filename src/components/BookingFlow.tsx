"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { formatMoney } from "@/lib/format";
import { openRazorpayCheckout } from "@/lib/razorpay-checkout";

type Doctor = { id: string; name: string; slug: string; specialty: string };

export type BookableService = {
  id: string;
  slug: string;
  name: string;
  kind: string;
  durationMin: number;
  priceMinor: number;
  depositMinor: number;
  requiresDeposit: boolean;
  doctors: Doctor[];
};

type Booked = {
  reference: string;
  appointmentId: string;
  requiresPayment: boolean;
  depositMinor: number;
  start: string;
  doctor: string;
  service: string;
};

const STEPS = ["Service", "Time", "Your details", "Done"];

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
}

export function BookingFlow({
  services,
  preselect,
  paymentsEnabled,
}: {
  services: BookableService[];
  preselect: { service?: string; doctor?: string };
  paymentsEnabled: boolean;
}) {
  const initialService =
    services.find((s) => s.slug === preselect.service) ??
    services.find((s) => s.doctors.some((d) => d.slug === preselect.doctor)) ??
    services[0];

  const [step, setStep] = useState(0);
  const [serviceId, setServiceId] = useState(initialService?.id ?? "");
  const [doctorId, setDoctorId] = useState(
    initialService?.doctors.find((d) => d.slug === preselect.doctor)?.id ??
      initialService?.doctors[0]?.id ??
      "",
  );
  const [date, setDate] = useState(isoDate(new Date(Date.now() + 86_400_000)));
  const [slots, setSlots] = useState<{ start: string; end: string }[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [booked, setBooked] = useState<Booked | null>(null);
  const [paid, setPaid] = useState(false);

  const service = useMemo(() => services.find((s) => s.id === serviceId), [services, serviceId]);

  useEffect(() => {
    if (!service) return;
    if (!service.doctors.some((d) => d.id === doctorId)) {
      setDoctorId(service.doctors[0]?.id ?? "");
    }
  }, [service, doctorId]);

  useEffect(() => {
    if (step !== 1 || !serviceId || !doctorId) return;
    let cancelled = false;
    setSlotsLoading(true);
    setSelectedSlot(null);

    fetch(`/api/availability?doctorId=${doctorId}&serviceId=${serviceId}&date=${date}`)
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        setSlots(json.ok ? json.data.slots : []);
      })
      .catch(() => !cancelled && setSlots([]))
      .finally(() => !cancelled && setSlotsLoading(false));

    return () => {
      cancelled = true;
    };
  }, [step, serviceId, doctorId, date]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedSlot || !service) return;
    setSubmitting(true);
    setError(null);

    const form = new FormData(event.currentTarget);
    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        serviceId,
        doctorId,
        start: selectedSlot,
        reason: form.get("reason") || undefined,
        patient: {
          name: form.get("name"),
          phone: form.get("phone"),
          email: form.get("email") || undefined,
          gender: form.get("gender") || "UNDISCLOSED",
          dob: form.get("dob") || undefined,
          city: form.get("city") || undefined,
        },
      }),
    });

    const json = await res.json();
    setSubmitting(false);

    if (!json.ok) {
      setError(json.error ?? "Could not complete the booking.");
      if (res.status === 409) setStep(1);
      return;
    }

    setBooked(json.data);
    setStep(3);
  }

  async function pay() {
    if (!booked) return;
    setError(null);
    try {
      await openRazorpayCheckout({
        appointmentId: booked.appointmentId,
        description: `${booked.service} — ${booked.reference}`,
        onSuccess: () => setPaid(true),
        onError: (message) => setError(message),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start the payment.");
    }
  }

  return (
    <div className="mt-8">
      <ol className="flex items-center gap-2">
        {STEPS.map((label, index) => (
          <li key={label} className="flex flex-1 items-center gap-2">
            <span
              className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold ${
                index <= step ? "bg-brand-600 text-white" : "bg-ink-200 text-ink-500"
              }`}
            >
              {index + 1}
            </span>
            <span className={`hidden text-sm sm:block ${index <= step ? "font-medium text-ink-900" : "text-ink-500"}`}>
              {label}
            </span>
            {index < STEPS.length - 1 && <span className="h-px flex-1 bg-ink-200" />}
          </li>
        ))}
      </ol>

      {error && (
        <p className="mt-6 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {step === 0 && service && (
        <div className="card mt-6 space-y-5 p-6">
          <div>
            <label className="label" htmlFor="service">
              Service
            </label>
            <select
              id="service"
              className="input"
              value={serviceId}
              onChange={(e) => setServiceId(e.target.value)}
            >
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} — {s.durationMin} min
                  {s.priceMinor > 0 ? ` · ${formatMoney(s.priceMinor)}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label" htmlFor="doctor">
              Doctor
            </label>
            {service.doctors.length === 0 ? (
              <p className="text-sm text-ink-500">
                No doctor is currently accepting online bookings for this service. Please call us.
              </p>
            ) : (
              <select
                id="doctor"
                className="input"
                value={doctorId}
                onChange={(e) => setDoctorId(e.target.value)}
              >
                {service.doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} — {d.specialty}
                  </option>
                ))}
              </select>
            )}
          </div>

          {service.requiresDeposit && service.depositMinor > 0 && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              A {formatMoney(service.depositMinor)} deposit confirms this booking. It is adjusted
              against your bill.
            </p>
          )}

          <button
            className="btn-primary w-full py-3"
            disabled={!doctorId}
            onClick={() => setStep(1)}
          >
            Choose a time
          </button>
        </div>
      )}

      {step === 1 && (
        <div className="card mt-6 space-y-5 p-6">
          <div>
            <label className="label" htmlFor="date">
              Date
            </label>
            <input
              id="date"
              type="date"
              className="input"
              value={date}
              min={isoDate(new Date())}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div>
            <p className="label">Available slots</p>
            {slotsLoading ? (
              <p className="flex items-center gap-2 py-6 text-sm text-ink-500">
                <Loader2 className="h-4 w-4 animate-spin" /> Checking availability…
              </p>
            ) : slots.length === 0 ? (
              <p className="rounded-lg border border-dashed border-ink-300 p-6 text-center text-sm text-ink-500">
                No free slots on this date. Try another day.
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {slots.map((slot) => (
                  <button
                    key={slot.start}
                    onClick={() => setSelectedSlot(slot.start)}
                    className={`rounded-lg border px-2 py-2.5 text-sm font-medium transition-colors ${
                      selectedSlot === slot.start
                        ? "border-brand-600 bg-brand-600 text-white"
                        : "border-ink-200 bg-white text-ink-700 hover:border-brand-400"
                    }`}
                  >
                    {timeLabel(slot.start)}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button className="btn-secondary flex-1 py-3" onClick={() => setStep(0)}>
              Back
            </button>
            <button
              className="btn-primary flex-1 py-3"
              disabled={!selectedSlot}
              onClick={() => setStep(2)}
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <form onSubmit={submit} className="card mt-6 space-y-4 p-6">
          <p className="rounded-lg bg-brand-50 p-3 text-sm text-brand-900">
            {service?.name} with {service?.doctors.find((d) => d.id === doctorId)?.name} on{" "}
            {selectedSlot && new Date(selectedSlot).toLocaleString("en-IN", { dateStyle: "full", timeStyle: "short" })}
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="name">
                Patient name *
              </label>
              <input id="name" name="name" required className="input" />
            </div>
            <div>
              <label className="label" htmlFor="phone">
                Mobile number *
              </label>
              <input id="phone" name="phone" required inputMode="tel" className="input" />
            </div>
            <div>
              <label className="label" htmlFor="email">
                Email
              </label>
              <input id="email" name="email" type="email" className="input" />
            </div>
            <div>
              <label className="label" htmlFor="city">
                City
              </label>
              <input id="city" name="city" className="input" />
            </div>
            <div>
              <label className="label" htmlFor="gender">
                Gender
              </label>
              <select id="gender" name="gender" className="input" defaultValue="UNDISCLOSED">
                <option value="UNDISCLOSED">Prefer not to say</option>
                <option value="FEMALE">Female</option>
                <option value="MALE">Male</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="dob">
                Date of birth
              </label>
              <input id="dob" name="dob" type="date" max={isoDate(new Date())} className="input" />
            </div>
          </div>

          <div>
            <label className="label" htmlFor="reason">
              Reason for visit
            </label>
            <textarea
              id="reason"
              name="reason"
              rows={3}
              className="input"
              placeholder="Briefly, what would you like to discuss?"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" className="btn-secondary flex-1 py-3" onClick={() => setStep(1)}>
              Back
            </button>
            <button type="submit" disabled={submitting} className="btn-primary flex-1 py-3">
              {submitting ? "Booking…" : "Confirm booking"}
            </button>
          </div>
        </form>
      )}

      {step === 3 && booked && (
        <div className="card mt-6 space-y-5 p-6">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-7 w-7 shrink-0 text-emerald-600" />
            <div>
              <p className="text-lg font-semibold text-ink-900">
                {booked.requiresPayment && !paid ? "Almost there" : "Your appointment is booked"}
              </p>
              <p className="mt-1 text-sm text-ink-600">
                Reference <span className="font-mono font-semibold text-ink-900">{booked.reference}</span> — keep this
                for your records.
              </p>
            </div>
          </div>

          <dl className="divide-y divide-ink-100 rounded-lg border border-ink-200 text-sm">
            {[
              ["Service", booked.service],
              ["Doctor", booked.doctor],
              ["When", new Date(booked.start).toLocaleString("en-IN", { dateStyle: "full", timeStyle: "short" })],
            ].map(([term, value]) => (
              <div key={term} className="flex justify-between gap-4 px-4 py-2.5">
                <dt className="text-ink-500">{term}</dt>
                <dd className="text-right font-medium text-ink-900">{value}</dd>
              </div>
            ))}
          </dl>

          {booked.requiresPayment && !paid && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-medium text-amber-900">
                Pay the {formatMoney(booked.depositMinor)} deposit to confirm your slot.
              </p>
              {paymentsEnabled ? (
                <button onClick={pay} className="btn-primary mt-3 w-full py-3">
                  Pay {formatMoney(booked.depositMinor)} securely
                </button>
              ) : (
                <p className="mt-2 text-sm text-amber-800">
                  Online payment is not enabled yet — our team will call you to take the deposit.
                </p>
              )}
            </div>
          )}

          {paid && (
            <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
              Payment received. Your appointment is confirmed — we will see you then.
            </p>
          )}

          <p className="text-sm text-ink-500">
            Need to change or cancel? Call us with your reference code.
          </p>
        </div>
      )}
    </div>
  );
}
