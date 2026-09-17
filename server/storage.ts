/**
 * Cloudflare R2 storage helpers (S3-compatible).
 *
 * storagePut  — upload a file to R2, returns a stable proxy URL (/manus-storage/<key>)
 * storageGet  — generate a short-lived presigned GET URL for a key
 *
 * Required env vars:
 *   R2_ACCOUNT_ID        e.g. ed6d8b58a7aaf38a975900a2138329ed
 *   R2_ACCESS_KEY_ID     R2 API token access key
 *   R2_SECRET_ACCESS_KEY R2 API token secret
 *   R2_BUCKET_NAME       e.g. estimation-app
 *
 * Optional:
 *   R2_PUBLIC_URL        If the bucket has a public domain/r2.dev URL, set it here.
 *                        When set, storagePut returns that stable public URL instead
 *                        of the /manus-storage/ proxy URL.
 *                        e.g. https://pub-xxxx.r2.dev  or  https://files.yourdomain.com
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { ENV } from "./_core/env";

// ---------------------------------------------------------------------------
// R2 client (lazy-initialised so missing env vars only blow up on first use)
// ---------------------------------------------------------------------------

let _client: S3Client | null = null;

function getR2Client(): S3Client {
  if (_client) return _client;

  const { r2AccountId, r2AccessKeyId, r2SecretAccessKey } = ENV;

  if (!r2AccountId || !r2AccessKeyId || !r2SecretAccessKey) {
    throw new Error(
      "R2 credentials missing: set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY"
    );
  }

  _client = new S3Client({
    region: "auto",
    endpoint: `https://${r2AccountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: r2AccessKeyId,
      secretAccessKey: r2SecretAccessKey,
    },
  });

  return _client;
}

function getBucket(): string {
  const bucket = ENV.r2BucketName;
  if (!bucket) throw new Error("R2_BUCKET_NAME env var is not set");
  return bucket;
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Upload a file to R2.
 *
 * Returns { key, url } where `url` is either:
 *  - A stable public URL (if R2_PUBLIC_URL is configured), or
 *  - A /manus-storage/<key> proxy URL that the Express server will redirect
 *    to a fresh presigned R2 URL on every request.
 */
export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  const client = getR2Client();
  const bucket = getBucket();
  const key = normalizeKey(relKey);

  const body = typeof data === "string" ? Buffer.from(data, "utf-8") : data;

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );

  // If a public domain is configured, return a stable public URL.
  // Otherwise fall back to our server-side proxy path (never expires).
  const publicBase = ENV.r2PublicUrl?.replace(/\/+$/, "");
  const url = publicBase ? `${publicBase}/${key}` : `/manus-storage/${key}`;

  return { key, url };
}

/**
 * Get a short-lived (1 hour) presigned URL for a stored key.
 * Useful when you need a direct, non-proxied link (e.g. email attachments).
 */
export async function storageGet(
  relKey: string
): Promise<{ key: string; url: string }> {
  const client = getR2Client();
  const bucket = getBucket();
  const key = normalizeKey(relKey);

  const url = await getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: bucket, Key: key }),
    { expiresIn: 3600 } // 1 hour
  );

  return { key, url };
}
