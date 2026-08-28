import "server-only";
import { google } from "googleapis";
import { Readable } from "node:stream";
import { ApiError } from "../api";

export const YOUTUBE_SCOPES = ["https://www.googleapis.com/auth/youtube.upload"];

export function oauthClient() {
  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
  const redirectUri = process.env.YOUTUBE_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    throw new ApiError(
      "YouTube is not configured. Set YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET and YOUTUBE_REDIRECT_URI.",
      503,
    );
  }
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export function consentUrl() {
  return oauthClient().generateAuthUrl({
    access_type: "offline",
    prompt: "consent", // forces a refresh_token even on re-authorisation
    scope: YOUTUBE_SCOPES,
  });
}

export async function exchangeCode(code: string) {
  const { tokens } = await oauthClient().getToken(code);
  return tokens;
}

/// Streams a video from any public URL straight into YouTube, so staff can
/// paste a link rather than upload twice.
export async function publishToYouTube(params: {
  mediaUrl: string;
  title: string;
  description: string;
  tags: string[];
  refreshToken?: string;
}): Promise<{ externalId: string; url: string }> {
  const refreshToken = params.refreshToken || process.env.YOUTUBE_REFRESH_TOKEN;
  if (!refreshToken) {
    throw new ApiError("YouTube is not connected. Authorise it from Admin → Social.", 503);
  }

  const auth = oauthClient();
  auth.setCredentials({ refresh_token: refreshToken });
  const youtube = google.youtube({ version: "v3", auth });

  const source = await fetch(params.mediaUrl);
  if (!source.ok || !source.body) {
    throw new ApiError(`Could not download the video from ${params.mediaUrl}`, 400);
  }

  const res = await youtube.videos.insert({
    part: ["snippet", "status"],
    requestBody: {
      snippet: {
        title: params.title.slice(0, 100),
        description: params.description.slice(0, 5000),
        tags: params.tags.slice(0, 15),
      },
      status: { privacyStatus: "public", selfDeclaredMadeForKids: false },
    },
    media: {
      body: Readable.fromWeb(source.body as Parameters<typeof Readable.fromWeb>[0]),
    },
  });

  const id = res.data.id;
  if (!id) throw new ApiError("YouTube did not return a video id.", 502);
  return { externalId: id, url: `https://www.youtube.com/watch?v=${id}` };
}
