"use client";

import { useState } from "react";
import { Plus, X, Instagram, Youtube } from "lucide-react";
import { createPost } from "@/app/admin/social/actions";

export function NewPostForm() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-primary">
        <Plus className="h-4 w-4" /> New post
      </button>
    );
  }

  return (
    <form
      action={async (formData) => {
        setError(null);
        try {
          await createPost(formData);
          setOpen(false);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Could not save the post.");
        }
      }}
      className="card space-y-4 p-5"
    >
      <div className="flex items-center justify-between">
        <p className="font-semibold text-ink-900">New post</p>
        <button type="button" onClick={() => setOpen(false)} className="btn-ghost px-2 py-1">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div>
        <label className="label" htmlFor="title">
          Title
        </label>
        <input
          id="title"
          name="title"
          required
          maxLength={120}
          className="input"
          placeholder="Used as the YouTube video title"
        />
      </div>

      <div>
        <label className="label" htmlFor="caption">
          Caption
        </label>
        <textarea
          id="caption"
          name="caption"
          required
          rows={5}
          maxLength={2200}
          className="input"
          placeholder="The Instagram caption and YouTube description."
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="hashtags">
            Hashtags
          </label>
          <input
            id="hashtags"
            name="hashtags"
            className="input"
            placeholder="#health #surgery #recovery"
          />
        </div>
        <div>
          <label className="label" htmlFor="mediaKind">
            Media type
          </label>
          <select id="mediaKind" name="mediaKind" className="input" defaultValue="IMAGE">
            <option value="IMAGE">Image (Instagram only)</option>
            <option value="REEL">Reel</option>
            <option value="VIDEO">Video</option>
            <option value="SHORT">Short</option>
          </select>
        </div>
      </div>

      <div>
        <label className="label" htmlFor="mediaUrl">
          Media URL
        </label>
        <input
          id="mediaUrl"
          name="mediaUrl"
          type="url"
          className="input"
          placeholder="https://… a publicly reachable image or video"
        />
        <p className="mt-1.5 text-xs text-ink-500">
          Both platforms fetch the file from this URL, so it must be public — a CDN, S3 or Drive
          direct link. Instagram cannot post a plain image to YouTube; pick a video type for
          YouTube.
        </p>
      </div>

      <fieldset>
        <legend className="label">Publish to</legend>
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-sm text-ink-800">
            <input
              type="checkbox"
              name="platforms"
              value="INSTAGRAM"
              defaultChecked
              className="h-4 w-4 rounded border-ink-300 text-brand-600"
            />
            <Instagram className="h-4 w-4" /> Instagram
          </label>
          <label className="flex items-center gap-2 text-sm text-ink-800">
            <input
              type="checkbox"
              name="platforms"
              value="YOUTUBE"
              className="h-4 w-4 rounded border-ink-300 text-brand-600"
            />
            <Youtube className="h-4 w-4" /> YouTube
          </label>
        </div>
      </fieldset>

      <div>
        <label className="label" htmlFor="scheduledAt">
          Schedule for later (optional)
        </label>
        <input id="scheduledAt" name="scheduledAt" type="datetime-local" className="input" />
        <p className="mt-1.5 text-xs text-ink-500">
          Leave empty to save as a draft you publish manually.
        </p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button type="submit" className="btn-primary">
        Save post
      </button>
    </form>
  );
}
