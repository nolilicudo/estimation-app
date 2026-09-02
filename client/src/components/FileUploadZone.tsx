/**
 * FileUploadZone — reusable file upload component for admin panels.
 * Accepts images (jpg, png, webp, gif) and PDFs.
 * Converts to base64 and calls the provided onUpload callback.
 * Shows a thumbnail for images and a PDF icon for PDFs.
 * Shows a full-screen preview modal on click.
 */
import { useRef, useState } from "react";
import { Upload, X, Eye, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FileUploadZoneProps {
  /** Current file URL (S3 or any URL) */
  currentUrl?: string | null;
  /** Called with base64 string and mimeType when a file is selected */
  onUpload: (fileBase64: string, mimeType: string) => Promise<void>;
  /** Called when the remove button is clicked */
  onRemove?: () => void;
  /** Max file size in bytes. Default 10 MB */
  maxBytes?: number;
  /** Extra class names for the outer wrapper */
  className?: string;
  /** Label shown in the empty state */
  label?: string;
}

const ACCEPTED = "image/jpeg,image/png,image/webp,image/gif,application/pdf";
const DEFAULT_MAX = 10 * 1024 * 1024; // 10 MB

function isPdf(url: string) {
  return url.toLowerCase().includes(".pdf") || url.toLowerCase().includes("application/pdf");
}

export function FileUploadZone({
  currentUrl,
  onUpload,
  onRemove,
  maxBytes = DEFAULT_MAX,
  className = "",
  label = "Upload image or PDF",
}: FileUploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  async function handleFile(file: File) {
    setError(null);
    if (file.size > maxBytes) {
      setError(`File too large (max ${Math.round(maxBytes / 1024 / 1024)} MB)`);
      return;
    }
    if (!ACCEPTED.split(",").includes(file.type)) {
      setError("Unsupported file type. Use JPG, PNG, WebP, GIF, or PDF.");
      return;
    }
    setUploading(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // Strip the data URL prefix to get raw base64
          resolve(result.split(",")[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      await onUpload(base64, file.type);
    } catch (e: any) {
      setError(e?.message ?? "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  const hasPdf = currentUrl && isPdf(currentUrl);
  const hasImage = currentUrl && !hasPdf;

  return (
    <>
      <div className={`relative ${className}`}>
        {/* Hidden file input */}
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED}
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />

        {currentUrl ? (
          /* ── Has file: show thumbnail / PDF icon ── */
          <div className="relative group w-full h-28 rounded-lg overflow-hidden border border-border/60 bg-muted/30">
            {hasImage ? (
              <img
                src={currentUrl}
                alt="Uploaded preview"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-1 text-muted-foreground">
                <FileText className="w-8 h-8 text-canyon" />
                <span className="text-[10px] font-medium">PDF</span>
              </div>
            )}

            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2 text-[10px] bg-white/90 hover:bg-white text-charcoal border-0"
                onClick={() => setPreviewOpen(true)}
              >
                <Eye className="w-3 h-3 mr-1" /> View
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2 text-[10px] bg-white/90 hover:bg-white text-charcoal border-0"
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3 mr-1" />}
                Replace
              </Button>
              {onRemove && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-[10px] bg-red-50 hover:bg-red-100 text-red-600 border-0"
                  onClick={onRemove}
                >
                  <X className="w-3 h-3 mr-1" /> Remove
                </Button>
              )}
            </div>
          </div>
        ) : (
          /* ── No file: show upload zone ── */
          <button
            type="button"
            className="w-full h-28 rounded-lg border-2 border-dashed border-border/60 hover:border-canyon/60 bg-muted/20 hover:bg-canyon/5 transition-colors flex flex-col items-center justify-center gap-2 text-muted-foreground cursor-pointer"
            onClick={() => inputRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={handleDrop}
            disabled={uploading}
          >
            {uploading ? (
              <Loader2 className="w-6 h-6 animate-spin text-canyon" />
            ) : (
              <>
                <Upload className="w-6 h-6" />
                <span className="text-xs font-medium">{label}</span>
                <span className="text-[10px]">JPG, PNG, WebP, GIF, PDF · max {Math.round(maxBytes / 1024 / 1024)} MB</span>
              </>
            )}
          </button>
        )}

        {error && <p className="text-[10px] text-red-500 mt-1">{error}</p>}
      </div>

      {/* Full-screen preview modal */}
      {previewOpen && currentUrl && (
        <div
          className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4"
          onClick={() => setPreviewOpen(false)}
        >
          <button
            className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors"
            onClick={() => setPreviewOpen(false)}
          >
            <X className="w-8 h-8" />
          </button>
          {hasPdf ? (
            <iframe
              src={currentUrl}
              className="w-full max-w-4xl h-[80vh] rounded-lg"
              title="PDF Preview"
              onClick={e => e.stopPropagation()}
            />
          ) : (
            <img
              src={currentUrl}
              alt="Full preview"
              className="max-w-full max-h-[90vh] rounded-lg shadow-2xl object-contain"
              onClick={e => e.stopPropagation()}
            />
          )}
        </div>
      )}
    </>
  );
}
