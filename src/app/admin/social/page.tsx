import { Instagram, Youtube, ExternalLink, AlertTriangle } from "lucide-react";
import { prisma } from "@/lib/db";
import { integrations } from "@/lib/config";
import { formatDateTime } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";
import { NewPostForm } from "@/components/NewPostForm";
import { PublishButton } from "@/components/PublishButton";

export const dynamic = "force-dynamic";
export const metadata = { title: "Social" };

export default async function SocialPage() {
  const posts = await prisma.socialPost.findMany({
    orderBy: { createdAt: "desc" },
    take: 60,
    include: { targets: true, author: { select: { name: true } } },
  });

  const connections = [
    { platform: "Instagram", icon: Instagram, connected: integrations.instagram },
    { platform: "YouTube", icon: Youtube, connected: integrations.youtube },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink-900">Social publishing</h1>
        <p className="mt-1 text-sm text-ink-600">
          Write once, publish to Instagram and YouTube in a single click.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {connections.map(({ platform, icon: Icon, connected }) => (
          <div key={platform} className="card flex items-center gap-4 p-5">
            <Icon className={`h-6 w-6 ${connected ? "text-brand-600" : "text-ink-300"}`} />
            <div className="flex-1">
              <p className="text-sm font-semibold text-ink-900">{platform}</p>
              <p className="text-xs text-ink-500">
                {connected ? "Connected — ready to publish" : "Not connected"}
              </p>
            </div>
            {connected ? (
              <span className="badge bg-emerald-50 text-emerald-800 ring-emerald-200">Live</span>
            ) : (
              <span className="badge bg-ink-100 text-ink-600 ring-ink-200">Setup needed</span>
            )}
          </div>
        ))}
      </div>

      {(!integrations.instagram || !integrations.youtube) && (
        <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">Finish connecting your accounts to publish.</p>
            <p className="mt-1">
              Instagram needs a Business or Creator account linked to a Facebook Page, plus a
              long-lived token in <code>INSTAGRAM_ACCESS_TOKEN</code>. YouTube needs an OAuth client
              and a refresh token — visit{" "}
              <a href="/api/social/youtube/connect" className="font-semibold underline">
                /api/social/youtube/connect
              </a>{" "}
              once the client credentials are set. Full steps are in the README.
            </p>
          </div>
        </div>
      )}

      <NewPostForm />

      <section className="card overflow-hidden">
        <div className="border-b border-ink-200 px-5 py-3.5">
          <h2 className="text-sm font-bold text-ink-900">Posts</h2>
        </div>

        {posts.length === 0 ? (
          <p className="px-5 py-14 text-center text-sm text-ink-500">
            No posts yet. Create one above.
          </p>
        ) : (
          <ul className="divide-y divide-ink-100">
            {posts.map((post) => (
              <li key={post.id} className="flex flex-wrap items-start gap-4 px-5 py-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-ink-900">{post.title}</p>
                    <StatusBadge status={post.status} />
                    <span className="badge bg-ink-100 text-ink-600 ring-ink-200">
                      {post.mediaKind}
                    </span>
                  </div>

                  <p className="mt-1.5 line-clamp-2 text-sm text-ink-600">{post.caption}</p>
                  {post.hashtags && <p className="mt-1 text-xs text-brand-700">{post.hashtags}</p>}

                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-ink-500">
                    {post.scheduledAt && <span>Scheduled {formatDateTime(post.scheduledAt)}</span>}
                    {post.author && <span>by {post.author.name}</span>}
                  </div>

                  <ul className="mt-2.5 flex flex-wrap gap-2">
                    {post.targets.map((target) => (
                      <li key={target.id} className="flex items-center gap-1.5 text-xs">
                        {target.platform === "INSTAGRAM" ? (
                          <Instagram className="h-3.5 w-3.5 text-ink-400" />
                        ) : (
                          <Youtube className="h-3.5 w-3.5 text-ink-400" />
                        )}
                        <StatusBadge status={target.status} />
                        {target.externalUrl && (
                          <a
                            href={target.externalUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-0.5 text-brand-700 hover:underline"
                          >
                            View <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                        {target.error && (
                          <span className="max-w-xs text-red-600" title={target.error}>
                            {target.error.slice(0, 80)}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>

                <PublishButton postId={post.id} status={post.status} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
