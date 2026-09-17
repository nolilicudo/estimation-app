import type { Express } from "express";
import { ENV } from "./env";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

let _proxyClient: S3Client | null = null;

function getR2Client(): S3Client | null {
  if (_proxyClient) return _proxyClient;
  const { r2AccountId, r2AccessKeyId, r2SecretAccessKey } = ENV;
  if (!r2AccountId || !r2AccessKeyId || !r2SecretAccessKey) return null;

  _proxyClient = new S3Client({
    region: "auto",
    endpoint: `https://${r2AccountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: r2AccessKeyId,
      secretAccessKey: r2SecretAccessKey,
    },
  });
  return _proxyClient;
}

/**
 * Storage proxy — serves files stored in Cloudflare R2.
 *
 * GET /manus-storage/<key>
 *   → generates a fresh 1-hour presigned R2 URL and 307-redirects the client.
 *
 * If R2_PUBLIC_URL is set the client accesses files directly via that domain
 * and this proxy is only used as a fallback / for legacy /manus-storage paths.
 */
export function registerStorageProxy(app: Express) {
  app.get("/manus-storage/*", async (req, res) => {
    const key = (req.params as unknown as Record<string, string>)[0];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }

    const client = getR2Client();
    if (!client) {
      res.status(500).send("R2 storage proxy not configured — set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY");
      return;
    }

    const bucket = ENV.r2BucketName;
    if (!bucket) {
      res.status(500).send("R2_BUCKET_NAME env var is not set");
      return;
    }

    try {
      const url = await getSignedUrl(
        client,
        new GetObjectCommand({ Bucket: bucket, Key: key }),
        { expiresIn: 3600 } // 1 hour
      );
      res.set("Cache-Control", "no-store");
      res.redirect(307, url);
    } catch (err) {
      console.error("[StorageProxy] R2 presign failed:", err);
      res.status(502).send("Storage proxy error");
    }
  });
}
