/**
 * QuestionnaireBuilderPanel
 * Admin panel for building the dynamic pre-visit questionnaire:
 *   - Questions tab: create/edit/delete questions with single/multi-select options,
 *     images per option, and branching logic (show question only when a specific
 *     answer was given to a parent question)
 *   - Price Rules tab: define base price ranges with conditions
 *   - Sent Questionnaires tab: search by phone, view responses and rough estimates
 */
import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Plus, Trash2, Pencil, ChevronDown, ChevronRight, ImageIcon, X, Upload,
  GripVertical, Eye, EyeOff, DollarSign, HelpCircle, CheckSquare, Circle,
  Send, Search, Phone, Mail, User, Calendar, ExternalLink, Calculator,
  ListFilter, Layers, Hash, Type, ToggleLeft, Percent, Zap, BookOpen, Link2,
  ChevronLeft, ChevronRight as ChevronRightIcon, Filter, RefreshCw, AlertCircle,
  Package, Building2, ArrowUpDown, FileText, FolderOpen, Square,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface QuestionOption {
  id: number;
  questionId: number;
  text: string;
  subtext: string | null;
  imageUrl: string | null;
  sortOrder: number;
  priceAdjustment: string | null;
  priceAdjustmentType: "flat" | "percent" | "none";
  pricingTier: number | null;
}

interface CalculationRule {
  name: string;
  conditionType: "always_apply" | "equals" | "greater_than" | "less_than" | "between" | "contains";
  conditionValue?: string | number | [number, number];
  fixedCost?: number;
  formula?: string;
  description?: string;
}

interface Question {
  id: number;
  text: string;
  subtext: string | null;
  type: "single" | "multi" | "quantity_select" | "voice_photo" | "photo_upload";
  inputType: string;
  dropdownOptions: string[] | null;
  imageUrl: string | null;
  sortOrder: number;
  isActive: number;
  calculationRules: CalculationRule[] | null;
  tradeCategory: string | null;
  displayOrder: string | null;
  section: string | null;
  parentQuestionId: number | null;
  parentOptionId: number | null;
  applicableProjectTypes: Array<"bathroom" | "kitchen" | "addition" | "basement"> | null;
  options: QuestionOption[];
}

interface TierMultiplier {
  id: number;
  sectionKey: string;
  sectionLabel: string;
  tier: number;
  multiplier: string;
  tierLabel: string;
  weight: string;
}

interface PricingAddon {
  id: number;
  questionId: number;
  optionId: number | null;
  label: string;
  amount: string;
  isActive: number;
}

interface PriceRule {
  id: number;
  name: string;
  baseMin: string;
  baseMax: string;
  conditions: Array<{ questionId: number; optionIds: number[] }>;
  sortOrder: number;
  isActive: number;
}

interface QuestionnaireSession {
  id: number;
  sessionToken: string;
  customerName: string | null;
  customerPhone: string | null;
  customerEmail: string | null;
  salesRepName: string | null;
  notes: string | null;
  estimatedMin: string | null;
  estimatedMax: string | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

export function QuestionnaireBuilderPanel() {
  return (
    <Tabs defaultValue="questions" className="space-y-6">
      <TabsList className="bg-white border border-border/60 shadow-sm flex-wrap h-auto gap-1 p-1">
        <TabsTrigger value="questions" className="gap-1.5 text-xs sm:text-sm">
          <HelpCircle className="w-4 h-4" /> Questions
        </TabsTrigger>
        <TabsTrigger value="catalog" className="gap-1.5 text-xs sm:text-sm">
          <BookOpen className="w-4 h-4" /> Cost Catalog
        </TabsTrigger>
        <TabsTrigger value="pricing-rules" className="gap-1.5 text-xs sm:text-sm">
          <Calculator className="w-4 h-4" /> Pricing Rules
        </TabsTrigger>
        <TabsTrigger value="price-rules" className="gap-1.5 text-xs sm:text-sm">
          <DollarSign className="w-4 h-4" /> Base Prices
        </TabsTrigger>
        <TabsTrigger value="tier-multipliers" className="gap-1.5 text-xs sm:text-sm">
          <Percent className="w-4 h-4" /> Tier Multipliers
        </TabsTrigger>
        <TabsTrigger value="addons" className="gap-1.5 text-xs sm:text-sm">
          <Zap className="w-4 h-4" /> Add-ons
        </TabsTrigger>
        <TabsTrigger value="cabinets" className="gap-1.5 text-xs sm:text-sm">
          <Package className="w-4 h-4" /> Cabinetry
        </TabsTrigger>
        <TabsTrigger value="sent" className="gap-1.5 text-xs sm:text-sm">
          <Send className="w-4 h-4" /> Sent Questionnaires
        </TabsTrigger>
      </TabsList>
      <TabsContent value="questions"><QuestionsTab /></TabsContent>
      <TabsContent value="catalog"><CatalogTab /></TabsContent>
      <TabsContent value="pricing-rules"><PricingRulesTab /></TabsContent>
      <TabsContent value="price-rules"><PriceRulesTab /></TabsContent>
      <TabsContent value="tier-multipliers"><TierMultipliersTab /></TabsContent>
      <TabsContent value="addons"><PricingAddonsTab /></TabsContent>
      <TabsContent value="cabinets"><CabinetPricingTab /></TabsContent>
      <TabsContent value="sent"><SentQuestionnairesTab /></TabsContent>
    </Tabs>
  );
}

// ─── Questions Tab ────────────────────────────────────────────────────────────

const PROJECT_TYPE_SUBTABS = [
  { key: "bathroom" as const, label: "Bathroom" },
  { key: "kitchen" as const, label: "Kitchen" },
  { key: "addition" as const, label: "Addition" },
  { key: "basement" as const, label: "Basement" },
  { key: "general" as const, label: "General (All Types)" },
];

function QuestionsTab() {
  const [activeProjectType, setActiveProjectType] = useState<"bathroom" | "kitchen" | "addition" | "basement" | "general">("bathroom");

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-display text-charcoal">Questionnaire Questions</h3>
        <p className="text-sm text-muted-foreground mt-0.5">
          Each tab shows only questions tagged to that project type. Questions with no project type assigned appear in the <strong>General (All Types)</strong> tab and are shown in every questionnaire.
        </p>
      </div>

      {/* Project type sub-tabs */}
      <div className="flex flex-wrap gap-1 border-b border-border">
        {PROJECT_TYPE_SUBTABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveProjectType(tab.key)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              activeProjectType === tab.key
                ? "bg-canyon text-white border border-b-0 border-canyon"
                : "text-muted-foreground hover:text-charcoal hover:bg-muted/50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeProjectType === "general"
        ? <GeneralQuestionsPanel />
        : <ProjectTypeQuestionsPanel projectType={activeProjectType} />}
    </div>
  );
}

