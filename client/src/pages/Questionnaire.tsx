/**
 * Public Questionnaire Page — /questionnaire/:token
 *
 * Two-mode rough pricing questionnaire:
 *  - "I know what I need" → select rooms + trades → pick finish photos per trade
 *  - "Help me decide" → select rooms → pick finish photos per trade (no trade pre-selection)
 */
import { useState, useMemo } from "react";
import { useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { CheckCircle, ChevronRight, ChevronLeft, Home, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Constants ────────────────────────────────────────────────────────────────

const ROOMS = [
  { key: "kitchen", label: "Kitchen", icon: "🍳" },
  { key: "living_room", label: "Living Room", icon: "🛋️" },
  { key: "game_room", label: "Game Room", icon: "🎮" },
  { key: "office", label: "Office", icon: "💼" },
  { key: "bedroom", label: "Bedroom", icon: "🛏️" },
  { key: "powder_room", label: "Powder Room", icon: "🚿" },
  { key: "master_bathroom", label: "Master Bathroom", icon: "🛁" },
  { key: "full_bathroom", label: "Full Bathroom", icon: "🚿" },
];

const ROOM_QUESTIONS: Record<string, { key: string; label: string; type: "text" | "number" | "select"; options?: string[] }[]> = {
  kitchen: [
    { key: "lineal_feet_cabinetry", label: "Lineal feet of cabinetry", type: "number" },
    { key: "island_seats", label: "Number of seats at the island", type: "number" },
    { key: "sqft", label: "Approximate square footage", type: "number" },
  ],
  living_room: [
    { key: "has_fireplace", label: "Does it include a fireplace?", type: "select", options: ["Yes", "No"] },
    { key: "has_builtins", label: "Built-ins / entertainment center?", type: "select", options: ["Yes", "No"] },
    { key: "sqft", label: "Approximate square footage", type: "number" },
  ],
  game_room: [
    { key: "has_builtins", label: "Built-ins / shelving?", type: "select", options: ["Yes", "No"] },
    { key: "has_wet_bar", label: "Wet bar?", type: "select", options: ["Yes", "No"] },
    { key: "sqft", label: "Approximate square footage", type: "number" },
  ],
  office: [
    { key: "has_builtins", label: "Built-ins / bookshelves?", type: "select", options: ["Yes", "No"] },
    { key: "has_wet_bar", label: "Wet bar / coffee station?", type: "select", options: ["Yes", "No"] },
    { key: "sqft", label: "Approximate square footage", type: "number" },
  ],
  bedroom: [
    { key: "closet_type", label: "Closet type", type: "select", options: ["Standard", "Walk-in", "Walk-in with built-ins"] },
    { key: "has_builtins", label: "Built-ins / accent wall?", type: "select", options: ["Yes", "No"] },
    { key: "sqft", label: "Approximate square footage", type: "number" },
  ],
  powder_room: [
    { key: "sqft", label: "Approximate square footage", type: "number" },
    { key: "vanity_length", label: "Vanity length (inches)", type: "number" },
  ],
  master_bathroom: [
    { key: "shower_type", label: "Shower type", type: "select", options: ["Walk-in shower", "Walk-in shower + soaker tub", "Walk-in shower + freestanding tub"] },
    { key: "vanity_length", label: "Vanity length (inches)", type: "number" },
    { key: "has_tub", label: "Tub included?", type: "select", options: ["Yes", "No"] },
    { key: "tile_selection", label: "Tile selection preference", type: "select", options: ["Builder grade", "Mid-grade", "High-end", "Ultra-premium"] },
    { key: "plumbing_fixture_selection", label: "Plumbing fixture preference", type: "select", options: ["Builder grade", "Mid-grade", "High-end", "Ultra-premium"] },
    { key: "sqft", label: "Approximate square footage", type: "number" },
  ],
  full_bathroom: [
    { key: "shower_type", label: "Shower type", type: "select", options: ["Tub/shower combo", "Walk-in shower"] },
    { key: "sqft", label: "Approximate square footage", type: "number" },
  ],
};

const TRADES = [
  { key: "cabinetry", label: "Cabinetry" },
  { key: "countertops", label: "Countertops" },
  { key: "flooring", label: "Flooring" },
  { key: "tile", label: "Tile" },
  { key: "plumbing_fixtures", label: "Plumbing Fixtures" },
  { key: "lighting", label: "Lighting" },
  { key: "paint", label: "Paint & Finishes" },
  { key: "trim_millwork", label: "Trim & Millwork" },
];

// ─── Types ────────────────────────────────────────────────────────────────────

type RoomDetails = Record<string, string>;
type TradeSelection = { tradeKey: string; selectedPhotoIds: number[]; notes: string };

// ─── Component ────────────────────────────────────────────────────────────────

export default function Questionnaire() {
  const [, params] = useRoute("/questionnaire/:token");
  const token = params?.token ?? "";

  const { data: existing, isLoading: loadingExisting } = trpc.questionnaire.getByToken.useQuery({ token }, { enabled: !!token });
  const { data: allPhotos, isLoading: loadingPhotos } = trpc.questionnaire.getActivePhotos.useQuery({});

  const submitMutation = trpc.questionnaire.submit.useMutation();

  // ── Wizard state ──────────────────────────────────────────────────────────
  const [step, setStep] = useState<"mode" | "rooms" | "room_details" | "trades" | "finish_photos" | "done">("mode");
  const [mode, setMode] = useState<"know" | "help" | null>(null);
  const [selectedRooms, setSelectedRooms] = useState<string[]>([]);
  const [roomDetails, setRoomDetails] = useState<Record<string, RoomDetails>>({});
  const [currentRoomIdx, setCurrentRoomIdx] = useState(0);
  const [selectedTrades, setSelectedTrades] = useState<string[]>([]);
  const [tradeSelections, setTradeSelections] = useState<Record<string, TradeSelection>>({});
  const [currentTradeIdx, setCurrentTradeIdx] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  const photosByTrade = useMemo(() => {
    const map: Record<string, typeof allPhotos> = {};
    (allPhotos ?? []).forEach((p) => {
      if (!map[p.tradeKey]) map[p.tradeKey] = [];
      map[p.tradeKey]!.push(p);
    });
    return map;
  }, [allPhotos]);

  const activeTrades = mode === "know" ? selectedTrades : TRADES.map((t) => t.key);
  const tradesWithPhotos = activeTrades.filter((t) => (photosByTrade[t]?.length ?? 0) > 0);

  if (!token) return <div className="min-h-screen flex items-center justify-center"><p className="text-muted-foreground">Invalid questionnaire link.</p></div>;
  if (loadingExisting) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-amber-700" /></div>;
  if (!existing) return <div className="min-h-screen flex items-center justify-center"><p className="text-muted-foreground">This questionnaire link is not valid or has expired.</p></div>;

  if (existing.submission.status === "completed" && !submitted) {
    return (
      <div className="min-h-screen bg-warm-cream flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-8">
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-stone-800 mb-2">Already Submitted</h2>
            <p className="text-stone-600">Your questionnaire has already been completed. Your design consultant will review your answers and be in touch soon.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-warm-cream flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-8">
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-stone-800 mb-2">Thank You!</h2>
            <p className="text-stone-600 mb-4">Your answers have been saved. Your design consultant will review them and reach out before your consultation.</p>
            <p className="text-sm text-stone-500">You can close this window.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleSubmit = async () => {
    const rooms = selectedRooms.map((roomKey) => ({ roomKey, details: roomDetails[roomKey] ?? {} }));
    const trades = tradesWithPhotos.map((tradeKey) => ({
      tradeKey,
      selectedPhotoIds: tradeSelections[tradeKey]?.selectedPhotoIds ?? [],
      notes: tradeSelections[tradeKey]?.notes ?? "",
    }));
    await submitMutation.mutateAsync({ token, mode: mode!, rooms, trades });
    setSubmitted(true);
  };

  const toggleRoom = (key: string) => {
    setSelectedRooms((prev) => prev.includes(key) ? prev.filter((r) => r !== key) : [...prev, key]);
  };

  const toggleTrade = (key: string) => {
    setSelectedTrades((prev) => prev.includes(key) ? prev.filter((t) => t !== key) : [...prev, key]);
  };

  const togglePhoto = (tradeKey: string, photoId: number) => {
    setTradeSelections((prev) => {
      const current = prev[tradeKey] ?? { tradeKey, selectedPhotoIds: [], notes: "" };
      const ids = current.selectedPhotoIds.includes(photoId)
        ? current.selectedPhotoIds.filter((id) => id !== photoId)
        : [...current.selectedPhotoIds, photoId];
      return { ...prev, [tradeKey]: { ...current, selectedPhotoIds: ids } };
    });
  };

  const setTradeNotes = (tradeKey: string, notes: string) => {
    setTradeSelections((prev) => {
      const current = prev[tradeKey] ?? { tradeKey, selectedPhotoIds: [], notes: "" };
      return { ...prev, [tradeKey]: { ...current, notes } };
    });
  };

  const updateRoomDetail = (roomKey: string, fieldKey: string, value: string) => {
    setRoomDetails((prev) => ({ ...prev, [roomKey]: { ...(prev[roomKey] ?? {}), [fieldKey]: value } }));
  };

  // ── Render steps ──────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 to-amber-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-stone-800 to-amber-900 text-white py-6 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-1">
            <Home className="w-5 h-5 text-amber-300" />
            <span className="text-amber-300 text-sm font-medium">Design Your Price</span>
          </div>
          <h1 className="text-2xl font-bold">Rough Pricing Questionnaire</h1>
          <p className="text-stone-300 text-sm mt-1">Hi {existing.submission.customerName} — let's understand your project goals.</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 py-8">

        {/* Step: Mode selection */}
        {step === "mode" && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-stone-800 mb-6">How would you like to approach this?</h2>
            <div className="grid gap-4">
              <Card
                className={cn("cursor-pointer border-2 transition-all hover:shadow-md", mode === "know" ? "border-amber-600 bg-amber-50" : "border-stone-200")}
                onClick={() => setMode("know")}
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="text-3xl">🎯</div>
                    <div>
                      <h3 className="font-bold text-stone-800 text-lg">I know what I need help with</h3>
                      <p className="text-stone-600 text-sm mt-1">I have specific trades in mind (cabinetry, flooring, tile, etc.) and want to select finish levels for each one.</p>
                    </div>
                    {mode === "know" && <CheckCircle className="w-5 h-5 text-amber-600 ml-auto shrink-0" />}
                  </div>
                </CardContent>
              </Card>
              <Card
                className={cn("cursor-pointer border-2 transition-all hover:shadow-md", mode === "help" ? "border-amber-600 bg-amber-50" : "border-stone-200")}
                onClick={() => setMode("help")}
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="text-3xl">💡</div>
                    <div>
                      <h3 className="font-bold text-stone-800 text-lg">Help me make decisions</h3>
                      <p className="text-stone-600 text-sm mt-1">I'm not sure what I need yet. Show me photos of different finish levels and I'll pick what appeals to me.</p>
                    </div>
                    {mode === "help" && <CheckCircle className="w-5 h-5 text-amber-600 ml-auto shrink-0" />}
                  </div>
                </CardContent>
              </Card>
            </div>
            <div className="flex justify-end pt-4">
              <Button disabled={!mode} onClick={() => setStep("rooms")} className="bg-amber-700 hover:bg-amber-800">
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Step: Room selection */}
        {step === "rooms" && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-stone-800">Which areas are included in your project?</h2>
            <p className="text-stone-600 text-sm">Select all that apply.</p>
            <div className="grid grid-cols-2 gap-3">
              {ROOMS.map((room) => (
                <Card
                  key={room.key}
                  className={cn("cursor-pointer border-2 transition-all hover:shadow-sm", selectedRooms.includes(room.key) ? "border-amber-600 bg-amber-50" : "border-stone-200")}
                  onClick={() => toggleRoom(room.key)}
                >
                  <CardContent className="p-4 flex items-center gap-3">
                    <span className="text-2xl">{room.icon}</span>
                    <span className="font-medium text-stone-800 text-sm">{room.label}</span>
                    {selectedRooms.includes(room.key) && <CheckCircle className="w-4 h-4 text-amber-600 ml-auto shrink-0" />}
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep("mode")}><ChevronLeft className="w-4 h-4 mr-1" /> Back</Button>
              <Button disabled={selectedRooms.length === 0} onClick={() => { setCurrentRoomIdx(0); setStep("room_details"); }} className="bg-amber-700 hover:bg-amber-800">
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Step: Room details (one room at a time) */}
        {step === "room_details" && (() => {
          const roomKey = selectedRooms[currentRoomIdx];
          const room = ROOMS.find((r) => r.key === roomKey);
          const questions = ROOM_QUESTIONS[roomKey] ?? [];
          const details = roomDetails[roomKey] ?? {};
          const isLast = currentRoomIdx === selectedRooms.length - 1;

          return (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-stone-500">
                <span>Room {currentRoomIdx + 1} of {selectedRooms.length}</span>
                <div className="flex gap-1 ml-2">
                  {selectedRooms.map((_, i) => (
                    <div key={i} className={cn("w-2 h-2 rounded-full", i <= currentRoomIdx ? "bg-amber-600" : "bg-stone-200")} />
                  ))}
                </div>
              </div>
              <h2 className="text-xl font-bold text-stone-800">{room?.icon} {room?.label}</h2>
              {questions.length === 0 ? (
                <p className="text-stone-500 italic text-sm">No specific questions for this room.</p>
              ) : (
                <div className="space-y-4">
                  {questions.map((q) => (
                    <div key={q.key}>
                      <Label className="text-stone-700 font-medium">{q.label}</Label>
                      {q.type === "select" ? (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {q.options!.map((opt) => (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => updateRoomDetail(roomKey, q.key, opt)}
                              className={cn("px-3 py-1.5 rounded-full text-sm border transition-all", details[q.key] === opt ? "bg-amber-600 text-white border-amber-600" : "bg-white text-stone-700 border-stone-300 hover:border-amber-400")}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <Input
                          type="number"
                          className="mt-1"
                          placeholder="Enter a number"
                          value={details[q.key] ?? ""}
                          onChange={(e) => updateRoomDetail(roomKey, q.key, e.target.value)}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => { if (currentRoomIdx === 0) setStep("rooms"); else setCurrentRoomIdx((i) => i - 1); }}>
                  <ChevronLeft className="w-4 h-4 mr-1" /> Back
                </Button>
                <Button
                  onClick={() => {
                    if (isLast) {
                      if (mode === "know") setStep("trades");
                      else { setCurrentTradeIdx(0); setStep("finish_photos"); }
                    } else {
                      setCurrentRoomIdx((i) => i + 1);
                    }
                  }}
                  className="bg-amber-700 hover:bg-amber-800"
                >
                  {isLast ? "Continue" : "Next Room"} <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          );
        })()}

        {/* Step: Trade selection (only for "know" mode) */}
        {step === "trades" && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-stone-800">Which trades are included in your project?</h2>
            <p className="text-stone-600 text-sm">Select all the areas where you need new finishes or work done.</p>
            <div className="grid grid-cols-2 gap-3">
              {TRADES.map((trade) => (
                <Card
                  key={trade.key}
                  className={cn("cursor-pointer border-2 transition-all hover:shadow-sm", selectedTrades.includes(trade.key) ? "border-amber-600 bg-amber-50" : "border-stone-200")}
                  onClick={() => toggleTrade(trade.key)}
                >
                  <CardContent className="p-4 flex items-center gap-2">
                    <span className="font-medium text-stone-800 text-sm">{trade.label}</span>
                    {selectedTrades.includes(trade.key) && <CheckCircle className="w-4 h-4 text-amber-600 ml-auto shrink-0" />}
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => { setCurrentRoomIdx(selectedRooms.length - 1); setStep("room_details"); }}>
                <ChevronLeft className="w-4 h-4 mr-1" /> Back
              </Button>
              <Button
                disabled={selectedTrades.length === 0}
                onClick={() => { setCurrentTradeIdx(0); setStep("finish_photos"); }}
                className="bg-amber-700 hover:bg-amber-800"
              >
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Step: Finish photos (one trade at a time) */}
        {step === "finish_photos" && (() => {
          const tradeKey = tradesWithPhotos[currentTradeIdx];
          if (!tradeKey) {
            // No trades with photos — go straight to submit
            return (
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-stone-800">Almost done!</h2>
                <p className="text-stone-600">We have all the information we need. Click Submit to send your answers to your design consultant.</p>
                <div className="flex justify-between pt-4">
                  <Button variant="outline" onClick={() => mode === "know" ? setStep("trades") : setStep("room_details")}>
                    <ChevronLeft className="w-4 h-4 mr-1" /> Back
                  </Button>
                  <Button onClick={handleSubmit} disabled={submitMutation.isPending} className="bg-amber-700 hover:bg-amber-800">
                    {submitMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Submitting…</> : "Submit Questionnaire"}
                  </Button>
                </div>
              </div>
            );
          }
          const trade = TRADES.find((t) => t.key === tradeKey);
          const photos = photosByTrade[tradeKey] ?? [];
          const selection = tradeSelections[tradeKey] ?? { tradeKey, selectedPhotoIds: [], notes: "" };
          const isLast = currentTradeIdx === tradesWithPhotos.length - 1;

          return (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-stone-500">
                <span>Trade {currentTradeIdx + 1} of {tradesWithPhotos.length}</span>
                <div className="flex gap-1 ml-2">
                  {tradesWithPhotos.map((_, i) => (
                    <div key={i} className={cn("w-2 h-2 rounded-full", i <= currentTradeIdx ? "bg-amber-600" : "bg-stone-200")} />
                  ))}
                </div>
              </div>
              <h2 className="text-xl font-bold text-stone-800">{trade?.label} — Finish Level</h2>
              <p className="text-stone-600 text-sm">Select the photos that best represent the style and finish level you're looking for. You can pick multiple.</p>
              {loadingPhotos ? (
                <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-amber-700" /></div>
              ) : photos.length === 0 ? (
                <p className="text-stone-500 italic text-sm">No inspiration photos available for this trade yet.</p>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {photos.map((photo) => (
                    <div
                      key={photo.id}
                      onClick={() => togglePhoto(tradeKey, photo.id)}
                      className={cn("cursor-pointer rounded-xl overflow-hidden border-2 transition-all", selection.selectedPhotoIds.includes(photo.id) ? "border-amber-600 ring-2 ring-amber-400" : "border-stone-200 hover:border-amber-300")}
                    >
                      <div className="relative">
                        <img src={photo.photoUrl} alt={photo.title || trade?.label} className="w-full h-40 object-cover" />
                        {selection.selectedPhotoIds.includes(photo.id) && (
                          <div className="absolute top-2 right-2 bg-amber-600 rounded-full p-0.5">
                            <CheckCircle className="w-4 h-4 text-white" />
                          </div>
                        )}
                      </div>
                      {(photo.title || photo.subtitle) && (
                        <div className="p-2 bg-white">
                          {photo.title && <p className="text-sm font-medium text-stone-800">{photo.title}</p>}
                          {photo.subtitle && <p className="text-xs text-stone-500">{photo.subtitle}</p>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <div>
                <Label className="text-stone-700 font-medium text-sm">Additional notes for {trade?.label} (optional)</Label>
                <Textarea
                  className="mt-1"
                  placeholder="Any specific preferences, brands, or details…"
                  value={selection.notes}
                  onChange={(e) => setTradeNotes(tradeKey, e.target.value)}
                  rows={2}
                />
              </div>
              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => {
                  if (currentTradeIdx === 0) {
                    if (mode === "know") setStep("trades");
                    else { setCurrentRoomIdx(selectedRooms.length - 1); setStep("room_details"); }
                  } else {
                    setCurrentTradeIdx((i) => i - 1);
                  }
                }}>
                  <ChevronLeft className="w-4 h-4 mr-1" /> Back
                </Button>
                {isLast ? (
                  <Button onClick={handleSubmit} disabled={submitMutation.isPending} className="bg-amber-700 hover:bg-amber-800">
                    {submitMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Submitting…</> : "Submit Questionnaire"}
                  </Button>
                ) : (
                  <Button onClick={() => setCurrentTradeIdx((i) => i + 1)} className="bg-amber-700 hover:bg-amber-800">
                    Next Trade <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                )}
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
