import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types";

type Client = SupabaseClient<Database>;

/** Product, store, category and promotion files live on Hostinger, served
 *  through ImageKit. Uploads go through the upload script there, which checks
 *  the uploader's KMO login with Supabase (public.can_write_media). */
export const MEDIA_BASE = "https://media.karachimartonline.com";
const UPLOAD_URL = `${MEDIA_BASE}/upload.php`;

export type MediaBucket = "product-media" | "vendor-media" | "category-media" | "promotion-media";

async function callMedia(supabase: Client, form: FormData): Promise<{ url?: string }> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Please sign in again.");
  let res: Response;
  try {
    res = await fetch(UPLOAD_URL, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form });
  } catch {
    throw new Error("Couldn't reach the file server. Check your internet and try again.");
  }
  const body = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
  if (!res.ok) throw new Error(body.error ?? "Upload failed. Please try again.");
  return body;
}

/** Saves a file at bucket/path (replacing any file already there) and returns its public URL. */
export async function uploadMedia(supabase: Client, bucket: MediaBucket, path: string, file: File): Promise<string> {
  const form = new FormData();
  form.append("action", "upload");
  form.append("bucket", bucket);
  form.append("path", path);
  form.append("file", file);
  const { url } = await callMedia(supabase, form);
  if (!url) throw new Error("Upload failed. Please try again.");
  return url;
}

/** Deletes a file by its public URL. Files still on Supabase Storage are left alone. */
export async function removeMedia(supabase: Client, url: string): Promise<void> {
  const prefix = `${MEDIA_BASE}/`;
  if (!url.startsWith(prefix)) return;
  const rest = url.slice(prefix.length).split("?")[0];
  const slash = rest.indexOf("/");
  if (slash === -1) return;
  const form = new FormData();
  form.append("action", "delete");
  form.append("bucket", rest.slice(0, slash));
  form.append("path", rest.slice(slash + 1));
  await callMedia(supabase, form);
}

/** A safe file extension from an uploaded file's name. */
export function fileExt(file: File, fallback = "jpg"): string {
  const ext = (file.name.split(".").pop() ?? "").toLowerCase();
  return /^[a-z0-9]{2,5}$/.test(ext) ? ext : fallback;
}
