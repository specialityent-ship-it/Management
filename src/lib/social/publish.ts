import "server-only";
import { PostStatus, SocialPlatform } from "@prisma/client";
import { prisma } from "../db";
import { ApiError } from "../api";
import { publishToInstagram } from "./instagram";
import { publishToYouTube } from "./youtube";

export type TargetResult = {
  platform: SocialPlatform;
  ok: boolean;
  url?: string;
  error?: string;
};

function fullCaption(caption: string, hashtags: string | null) {
  return hashtags ? `${caption}\n\n${hashtags}` : caption;
}

/// Publishes one post to every platform it targets. Each platform is attempted
/// independently so a failure on one does not roll back the other — the caller
/// gets a per-platform result and can retry just the failed leg.
export async function publishPost(postId: string): Promise<TargetResult[]> {
  const post = await prisma.socialPost.findUnique({
    where: { id: postId },
    include: { targets: true },
  });
  if (!post) throw new ApiError("Post not found", 404);
  if (post.targets.length === 0) throw new ApiError("Pick at least one platform first.", 400);
  if (!post.mediaUrl) throw new ApiError("Add a public media URL before publishing.", 400);

  await prisma.socialPost.update({
    where: { id: post.id },
    data: { status: PostStatus.PUBLISHING },
  });

  const pending = post.targets.filter((t) => t.status !== PostStatus.PUBLISHED);
  const isVideo = post.mediaKind === "VIDEO" || post.mediaKind === "REEL" || post.mediaKind === "SHORT";
  const caption = fullCaption(post.caption, post.hashtags);
  const mediaUrl = post.mediaUrl;

  const results = await Promise.all(
    pending.map(async (target): Promise<TargetResult> => {
      try {
        const published =
          target.platform === SocialPlatform.INSTAGRAM
            ? await publishToInstagram({ mediaUrl, caption, isVideo })
            : await publishToYouTube({
                mediaUrl,
                title: post.title,
                description: caption,
                tags: (post.hashtags ?? "")
                  .split(/[\s,]+/)
                  .map((t) => t.replace(/^#/, ""))
                  .filter(Boolean),
              });

        await prisma.socialTarget.update({
          where: { id: target.id },
          data: {
            status: PostStatus.PUBLISHED,
            externalId: published.externalId,
            externalUrl: published.url,
            publishedAt: new Date(),
            error: null,
          },
        });
        return { platform: target.platform, ok: true, url: published.url };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        await prisma.socialTarget.update({
          where: { id: target.id },
          data: { status: PostStatus.FAILED, error: message },
        });
        return { platform: target.platform, ok: false, error: message };
      }
    }),
  );

  const targets = await prisma.socialTarget.findMany({ where: { postId: post.id } });
  const allPublished = targets.every((t) => t.status === PostStatus.PUBLISHED);

  await prisma.socialPost.update({
    where: { id: post.id },
    data: { status: allPublished ? PostStatus.PUBLISHED : PostStatus.FAILED },
  });

  return results;
}

/// Called by the cron route — picks up anything whose scheduled time has passed.
export async function publishDuePosts(now = new Date()) {
  const due = await prisma.socialPost.findMany({
    where: { status: PostStatus.SCHEDULED, scheduledAt: { lte: now } },
    select: { id: true },
    take: 20,
  });

  const outcomes: { postId: string; results: TargetResult[] }[] = [];
  for (const post of due) {
    try {
      outcomes.push({ postId: post.id, results: await publishPost(post.id) });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      await prisma.socialPost.update({
        where: { id: post.id },
        data: { status: PostStatus.FAILED },
      });
      outcomes.push({ postId: post.id, results: [], ...{ error: message } });
    }
  }
  return outcomes;
}
