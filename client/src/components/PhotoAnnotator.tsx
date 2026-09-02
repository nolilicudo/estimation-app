/**
 * PhotoAnnotator — In-browser canvas annotation tool for site photos.
 * Supports: freehand draw, text labels, arrows, rectangle highlights.
 * Saves the annotated image back to S3 via the estimatePhotos.upload procedure.
 */
import { useRef, useState, useEffect, useCallback } from "react";
import {
  Pencil, Type, ArrowRight, Square, Undo2, Trash2, Check, X,
  Loader2, Minus, Plus, Palette,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

type Tool = "draw" | "text" | "arrow" | "rect";

interface Point { x: number; y: number; }

interface Annotation {
  id: string;
  tool: Tool;
  color: string;
  strokeWidth: number;
  // draw
  points?: Point[];
  // text
  text?: string;
  position?: Point;
  fontSize?: number;
  // arrow / rect
  start?: Point;
  end?: Point;
}

interface PhotoAnnotatorProps {
  photoId: number;
  photoUrl: string;
  sessionKey: string;
  caption?: string;
  category?: string;
  onClose: () => void;
  onSaved: (newUrl: string) => void;
}

const COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6", "#ffffff", "#000000"];
const STROKE_WIDTHS = [2, 4, 6, 10];

// ─── Main Component ───────────────────────────────────────────────────────────

export function PhotoAnnotator({
  photoId,
  photoUrl,
  sessionKey,
  caption = "",
  category = "site",
  onClose,
  onSaved,
}: PhotoAnnotatorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tool, setTool] = useState<Tool>("draw");
  const [color, setColor] = useState("#ef4444");
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [currentAnnotation, setCurrentAnnotation] = useState<Annotation | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [textPosition, setTextPosition] = useState<Point | null>(null);
  const [showTextInput, setShowTextInput] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const imageRef = useRef<HTMLImageElement | null>(null);

  const utils = trpc.useUtils();
  const uploadMutation = trpc.estimatePhotos.upload.useMutation({
    onSuccess: () => { utils.estimatePhotos.listBySession.invalidate({ sessionKey }); },
  });
  const updateMutation = trpc.estimatePhotos.update.useMutation();

  // Load image and set canvas size
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imageRef.current = img;
      const container = containerRef.current;
      if (!container) return;
      const maxW = Math.min(container.clientWidth - 32, 900);
      const maxH = Math.min(window.innerHeight * 0.6, 600);
      const ratio = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight);
      const w = Math.round(img.naturalWidth * ratio);
      const h = Math.round(img.naturalHeight * ratio);
      setCanvasSize({ width: w, height: h });
      setImageLoaded(true);
    };
    img.onerror = () => toast.error("Failed to load image for annotation.");
    img.src = photoUrl;
  }, [photoUrl]);

  // Redraw canvas whenever annotations change
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img || !imageLoaded) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const allAnnotations = currentAnnotation
      ? [...annotations, currentAnnotation]
      : annotations;

    for (const ann of allAnnotations) {
      ctx.strokeStyle = ann.color;
      ctx.fillStyle = ann.color;
      ctx.lineWidth = ann.strokeWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      if (ann.tool === "draw" && ann.points && ann.points.length > 1) {
        ctx.beginPath();
        ctx.moveTo(ann.points[0].x, ann.points[0].y);
        for (let i = 1; i < ann.points.length; i++) {
          ctx.lineTo(ann.points[i].x, ann.points[i].y);
        }
        ctx.stroke();
      } else if (ann.tool === "text" && ann.text && ann.position) {
        ctx.font = `bold ${ann.fontSize ?? 20}px sans-serif`;
        ctx.fillStyle = ann.color;
        // Draw text shadow for readability
        ctx.shadowColor = ann.color === "#ffffff" ? "#000" : "#fff";
        ctx.shadowBlur = 4;
        ctx.fillText(ann.text, ann.position.x, ann.position.y);
        ctx.shadowBlur = 0;
      } else if (ann.tool === "arrow" && ann.start && ann.end) {
        drawArrow(ctx, ann.start, ann.end, ann.strokeWidth, ann.color);
      } else if (ann.tool === "rect" && ann.start && ann.end) {
        ctx.beginPath();
        ctx.strokeStyle = ann.color;
        ctx.lineWidth = ann.strokeWidth;
        ctx.strokeRect(
          ann.start.x, ann.start.y,
          ann.end.x - ann.start.x,
          ann.end.y - ann.start.y
        );
      }
    }
  }, [annotations, currentAnnotation, imageLoaded]);

  useEffect(() => { redraw(); }, [redraw]);

  // Coordinate helpers
  const getPos = (e: React.MouseEvent | React.TouchEvent): Point => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ("touches" in e) {
      const touch = e.touches[0] ?? e.changedTouches[0];
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (!imageLoaded) return;
    const pos = getPos(e);

    if (tool === "text") {
      setTextPosition(pos);
      setShowTextInput(true);
      return;
    }

    setIsDrawing(true);
    const ann: Annotation = {
      id: crypto.randomUUID(),
      tool,
      color,
      strokeWidth,
      ...(tool === "draw" ? { points: [pos] } : { start: pos, end: pos }),
    };
    setCurrentAnnotation(ann);
  };

  const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !currentAnnotation) return;
    const pos = getPos(e);
    setCurrentAnnotation(prev => {
      if (!prev) return prev;
      if (prev.tool === "draw") {
        return { ...prev, points: [...(prev.points ?? []), pos] };
      }
      return { ...prev, end: pos };
    });
  };

  const handlePointerUp = () => {
    if (!isDrawing || !currentAnnotation) return;
    setIsDrawing(false);
    setAnnotations(prev => [...prev, currentAnnotation]);
    setCurrentAnnotation(null);
  };

  const handleTextConfirm = () => {
    if (!textInput.trim() || !textPosition) {
      setShowTextInput(false);
      setTextInput("");
      setTextPosition(null);
      return;
    }
    const ann: Annotation = {
      id: crypto.randomUUID(),
      tool: "text",
      color,
      strokeWidth,
      text: textInput.trim(),
      position: textPosition,
      fontSize: Math.max(16, strokeWidth * 4),
    };
    setAnnotations(prev => [...prev, ann]);
    setShowTextInput(false);
    setTextInput("");
    setTextPosition(null);
  };

  const handleUndo = () => {
    setAnnotations(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    if (!confirm("Clear all annotations?")) return;
    setAnnotations([]);
  };

  const handleSave = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setSaving(true);
    try {
      // Export canvas as JPEG blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(b => b ? resolve(b) : reject(new Error("Canvas export failed")), "image/jpeg", 0.9);
      });
      // Convert to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      // Upload annotated version
      const result = await uploadMutation.mutateAsync({
        sessionKey,
        fileBase64: base64,
        mimeType: "image/jpeg",
        fileName: `annotated-${Date.now()}.jpg`,
        caption: caption ? `[Annotated] ${caption}` : "Annotated photo",
        category: category as "site" | "materials" | "existing-deck" | "damage" | "other",
        fileSizeBytes: blob.size,
      });
      toast.success("Annotated photo saved.");
      onSaved(result.url);
      onClose();
    } catch (err: any) {
      toast.error(`Save failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col" ref={containerRef}>
      {/* Header toolbar */}
      <div className="flex items-center gap-2 px-4 py-3 bg-charcoal/90 border-b border-white/10 flex-wrap">
        {/* Tool buttons */}
        <div className="flex items-center gap-1 bg-black/40 rounded-lg p-1">
          {([
            { id: "draw" as Tool, icon: <Pencil className="w-4 h-4" />, label: "Draw" },
            { id: "text" as Tool, icon: <Type className="w-4 h-4" />, label: "Text" },
            { id: "arrow" as Tool, icon: <ArrowRight className="w-4 h-4" />, label: "Arrow" },
            { id: "rect" as Tool, icon: <Square className="w-4 h-4" />, label: "Box" },
          ] as { id: Tool; icon: React.ReactNode; label: string }[]).map(t => (
            <button
              key={t.id}
              onClick={() => setTool(t.id)}
              title={t.label}
              className={`p-2 rounded-md transition-colors ${
                tool === t.id ? "bg-canyon text-white" : "text-white/70 hover:text-white hover:bg-white/10"
              }`}
            >
              {t.icon}
            </button>
          ))}
        </div>

        {/* Color picker */}
        <div className="flex items-center gap-1">
          {COLORS.map(c => (
            <button
              key={c}
              onClick={() => setColor(c)}
              style={{ backgroundColor: c }}
              className={`w-6 h-6 rounded-full border-2 transition-transform ${
                color === c ? "border-white scale-125" : "border-transparent hover:scale-110"
              }`}
            />
          ))}
        </div>

        {/* Stroke width */}
        <div className="flex items-center gap-1 bg-black/40 rounded-lg p-1">
          {STROKE_WIDTHS.map(w => (
            <button
              key={w}
              onClick={() => setStrokeWidth(w)}
              className={`w-8 h-8 rounded-md flex items-center justify-center transition-colors ${
                strokeWidth === w ? "bg-canyon" : "hover:bg-white/10"
              }`}
            >
              <div className="rounded-full bg-white" style={{ width: w, height: w, maxWidth: 14, maxHeight: 14 }} />
            </button>
          ))}
        </div>

        {/* Undo / Clear */}
        <div className="flex items-center gap-1 ml-auto">
          <button
            onClick={handleUndo}
            disabled={annotations.length === 0}
            className="p-2 rounded-md text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-30 transition-colors"
            title="Undo"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onClick={handleClear}
            disabled={annotations.length === 0}
            className="p-2 rounded-md text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-30 transition-colors"
            title="Clear all"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {/* Save / Cancel */}
        <button
          onClick={onClose}
          className="p-2 rounded-md text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          title="Cancel"
        >
          <X className="w-4 h-4" />
        </button>
        <button
          onClick={handleSave}
          disabled={saving || annotations.length === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-canyon hover:bg-canyon/90 text-white text-sm font-semibold rounded-lg disabled:opacity-50 transition-colors"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          Save Annotated
        </button>
      </div>

      {/* Canvas area */}
      <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
        {!imageLoaded ? (
          <div className="flex items-center gap-2 text-white/60">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span>Loading image...</span>
          </div>
        ) : (
          <div className="relative">
            <canvas
              ref={canvasRef}
              width={canvasSize.width}
              height={canvasSize.height}
              style={{
                cursor: tool === "text" ? "text" : "crosshair",
                touchAction: "none",
                display: "block",
                maxWidth: "100%",
                borderRadius: "8px",
                boxShadow: "0 0 40px rgba(0,0,0,0.8)",
              }}
              onMouseDown={handlePointerDown}
              onMouseMove={handlePointerMove}
              onMouseUp={handlePointerUp}
              onMouseLeave={handlePointerUp}
              onTouchStart={handlePointerDown}
              onTouchMove={handlePointerMove}
              onTouchEnd={handlePointerUp}
            />

            {/* Text input overlay */}
            {showTextInput && textPosition && (
              <div
                className="absolute flex items-center gap-2 bg-black/80 border border-white/20 rounded-lg p-2 shadow-xl"
                style={{
                  left: Math.min(textPosition.x * (canvasRef.current?.clientWidth ?? 1) / (canvasSize.width || 1), (canvasRef.current?.clientWidth ?? 400) - 260),
                  top: Math.max(0, textPosition.y * (canvasRef.current?.clientHeight ?? 1) / (canvasSize.height || 1) - 50),
                }}
              >
                <input
                  type="text"
                  value={textInput}
                  onChange={e => setTextInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") handleTextConfirm(); if (e.key === "Escape") { setShowTextInput(false); setTextInput(""); setTextPosition(null); } }}
                  placeholder="Type annotation..."
                  className="bg-transparent text-white placeholder-white/40 text-sm outline-none w-44"
                  autoFocus
                />
                <button onClick={handleTextConfirm} className="text-green-400 hover:text-green-300">
                  <Check className="w-4 h-4" />
                </button>
                <button onClick={() => { setShowTextInput(false); setTextInput(""); setTextPosition(null); }} className="text-red-400 hover:text-red-300">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer hint */}
      <div className="text-center text-white/40 text-xs pb-3">
        {tool === "text" ? "Click on the photo to place text" : "Draw on the photo • Annotated version will be saved as a new photo"}
        {annotations.length > 0 && ` • ${annotations.length} annotation${annotations.length !== 1 ? "s" : ""}`}
      </div>
    </div>
  );
}

// ─── Arrow drawing helper ─────────────────────────────────────────────────────

function drawArrow(
  ctx: CanvasRenderingContext2D,
  from: Point,
  to: Point,
  width: number,
  color: string
) {
  const headLen = Math.max(12, width * 4);
  const angle = Math.atan2(to.y - from.y, to.x - from.x);

  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";

  // Shaft
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();

  // Arrowhead
  ctx.beginPath();
  ctx.moveTo(to.x, to.y);
  ctx.lineTo(
    to.x - headLen * Math.cos(angle - Math.PI / 6),
    to.y - headLen * Math.sin(angle - Math.PI / 6)
  );
  ctx.lineTo(
    to.x - headLen * Math.cos(angle + Math.PI / 6),
    to.y - headLen * Math.sin(angle + Math.PI / 6)
  );
  ctx.closePath();
  ctx.fill();
}
