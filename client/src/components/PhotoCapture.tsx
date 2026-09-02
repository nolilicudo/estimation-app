/**
 * PhotoCapture — Site photo capture and management for estimates.
 * Supports camera capture (mobile) and file upload (desktop/mobile).
 * Photos are uploaded to S3 via the estimatePhotos.upload tRPC procedure.
 */
import { useState, useRef, useCallback, useEffect } from "react";
import { Camera, Upload, X, Pencil, Check, Loader2, ImageIcon, Tag, Trash2, ZoomIn, PenLine } from "lucide-react";
import { FileText } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { PhotoAnnotator } from "@/components/PhotoAnnotator";
import { PdfPhotoPreview, type PreviewPhoto } from "@/components/PdfPhotoPreview";

// ─── Types ────────────────────────────────────────────────────────────────────

export type PhotoCategory = "site" | "materials" | "existing-deck" | "damage" | "other";

const CATEGORY_LABELS: Record<PhotoCategory, string> = {
  "site":          "Site Overview",
  "materials":     "Materials",
  "existing-deck": "Existing Deck",
  "damage":        "Damage / Issues",
  "other":         "Other",
};

const CATEGORY_COLORS: Record<PhotoCategory, string> = {
  "site":          "bg-blue-100 text-blue-700 border-blue-200",
  "materials":     "bg-green-100 text-green-700 border-green-200",
  "existing-deck": "bg-amber-100 text-amber-700 border-amber-200",
  "damage":        "bg-red-100 text-red-700 border-red-200",
  "other":         "bg-stone-100 text-stone-600 border-stone-200",
};

interface PhotoItem {
  id: number;
  url: string;
  s3Key: string;
  caption: string;
  category: PhotoCategory;
  createdAt: number;
}

// ─── Lightbox ─────────────────────────────────────────────────────────────────

function Lightbox({ url, caption, onClose }: { url: string; caption: string; onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
      >
        <X className="w-5 h-5" />
      </button>
      <div className="max-w-4xl max-h-[90vh] flex flex-col items-center gap-3" onClick={e => e.stopPropagation()}>
        <img
          src={url}
          alt={caption || "Site photo"}
          className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
        />
        {caption && (
          <p className="text-white/80 text-sm text-center max-w-lg">{caption}</p>
        )}
      </div>
    </div>
  );
}

// ─── Photo Card ───────────────────────────────────────────────────────────────

interface PhotoCardProps {
  photo: PhotoItem;
  sessionKey: string;
  onDelete: (id: number, s3Key: string) => void;
  onUpdate: (id: number, caption: string, category: PhotoCategory) => void;
  onZoom: (photo: PhotoItem) => void;
  onRefresh: () => void;
}

