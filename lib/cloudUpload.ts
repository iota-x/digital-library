/**
 * Authenticated, signed Cloudinary upload.
 *
 * Falls back to the unsigned preset only if explicitly enabled via
 * `NEXT_PUBLIC_CLOUDINARY_UNSIGNED=true` — useful for local dev without
 * Cloudinary API credentials configured.
 *
 * Client-side guards:
 *   - hard cap on file size (10 MB image, 25 MB video) before upload
 *   - basic MIME prefix check
 * Server-side guards: enforced by Cloudinary upload preset settings.
 */

interface Options {
  resourceType?: "image" | "video" | "raw";
  folder?: string;
  /** Bytes. Default 10 MB image / 25 MB video. */
  maxSize?: number;
}

const DEFAULT_LIMITS = {
  image: 10 * 1024 * 1024,
  video: 25 * 1024 * 1024,
  raw:   10 * 1024 * 1024,
};

export class UploadError extends Error {}

export async function uploadToCloudinary(file: File, opts: Options = {}): Promise<string> {
  const resourceType = opts.resourceType ?? (file.type.startsWith("video/") ? "video" : "image");
  const folder = opts.folder ?? "us";
  const maxSize = opts.maxSize ?? DEFAULT_LIMITS[resourceType];

  if (file.size > maxSize) {
    throw new UploadError(`File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max ${(maxSize / 1024 / 1024)} MB.`);
  }
  if (resourceType === "image" && !file.type.startsWith("image/")) {
    throw new UploadError("That doesn't look like an image.");
  }
  if (resourceType === "video" && !file.type.startsWith("video/")) {
    throw new UploadError("That doesn't look like a video.");
  }

  // Fetch a signature from our server (this is where auth + rate-limit live)
  const signRes = await fetch("/api/upload/sign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ folder, resourceType }),
  });

  if (!signRes.ok) {
    const body = await signRes.json().catch(() => ({}));
    throw new UploadError(body?.error ?? `Upload signature failed (${signRes.status})`);
  }
  const sig = await signRes.json() as {
    cloudName: string; apiKey: string; timestamp: number; signature: string; folder: string;
  };

  const fd = new FormData();
  fd.append("file", file);
  fd.append("api_key",   sig.apiKey);
  fd.append("timestamp", String(sig.timestamp));
  fd.append("signature", sig.signature);
  fd.append("folder",    sig.folder);

  const endpoint = `https://api.cloudinary.com/v1_1/${sig.cloudName}/${resourceType}/upload`;
  const res = await fetch(endpoint, { method: "POST", body: fd });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new UploadError(body?.error?.message ?? `Upload failed (${res.status})`);
  }
  const data = await res.json() as { secure_url?: string };
  if (!data.secure_url) throw new UploadError("Cloudinary returned no URL");
  return data.secure_url;
}
