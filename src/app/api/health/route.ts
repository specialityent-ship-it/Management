import { NextResponse } from "next/server";

/// Liveness probe for the hosting platform. Deliberately touches nothing —
/// no database, no integrations — so it answers as long as the process is up
/// and is a true signal of "can the edge reach this container".
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ ok: true, at: new Date().toISOString() });
}
