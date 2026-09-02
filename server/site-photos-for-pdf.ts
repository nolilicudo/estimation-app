/**
 * site-photos-for-pdf.ts
 *
 * Fetches site photos linked to a sign request from the DB and downloads
 * their image bytes from S3 so they can be embedded directly in the PDF.
 * Returns an array of { imageBuffer, caption, category } objects.
 */

export interface SitePhotoForPdf {
  imageBuffer: Buffer;
  caption: string;
  category: string;
}

/**
 * Fetch site photos for a given sign request ID.
 * Downloads each image from its S3 URL and returns the raw bytes.
 * Silently skips any photo that fails to download.
 */
export async function fetchSitePhotosForPdf(
  signRequestId: number,
  maxPhotos = 20
): Promise<SitePhotoForPdf[]> {
  try {
    const { estimateSitePhotos } = await import("../drizzle/schema");
    const { getDb } = await import("./db");
    const { eq, desc } = await import("drizzle-orm");

    const drizzleDb = await getDb();
    if (!drizzleDb) return [];

    const photos = await drizzleDb
      .select()
      .from(estimateSitePhotos)
      .where(eq(estimateSitePhotos.signRequestId, signRequestId))
      .orderBy(desc(estimateSitePhotos.createdAt))
      .limit(maxPhotos);

    if (!photos.length) return [];

    const results: SitePhotoForPdf[] = [];

    for (const photo of photos) {
      try {
        // Download image bytes from S3 URL
        const response = await fetch(photo.url, {
          signal: AbortSignal.timeout(10_000), // 10 second timeout per image
        });
        if (!response.ok) continue;
        const arrayBuffer = await response.arrayBuffer();
        const imageBuffer = Buffer.from(arrayBuffer);
        if (imageBuffer.length < 100) continue; // skip obviously empty responses
        results.push({
          imageBuffer,
          caption: photo.caption ?? "",
          category: photo.category ?? "site",
        });
      } catch {
        // Skip photos that fail to download — don't block PDF generation
      }
    }

    return results;
  } catch {
    return [];
  }
}
