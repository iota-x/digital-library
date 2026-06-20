import crypto from "crypto";
import { serverEnv, publicEnv } from "@/lib/env";

/**
 * Server-side Cloudinary upload via signed REST (no SDK — keeps the dependency
 * set small, mirroring lib/validate.ts's rationale).
 *
 * Cloudinary's upload endpoint accepts the `file` field as a remote URL, a raw
 * base64 string, OR a full `data:` URI — so legacy base64 photos can be handed
 * straight through without decoding them here.
 *
 * Used by the bulk photo migration to move pre-Cloudinary `data:` URL photos
 * out of Mongo and onto the CDN.
 */
export async function uploadToCloudinaryServer(
  file: string,
  opts: { folder: string; resourceType?: "image" | "video" | "raw" },
): Promise<string> {
  const apiKey    = serverEnv.CLOUDINARY_API_KEY;
  const apiSecret = serverEnv.CLOUDINARY_API_SECRET;
  const cloudName = publicEnv.CLOUDINARY_CLOUD_NAME;
  if (!cloudName) throw new Error("Cloudinary not configured (NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME)");

  const resourceType = opts.resourceType ?? "image";
  const timestamp = Math.floor(Date.now() / 1000);

  // Params signed in alphabetical order (per Cloudinary docs).
  const params: Record<string, string | number> = { folder: opts.folder, timestamp };
  const toSign = Object.keys(params).sort().map(k => `${k}=${params[k]}`).join("&");
  const signature = crypto.createHash("sha1").update(toSign + apiSecret).digest("hex");

  const fd = new FormData();
  fd.append("file", file);
  fd.append("api_key", apiKey);
  fd.append("timestamp", String(timestamp));
  fd.append("signature", signature);
  fd.append("folder", opts.folder);

  const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;
  const res = await fetch(endpoint, { method: "POST", body: fd });
  const data = await res.json().catch(() => ({})) as { secure_url?: string; error?: { message?: string } };
  if (!res.ok || !data.secure_url) {
    throw new Error(data?.error?.message ?? `Cloudinary upload failed (${res.status})`);
  }
  return data.secure_url;
}

/** A stored photo value that's already a hosted URL (vs. a legacy `data:` blob). */
export function isHostedUrl(s: string): boolean {
  return /^https?:\/\//i.test(s);
}

/** Pick the Cloudinary resource type from a `data:` URI's MIME prefix. */
export function resourceTypeFromDataUrl(dataUrl: string): "image" | "video" {
  return /^data:video\//i.test(dataUrl) ? "video" : "image";
}
