import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { handleError } from "@/lib/api";
import { consentUrl } from "@/lib/social/youtube";

export async function GET() {
  try {
    await requireSession(["ADMIN", "MARKETING"]);
    return NextResponse.redirect(consentUrl());
  } catch (error) {
    return handleError(error);
  }
}