function PhotoCard({ photo, sessionKey, onDelete, onUpdate, onZoom, onRefresh }: PhotoCardProps) {
  const [editing, setEditing] = useState(false);
  const [caption, setCaption] = useState(photo.caption);
  const [category, setCategory] = useState<PhotoCategory>(photo.category as PhotoCategory);
  const [deleting, setDeleting] = useState(false);
  const [annotating, setAnnotating] = useState(false);

  const handleSave = () => {
    onUpdate(photo.id, caption, category);
    setEditing(false);
  };

  const handleDelete = async () => {
    if (!confirm("Remove this photo from the estimate?")) return;
    setDeleting(true);
    onDelete(photo.id, photo.s3Key);
  };

  return (
    <div className="group relative rounded-xl overflow-hidden border-2 border-border bg-white shadow-sm hover:shadow-md transition-shadow">
      {/* Photo */}
      <div className="relative aspect-[4/3] bg-stone-100 overflow-hidden cursor-pointer" onClick={() => onZoom(photo)}>
        <img
          src={photo.url}
          alt={photo.caption || "Site photo"}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center gap-3">
          <ZoomIn className="w-7 h-7 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow" />
          <button
            onClick={e => { e.stopPropagation(); setAnnotating(true); }}
            className="w-7 h-7 rounded-full bg-canyon/80 hover:bg-canyon flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
            title="Annotate"
          >
            <PenLine className="w-3.5 h-3.5" />
          </button>
        </div>
        {/* Category badge */}
        <div className={`absolute top-2 left-2 text-[10px] font-semibold px-1.5 py-0.5 rounded border ${CATEGORY_COLORS[photo.category as PhotoCategory] ?? CATEGORY_COLORS.other}`}>
          {CATEGORY_LABELS[photo.category as PhotoCategory] ?? photo.category}
        </div>
        {/* Delete button */}
        {!editing && (
          <button
            onClick={e => { e.stopPropagation(); handleDelete(); }}
            disabled={deleting}
            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-red-500/80 hover:bg-red-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>

      {/* Caption / edit area */}
      <div className="p-2">
        {editing ? (
          <div className="space-y-2">
            <input
              type="text"
              value={caption}
              onChange={e => setCaption(e.target.value)}
              placeholder="Add a caption..."
              className="w-full px-2 py-1 text-xs border border-border rounded focus:outline-none focus:ring-1 focus:ring-canyon"
              autoFocus
            />
            <div className="flex flex-wrap gap-1">
              {(Object.keys(CATEGORY_LABELS) as PhotoCategory[]).map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border transition-colors ${
                    category === cat ? CATEGORY_COLORS[cat] : "border-border text-muted-foreground hover:bg-sandstone"
                  }`}
                >
                  {CATEGORY_LABELS[cat]}
                </button>
              ))}
            </div>
            <div className="flex gap-1">
              <button onClick={handleSave}
                className="flex-1 py-1 text-[10px] font-semibold bg-canyon text-white rounded hover:bg-canyon/90 flex items-center justify-center gap-1">
                <Check className="w-3 h-3" /> Save
              </button>
              <button onClick={() => { setCaption(photo.caption); setCategory(photo.category as PhotoCategory); setEditing(false); }}
                className="flex-1 py-1 text-[10px] font-semibold border border-border rounded hover:bg-sandstone flex items-center justify-center gap-1">
                <X className="w-3 h-3" /> Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-1">
            <p className="text-xs text-charcoal flex-1 min-w-0 truncate">
              {photo.caption || <span className="text-muted-foreground italic">No caption</span>}
            </p>
            <button onClick={() => setEditing(true)}
              className="shrink-0 p-1 rounded text-muted-foreground hover:text-charcoal hover:bg-sandstone transition-colors">
              <Pencil className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {/* Annotator overlay */}
      {annotating && (
        <PhotoAnnotator
          photoId={photo.id}
          photoUrl={photo.url}
          sessionKey={sessionKey}
          caption={photo.caption}
          category={photo.category}
          onClose={() => setAnnotating(false)}
          onSaved={() => { setAnnotating(false); onRefresh(); }}
        />
      )}
    </div>
  );
}

// ─── Main PhotoCapture component ──────────────────────────────────────────────

interface PhotoCaptureProps {
  /** Unique session key — ties photos to this estimate session */
  sessionKey: string;
  /** Optional: called when photos change (for parent to track count) */
  onPhotoCountChange?: (count: number) => void;
}

export function PhotoCapture({ sessionKey, onPhotoCountChange }: PhotoCaptureProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>("");
  const [lightboxPhoto, setLightboxPhoto] = useState<PhotoItem | null>(null);
  const [pendingCategory, setPendingCategory] = useState<PhotoCategory>("site");
  const [showPdfPreview, setShowPdfPreview] = useState(false);

  const utils = trpc.useUtils();

  const { data: photos = [], isLoading } = trpc.estimatePhotos.listBySession.useQuery(
    { sessionKey },
    { enabled: !!sessionKey, staleTime: 0 }
  );

  const uploadMutation = trpc.estimatePhotos.upload.useMutation({
    onSuccess: () => {
      utils.estimatePhotos.listBySession.invalidate({ sessionKey });
    },
    onError: (e) => {
      toast.error(`Upload failed: ${e.message}`);
    },
  });

  const updateMutation = trpc.estimatePhotos.update.useMutation({
    onSuccess: () => {
      utils.estimatePhotos.listBySession.invalidate({ sessionKey });
    },
  });

  const deleteMutation = trpc.estimatePhotos.delete.useMutation({
    onSuccess: () => {
      utils.estimatePhotos.listBySession.invalidate({ sessionKey });
    },
    onError: (e) => {
      toast.error(`Delete failed: ${e.message}`);
    },
  });

  // Notify parent of photo count changes
  useEffect(() => {
    onPhotoCountChange?.(photos.length);
  }, [photos.length, onPhotoCountChange]);

  const processFile = useCallback(async (file: File, category: PhotoCategory) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Only image files are supported.");
      return;
    }
    const MAX_SIZE_MB = 10;
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      toast.error(`Image is too large (max ${MAX_SIZE_MB} MB). Please compress or resize it.`);
      return;
    }

    setUploading(true);
    setUploadProgress(`Uploading ${file.name}...`);

    try {
      // Resize/compress to max 1600px on longest side before upload
      const resized = await resizeImage(file, 1600, 0.85);
      const base64 = await fileToBase64(resized.blob);

      await uploadMutation.mutateAsync({
        sessionKey,
        fileBase64: base64,
        mimeType: resized.mimeType as "image/jpeg" | "image/png" | "image/webp",
        fileName: file.name,
        caption: "",
        category,
        fileSizeBytes: resized.blob.size,
      });
      toast.success("Photo saved to estimate.");
    } catch (err) {
      // Error handled by onError above
    } finally {
      setUploading(false);
      setUploadProgress("");
    }
  }, [sessionKey, uploadMutation]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    for (const file of files) {
      await processFile(file, pendingCategory);
    }
    e.target.value = "";
  };

  const handleUpdate = (id: number, caption: string, category: PhotoCategory) => {
    updateMutation.mutate({ id, caption, category });
  };

  const handleDelete = (id: number, s3Key: string) => {
    deleteMutation.mutate({ id, s3Key });
  };

  const photoList = photos as PhotoItem[];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="font-body font-semibold text-charcoal text-sm flex items-center gap-2">
            <Camera className="w-4 h-4 text-canyon" />
            Site Photos
            {photoList.length > 0 && (
              <span className="text-xs bg-canyon/10 text-canyon font-semibold px-2 py-0.5 rounded-full">
                {photoList.length}
              </span>
            )}
          </p>
          <p className="text-xs text-muted-foreground">
            Capture or upload photos of the site, existing deck, materials, or damage. Photos are saved with this estimate.
          </p>
        </div>
      </div>

      {/* Category selector for next upload */}
      <div className="space-y-1.5">
        <p className="text-xs font-body font-semibold text-charcoal">Photo Category</p>
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(CATEGORY_LABELS) as PhotoCategory[]).map(cat => (
            <button
              key={cat}
              onClick={() => setPendingCategory(cat)}
              className={`text-xs font-body font-semibold px-2.5 py-1 rounded-full border transition-colors ${
                pendingCategory === cat
                  ? CATEGORY_COLORS[cat] + " ring-1 ring-offset-1 ring-current"
                  : "border-border text-muted-foreground hover:bg-sandstone"
              }`}
            >
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>
      </div>

      {/* Upload buttons */}
      <div className="grid grid-cols-2 gap-3">
        {/* Camera capture — works on mobile, opens camera app */}
        <button
          onClick={() => cameraInputRef.current?.click()}
          disabled={uploading}
          className="flex flex-col items-center justify-center gap-2 py-4 border-2 border-dashed border-canyon/40 rounded-xl text-canyon hover:border-canyon hover:bg-canyon/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : (
            <Camera className="w-6 h-6" />
          )}
          <span className="text-sm font-body font-semibold">
            {uploading ? "Uploading..." : "Take Photo"}
          </span>
          <span className="text-[10px] text-muted-foreground">Opens camera</span>
        </button>

        {/* File upload — pick from gallery/files */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex flex-col items-center justify-center gap-2 py-4 border-2 border-dashed border-border rounded-xl text-charcoal hover:border-canyon/60 hover:bg-sandstone/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Upload className="w-6 h-6 text-charcoal/60" />
          <span className="text-sm font-body font-semibold">Upload Photo</span>
          <span className="text-[10px] text-muted-foreground">From gallery or files</span>
        </button>
      </div>

      {/* Hidden inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple={false}
        className="hidden"
        onChange={handleFileChange}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Upload progress */}
      {uploading && uploadProgress && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-sandstone/60 rounded-lg px-3 py-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-canyon" />
          {uploadProgress}
        </div>
      )}

      {/* Photo grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          <span className="text-sm">Loading photos...</span>
        </div>
      ) : photoList.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground border-2 border-dashed border-border/40 rounded-xl">
          <ImageIcon className="w-8 h-8 mb-2 opacity-30" />
          <p className="text-sm">No photos yet</p>
          <p className="text-xs">Take a photo or upload from your device</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {photoList.map(photo => (
            <PhotoCard
              key={photo.id}
              photo={photo}
              sessionKey={sessionKey}
              onDelete={handleDelete}
              onUpdate={handleUpdate}
              onZoom={setLightboxPhoto}
              onRefresh={() => utils.estimatePhotos.listBySession.invalidate({ sessionKey })}
            />
            ))}
        </div>
      )}

      {/* Category summary */}
      {photoList.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          {(Object.keys(CATEGORY_LABELS) as PhotoCategory[]).map(cat => {
            const count = photoList.filter(p => p.category === cat).length;
            if (count === 0) return null;
            return (
              <span key={cat} className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${CATEGORY_COLORS[cat]}`}>
                {CATEGORY_LABELS[cat]}: {count}
              </span>
            );
          })}
          <button
            onClick={() => setShowPdfPreview(true)}
            className="ml-auto flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1 rounded-full border border-canyon/40 text-canyon hover:bg-canyon/10 transition-colors"
          >
            <FileText className="w-3.5 h-3.5" />
            Preview in PDF
          </button>
        </div>
      )}

      {/* Lightbox */}
      {lightboxPhoto && (
        <Lightbox
          url={lightboxPhoto.url}
          caption={lightboxPhoto.caption}
          onClose={() => setLightboxPhoto(null)}
        />
      )}

      {/* PDF Photo Preview overlay */}
      {showPdfPreview && (
        <PdfPhotoPreview
          photos={photoList.map(p => ({
            id: p.id,
            url: p.url,
            caption: p.caption,
            category: p.category,
          } satisfies PreviewPhoto))}
          onClose={() => setShowPdfPreview(false)}
        />
      )}
    </div>
  );
}

// ─── Utilities ────────────────────────────────────────────────────────────────

async function fileToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip the data URL prefix (e.g. "data:image/jpeg;base64,")
      resolve(result.split(",")[1] ?? result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function resizeImage(
  file: File,
  maxDimension: number,
  quality: number
): Promise<{ blob: Blob; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const { width, height } = img;
      let newW = width;
      let newH = height;
      if (width > maxDimension || height > maxDimension) {
        if (width >= height) {
          newW = maxDimension;
          newH = Math.round((height / width) * maxDimension);
        } else {
          newH = maxDimension;
          newW = Math.round((width / height) * maxDimension);
        }
      }
      const canvas = document.createElement("canvas");
      canvas.width = newW;
      canvas.height = newH;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("Canvas not supported")); return; }
      ctx.drawImage(img, 0, 0, newW, newH);
      const mimeType = file.type === "image/png" ? "image/png" : "image/jpeg";
      canvas.toBlob(
        (blob) => {
          if (!blob) { reject(new Error("Canvas toBlob failed")); return; }
          resolve({ blob, mimeType });
        },
        mimeType,
        quality
      );
    };
    img.onerror = reject;
    img.src = url;
  });
}
