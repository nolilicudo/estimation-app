/**
 * Dynamic Questionnaire — /q/:token
 * Customer-facing questionnaire with 10 sections, visual image-choice tiers,
 * photo upload prompts, and branching logic.
 *
 * Sections:
 *  1. project_basics            — Project Basics
 *  2. existing_conditions       — Existing Home Conditions
 *  3. site_access               — Site & Access
 *  4. structure_foundation_roof — Structure / Foundation / Roof
 *  5. mechanical_electrical_plumbing — Mechanical, Electrical & Plumbing
 *  6. exterior_finishes         — Exterior Finishes
 *  7. interior_finishes         — Interior Finishes
 *  8. trade_upgrades            — Trade-Specific Feature Upgrades
 *  9. overall_finish_level      — Overall Finish Level
 * 10. photos_inspiration        — Photos / Inspiration Images
 */

import { useState, useMemo, useRef, useCallback } from "react";
import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check, ChevronRight, Loader2, ArrowLeft, CheckCircle2,
  Upload, X, Camera, Square, ClipboardList,
  Home, Layers, Mic2, Image, Edit2, AlertCircle, Mic,
  Building2, Wrench, Zap, TreePine, Paintbrush, Star, FileImage,
  ChevronDown, FileText, File
} from "lucide-react";

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663346810257/CCcDY8JrM76jeYgqBkzZHs/logo_1fad62fa.png";
const REDIRECT_URL = "https://www.designyourprice.com";

// ─── Section Metadata ─────────────────────────────────────────────────────────

const SECTION_META: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  project_knowledge: { label: "Project Knowledge", icon: <ClipboardList className="w-4 h-4" />, color: "bg-indigo-600" },
  guided_selection: { label: "Guided Selection", icon: <Edit2 className="w-4 h-4" />, color: "bg-blue-600" },
  plan_based: { label: "Plan-Based Details", icon: <FileImage className="w-4 h-4" />, color: "bg-green-700" },
  project_basics: { label: "Project Basics", icon: <Home className="w-4 h-4" />, color: "bg-blue-500" },
  existing_conditions: { label: "Existing Conditions", icon: <Building2 className="w-4 h-4" />, color: "bg-amber-500" },
  site_access: { label: "Site & Access", icon: <TreePine className="w-4 h-4" />, color: "bg-green-600" },
  structure_foundation_roof: { label: "Structure / Roof", icon: <Layers className="w-4 h-4" />, color: "bg-stone-600" },
  mechanical_electrical_plumbing: { label: "Mechanical & Electrical", icon: <Zap className="w-4 h-4" />, color: "bg-yellow-600" },
  exterior_finishes: { label: "Exterior Finishes", icon: <TreePine className="w-4 h-4" />, color: "bg-teal-600" },
  interior_finishes: { label: "Interior Finishes", icon: <Paintbrush className="w-4 h-4" />, color: "bg-purple-600" },
  trade_upgrades: { label: "Feature Upgrades", icon: <Wrench className="w-4 h-4" />, color: "bg-orange-600" },
  overall_finish_level: { label: "Overall Finish Level", icon: <Star className="w-4 h-4" />, color: "bg-canyon" },
  photos_inspiration: { label: "Photos & Inspiration", icon: <FileImage className="w-4 h-4" />, color: "bg-rose-600" },
};

const SECTION_ORDER = [
  "project_knowledge",
  "guided_selection",
  "plan_based",
  "project_basics",
  "existing_conditions",
  "site_access",
  "structure_foundation_roof",
  "mechanical_electrical_plumbing",
  "exterior_finishes",
  "interior_finishes",
  "trade_upgrades",
  "overall_finish_level",
  "photos_inspiration",
];

// ─── Types ────────────────────────────────────────────────────────────────────

type QuestionOption = {
  id: number;
  text: string;
  subtext: string | null;
  imageUrl: string | null;
  priceAdjustment: string;
  priceAdjustmentType: "flat" | "percent" | "none";
  pricingTier: number | null;
  sortOrder: number;
};

type Question = {
  id: number;
  text: string;
  subtext: string | null;
  type: "single" | "multi" | "quantity_select" | "voice_photo" | "photo_upload";
  inputType: string;
  dropdownOptions: string[] | null;
  sortOrder: number;
  section: string | null;
  parentQuestionId: number | null;
  parentOptionId: number | null;
  applicableProjectTypes: Array<"bathroom" | "kitchen" | "addition" | "basement"> | null;
  options: QuestionOption[];
};

type Session = {
  id: number;
  customerName: string | null;
  completedAt: Date | null;
  estimatedMin: string | null;
  estimatedMax: string | null;
  projectType: string | null;
};

// Per-answer state for voice_photo / photo_upload questions
type PhotoState = {
  photoUrls: string[];
  isUploading: boolean;
};

// Uploaded file metadata (for session file uploads)
type UploadedFile = {
  url: string;
  name: string;
  mimeType: string;
  size: number;
  fileId?: number | null;
};



// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DynamicQuestionnairePage() {
  const { token } = useParams<{ token: string }>();

  const { data, isLoading, error } = trpc.questionnaire.getSessionByToken.useQuery(
    { token: token! },
    { enabled: !!token, retry: false }
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-warm-cream flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-canyon" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-warm-cream flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <img src={LOGO_URL} alt="Logo" className="w-16 h-16 rounded-xl mx-auto mb-4" />
          <h1 className="text-xl font-display text-charcoal mb-2">Link Not Found</h1>
          <p className="text-muted-foreground text-sm">
            This questionnaire link is invalid or has expired. Please contact your sales representative for a new link.
          </p>
        </div>
      </div>
    );
  }

  const session = data.session as Session;

  if (session.completedAt) {
    return <CompletedScreen session={session} />;
  }

  return (
    <QuestionnaireFlow
      token={token!}
      session={session}
      questions={data.questions as Question[]}
    />
  );
}

// ─── Completed Screen ─────────────────────────────────────────────────────────

