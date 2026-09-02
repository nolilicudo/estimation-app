/**
 * PdfPhotoPreview — Shows a simulated PDF "Site Photos" page so the user can
 * see exactly how the embedded photos will look before sending the estimate.
 *
 * Mirrors the layout in contract-pdf.ts:
 *   - Letter page (8.5 × 11 in) at 96 dpi = 816 × 1056 px
 *   - 72pt margins (96px) on each side
 *   - 2-column grid, 4:3 aspect ratio per photo
 *   - Category badge top-left, caption below
 */
import { useEffect, useRef } from "react";
import { X, FileText, Download } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PreviewPhoto {
  id: number;
  url: string;
  caption: string;
  category: string;
}

interface PdfPhotoPreviewProps {
  photos: PreviewPhoto[];
  customerName?: string;
  collectionName?: string;
  onClose: () => void;
}

// ─── Constants mirroring contract-pdf.ts ─────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  "site":          "Site Overview",
  "materials":     "Materials",
  "existing-deck": "Existing Deck",
  "damage":        "Damage / Issues",
  "other":         "Other",
};

// Letter page at 96 dpi
const PAGE_W = 816;
const PAGE_H = 1056;
const MARGIN = 96;          // 72pt × (96/72) = 96px
const COL_GAP = 20;
const CAPTION_H = 28;       // height reserved below each photo for caption
const ROW_GAP = 12;
const HEADER_H = 80;        // title + subtitle + rule

const CONTENT_W = PAGE_W - MARGIN * 2;
const PHOTO_W = (CONTENT_W - COL_GAP) / 2;
const PHOTO_H = PHOTO_W * 0.75;   // 4:3
const ROW_H = PHOTO_H + CAPTION_H + ROW_GAP;
const USABLE_H = PAGE_H - MARGIN * 2 - HEADER_H;
const PHOTOS_PER_PAGE = Math.floor(USABLE_H / ROW_H) * 2;

// ─── Component ────────────────────────────────────────────────────────────────

export function PdfPhotoPreview({ photos, customerName, collectionName, onClose }: PdfPhotoPreviewProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Split photos into pages
  const pages: PreviewPhoto[][] = [];
  for (let i = 0; i < photos.length; i += PHOTOS_PER_PAGE) {
    pages.push(photos.slice(i, i + PHOTOS_PER_PAGE));
  }
  if (pages.length === 0) pages.push([]);

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 bg-black/80 flex flex-col"
      onClick={e => { if (e.target === overlayRef.current) onClose(); }}
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 bg-charcoal/95 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2 text-white">
          <FileText className="w-5 h-5 text-canyon" />
          <span className="font-semibold text-sm">PDF Photo Preview</span>
          <span className="text-white/50 text-xs">
            — {photos.length} photo{photos.length !== 1 ? "s" : ""} across {pages.length} page{pages.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-white/40 text-xs hidden sm:block">
            This preview mirrors the exact PDF layout. Photos appear after the contract pages.
          </span>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Scrollable page area */}
      <div className="flex-1 overflow-y-auto py-8 px-4 flex flex-col items-center gap-8">
        {pages.map((pagePhotos, pageIdx) => (
          <PdfPage
            key={pageIdx}
            photos={pagePhotos}
            pageNumber={pageIdx + 1}
            totalPages={pages.length}
            isFirstPage={pageIdx === 0}
            totalPhotoCount={photos.length}
            customerName={customerName}
            collectionName={collectionName}
          />
        ))}

        {/* Empty state */}
        {photos.length === 0 && (
          <div className="bg-white rounded-lg shadow-2xl p-12 text-center max-w-md">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-30" />
            <p className="text-charcoal font-semibold mb-1">No photos to preview</p>
            <p className="text-muted-foreground text-sm">
              Take or upload site photos in the Site Photos section above, then preview how they'll appear in the PDF.
            </p>
          </div>
        )}

        <p className="text-white/30 text-xs text-center pb-4">
          Actual PDF rendered by PDFKit · fonts and exact spacing may vary slightly
        </p>
      </div>
    </div>
  );
}

// ─── Single PDF Page ──────────────────────────────────────────────────────────