function ProjectTypeQuestionsPanel({ projectType }: { projectType: "bathroom" | "kitchen" | "addition" | "basement" }) {
  const utils = trpc.useUtils();
  const { data: questions = [], isLoading } = trpc.questionnaire.listQuestions.useQuery();
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const deleteQuestion = trpc.questionnaire.deleteQuestion.useMutation({
    onSuccess: () => { utils.questionnaire.listQuestions.invalidate(); toast.success("Question deleted"); },
    onError: () => toast.error("Failed to delete question"),
  });

  const toggleActive = trpc.questionnaire.updateQuestion.useMutation({
    onSuccess: () => utils.questionnaire.listQuestions.invalidate(),
    onError: () => toast.error("Failed to update question"),
  });

  // Filter: show ONLY questions explicitly tagged to this project type.
  // Untagged questions (null/empty applicableProjectTypes) are NOT shown in any
  // single-type tab — they only appear in the "General" tab (handled separately).
  const allTyped = questions as Question[];
  const filteredQuestions = allTyped.filter(q => {
    const types = q.applicableProjectTypes;
    return types && types.length > 0 && types.includes(projectType);
  });

  // Root questions (no parent) within the filtered set
  const filteredIds = new Set(filteredQuestions.map(q => q.id));
  const rootQuestions = filteredQuestions.filter(q => !q.parentQuestionId || !filteredIds.has(q.parentQuestionId));

  // Child questions indexed by parentQuestionId
  const childMap = new Map<number, Question[]>();
  allTyped.filter(q => q.parentQuestionId).forEach(q => {
    const arr = childMap.get(q.parentQuestionId!) ?? [];
    arr.push(q);
    childMap.set(q.parentQuestionId!, arr);
  });

  const allRootIds = rootQuestions.map(q => q.id);
  const allSelected = allRootIds.length > 0 && allRootIds.every(id => selectedIds.has(id));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allRootIds));
    }
  };

  const toggleSelectOne = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} selected question${selectedIds.size !== 1 ? "s" : ""}? This cannot be undone.`)) return;
    setBulkDeleting(true);
    let deleted = 0;
    for (const id of Array.from(selectedIds)) {
      try {
        await deleteQuestion.mutateAsync({ id });
        deleted++;
      } catch {
        // continue
      }
    }
    setSelectedIds(new Set());
    setSelectMode(false);
    setBulkDeleting(false);
    toast.success(`Deleted ${deleted} question${deleted !== 1 ? "s" : ""}`);
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  if (isLoading) return <div className="text-center py-12 text-muted-foreground">Loading questions…</div>;

  const label = PROJECT_TYPE_SUBTABS.find(t => t.key === projectType)?.label ?? projectType;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3">
        {!selectMode ? (
          <>
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-charcoal">{rootQuestions.length}</span> root question{rootQuestions.length !== 1 ? "s" : ""} for <span className="font-semibold text-charcoal">{label}</span>
            </p>
            <div className="flex items-center gap-2">
              {rootQuestions.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectMode(true)}
                  className="gap-1.5 text-xs h-8"
                >
                  <CheckSquare className="w-3.5 h-3.5" /> Select
                </Button>
              )}
              <Button onClick={() => setShowCreateDialog(true)} className="gap-2 bg-canyon hover:bg-canyon/90">
                <Plus className="w-4 h-4" /> Add Question
              </Button>
            </div>
          </>
        ) : (
          <>
            {/* Select mode toolbar */}
            <div className="flex items-center gap-3">
              <button
                onClick={toggleSelectAll}
                className="flex items-center gap-2 text-sm font-medium text-charcoal hover:text-canyon transition-colors"
              >
                {allSelected
                  ? <CheckSquare className="w-4 h-4 text-canyon" />
                  : <Square className="w-4 h-4 text-muted-foreground" />
                }
                {allSelected ? "Deselect All" : "Select All"}
              </button>
              <span className="text-sm text-muted-foreground">
                {selectedIds.size} selected
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={exitSelectMode}
                className="gap-1.5 text-xs h-8"
              >
                <X className="w-3.5 h-3.5" /> Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleBulkDelete}
                disabled={selectedIds.size === 0 || bulkDeleting}
                className="gap-1.5 text-xs h-8 bg-red-500 hover:bg-red-600 text-white"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {bulkDeleting ? "Deleting…" : `Delete ${selectedIds.size > 0 ? selectedIds.size : ""} Selected`}
              </Button>
            </div>
          </>
        )}
      </div>

      {rootQuestions.length === 0 && (
        <div className="text-center py-16 border-2 border-dashed border-border rounded-xl">
          <HelpCircle className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">No questions for {label} yet</p>
          <p className="text-sm text-muted-foreground mt-1">Add questions or tag existing questions to this project type.</p>
        </div>
      )}

      <div className="space-y-3">
        {rootQuestions.map((q, idx) => (
          <div key={q.id} className="flex items-start gap-2">
            {/* Checkbox column in select mode */}
            {selectMode && (
              <button
                onClick={() => toggleSelectOne(q.id)}
                className="mt-4 shrink-0 p-1 rounded hover:bg-muted transition-colors"
                aria-label={selectedIds.has(q.id) ? "Deselect" : "Select"}
              >
                {selectedIds.has(q.id)
                  ? <CheckSquare className="w-5 h-5 text-canyon" />
                  : <Square className="w-5 h-5 text-muted-foreground" />
                }
              </button>
            )}
            <div className={`flex-1 min-w-0 transition-opacity ${selectMode && !selectedIds.has(q.id) ? "opacity-60" : ""}`}>
              <QuestionCard
                question={q}
                index={idx}
                allQuestions={allTyped}
                childMap={childMap}
                expanded={expandedId === q.id}
                onToggleExpand={() => setExpandedId(expandedId === q.id ? null : q.id)}
                onEdit={() => setEditingQuestion(q)}
                onDelete={() => { if (confirm(`Delete "${q.text}"?`)) deleteQuestion.mutate({ id: q.id }); }}
                onToggleActive={() => toggleActive.mutate({ id: q.id, isActive: q.isActive === 1 ? 0 : 1 })}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Create Question Dialog — pre-select current project type */}
      {showCreateDialog && (
        <QuestionFormDialog
          allQuestions={allTyped}
          defaultProjectType={projectType}
          onClose={() => setShowCreateDialog(false)}
          onSaved={() => { utils.questionnaire.listQuestions.invalidate(); setShowCreateDialog(false); }}
        />
      )}

      {/* Edit Question Dialog */}
      {editingQuestion && (
        <QuestionFormDialog
          question={editingQuestion}
          allQuestions={allTyped}
          onClose={() => setEditingQuestion(null)}
          onSaved={() => { utils.questionnaire.listQuestions.invalidate(); setEditingQuestion(null); }}
        />
      )}
    </div>
  );
}

// ─── General Questions Panel (untagged / all-types questions) ───────────────

function GeneralQuestionsPanel() {
  const utils = trpc.useUtils();
  const { data: questions = [], isLoading } = trpc.questionnaire.listQuestions.useQuery();
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const deleteQuestion = trpc.questionnaire.deleteQuestion.useMutation({
    onSuccess: () => { utils.questionnaire.listQuestions.invalidate(); toast.success("Question deleted"); },
    onError: () => toast.error("Failed to delete question"),
  });

  const toggleActive = trpc.questionnaire.updateQuestion.useMutation({
    onSuccess: () => utils.questionnaire.listQuestions.invalidate(),
    onError: () => toast.error("Failed to update question"),
  });

  const allTyped = questions as Question[];
  // General tab: questions with no project type tags (null or empty array)
  const filteredQuestions = allTyped.filter(q => {
    const types = q.applicableProjectTypes;
    return !types || types.length === 0;
  });

  const filteredIds = new Set(filteredQuestions.map(q => q.id));
  const rootQuestions = filteredQuestions.filter(q => !q.parentQuestionId || !filteredIds.has(q.parentQuestionId));

  const childMap = new Map<number, Question[]>();
  allTyped.filter(q => q.parentQuestionId).forEach(q => {
    const arr = childMap.get(q.parentQuestionId!) ?? [];
    arr.push(q);
    childMap.set(q.parentQuestionId!, arr);
  });

  const allRootIds = rootQuestions.map(q => q.id);
  const allSelected = allRootIds.length > 0 && allRootIds.every(id => selectedIds.has(id));

  const toggleSelectAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(allRootIds));
  };

  const toggleSelectOne = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} selected question${selectedIds.size !== 1 ? "s" : ""}? This cannot be undone.`)) return;
    setBulkDeleting(true);
    let deleted = 0;
    for (const id of Array.from(selectedIds)) {
      try { await deleteQuestion.mutateAsync({ id }); deleted++; } catch { /* continue */ }
    }
    setSelectedIds(new Set());
    setSelectMode(false);
    setBulkDeleting(false);
    toast.success(`Deleted ${deleted} question${deleted !== 1 ? "s" : ""}`);
  };

  const exitSelectMode = () => { setSelectMode(false); setSelectedIds(new Set()); };

  if (isLoading) return <div className="text-center py-12 text-muted-foreground">Loading questions…</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
        <span className="text-amber-700 text-sm">These questions have <strong>no project type assigned</strong> and will appear in every questionnaire regardless of project type. To restrict a question to specific types, edit it and select the applicable types.</span>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3">
        {!selectMode ? (
          <>
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-charcoal">{rootQuestions.length}</span> general question{rootQuestions.length !== 1 ? "s" : ""} (shown for all project types)
            </p>
            <div className="flex items-center gap-2">
              {rootQuestions.length > 0 && (
                <Button variant="outline" size="sm" onClick={() => setSelectMode(true)} className="gap-1.5 text-xs h-8">
                  <CheckSquare className="w-3.5 h-3.5" /> Select
                </Button>
              )}
              <Button onClick={() => setShowCreateDialog(true)} className="gap-2 bg-canyon hover:bg-canyon/90">
                <Plus className="w-4 h-4" /> Add Question
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <button onClick={toggleSelectAll} className="flex items-center gap-2 text-sm font-medium text-charcoal hover:text-canyon transition-colors">
                {allSelected ? <CheckSquare className="w-4 h-4 text-canyon" /> : <Square className="w-4 h-4 text-muted-foreground" />}
                {allSelected ? "Deselect All" : "Select All"}
              </button>
              <span className="text-sm text-muted-foreground">{selectedIds.size} selected</span>
            </div>
            <div className="flex items-center gap-2">
              {selectedIds.size > 0 && (
                <Button variant="destructive" size="sm" onClick={handleBulkDelete} disabled={bulkDeleting} className="gap-1.5 text-xs h-8">
                  <Trash2 className="w-3.5 h-3.5" /> Delete {selectedIds.size} Selected
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={exitSelectMode} className="text-xs h-8">Cancel</Button>
            </div>
          </>
        )}
      </div>

      {rootQuestions.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-base font-medium">No general questions yet</p>
          <p className="text-sm mt-1">Questions added here will appear in all four project type questionnaires.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {rootQuestions.map((q, idx) => (
            <div key={q.id} className="flex items-start gap-2">
              {selectMode && (
                <button onClick={() => toggleSelectOne(q.id)} className="mt-3 shrink-0">
                  {selectedIds.has(q.id)
                    ? <CheckSquare className="w-4 h-4 text-canyon" />
                    : <Square className="w-4 h-4 text-muted-foreground" />}
                </button>
              )}
              <div className="flex-1 min-w-0">
                <QuestionCard
                  question={q}
                  index={idx}
                  allQuestions={allTyped}
                  childMap={childMap}
                  expanded={expandedId === q.id}
                  onToggleExpand={() => setExpandedId(expandedId === q.id ? null : q.id)}
                  onEdit={() => setEditingQuestion(q)}
                  onDelete={() => deleteQuestion.mutate({ id: q.id })}
                  onToggleActive={() => toggleActive.mutate({ id: q.id, isActive: q.isActive ? 0 : 1 })}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateDialog && (
        <QuestionFormDialog
          allQuestions={allTyped}
          onClose={() => setShowCreateDialog(false)}
          onSaved={() => { utils.questionnaire.listQuestions.invalidate(); setShowCreateDialog(false); }}
        />
      )}
      {editingQuestion && (
        <QuestionFormDialog
          question={editingQuestion}
          allQuestions={allTyped}
          onClose={() => setEditingQuestion(null)}
          onSaved={() => { utils.questionnaire.listQuestions.invalidate(); setEditingQuestion(null); }}
        />
      )}
    </div>
  );
}

// ─── Question Card ────────────────────────────────────────────────────────────

function QuestionCard({
  question, index, allQuestions, childMap, expanded, onToggleExpand, onEdit, onDelete, onToggleActive,
}: {
  question: Question;
  index: number;
  allQuestions: Question[];
  childMap: Map<number, Question[]>;
  expanded: boolean;
  onToggleExpand: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
}) {
  const utils = trpc.useUtils();
  const [showAddOption, setShowAddOption] = useState(false);
  const [editingOption, setEditingOption] = useState<QuestionOption | null>(null);

  const deleteOption = trpc.questionnaire.deleteOption.useMutation({
    onSuccess: () => { utils.questionnaire.listQuestions.invalidate(); toast.success("Option deleted"); },
    onError: () => toast.error("Failed to delete option"),
  });

  const parentQuestion = question.parentQuestionId ? allQuestions.find(q => q.id === question.parentQuestionId) : null;
  const parentOption = question.parentOptionId ? parentQuestion?.options.find(o => o.id === question.parentOptionId) : null;
  const childQuestions = childMap.get(question.id) ?? [];

  return (
    <div className={`bg-white rounded-xl border shadow-sm overflow-hidden transition-all ${question.isActive === 1 ? "border-border/60" : "border-border/30 opacity-60"}`}>
      {/* Header */}
      <div className="flex items-center gap-3 p-4">
        <GripVertical className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" />
        <div className="w-7 h-7 rounded-full bg-canyon/10 flex items-center justify-center flex-shrink-0">
          <span className="text-xs font-bold text-canyon">{index + 1}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-charcoal text-sm truncate">{question.text}</span>
            <Badge variant="outline" className="text-xs shrink-0">
              {question.type === "single" && <><Circle className="w-3 h-3 mr-1" />Single</>}
              {question.type === "multi" && <><CheckSquare className="w-3 h-3 mr-1" />Multi</>}
              {question.type === "quantity_select" && <><CheckSquare className="w-3 h-3 mr-1" />Qty Select</>}
              {question.type === "voice_photo" && <>🎤 Voice + Photo</>}
            </Badge>
            {question.inputType && question.inputType !== "options" && (
              <Badge variant="outline" className="text-xs shrink-0 bg-blue-50 text-blue-700 border-blue-200">
                <Type className="w-3 h-3 mr-1" />{question.inputType.replace("_", "/")}
              </Badge>
            )}
            {question.tradeCategory && (
              <Badge variant="outline" className="text-xs shrink-0 bg-purple-50 text-purple-700 border-purple-200">
                <Layers className="w-3 h-3 mr-1" />{question.tradeCategory}
              </Badge>
            )}
            {question.calculationRules && question.calculationRules.length > 0 && (
              <Badge variant="outline" className="text-xs shrink-0 bg-green-50 text-green-700 border-green-200">
                <Calculator className="w-3 h-3 mr-1" />{question.calculationRules.length} rule{question.calculationRules.length !== 1 ? "s" : ""}
              </Badge>
            )}
            {question.applicableProjectTypes && question.applicableProjectTypes.length > 0 && (
              question.applicableProjectTypes.length > 1 ? (
                // Multi-type: show a distinct "Shared" badge with a tooltip listing all types
                <Badge
                  variant="outline"
                  className="text-xs shrink-0 bg-violet-50 text-violet-700 border-violet-300 gap-1 cursor-default"
                  title={`Shared across: ${question.applicableProjectTypes.map(t => t.charAt(0).toUpperCase() + t.slice(1)).join(", ")}`}
                >
                  <Link2 className="w-3 h-3" />
                  Shared · {question.applicableProjectTypes.map(t => t.charAt(0).toUpperCase() + t.slice(1)).join(" / ")}
                </Badge>
              ) : (
                // Single type: plain orange badge
                <Badge variant="outline" className="text-xs shrink-0 bg-orange-50 text-orange-700 border-orange-200">
                  {question.applicableProjectTypes[0].charAt(0).toUpperCase() + question.applicableProjectTypes[0].slice(1)} only
                </Badge>
              )
            )}
            {parentOption && (
              <Badge variant="secondary" className="text-xs shrink-0 bg-amber-50 text-amber-700 border-amber-200">
                if: "{parentOption.text}"
              </Badge>
            )}
          </div>
          {question.subtext && <p className="text-xs text-muted-foreground mt-0.5 truncate">{question.subtext}</p>}
          <p className="text-xs text-muted-foreground mt-0.5">{question.options.length} option{question.options.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={onToggleActive} className="p-1.5 rounded hover:bg-muted transition-colors" title={question.isActive ? "Deactivate" : "Activate"}>
            {question.isActive === 1 ? <Eye className="w-4 h-4 text-green-600" /> : <EyeOff className="w-4 h-4 text-muted-foreground" />}
          </button>
          <button onClick={onEdit} className="p-1.5 rounded hover:bg-muted transition-colors">
            <Pencil className="w-4 h-4 text-muted-foreground" />
          </button>
          <button onClick={onDelete} className="p-1.5 rounded hover:bg-red-50 transition-colors">
            <Trash2 className="w-4 h-4 text-red-400" />
          </button>
          <button onClick={onToggleExpand} className="p-1.5 rounded hover:bg-muted transition-colors">
            {expanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
          </button>
        </div>
      </div>

      {/* Expanded: options */}
      {expanded && (
        <div className="border-t border-border/40 bg-warm-cream/30 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-charcoal uppercase tracking-wide">Answer Options</span>
            <Button size="sm" variant="outline" onClick={() => setShowAddOption(true)} className="gap-1.5 h-7 text-xs">
              <Plus className="w-3 h-3" /> Add Option
            </Button>
          </div>

          {question.options.length === 0 && (
            <p className="text-xs text-muted-foreground italic">No options yet. Add answer choices above.</p>
          )}

          <div className="space-y-2">
            {question.options.map(opt => (
              <div key={opt.id} className="flex items-center gap-3 bg-white rounded-lg border border-border/40 p-3">
                {opt.imageUrl && (
                  <img src={opt.imageUrl} alt={opt.text} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                )}
                {!opt.imageUrl && (
                  <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                    <ImageIcon className="w-5 h-5 text-muted-foreground/40" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-charcoal">{opt.text}</p>
                  {opt.subtext && <p className="text-xs text-muted-foreground">{opt.subtext}</p>}
                  {opt.priceAdjustmentType !== "none" && (
                    <p className="text-xs text-green-700 mt-0.5">
                      {opt.priceAdjustmentType === "flat" ? `+$${opt.priceAdjustment}` : `+${opt.priceAdjustment}%`}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => setEditingOption(opt)} className="p-1.5 rounded hover:bg-muted transition-colors">
                    <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                  <button onClick={() => { if (confirm(`Delete option "${opt.text}"?`)) deleteOption.mutate({ id: opt.id }); }} className="p-1.5 rounded hover:bg-red-50 transition-colors">
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Child questions */}
          {childQuestions.length > 0 && (
            <div className="mt-4 space-y-2">
              <span className="text-xs font-semibold text-charcoal uppercase tracking-wide">Branching Questions</span>
              {childQuestions.map(child => {
                const triggerOption = question.options.find(o => o.id === child.parentOptionId);
                return (
                  <div key={child.id} className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <ChevronRight className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-amber-700 font-medium">If "{triggerOption?.text ?? "?"}" →</p>
                      <p className="text-sm font-medium text-charcoal">{child.text}</p>
                    </div>
                    <Badge variant="outline" className="text-xs shrink-0">
                      {child.options.length} options
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Add Option Dialog */}
      {showAddOption && (
        <OptionFormDialog
          questionId={question.id}
          onClose={() => setShowAddOption(false)}
          onSaved={() => { utils.questionnaire.listQuestions.invalidate(); setShowAddOption(false); }}
        />
      )}

      {/* Edit Option Dialog */}
      {editingOption && (
        <OptionFormDialog
          questionId={question.id}
          option={editingOption}
          onClose={() => setEditingOption(null)}
          onSaved={() => { utils.questionnaire.listQuestions.invalidate(); setEditingOption(null); }}
        />
      )}
    </div>
  );
}

// ─── Question Form Dialog ─────────────────────────────────────────────────────

// ─── Section Metadata ───────────────────────────────────────────────────────

const SECTIONS = [
  { value: "project_basics", label: "1 · Project Basics" },
  { value: "existing_conditions", label: "2 · Existing Home Conditions" },
  { value: "site_access", label: "3 · Site & Access" },
  { value: "structure_foundation_roof", label: "4 · Structure / Foundation / Roof" },
  { value: "mechanical_electrical_plumbing", label: "5 · Mechanical, Electrical & Plumbing" },
  { value: "exterior_finishes", label: "6 · Exterior Finishes" },
  { value: "interior_finishes", label: "7 · Interior Finishes" },
  { value: "trade_upgrades", label: "8 · Trade-Specific Feature Upgrades" },
  { value: "overall_finish_level", label: "9 · Overall Finish Level" },
  { value: "photos_inspiration", label: "10 · Photos / Inspiration Images" },
];

const SECTION_LABELS: Record<string, string> = Object.fromEntries(SECTIONS.map(s => [s.value, s.label]));

const SECTION_ORDER = [
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

const TRADE_CATEGORIES = [
  "01 - General Requirements",
  "02 - Existing Conditions",
  "03 - Concrete",
  "04 - Masonry",
  "05 - Metals",
  "06 - Wood, Plastics, and Composites",
  "07 - Thermal and Moisture Protection",
  "08 - Openings",
  "09 - Finishes",
  "10 - Specialties",
  "11 - Equipment",
  "12 - Furnishings",
  "13 - Special Construction",
  "14 - Conveying Equipment",
  "21 - Fire Suppression",
  "22 - Plumbing",
  "23 - HVAC",
  "26 - Electrical",
  "27 - Communications",
  "31 - Earthwork",
  "32 - Exterior Improvements",
  "33 - Utilities",
];

const CONDITION_TYPES = [
  { value: "always_apply", label: "Always Apply" },
  { value: "equals", label: "Equals" },
  { value: "greater_than", label: "Greater Than" },
  { value: "less_than", label: "Less Than" },
  { value: "between", label: "Between" },
  { value: "contains", label: "Contains" },
];

const INPUT_TYPES = [
  { value: "options", label: "Options (cards)" },
  { value: "yes_no", label: "Yes / No" },
  { value: "number", label: "Number" },
  { value: "dropdown", label: "Dropdown" },
  { value: "checkboxes", label: "Checkboxes" },
  { value: "text", label: "Text" },
];

function QuestionFormDialog({
  question, allQuestions, onClose, onSaved, defaultProjectType,
}: {
  question?: Question;
  allQuestions: Question[];
  onClose: () => void;
  onSaved: () => void;
  defaultProjectType?: "bathroom" | "kitchen" | "addition" | "basement";
}) {
  const [text, setText] = useState(question?.text ?? "");
  const [subtext, setSubtext] = useState(question?.subtext ?? "");
  const [type, setType] = useState<"single" | "multi" | "quantity_select" | "voice_photo" | "photo_upload">(question?.type ?? "single");
  const [inputType, setInputType] = useState(question?.inputType ?? "options");
  const [dropdownOpts, setDropdownOpts] = useState<string>(question?.dropdownOptions?.join("\n") ?? "");
  const [tradeCategory, setTradeCategory] = useState(question?.tradeCategory ?? "");
  const [displayOrder, setDisplayOrder] = useState(question?.displayOrder ?? "");
  const [section, setSection] = useState(question?.section ?? "");
  const [parentQuestionId, setParentQuestionId] = useState<string>(question?.parentQuestionId ? String(question.parentQuestionId) : "");
  const [parentOptionId, setParentOptionId] = useState<string>(question?.parentOptionId ? String(question.parentOptionId) : "");
  const [sortOrder, setSortOrder] = useState(question?.sortOrder ?? 0);
  const [calcRules, setCalcRules] = useState<CalculationRule[]>(question?.calculationRules ?? []);
  const [applicableProjectTypes, setApplicableProjectTypes] = useState<Array<"bathroom" | "kitchen" | "addition" | "basement">>(
    question?.applicableProjectTypes ?? (defaultProjectType ? [defaultProjectType] : [])
  );
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("basic");

  const create = trpc.questionnaire.createQuestion.useMutation();
  const update = trpc.questionnaire.updateQuestion.useMutation();

  const parentQuestion = allQuestions.find(q => q.id === Number(parentQuestionId));
  const parentOptions = parentQuestion?.options ?? [];

  const addRule = () => {
    setCalcRules([...calcRules, { name: "", conditionType: "always_apply", fixedCost: 0, formula: "", description: "" }]);
  };
  const removeRule = (idx: number) => setCalcRules(calcRules.filter((_, i) => i !== idx));
  const updateRule = (idx: number, field: string, value: unknown) => {
    setCalcRules(calcRules.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  };

  const handleSave = async () => {
    if (!text.trim()) { toast.error("Question text is required"); return; }
    setSaving(true);
    try {
      const ddOpts = (inputType === "dropdown" || inputType === "checkboxes")
        ? dropdownOpts.split("\n").map(s => s.trim()).filter(Boolean)
        : undefined;
      const rulesPayload = calcRules.filter(r => r.name.trim()).length > 0
        ? calcRules.filter(r => r.name.trim())
        : undefined;

      if (question) {
        await update.mutateAsync({
          id: question.id,
          text: text.trim(),
          subtext: subtext.trim() || undefined,
          type,
          inputType,
          dropdownOptions: ddOpts ?? null,
          sortOrder,
          calculationRules: rulesPayload ?? null,
          tradeCategory: tradeCategory || null,
          displayOrder: displayOrder ? Number(displayOrder) : null,
          section: section || null,
          parentQuestionId: parentQuestionId ? Number(parentQuestionId) : null,
          parentOptionId: parentOptionId ? Number(parentOptionId) : null,
          applicableProjectTypes: applicableProjectTypes.length > 0 ? applicableProjectTypes : null,
        });
        toast.success("Question updated");
      } else {
        await create.mutateAsync({
          text: text.trim(),
          subtext: subtext.trim(),
          type,
          inputType,
          dropdownOptions: ddOpts,
          sortOrder,
          calculationRules: rulesPayload,
          tradeCategory: tradeCategory || undefined,
          displayOrder: displayOrder ? Number(displayOrder) : undefined,
          section: section || undefined,
          parentQuestionId: parentQuestionId ? Number(parentQuestionId) : null,
          parentOptionId: parentOptionId ? Number(parentOptionId) : null,
          applicableProjectTypes: applicableProjectTypes.length > 0 ? applicableProjectTypes : undefined,
        });
        toast.success("Question created");
      }
      onSaved();
    } catch {
      toast.error("Failed to save question");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{question ? "Edit Question" : "Add Question"}</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-2">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="basic" className="text-xs">Basic Info</TabsTrigger>
            <TabsTrigger value="input" className="text-xs">Input Config</TabsTrigger>
            <TabsTrigger value="rules" className="text-xs">Calc Rules</TabsTrigger>
            <TabsTrigger value="logic" className="text-xs">Follow-Up</TabsTrigger>
          </TabsList>

          {/* ── Basic Info Tab ── */}
          <TabsContent value="basic" className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Question Text *</Label>
              <Textarea value={text} onChange={e => setText(e.target.value)} placeholder="e.g. What type of project are you planning?" rows={2} />
            </div>
            <div className="space-y-1.5">
              <Label>Subtext (optional)</Label>
              <Input value={subtext} onChange={e => setSubtext(e.target.value)} placeholder="e.g. Select the option that best describes your project" />
            </div>
            {/* Section selector */}
            <div className="space-y-1.5">
              <Label>Section *</Label>
              <p className="text-xs text-muted-foreground">Which of the 10 sections does this question belong to?</p>
              <Select value={section || "none"} onValueChange={v => setSection(v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Select a section" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— No section —</SelectItem>
                  {SECTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Answer Type</Label>
                <Select value={type} onValueChange={v => setType(v as "single" | "multi" | "quantity_select" | "voice_photo" | "photo_upload")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">Single Select</SelectItem>
                    <SelectItem value="multi">Multi Select</SelectItem>
                    <SelectItem value="quantity_select">Quantity Select</SelectItem>
                    <SelectItem value="voice_photo">Voice + Photo</SelectItem>
                    <SelectItem value="photo_upload">Photo Upload</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Sort Order</Label>
                <Input type="number" value={sortOrder} onChange={e => setSortOrder(Number(e.target.value))} />
              </div>
            </div>
            {/* Project Type Filter */}
            <div className="space-y-2">
              <Label>Applicable Project Types</Label>
              <p className="text-xs text-muted-foreground">Which design package types should see this question? Leave all unchecked to show for every type.</p>
              <div className="flex flex-wrap gap-3">
                {(["bathroom", "kitchen", "addition", "basement"] as const).map(pt => {
                  const labels: Record<string, string> = { bathroom: "Bathroom", kitchen: "Kitchen", addition: "Addition", basement: "Basement" };
                  const checked = applicableProjectTypes.includes(pt);
                  return (
                    <label key={pt} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border cursor-pointer text-sm transition-colors ${
                      checked ? "bg-canyon/10 border-canyon text-canyon font-medium" : "border-border text-muted-foreground hover:border-canyon/50"
                    }`}>
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={checked}
                        onChange={e => {
                          if (e.target.checked) setApplicableProjectTypes([...applicableProjectTypes, pt]);
                          else setApplicableProjectTypes(applicableProjectTypes.filter(t => t !== pt));
                        }}
                      />
                      {checked && <span className="text-canyon">✓</span>}
                      {labels[pt]}
                    </label>
                  );
                })}
              </div>
              {applicableProjectTypes.length === 0 && (
                <p className="text-xs text-green-600">Shown for all project types (Bathroom, Kitchen, Addition, Basement)</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Trade Category (optional)</Label>
                <Select value={tradeCategory || "none"} onValueChange={v => setTradeCategory(v === "none" ? "" : v)}>
                  <SelectTrigger className="text-sm"><SelectValue placeholder="Uncategorized" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Uncategorized</SelectItem>
                    {TRADE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Display Order (optional)</Label>
                <Input type="number" step="0.1" value={displayOrder} onChange={e => setDisplayOrder(e.target.value)} placeholder="e.g. 1.0" />
              </div>
            </div>
          </TabsContent>

          {/* ── Input Configuration Tab ── */}
          <TabsContent value="input" className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Input Type</Label>
              <p className="text-xs text-muted-foreground">How the customer will answer this question.</p>
              <Select value={inputType} onValueChange={setInputType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {INPUT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {inputType === "options" && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-700">Options are managed in the question card below after saving. Add option cards with images and price adjustments.</p>
              </div>
            )}

            {inputType === "yes_no" && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-700">The customer will see two buttons: <strong>Yes</strong> and <strong>No</strong>. Use Calculation Rules to attach pricing based on the answer.</p>
              </div>
            )}

            {inputType === "number" && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-700">The customer enters a numeric value. Use formula variables like <code className="bg-blue-100 px-1 rounded">answer</code>, <code className="bg-blue-100 px-1 rounded">sqft</code> in Calculation Rules.</p>
              </div>
            )}

            {inputType === "text" && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-700">The customer enters free-form text. Typically informational only (no pricing impact).</p>
              </div>
            )}

            {(inputType === "dropdown" || inputType === "checkboxes") && (
              <div className="space-y-1.5">
                <Label>{inputType === "dropdown" ? "Dropdown" : "Checkbox"} Options (one per line)</Label>
                <Textarea
                  value={dropdownOpts}
                  onChange={e => setDropdownOpts(e.target.value)}
                  placeholder={"Option A\nOption B\nOption C"}
                  rows={5}
                />
                <p className="text-xs text-muted-foreground">{dropdownOpts.split("\n").filter(s => s.trim()).length} option(s) defined</p>
              </div>
            )}
          </TabsContent>

          {/* ── Calculation Rules Tab ── */}
          <TabsContent value="rules" className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-charcoal">Calculation Rules</p>
                <p className="text-xs text-muted-foreground">Add pricing rules that apply based on the customer's answer.</p>
              </div>
              <Button size="sm" variant="outline" onClick={addRule} className="gap-1">
                <Plus className="w-3 h-3" /> Add Rule
              </Button>
            </div>

            {calcRules.length === 0 && (
              <div className="text-center py-6 text-muted-foreground border border-dashed rounded-lg">
                <Calculator className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No calculation rules yet</p>
                <p className="text-xs">Add rules to attach pricing to this question's answers.</p>
              </div>
            )}

            {calcRules.map((rule, idx) => (
              <div key={idx} className="border border-border/60 rounded-lg p-3 space-y-3 bg-white">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-charcoal uppercase tracking-wide">Rule {idx + 1}</span>
                  <button onClick={() => removeRule(idx)} className="p-1 rounded hover:bg-red-50">
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Rule Name *</Label>
                    <Input value={rule.name} onChange={e => updateRule(idx, "name", e.target.value)} placeholder="e.g. Insulation cost" className="text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Condition Type</Label>
                    <Select value={rule.conditionType} onValueChange={v => updateRule(idx, "conditionType", v)}>
                      <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CONDITION_TYPES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {rule.conditionType !== "always_apply" && (
                  <div className="space-y-1">
                    <Label className="text-xs">
                      {rule.conditionType === "between" ? "Range (min, max)" : "Condition Value"}
                    </Label>
                    {rule.conditionType === "between" ? (
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          type="number"
                          placeholder="Min"
                          value={Array.isArray(rule.conditionValue) ? rule.conditionValue[0] : ""}
                          onChange={e => {
                            const cur = Array.isArray(rule.conditionValue) ? rule.conditionValue : [0, 0];
                            updateRule(idx, "conditionValue", [Number(e.target.value), cur[1]]);
                          }}
                          className="text-sm"
                        />
                        <Input
                          type="number"
                          placeholder="Max"
                          value={Array.isArray(rule.conditionValue) ? rule.conditionValue[1] : ""}
                          onChange={e => {
                            const cur = Array.isArray(rule.conditionValue) ? rule.conditionValue : [0, 0];
                            updateRule(idx, "conditionValue", [cur[0], Number(e.target.value)]);
                          }}
                          className="text-sm"
                        />
                      </div>
                    ) : (
                      <Input
                        value={rule.conditionValue !== undefined ? String(rule.conditionValue) : ""}
                        onChange={e => {
                          const v = e.target.value;
                          updateRule(idx, "conditionValue", isNaN(Number(v)) || v === "" ? v : Number(v));
                        }}
                        placeholder={rule.conditionType === "equals" ? "e.g. Yes" : "e.g. 100"}
                        className="text-sm"
                      />
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Fixed Cost ($)</Label>
                    <Input
                      type="number"
                      value={rule.fixedCost ?? ""}
                      onChange={e => updateRule(idx, "fixedCost", e.target.value ? Number(e.target.value) : undefined)}
                      placeholder="e.g. 500"
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Formula (optional)</Label>
                    <Input
                      value={rule.formula ?? ""}
                      onChange={e => updateRule(idx, "formula", e.target.value || undefined)}
                      placeholder="e.g. answer * 15"
                      className="text-sm font-mono"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Description (optional)</Label>
                  <Input
                    value={rule.description ?? ""}
                    onChange={e => updateRule(idx, "description", e.target.value || undefined)}
                    placeholder="e.g. Cost per linear foot of insulation"
                    className="text-sm"
                  />
                </div>
                <p className="text-xs text-muted-foreground">Formula variables: <code className="bg-muted px-1 rounded">answer</code> (customer's value), <code className="bg-muted px-1 rounded">sqft</code> (project sqft), <code className="bg-muted px-1 rounded">room_sqft</code> (room sqft)</p>
              </div>
            ))}
          </TabsContent>

          {/* ── Follow-Up Logic Tab ── */}
          <TabsContent value="logic" className="space-y-4 pt-2">
            <div className="border border-amber-200 bg-amber-50 rounded-lg p-3 space-y-3">
              <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide">Branching Logic (optional)</p>
              <p className="text-xs text-amber-700">Show this question only when a specific answer was given to a parent question.</p>
              <div className="space-y-1.5">
                <Label className="text-xs">Show after question</Label>
                <Select value={parentQuestionId || "none"} onValueChange={v => { setParentQuestionId(v === "none" ? "" : v); setParentOptionId(""); }}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Always show (no condition)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Always show (no condition)</SelectItem>
                    {allQuestions.filter(q => q.id !== question?.id).map(q => (
                      <SelectItem key={q.id} value={String(q.id)}>{q.text}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {parentOptions.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Only when answer is</Label>
                  <Select value={parentOptionId || "none"} onValueChange={v => setParentOptionId(v === "none" ? "" : v)}>
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder="Any answer" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Any answer</SelectItem>
                      {parentOptions.map(o => (
                        <SelectItem key={o.id} value={String(o.id)}>{o.text}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
          <Button onClick={handleSave} disabled={saving} className="bg-canyon hover:bg-canyon/90">
            {saving ? "Saving…" : question ? "Save Changes" : "Create Question"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Option Form Dialog ───────────────────────────────────────────────────────

function OptionFormDialog({
  questionId, option, onClose, onSaved,
}: {
  questionId: number;
  option?: QuestionOption;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [text, setText] = useState(option?.text ?? "");
  const [subtext, setSubtext] = useState(option?.subtext ?? "");
  const [imageUrl, setImageUrl] = useState(option?.imageUrl ?? "");
  const [priceAdjType, setPriceAdjType] = useState<"flat" | "percent" | "none">(option?.priceAdjustmentType ?? "none");
  const [priceAdj, setPriceAdj] = useState(option?.priceAdjustment ?? "0");
  const [pricingTier, setPricingTier] = useState<string>(option?.pricingTier ? String(option.pricingTier) : "");
  const [sortOrder, setSortOrder] = useState(option?.sortOrder ?? 0);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const create = trpc.questionnaire.createOption.useMutation();
  const update = trpc.questionnaire.updateOption.useMutation();
  const uploadImage = trpc.questionnaire.uploadOptionImage.useMutation();

  const handleImageUpload = async (file: File) => {
    if (!file) return;
    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = (e.target?.result as string).split(",")[1];
        const result = await uploadImage.mutateAsync({ imageBase64: base64, mimeType: file.type });
        setImageUrl(result.url);
        toast.success("Image uploaded");
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch {
      toast.error("Failed to upload image");
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!text.trim()) { toast.error("Option text is required"); return; }
    setSaving(true);
    try {
      if (option) {
        await update.mutateAsync({
          id: option.id,
          text: text.trim(),
          subtext: subtext.trim() || undefined,
          imageUrl: imageUrl || undefined,
          priceAdjustment: Number(priceAdj),
          priceAdjustmentType: priceAdjType,
          pricingTier: pricingTier ? Number(pricingTier) : null,
          sortOrder,
        });
        toast.success("Option updated");
      } else {
        await create.mutateAsync({
          questionId,
          text: text.trim(),
          subtext: subtext.trim(),
          imageUrl: imageUrl,
          priceAdjustment: Number(priceAdj),
          priceAdjustmentType: priceAdjType,
          pricingTier: pricingTier ? Number(pricingTier) : null,
          sortOrder,
        });
        toast.success("Option created");
      }
      onSaved();
    } catch {
      toast.error("Failed to save option");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{option ? "Edit Option" : "Add Answer Option"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Option Text *</Label>
            <Input value={text} onChange={e => setText(e.target.value)} placeholder="e.g. New Deck" />
          </div>
          <div className="space-y-1.5">
            <Label>Subtext (optional)</Label>
            <Input value={subtext} onChange={e => setSubtext(e.target.value)} placeholder="e.g. Building a brand new deck" />
          </div>

          {/* Image upload */}
          <div className="space-y-1.5">
            <Label>Image (optional)</Label>
            <div className="flex items-center gap-3">
              {imageUrl ? (
                <div className="relative">
                  <img src={imageUrl} alt="Option" className="w-20 h-20 rounded-lg object-cover border border-border" />
                  <button onClick={() => setImageUrl("")} className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              ) : (
                <div className="w-20 h-20 rounded-lg border-2 border-dashed border-border flex items-center justify-center bg-muted/30">
                  <ImageIcon className="w-6 h-6 text-muted-foreground/40" />
                </div>
              )}
              <div className="flex-1 space-y-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="gap-2 w-full"
                >
                  <Upload className="w-4 h-4" />
                  {uploading ? "Uploading…" : "Upload Image"}
                </Button>
                <Input
                  value={imageUrl}
                  onChange={e => setImageUrl(e.target.value)}
                  placeholder="Or paste image URL"
                  className="text-xs"
                />
              </div>
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); }} />
          </div>

          {/* Pricing Tier — for visual-choice questions */}
          <div className="border border-purple-200 bg-purple-50 rounded-lg p-3 space-y-2">
            <p className="text-xs font-semibold text-purple-800 uppercase tracking-wide">Pricing Tier (optional)</p>
            <p className="text-xs text-purple-700">For visual-choice questions (Overall Finish Level), assign a tier 1–5 so the customer's selection maps to a pricing level.</p>
            <Select value={pricingTier || "none"} onValueChange={v => setPricingTier(v === "none" ? "" : v)}>
              <SelectTrigger className="text-sm bg-white">
                <SelectValue placeholder="No tier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No tier</SelectItem>
                <SelectItem value="1">Level 1 — Entry / Builder Grade</SelectItem>
                <SelectItem value="2">Level 2 — Mid-Grade</SelectItem>
                <SelectItem value="3">Level 3 — Good Quality</SelectItem>
                <SelectItem value="4">Level 4 — Premium</SelectItem>
                <SelectItem value="5">Level 5 — Luxury / Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Price adjustment */}
          <div className="border border-green-200 bg-green-50 rounded-lg p-3 space-y-3">
            <p className="text-xs font-semibold text-green-800 uppercase tracking-wide">Price Adjustment (optional)</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Type</Label>
                <Select value={priceAdjType} onValueChange={v => setPriceAdjType(v as "flat" | "percent" | "none")}>
                  <SelectTrigger className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="flat">Flat $ Amount</SelectItem>
                    <SelectItem value="percent">Percentage %</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {priceAdjType !== "none" && (
                <div className="space-y-1.5">
                  <Label className="text-xs">{priceAdjType === "flat" ? "Amount ($)" : "Percentage (%)"}</Label>
                  <Input type="number" value={priceAdj} onChange={e => setPriceAdj(e.target.value)} placeholder="0" />
                </div>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Sort Order</Label>
            <Input type="number" value={sortOrder} onChange={e => setSortOrder(Number(e.target.value))} />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
          <Button onClick={handleSave} disabled={saving} className="bg-canyon hover:bg-canyon/90">
            {saving ? "Saving…" : option ? "Save Changes" : "Add Option"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Price Rules Tab ──────────────────────────────────────────────────────────

function PriceRulesTab() {
  const utils = trpc.useUtils();
  const { data: rules = [], isLoading } = trpc.questionnaire.listPriceRules.useQuery();
  const { data: questions = [] } = trpc.questionnaire.listQuestions.useQuery();
  const [showCreate, setShowCreate] = useState(false);
  const [editingRule, setEditingRule] = useState<PriceRule | null>(null);

  const deleteRule = trpc.questionnaire.deletePriceRule.useMutation({
    onSuccess: () => { utils.questionnaire.listPriceRules.invalidate(); toast.success("Price rule deleted"); },
    onError: () => toast.error("Failed to delete rule"),
  });

  const toggleActive = trpc.questionnaire.updatePriceRule.useMutation({
    onSuccess: () => utils.questionnaire.listPriceRules.invalidate(),
    onError: () => toast.error("Failed to update rule"),
  });

  if (isLoading) return <div className="text-center py-12 text-muted-foreground">Loading price rules…</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-display text-charcoal">Rough Price Rules</h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Define base price ranges for different project types. Rules are matched by conditions (which answers were selected).
            The first matching rule wins. Rules without conditions act as a default fallback.
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2 bg-canyon hover:bg-canyon/90">
          <Plus className="w-4 h-4" /> Add Rule
        </Button>
      </div>

      {(rules as PriceRule[]).length === 0 && (
        <div className="text-center py-16 border-2 border-dashed border-border rounded-xl">
          <DollarSign className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">No price rules yet</p>
          <p className="text-sm text-muted-foreground mt-1">Add rules to generate rough estimates from questionnaire answers.</p>
        </div>
      )}

      <div className="space-y-3">
        {(rules as PriceRule[]).map((rule, idx) => {
          const conditionLabels = rule.conditions?.map(cond => {
            const q = (questions as Question[]).find(q => q.id === cond.questionId);
            const optLabels = cond.optionIds.map(oid => q?.options.find(o => o.id === oid)?.text ?? `#${oid}`).join(" or ");
            return `${q?.text ?? `Q#${cond.questionId}`} = ${optLabels}`;
          }) ?? [];

          return (
            <div key={rule.id} className={`bg-white rounded-xl border shadow-sm p-4 ${rule.isActive === 1 ? "border-border/60" : "border-border/30 opacity-60"}`}>
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-green-700">{idx + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-charcoal text-sm">{rule.name}</span>
                    {rule.conditions?.length === 0 && (
                      <Badge variant="secondary" className="text-xs bg-blue-50 text-blue-700 border-blue-200">Default fallback</Badge>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-green-700 mt-1">
                    ${Number(rule.baseMin).toLocaleString()} – ${Number(rule.baseMax).toLocaleString()}
                  </p>
                  {conditionLabels.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {conditionLabels.map((label, i) => (
                        <div key={i} className="flex items-center gap-1.5">
                          <ChevronRight className="w-3 h-3 text-amber-600 flex-shrink-0" />
                          <span className="text-xs text-amber-700">{label}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => toggleActive.mutate({ id: rule.id, isActive: rule.isActive === 1 ? 0 : 1 })} className="p-1.5 rounded hover:bg-muted transition-colors">
                    {rule.isActive === 1 ? <Eye className="w-4 h-4 text-green-600" /> : <EyeOff className="w-4 h-4 text-muted-foreground" />}
                  </button>
                  <button onClick={() => setEditingRule(rule)} className="p-1.5 rounded hover:bg-muted transition-colors">
                    <Pencil className="w-4 h-4 text-muted-foreground" />
                  </button>
                  <button onClick={() => { if (confirm(`Delete rule "${rule.name}"?`)) deleteRule.mutate({ id: rule.id }); }} className="p-1.5 rounded hover:bg-red-50 transition-colors">
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {showCreate && (
        <PriceRuleFormDialog
          allQuestions={questions as Question[]}
          onClose={() => setShowCreate(false)}
          onSaved={() => { utils.questionnaire.listPriceRules.invalidate(); setShowCreate(false); }}
        />
      )}
      {editingRule && (
        <PriceRuleFormDialog
          rule={editingRule}
          allQuestions={questions as Question[]}
          onClose={() => setEditingRule(null)}
          onSaved={() => { utils.questionnaire.listPriceRules.invalidate(); setEditingRule(null); }}
        />
      )}
    </div>
  );
}

// ─── Price Rule Form Dialog ───────────────────────────────────────────────────

function PriceRuleFormDialog({
  rule, allQuestions, onClose, onSaved,
}: {
  rule?: PriceRule;
  allQuestions: Question[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(rule?.name ?? "");
  const [baseMin, setBaseMin] = useState(rule?.baseMin ?? "0");
  const [baseMax, setBaseMax] = useState(rule?.baseMax ?? "0");
  const [conditions, setConditions] = useState<Array<{ questionId: number; optionIds: number[] }>>(rule?.conditions ?? []);
  const [sortOrder, setSortOrder] = useState(rule?.sortOrder ?? 0);
  const [saving, setSaving] = useState(false);

  const create = trpc.questionnaire.createPriceRule.useMutation();
  const update = trpc.questionnaire.updatePriceRule.useMutation();

  const addCondition = () => {
    if (allQuestions.length === 0) return;
    setConditions(prev => [...prev, { questionId: allQuestions[0].id, optionIds: [] }]);
  };

  const removeCondition = (idx: number) => {
    setConditions(prev => prev.filter((_, i) => i !== idx));
  };

  const updateConditionQuestion = (idx: number, qId: number) => {
    setConditions(prev => prev.map((c, i) => i === idx ? { questionId: qId, optionIds: [] } : c));
  };

  const toggleConditionOption = (idx: number, optId: number) => {
    setConditions(prev => prev.map((c, i) => {
      if (i !== idx) return c;
      const has = c.optionIds.includes(optId);
      return { ...c, optionIds: has ? c.optionIds.filter(id => id !== optId) : [...c.optionIds, optId] };
    }));
  };

  const handleSave = async () => {
    if (!name.trim()) { toast.error("Rule name is required"); return; }
    if (Number(baseMin) > Number(baseMax)) { toast.error("Min must be ≤ Max"); return; }
    setSaving(true);
    try {
      if (rule) {
        await update.mutateAsync({ id: rule.id, name: name.trim(), baseMin: Number(baseMin), baseMax: Number(baseMax), conditions, sortOrder });
        toast.success("Price rule updated");
      } else {
        await create.mutateAsync({ name: name.trim(), baseMin: Number(baseMin), baseMax: Number(baseMax), conditions, sortOrder });
        toast.success("Price rule created");
      }
      onSaved();
    } catch {
      toast.error("Failed to save price rule");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{rule ? "Edit Price Rule" : "Add Price Rule"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Rule Name *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. New Deck — Standard" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Base Min ($)</Label>
              <Input type="number" value={baseMin} onChange={e => setBaseMin(e.target.value)} placeholder="15000" />
            </div>
            <div className="space-y-1.5">
              <Label>Base Max ($)</Label>
              <Input type="number" value={baseMax} onChange={e => setBaseMax(e.target.value)} placeholder="25000" />
            </div>
          </div>

          {/* Conditions */}
          <div className="border border-amber-200 bg-amber-50 rounded-lg p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide">Conditions</p>
                <p className="text-xs text-amber-700 mt-0.5">This rule applies when ALL conditions match. Leave empty for a default fallback rule.</p>
              </div>
              <Button size="sm" variant="outline" onClick={addCondition} className="gap-1.5 h-7 text-xs border-amber-300 text-amber-700 hover:bg-amber-100">
                <Plus className="w-3 h-3" /> Add
              </Button>
            </div>

            {conditions.length === 0 && (
              <p className="text-xs text-amber-600 italic">No conditions — this is a default fallback rule.</p>
            )}

            {conditions.map((cond, idx) => {
              const q = allQuestions.find(q => q.id === cond.questionId);
              return (
                <div key={idx} className="bg-white rounded-lg border border-amber-200 p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Select value={String(cond.questionId)} onValueChange={v => updateConditionQuestion(idx, Number(v))}>
                      <SelectTrigger className="text-sm flex-1">
                        <SelectValue placeholder="Select question" />
                      </SelectTrigger>
                      <SelectContent>
                        {allQuestions.map(q => (
                          <SelectItem key={q.id} value={String(q.id)}>{q.text}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <button onClick={() => removeCondition(idx)} className="p-1.5 rounded hover:bg-red-50 transition-colors flex-shrink-0">
                      <X className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                  {q && q.options.length > 0 && (
                    <div>
                      <p className="text-xs text-amber-700 mb-1.5">Answer is any of:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {q.options.map(opt => (
                          <button
                            key={opt.id}
                            onClick={() => toggleConditionOption(idx, opt.id)}
                            className={`text-xs px-2 py-1 rounded-full border transition-colors ${cond.optionIds.includes(opt.id) ? "bg-amber-600 text-white border-amber-600" : "bg-white text-amber-700 border-amber-300 hover:bg-amber-100"}`}
                          >
                            {opt.text}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="space-y-1.5">
            <Label>Sort Order (lower = checked first)</Label>
            <Input type="number" value={sortOrder} onChange={e => setSortOrder(Number(e.target.value))} />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
          <Button onClick={handleSave} disabled={saving} className="bg-canyon hover:bg-canyon/90">
            {saving ? "Saving…" : rule ? "Save Changes" : "Create Rule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Tier Multipliers Tab ────────────────────────────────────────────────────

const SECTION_OPTIONS = [
  { key: "interior_finishes", label: "Interior Finishes" },
  { key: "exterior_finishes", label: "Exterior Finishes" },
  { key: "overall_finish_level", label: "Overall Finish Level" },
  { key: "trade_upgrades", label: "Trade-Specific Upgrades" },
  { key: "structure_foundation_roof", label: "Structure / Foundation / Roof" },
  { key: "mechanical_electrical_plumbing", label: "Mechanical, Electrical & Plumbing" },
];

const TIER_LABELS: Record<number, string> = {
  1: "Level 1 — Basic",
  2: "Level 2 — Standard",
  3: "Level 3 — Mid-Grade",
  4: "Level 4 — Premium",
  5: "Level 5 — Luxury",
};

function TierMultipliersTab() {
  const utils = trpc.useUtils();
  const { data: multipliers = [], isLoading } = trpc.questionnaire.listTierMultipliers.useQuery();
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<TierMultiplier | null>(null);

  const deleteItem = trpc.questionnaire.deleteTierMultiplier.useMutation({
    onSuccess: () => { utils.questionnaire.listTierMultipliers.invalidate(); toast.success("Multiplier deleted"); },
    onError: () => toast.error("Failed to delete multiplier"),
  });

  if (isLoading) return <div className="text-center py-12 text-muted-foreground">Loading…</div>;

  const grouped = new Map<string, TierMultiplier[]>();
  for (const m of (multipliers as TierMultiplier[])) {
    const arr = grouped.get(m.sectionKey) ?? [];
    arr.push(m);
    grouped.set(m.sectionKey, arr);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-display text-charcoal">Tier Multipliers</h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            For each section and finish level (L1–L5), set a multiplier applied to the base price.
            A multiplier of 1.00 = no change; 1.15 = +15%; 0.85 = −15%.
            The engine averages all section multipliers weighted by their weight value.
          </p>
        </div>
        <Button onClick={() => setShowForm(true)} className="gap-2 bg-canyon hover:bg-canyon/90">
          <Plus className="w-4 h-4" /> Add Multiplier
        </Button>
      </div>

      {(multipliers as TierMultiplier[]).length === 0 && (
        <div className="text-center py-16 border-2 border-dashed border-border rounded-xl">
          <Percent className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">No tier multipliers yet</p>
          <p className="text-sm text-muted-foreground mt-1">Add multipliers to adjust the estimate based on the customer's chosen finish level.</p>
          <Button className="mt-4 gap-2 bg-canyon hover:bg-canyon/90" onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4" /> Add First Multiplier
          </Button>
        </div>
      )}

      {Array.from(grouped.entries()).map(([sectionKey, items]) => (
        <div key={sectionKey} className="bg-white rounded-xl border border-border/60 shadow-sm overflow-hidden">
          <div className="bg-muted/30 px-4 py-2.5 border-b border-border/40">
            <span className="text-sm font-semibold text-charcoal">
              {SECTION_OPTIONS.find(s => s.key === sectionKey)?.label ?? sectionKey}
            </span>
          </div>
          <div className="divide-y divide-border/30">
            {items.sort((a, b) => a.tier - b.tier).map(item => (
              <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                <div className="w-28 flex-shrink-0">
                  <span className="text-xs font-bold text-canyon">{TIER_LABELS[item.tier] ?? `Level ${item.tier}`}</span>
                </div>
                <div className="flex-1">
                  <span className="text-sm text-charcoal">{item.tierLabel || TIER_LABELS[item.tier]}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-semibold tabular-nums ${
                    parseFloat(item.multiplier) > 1 ? "text-green-700" :
                    parseFloat(item.multiplier) < 1 ? "text-red-600" : "text-muted-foreground"
                  }`}>
                    ×{parseFloat(item.multiplier).toFixed(4)}
                    <span className="text-xs font-normal ml-1">
                      ({parseFloat(item.multiplier) >= 1 ? "+" : ""}{((parseFloat(item.multiplier) - 1) * 100).toFixed(1)}%)
                    </span>
                  </span>
                  <span className="text-xs text-muted-foreground">wt:{parseFloat(item.weight).toFixed(2)}</span>
                  <button onClick={() => setEditingItem(item)} className="p-1.5 rounded hover:bg-muted transition-colors">
                    <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                  <button onClick={() => { if (confirm("Delete this multiplier?")) deleteItem.mutate({ id: item.id }); }} className="p-1.5 rounded hover:bg-red-50 transition-colors">
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {(showForm || editingItem) && (
        <TierMultiplierFormDialog
          item={editingItem ?? undefined}
          onClose={() => { setShowForm(false); setEditingItem(null); }}
          onSaved={() => { utils.questionnaire.listTierMultipliers.invalidate(); setShowForm(false); setEditingItem(null); }}
        />
      )}
    </div>
  );
}

function TierMultiplierFormDialog({ item, onClose, onSaved }: { item?: TierMultiplier; onClose: () => void; onSaved: () => void }) {
  const [sectionKey, setSectionKey] = useState(item?.sectionKey ?? SECTION_OPTIONS[0].key);
  const [sectionLabel, setSectionLabel] = useState(item?.sectionLabel ?? SECTION_OPTIONS[0].label);
  const [tier, setTier] = useState(item?.tier ?? 3);
  const [multiplier, setMultiplier] = useState(item?.multiplier ?? "1.0000");
  const [tierLabel, setTierLabel] = useState(item?.tierLabel ?? "");
  const [weight, setWeight] = useState(item?.weight ?? "1.0000");
  const [saving, setSaving] = useState(false);

  const upsert = trpc.questionnaire.upsertTierMultiplier.useMutation();

  const handleSectionChange = (key: string) => {
    setSectionKey(key);
    setSectionLabel(SECTION_OPTIONS.find(s => s.key === key)?.label ?? key);
  };

  const handleSave = async () => {
    if (!multiplier || isNaN(parseFloat(multiplier))) { toast.error("Enter a valid multiplier"); return; }
    setSaving(true);
    try {
      await upsert.mutateAsync({
        id: item?.id,
        sectionKey,
        sectionLabel,
        tier,
        multiplier: parseFloat(multiplier),
        tierLabel: tierLabel || TIER_LABELS[tier] || "",
        weight: parseFloat(weight),
      });
      toast.success(item ? "Multiplier updated" : "Multiplier added");
      onSaved();
    } catch {
      toast.error("Failed to save multiplier");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{item ? "Edit Tier Multiplier" : "Add Tier Multiplier"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Section</Label>
            <Select value={sectionKey} onValueChange={handleSectionChange}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SECTION_OPTIONS.map(s => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Tier Level</Label>
            <Select value={String(tier)} onValueChange={v => setTier(Number(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {[1,2,3,4,5].map(t => <SelectItem key={t} value={String(t)}>{TIER_LABELS[t]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Tier Label (shown in breakdown)</Label>
            <Input value={tierLabel} onChange={e => setTierLabel(e.target.value)} placeholder={TIER_LABELS[tier]} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Multiplier</Label>
              <Input type="number" step="0.01" value={multiplier} onChange={e => setMultiplier(e.target.value)} placeholder="1.00" />
              <p className="text-xs text-muted-foreground">1.00 = no change, 1.15 = +15%, 0.85 = −15%</p>
            </div>
            <div className="space-y-1.5">
              <Label>Weight (0–1)</Label>
              <Input type="number" step="0.1" min="0" max="1" value={weight} onChange={e => setWeight(e.target.value)} placeholder="1.0" />
              <p className="text-xs text-muted-foreground">How much this section influences the total</p>
            </div>
          </div>
          {multiplier && !isNaN(parseFloat(multiplier)) && (
            <div className="bg-muted/30 rounded-lg p-3 text-sm">
              <span className="text-muted-foreground">Effect: </span>
              <span className={`font-semibold ${parseFloat(multiplier) > 1 ? "text-green-700" : parseFloat(multiplier) < 1 ? "text-red-600" : "text-muted-foreground"}`}>
                {parseFloat(multiplier) >= 1 ? "+" : ""}{((parseFloat(multiplier) - 1) * 100).toFixed(1)}% adjustment to base price
              </span>
            </div>
          )}
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
          <Button onClick={handleSave} disabled={saving} className="bg-canyon hover:bg-canyon/90">
            {saving ? "Saving…" : item ? "Save Changes" : "Add Multiplier"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Pricing Add-ons Tab ──────────────────────────────────────────────────────

function PricingAddonsTab() {
  const utils = trpc.useUtils();
  const { data: addons = [], isLoading } = trpc.questionnaire.listPricingAddons.useQuery();
  const { data: questions = [] } = trpc.questionnaire.listQuestions.useQuery();
  const [showForm, setShowForm] = useState(false);
  const [editingAddon, setEditingAddon] = useState<PricingAddon | null>(null);

  const deleteAddon = trpc.questionnaire.deletePricingAddon.useMutation({
    onSuccess: () => { utils.questionnaire.listPricingAddons.invalidate(); toast.success("Add-on deleted"); },
    onError: () => toast.error("Failed to delete add-on"),
  });

  const toggleActive = trpc.questionnaire.updatePricingAddon.useMutation({
    onSuccess: () => utils.questionnaire.listPricingAddons.invalidate(),
    onError: () => toast.error("Failed to update add-on"),
  });

  if (isLoading) return <div className="text-center py-12 text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-display text-charcoal">Pricing Add-ons</h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Flat dollar amounts added to the estimate when a customer selects a specific option.
            Use for trade upgrades like smart home, custom built-ins, heated floors, etc.
          </p>
        </div>
        <Button onClick={() => setShowForm(true)} className="gap-2 bg-canyon hover:bg-canyon/90">
          <Plus className="w-4 h-4" /> Add Add-on
        </Button>
      </div>

      {(addons as PricingAddon[]).length === 0 && (
        <div className="text-center py-16 border-2 border-dashed border-border rounded-xl">
          <Zap className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">No add-ons yet</p>
          <p className="text-sm text-muted-foreground mt-1">Add flat-dollar amounts for specific option selections.</p>
        </div>
      )}

      <div className="space-y-3">
        {(addons as PricingAddon[]).map(addon => {
          const q = (questions as Question[]).find(q => q.id === addon.questionId);
          const opt = q?.options.find(o => o.id === addon.optionId);
          return (
            <div key={addon.id} className={`bg-white rounded-xl border shadow-sm p-4 ${addon.isActive === 1 ? "border-border/60" : "border-border/30 opacity-60"}`}>
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-charcoal text-sm">{addon.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Triggered by: <span className="text-amber-700">{q?.text ?? `Q#${addon.questionId}`}</span>
                    {opt && <span> → "{opt.text}"</span>}
                    {!opt && addon.optionId === null && <span className="text-blue-600"> (any answer)</span>}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-sm font-semibold text-green-700">+${Number(addon.amount).toLocaleString()}</span>
                  <button onClick={() => toggleActive.mutate({ id: addon.id, isActive: addon.isActive === 1 ? 0 : 1 })} className="p-1.5 rounded hover:bg-muted transition-colors">
                    {addon.isActive === 1 ? <Eye className="w-4 h-4 text-green-600" /> : <EyeOff className="w-4 h-4 text-muted-foreground" />}
                  </button>
                  <button onClick={() => setEditingAddon(addon)} className="p-1.5 rounded hover:bg-muted transition-colors">
                    <Pencil className="w-4 h-4 text-muted-foreground" />
                  </button>
                  <button onClick={() => { if (confirm(`Delete add-on "${addon.label}"?`)) deleteAddon.mutate({ id: addon.id }); }} className="p-1.5 rounded hover:bg-red-50 transition-colors">
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {(showForm || editingAddon) && (
        <PricingAddonFormDialog
          addon={editingAddon ?? undefined}
          allQuestions={questions as Question[]}
          onClose={() => { setShowForm(false); setEditingAddon(null); }}
          onSaved={() => { utils.questionnaire.listPricingAddons.invalidate(); setShowForm(false); setEditingAddon(null); }}
        />
      )}
    </div>
  );
}

function PricingAddonFormDialog({ addon, allQuestions, onClose, onSaved }: { addon?: PricingAddon; allQuestions: Question[]; onClose: () => void; onSaved: () => void }) {
  const [label, setLabel] = useState(addon?.label ?? "");
  const [amount, setAmount] = useState(addon?.amount ?? "0");
  const [questionId, setQuestionId] = useState<number>(addon?.questionId ?? (allQuestions[0]?.id ?? 0));
  const [optionId, setOptionId] = useState<number | null>(addon?.optionId ?? null);
  const [saving, setSaving] = useState(false);

  const create = trpc.questionnaire.createPricingAddon.useMutation();
  const update = trpc.questionnaire.updatePricingAddon.useMutation();

  const selectedQuestion = allQuestions.find(q => q.id === questionId);

  const handleSave = async () => {
    if (!label.trim()) { toast.error("Label is required"); return; }
    if (isNaN(parseFloat(amount)) || parseFloat(amount) < 0) { toast.error("Enter a valid amount"); return; }
    setSaving(true);
    try {
      if (addon) {
        await update.mutateAsync({ id: addon.id, label: label.trim(), amount: parseFloat(amount) });
        toast.success("Add-on updated");
      } else {
        await create.mutateAsync({ questionId, optionId, label: label.trim(), amount: parseFloat(amount) });
        toast.success("Add-on created");
      }
      onSaved();
    } catch {
      toast.error("Failed to save add-on");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{addon ? "Edit Add-on" : "Add Pricing Add-on"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Label *</Label>
            <Input value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. Smart Home Package" />
          </div>
          <div className="space-y-1.5">
            <Label>Flat Dollar Amount ($)</Label>
            <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="5000" />
          </div>
          {!addon && (
            <>
              <div className="space-y-1.5">
                <Label>Triggered by Question</Label>
                <Select value={String(questionId)} onValueChange={v => { setQuestionId(Number(v)); setOptionId(null); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {allQuestions.map(q => <SelectItem key={q.id} value={String(q.id)}>{q.text}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {selectedQuestion && selectedQuestion.options.length > 0 && (
                <div className="space-y-1.5">
                  <Label>Specific Option (optional — leave blank to trigger on any answer)</Label>
                  <Select value={optionId ? String(optionId) : "__any__"} onValueChange={v => setOptionId(v === "__any__" ? null : Number(v))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__any__">Any answer to this question</SelectItem>
                      {selectedQuestion.options.map(o => <SelectItem key={o.id} value={String(o.id)}>{o.text}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </>
          )}
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
          <Button onClick={handleSave} disabled={saving} className="bg-canyon hover:bg-canyon/90">
            {saving ? "Saving…" : addon ? "Save Changes" : "Create Add-on"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Sent Questionnaires Tab ──────────────────────────────────────────────────

function SentQuestionnairesTab() {
  const utils = trpc.useUtils();
  const [search, setSearch] = useState("");
  const [selectedSession, setSelectedSession] = useState<number | null>(null);
  const [showSendDialog, setShowSendDialog] = useState(false);

  const { data: result, isLoading } = trpc.questionnaire.listSessions.useQuery({ search: search || undefined });
  const sessions = result?.sessions ?? [];

  const { data: sessionDetail } = trpc.questionnaire.getSessionById.useQuery(
    { id: selectedSession! },
    { enabled: selectedSession !== null }
  );

  const deleteSession = trpc.questionnaire.deleteSession.useMutation({
    onSuccess: () => { utils.questionnaire.listSessions.invalidate(); setSelectedSession(null); toast.success("Session deleted"); },
    onError: () => toast.error("Failed to delete session"),
  });

  if (selectedSession !== null && sessionDetail) {
    return (
      <SessionDetailView
        session={sessionDetail.session}
        answers={sessionDetail.answers}
        questions={sessionDetail.questions}
        options={sessionDetail.options}
        onBack={() => setSelectedSession(null)}
        onDelete={() => { if (confirm("Delete this questionnaire session?")) deleteSession.mutate({ id: selectedSession }); }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-display text-charcoal">Sent Questionnaires</h3>
          <p className="text-sm text-muted-foreground mt-0.5">View and manage sent questionnaire links. Search by name, phone, or email.</p>
        </div>
        <Button onClick={() => setShowSendDialog(true)} className="gap-2 bg-canyon hover:bg-canyon/90 shrink-0">
          <Send className="w-4 h-4" /> Send New
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, phone, or email…"
          className="pl-9"
        />
      </div>

      {isLoading && <div className="text-center py-12 text-muted-foreground">Loading…</div>}

      {!isLoading && sessions.length === 0 && (
        <div className="text-center py-16 border-2 border-dashed border-border rounded-xl">
          <Send className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">No questionnaires sent yet</p>
          <p className="text-sm text-muted-foreground mt-1">Send a questionnaire to a homeowner to get started.</p>
        </div>
      )}

      <div className="space-y-2">
        {(sessions as QuestionnaireSession[]).map(session => (
          <div
            key={session.id}
            onClick={() => setSelectedSession(session.id)}
            className="bg-white rounded-xl border border-border/60 shadow-sm p-4 cursor-pointer hover:border-canyon/40 hover:shadow-md transition-all"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-sandstone/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <User className="w-4 h-4 text-charcoal" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-charcoal text-sm">{session.customerName || "—"}</p>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    {session.customerPhone && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Phone className="w-3 h-3" /> {session.customerPhone}
                      </span>
                    )}
                    {session.customerEmail && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Mail className="w-3 h-3" /> {session.customerEmail}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                {session.completedAt ? (
                  <Badge className="text-xs bg-green-100 text-green-700 border-green-200">Completed</Badge>
                ) : (
                  <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">Pending</Badge>
                )}
                {session.estimatedMin && session.estimatedMax && (
                  <span className="text-xs font-semibold text-green-700">
                    ${Number(session.estimatedMin).toLocaleString()} – ${Number(session.estimatedMax).toLocaleString()}
                  </span>
                )}
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  {new Date(session.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showSendDialog && (
        <SendQuestionnaireDialog
          onClose={() => setShowSendDialog(false)}
          onSaved={(token) => {
            utils.questionnaire.listSessions.invalidate();
            setShowSendDialog(false);
            toast.success("Questionnaire link created and sent!");
          }}
        />
      )}
    </div>
  );
}

// ─── Session Detail View ──────────────────────────────────────────────────────

function SessionDetailView({
  session, answers, questions, options, onBack, onDelete,
}: {
  session: QuestionnaireSession;
  answers: Array<{
    id: number;
    questionId: number;
    selectedOptionIds: number[];
    freeformValue?: string | null;
    quantities?: Record<string, number> | null;
    voiceTranscription?: string | null;
    photoUrls?: string[] | null;
    photoCategory?: string | null;
  }>;
  questions: Array<{ id: number; text: string; type: string; inputType?: string | null; section: string | null }>;
  options: Array<{ id: number; questionId: number; text: string; imageUrl: string | null; pricingTier?: number | null }>;
  onBack: () => void;
  onDelete: () => void;
}) {
  const questionnaireUrl = `${window.location.origin}/q/${session.sessionToken}`;

  // Load uploaded files for this session
  const { data: sessionFiles, refetch: refetchFiles } = trpc.questionnaire.getSessionFiles.useQuery(
    { sessionId: session.id },
    { enabled: true }
  );
  const deleteFile = trpc.questionnaire.deleteSessionFile.useMutation({
    onSuccess: () => { refetchFiles(); toast.success("File removed"); },
    onError: () => toast.error("Failed to remove file"),
  });

  // Group answers by section
  const sectionedAnswers = SECTION_ORDER.map(sectionKey => {
    const sectionAnswers = answers.filter(a => {
      const q = questions.find(q => q.id === a.questionId);
      return q?.section === sectionKey;
    });
    return { sectionKey, answers: sectionAnswers };
  }).filter(g => g.answers.length > 0);

  // Answers with no section
  const unsectionedAnswers = answers.filter(a => {
    const q = questions.find(q => q.id === a.questionId);
    return !q?.section;
  });

  const renderAnswer = (answer: typeof answers[0]) => {
    const q = questions.find(q => q.id === answer.questionId);
    const selectedOptions = (answer.selectedOptionIds as number[]).map(oid => options.find(o => o.id === oid)).filter(Boolean);
    const isVoicePhoto = q?.type === "voice_photo";
    const isPhotoUpload = q?.type === "photo_upload";
    const isQtySelect = q?.type === "quantity_select";
    const isNotesQuestion = q?.inputType === "text" && (q?.text ?? "").toLowerCase().includes("anything else");

    // Notes questions get a highlighted amber callout treatment
    if (isNotesQuestion && answer.freeformValue) {
      return (
        <div key={answer.id} className="bg-amber-50 border border-amber-300 rounded-xl p-4 flex gap-3 shadow-sm">
          <div className="shrink-0 mt-0.5">
            <span className="text-lg">📝</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">Customer Notes</p>
            <p className="text-sm text-amber-900 leading-relaxed whitespace-pre-wrap">{answer.freeformValue}</p>
          </div>
        </div>
      );
    }

    // Notes question with no value — skip rendering entirely
    if (isNotesQuestion && !answer.freeformValue) return null;

    return (
      <div key={answer.id} className="bg-white rounded-xl border border-border/60 shadow-sm p-4 space-y-3">
        <p className="text-sm font-medium text-charcoal">{q?.text ?? `Question #${answer.questionId}`}</p>

        {/* Freeform answer */}
        {answer.freeformValue && !isVoicePhoto && !isPhotoUpload && (
          <div className="bg-warm-cream rounded-lg px-3 py-2">
            <p className="text-sm text-charcoal">{answer.freeformValue}</p>
          </div>
        )}

        {/* Standard options (with optional quantities) */}
        {selectedOptions.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedOptions.map(opt => opt && (
              <div key={opt.id} className="flex items-center gap-2 bg-warm-cream rounded-lg px-3 py-1.5">
                {opt.imageUrl && <img src={opt.imageUrl} alt={opt.text} className="w-8 h-8 rounded object-cover" />}
                <span className="text-sm text-charcoal">{opt.text}</span>
                {opt.pricingTier && (
                  <Badge className="bg-canyon/10 text-canyon border-0 text-xs">L{opt.pricingTier}</Badge>
                )}
                {isQtySelect && answer.quantities && answer.quantities[String(opt.id)] && (
                  <span className="text-xs font-bold text-canyon bg-canyon/10 rounded-full px-2 py-0.5">
                    ×{answer.quantities[String(opt.id)]}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Voice transcription */}
        {isVoicePhoto && answer.voiceTranscription && (
          <div className="bg-canyon/5 border border-canyon/20 rounded-lg p-3">
            <p className="text-xs text-canyon font-semibold mb-1">🎤 Voice Transcription</p>
            <p className="text-sm text-charcoal leading-relaxed">{answer.voiceTranscription}</p>
          </div>
        )}

        {/* Photos (voice_photo or photo_upload) */}
        {(isVoicePhoto || isPhotoUpload) && answer.photoUrls && answer.photoUrls.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground font-semibold mb-2">
              📷 {isPhotoUpload ? `Site Photos (${answer.photoUrls.length})` : `Inspiration Photos (${answer.photoUrls.length})`}
            </p>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {answer.photoUrls.map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="aspect-square rounded-lg overflow-hidden border border-border/60 hover:opacity-80 transition-opacity">
                  <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!answer.freeformValue && selectedOptions.length === 0 && !answer.voiceTranscription && (!answer.photoUrls || answer.photoUrls.length === 0) && (
          <span className="text-sm text-muted-foreground italic">No answer provided</span>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={onBack} className="gap-1.5">
          <ChevronDown className="w-4 h-4 rotate-90" /> Back
        </Button>
        <h3 className="text-lg font-display text-charcoal flex-1">{session.customerName || "Unnamed"}</h3>
        <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(questionnaireUrl); toast.success("Link copied!"); }} className="gap-1.5">
          <ExternalLink className="w-4 h-4" /> Copy Link
        </Button>
        <Button variant="outline" size="sm" onClick={onDelete} className="gap-1.5 text-red-600 hover:bg-red-50 border-red-200">
          <Trash2 className="w-4 h-4" /> Delete
        </Button>
      </div>

      {/* Customer info */}
      <div className="bg-white rounded-xl border border-border/60 shadow-sm p-4 grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-muted-foreground">Name</p>
          <p className="text-sm font-medium text-charcoal">{session.customerName || "—"}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Phone</p>
          <p className="text-sm font-medium text-charcoal">{session.customerPhone || "—"}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Email</p>
          <p className="text-sm font-medium text-charcoal">{session.customerEmail || "—"}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Status</p>
          <p className="text-sm font-medium text-charcoal">{session.completedAt ? `Completed ${new Date(session.completedAt).toLocaleDateString()}` : "Pending"}</p>
        </div>
        {session.estimatedMin && session.estimatedMax && (
          <div className="col-span-2 bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-xs text-green-700 font-semibold uppercase tracking-wide">Rough Estimate</p>
            <p className="text-2xl font-display text-green-700 mt-1">
              ${Number(session.estimatedMin).toLocaleString()} – ${Number(session.estimatedMax).toLocaleString()}
            </p>
          </div>
        )}
      </div>

      {/* Uploaded Files Panel */}
      {sessionFiles && sessionFiles.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-canyon" />
            <h4 className="text-sm font-semibold text-charcoal">Uploaded Files ({sessionFiles.length})</h4>
          </div>
          {/* Group by category */}
          {["project_plans", "reference_photo", "site_photo", "other"].map(cat => {
            const catFiles = sessionFiles.filter(f => f.fileCategory === cat);
            if (catFiles.length === 0) return null;
            const catLabel = cat === "project_plans" ? "Architectural Plans" : cat === "reference_photo" ? "Reference Photos" : cat === "site_photo" ? "Site Photos" : "Other Files";
            return (
              <div key={cat} className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{catLabel}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {catFiles.map(f => {
                    const isPdf = f.mimeType === "application/pdf" || f.fileName.toLowerCase().endsWith(".pdf");
                    const isImage = f.mimeType.startsWith("image/");
                    const formatBytes = (bytes: number) => bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(0)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
                    return (
                      <div key={f.id} className="flex items-center gap-3 bg-white border border-border/60 rounded-lg p-3 group">
                        {isImage ? (
                          <a href={f.fileUrl} target="_blank" rel="noopener noreferrer" className="w-14 h-14 rounded-md overflow-hidden border border-border/40 shrink-0 hover:opacity-80 transition-opacity">
                            <img src={f.fileUrl} alt={f.fileName} className="w-full h-full object-cover" />
                          </a>
                        ) : (
                          <div className="w-14 h-14 rounded-md bg-red-50 border border-red-200 flex items-center justify-center shrink-0">
                            <FileText className="w-7 h-7 text-red-500" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-charcoal truncate">{f.fileName}</p>
                          <p className="text-xs text-muted-foreground">{formatBytes(f.fileSize)}</p>
                          {f.questionLabel && (
                            <p className="text-xs text-muted-foreground italic truncate">{f.questionLabel}</p>
                          )}
                          <p className="text-xs text-muted-foreground">{new Date(f.uploadedAt).toLocaleDateString()}</p>
                        </div>
                        <div className="flex flex-col gap-1 items-end">
                          <a href={f.fileUrl} target="_blank" rel="noopener noreferrer"
                            className="text-xs text-canyon hover:underline font-medium">
                            Open
                          </a>
                          <button
                            onClick={() => { if (confirm(`Remove "${f.fileName}"?`)) deleteFile.mutate({ fileId: f.id }); }}
                            className="text-xs text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Section-grouped answers */}
      {answers.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-charcoal">Questionnaire Answers</h4>

          {sectionedAnswers.map(({ sectionKey, answers: sAnswers }) => (
            <div key={sectionKey} className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-px flex-1 bg-border/60" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2">
                  {SECTION_LABELS[sectionKey] ?? sectionKey}
                </span>
                <div className="h-px flex-1 bg-border/60" />
              </div>
              {sAnswers.map(renderAnswer)}
            </div>
          ))}

          {unsectionedAnswers.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-px flex-1 bg-border/60" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2">Other</span>
                <div className="h-px flex-1 bg-border/60" />
              </div>
              {unsectionedAnswers.map(renderAnswer)}
            </div>
          )}
        </div>
      )}

      {answers.length === 0 && session.completedAt === null && (
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-sm">The homeowner hasn't completed the questionnaire yet.</p>
          <p className="text-xs mt-1">Share this link: <a href={questionnaireUrl} target="_blank" rel="noopener noreferrer" className="text-canyon underline">{questionnaireUrl}</a></p>
        </div>
      )}
    </div>
  );
}

// ─── Send Questionnaire Dialog ────────────────────────────────────────────────

function SendQuestionnaireDialog({ onClose, onSaved }: { onClose: () => void; onSaved: (token: string) => void }) {
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [salesRepName, setSalesRepName] = useState("");
  const [projectType, setProjectType] = useState<"bathroom" | "kitchen" | "addition" | "basement" | "">("addition");
  const [saving, setSaving] = useState(false);

  const createSession = trpc.questionnaire.createSession.useMutation();

  const handleSend = async () => {
    if (!customerName.trim()) { toast.error("Customer name is required"); return; }
    if (!customerPhone.trim()) { toast.error("Customer phone is required"); return; }
    setSaving(true);
    try {
      const result = await createSession.mutateAsync({
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerEmail: customerEmail.trim(),
        salesRepName: salesRepName.trim(),
        origin: window.location.origin,
        projectType: projectType || undefined,
      });
      onSaved(result.token);
    } catch {
      toast.error("Failed to create questionnaire session");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Send Questionnaire</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Customer Name *</Label>
            <Input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="John Smith" />
          </div>
          <div className="space-y-1.5">
            <Label>Phone Number *</Label>
            <Input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="(801) 555-0123" />
          </div>
          <div className="space-y-1.5">
            <Label>Email (optional)</Label>
            <Input type="email" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} placeholder="john@example.com" />
          </div>
          <div className="space-y-1.5">
            <Label>Sales Rep Name (optional)</Label>
            <Input value={salesRepName} onChange={e => setSalesRepName(e.target.value)} placeholder="Your name" />
          </div>
          <div className="space-y-1.5">
            <Label>Project Type</Label>
            <p className="text-xs text-muted-foreground">Determines which questions are shown to the customer.</p>
            <div className="grid grid-cols-2 gap-2">
              {(["bathroom", "kitchen", "addition", "basement"] as const).map(pt => {
                const labels: Record<string, string> = { bathroom: "Bathroom Remodel", kitchen: "Kitchen Remodel", addition: "Addition", basement: "Basement" };
                return (
                  <button
                    key={pt}
                    type="button"
                    onClick={() => setProjectType(pt)}
                    className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                      projectType === pt
                        ? "bg-canyon text-white border-canyon"
                        : "border-border text-muted-foreground hover:border-canyon/50 hover:text-foreground"
                    }`}
                  >
                    {labels[pt]}
                  </button>
                );
              })}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            A questionnaire link will be generated. If email and GHL are configured, the link will be sent automatically.
          </p>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
          <Button onClick={handleSend} disabled={saving} className="bg-canyon hover:bg-canyon/90 gap-2">
            <Send className="w-4 h-4" />
            {saving ? "Creating…" : "Create & Send"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Catalog Tab ──────────────────────────────────────────────────────────────

interface CatalogItem {
  id: number;
  tradeSheet: string;
  category: string | null;
  name: string;
  unit: string;
  laborCost: string | null;
  materialCost: string | null;
  marginPct: string | null;
  estimatedPrice: string | null;
  minimumPrice: string | null;
  productLink: string | null;
  electricalContext: string | null;
  defaultQtyFormula: string | null;
  notes: string | null;
  isActive: number;
}

function CatalogTab() {
  const utils = trpc.useUtils();
  const [tradeSheetFilter, setTradeSheetFilter] = useState<string>("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editingItem, setEditingItem] = useState<CatalogItem | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const PAGE_SIZE = 50;

  const { data: tradeSheets = [] } = trpc.questionnaire.listTradeSheets.useQuery();
  const { data, isLoading, refetch } = trpc.questionnaire.listCatalogItems.useQuery({
    tradeSheet: tradeSheetFilter || undefined,
    search: search || undefined,
    page,
    pageSize: PAGE_SIZE,
  });

  const updateItem = trpc.questionnaire.updateCatalogItem.useMutation({
    onSuccess: () => {
      utils.questionnaire.listCatalogItems.invalidate();
      setEditingItem(null);
      toast.success("Item updated");
    },
    onError: () => toast.error("Failed to update item"),
  });

  const deleteItem = trpc.questionnaire.deleteCatalogItem.useMutation({
    onSuccess: () => {
      utils.questionnaire.listCatalogItems.invalidate();
      toast.success("Item deleted");
    },
    onError: () => toast.error("Failed to delete item"),
  });

  const createItem = trpc.questionnaire.createCatalogItem.useMutation({
    onSuccess: () => {
      utils.questionnaire.listCatalogItems.invalidate();
      setShowCreateDialog(false);
      toast.success("Item created");
    },
    onError: () => toast.error("Failed to create item"),
  });

  // ── Bulk margin state ────────────────────────────────────────────────────
  const [bulkMarginPct, setBulkMarginPct] = useState<string>("37.5");
  const [bulkMarginScope, setBulkMarginScope] = useState<"all" | "sheet">("all");
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);

  const bulkUpdateMargin = trpc.questionnaire.bulkUpdateMargin.useMutation({
    onSuccess: (result) => {
      utils.questionnaire.listCatalogItems.invalidate();
      setShowBulkConfirm(false);
      toast.success(
        `Updated ${result.updatedCount} item${result.updatedCount !== 1 ? 's' : ''} to ${result.marginPct}% margin${
          result.tradeSheet ? ` (${result.tradeSheet})` : ''
        }`
      );
    },
    onError: () => toast.error("Failed to apply bulk margin"),
  });

  const handleBulkApply = () => {
    const pct = parseFloat(bulkMarginPct);
    if (isNaN(pct) || pct < 0 || pct >= 100) {
      toast.error("Margin must be between 0 and 99.99");
      return;
    }
    bulkUpdateMargin.mutate({
      marginPct: pct,
      tradeSheet: bulkMarginScope === "sheet" && tradeSheetFilter ? tradeSheetFilter : undefined,
    });
  };

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-lg font-display text-charcoal">Cost Catalog</h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            {total} items across {tradeSheets.length} trade sheets — imported from your pricing spreadsheet.
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="gap-2 bg-canyon hover:bg-canyon/90">
          <Plus className="w-4 h-4" /> Add Item
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search items…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>
        <Select value={tradeSheetFilter || "all"} onValueChange={v => { setTradeSheetFilter(v === "all" ? "" : v); setPage(1); }}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All trade sheets" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All trade sheets</SelectItem>
            {tradeSheets.map(s => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Bulk Margin Toolbar */}
      <div className="flex items-center gap-3 flex-wrap p-3 bg-amber-50 border border-amber-200 rounded-xl">
        <div className="flex items-center gap-2 text-sm font-medium text-amber-900">
          <Percent className="w-4 h-4" />
          Bulk Margin Change
        </div>
        <div className="flex items-center gap-1.5">
          <Input
            type="number"
            min={0}
            max={99.99}
            step={0.5}
            value={bulkMarginPct}
            onChange={e => setBulkMarginPct(e.target.value)}
            className="w-24 h-8 text-sm"
            placeholder="37.5"
          />
          <span className="text-sm text-muted-foreground">%</span>
        </div>
        <Select value={bulkMarginScope} onValueChange={v => setBulkMarginScope(v as "all" | "sheet")}>
          <SelectTrigger className="w-[180px] h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All trade sheets</SelectItem>
            <SelectItem value="sheet" disabled={!tradeSheetFilter}>
              {tradeSheetFilter ? `This sheet (${tradeSheetFilter})` : "Select a sheet first"}
            </SelectItem>
          </SelectContent>
        </Select>
        <Button
          size="sm"
          variant="outline"
          className="h-8 border-amber-400 text-amber-900 hover:bg-amber-100"
          onClick={() => setShowBulkConfirm(true)}
          disabled={bulkUpdateMargin.isPending}
        >
          Apply
        </Button>
        <p className="text-xs text-amber-700 flex-1">
          Recalculates <strong>Estimated Price</strong> = (Labor + Material) ÷ (1 − margin%) for every item in scope.
        </p>
      </div>

      {/* Bulk Margin Confirmation Dialog */}
      <Dialog open={showBulkConfirm} onOpenChange={setShowBulkConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Apply Bulk Margin?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will set the margin to <strong>{bulkMarginPct}%</strong> and recalculate the
            estimated price for{" "}
            <strong>
              {bulkMarginScope === "sheet" && tradeSheetFilter
                ? `all items in "${tradeSheetFilter}"`
                : "all catalog items"}
            </strong>.
            This cannot be undone.
          </p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowBulkConfirm(false)}>Cancel</Button>
            <Button
              onClick={handleBulkApply}
              disabled={bulkUpdateMargin.isPending}
              className="bg-canyon hover:bg-canyon/90"
            >
              {bulkUpdateMargin.isPending ? "Applying…" : "Confirm"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Table */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading catalog…</div>
      ) : (
        <div className="border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-sandstone/30 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-charcoal">Trade / Category</th>
                  <th className="text-left px-4 py-3 font-medium text-charcoal">Item Name</th>
                  <th className="text-left px-4 py-3 font-medium text-charcoal">Unit</th>
                  <th className="text-right px-4 py-3 font-medium text-charcoal">Labor</th>
                  <th className="text-right px-4 py-3 font-medium text-charcoal">Material</th>
                  <th className="text-right px-4 py-3 font-medium text-charcoal">Price</th>
                  <th className="text-right px-4 py-3 font-medium text-charcoal">Margin</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.map((item: CatalogItem) => (
                  <tr key={item.id} className={`hover:bg-sandstone/10 transition-colors ${item.isActive === 0 ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-charcoal text-xs">{item.tradeSheet}</div>
                      {item.category && <div className="text-muted-foreground text-xs">{item.category}</div>}
                      {item.electricalContext && (
                        <Badge variant="outline" className="text-xs mt-0.5">{item.electricalContext.replace('_', ' ')}</Badge>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="text-charcoal">{item.name}</div>
                      {item.productLink && (
                        <a href={item.productLink} target="_blank" rel="noopener noreferrer" className="text-xs text-canyon flex items-center gap-1 mt-0.5">
                          <Link2 className="w-3 h-3" /> Product link
                        </a>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">{item.unit}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-sm">
                      {item.laborCost ? `$${parseFloat(item.laborCost).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-sm">
                      {item.materialCost && parseFloat(item.materialCost) > 0 ? `$${parseFloat(item.materialCost).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-sm font-semibold text-charcoal">
                      {item.estimatedPrice ? `$${parseFloat(item.estimatedPrice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right text-muted-foreground text-sm">
                      {item.marginPct ? `${parseFloat(item.marginPct).toFixed(1)}%` : '—'}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1 justify-end">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditingItem(item)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="sm" variant="ghost"
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          onClick={() => { if (confirm(`Delete "${item.name}"?`)) deleteItem.mutate({ id: item.id }); }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-muted-foreground">No items found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t bg-sandstone/10">
              <span className="text-sm text-muted-foreground">
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
              </span>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm">{page} / {totalPages}</span>
                <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                  <ChevronRightIcon className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Edit Dialog */}
      {editingItem && (
        <CatalogItemDialog
          item={editingItem}
          tradeSheets={tradeSheets}
          onClose={() => setEditingItem(null)}
          onSave={(data) => updateItem.mutate({ id: editingItem.id, ...data })}
          saving={updateItem.isPending}
        />
      )}

      {/* Create Dialog */}
      {showCreateDialog && (
        <CatalogItemDialog
          item={null}
          tradeSheets={tradeSheets}
          onClose={() => setShowCreateDialog(false)}
          onSave={(data) => createItem.mutate(data as Parameters<typeof createItem.mutate>[0])}
          saving={createItem.isPending}
        />
      )}
    </div>
  );
}

function CatalogItemDialog({
  item, tradeSheets, onClose, onSave, saving,
}: {
  item: CatalogItem | null;
  tradeSheets: string[];
  onClose: () => void;
  onSave: (data: Record<string, unknown>) => void;
  saving: boolean;
}) {
  const [tradeSheet, setTradeSheet] = useState(item?.tradeSheet ?? "");
  const [category, setCategory] = useState(item?.category ?? "");
  const [name, setName] = useState(item?.name ?? "");
  const [unit, setUnit] = useState(item?.unit ?? "each");
  const [laborCost, setLaborCost] = useState(item?.laborCost ? parseFloat(item.laborCost) : 0);
  const [materialCost, setMaterialCost] = useState(item?.materialCost ? parseFloat(item.materialCost) : 0);
  const [marginPct, setMarginPct] = useState(item?.marginPct ? parseFloat(item.marginPct) : 37.5);
  const [estimatedPrice, setEstimatedPrice] = useState(item?.estimatedPrice ? parseFloat(item.estimatedPrice) : 0);
  const [minimumPrice, setMinimumPrice] = useState(item?.minimumPrice ? parseFloat(item.minimumPrice) : 0);
  const [productLink, setProductLink] = useState(item?.productLink ?? "");
  const [notes, setNotes] = useState(item?.notes ?? "");
  const [defaultQtyFormula, setDefaultQtyFormula] = useState(item?.defaultQtyFormula ?? "");

  // Auto-compute estimated price from labor + material + margin
  const computedPrice = marginPct < 100
    ? (laborCost + materialCost) / (1 - marginPct / 100)
    : 0;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{item ? "Edit Catalog Item" : "Add Catalog Item"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Trade Sheet *</Label>
              <Select value={tradeSheet} onValueChange={setTradeSheet}>
                <SelectTrigger>
                  <SelectValue placeholder="Select trade sheet" />
                </SelectTrigger>
                <SelectContent>
                  {tradeSheets.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  <SelectItem value="__new__">+ New trade sheet</SelectItem>
                </SelectContent>
              </Select>
              {tradeSheet === "__new__" && (
                <Input placeholder="New trade sheet name" onChange={e => setTradeSheet(e.target.value)} />
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Input value={category} onChange={e => setCategory(e.target.value)} placeholder="e.g. Recepticals" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Item Name *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. 110 Outlet 15 amp" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Unit</Label>
              <Select value={unit} onValueChange={setUnit}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["each", "sqft", "lf", "square", "cy", "ls", "hour", "day", "ton"].map(u => (
                    <SelectItem key={u} value={u}>{u}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Margin %</Label>
              <Input type="number" min={0} max={99.99} step={0.5} value={marginPct}
                onChange={e => setMarginPct(parseFloat(e.target.value) || 0)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Labor Cost / unit</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input type="number" min={0} step={0.01} value={laborCost}
                  onChange={e => setLaborCost(parseFloat(e.target.value) || 0)} className="pl-6" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Material Cost / unit</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input type="number" min={0} step={0.01} value={materialCost}
                  onChange={e => setMaterialCost(parseFloat(e.target.value) || 0)} className="pl-6" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>
                Customer Price / unit
                <span className="text-xs text-muted-foreground ml-1">(overrides computed)</span>
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input type="number" min={0} step={0.01} value={estimatedPrice}
                  onChange={e => setEstimatedPrice(parseFloat(e.target.value) || 0)} className="pl-6" />
              </div>
              <p className="text-xs text-muted-foreground">Computed: ${computedPrice.toFixed(2)}</p>
            </div>
            <div className="space-y-1.5">
              <Label>Minimum Price</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input type="number" min={0} step={0.01} value={minimumPrice}
                  onChange={e => setMinimumPrice(parseFloat(e.target.value) || 0)} className="pl-6" />
              </div>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Default Qty Formula</Label>
            <Input value={defaultQtyFormula} onChange={e => setDefaultQtyFormula(e.target.value)}
              placeholder="e.g. sqft / 100  or  lf  or  1" />
            <p className="text-xs text-muted-foreground">Variables: sqft, lf, rooms, floors, bedrooms, bathrooms</p>
          </div>
          <div className="space-y-1.5">
            <Label>Product Link</Label>
            <Input value={productLink} onChange={e => setProductLink(e.target.value)} placeholder="https://…" />
          </div>
          <div className="space-y-1.5">
            <Label>Notes (admin only)</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
          <Button
            disabled={saving || !name.trim() || !tradeSheet.trim()}
            onClick={() => onSave({
              tradeSheet, category: category || undefined, name, unit,
              laborCost, materialCost, marginPct, estimatedPrice, minimumPrice,
              productLink: productLink || undefined, notes: notes || undefined,
              defaultQtyFormula: defaultQtyFormula || undefined,
            })}
            className="bg-canyon hover:bg-canyon/90"
          >
            {saving ? "Saving…" : item ? "Save Changes" : "Create Item"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Pricing Rules Tab ────────────────────────────────────────────────────────

interface DpPricingRule {
  id: number;
  name: string;
  catalogItemId: number;
  conditions: Array<{ questionId: number; optionIds: number[]; operator?: "any" | "all" }>;
  quantity: string;
  tradeSection: string;
  sortOrder: number;
  isActive: number;
  notes: string | null;
}

const TRADE_SECTIONS = [
  "Permitting & Design",
  "Site Prep",
  "Excavation & Earthwork",
  "Footings & Foundation",
  "Framing",
  "Roofing",
  "Electrical",
  "HVAC & Gas",
  "Plumbing",
  "Doors & Windows",
  "Carpentry & Millwork",
  "Exterior Finishes",
  "Insulation",
  "Drywall & Paint",
  "Floor Coverings",
  "Interior Finishes",
  "General",
];

function PricingRulesTab() {
  const utils = trpc.useUtils();
  const { data: rules = [], isLoading } = trpc.questionnaire.listPricingRules.useQuery();
  const { data: questions = [] } = trpc.questionnaire.listQuestions.useQuery();
  const { data: catalogData } = trpc.questionnaire.listCatalogItems.useQuery({ pageSize: 200 });
  const catalogItems = catalogData?.items ?? [];

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingRule, setEditingRule] = useState<DpPricingRule | null>(null);
  const [sectionFilter, setSectionFilter] = useState("");

  const deleteRule = trpc.questionnaire.deletePricingRule.useMutation({
    onSuccess: () => { utils.questionnaire.listPricingRules.invalidate(); toast.success("Rule deleted"); },
    onError: () => toast.error("Failed to delete rule"),
  });

  const toggleRule = trpc.questionnaire.updatePricingRule.useMutation({
    onSuccess: () => utils.questionnaire.listPricingRules.invalidate(),
  });

  const typedRules = rules as DpPricingRule[];
  const typedQuestions = questions as Question[];

  // Group by trade section
  const filtered = sectionFilter ? typedRules.filter(r => r.tradeSection === sectionFilter) : typedRules;
  const grouped = filtered.reduce((acc, rule) => {
    const sec = rule.tradeSection || "General";
    if (!acc[sec]) acc[sec] = [];
    acc[sec].push(rule);
    return acc;
  }, {} as Record<string, DpPricingRule[]>);

  const getCatalogItemName = (id: number) => {
    const item = catalogItems.find((c: CatalogItem) => c.id === id);
    return item ? `${item.tradeSheet} — ${item.name}` : `Item #${id}`;
  };

  const getConditionSummary = (conditions: DpPricingRule["conditions"]) => {
    if (!conditions || conditions.length === 0) return "Always applies";
    return conditions.map(c => {
      const q = typedQuestions.find(q => q.id === c.questionId);
      const qText = q ? q.text.slice(0, 30) : `Q#${c.questionId}`;
      return `${qText}… (${c.optionIds.length} option${c.optionIds.length !== 1 ? 's' : ''})`;
    }).join(" AND ");
  };

  if (isLoading) return <div className="text-center py-12 text-muted-foreground">Loading pricing rules…</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-lg font-display text-charcoal">Pricing Rules</h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Map questionnaire answers to catalog items. The engine sums all triggered items to build the estimate.
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="gap-2 bg-canyon hover:bg-canyon/90">
          <Plus className="w-4 h-4" /> Add Rule
        </Button>
      </div>

      <div className="flex gap-3">
        <Select value={sectionFilter || "all"} onValueChange={v => setSectionFilter(v === "all" ? "" : v)}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="All trade sections" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All trade sections</SelectItem>
            {TRADE_SECTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground self-center">{filtered.length} rules</span>
      </div>

      {Object.keys(grouped).length === 0 && (
        <div className="text-center py-16 border-2 border-dashed border-border rounded-xl">
          <Calculator className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">No pricing rules yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Add rules to map questionnaire answers to catalog items. The engine will sum all triggered items.
          </p>
        </div>
      )}

      {Object.entries(grouped).map(([section, sectionRules]) => (
        <div key={section} className="border rounded-xl overflow-hidden">
          <div className="bg-sandstone/30 px-4 py-3 border-b flex items-center justify-between">
            <h4 className="font-semibold text-charcoal">{section}</h4>
            <Badge variant="outline">{sectionRules.length} rule{sectionRules.length !== 1 ? 's' : ''}</Badge>
          </div>
          <div className="divide-y">
            {sectionRules.map(rule => (
              <div key={rule.id} className={`px-4 py-3 flex items-start gap-3 ${rule.isActive === 0 ? 'opacity-50' : ''}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-charcoal text-sm">{rule.name}</span>
                    {rule.isActive === 0 && <Badge variant="outline" className="text-xs">Inactive</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    <span className="font-medium">Item:</span> {getCatalogItemName(rule.catalogItemId)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    <span className="font-medium">Qty:</span> {rule.quantity} &nbsp;·&nbsp;
                    <span className="font-medium">Condition:</span> {getConditionSummary(rule.conditions)}
                  </div>
                  {rule.notes && <div className="text-xs text-muted-foreground italic mt-0.5">{rule.notes}</div>}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0"
                    onClick={() => toggleRule.mutate({ id: rule.id, isActive: rule.isActive === 1 ? 0 : 1 })}>
                    {rule.isActive === 1 ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditingRule(rule)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                    onClick={() => { if (confirm(`Delete rule "${rule.name}"?`)) deleteRule.mutate({ id: rule.id }); }}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Create/Edit Dialog */}
      {(showCreateDialog || editingRule) && (
        <PricingRuleDialog
          rule={editingRule}
          questions={typedQuestions}
          catalogItems={catalogItems as CatalogItem[]}
          onClose={() => { setShowCreateDialog(false); setEditingRule(null); }}
          onSaved={() => { utils.questionnaire.listPricingRules.invalidate(); setShowCreateDialog(false); setEditingRule(null); }}
        />
      )}
    </div>
  );
}

function PricingRuleDialog({
  rule, questions, catalogItems, onClose, onSaved,
}: {
  rule: DpPricingRule | null;
  questions: Question[];
  catalogItems: CatalogItem[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(rule?.name ?? "");
  const [catalogItemId, setCatalogItemId] = useState<number | null>(rule?.catalogItemId ?? null);
  const [quantity, setQuantity] = useState(rule?.quantity ?? "1");
  const [tradeSection, setTradeSection] = useState(rule?.tradeSection ?? "General");
  const [sortOrder, setSortOrder] = useState(rule?.sortOrder ?? 0);
  const [notes, setNotes] = useState(rule?.notes ?? "");
  const [conditions, setConditions] = useState<DpPricingRule["conditions"]>(rule?.conditions ?? []);
  const [catalogSearch, setCatalogSearch] = useState("");

  const createRule = trpc.questionnaire.createPricingRule.useMutation({
    onSuccess: () => { toast.success("Rule created"); onSaved(); },
    onError: () => toast.error("Failed to create rule"),
  });
  const updateRule = trpc.questionnaire.updatePricingRule.useMutation({
    onSuccess: () => { toast.success("Rule updated"); onSaved(); },
    onError: () => toast.error("Failed to update rule"),
  });

  const saving = createRule.isPending || updateRule.isPending;

  const filteredCatalog = catalogSearch
    ? catalogItems.filter(c => c.name.toLowerCase().includes(catalogSearch.toLowerCase()) || c.tradeSheet.toLowerCase().includes(catalogSearch.toLowerCase()))
    : catalogItems;

  const addCondition = () => {
    if (questions.length === 0) return;
    setConditions(prev => [...prev, { questionId: questions[0].id, optionIds: [], operator: "any" }]);
  };

  const removeCondition = (idx: number) => setConditions(prev => prev.filter((_, i) => i !== idx));

  const updateCondition = (idx: number, field: string, value: unknown) => {
    setConditions(prev => prev.map((c, i) => i === idx ? { ...c, [field]: value } : c));
  };

  const handleSave = () => {
    if (!name.trim() || !catalogItemId) return;
    const payload = { name, catalogItemId, conditions, quantity, tradeSection, sortOrder, notes: notes || undefined };
    if (rule) {
      updateRule.mutate({ id: rule.id, ...payload });
    } else {
      createRule.mutate(payload);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{rule ? "Edit Pricing Rule" : "Add Pricing Rule"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Rule Name *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Addition — Framing Labor" />
          </div>

          {/* Catalog Item Picker */}
          <div className="space-y-1.5">
            <Label>Catalog Item *</Label>
            <Input
              placeholder="Search catalog items…"
              value={catalogSearch}
              onChange={e => setCatalogSearch(e.target.value)}
              className="mb-2"
            />
            <div className="border rounded-lg max-h-40 overflow-y-auto divide-y">
              {filteredCatalog.slice(0, 100).map((item: CatalogItem) => (
                <div
                  key={item.id}
                  className={`px-3 py-2 cursor-pointer hover:bg-sandstone/20 text-sm flex items-center justify-between ${catalogItemId === item.id ? 'bg-canyon/10 border-l-2 border-canyon' : ''}`}
                  onClick={() => setCatalogItemId(item.id)}
                >
                  <div>
                    <span className="font-medium">{item.name}</span>
                    <span className="text-muted-foreground ml-2 text-xs">{item.tradeSheet}{item.electricalContext ? ` (${item.electricalContext.replace('_', ' ')})` : ''}</span>
                  </div>
                  <span className="font-mono text-xs text-charcoal shrink-0 ml-2">
                    ${item.estimatedPrice ? parseFloat(item.estimatedPrice).toFixed(2) : '0.00'}/{item.unit}
                  </span>
                </div>
              ))}
              {filteredCatalog.length === 0 && <div className="px-3 py-4 text-center text-muted-foreground text-sm">No items found</div>}
            </div>
            {catalogItemId && (
              <p className="text-xs text-canyon">
                Selected: {catalogItems.find(c => c.id === catalogItemId)?.name}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Quantity Formula</Label>
              <Input value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="1" />
              <p className="text-xs text-muted-foreground">Variables: sqft, lf, rooms, floors, bedrooms, bathrooms</p>
            </div>
            <div className="space-y-1.5">
              <Label>Trade Section</Label>
              <Select value={tradeSection} onValueChange={setTradeSection}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TRADE_SECTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Conditions */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Conditions (all must match)</Label>
              <Button size="sm" variant="outline" onClick={addCondition} className="gap-1 h-7 text-xs">
                <Plus className="w-3 h-3" /> Add Condition
              </Button>
            </div>
            {conditions.length === 0 && (
              <div className="text-sm text-muted-foreground bg-sandstone/20 rounded-lg px-3 py-2">
                No conditions — this rule always applies (unconditional base item).
              </div>
            )}
            {conditions.map((cond, idx) => {
              const q = questions.find(q => q.id === cond.questionId);
              return (
                <div key={idx} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Select
                      value={String(cond.questionId)}
                      onValueChange={v => updateCondition(idx, 'questionId', parseInt(v))}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select question" />
                      </SelectTrigger>
                      <SelectContent>
                        {questions.map(q => (
                          <SelectItem key={q.id} value={String(q.id)}>
                            {q.text.slice(0, 60)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive" onClick={() => removeCondition(idx)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  {q && q.options.length > 0 && (
                    <div className="space-y-1">
                      <Label className="text-xs">Required options (select all that should trigger this rule):</Label>
                      <div className="flex flex-wrap gap-1.5">
                        {q.options.map(opt => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => {
                              const ids = cond.optionIds.includes(opt.id)
                                ? cond.optionIds.filter(id => id !== opt.id)
                                : [...cond.optionIds, opt.id];
                              updateCondition(idx, 'optionIds', ids);
                            }}
                            className={`px-2 py-1 rounded text-xs border transition-colors ${
                              cond.optionIds.includes(opt.id)
                                ? 'bg-canyon text-white border-canyon'
                                : 'bg-white text-charcoal border-border hover:border-canyon'
                            }`}
                          >
                            {opt.text}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="space-y-1.5">
            <Label>Notes (admin only)</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
          <Button disabled={saving || !name.trim() || !catalogItemId} onClick={handleSave} className="bg-canyon hover:bg-canyon/90">
            {saving ? "Saving…" : rule ? "Save Changes" : "Create Rule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Cabinet Pricing Tab ──────────────────────────────────────────────────────

interface CabinetRow {
  id: number;
  vendor: string;
  collection: string | null;
  style: string;
  color: string;
  code: string;
  optionLabel: string;
  lineItemType: "base" | "upper" | "pantry";
  unit: string;
  msrpUnitPrice: string;
  discountedUnitPrice: string;
  marginPct: string;
  estimatedPrice: string;
  isActive: number;
}

function CabinetPricingTab() {
  const [vendorFilter, setVendorFilter] = useState<string>("all");
  const [lineTypeFilter, setLineTypeFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [editingRow, setEditingRow] = useState<CabinetRow | null>(null);
  const [bulkMargin, setBulkMargin] = useState("37.5");
  const [bulkVendor, setBulkVendor] = useState<string>("all");
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);

  const utils = trpc.useUtils();
  const { data: vendors = [] } = trpc.questionnaire.listCabinetVendors.useQuery();
  const { data: rows = [], isLoading } = trpc.questionnaire.listCabinetPricing.useQuery(
    vendorFilter !== "all" ? { vendor: vendorFilter } : undefined
  );

  const updateRow = trpc.questionnaire.updateCabinetPricingRow.useMutation({
    onSuccess: () => {
      toast.success("Cabinet pricing row updated");
      utils.questionnaire.listCabinetPricing.invalidate();
      setEditingRow(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const bulkUpdateMargin = trpc.questionnaire.bulkUpdateCabinetMargin.useMutation({
    onSuccess: (res) => {
      toast.success(`Updated margin to ${res.marginPct}% on ${res.updated} rows`);
      utils.questionnaire.listCabinetPricing.invalidate();
      setShowBulkConfirm(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const syncToCatalog = trpc.questionnaire.syncCabinetsToCatalog.useMutation({
    onSuccess: (res) => {
      toast.success(`Synced ${res.synced} cabinet rows to Cost Catalog`);
      utils.questionnaire.listCabinetPricing.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const filtered = rows.filter(r => {
    if (lineTypeFilter !== "all" && r.lineItemType !== lineTypeFilter) return false;
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return r.optionLabel.toLowerCase().includes(q) || r.color.toLowerCase().includes(q) || r.style.toLowerCase().includes(q) || r.code.toLowerCase().includes(q);
  });

  // Group by vendor → optionLabel
  const grouped = filtered.reduce<Record<string, Record<string, CabinetRow[]>>>((acc, row) => {
    if (!acc[row.vendor]) acc[row.vendor] = {};
    if (!acc[row.vendor][row.optionLabel]) acc[row.vendor][row.optionLabel] = [];
    acc[row.vendor][row.optionLabel].push(row);
    return acc;
  }, {});

  const lineTypeLabel = (t: string) => t === "base" ? "Base (LF)" : t === "upper" ? "Upper (LF)" : "Pantry (EA)";
  const lineTypeBadge = (t: string) => t === "base" ? "bg-blue-100 text-blue-800" : t === "upper" ? "bg-purple-100 text-purple-800" : "bg-amber-100 text-amber-800";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-charcoal">Cabinetry Pricing</h2>
          <p className="text-sm text-muted-foreground">
            Woodoo Cabinetry &amp; US Cabinet Depot — {rows.length} line items across {vendors.length} vendors
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => syncToCatalog.mutate()}
            disabled={syncToCatalog.isPending}
            className="gap-1.5"
          >
            <RefreshCw className={`w-4 h-4 ${syncToCatalog.isPending ? "animate-spin" : ""}`} />
            Sync to Cost Catalog
          </Button>
        </div>
      </div>

      {/* Bulk Margin Toolbar */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Percent className="w-4 h-4 text-amber-700" />
          <span className="text-sm font-medium text-amber-900">Bulk Margin Change</span>
        </div>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="space-y-1">
            <Label className="text-xs text-amber-800">New Margin %</Label>
            <Input
              type="number"
              min="0"
              max="99.99"
              step="0.5"
              value={bulkMargin}
              onChange={e => setBulkMargin(e.target.value)}
              className="w-28 h-8 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-amber-800">Vendor Scope</Label>
            <Select value={bulkVendor} onValueChange={setBulkVendor}>
              <SelectTrigger className="w-52 h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Vendors</SelectItem>
                {vendors.map(v => (
                  <SelectItem key={v} value={v}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            size="sm"
            className="bg-amber-600 hover:bg-amber-700 text-white h-8"
            onClick={() => setShowBulkConfirm(true)}
          >
            Apply Margin
          </Button>
        </div>
        <p className="text-xs text-amber-700">
          Recalculates <code>estimatedPrice = discountedPrice ÷ (1 − margin%)</code> for all matching rows.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, color, code…"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <Select value={vendorFilter} onValueChange={setVendorFilter}>
          <SelectTrigger className="w-52 h-9">
            <SelectValue placeholder="All Vendors" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Vendors</SelectItem>
            {vendors.map(v => (
              <SelectItem key={v} value={v}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={lineTypeFilter} onValueChange={setLineTypeFilter}>
          <SelectTrigger className="w-40 h-9">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="base">Base Cabinets</SelectItem>
            <SelectItem value="upper">Upper Cabinets</SelectItem>
            <SelectItem value="pantry">Pantry / Utility</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table grouped by vendor → option */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading cabinet pricing…</div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No cabinet pricing rows found.</div>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([vendor, options]) => (
            <div key={vendor} className="space-y-4">
              <div className="flex items-center gap-2 pb-1 border-b border-border">
                <Building2 className="w-4 h-4 text-canyon" />
                <h3 className="font-semibold text-charcoal">{vendor}</h3>
                <span className="text-xs text-muted-foreground">
                  ({Object.values(options).flat().length} line items)
                </span>
              </div>
              <div className="space-y-3">
                {Object.entries(options).map(([optionLabel, lineItems]) => (
                  <div key={optionLabel} className="bg-white border border-border/60 rounded-lg overflow-hidden shadow-sm">
                    <div className="bg-stone-50 px-4 py-2 border-b border-border/40">
                      <span className="text-sm font-medium text-charcoal">{optionLabel}</span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        ({lineItems[0]?.code})
                      </span>
                    </div>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-xs text-muted-foreground border-b border-border/30">
                          <th className="text-left px-4 py-2 font-medium">Line Item</th>
                          <th className="text-right px-4 py-2 font-medium">MSRP / Unit</th>
                          <th className="text-right px-4 py-2 font-medium">Discounted / Unit</th>
                          <th className="text-right px-4 py-2 font-medium">Margin %</th>
                          <th className="text-right px-4 py-2 font-medium">Est. Price / Unit</th>
                          <th className="px-4 py-2"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {lineItems.map(row => (
                          <tr key={row.id} className="border-b border-border/20 last:border-0 hover:bg-stone-50/50">
                            <td className="px-4 py-2">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${lineTypeBadge(row.lineItemType)}`}>
                                {lineTypeLabel(row.lineItemType)}
                              </span>
                            </td>
                            <td className="px-4 py-2 text-right text-muted-foreground">
                              ${parseFloat(row.msrpUnitPrice).toFixed(2)}
                            </td>
                            <td className="px-4 py-2 text-right">
                              ${parseFloat(row.discountedUnitPrice).toFixed(2)}
                            </td>
                            <td className="px-4 py-2 text-right">
                              {parseFloat(row.marginPct).toFixed(1)}%
                            </td>
                            <td className="px-4 py-2 text-right font-medium text-charcoal">
                              ${parseFloat(row.estimatedPrice).toFixed(2)}
                            </td>
                            <td className="px-4 py-2 text-right">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0"
                                onClick={() => setEditingRow(row)}
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bulk Margin Confirm Dialog */}
      <Dialog open={showBulkConfirm} onOpenChange={setShowBulkConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Bulk Margin Change</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              You are about to set the margin to <strong>{bulkMargin}%</strong> on{" "}
              <strong>{bulkVendor === "all" ? "all vendors" : bulkVendor}</strong>.
            </p>
            <p>
              This will recalculate <code>estimatedPrice</code> for all matching rows.
              This action cannot be undone automatically.
            </p>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              className="bg-amber-600 hover:bg-amber-700 text-white"
              disabled={bulkUpdateMargin.isPending}
              onClick={() => bulkUpdateMargin.mutate({
                marginPct: parseFloat(bulkMargin),
                vendor: bulkVendor === "all" ? undefined : bulkVendor,
              })}
            >
              {bulkUpdateMargin.isPending ? "Applying…" : `Apply ${bulkMargin}% Margin`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Row Dialog */}
      {editingRow && (
        <Dialog open={!!editingRow} onOpenChange={() => setEditingRow(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Cabinet Pricing Row</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 text-sm">
              <div className="bg-stone-50 rounded p-3 space-y-1">
                <p className="font-medium text-charcoal">{editingRow.optionLabel}</p>
                <p className="text-muted-foreground">{editingRow.vendor} · {lineTypeLabel(editingRow.lineItemType)} · Code: {editingRow.code}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs">MSRP / Unit ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    defaultValue={parseFloat(editingRow.msrpUnitPrice)}
                    id="edit-msrp"
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Discounted / Unit ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    defaultValue={parseFloat(editingRow.discountedUnitPrice)}
                    id="edit-discounted"
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Margin %</Label>
                  <Input
                    type="number"
                    step="0.5"
                    min="0"
                    max="99.99"
                    defaultValue={parseFloat(editingRow.marginPct)}
                    id="edit-margin"
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Est. Price / Unit ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    defaultValue={parseFloat(editingRow.estimatedPrice)}
                    id="edit-estimated"
                    className="h-9"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Tip: Set Margin % to auto-recalculate Est. Price from Discounted price.
              </p>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button
                disabled={updateRow.isPending}
                className="bg-canyon hover:bg-canyon/90"
                onClick={() => {
                  const msrp = parseFloat((document.getElementById("edit-msrp") as HTMLInputElement).value);
                  const discounted = parseFloat((document.getElementById("edit-discounted") as HTMLInputElement).value);
                  const margin = parseFloat((document.getElementById("edit-margin") as HTMLInputElement).value);
                  const estimated = parseFloat((document.getElementById("edit-estimated") as HTMLInputElement).value);
                  updateRow.mutate({
                    id: editingRow.id,
                    msrpUnitPrice: isNaN(msrp) ? undefined : msrp,
                    discountedUnitPrice: isNaN(discounted) ? undefined : discounted,
                    marginPct: isNaN(margin) ? undefined : margin,
                    estimatedPrice: isNaN(estimated) ? undefined : estimated,
                  });
                }}
              >
                {updateRow.isPending ? "Saving…" : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
