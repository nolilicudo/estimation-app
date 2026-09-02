import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Zap, Package, Hammer } from "lucide-react";
import type { PostWrapOption, PostWrapLengthTier } from "@/hooks/useConfig";

interface PostWrapSectionProps {
  enabled: boolean;
  onToggle: (v: boolean) => void;
  selectedOptionId: number | null;
  onSelectOption: (id: number) => void;
  linearFt: number;
  onLinearFtChange: (v: number) => void;
  postCount: number;
  onPostCountChange: (v: number) => void;
  beamLf: number;
  onBeamLfChange: (v: number) => void;
  autoPostCount: number;
  autoBeamLf: number;
  options: PostWrapOption[];
  lengthTiers: PostWrapLengthTier[];
  postWrapCost: number;
  postWrapMaterialCost: number;
  postWrapLaborCost: number;
  postWrapPostPieces: { lengthFt: number; count: number; priceEach: number }[];
  postWrapBeamPieces: { lengthFt: number; count: number; priceEach: number }[];
  /** Height of the deck in inches (used to show the post height in the UI) */
  deckHeightIn: number;
}

const OPTION_DESCRIPTIONS: Record<string, string> = {
  "none": "No post or beam wrap — leave structural members as-is.",
  "painted-cement-board": "Cement board panels wrapped around posts/beams and painted to match trim color. Durable, moisture-resistant, and paintable.",
  "stain-seal-wood": "Clean, sand, and apply a premium stain and sealant to the existing wood post or beam for a natural finished look.",
  "chamclad-wrap": "Chamclad composite wrap system — a low-maintenance, pre-finished wrap that installs directly over existing posts and beams.",
};

