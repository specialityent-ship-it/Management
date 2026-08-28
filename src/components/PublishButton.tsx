"use client";

import { useState, useTransition } from "react";
import { Send, Trash2 } from "lucide-react";
import { publishNow, deletePost } from "@/app/admin/social/actions";

export function PublishButton({ postId, status }: { postId: string; status: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const label = status === "FAILED" ? "Retry publish" : "Publish now";

  return (
    <div className="flex shrink-0 flex-col items-end gap-2">
      {status !== "PUBLISHED" && (
        <button
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              setError(null);
              const form = new FormData();
              form.set("id", postId);
              try {
                await publishNow(form);
              } catch (err) {
                setError(err instanceof Error ? err.message : "Publishing failed.");
              }
            })
          }
          className="btn-primary text-xs"
        >
          <Send className="h-3.5 w-3.5" /> {pending ? "Publishing…" : label}
        </button>
      )}

      <button
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const form = new FormData();
            form.set("id", postId);
            try {
              await deletePost(form);
            } catch (err) {
              setError(err instanceof Error ? err.message : "Could not delete.");
            }
          })
        }
        className="btn-ghost px-2 py-1.5 text-xs"
        title="Delete post"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>

      {error && <p className="max-w-[14rem] text-right text-xs text-red-600">{error}</p>}
    </div>
  );
}