function CompletedScreen({ session }: { session: Session }) {
  return (
    <div className="min-h-screen bg-warm-cream flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <img src={LOGO_URL} alt="Logo" className="w-16 h-16 rounded-xl mx-auto mb-6" />
        <CheckCircle2 className="w-14 h-14 text-green-500 mx-auto mb-4" />
        <h1 className="text-2xl font-display text-charcoal mb-2">
          Thanks, {session.customerName?.split(" ")[0] ?? "there"}!
        </h1>
        <p className="text-muted-foreground text-sm mb-6">
          You've already completed this questionnaire. Your sales rep will be in touch soon.
        </p>
        {session.estimatedMin && session.estimatedMax && (
          <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-5 mb-6">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-1">Your Rough Estimate</p>
            <p className="text-3xl font-display text-canyon">
              ${Number(session.estimatedMin).toLocaleString()} – ${Number(session.estimatedMax).toLocaleString()}
            </p>
          </div>
        )}
        <Button onClick={() => window.location.href = REDIRECT_URL} className="bg-canyon hover:bg-canyon/90 gap-2">
          Visit Design Your Price <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

// ─── Photo Upload Component ───────────────────────────────────────────────────

/**
 * SessionFileUpload — uploads files directly to S3 via /api/upload/session-file.
 * Handles both plan PDFs and reference photos.
 * Updates photoState (photoUrls) so existing submit logic still works.
 */
function SessionFileUpload({
  questionId,
  questionText,
  sessionToken,
  fileCategory,
  state,
  onStateChange,
  acceptPdf = false,
}: {
  questionId: number;
  questionText: string;
  sessionToken: string;
  fileCategory: string;
  state: PhotoState;
  onStateChange: (questionId: number, update: Partial<PhotoState>) => void;
  acceptPdf?: boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const acceptAttr = acceptPdf
    ? "image/*,application/pdf,.pdf,.heic,.heif"
    : "image/*,.heic,.heif";

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsUploading(true);
    setUploadError(null);
    onStateChange(questionId, { isUploading: true });

    const newFiles: UploadedFile[] = [];
    const newUrls: string[] = [];

    for (const file of Array.from(files)) {
      if (file.size > 20 * 1024 * 1024) {
        setUploadError(`"${file.name}" is too large (max 20 MB).`);
        continue;
      }
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("sessionToken", sessionToken);
        formData.append("questionId", String(questionId));
        formData.append("questionLabel", questionText);
        formData.append("fileCategory", fileCategory);

        const resp = await fetch("/api/upload/session-file", {
          method: "POST",
          body: formData,
          credentials: "include",
        });
        if (!resp.ok) {
          const err = await resp.json().catch(() => ({ error: "Upload failed" }));
          throw new Error(err.error ?? "Upload failed");
        }
        const result = await resp.json() as { success: boolean; fileUrl: string; fileName: string; fileId?: number | null };
        newFiles.push({
          url: result.fileUrl,
          name: result.fileName,
          mimeType: file.type,
          size: file.size,
          fileId: result.fileId,
        });
        newUrls.push(result.fileUrl);
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : "Upload failed");
      }
    }

    setUploadedFiles(prev => [...prev, ...newFiles]);
    onStateChange(questionId, {
      photoUrls: [...state.photoUrls, ...newUrls],
      isUploading: false,
    });
    setIsUploading(false);
  }, [questionId, questionText, sessionToken, fileCategory, state.photoUrls, onStateChange]);

  const removeFile = useCallback((url: string) => {
    setUploadedFiles(prev => prev.filter(f => f.url !== url));
    onStateChange(questionId, { photoUrls: state.photoUrls.filter(u => u !== url) });
  }, [questionId, state.photoUrls, onStateChange]);

  const isPdf = (f: UploadedFile) => f.mimeType === "application/pdf" || f.name.toLowerCase().endsWith(".pdf");
  const isImage = (f: UploadedFile) => f.mimeType.startsWith("image/");

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4">
      {/* Upload drop zone */}
      <div
        className="bg-white rounded-xl border-2 border-dashed border-canyon/30 p-6 text-center cursor-pointer hover:border-canyon/60 hover:bg-canyon/5 transition-colors"
        onClick={() => !isUploading && fileInputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
      >
        <div className="w-12 h-12 rounded-full bg-canyon/10 flex items-center justify-center mx-auto mb-3">
          {acceptPdf ? <FileText className="w-6 h-6 text-canyon" /> : <Camera className="w-6 h-6 text-canyon" />}
        </div>
        <p className="text-sm font-medium text-charcoal mb-1">
          {acceptPdf ? "Upload plans or photos" : "Upload photos"}
        </p>
        <p className="text-xs text-muted-foreground mb-4">
          {uploadedFiles.length === 0
            ? acceptPdf
              ? "PDF, JPG, PNG, HEIC — up to 20 MB each. Tap or drag files here."
              : "JPG, PNG, HEIC — up to 20 MB each. Tap or drag files here."
            : `${uploadedFiles.length} file${uploadedFiles.length !== 1 ? "s" : ""} uploaded`}
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptAttr}
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <Button
          variant="outline"
          type="button"
          disabled={isUploading}
          className="gap-2 border-canyon/40 text-canyon hover:bg-canyon/5"
          onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
        >
          {isUploading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Uploading…</>
          ) : (
            <><Upload className="w-4 h-4" /> {uploadedFiles.length > 0 ? "Add More Files" : "Select Files"}</>
          )}
        </Button>
      </div>

      {/* Error */}
      {uploadError && (
        <div className="flex items-center gap-2 text-red-600 text-xs bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{uploadError}</span>
          <button className="ml-auto" onClick={() => setUploadError(null)}><X className="w-3 h-3" /></button>
        </div>
      )}

      {/* File list */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          {uploadedFiles.map((f, i) => (
            <div key={i} className="flex items-center gap-3 bg-white border border-border/60 rounded-lg p-3 group">
              {isImage(f) ? (
                <div className="w-12 h-12 rounded-md overflow-hidden border border-border/40 shrink-0">
                  <img src={f.url} alt={f.name} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-md bg-red-50 border border-red-200 flex items-center justify-center shrink-0">
                  <FileText className="w-6 h-6 text-red-500" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-charcoal truncate">{f.name}</p>
                <p className="text-xs text-muted-foreground">{formatBytes(f.size)}</p>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={f.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-canyon hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  View
                </a>
                <button
                  onClick={() => removeFile(f.url)}
                  className="w-6 h-6 rounded-full bg-red-50 border border-red-200 flex items-center justify-center text-red-500 hover:bg-red-100 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Skip hint */}
      <p className="text-xs text-muted-foreground text-center">
        This upload is optional — you can skip and continue if you don't have files available right now.
      </p>
    </div>
  );
}

// ─── Quantity Select Component ────────────────────────────────────────────────

function QuantitySelectQuestion({
  question,
  selectedIds,
  quantities,
  onToggle,
  onQuantityChange,
}: {
  question: Question;
  selectedIds: number[];
  quantities: Record<string, number>;
  onToggle: (optionId: number) => void;
  onQuantityChange: (optionId: number, qty: number) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs text-canyon font-medium">Select all that apply and enter quantities</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {question.options.sort((a, b) => a.sortOrder - b.sortOrder).map(option => {
          const selected = selectedIds.includes(option.id);
          const qty = quantities[String(option.id)] ?? 1;
          return (
            <div
              key={option.id}
              className={`rounded-xl border-2 transition-all duration-150 overflow-hidden
                ${selected
                  ? "border-canyon bg-canyon/5 shadow-md"
                  : "border-border/60 bg-white hover:border-canyon/40"
                }
              `}
            >
              <button
                onClick={() => onToggle(option.id)}
                className="w-full p-4 text-left flex items-center gap-3"
              >
                <div className={`w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors
                  ${selected ? "bg-canyon border-canyon" : "border-border"}`}
                >
                  {selected && <Check className="w-3 h-3 text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-charcoal">{option.text}</p>
                  {option.subtext && (
                    <p className="text-xs text-muted-foreground mt-0.5">{option.subtext}</p>
                  )}
                </div>
              </button>
              {selected && (
                <div className="border-t border-canyon/20 bg-canyon/5 px-4 py-2 flex items-center gap-3">
                  <span className="text-xs text-muted-foreground flex-1">How many?</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onQuantityChange(option.id, Math.max(1, qty - 1))}
                      className="w-7 h-7 rounded-full border border-canyon/40 bg-white flex items-center justify-center text-canyon font-bold text-sm hover:bg-canyon hover:text-white transition-colors"
                    >
                      −
                    </button>
                    <span className="w-6 text-center text-sm font-semibold text-charcoal">{qty}</span>
                    <button
                      onClick={() => onQuantityChange(option.id, qty + 1)}
                      className="w-7 h-7 rounded-full border border-canyon/40 bg-white flex items-center justify-center text-canyon font-bold text-sm hover:bg-canyon hover:text-white transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Section Progress Bar ─────────────────────────────────────────────────────

function SectionProgressBar({
  sections,
  currentSection,
  completedSections,
}: {
  sections: string[];
  currentSection: string;
  completedSections: Set<string>;
}) {
  const currentIdx = sections.indexOf(currentSection);
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-charcoal/95 px-4 py-2">
      {/* Compact view */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-2 text-left"
      >
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-warm-cream/60 font-body">
              Section {currentIdx + 1} of {sections.length}
            </span>
            <span className="text-xs font-semibold text-warm-cream">
              {SECTION_META[currentSection]?.label ?? currentSection}
            </span>
          </div>
          {/* Mini progress dots */}
          <div className="flex gap-1">
            {sections.map((s, i) => (
              <div
                key={s}
                className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                  completedSections.has(s)
                    ? "bg-green-400"
                    : s === currentSection
                    ? "bg-canyon"
                    : "bg-warm-cream/20"
                }`}
              />
            ))}
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 text-warm-cream/60 transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>

      {/* Expanded section list */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pt-3 pb-1 grid grid-cols-2 gap-1.5">
              {sections.map((s, i) => {
                const meta = SECTION_META[s];
                const isDone = completedSections.has(s);
                const isCurrent = s === currentSection;
                return (
                  <div
                    key={s}
                    className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition-colors ${
                      isCurrent
                        ? "bg-canyon/20 text-warm-cream"
                        : isDone
                        ? "text-green-400"
                        : "text-warm-cream/40"
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${
                      isDone ? "bg-green-500" : isCurrent ? "bg-canyon" : "bg-warm-cream/10"
                    }`}>
                      {isDone ? <Check className="w-2.5 h-2.5 text-white" /> : (
                        <span className="text-[9px] font-bold text-white/70">{i + 1}</span>
                      )}
                    </div>
                    <span className="truncate font-medium">{meta?.label ?? s}</span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Questionnaire Flow ───────────────────────────────────────────────────────

function QuestionnaireFlow({
  token,
  session,
  questions,
}: {
  token: string;
  session: Session;
  questions: Question[];
}) {
  // answers: questionId → array of selected optionIds
  const [answers, setAnswers] = useState<Record<number, number[]>>({});
  // quantities: questionId → { optionId (string) → qty }
  const [quantities, setQuantities] = useState<Record<number, Record<string, number>>>({});
  // photo state per question (for photo_upload and voice_photo)
  const [photoState, setPhotoState] = useState<Record<number, PhotoState>>({});
  // freeform answers for yes_no, number, dropdown, checkboxes, text input types
  const [freeformAnswers, setFreeformAnswers] = useState<Record<number, string>>({});
  // checkbox answers for checkboxes input type
  const [checkboxAnswers, setCheckboxAnswers] = useState<Record<number, string[]>>({});
  const [currentStep, setCurrentStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [estimate, setEstimate] = useState<{
    min: number;
    max: number;
    midpoint?: number;
    breakdown?: Array<{ label: string; amount: number; type: string; description?: string; tradeSection?: string; qty?: number; unitPrice?: number }>;
    baseRuleName?: string | null;
    usedCatalogPricing?: boolean;
    tradeSectionBreakdown?: Record<string, { items: Array<{ label: string; amount: number; type: string; description?: string; tradeSection?: string; qty?: number; unitPrice?: number }>; subtotal: number }>;
    rangeLabel?: string;
    knowledgePath?: string;
  } | null>(null);
  const [showBreakdown, setShowBreakdown] = useState(false);

  const submitAnswers = trpc.questionnaire.submitAnswers.useMutation();

  // Compute which questions are visible given current answers using branching logic
  const visibleQuestions = useMemo(() => {
    const visible: Question[] = [];
    // Filter by project type: if a question has applicableProjectTypes set, only show it
    // when the session's projectType matches one of the allowed types.
    const sessionProjectType = session.projectType as string | null;
    const projectFilteredQuestions = questions.filter(q => {
      if (!q.applicableProjectTypes || q.applicableProjectTypes.length === 0) return true;
      if (!sessionProjectType) return true;
      return q.applicableProjectTypes.includes(sessionProjectType as "bathroom" | "kitchen" | "addition" | "basement");
    });
    const rootQuestions = projectFilteredQuestions
      .filter(q => !q.parentQuestionId)
      .sort((a, b) => a.sortOrder - b.sortOrder);

    const addQuestion = (q: Question) => {
      visible.push(q);
      const children = projectFilteredQuestions
        .filter(child => child.parentQuestionId === q.id)
        .sort((a, b) => a.sortOrder - b.sortOrder);
      for (const child of children) {
        const parentAnswers = answers[q.id] ?? [];
        if (parentAnswers.length === 0) continue;
        if (child.parentOptionId && !parentAnswers.includes(child.parentOptionId)) continue;
        addQuestion(child);
      }
    };

    for (const root of rootQuestions) {
      addQuestion(root);
    }
    return visible;
  }, [questions, answers]);

  const currentQuestion = visibleQuestions[currentStep];
  const isLast = currentStep === visibleQuestions.length - 1;
  const progress = visibleQuestions.length > 0 ? ((currentStep + 1) / visibleQuestions.length) * 100 : 0;

  // Compute sections present in visible questions
  const visibleSections = useMemo(() => {
    const seen = new Set<string>();
    const ordered: string[] = [];
    for (const s of SECTION_ORDER) {
      if (visibleQuestions.some(q => q.section === s)) {
        if (!seen.has(s)) { seen.add(s); ordered.push(s); }
      }
    }
    return ordered;
  }, [visibleQuestions]);

  // Compute which sections are fully completed (all questions in that section answered)
  const completedSections = useMemo(() => {
    const done = new Set<string>();
    for (const s of visibleSections) {
      const sectionQs = visibleQuestions.filter(q => q.section === s);
      const allAnswered = sectionQs.every(q => {
        if (q.type === "photo_upload") return true; // optional
        const it = q.inputType || "options";
        if (it === "checkboxes") return (checkboxAnswers[q.id]?.length ?? 0) > 0;
        if (it === "number" || it === "yes_no" || it === "dropdown") return !!freeformAnswers[q.id];
        if (it === "text") return true;
        return (answers[q.id]?.length ?? 0) > 0;
      });
      if (allAnswered && sectionQs.length > 0) done.add(s);
    }
    return done;
  }, [visibleSections, visibleQuestions, answers, freeformAnswers, checkboxAnswers]);

  const currentSection = currentQuestion?.section ?? "project_basics";

  // Handle standard single/multi select
  const handleSelect = (questionId: number, optionId: number, type: "single" | "multi") => {
    setAnswers(prev => {
      const current = prev[questionId] ?? [];
      if (type === "single") {
        return { ...prev, [questionId]: [optionId] };
      } else {
        const has = current.includes(optionId);
        return { ...prev, [questionId]: has ? current.filter(id => id !== optionId) : [...current, optionId] };
      }
    });
  };

  // Handle quantity_select toggle
  const handleQuantityToggle = (questionId: number, optionId: number) => {
    setAnswers(prev => {
      const current = prev[questionId] ?? [];
      const has = current.includes(optionId);
      const newSelected = has ? current.filter(id => id !== optionId) : [...current, optionId];
      if (has) {
        setQuantities(q => {
          const qCopy = { ...q };
          const qForQuestion = { ...(qCopy[questionId] ?? {}) };
          delete qForQuestion[String(optionId)];
          qCopy[questionId] = qForQuestion;
          return qCopy;
        });
      }
      return { ...prev, [questionId]: newSelected };
    });
  };

  const handleQuantityChange = (questionId: number, optionId: number, qty: number) => {
    setQuantities(prev => ({
      ...prev,
      [questionId]: { ...(prev[questionId] ?? {}), [String(optionId)]: qty },
    }));
  };

  // Handle photo state update
  const handlePhotoStateChange = (questionId: number, update: Partial<PhotoState>) => {
    setPhotoState(prev => {
      const existing = prev[questionId] ?? { photoUrls: [], isUploading: false };
      return { ...prev, [questionId]: { ...existing, ...update } };
    });
  };

  // Determine if current question can proceed
  const canProceed = useMemo(() => {
    if (!currentQuestion) return false;
    if (currentQuestion.type === "photo_upload") return true; // always optional
    const it = currentQuestion.inputType || "options";
    if (it === "yes_no") return !!freeformAnswers[currentQuestion.id];
    if (it === "number") return freeformAnswers[currentQuestion.id] !== undefined && freeformAnswers[currentQuestion.id] !== "";
    if (it === "dropdown") return !!freeformAnswers[currentQuestion.id];
    if (it === "checkboxes") return (checkboxAnswers[currentQuestion.id]?.length ?? 0) > 0;
    if (it === "text") return true;
    return (answers[currentQuestion.id]?.length ?? 0) > 0;
  }, [currentQuestion, answers, freeformAnswers, checkboxAnswers]);

  const handleNext = () => {
    if (currentStep < visibleQuestions.length - 1) {
      setCurrentStep(s => s + 1);
    } else {
      setShowSummary(true);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep(s => s - 1);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const answerPayload = visibleQuestions
        .filter(q => {
          if (q.type === "photo_upload") return (photoState[q.id]?.photoUrls?.length ?? 0) > 0;
          const it = q.inputType || "options";
          if (it === "yes_no" || it === "number" || it === "dropdown") return !!freeformAnswers[q.id];
          if (it === "checkboxes") return (checkboxAnswers[q.id]?.length ?? 0) > 0;
          if (it === "text") return !!freeformAnswers[q.id];
          return (answers[q.id]?.length ?? 0) > 0;
        })
        .map(q => {
          const it = q.inputType || "options";
          let freeformValue: string | undefined;
          if (it === "yes_no" || it === "number" || it === "dropdown" || it === "text") {
            freeformValue = freeformAnswers[q.id] || undefined;
          } else if (it === "checkboxes") {
            freeformValue = (checkboxAnswers[q.id] ?? []).join(", ");
          }
          return {
            questionId: q.id,
            selectedOptionIds: answers[q.id] ?? [],
            quantities: quantities[q.id] ?? undefined,
            voiceTranscription: undefined,
            photoUrls: photoState[q.id]?.photoUrls?.length ? photoState[q.id].photoUrls : undefined,
            freeformValue,
          };
        });

      const result = await submitAnswers.mutateAsync({ token, answers: answerPayload });
      if (result.estimatedMin != null && result.estimatedMax != null) {
        setEstimate({
          min: result.estimatedMin,
          max: result.estimatedMax,
          midpoint: result.midpoint ?? undefined,
          breakdown: (result.breakdown as Array<{ label: string; amount: number; type: string; description?: string; tradeSection?: string; qty?: number; unitPrice?: number }> | undefined) ?? undefined,
          baseRuleName: result.baseRuleName ?? null,
          usedCatalogPricing: (result as { usedCatalogPricing?: boolean }).usedCatalogPricing ?? false,
          tradeSectionBreakdown: (result as { tradeSectionBreakdown?: Record<string, { items: Array<{ label: string; amount: number; type: string; description?: string }>; subtotal: number }> }).tradeSectionBreakdown,
          rangeLabel: (result as { rangeLabel?: string }).rangeLabel ?? "±10%",
          knowledgePath: (result as { knowledgePath?: string }).knowledgePath ?? "help_me_figure_out",
        });
      }
      setDone(true);
    } catch {
      setDone(true);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Summary screen ──────────────────────────────────────────────────────────
  if (showSummary && !done) {
    return (
      <SummaryReviewScreen
        session={session}
        questions={questions}
        visibleQuestions={visibleQuestions}
        answers={answers}
        quantities={quantities}
        photoState={photoState}
        freeformAnswers={freeformAnswers}
        checkboxAnswers={checkboxAnswers}
        submitting={submitting}
        onEdit={(stepIndex) => {
          setShowSummary(false);
          setCurrentStep(stepIndex);
        }}
        onSubmit={handleSubmit}
      />
    );
  }

  if (done) {
    return (
      <div className="min-h-screen bg-warm-cream flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-sm w-full"
        >
          <img src={LOGO_URL} alt="Logo" className="w-16 h-16 rounded-xl mx-auto mb-6" />
          <CheckCircle2 className="w-14 h-14 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-display text-charcoal mb-2">
            Thanks, {session.customerName?.split(" ")[0] ?? "there"}!
          </h1>
          <p className="text-muted-foreground text-sm mb-6">
            Your answers have been submitted. Your sales rep will review them and be in touch soon.
          </p>
          {estimate && (
            <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-5 mb-6 text-left">
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-1 text-center">Your Rough Project Estimate</p>
              <p className="text-3xl font-display text-canyon text-center">
                ${estimate.min.toLocaleString()} – ${estimate.max.toLocaleString()}
              </p>
              {estimate.midpoint && (
                <p className="text-sm text-muted-foreground text-center mt-1">
                  Midpoint: <span className="font-semibold text-charcoal">${estimate.midpoint.toLocaleString()}</span>
                  <span className="text-xs ml-1">({estimate.rangeLabel ?? "±10%"} range shown above)</span>
                </p>
              )}
              {estimate.knowledgePath && (
                <div className={`mt-2 text-center text-xs px-3 py-1.5 rounded-full inline-block mx-auto ${
                  estimate.knowledgePath === "i_have_plans"
                    ? "bg-green-50 text-green-700 border border-green-200"
                    : estimate.knowledgePath === "i_know_what_i_want"
                    ? "bg-blue-50 text-blue-700 border border-blue-200"
                    : "bg-amber-50 text-amber-700 border border-amber-200"
                }`}>
                  {estimate.knowledgePath === "i_have_plans"
                    ? "Plan-based estimate — tightest range (±5%)"
                    : estimate.knowledgePath === "i_know_what_i_want"
                    ? "Guided estimate — narrowed range (±7%)"
                    : "Idea estimate — exploratory range (±10%)"}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-2 text-center">
                This is a rough estimate based on your answers. Your sales rep will provide a detailed quote after the visit.
              </p>
              {(estimate.breakdown && estimate.breakdown.length > 0) && (
                <div className="mt-3 border-t border-border/40 pt-3">
                  <button
                    onClick={() => setShowBreakdown(v => !v)}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-charcoal transition-colors w-full justify-center"
                  >
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showBreakdown ? "rotate-180" : ""}`} />
                    {showBreakdown ? "Hide" : "Show"} cost breakdown by trade
                  </button>
                  {showBreakdown && (
                    <div className="mt-3">
                      {estimate.usedCatalogPricing && estimate.tradeSectionBreakdown
                        ? (
                          // Catalog mode: group by trade section
                          <div className="space-y-3">
                            {Object.entries(estimate.tradeSectionBreakdown)
                              .sort(([a], [b]) => a.localeCompare(b))
                              .map(([section, { items, subtotal }]) => (
                                <div key={section}>
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs font-semibold text-charcoal uppercase tracking-wide">
                                      {section.replace(/_/g, " ")}
                                    </span>
                                    <span className="text-xs font-bold text-charcoal">${Math.round(subtotal).toLocaleString()}</span>
                                  </div>
                                  <div className="space-y-1 pl-2 border-l-2 border-canyon/20">
                                    {items.map((item, i) => (
                                      <div key={i} className="flex items-start justify-between gap-2 text-xs">
                                        <span className="text-muted-foreground flex-1 leading-tight">
                                          {item.label}
                                          {item.description && <span className="block text-muted-foreground/60">{item.description}</span>}
                                        </span>
                                        <span className="font-semibold tabular-nums flex-shrink-0 text-charcoal">
                                          ${Math.round(item.amount).toLocaleString()}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))
                            }
                            {/* Other non-catalog adjustments */}
                            {estimate.breakdown.filter(b => b.type !== "catalog_item").length > 0 && (
                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs font-semibold text-charcoal uppercase tracking-wide">Adjustments</span>
                                </div>
                                <div className="space-y-1 pl-2 border-l-2 border-canyon/20">
                                  {estimate.breakdown.filter(b => b.type !== "catalog_item").map((item, i) => (
                                    <div key={i} className="flex items-start justify-between gap-2 text-xs">
                                      <span className="text-muted-foreground flex-1">{item.label}</span>
                                      <span className={`font-semibold tabular-nums flex-shrink-0 ${
                                        item.amount >= 0 ? "text-green-700" : "text-red-600"
                                      }`}>
                                        {item.amount >= 0 ? "+" : "-"}${Math.abs(Math.round(item.amount)).toLocaleString()}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )
                        : (
                          // Fallback mode: flat list
                          <div className="space-y-1.5">
                            {estimate.breakdown.map((item, i) => (
                              <div key={i} className="flex items-start justify-between gap-2 text-xs">
                                <span className="text-muted-foreground flex-1">{item.label}</span>
                                <span className={`font-semibold tabular-nums flex-shrink-0 ${
                                  item.type === "base" ? "text-charcoal" :
                                  item.amount >= 0 ? "text-green-700" : "text-red-600"
                                }`}>
                                  {item.amount >= 0 ? "+" : ""}{item.amount === 0 ? "" : "$"}{Math.abs(Math.round(item.amount)).toLocaleString()}
                                </span>
                              </div>
                            ))}
                          </div>
                        )
                      }
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          <Button onClick={() => window.location.href = REDIRECT_URL} className="bg-canyon hover:bg-canyon/90 gap-2 w-full">
            Visit Design Your Price <ChevronRight className="w-4 h-4" />
          </Button>
        </motion.div>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="min-h-screen bg-warm-cream flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <img src={LOGO_URL} alt="Logo" className="w-16 h-16 rounded-xl mx-auto mb-4" />
          <p className="text-muted-foreground">No questions have been set up yet. Please check back later.</p>
        </div>
      </div>
    );
  }

  const hasImages = currentQuestion.options.some(o => o.imageUrl);
  const isPhotoUpload = currentQuestion.type === "photo_upload";
  const currentPhotoState = photoState[currentQuestion.id] ?? { photoUrls: [], isUploading: false };

  // Detect section transition
  const prevQuestion = currentStep > 0 ? visibleQuestions[currentStep - 1] : null;
  const isNewSection = !prevQuestion || prevQuestion.section !== currentQuestion.section;

  return (
    <div className="min-h-screen bg-warm-cream flex flex-col">
      {/* Header */}
      <div className="bg-charcoal text-warm-cream px-4 py-3 flex items-center gap-3">
        <img src={LOGO_URL} alt="Logo" className="w-8 h-8 rounded" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-body text-warm-cream/60">Design Package Questionnaire</p>
          <p className="text-sm font-display truncate">
            {session.customerName ? `Hi, ${session.customerName.split(" ")[0]}` : "Welcome"}
          </p>
        </div>
        <Badge variant="outline" className="text-warm-cream/70 border-warm-cream/30 text-xs shrink-0">
          {currentStep + 1} / {visibleQuestions.length}
        </Badge>
      </div>

      {/* Section progress */}
      <SectionProgressBar
        sections={visibleSections}
        currentSection={currentSection}
        completedSections={completedSections}
      />

      {/* Overall progress bar */}
      <div className="h-0.5 bg-charcoal/10">
        <motion.div
          className="h-full bg-canyon"
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Question content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentQuestion.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {/* Section header badge — shown at first question of a new section */}
              {isNewSection && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2"
                >
                  <div className={`w-7 h-7 rounded-full ${SECTION_META[currentSection]?.color ?? "bg-canyon"} flex items-center justify-center text-white`}>
                    {SECTION_META[currentSection]?.icon}
                  </div>
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {SECTION_META[currentSection]?.label ?? currentSection}
                  </span>
                </motion.div>
              )}

              {/* Question text */}
              <div>
                <h2 className="text-xl font-display text-charcoal leading-snug">
                  {currentQuestion.text}
                </h2>
                {currentQuestion.subtext && (
                  <p className="text-sm text-muted-foreground mt-2 font-body leading-relaxed">
                    {currentQuestion.subtext}
                  </p>
                )}
                {currentQuestion.type === "multi" && (
                  <p className="text-xs text-canyon font-medium mt-2">Select all that apply</p>
                )}
                {isPhotoUpload && (
                  <p className="text-xs text-canyon font-medium mt-2">Optional — upload photos from your phone or camera</p>
                )}
              </div>

              {/* Render question by type */}
              {(() => {
                // ── Photo / File Upload ──
                if (isPhotoUpload) {
                  // plan_based section question 80020 accepts PDFs (architectural plans)
                  const isPlanUpload = currentQuestion.section === "plan_based" && currentQuestion.id === 80020;
                  const fileCategory = isPlanUpload ? "project_plans" : "reference_photo";
                  return (
                    <SessionFileUpload
                      questionId={currentQuestion.id}
                      questionText={currentQuestion.text}
                      sessionToken={token}
                      fileCategory={fileCategory}
                      state={currentPhotoState}
                      onStateChange={handlePhotoStateChange}
                      acceptPdf={isPlanUpload}
                    />
                  );
                }

                const inputType = currentQuestion.inputType || "options";

                // ── Yes / No ──
                if (inputType === "yes_no") {
                  const val = freeformAnswers[currentQuestion.id];
                  return (
                    <div className="grid grid-cols-2 gap-3">
                      {["Yes", "No"].map(opt => (
                        <button
                          key={opt}
                          onClick={() => setFreeformAnswers(p => ({ ...p, [currentQuestion.id]: opt }))}
                          className={`rounded-xl border-2 p-5 text-center transition-all duration-150
                            ${val === opt
                              ? "border-canyon bg-canyon/5 shadow-md"
                              : "border-border/60 bg-white hover:border-canyon/40 hover:shadow-sm"
                            }`}
                        >
                          <div className={`w-6 h-6 rounded-full border-2 mx-auto mb-2 flex items-center justify-center transition-colors
                            ${val === opt ? "bg-canyon border-canyon" : "border-border"}`}>
                            {val === opt && <Check className="w-3.5 h-3.5 text-white" />}
                          </div>
                          <p className="text-sm font-semibold text-charcoal">{opt}</p>
                        </button>
                      ))}
                    </div>
                  );
                }

                // ── Number ──
                if (inputType === "number") {
                  return (
                    <div className="max-w-xs">
                      <Input
                        type="number"
                        placeholder="Enter a number"
                        value={freeformAnswers[currentQuestion.id] ?? ""}
                        onChange={e => setFreeformAnswers(p => ({ ...p, [currentQuestion.id]: e.target.value }))}
                        className="text-lg h-12 border-2 border-border/60 focus:border-canyon rounded-xl"
                      />
                    </div>
                  );
                }

                // ── Dropdown ──
                if (inputType === "dropdown") {
                  const opts = currentQuestion.dropdownOptions ?? [];
                  return (
                    <div className="max-w-sm">
                      <Select
                        value={freeformAnswers[currentQuestion.id] ?? ""}
                        onValueChange={v => setFreeformAnswers(p => ({ ...p, [currentQuestion.id]: v }))}
                      >
                        <SelectTrigger className="h-12 border-2 border-border/60 rounded-xl text-sm">
                          <SelectValue placeholder="Select an option" />
                        </SelectTrigger>
                        <SelectContent>
                          {opts.map(opt => (
                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  );
                }

                // ── Checkboxes ──
                if (inputType === "checkboxes") {
                  const opts = currentQuestion.dropdownOptions ?? [];
                  const selected = checkboxAnswers[currentQuestion.id] ?? [];
                  return (
                    <div className="space-y-2">
                      {opts.map(opt => {
                        const checked = selected.includes(opt);
                        return (
                          <button
                            key={opt}
                            onClick={() => {
                              setCheckboxAnswers(p => {
                                const cur = p[currentQuestion.id] ?? [];
                                return {
                                  ...p,
                                  [currentQuestion.id]: checked
                                    ? cur.filter(v => v !== opt)
                                    : [...cur, opt],
                                };
                              });
                            }}
                            className={`w-full rounded-xl border-2 p-4 text-left transition-all duration-150 flex items-center gap-3
                              ${checked
                                ? "border-canyon bg-canyon/5 shadow-md"
                                : "border-border/60 bg-white hover:border-canyon/40"
                              }`}
                          >
                            <div className={`w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors
                              ${checked ? "bg-canyon border-canyon" : "border-border"}`}>
                              {checked && <Check className="w-3 h-3 text-white" />}
                            </div>
                            <span className="text-sm font-medium text-charcoal">{opt}</span>
                          </button>
                        );
                      })}
                    </div>
                  );
                }

                // ── Text ──
                if (inputType === "text") {
                  return (
                    <div>
                      <Textarea
                        placeholder="Type your answer here…"
                        value={freeformAnswers[currentQuestion.id] ?? ""}
                        onChange={e => setFreeformAnswers(p => ({ ...p, [currentQuestion.id]: e.target.value }))}
                        rows={4}
                        className="border-2 border-border/60 focus:border-canyon rounded-xl text-sm"
                      />
                    </div>
                  );
                }

                // ── Quantity Select ──
                if (currentQuestion.type === "quantity_select") {
                  return (
                    <QuantitySelectQuestion
                      question={currentQuestion}
                      selectedIds={answers[currentQuestion.id] ?? []}
                      quantities={quantities[currentQuestion.id] ?? {}}
                      onToggle={(optionId) => handleQuantityToggle(currentQuestion.id, optionId)}
                      onQuantityChange={(optionId, qty) => handleQuantityChange(currentQuestion.id, optionId, qty)}
                    />
                  );
                }

                // ── Visual Image Choice (options with imageUrl) ──
                if (hasImages) {
                  return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {currentQuestion.options
                        .sort((a, b) => a.sortOrder - b.sortOrder)
                        .map(option => {
                          const selected = (answers[currentQuestion.id] ?? []).includes(option.id);
                          return (
                            <button
                              key={option.id}
                              onClick={() => handleSelect(currentQuestion.id, option.id, currentQuestion.type as "single" | "multi")}
                              className={`relative rounded-2xl border-2 text-left transition-all duration-150 overflow-hidden group
                                ${selected
                                  ? "border-canyon shadow-lg shadow-canyon/20 scale-[1.01]"
                                  : "border-border/60 bg-white hover:border-canyon/50 hover:shadow-md"
                                }
                              `}
                            >
                              {/* Image */}
                              <div className="aspect-[4/3] overflow-hidden">
                                <img
                                  src={option.imageUrl!}
                                  alt={option.text}
                                  className={`w-full h-full object-cover transition-transform duration-300 ${
                                    selected ? "scale-105" : "group-hover:scale-102"
                                  }`}
                                />
                              </div>
                              {/* Tier badge */}
                              {option.pricingTier && (
                                <div className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-xs font-bold text-white shadow ${
                                  selected ? "bg-canyon" : "bg-black/50"
                                }`}>
                                  Level {option.pricingTier}
                                </div>
                              )}
                              {/* Selected checkmark */}
                              {selected && (
                                <div className="absolute top-2 right-2 w-7 h-7 bg-canyon rounded-full flex items-center justify-center shadow-lg">
                                  <Check className="w-4 h-4 text-white" />
                                </div>
                              )}
                              {/* Text */}
                              <div className={`p-3 border-t transition-colors ${selected ? "bg-canyon/5 border-canyon/20" : "border-border/40"}`}>
                                <p className="text-sm font-semibold text-charcoal leading-tight">{option.text}</p>
                                {option.subtext && (
                                  <p className="text-xs text-muted-foreground mt-1 leading-snug">{option.subtext}</p>
                                )}
                              </div>
                            </button>
                          );
                        })}
                    </div>
                  );
                }

                // ── Standard single / multi select (text only) ──
                return (
                  <div className="grid gap-2.5">
                    {currentQuestion.options
                      .sort((a, b) => a.sortOrder - b.sortOrder)
                      .map(option => {
                        const selected = (answers[currentQuestion.id] ?? []).includes(option.id);
                        return (
                          <button
                            key={option.id}
                            onClick={() => handleSelect(currentQuestion.id, option.id, currentQuestion.type as "single" | "multi")}
                            className={`relative rounded-xl border-2 text-left transition-all duration-150 p-4
                              ${selected
                                ? "border-canyon bg-canyon/5 shadow-md"
                                : "border-border/60 bg-white hover:border-canyon/40 hover:shadow-sm"
                              }
                            `}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-colors
                                ${selected ? "bg-canyon border-canyon" : "border-border"}`}
                              >
                                {selected && <Check className="w-3 h-3 text-white" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-charcoal">{option.text}</p>
                                {option.subtext && (
                                  <p className="text-xs text-muted-foreground mt-0.5">{option.subtext}</p>
                                )}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                  </div>
                );
              })()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Footer navigation */}
      <div className="bg-white border-t border-border/60 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          {currentStep > 0 && (
            <Button variant="outline" onClick={handleBack} className="gap-1.5">
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>
          )}
          <div className="flex-1" />
          {isLast ? (
            <Button
              onClick={handleNext}
              disabled={!canProceed}
              className="bg-canyon hover:bg-canyon/90 gap-2 min-w-[120px]"
            >
              Review <ClipboardList className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              disabled={!canProceed}
              className="bg-canyon hover:bg-canyon/90 gap-2 min-w-[120px]"
            >
              {isPhotoUpload && currentPhotoState.photoUrls.length === 0 ? "Skip" : "Next"}
              <ChevronRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Summary Review Screen ────────────────────────────────────────────────────

function SummaryReviewScreen({
  session,
  questions,
  visibleQuestions,
  answers,
  quantities,
  photoState,
  freeformAnswers,
  checkboxAnswers,
  submitting,
  onEdit,
  onSubmit,
}: {
  session: Session;
  questions: Question[];
  visibleQuestions: Question[];
  answers: Record<number, number[]>;
  quantities: Record<number, Record<string, number>>;
  photoState: Record<number, PhotoState>;
  freeformAnswers: Record<number, string>;
  checkboxAnswers: Record<number, string[]>;
  submitting: boolean;
  onEdit: (stepIndex: number) => void;
  onSubmit: () => void;
}) {
  // Helper: get option text by id within a question
  const getOptionText = (questionId: number, optionId: number) => {
    const q = questions.find(q => q.id === questionId);
    return q?.options.find(o => o.id === optionId)?.text ?? "—";
  };

  const stepOf = (questionId: number) =>
    visibleQuestions.findIndex(q => q.id === questionId);

  // Group visible questions by section
  const sectionGroups = useMemo(() => {
    const groups = new Map<string, Question[]>();
    for (const s of SECTION_ORDER) {
      const qs = visibleQuestions.filter(q => q.section === s);
      if (qs.length > 0) groups.set(s, qs);
    }
    return groups;
  }, [visibleQuestions]);

  // Check if any answers exist
  const hasAnyAnswer = useMemo(() => {
    return (
      Object.keys(answers).some(k => (answers[Number(k)]?.length ?? 0) > 0) ||
      Object.keys(freeformAnswers).length > 0 ||
      Object.keys(checkboxAnswers).length > 0 ||
      Object.values(photoState).some(s => s.photoUrls.length > 0)
    );
  }, [answers, freeformAnswers, checkboxAnswers, photoState]);

  return (
    <div className="min-h-screen bg-warm-cream flex flex-col">
      {/* Header */}
      <div className="bg-charcoal text-warm-cream px-4 py-4 flex items-center gap-3">
        <img src={LOGO_URL} alt="Logo" className="w-8 h-8 rounded" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-body text-warm-cream/60">Design Package Questionnaire</p>
          <p className="text-sm font-display truncate">
            {session.customerName ? `Hi, ${session.customerName.split(" ")[0]}` : "Welcome"}
          </p>
        </div>
        <Badge className="bg-canyon text-white border-0 text-xs shrink-0 gap-1">
          <ClipboardList className="w-3 h-3" /> Review
        </Badge>
      </div>

      <div className="h-0.5 bg-canyon" />

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-8 space-y-5">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="mb-6">
              <h2 className="text-2xl font-display text-charcoal">Review Your Answers</h2>
              <p className="text-sm text-muted-foreground mt-1 font-body">
                Take a moment to confirm everything looks right. Tap <strong>Edit</strong> on any section to go back and make changes.
              </p>
            </div>

            {!hasAnyAnswer && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 mb-4">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800">
                  It looks like no answers were recorded. Please go back and complete the questionnaire.
                </p>
              </div>
            )}

            {/* Render each section */}
            {Array.from(sectionGroups.entries()).map(([sectionKey, sectionQs]) => {
              const meta = SECTION_META[sectionKey];
              const firstStep = stepOf(sectionQs[0].id);

              // Check if section has any answers
              const sectionHasAnswers = sectionQs.some(q => {
                if (q.type === "photo_upload") return (photoState[q.id]?.photoUrls?.length ?? 0) > 0;
                const it = q.inputType || "options";
                if (it === "checkboxes") return (checkboxAnswers[q.id]?.length ?? 0) > 0;
                if (it === "number" || it === "yes_no" || it === "dropdown" || it === "text") return !!freeformAnswers[q.id];
                return (answers[q.id]?.length ?? 0) > 0;
              });

              return (
                <SummarySection
                  key={sectionKey}
                  icon={meta?.icon ?? <ClipboardList className="w-4 h-4" />}
                  title={meta?.label ?? sectionKey}
                  onEdit={() => onEdit(firstStep)}
                  isEmpty={!sectionHasAnswers}
                  emptyText={sectionKey === "photos_inspiration" ? "No photos uploaded (optional)" : "Not answered"}
                  emptyIsOk={sectionKey === "photos_inspiration" || sectionKey === "trade_upgrades"}
                >
                  <div className="space-y-3">
                    {sectionQs.map(q => {
                      const it = q.inputType || "options";

                      // Photo upload questions
                      if (q.type === "photo_upload") {
                        const photos = photoState[q.id]?.photoUrls ?? [];
                        if (photos.length === 0) return null;
                        return (
                          <div key={q.id} className="bg-warm-cream/60 rounded-lg p-3">
                            <p className="text-xs text-muted-foreground mb-2">{q.text}</p>
                            <div className="grid grid-cols-4 gap-1.5">
                              {photos.map((url, i) => {
                                const isPdf = url.toLowerCase().includes('.pdf') || url.includes('application/pdf');
                                return isPdf ? (
                                  <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                                    className="aspect-square rounded-lg border border-red-200 bg-red-50 flex flex-col items-center justify-center gap-1 hover:border-canyon/60 transition-colors p-2">
                                    <FileText className="w-6 h-6 text-red-500" />
                                    <span className="text-xs text-muted-foreground truncate w-full text-center">PDF</span>
                                  </a>
                                ) : (
                                  <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                                    className="aspect-square rounded-lg overflow-hidden border border-border/60 hover:border-canyon/60 transition-colors">
                                    <img src={url} alt={`File ${i + 1}`} className="w-full h-full object-cover" />
                                  </a>
                                );
                              })}
                            </div>
                          </div>
                        );
                      }

                      // Checkbox answers
                      if (it === "checkboxes") {
                        const vals = checkboxAnswers[q.id] ?? [];
                        if (vals.length === 0) return null;
                        return (
                          <div key={q.id} className="bg-warm-cream/60 rounded-lg px-3 py-2.5">
                            <p className="text-xs text-muted-foreground mb-1">{q.text}</p>
                            <div className="flex flex-wrap gap-1.5">
                              {vals.map(v => (
                                <Badge key={v} variant="outline" className="text-xs text-charcoal border-border/60">{v}</Badge>
                              ))}
                            </div>
                          </div>
                        );
                      }

                      // Freeform answers
                      if (it === "number" || it === "yes_no" || it === "dropdown" || it === "text") {
                        const val = freeformAnswers[q.id];
                        if (!val) return null;
                        return (
                          <div key={q.id} className="bg-warm-cream/60 rounded-lg px-3 py-2.5">
                            <p className="text-xs text-muted-foreground mb-0.5">{q.text}</p>
                            <p className="text-sm font-medium text-charcoal">{val}{it === "number" ? " sq ft" : ""}</p>
                          </div>
                        );
                      }

                      // Option-based answers
                      const selectedIds = answers[q.id] ?? [];
                      if (selectedIds.length === 0) return null;
                      const selectedTexts = selectedIds.map(id => getOptionText(q.id, id));
                      const selectedOptions = q.options.filter(o => selectedIds.includes(o.id));
                      const hasImage = selectedOptions.some(o => o.imageUrl);

                      return (
                        <div key={q.id} className="bg-warm-cream/60 rounded-lg px-3 py-2.5">
                          <p className="text-xs text-muted-foreground mb-1.5">{q.text}</p>
                          {hasImage ? (
                            <div className="flex items-center gap-3">
                              {selectedOptions[0]?.imageUrl && (
                                <img
                                  src={selectedOptions[0].imageUrl}
                                  alt={selectedOptions[0].text}
                                  className="w-16 h-12 object-cover rounded-lg border border-border/60"
                                />
                              )}
                              <div>
                                <p className="text-sm font-semibold text-charcoal">{selectedTexts[0]}</p>
                                {selectedOptions[0]?.pricingTier && (
                                  <Badge className="bg-canyon/10 text-canyon border-0 text-xs mt-0.5">
                                    Level {selectedOptions[0].pricingTier}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-1.5">
                              {selectedTexts.map((t, i) => (
                                <Badge key={i} variant="outline" className="text-xs text-charcoal border-border/60">{t}</Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </SummarySection>
              );
            })}

            {/* Disclaimer */}
            <div className="bg-white rounded-xl border border-border/60 p-4 text-xs text-muted-foreground leading-relaxed">
              By submitting, you agree that the information above will be shared with your sales representative to prepare a rough project estimate. This is not a binding quote.
            </div>
          </motion.div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-white border-t border-border/60 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => onEdit(visibleQuestions.length - 1)}
            className="gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
          <div className="flex-1" />
          <Button
            onClick={onSubmit}
            disabled={submitting}
            className="bg-canyon hover:bg-canyon/90 gap-2 min-w-[140px]"
          >
            {submitting ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</>
            ) : (
              <><CheckCircle2 className="w-4 h-4" /> Submit</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Summary Section Card ─────────────────────────────────────────────────────

function SummarySection({
  icon,
  title,
  onEdit,
  isEmpty,
  emptyText,
  emptyIsOk = false,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  onEdit: () => void;
  isEmpty: boolean;
  emptyText: string;
  emptyIsOk?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-border/60 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 bg-warm-cream/30">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-canyon/10 flex items-center justify-center text-canyon">
            {icon}
          </div>
          <span className="text-sm font-semibold text-charcoal">{title}</span>
        </div>
        <button
          onClick={onEdit}
          className="flex items-center gap-1.5 text-xs text-canyon font-medium hover:underline"
        >
          <Edit2 className="w-3.5 h-3.5" /> Edit
        </button>
      </div>
      <div className="p-4">
        {isEmpty ? (
          <div className={`flex items-center gap-2 ${emptyIsOk ? "text-muted-foreground" : "text-amber-600"}`}>
            {!emptyIsOk && <AlertCircle className="w-4 h-4 flex-shrink-0" />}
            <p className="text-sm italic">{emptyText}</p>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
