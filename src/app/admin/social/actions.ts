"use server";

import { revalidatePath } from "next/cache";
import { PostStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { socialPostSchema } from "@/lib/validation";
import { publishPost } from "@/lib/social/publish";

export async function createPost(formData: FormData) {
  const session = await requireSession();

  const scheduledAtRaw = String(formData.get("scheduledAt") ?? "").trim();
  const input = socialPostSchema.parse({
    title: formData.get("title"),
    caption: formData.get("caption"),
    hashtags: formData.get("hashtags") || "",
    mediaUrl: formData.get("mediaUrl") || "",
    mediaKind: formData.get("mediaKind") || "IMAGE",
    platforms: formData.getAll("platforms"),
    scheduledAt: scheduledAtRaw ? new Date(scheduledAtRaw).toISOString() : "",
  });

  const scheduledAt = input.scheduledAt ? new Date(input.scheduledAt) : null;

  const post = await prisma.socialPost.create({
    data: {
      title: input.title,
      caption: input.caption,
      hashtags: input.hashtags || null,
      mediaUrl: input.mediaUrl || null,
      mediaKind: input.mediaKind,
      authorId: session.userId,
      status: scheduledAt ? PostStatus.SCHEDULED : PostStatus.DRAFT,
      scheduledAt,
      targets: {
        create: input.platforms.map((platform) => ({
          platform,
          status: scheduledAt ? PostStatus.SCHEDULED : PostStatus.DRAFT,
        })),
      },
    },
  });

  revalidatePath("/admin/social");
  return post.id;
}

/// The one-click action: fans the post out to every selected platform now.
export async function publishNow(formData: FormData) {
  await requireSession();
  const id = String(formData.get("id"));
  await publishPost(id);
  revalidatePath("/admin/social");
}

export async function deletePost(formData: FormData) {
  await requireSession(["ADMIN", "MARKETING"]);
  const id = String(formData.get("id"));
  await prisma.socialPost.delete({ where: { id } });
  revalidatePath("/admin/social");
}
