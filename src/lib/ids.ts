import { prisma } from "./db";

const ALPHABET = "ACDEFGHJKLMNPQRTUVWXY3456789"; // no easily-confused characters

function randomCode(length: number) {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return out;
}

export function appointmentReference() {
  return `APT-${randomCode(6)}`;
}

export function otReference() {
  return `OT-${randomCode(6)}`;
}

export function receiptNumber() {
  const now = new Date();
  const stamp = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  return `RCP-${stamp}-${randomCode(6)}`;
}

/// Medical record numbers are sequential per year so front desk staff can read
/// them aloud; the count query is cheap and this is not a hot path.
export async function nextMrn() {
  const year = new Date().getUTCFullYear();
  const count = await prisma.patient.count({
    where: { createdAt: { gte: new Date(Date.UTC(year, 0, 1)) } },
  });
  return `MRN${year}${String(count + 1).padStart(5, "0")}`;
}
