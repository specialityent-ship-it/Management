import { prisma } from "./db";

export function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
}

/// Slugs are part of public URLs, so they must be unique. Rather than failing
/// the save when two doctors share a name, append a counter.
export async function uniqueSlug(
  base: string,
  model: "doctor" | "service",
  ignoreId?: string,
): Promise<string> {
  const root = slugify(base) || model;

  for (let suffix = 0; suffix < 50; suffix++) {
    const candidate = suffix === 0 ? root : `${root}-${suffix + 1}`;
    const existing =
      model === "doctor"
        ? await prisma.doctor.findUnique({ where: { slug: candidate }, select: { id: true } })
        : await prisma.service.findUnique({ where: { slug: candidate }, select: { id: true } });

    if (!existing || existing.id === ignoreId) return candidate;
  }

  return `${root}-${Date.now()}`;
}

/// "09:30" from a form <input type="time"> into minutes past midnight.
export function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return NaN;
  return hours * 60 + minutes;
}

export function minutesToTime(value: number) {
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}

export function minutesToLabel(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const suffix = h < 12 ? "am" : "pm";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${suffix}`;
}

export const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