function PdfPage({
  photos,
  pageNumber,
  totalPages,
  isFirstPage,
  totalPhotoCount,
  customerName,
  collectionName,
}: {
  photos: PreviewPhoto[];
  pageNumber: number;
  totalPages: number;
  isFirstPage: boolean;
  totalPhotoCount: number;
  customerName?: string;
  collectionName?: string;
}) {
  // Scale the 816px page to fit the viewport width (max 816px)
  const scale = Math.min(1, (window.innerWidth - 48) / PAGE_W);

  // Build 2-column rows
  const rows: PreviewPhoto[][] = [];
  for (let i = 0; i < photos.length; i += 2) {
    rows.push(photos.slice(i, i + 2));
  }

  return (
    <div
      className="bg-white shadow-2xl rounded-sm relative"
      style={{
        width: PAGE_W * scale,
        minHeight: PAGE_H * scale,
        padding: MARGIN * scale,
        boxSizing: "border-box",
      }}
    >
      {/* Page number */}
      <div
        className="absolute text-gray-400"
        style={{ bottom: 24 * scale, right: MARGIN * scale, fontSize: 9 * scale }}
      >
        Page {pageNumber} of {totalPages}
      </div>

      {/* Header (first page only) */}
      {isFirstPage && (
        <div style={{ marginBottom: 20 * scale }}>
          <h2
            className="text-center font-bold"
            style={{ color: "#8B4513", fontSize: 18 * scale, marginBottom: 4 * scale }}
          >
            Site Photos
          </h2>
          <p
            className="text-center"
            style={{ color: "#666", fontSize: 10 * scale, marginBottom: 10 * scale }}
          >
            {totalPhotoCount} photo{totalPhotoCount !== 1 ? "s" : ""} captured during estimate appointment
            {customerName ? ` · ${customerName}` : ""}
            {collectionName ? ` · ${collectionName}` : ""}
          </p>
          {/* Divider rule */}
          <div style={{ height: 1, background: "#8B4513", opacity: 0.4, marginBottom: 16 * scale }} />
        </div>
      )}

      {/* Photo grid */}
      <div style={{ display: "flex", flexDirection: "column", gap: ROW_GAP * scale }}>
        {rows.map((row, rowIdx) => (
          <div key={rowIdx} style={{ display: "flex", gap: COL_GAP * scale }}>
            {row.map(photo => (
              <PhotoCell key={photo.id} photo={photo} scale={scale} />
            ))}
            {/* Empty placeholder if odd number in last row */}
            {row.length === 1 && (
              <div style={{ flex: 1 }} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Single Photo Cell ────────────────────────────────────────────────────────

function PhotoCell({ photo, scale }: { photo: PreviewPhoto; scale: number }) {
  const catLabel = CATEGORY_LABELS[photo.category] ?? photo.category;

  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      {/* Photo container */}
      <div
        style={{
          position: "relative",
          width: "100%",
          paddingBottom: "75%", // 4:3
          border: "1px solid #e5e2dc",
          borderRadius: 3,
          overflow: "hidden",
          background: "#f5f5f0",
        }}
      >
        <img
          src={photo.url}
          alt={photo.caption || "Site photo"}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
          }}
          loading="lazy"
        />
        {/* Category badge — mirrors PDF overlay */}
        <div
          style={{
            position: "absolute",
            top: 4 * scale,
            left: 4 * scale,
            background: "rgba(255,255,255,0.92)",
            color: "#8B4513",
            fontSize: Math.max(8, 8 * scale),
            fontWeight: 700,
            padding: `${2 * scale}px ${5 * scale}px`,
            borderRadius: 2,
            lineHeight: 1.3,
          }}
        >
          {catLabel}
        </div>
      </div>

      {/* Caption */}
      <p
        style={{
          fontSize: Math.max(8, 9 * scale),
          color: photo.caption ? "#1a1a1a" : "#999",
          fontStyle: photo.caption ? "normal" : "italic",
          marginTop: 4 * scale,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          lineHeight: 1.4,
        }}
      >
        {photo.caption || "No caption"}
      </p>
    </div>
  );
}
