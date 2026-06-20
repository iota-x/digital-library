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

/**
 * Downscale + recompress a large image in the browser before upload.
 *
 * This is essential on iOS/iPadOS: a straight-from-the-camera HEIC/JPEG is
 * often 4-12 MB, and holding several of those (plus their FormData copies) in
 * memory makes mobile Safari reload the whole WebView mid-upload — which looked
 * like "the page just closes and nothing saves". Shrinking each photo first
 * keeps memory tiny, gets every file safely under the size cap, and uploads
 * fast enough to finish before anything is interrupted.
 *
 * Also draws with `imageOrientation: "from-image"` so EXIF-rotated phone photos
 * arrive upright instead of sideways ("it uploaded the wrong photo").
 *
 * Returns the original file unchanged on any failure or for formats we must not
 * rasterise (video, animated GIF, SVG) — never throws.
 */
export async function downscaleImage(file: File, maxEdge = 2200, quality = 0.82): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  // Leave these untouched: GIFs would lose animation, SVGs are vector, and PNGs
  // (e.g. doodles) usually carry transparency that JPEG can't preserve.
  if (file.type === "image/gif" || file.type === "image/svg+xml" || file.type === "image/png") return file;
  if (typeof document === "undefined" || typeof createImageBitmap !== "function") return file;

  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" } as ImageBitmapOptions);
    const { width, height } = bitmap;
    const scale = Math.min(1, maxEdge / Math.max(width, height));

    // Already small in both dimensions and bytes — nothing worth doing.
    if (scale === 1 && file.size < 1_200_000) return file;

    const w = Math.max(1, Math.round(width * scale));
    const h = Math.max(1, Math.round(height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);

    const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, "image/jpeg", quality));
    // Release the canvas backing store promptly (matters on memory-tight iOS).
    canvas.width = 0;
    canvas.height = 0;

    // If recompression didn't actually help, keep the original.
    if (!blob || blob.size >= file.size) return file;

    const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], name, { type: "image/jpeg", lastModified: Date.now() });
  } catch {
    return file;
  } finally {
    bitmap?.close?.();
  }
}

export async function uploadToCloudinary(file: File, opts: Options = {}): Promise<string> {
  const resourceType = opts.resourceType ?? (file.type.startsWith("video/") ? "video" : "image");
  const folder = opts.folder ?? "us";
  const maxSize = opts.maxSize ?? DEFAULT_LIMITS[resourceType];

  // Shrink images *before* the size check, so a big iPhone photo that would
  // otherwise be rejected (and would strain mobile Safari) sails through.
  if (resourceType === "image") {
    file = await downscaleImage(file);
  }

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
