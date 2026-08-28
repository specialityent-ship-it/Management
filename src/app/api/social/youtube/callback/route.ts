import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { handleError, fail } from "@/lib/api";
import { exchangeCode } from "@/lib/social/youtube";

export async function GET(request: NextRequest) {
  try {
    await requireSession(["ADMIN", "MARKETING"]);

    const code = request.nextUrl.searchParams.get("code");
    if (!code) return fail("Authorisation was cancelled.", 400);

    const tokens = await exchangeCode(code);
    if (!tokens.refresh_token) {
      return fail(
        "Google did not return a refresh token. Revoke the app's access in your Google account and authorise again.",
        400,
      );
    }

    await prisma.socialAccount.upsert({
      where: { platform: "YOUTUBE" },
      create: {
        platform: "YOUTUBE",
        displayName: "YouTube channel",
        accessToken: tokens.access_token ?? null,
        refreshToken: tokens.refresh_token,
        expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        connected: true,
      },
      update: {
        accessToken: tokens.access_token ?? null,
        refreshToken: tokens.refresh_token,
        expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        connected: true,
      },
    });

    // The refresh token is long-lived; putting it in the environment keeps
    // publishing working after a redeploy without another consent round-trip.
    console.info(
      "[youtube] Store this in your environment as YOUTUBE_REFRESH_TOKEN:",
      tokens.refresh_token,
    );

    return NextResponse.redirect(new URL("/admin/social?youtube=connected", request.nextUrl.origin));
  } catch (error) {
    return handleError(error);
  }
}
