import "server-only";
import { ApiError } from "../api";

const GRAPH = "https://graph.facebook.com";

function config() {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  const igUserId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;
  const version = process.env.META_GRAPH_VERSION || "v21.0";
  if (!token || !igUserId) {
    throw new ApiError(
      "Instagram is not connected. Set INSTAGRAM_ACCESS_TOKEN and INSTAGRAM_BUSINESS_ACCOUNT_ID.",
      503,
    );
  }
  return { token, igUserId, version };
}

async function graph(path: string, body: Record<string, string>, version: string) {
  const res = await fetch(`${GRAPH}/${version}/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body),
  });
  const json = (await res.json()) as { id?: string; error?: { message?: string } };
  if (!res.ok || json.error) {
    throw new ApiError(json.error?.message || `Instagram API error (${res.status})`, 502);
  }
  return json;
}

/// Instagram publishing is two-phase: create a media container from a
/// publicly reachable URL, poll until Meta has fetched it, then publish.
export async function publishToInstagram(params: {
  mediaUrl: string;
  caption: string;
  isVideo: boolean;
}): Promise<{ externalId: string; url: string }> {
  const { token, igUserId, version } = config();

  const container = await graph(
    `${igUserId}/media`,
    params.isVideo
      ? {
          media_type: "REELS",
          video_url: params.mediaUrl,
          caption: params.caption,
          access_token: token,
        }
      : { image_url: params.mediaUrl, caption: params.caption, access_token: token },
    version,
  );

  const containerId = container.id;
  if (!containerId) throw new ApiError("Instagram did not return a media container id.", 502);

  if (params.isVideo) await waitForContainer(containerId, token, version);

  const published = await graph(
    `${igUserId}/media_publish`,
    { creation_id: containerId, access_token: token },
    version,
  );
  if (!published.id) throw new ApiError("Instagram did not return a media id.", 502);

  return {
    externalId: published.id,
    url: `https://www.instagram.com/p/${published.id}`,
  };
}

/// Video containers are processed asynchronously; publishing before the
/// container reports FINISHED fails, so poll for up to ~2.5 minutes.
async function waitForContainer(containerId: string, token: string, version: string) {
  for (let attempt = 0; attempt < 30; attempt++) {
    await new Promise((r) => setTimeout(r, 5000));
    const res = await fetch(
      `${GRAPH}/${version}/${containerId}?fields=status_code,status&access_token=${token}`,
    );
    const json = (await res.json()) as { status_code?: string; status?: string };
    if (json.status_code === "FINISHED") return;
    if (json.status_code === "ERROR") {
      throw new ApiError(`Instagram could not process the video: ${json.status ?? "unknown"}`, 502);
    }
  }
  throw new ApiError("Instagram is still processing the video. Try publishing again shortly.", 504);
}
