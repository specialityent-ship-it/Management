import { NextRequest } from "next/server";
import { ok, fail, handleError } from "@/lib/api";
import { publishDuePosts } from "@/lib/social/publish";

export const maxDuration = 300;

/// Called on a schedule (Vercel Cron, GitHub Actions, or any external pinger)
/// to publish posts whose scheduled time has arrived.
export async function GET(request: NextRequest) {
  try {
    const secret = process.env.CRON_SECRET;
    if (!secret) return fail("CRON_SECRET is not set.", 503);

    const provided =
      request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
      request.nextUrl.searchParams.get("secret");
    if (provided !== secret) return fail("Unauthorized", 401);

    const results = await publishDuePosts();
    return ok({ processed: results.length, results });
  } catch (error) {
    return handleError(error);
  }
}
