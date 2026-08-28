"use client";

type Doctor = {
  id: string;
  name: string;
  slug: string;
  qualifications: string;
  specialty: string;
  bio: string;
  photoUrl: string | null;
  regNumber: string | null;
  yearsExp: number;
  consultFee: number;
  active: boolean;
};

/// Shared between the "add" and "edit" forms so a new field only has to be
/// added once. Fees are shown in rupees; the server converts to paise.
export function DoctorFields({ doctor }: { doctor?: Doctor }) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="name">
            Name *
          </label>
          <input
            id="name"
            name="name"
            required
            defaultValue={doctor?.name}
            placeholder="Dr A. Rao"
            className="input"
          />
        </div>
        <div>
          <label className="label" htmlFor="specialty">
            Specialty *
          </label>
          <input
            id="specialty"
            name="specialty"
            required
            defaultValue={doctor?.specialty}
            placeholder="ENT & Head-Neck Surgery"
            className="input"
          />
        </div>
        <div>
          <label className="label" htmlFor="qualifications">
            Qualifications *
          </label>
          <input
            id="qualifications"
            name="qualifications"
            required
            defaultValue={doctor?.qualifications}
            placeholder="MBBS, MS (ENT)"
            className="input"
          />
        </div>
        <div>
          <label className="label" htmlFor="regNumber">
            Registration number
          </label>
          <input
            id="regNumber"
            name="regNumber"
            defaultValue={doctor?.regNumber ?? ""}
            className="input"
          />
        </div>
        <div>
          <label className="label" htmlFor="yearsExp">
            Years of experience
          </label>
          <input
            id="yearsExp"
            name="yearsExp"
            type="number"
            min={0}
            max={80}
            defaultValue={doctor?.yearsExp ?? 0}
            className="input"
          />
        </div>
        <div>
          <label className="label" htmlFor="consultFee">
            Consultation fee (₹)
          </label>
          <input
            id="consultFee"
            name="consultFee"
            type="number"
            min={0}
            step="1"
            defaultValue={doctor ? doctor.consultFee / 100 : 0}
            className="input"
          />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="bio">
          Profile
        </label>
        <textarea
          id="bio"
          name="bio"
          rows={4}
          defaultValue={doctor?.bio}
          placeholder="Shown on the website. A short paragraph about their focus and approach."
          className="input"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="photoUrl">
            Photo URL
          </label>
          <input
            id="photoUrl"
            name="photoUrl"
            type="url"
            defaultValue={doctor?.photoUrl ?? ""}
            placeholder="https://…"
            className="input"
          />
        </div>
        <div>
          <label className="label" htmlFor="slug">
            Web address
          </label>
          <input
            id="slug"
            name="slug"
            defaultValue={doctor?.slug}
            placeholder="Leave blank to generate from the name"
            className="input"
          />
          <p className="mt-1 text-xs text-ink-500">/doctors/{doctor?.slug || "…"}</p>
        </div>
      </div>

      <label className="flex items-center gap-2.5 text-sm text-ink-800">
        <input
          type="checkbox"
          name="active"
          defaultChecked={doctor?.active ?? true}
          className="h-4 w-4 rounded border-ink-300 text-brand-600"
        />
        Listed on the website and bookable
      </label>
    </>
  );
}
