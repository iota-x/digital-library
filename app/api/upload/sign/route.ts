import { NextResponse } from "next/server";
import crypto from "crypto";
import { withAuth } from "@/lib/apiHandler";
import { rateLimit, tooManyRequests } from "@/lib/rateLimit";
import { serverEnv, publicEnv } from "@/lib/env";

/**
 * Issues a short-lived Cloudinary signature so authenticated couples can upload.
 *
 * Body: { folder?: string, resourceType?: "image"|"video"|"raw" }
 * Returns: { timestamp, signature, apiKey, cloudName, folder, resourceType, eager?, uploadPreset? }
 *
 * The signed upload presets can enforce server-side rules:
 *   - max_file_size  (configure in Cloudinary console)
 *   - allowed_formats
 *   - moderation
 */
export const POST = withAuth(async (req, session) => {
  const rl = rateLimit(req, { scope: "upload:sign", max: 60, windowMs: 60 * 60_000, identifier: session.userId });
  if (!rl.ok) return tooManyRequests(rl.retryAfter, "Upload rate limit exceeded.");

  const apiKey    = serverEnv.CLOUDINARY_API_KEY;
  const apiSecret = serverEnv.CLOUDINARY_API_SECRET;
  const cloudName = publicEnv.CLOUDINARY_CLOUD_NAME;
  if (!cloudName) {
    return NextResponse.json({ error: "Upload not configured" }, { status: 500 });
  }

  const { folder = "us", resourceType = "image" } = (await req.json().catch(() => ({}))) as {
    folder?: string;
    resourceType?: "image" | "video" | "raw";
  };
  if (!["image", "video", "raw"].includes(resourceType)) {
    return NextResponse.json({ error: "Invalid resource type" }, { status: 400 });
  }

  // Scope every upload to the couple's folder so uploads can't escape their tenant
  const scopedFolder = `${folder}/${session.coupleId}`;
  const timestamp = Math.floor(Date.now() / 1000);

  // Params signed in alphabetical order (per Cloudinary docs)
  const params: Record<string, string | number> = { folder: scopedFolder, timestamp };
  const toSign = Object.keys(params).sort().map(k => `${k}=${params[k]}`).join("&");
  const signature = crypto.createHash("sha1").update(toSign + apiSecret).digest("hex");

  return NextResponse.json({
    ok: true,
    cloudName,
    apiKey,
    timestamp,
    signature,
    folder: scopedFolder,
    resourceType,
  });
});