const fmt = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function PostWrapSection({
  enabled,
  onToggle,
  selectedOptionId,
  onSelectOption,
  linearFt,
  onLinearFtChange,
  postCount,
  onPostCountChange,
  beamLf,
  onBeamLfChange,
  autoPostCount,
  autoBeamLf,
  options,
  lengthTiers,
  postWrapCost,
  postWrapMaterialCost,
  postWrapLaborCost,
  postWrapPostPieces,
  postWrapBeamPieces,
  deckHeightIn,
}: PostWrapSectionProps) {
  const selectedOpt = options.find(o => o.id === selectedOptionId);
  const isPostCountAuto = postCount === autoPostCount;
  const isBeamLfAuto = beamLf === autoBeamLf;

  const optionTiers = selectedOpt
    ? lengthTiers.filter(t => t.postWrapOptionId === selectedOpt.id).sort((a, b) => a.lengthFt - b.lengthFt)
    : [];
  const hasTiers = optionTiers.length > 0;

  const postHeightFt = deckHeightIn > 0 ? (deckHeightIn / 12).toFixed(1) : null;

  return (
    <div className="space-y-4">
      {/* Toggle */}
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-base font-semibold text-stone-800">Post &amp; Beam Wrap</Label>
          <p className="text-sm text-stone-500 mt-0.5">
            Finish your structural posts and beams for a polished, cohesive look.
          </p>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={onToggle}
          className="data-[state=checked]:bg-canyon-rust"
        />
      </div>

      {enabled && (
        <div className="space-y-5 pt-2 border-t border-stone-200">
          {/* Post count + Beam LF inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Post Count */}
            <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="postwrap-posts" className="text-sm font-semibold text-stone-700">
                  Number of Posts
                </Label>
                {isPostCountAuto && (
                  <Badge variant="outline" className="text-xs text-emerald-700 border-emerald-300 bg-emerald-50 gap-1">
                    <Zap className="w-3 h-3" />
                    Auto-filled
                  </Badge>
                )}
              </div>
              <p className="text-xs text-stone-500">
                Posts to be wrapped. Auto-filled from your framing layout.
              </p>
              <div className="flex items-center gap-2">
                <Input
                  id="postwrap-posts"
                  type="number"
                  min={0}
                  step={1}
                  value={postCount}
                  onChange={(e) => onPostCountChange(Math.max(0, Number(e.target.value)))}
                  className="text-center font-semibold w-24"
                />
                <span className="text-sm text-stone-500">posts</span>
              </div>
              {postHeightFt && (
                <p className="text-xs text-stone-500 italic">
                  Deck height: {postHeightFt} ft per post
                </p>
              )}
              {isPostCountAuto && (
                <p className="text-xs text-emerald-600 italic">
                  Based on {autoPostCount} posts at current post spacing
                </p>
              )}
            </div>

            {/* Beam LF */}
            <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="postwrap-beamlf" className="text-sm font-semibold text-stone-700">
                  Beam Lineal Feet
                </Label>
                {isBeamLfAuto && (
                  <Badge variant="outline" className="text-xs text-emerald-700 border-emerald-300 bg-emerald-50 gap-1">
                    <Zap className="w-3 h-3" />
                    Auto-filled
                  </Badge>
                )}
              </div>
              <p className="text-xs text-stone-500">
                Total LF of beams to be wrapped. Auto-filled from deck width.
              </p>
              <div className="flex items-center gap-2">
                <Input
                  id="postwrap-beamlf"
                  type="number"
                  min={0}
                  step={1}
                  value={beamLf}
                  onChange={(e) => onBeamLfChange(Math.max(0, Number(e.target.value)))}
                  className="text-center font-semibold w-24"
                />
                <span className="text-sm text-stone-500">LF</span>
              </div>
              {isBeamLfAuto && (
                <p className="text-xs text-emerald-600 italic">
                  Based on {autoBeamLf} LF from deck width
                </p>
              )}
            </div>
          </div>

          {/* Option picker */}
          <RadioGroup
            value={selectedOptionId !== null ? String(selectedOptionId) : ""}
            onValueChange={(v) => onSelectOption(Number(v))}
            className="grid grid-cols-1 sm:grid-cols-2 gap-3"
          >
            {options.map((opt) => {
              const isSelected = opt.id === selectedOptionId;
              const tiers = lengthTiers.filter(t => t.postWrapOptionId === opt.id).sort((a, b) => a.lengthFt - b.lengthFt);
              const showLegacyRate = tiers.length === 0 && (opt.pricePerLf > 0 || opt.laborPricePerLf > 0);
              return (
                <label
                  key={opt.id}
                  htmlFor={`postwrap-${opt.id}`}
                  className={`relative flex flex-col gap-1 rounded-xl border-2 p-4 cursor-pointer transition-all ${
                    isSelected
                      ? "border-canyon-rust bg-canyon-rust/5 shadow-sm"
                      : "border-stone-200 bg-white hover:border-stone-400"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value={String(opt.id)} id={`postwrap-${opt.id}`} className="sr-only" />
                    <span className={`font-semibold text-sm ${isSelected ? "text-canyon-rust" : "text-stone-800"}`}>
                      {opt.name}
                    </span>
                  </div>
                  <p className="text-xs text-stone-500 leading-snug">
                    {OPTION_DESCRIPTIONS[opt.slug] ?? opt.description ?? ""}
                  </p>
                  {/* Show available length tiers as chips */}
                  {tiers.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {tiers.map(t => (
                        <span key={t.id} className="text-xs bg-stone-100 text-stone-600 rounded px-1.5 py-0.5">
                          {t.lengthFt}' — ${fmt(t.materialPricePerPiece)}/pc
                        </span>
                      ))}
                    </div>
                  )}
                  {showLegacyRate && (
                    <span className="mt-1 text-xs font-medium text-stone-600">
                      ${(opt.pricePerLf + opt.laborPricePerLf).toFixed(2)}/LF
                    </span>
                  )}
                  {/* Per-post / per-beam-LF labor rates */}
                  {(opt.laborPricePerPost > 0 || opt.laborPricePerBeamLf > 0) && (
                    <div className="flex gap-2 mt-1 flex-wrap">
                      {opt.laborPricePerPost > 0 && (
                        <span className="text-xs text-stone-500">Labor: ${fmt(opt.laborPricePerPost)}/post</span>
                      )}
                      {opt.laborPricePerBeamLf > 0 && (
                        <span className="text-xs text-stone-500">Beam labor: ${fmt(opt.laborPricePerBeamLf)}/LF</span>
                      )}
                    </div>
                  )}
                </label>
              );
            })}
          </RadioGroup>

          {/* Legacy total LF override — only shown when no tiers configured */}
          {selectedOpt && selectedOpt.slug !== "none" && !hasTiers && (
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Label htmlFor="postwrap-lf" className="text-sm font-medium text-stone-700">
                  Total Post &amp; Beam Linear Footage
                </Label>
                <p className="text-xs text-stone-500 mt-0.5">
                  Override the total LF if needed (posts + beams combined).
                </p>
              </div>
              <div className="w-28">
                <Input
                  id="postwrap-lf"
                  type="number"
                  min={0}
                  step={1}
                  value={linearFt}
                  onChange={(e) => onLinearFtChange(Math.max(0, Number(e.target.value)))}
                  className="text-center font-semibold"
                />
                <p className="text-xs text-center text-stone-400 mt-0.5">linear ft</p>
              </div>
            </div>
          )}

          {/* Material + Labor breakdown — shown when tiers are configured */}
          {selectedOpt && selectedOpt.slug !== "none" && hasTiers && postWrapCost > 0 && (
            <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 space-y-3">
              <p className="text-sm font-semibold text-stone-700">Wrap Package Breakdown</p>

              {/* Post material pieces */}
              {postWrapPostPieces.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-stone-600">
                    <Package className="w-3.5 h-3.5" />
                    Post Wrap Material
                  </div>
                  {postWrapPostPieces.map((p, i) => (
                    <div key={i} className="flex justify-between text-xs text-stone-600 pl-5">
                      <span>{p.count} × {p.lengthFt}' piece{p.count !== 1 ? "s" : ""}</span>
                      <span>${fmt(p.count * p.priceEach)}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Beam material pieces */}
              {postWrapBeamPieces.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-stone-600">
                    <Package className="w-3.5 h-3.5" />
                    Beam Wrap Material
                  </div>
                  {postWrapBeamPieces.map((p, i) => (
                    <div key={i} className="flex justify-between text-xs text-stone-600 pl-5">
                      <span>{p.count} × {p.lengthFt}' piece{p.count !== 1 ? "s" : ""}</span>
                      <span>${fmt(p.count * p.priceEach)}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Labor */}
              {postWrapLaborCost > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-stone-600">
                    <Hammer className="w-3.5 h-3.5" />
                    Installation Labor
                  </div>
                  {selectedOpt.laborPricePerPost > 0 && postCount > 0 && (
                    <div className="flex justify-between text-xs text-stone-600 pl-5">
                      <span>{postCount} post{postCount !== 1 ? "s" : ""} × ${fmt(selectedOpt.laborPricePerPost)}/post</span>
                      <span>${fmt(postCount * selectedOpt.laborPricePerPost)}</span>
                    </div>
                  )}
                  {selectedOpt.laborPricePerBeamLf > 0 && beamLf > 0 && (
                    <div className="flex justify-between text-xs text-stone-600 pl-5">
                      <span>{beamLf} LF beam × ${fmt(selectedOpt.laborPricePerBeamLf)}/LF</span>
                      <span>${fmt(beamLf * selectedOpt.laborPricePerBeamLf)}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Subtotals */}
              <div className="border-t border-stone-200 pt-2 space-y-1">
                {postWrapMaterialCost > 0 && (
                  <div className="flex justify-between text-xs text-stone-600">
                    <span>Material subtotal</span>
                    <span>${fmt(postWrapMaterialCost)}</span>
                  </div>
                )}
                {postWrapLaborCost > 0 && (
                  <div className="flex justify-between text-xs text-stone-600">
                    <span>Labor subtotal</span>
                    <span>${fmt(postWrapLaborCost)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold text-canyon-rust">
                  <span>Post &amp; Beam Wrap Total</span>
                  <span>${fmt(postWrapCost)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Simple cost preview — shown when no tiers (legacy mode) */}
          {postWrapCost > 0 && !hasTiers && (
            <div className="flex items-center justify-between rounded-lg bg-stone-50 border border-stone-200 px-4 py-3">
              <span className="text-sm font-medium text-stone-700">Post &amp; Beam Wrap Total</span>
              <span className="text-base font-bold text-canyon-rust">
                ${fmt(postWrapCost)}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
