/**
 * Design Package Admin Portal
 * Same layout as Admin.tsx but scoped to Design Package management only.
 * Accessible at /admin-dp — toggle between portals via the header pill.
 */
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  LogOut, ArrowLeft, Loader2, ChevronRight, Home, PenLine, Mail, Save,
  Users, FileText, Zap, DollarSign, BarChart3, Package, Settings, ToggleLeft, ToggleRight, RefreshCw, ClipboardList, GripVertical,
  Upload, Eye, X, ExternalLink, Trash2, Plus, Pencil, Bath, Tag, Check,
  UtensilsCrossed, Building2, Layers, Calculator, AppWindow,
} from "lucide-react";
import React, { useState } from "react";
import { SortableList } from "@/components/SortableList";
import { FileUploadZone } from "@/components/FileUploadZone";
import { QuestionnaireBuilderPanel } from "@/components/QuestionnaireBuilderPanel";
import { useCalcUser } from "@/hooks/useCalcUser";
import { InitialConsultAdminPanel } from "@/components/InitialConsultAdminPanel";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663346810257/CCcDY8JrM76jeYgqBkzZHs/logo_1fad62fa.png";

// ─── Lazy-import panels from Admin.tsx via re-export trick ─────────────────
// We import the heavy Admin page and use its exported sub-panels via a thin wrapper.
// Since Admin.tsx doesn't export sub-panels, we inline lightweight wrappers here
// that call the same tRPC hooks.

// ─── Portal Toggle Pill ────────────────────────────────────────────────────
function PortalToggle({ current }: { current: "decking" | "design-package" }) {
  const [, navigate] = useLocation();
  return (
    <div className="flex items-center bg-white/10 rounded-full p-0.5 gap-0.5">
      <button
        onClick={() => { if (current !== "decking") navigate("/admin"); }}
        className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
          current === "decking"
            ? "bg-white text-charcoal shadow-sm"
            : "text-warm-cream/70 hover:text-white"
        }`}
      >
        Decking
      </button>
      <button
        onClick={() => { if (current !== "design-package") navigate("/admin-dp"); }}
        className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
          current === "design-package"
            ? "bg-canyon text-white shadow-sm"
            : "text-warm-cream/70 hover:text-white"
        }`}
      >
        Design Package
      </button>
    </div>
  );
}

// ─── Inline DesignPackagePanel (same as in Admin.tsx) ─────────────────────
function DesignPackageItemsPanel({ utils }: { utils: ReturnType<typeof trpc.useUtils> }) {
  const { data: items = [], isLoading } = trpc.designPackage.getAll.useQuery();
  const createMutation = trpc.designPackage.create.useMutation({
    onSuccess: () => { utils.designPackage.getAll.invalidate(); utils.admin.getConfig.invalidate(); toast.success("Item created"); },
    onError: (e) => toast.error(e.message),
  });
  const updateMutation = trpc.designPackage.update.useMutation({
    onSuccess: () => { utils.designPackage.getAll.invalidate(); utils.admin.getConfig.invalidate(); toast.success("Item updated"); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMutation = trpc.designPackage.delete.useMutation({
    onSuccess: () => { utils.designPackage.getAll.invalidate(); utils.admin.getConfig.invalidate(); toast.success("Item deleted"); },
    onError: (e) => toast.error(e.message),
  });
  const reorderMutation = trpc.designPackage.reorderItems.useMutation({
    onError: (e) => toast.error("Reorder failed: " + e.message),
  });

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "", subtitle: "", pricingType: "flat" as "sqft" | "flat" | "rendering",
    costPerSqft: "0.00", flatCost: "0.00", markupPct: "50.00", projectTypes: "all",
    renderingType: "" as "" | "small_bathroom" | "large_bathroom" | "kitchen" | "exterior",
    isActive: 1,
    isDefaultEnabled: 1,
    designHours: "0",
  });

  const PROJECT_TYPES = ["addition", "basement", "full_home_remodel", "kitchen", "bathroom"];
  const PRICING_TYPES = [
    { value: "sqft", label: "Per Sqft" },
    { value: "flat", label: "Flat Fee" },
    { value: "rendering", label: "3D Rendering" },
  ];
  const RENDERING_TYPES = [
    { value: "small_bathroom", label: "Small Bathroom/Area ($500)" },
    { value: "large_bathroom", label: "Large Bathroom/Area ($1,000)" },
    { value: "kitchen", label: "Kitchen ($1,500)" },
    { value: "exterior", label: "Exterior ($850)" },
  ];

  const fmt = (n: number | string) => Number(n).toFixed(2);
  // Gross profit %: sell = cost / (1 - gp%)
  const sellPrice = (item: any) => {
    const pt = item.pricingType;
    const cost = pt === "sqft" ? Number(item.costPerSqft) : Number(item.flatCost);
    const gp = Number(item.markupPct) / 100;
    if (gp >= 1) return cost;
    return cost / (1 - gp);
  };

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-canyon" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-display text-charcoal">Design Package Items</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Manage services, costs, and gross profit % for each design package item.</p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)} className="bg-canyon hover:bg-canyon/90 text-white">
          + Add Item
        </Button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
          <h4 className="text-sm font-semibold text-charcoal">New Design Package Item</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Name</label>
              <input className="w-full mt-1 px-3 py-1.5 text-sm border border-border rounded-lg" value={createForm.name} onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Subtitle <span className="text-muted-foreground/60">(optional — shown below name in calculator)</span></label>
              <input className="w-full mt-1 px-3 py-1.5 text-sm border border-border rounded-lg" placeholder="e.g. Included in all packages" value={createForm.subtitle} onChange={e => setCreateForm(f => ({ ...f, subtitle: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Pricing Type</label>
              <select className="w-full mt-1 px-3 py-1.5 text-sm border border-border rounded-lg bg-white" value={createForm.pricingType} onChange={e => setCreateForm(f => ({ ...f, pricingType: e.target.value as any }))}>
                {PRICING_TYPES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">{createForm.pricingType === "sqft" ? "Cost/Sqft ($)" : "Flat Cost ($)"}</label>
              <input type="number" step="0.01" className="w-full mt-1 px-3 py-1.5 text-sm border border-border rounded-lg"
                value={createForm.pricingType === "sqft" ? createForm.costPerSqft : createForm.flatCost}
                onChange={e => setCreateForm(f => createForm.pricingType === "sqft" ? { ...f, costPerSqft: e.target.value } : { ...f, flatCost: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Markup %</label>
              <input type="number" step="0.1" className="w-full mt-1 px-3 py-1.5 text-sm border border-border rounded-lg" value={createForm.markupPct} onChange={e => setCreateForm(f => ({ ...f, markupPct: e.target.value }))} />
            </div>
            {createForm.pricingType === "rendering" && (
              <>
              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-muted-foreground">Rendering Type</label>
                <select className="w-full mt-1 px-3 py-1.5 text-sm border border-border rounded-lg bg-white" value={createForm.renderingType} onChange={e => setCreateForm(f => ({ ...f, renderingType: e.target.value as any }))}>
                  <option value="">— Select —</option>
                  {RENDERING_TYPES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Design Hours (base hours per space)</label>
                <input type="number" step="0.5" min="0" className="w-full mt-1 px-3 py-1.5 text-sm border border-border rounded-lg" value={createForm.designHours} onChange={e => setCreateForm(f => ({ ...f, designHours: e.target.value }))} />
              </div>
              </>
            )}
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-muted-foreground">Applicable Project Types (comma-separated or "all")</label>
              <input className="w-full mt-1 px-3 py-1.5 text-sm border border-border rounded-lg" placeholder="all" value={createForm.projectTypes} onChange={e => setCreateForm(f => ({ ...f, projectTypes: e.target.value }))} />
            </div>
            <div className="sm:col-span-2 flex items-center gap-4">
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                <input type="checkbox" checked={createForm.isActive === 1} onChange={e => setCreateForm(f => ({ ...f, isActive: e.target.checked ? 1 : 0 }))} className="w-4 h-4 accent-canyon" />
                Active
              </label>
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer" title="When off, this item appears in the calculator but starts unchecked (opt-in add-on)">
                <input type="checkbox" checked={createForm.isDefaultEnabled === 1} onChange={e => setCreateForm(f => ({ ...f, isDefaultEnabled: e.target.checked ? 1 : 0 }))} className="w-4 h-4 accent-canyon" />
                Default ON (checked by default in calculator)
              </label>
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <Button size="sm" className="bg-canyon hover:bg-canyon/90 text-white" onClick={() => {
              createMutation.mutate({
                name: createForm.name,
                description: createForm.subtitle, // subtitle stored in description field for now
                pricingType: createForm.pricingType,
                costPerSqft: Number(createForm.costPerSqft),
                flatCost: Number(createForm.flatCost),
                markupPct: Number(createForm.markupPct),
                projectTypes: createForm.projectTypes || "all",
                renderingType: (createForm.renderingType || undefined) as any,
                isActive: createForm.isActive,
                isDefaultEnabled: createForm.isDefaultEnabled,
                designHours: Number(createForm.designHours),
              });
              setShowCreate(false);
              setCreateForm({ name: "", subtitle: "", pricingType: "flat", costPerSqft: "0.00", flatCost: "0.00", markupPct: "50.00", projectTypes: "all", renderingType: "", isActive: 1, isDefaultEnabled: 1, designHours: "0" });
            }}>Save</Button>
            <Button size="sm" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Items list */}
      <SortableList
        items={items}
        onReorder={(reordered) => {
          reorderMutation.mutate(reordered.map((it: any, idx: number) => ({ id: it.id, sortOrder: idx })));
        }}
        className="space-y-3"
        renderItem={(item: any, dragHandleProps) => (
          <div className="bg-white rounded-xl border border-border/60 shadow-sm p-4">
            {editingId === item.id ? (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Name</label>
                    <input className="w-full mt-1 px-3 py-1.5 text-sm border border-border rounded-lg" value={editForm.name ?? item.name} onChange={e => setEditForm((f: any) => ({ ...f, name: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Subtitle <span className="text-muted-foreground/60">(optional — shown below name in calculator)</span></label>
                    <input className="w-full mt-1 px-3 py-1.5 text-sm border border-border rounded-lg" placeholder="e.g. Included in all packages" value={editForm.subtitle ?? (item as any).subtitle ?? ''} onChange={e => setEditForm((f: any) => ({ ...f, subtitle: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Pricing Type</label>
                    <select className="w-full mt-1 px-3 py-1.5 text-sm border border-border rounded-lg bg-white" value={editForm.pricingType ?? item.pricingType} onChange={e => setEditForm((f: any) => ({ ...f, pricingType: e.target.value }))}>
                      {PRICING_TYPES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">
                      {(editForm.pricingType ?? item.pricingType) === "sqft" ? "Cost/Sqft ($)" : "Flat Cost ($)"}
                    </label>
                    {(editForm.pricingType ?? item.pricingType) === "sqft" ? (
                      <input type="number" step="0.0001" className="w-full mt-1 px-3 py-1.5 text-sm border border-border rounded-lg"
                        value={editForm.costPerSqft ?? item.costPerSqft}
                        onChange={e => setEditForm((f: any) => ({ ...f, costPerSqft: e.target.value }))} />
                    ) : (
                      <input type="number" step="0.01" className="w-full mt-1 px-3 py-1.5 text-sm border border-border rounded-lg"
                        value={editForm.flatCost ?? item.flatCost}
                        onChange={e => setEditForm((f: any) => ({ ...f, flatCost: e.target.value }))} />
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Markup %</label>
                    <input type="number" step="0.1" className="w-full mt-1 px-3 py-1.5 text-sm border border-border rounded-lg" value={editForm.markupPct ?? item.markupPct} onChange={e => setEditForm((f: any) => ({ ...f, markupPct: e.target.value }))} />
                  </div>
                  {(editForm.pricingType ?? item.pricingType) === "rendering" && (
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Rendering Type</label>
                      <select className="w-full mt-1 px-3 py-1.5 text-sm border border-border rounded-lg bg-white" value={editForm.renderingType ?? item.renderingType ?? ""} onChange={e => setEditForm((f: any) => ({ ...f, renderingType: e.target.value }))}>
                        <option value="">— Select —</option>
                        {RENDERING_TYPES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                      </select>
                    </div>
                  )}
                  {(editForm.pricingType ?? item.pricingType) === "rendering" && (
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Design Hours (base hours per space)</label>
                      <input type="number" step="0.5" min="0" className="w-full mt-1 px-3 py-1.5 text-sm border border-border rounded-lg" value={editForm.designHours ?? (item as any).designHours ?? "0"} onChange={e => setEditForm((f: any) => ({ ...f, designHours: e.target.value }))} />
                    </div>
                  )}
                  <div className="sm:col-span-2">
                    <label className="text-xs font-medium text-muted-foreground">Applicable Project Types</label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {PROJECT_TYPES.map(pt => {
                        // projectTypes is a comma-separated string like "addition,full_home_remodel" or "all"
                        const rawTypes: string = editForm.projectTypes ?? item.projectTypes ?? "all";
                        const typeList = rawTypes === "all" ? PROJECT_TYPES : rawTypes.split(",").map((s: string) => s.trim());
                        const active = typeList.includes(pt);
                        return (
                          <button key={pt} type="button"
                            onClick={() => {
                              const newList = active ? typeList.filter((x: string) => x !== pt) : [...typeList, pt];
                              setEditForm((f: any) => ({ ...f, projectTypes: newList.join(",") }));
                            }}
                            className={`px-2 py-1 rounded-full text-xs font-medium border transition-colors ${active ? "bg-canyon text-white border-canyon" : "bg-white text-charcoal border-border"}`}
                          >
                            {{ addition: "Addition", basement: "Basement", full_home_remodel: "Full Home Remodel", kitchen: "Kitchen", bathroom: "Bathroom" }[pt] ?? pt.replace(/_/g, " ")}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 flex-wrap">
                    <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                      <input type="checkbox" checked={editForm.isActive ?? Boolean(item.isActive)} onChange={e => setEditForm((f: any) => ({ ...f, isActive: e.target.checked }))} className="w-4 h-4 accent-canyon" />
                      Active
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer" title="When off, this item appears in the calculator but starts unchecked (opt-in add-on)">
                      <input type="checkbox"
                        checked={(editForm.isDefaultEnabled !== undefined ? editForm.isDefaultEnabled : (item as any).isDefaultEnabled ?? 1) === 1}
                        onChange={e => setEditForm((f: any) => ({ ...f, isDefaultEnabled: e.target.checked ? 1 : 0 }))}
                        className="w-4 h-4 accent-canyon" />
                      Default ON (checked by default in calculator)
                    </label>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="bg-canyon hover:bg-canyon/90 text-white" onClick={() => {
                    const payload: any = { id: item.id };
                    if (editForm.name !== undefined) payload.name = editForm.name;
                    if (editForm.subtitle !== undefined) payload.subtitle = editForm.subtitle;
                    if (editForm.pricingType !== undefined) payload.pricingType = editForm.pricingType;
                    if (editForm.costPerSqft !== undefined) payload.costPerSqft = Number(editForm.costPerSqft);
                    if (editForm.flatCost !== undefined) payload.flatCost = Number(editForm.flatCost);
                    if (editForm.markupPct !== undefined) payload.markupPct = Number(editForm.markupPct);
                    if (editForm.projectTypes !== undefined) payload.projectTypes = editForm.projectTypes;
                    if (editForm.renderingType !== undefined) payload.renderingType = editForm.renderingType || undefined;
                    if (editForm.designHours !== undefined) payload.designHours = Number(editForm.designHours);
                    if (editForm.isActive !== undefined) payload.isActive = editForm.isActive ? 1 : 0;
                    if (editForm.isDefaultEnabled !== undefined) payload.isDefaultEnabled = editForm.isDefaultEnabled;
                    updateMutation.mutate(payload);
                    setEditingId(null);
                    setEditForm({});
                  }}>Save</Button>
                  <Button size="sm" variant="outline" onClick={() => { setEditingId(null); setEditForm({}); }}>Cancel</Button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm text-charcoal">{item.name}</span>
                    {(item as any).subtitle && <span className="text-xs text-muted-foreground italic ml-1">{(item as any).subtitle}</span>}
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${item.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>{item.isActive ? "Active" : "Inactive"}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">{item.pricingType.replace(/_/g, " ")}</span>
                    {(item as any).isDefaultEnabled === 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 font-medium" title="This item starts unchecked in the calculator (opt-in add-on)">opt-in</span>
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                    {item.pricingType === "sqft" ? (
                      <span>Cost: <strong className="text-charcoal">${fmt(item.costPerSqft)}/sqft</strong></span>
                    ) : (
                      <span>Cost: <strong className="text-charcoal">${fmt(item.flatCost)}</strong></span>
                    )}
                    <span>Markup: <strong className="text-charcoal">{fmt(item.markupPct)}%</strong></span>
                    <span>Sell: <strong className="text-canyon">${fmt(sellPrice(item))}{item.pricingType === "sqft" ? "/sqft" : ""}</strong></span>
                    {item.pricingType === "rendering" && Number((item as any).designHours) > 0 && (
                      <span>Hours: <strong className="text-charcoal">{fmt((item as any).designHours)}h</strong></span>
                    )}
                    {item.projectTypes && item.projectTypes !== "all" && (
                      <span>Types: <strong className="text-charcoal">{item.projectTypes.split(",").map((t: string) => t.trim().replace(/_/g, " ")).join(", ")}</strong></span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button
                    ref={dragHandleProps.ref}
                    style={dragHandleProps.style}
                    {...dragHandleProps.listeners}
                    {...dragHandleProps.attributes}
                    className="p-1 text-muted-foreground/40 hover:text-muted-foreground rounded"
                    title="Drag to reorder"
                  >
                    <GripVertical className="w-4 h-4" />
                  </button>
                  <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => { setEditingId(item.id); setEditForm({}); }}>Edit</Button>
                  <Button size="sm" variant="outline" className="h-7 px-2 text-xs text-red-600 hover:bg-red-50 border-red-200" onClick={() => { if (confirm("Delete this item?")) deleteMutation.mutate({ id: item.id }); }}>Del</Button>
                </div>
              </div>
            )}
          </div>
        )}
      />
      {items.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No design package items yet. Add one above.</p>}
    </div>
  );
}

// ─── Commission Panel ──────────────────────────────────────────────────────
function DPCommissionPanel({ utils }: { utils: ReturnType<typeof trpc.useUtils> }) {
  const { data: rows = [], isLoading } = trpc.designPackage.getCommission.useQuery();
  const upsertMutation = trpc.designPackage.updateCommission.useMutation({
    onSuccess: () => { utils.designPackage.getCommission.invalidate(); toast.success("Commission saved"); },
    onError: (e: any) => toast.error(e.message),
  });
  const [editing, setEditing] = useState<Record<number, string>>({});

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-canyon" /></div>;

  const PROJECT_LABELS: Record<string, string> = {
    bathroom: "Bathroom Remodel",
    kitchen: "Kitchen Remodel",
    full_home_remodel: "Full Home Remodel",
    addition: "Addition",
    basement: "Basement Finish",
    feasibility_study: "Feasibility Study",
  };

  const projectRows = rows.filter((r: any) => r.projectType !== 'feasibility_study');
  const feasibilityRow = rows.find((r: any) => r.projectType === 'feasibility_study');

  const CommissionRow = ({ row }: { row: any }) => (
    <div className="bg-white rounded-xl border border-border/60 shadow-sm p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <span className="text-sm font-medium text-charcoal">{PROJECT_LABELS[row.projectType] ?? row.label ?? row.projectType.replace(/_/g, ' ')}</span>
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">$</span>
        <input
          type="number" step="1" min="0"
          className="w-24 px-2 py-1 text-sm border border-border rounded-lg text-right"
          value={editing[row.id] ?? row.commissionAmount ?? row.amount}
          onChange={e => setEditing(prev => ({ ...prev, [row.id]: e.target.value }))}
        />
        {editing[row.id] !== undefined && editing[row.id] !== String(row.commissionAmount ?? row.amount) && (
          <Button size="sm" className="h-7 px-2 text-xs bg-canyon hover:bg-canyon/90 text-white" onClick={() => {
            upsertMutation.mutate({ projectType: row.projectType as any, label: row.label, commissionAmount: Number(editing[row.id]) });
            setEditing(prev => { const n = { ...prev }; delete n[row.id]; return n; });
          }}>Save</Button>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-base font-display text-charcoal">Sales Rep Commission</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Commission is baked into the bulk total and never shown to the customer.</p>
      </div>

      {/* Design Package rows by project type */}
      <div className="space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Design Package — by Project Type</p>
        {projectRows.map((row: any) => <CommissionRow key={row.id} row={row} />)}
      </div>

      {/* Feasibility Study — separate section */}
      <div className="space-y-3 pt-3 border-t border-border/40">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Feasibility Study</p>
        <p className="text-xs text-muted-foreground">Rep commission baked into the $1,000 feasibility study fee. Not shown to customer.</p>
        {feasibilityRow ? (
          <CommissionRow row={feasibilityRow} />
        ) : (
          <div className="flex items-center gap-3 py-2">
            <span className="text-sm text-muted-foreground italic">No feasibility study commission row found.</span>
            <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() =>
              upsertMutation.mutate({ projectType: 'feasibility_study', label: 'Feasibility Study', commissionAmount: 250 })
            }>Add Row ($250 default)</Button>
          </div>
        )}
      </div>

      {rows.length === 0 && (
        <div className="text-center py-4">
          <p className="text-sm text-muted-foreground mb-3">No commission rows found.</p>
          <Button size="sm" className="bg-canyon hover:bg-canyon/90 text-white" onClick={() => {
            const seedDefaults: Array<{ projectType: 'bathroom' | 'kitchen' | 'full_home_remodel' | 'addition' | 'basement' | 'feasibility_study', label: string, commissionAmount: number }> = [
              { projectType: 'bathroom', label: 'Bathroom Remodel', commissionAmount: 750 },
              { projectType: 'kitchen', label: 'Kitchen Remodel', commissionAmount: 750 },
              { projectType: 'full_home_remodel', label: 'Full Home Remodel', commissionAmount: 1000 },
              { projectType: 'addition', label: 'Addition', commissionAmount: 2000 },
              { projectType: 'basement', label: 'Basement Finish', commissionAmount: 675 },
              { projectType: 'feasibility_study', label: 'Feasibility Study', commissionAmount: 250 },
            ];
            seedDefaults.forEach(d => upsertMutation.mutate(d));
          }}>Seed Defaults</Button>
        </div>
      )}
    </div>
  );
}

// ─── Discounts Panel ───────────────────────────────────────────────────────
function DPDiscountsPanel({ utils }: { utils: ReturnType<typeof trpc.useUtils> }) {
  const { data: discounts = [], isLoading } = trpc.designPackage.getDiscounts.useQuery();
  const upsertMutation = trpc.designPackage.updateDiscount.useMutation({
    onSuccess: () => { utils.designPackage.getDiscounts.invalidate(); utils.admin.getConfig.invalidate(); toast.success("Discount saved"); },
    onError: (e: any) => toast.error(e.message),
  });
  const [editing, setEditing] = useState<Record<number, { name?: string; pct?: string }>>({});

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-canyon" /></div>;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-display text-charcoal">Discount Buttons</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Configure the early bird and same-day discount buttons shown in the Design Package Calculator. Use the toggle to activate or deactivate each discount.</p>
      </div>
      <div className="space-y-3">
        {discounts.map((d: any) => {
          const e = editing[d.id] ?? {};
          const name = e.name ?? d.name;
          const pct = e.pct ?? String(d.discountPct ?? d.pct ?? "0");
          // isActive comes from DB as 0/1 integer — compare strictly
          const isActiveDb = Number(d.isActive) === 1;
          const dirty = Object.keys(e).length > 0;
          return (
            <div key={d.id} className={`bg-white rounded-xl border shadow-sm p-4 transition-opacity ${isActiveDb ? "border-border/60" : "border-border/30 opacity-60"}`}>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 sm:flex-wrap">
                {/* Active / Inactive toggle — saves immediately, no Save button needed */}
                <button
                  type="button"
                  onClick={() => {
                    upsertMutation.mutate({
                      discountType: d.discountType as any,
                      name: String(name),
                      discountPct: Number(pct),
                      isActive: isActiveDb ? 0 : 1,
                    });
                  }}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none ${
                    isActiveDb ? "bg-canyon" : "bg-gray-300"
                  }`}
                  title={isActiveDb ? "Click to deactivate" : "Click to activate"}
                >
                  <span className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${
                    isActiveDb ? "translate-x-4" : "translate-x-0"
                  }`} />
                </button>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                  isActiveDb ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                }`}>{isActiveDb ? "Active" : "Inactive"}</span>

                <input
                  className="flex-1 min-w-[140px] px-3 py-1.5 text-sm border border-border rounded-lg"
                  value={name}
                  onChange={ev => setEditing(prev => ({ ...prev, [d.id]: { ...prev[d.id], name: ev.target.value } }))}
                />
                <div className="flex items-center gap-1">
                  <input
                    type="number" step="0.1" min="0" max="100"
                    className="w-20 px-2 py-1.5 text-sm border border-border rounded-lg text-right"
                    value={pct}
                    onChange={ev => setEditing(prev => ({ ...prev, [d.id]: { ...prev[d.id], pct: ev.target.value } }))}
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">{d.discountType?.replace(/_/g, " ")}</span>
                {dirty && (
                  <Button size="sm" className="h-7 px-3 text-xs bg-canyon hover:bg-canyon/90 text-white" onClick={() => {
                    upsertMutation.mutate({
                      discountType: d.discountType as any,
                      name: String(name),
                      discountPct: Number(pct),
                      isActive: isActiveDb ? 1 : 0,
                    });
                    setEditing(prev => { const n = { ...prev }; delete n[d.id]; return n; });
                  }}>Save</Button>
                )}
              </div>
            </div>
          );
        })}
        {discounts.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No discounts configured yet.</p>}
      </div>
    </div>
  );
}

// ─── Parade Stoppers Panel ───────────────────────────────────────────────────
function DPFreeFeaturesPanel({ utils }: { utils: ReturnType<typeof trpc.useUtils> }) {
  const { data: features = [], isLoading } = trpc.designPackage.getAllFreeFeatures.useQuery();
  const createMutation = trpc.designPackage.createFreeFeature.useMutation({
    onSuccess: () => { utils.designPackage.getAllFreeFeatures.invalidate(); toast.success("Feature created"); },
    onError: (e: any) => toast.error(e.message),
  });
  const updateMutation = trpc.designPackage.updateFreeFeature.useMutation({
    onSuccess: () => { utils.designPackage.getAllFreeFeatures.invalidate(); toast.success("Feature saved"); },
    onError: (e: any) => toast.error(e.message),
  });
  const deleteMutation = trpc.designPackage.deleteFreeFeature.useMutation({
    onSuccess: () => { utils.designPackage.getAllFreeFeatures.invalidate(); toast.success("Feature deleted"); },
    onError: (e: any) => toast.error(e.message),
  });
  const reorderMutation = trpc.designPackage.reorderFreeFeatures.useMutation({
    onError: (e: any) => toast.error("Reorder failed: " + e.message),
  });
  const uploadPhotoMutation = trpc.designPackage.uploadParadeStopperPhoto.useMutation({
    onSuccess: () => { utils.designPackage.getAllFreeFeatures.invalidate(); toast.success("Photo uploaded"); },
    onError: (e: any) => toast.error("Upload failed: " + e.message),
  });
  const removePhotoMutation = trpc.designPackage.removeParadeStopperPhoto.useMutation({
    onSuccess: () => { utils.designPackage.getAllFreeFeatures.invalidate(); toast.success("Photo removed"); },
    onError: (e: any) => toast.error("Remove failed: " + e.message),
  });

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", description: "", photoUrl: "", listPrice: "0.00", isActive: 1, projectTypes: "all", sortOrder: 0 });

  const PARADE_PROJECT_TYPES = ["addition", "basement", "full_home_remodel", "kitchen", "bathroom"];
  const PARADE_TYPE_LABELS: Record<string, string> = {
    addition: "Addition",
    basement: "Basement Finish",
    full_home_remodel: "Full Home Remodel",
    kitchen: "Kitchen Remodel",
    bathroom: "Bathroom Remodel",
  };
  const toggleParadeType = (current: string, pt: string): string => {
    const list = current === "all" ? PARADE_PROJECT_TYPES : current.split(",").map(s => s.trim()).filter(Boolean);
    const active = list.includes(pt);
    const next = active ? list.filter(x => x !== pt) : [...list, pt];
    return next.length === PARADE_PROJECT_TYPES.length ? "all" : next.join(",") || "all";
  };
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<number | null>(null);

  // Convert a File to base64 string
  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleFileUpload = async (featureId: number, file: File) => {
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5 MB"); return; }
    setUploadingId(featureId);
    try {
      const base64 = await fileToBase64(file);
      await uploadPhotoMutation.mutateAsync({ id: featureId, fileBase64: base64, mimeType: file.type });
    } finally {
      setUploadingId(null);
    }
  };

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-canyon" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-display text-charcoal">Parade Stoppers</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Free add-ons for same-day decision makers. Shown with strikethrough list price + FREE badge. Customer picks one.</p>
        </div>
        <Button size="sm" className="bg-canyon hover:bg-canyon/90 text-white" onClick={() => setShowCreate(true)}>+ Add Parade Stopper</Button>
      </div>

      {/* Full-screen photo preview modal */}
      {previewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={() => setPreviewUrl(null)}>
          <div className="bg-white rounded-2xl p-4 max-w-lg w-full mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <img src={previewUrl} alt="Parade Stopper preview" className="w-full rounded-xl object-cover max-h-96" />
            <Button size="sm" variant="outline" className="mt-3 w-full" onClick={() => setPreviewUrl(null)}>Close</Button>
          </div>
        </div>
      )}

      {/* Create form */}
      {showCreate && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
          <h4 className="text-sm font-semibold text-charcoal">New Parade Stopper</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input className="px-3 py-1.5 text-sm border border-border rounded-lg" placeholder="Feature name" value={createForm.name} onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))} />
            <input type="number" step="0.01" min="0" className="px-3 py-1.5 text-sm border border-border rounded-lg" placeholder="List price ($)" value={createForm.listPrice} onChange={e => setCreateForm(f => ({ ...f, listPrice: e.target.value }))} />
            <input className="sm:col-span-2 px-3 py-1.5 text-sm border border-border rounded-lg" placeholder="Description (optional)" value={createForm.description} onChange={e => setCreateForm(f => ({ ...f, description: e.target.value }))} />
            <p className="sm:col-span-2 text-xs text-muted-foreground">Save the item first, then upload a photo using the Upload Photo button on the item row.</p>
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-muted-foreground block mb-1">Show for project types</label>
              <div className="flex flex-wrap gap-1.5">
                {PARADE_PROJECT_TYPES.map(pt => {
                  const types = createForm.projectTypes || "all";
                  const list = types === "all" ? PARADE_PROJECT_TYPES : types.split(",").map(s => s.trim());
                  const active = list.includes(pt);
                  return (
                    <button key={pt} type="button"
                      onClick={() => setCreateForm(f => ({ ...f, projectTypes: toggleParadeType(f.projectTypes, pt) }))}
                      className={`px-2 py-1 rounded-full text-xs font-medium border transition-colors ${active ? "bg-canyon text-white border-canyon" : "bg-white text-charcoal border-border"}`}
                    >{PARADE_TYPE_LABELS[pt]}</button>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="number" className="w-20 px-2 py-1.5 text-sm border border-border rounded-lg" placeholder="Sort" value={createForm.sortOrder} onChange={e => setCreateForm(f => ({ ...f, sortOrder: Number(e.target.value) }))} />
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                <input type="checkbox" checked={createForm.isActive === 1} onChange={e => setCreateForm(f => ({ ...f, isActive: e.target.checked ? 1 : 0 }))} className="w-4 h-4 accent-canyon" />
                Active
              </label>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" className="bg-canyon hover:bg-canyon/90 text-white" onClick={() => {
              createMutation.mutate({ name: createForm.name, description: createForm.description || undefined, photoUrl: undefined, listPrice: Number(createForm.listPrice), isActive: createForm.isActive, projectTypes: createForm.projectTypes || "all", sortOrder: createForm.sortOrder });
              setShowCreate(false);
              setCreateForm({ name: "", description: "", photoUrl: "", listPrice: "0.00", isActive: 1, projectTypes: "all", sortOrder: 0 });
            }}>Save</Button>
            <Button size="sm" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
          </div>
        </div>
      )}

      <SortableList
        items={features}
        onReorder={(reordered) => {
          reorderMutation.mutate(reordered.map((it: any, idx: number) => ({ id: it.id, sortOrder: idx })));
        }}
        className="space-y-3"
        renderItem={(f: any, dragHandleProps) => (
          <div className="bg-white rounded-xl border border-border/60 shadow-sm p-4">
            {editingId === f.id ? (
              /* ── Edit mode ── */
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input className="px-3 py-1.5 text-sm border border-border rounded-lg" value={editForm.name ?? f.name} onChange={e => setEditForm((ef: any) => ({ ...ef, name: e.target.value }))} />
                  <input type="number" step="0.01" min="0" className="px-3 py-1.5 text-sm border border-border rounded-lg" value={editForm.listPrice ?? f.listPrice} onChange={e => setEditForm((ef: any) => ({ ...ef, listPrice: e.target.value }))} />
                  <input className="sm:col-span-2 px-3 py-1.5 text-sm border border-border rounded-lg" placeholder="Description" value={editForm.description ?? f.description ?? ""} onChange={e => setEditForm((ef: any) => ({ ...ef, description: e.target.value }))} />
                  <div className="sm:col-span-2">
                    <label className="text-xs font-medium text-muted-foreground block mb-1">Show for project types</label>
                    <div className="flex flex-wrap gap-1.5">
                      {PARADE_PROJECT_TYPES.map(pt => {
                        const currentTypes: string = editForm.projectTypes ?? f.projectTypes ?? "all";
                        const list = currentTypes === "all" ? PARADE_PROJECT_TYPES : currentTypes.split(",").map((s: string) => s.trim());
                        const active = list.includes(pt);
                        return (
                          <button key={pt} type="button"
                            onClick={() => setEditForm((ef: any) => ({ ...ef, projectTypes: toggleParadeType(ef.projectTypes ?? f.projectTypes ?? "all", pt) }))}
                            className={`px-2 py-1 rounded-full text-xs font-medium border transition-colors ${active ? "bg-canyon text-white border-canyon" : "bg-white text-charcoal border-border"}`}
                          >{PARADE_TYPE_LABELS[pt]}</button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="number" className="w-20 px-2 py-1.5 text-sm border border-border rounded-lg" value={editForm.sortOrder ?? f.sortOrder ?? 0} onChange={e => setEditForm((ef: any) => ({ ...ef, sortOrder: Number(e.target.value) }))} />
                    <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                      <input type="checkbox" checked={(editForm.isActive ?? f.isActive) === 1} onChange={e => setEditForm((ef: any) => ({ ...ef, isActive: e.target.checked ? 1 : 0 }))} className="w-4 h-4 accent-canyon" />
                      Active
                    </label>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="bg-canyon hover:bg-canyon/90 text-white" onClick={() => {
                    updateMutation.mutate({ id: f.id, name: editForm.name, description: editForm.description, listPrice: editForm.listPrice !== undefined ? Number(editForm.listPrice) : undefined, isActive: editForm.isActive, projectTypes: editForm.projectTypes, sortOrder: editForm.sortOrder });
                    setEditingId(null); setEditForm({});
                  }}>Save</Button>
                  <Button size="sm" variant="outline" onClick={() => { setEditingId(null); setEditForm({}); }}>Cancel</Button>
                </div>
              </div>
            ) : (
              /* ── View mode ── */
              <div className="flex flex-col sm:flex-row items-start gap-3">
                {/* Photo area — FileUploadZone handles images + PDFs */}
                <div className="shrink-0 w-full sm:w-28">
                  <FileUploadZone
                    currentUrl={f.photoUrl || null}
                    label="Upload photo or PDF"
                    maxBytes={10 * 1024 * 1024}
                    onUpload={async (base64, mimeType) => {
                      setUploadingId(f.id);
                      try {
                        await uploadPhotoMutation.mutateAsync({ id: f.id, fileBase64: base64, mimeType });
                      } finally {
                        setUploadingId(null);
                      }
                    }}
                    onRemove={() => { if (confirm("Remove this photo?")) removePhotoMutation.mutate({ id: f.id }); }}
                  />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm text-charcoal">{f.name}</span>
                    {f.isActive === 0 && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">inactive</span>}
                  </div>
                  {f.description && <p className="text-xs text-muted-foreground mt-0.5">{f.description}</p>}
                  <p className="text-xs text-muted-foreground mt-0.5">
                    List price: <span className="line-through">${Number(f.listPrice).toFixed(2)}</span> → <span className="text-green-600 font-medium">FREE</span>
                  </p>
                  {!f.photoUrl && <p className="text-[10px] text-amber-600 mt-1">No photo — click the upload zone to add one.</p>}
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Shown for: <strong className="text-charcoal">{(!f.projectTypes || f.projectTypes === "all") ? "All project types" : f.projectTypes.split(",").map((t: string) => PARADE_TYPE_LABELS[t.trim()] ?? t.trim()).join(", ")}</strong>
                  </p>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-1.5 shrink-0">
                  <button
                    ref={dragHandleProps.ref}
                    style={dragHandleProps.style}
                    {...dragHandleProps.listeners}
                    {...dragHandleProps.attributes}
                    className="p-1 text-muted-foreground/40 hover:text-muted-foreground rounded self-end"
                    title="Drag to reorder"
                  >
                    <GripVertical className="w-4 h-4" />
                  </button>
                  <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => { setEditingId(f.id); setEditForm({}); }}>Edit</Button>
                  <Button size="sm" variant="outline" className="h-7 px-2 text-xs text-red-600 hover:bg-red-50 border-red-200" onClick={() => { if (confirm("Delete this parade stopper?")) deleteMutation.mutate({ id: f.id }); }}>Del</Button>
                </div>
              </div>
            )}
          </div>
        )}
      />
      {features.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No parade stoppers yet. Add one above.</p>}
    </div>
  );
}

// ─── Questionnaire Panel ───────────────────────────────────────────────────
type QOption = { label: string; value: string; photoUrl?: string; description?: string };

function DPQuestionnairePanel({ utils }: { utils: ReturnType<typeof trpc.useUtils> }) {
  const { data: questions = [], isLoading } = trpc.designPackage.getAllQuestions.useQuery();
  const createMutation = trpc.designPackage.createQuestion.useMutation({
    onSuccess: () => { utils.designPackage.getAllQuestions.invalidate(); toast.success("Question created"); },
    onError: (e: any) => toast.error(e.message),
  });
  const updateMutation = trpc.designPackage.updateQuestion.useMutation({
    onSuccess: () => { utils.designPackage.getAllQuestions.invalidate(); toast.success("Question saved"); },
    onError: (e: any) => toast.error(e.message),
  });
  const deleteMutation = trpc.designPackage.deleteQuestion.useMutation({
    onSuccess: () => { utils.designPackage.getAllQuestions.invalidate(); toast.success("Question deleted"); },
    onError: (e: any) => toast.error(e.message),
  });
  const reorderMutation = trpc.designPackage.reorderQuestions.useMutation({
    onError: (e: any) => toast.error("Reorder failed: " + e.message),
  });
  const uploadFileMutation = trpc.designPackage.uploadAdminFile.useMutation({
    onError: (e: any) => toast.error("Upload failed: " + e.message),
  });

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [editOptions, setEditOptions] = useState<QOption[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ question: "", questionType: "single_choice" as string, isActive: 1, sortOrder: 0 });
  const [createOptions, setCreateOptions] = useState<QOption[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const QTYPES = [
    { value: "single_choice", label: "Single Choice" },
    { value: "multi_choice", label: "Multi Choice" },
    { value: "number", label: "Number Input" },
    { value: "text", label: "Text Input" },
  ];

  const parseOptions = (raw: string | null | undefined): QOption[] => {
    if (!raw) return [];
    try { return JSON.parse(raw); } catch { return []; }
  };

  const addOption = (opts: QOption[], setOpts: (o: QOption[]) => void) =>
    setOpts([...opts, { label: "", value: "", photoUrl: "", description: "" }]);

  const updateOption = (opts: QOption[], setOpts: (o: QOption[]) => void, idx: number, field: keyof QOption, val: string) => {
    const next = opts.map((o, i) => i === idx ? { ...o, [field]: val } : o);
    setOpts(next);
  };

  const removeOption = (opts: QOption[], setOpts: (o: QOption[]) => void, idx: number) =>
    setOpts(opts.filter((_, i) => i !== idx));

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-canyon" /></div>;

  const OptionEditor = ({ opts, setOpts }: { opts: QOption[]; setOpts: (o: QOption[]) => void }) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-charcoal">Answer Options</span>
        <Button size="sm" variant="outline" className="h-6 px-2 text-xs" onClick={() => addOption(opts, setOpts)}>+ Option</Button>
      </div>
      {opts.map((opt, idx) => (
        <div key={idx} className="bg-warm-cream/60 rounded-lg p-2 space-y-1.5">
          <div className="grid grid-cols-2 gap-1.5">
            <input className="px-2 py-1 text-xs border border-border rounded" placeholder="Label (shown to user)" value={opt.label} onChange={e => updateOption(opts, setOpts, idx, "label", e.target.value)} />
            <input className="px-2 py-1 text-xs border border-border rounded" placeholder="Value (internal key)" value={opt.value} onChange={e => updateOption(opts, setOpts, idx, "value", e.target.value)} />
            <div className="col-span-2">
              <FileUploadZone
                currentUrl={opt.photoUrl || null}
                label="Upload option photo or PDF"
                maxBytes={10 * 1024 * 1024}
                onUpload={async (base64, mimeType) => {
                  const result = await uploadFileMutation.mutateAsync({ fileBase64: base64, mimeType, folder: "dp-questionnaire-options" });
                  updateOption(opts, setOpts, idx, "photoUrl", result.url);
                }}
                onRemove={() => updateOption(opts, setOpts, idx, "photoUrl", "")}
              />
            </div>
            <input className="col-span-2 px-2 py-1 text-xs border border-border rounded" placeholder="Description (optional)" value={opt.description ?? ""} onChange={e => updateOption(opts, setOpts, idx, "description", e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="h-5 px-1.5 text-[10px] text-red-600 border-red-200 hover:bg-red-50" onClick={() => removeOption(opts, setOpts, idx)}>Remove</Button>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Photo preview modal */}
      {previewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setPreviewUrl(null)}>
          <div className="bg-white rounded-2xl p-4 max-w-lg w-full mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <img src={previewUrl} alt="Option preview" className="w-full rounded-xl object-cover max-h-80" />
            <Button size="sm" variant="outline" className="mt-3 w-full" onClick={() => setPreviewUrl(null)}>Close</Button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-display text-charcoal">Rough Pricing Questionnaire</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Questions shown to customers at the start of the Design Package Calculator. Options can have photos for visual selection.</p>
        </div>
        <Button size="sm" className="bg-canyon hover:bg-canyon/90 text-white" onClick={() => { setShowCreate(true); setCreateOptions([]); }}>+ Add Question</Button>
      </div>

      {showCreate && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
          <h4 className="text-sm font-semibold text-charcoal">New Question</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input className="sm:col-span-2 px-3 py-1.5 text-sm border border-border rounded-lg" placeholder="Question text" value={createForm.question} onChange={e => setCreateForm(f => ({ ...f, question: e.target.value }))} />
            <select className="px-3 py-1.5 text-sm border border-border rounded-lg bg-white" value={createForm.questionType} onChange={e => setCreateForm(f => ({ ...f, questionType: e.target.value }))}>
              {QTYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <div className="flex items-center gap-2">
              <input type="number" className="w-20 px-2 py-1.5 text-sm border border-border rounded-lg" placeholder="Sort" value={createForm.sortOrder} onChange={e => setCreateForm(f => ({ ...f, sortOrder: Number(e.target.value) }))} />
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                <input type="checkbox" checked={createForm.isActive === 1} onChange={e => setCreateForm(f => ({ ...f, isActive: e.target.checked ? 1 : 0 }))} className="w-4 h-4 accent-canyon" />
                Active
              </label>
            </div>
          </div>
          {(createForm.questionType === "single_choice" || createForm.questionType === "multi_choice") && (
            <OptionEditor opts={createOptions} setOpts={setCreateOptions} />
          )}
          <div className="flex gap-2">
            <Button size="sm" className="bg-canyon hover:bg-canyon/90 text-white" onClick={() => {
              createMutation.mutate({ question: createForm.question, questionType: createForm.questionType as any, options: JSON.stringify(createOptions), isActive: createForm.isActive, sortOrder: createForm.sortOrder });
              setShowCreate(false);
              setCreateForm({ question: "", questionType: "single_choice", isActive: 1, sortOrder: 0 });
              setCreateOptions([]);
            }}>Save</Button>
            <Button size="sm" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
          </div>
        </div>
      )}

      <SortableList
        items={questions}
        onReorder={(reordered) => {
          reorderMutation.mutate(reordered.map((it: any, idx: number) => ({ id: it.id, sortOrder: idx })));
        }}
        className="space-y-3"
        renderItem={(q: any, dragHandleProps) => {
          const opts = parseOptions(q.options);
          return (
            <div className="bg-white rounded-xl border border-border/60 shadow-sm p-4">
              {editingId === q.id ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input className="sm:col-span-2 px-3 py-1.5 text-sm border border-border rounded-lg" value={editForm.question ?? q.question} onChange={e => setEditForm((ef: any) => ({ ...ef, question: e.target.value }))} />
                    <select className="px-3 py-1.5 text-sm border border-border rounded-lg bg-white" value={editForm.questionType ?? q.questionType ?? "single_choice"} onChange={e => setEditForm((ef: any) => ({ ...ef, questionType: e.target.value }))}>
                      {QTYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                    <div className="flex items-center gap-2">
                      <input type="number" className="w-20 px-2 py-1.5 text-sm border border-border rounded-lg" value={editForm.sortOrder ?? q.sortOrder ?? 0} onChange={e => setEditForm((ef: any) => ({ ...ef, sortOrder: Number(e.target.value) }))} />
                      <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                        <input type="checkbox" checked={(editForm.isActive ?? q.isActive) === 1} onChange={e => setEditForm((ef: any) => ({ ...ef, isActive: e.target.checked ? 1 : 0 }))} className="w-4 h-4 accent-canyon" />
                        Active
                      </label>
                    </div>
                  </div>
                  {((editForm.questionType ?? q.questionType) === "single_choice" || (editForm.questionType ?? q.questionType) === "multi_choice") && (
                    <OptionEditor opts={editOptions} setOpts={setEditOptions} />
                  )}
                  <div className="flex gap-2">
                    <Button size="sm" className="bg-canyon hover:bg-canyon/90 text-white" onClick={() => {
                      updateMutation.mutate({ id: q.id, question: editForm.question, questionType: editForm.questionType as any, options: JSON.stringify(editOptions), isActive: editForm.isActive, sortOrder: editForm.sortOrder });
                      setEditingId(null); setEditForm({}); setEditOptions([]);
                    }}>Save</Button>
                    <Button size="sm" variant="outline" onClick={() => { setEditingId(null); setEditForm({}); setEditOptions([]); }}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm text-charcoal">{q.question}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">{q.questionType?.replace(/_/g, " ")}</span>
                      {q.isActive === 0 && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">inactive</span>}
                    </div>
                    {opts.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {opts.map((o, i) => (
                          <div key={i} className="flex items-center gap-1 bg-warm-cream/80 rounded-lg px-2 py-1">
                            {o.photoUrl && <img src={o.photoUrl} alt={o.label} className="w-5 h-5 rounded object-cover cursor-pointer" onClick={() => setPreviewUrl(o.photoUrl!)} />}
                            <span className="text-xs text-charcoal">{o.label}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button
                      ref={dragHandleProps.ref}
                      style={dragHandleProps.style}
                      {...dragHandleProps.listeners}
                      {...dragHandleProps.attributes}
                      className="p-1 text-muted-foreground/40 hover:text-muted-foreground rounded"
                      title="Drag to reorder"
                    >
                      <GripVertical className="w-4 h-4" />
                    </button>
                    <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => { setEditingId(q.id); setEditForm({}); setEditOptions(parseOptions(q.options)); }}>Edit</Button>
                    <Button size="sm" variant="outline" className="h-7 px-2 text-xs text-red-600 hover:bg-red-50 border-red-200" onClick={() => { if (confirm("Delete this question?")) deleteMutation.mutate({ id: q.id }); }}>Del</Button>
                  </div>
                </div>
              )}
            </div>
          );
        }}
      />
      {questions.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No questionnaire questions yet. Add one above.</p>}
    </div>
  );
}

// ─── Sign Requests Panel (filtered to design_package) ─────────────────────
// Helper: parse questionnaire answers from estimateSnapshot text
function parseQuestionnaireFromSnapshot(snapshot: string | null | undefined): Array<{ question: string; answer: string }> {
  if (!snapshot) return [];
  const match = snapshot.match(/— Rough Pricing Inputs —\n([\s\S]*?)(?:\n\n|$)/);
  if (!match) return [];
  return match[1].split("\n")
    .filter(line => line.startsWith("• "))
    .map(line => {
      const content = line.slice(2);
      const colonIdx = content.indexOf(": ");
      if (colonIdx === -1) return { question: content, answer: "" };
      return { question: content.slice(0, colonIdx), answer: content.slice(colonIdx + 2) };
    });
}

function DPSignRequestsPanel() {
  const { data: all = [], isLoading } = trpc.sign.getAll.useQuery();
  const requests = all.filter((r: any) => r.productType === "design_package" || !r.productType);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-canyon" /></div>;

  const statusColor = (s: string) => s === "signed" ? "bg-green-100 text-green-700" : s === "pending" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-500";

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-display text-charcoal">Design Package Sign Requests</h3>
        <p className="text-xs text-muted-foreground mt-0.5">{requests.length} total · {requests.filter((r: any) => r.status === "pending").length} pending · {requests.filter((r: any) => r.status === "signed").length} signed</p>
      </div>
      {requests.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">No design package sign requests yet.</div>
      ) : (
        <div className="space-y-3">
          {requests.map((r: any) => {
            const questionnaireItems = parseQuestionnaireFromSnapshot(r.estimateSnapshot);
            const isExpanded = expandedId === r.id;
            return (
              <div key={r.id} className="bg-white rounded-xl border border-border/60 shadow-sm p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm text-charcoal">{r.customerName || "—"}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${statusColor(r.status)}`}>{r.status}</span>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground space-y-0.5">
                      {r.customerEmail && <div>{r.customerEmail}</div>}
                      {r.customerPhone && <div>{r.customerPhone}</div>}
                      <div>Total: <strong className="text-charcoal">${Number(r.totalAmount || r.finalTotal || 0).toLocaleString()}</strong></div>
                      <div>Created: {new Date(r.createdAt).toLocaleDateString()}</div>
                      {r.signedAt && <div>Signed: {new Date(r.signedAt).toLocaleDateString()}</div>}
                    </div>
                    {/* Linked dynamic questionnaire session */}
                    {r.questionnaireSessionId && (
                      <div className="mt-2 inline-flex items-center gap-1.5 bg-blue-50 border border-blue-200/60 rounded px-2 py-1">
                        <ClipboardList className="w-3 h-3 text-blue-600" />
                        <span className="text-xs text-blue-700 font-medium">Linked Questionnaire Session #{r.questionnaireSessionId}</span>
                      </div>
                    )}
                    {/* Questionnaire answers */}
                    {questionnaireItems.length > 0 && (
                      <div className="mt-2">
                        <button
                          className="text-xs text-canyon font-medium flex items-center gap-1 hover:underline"
                          onClick={() => setExpandedId(isExpanded ? null : r.id)}
                        >
                          <ClipboardList className="w-3 h-3" />
                          {isExpanded ? "Hide" : "Show"} Rough Pricing Inputs ({questionnaireItems.length})
                        </button>
                        {isExpanded && (
                          <div className="mt-2 bg-amber-50 border border-amber-100 rounded-lg p-3 space-y-1.5">
                            {questionnaireItems.map((item, idx) => (
                              <div key={idx} className="flex justify-between gap-2 text-xs">
                                <span className="text-muted-foreground shrink-0 max-w-[55%]">{item.question}</span>
                                <span className="text-charcoal font-medium text-right">{item.answer}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Sent Estimates Panel (filtered to design_package) ────────────────────
function DPSentEmailsPanel() {
  const utils = trpc.useUtils();
  const { data: all = [], isLoading } = trpc.sentEmails.getAll.useQuery();
  const emails = all.filter((e: any) => e.productType === "design_package" || !e.productType);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const deleteMutation = trpc.sentEmails.delete.useMutation({
    onSuccess: () => {
      utils.sentEmails.getAll.invalidate();
      toast.success("Estimate deleted.");
      setDeletingId(null);
    },
    onError: (err: any) => {
      toast.error(`Failed to delete: ${err.message}`);
      setDeletingId(null);
    },
  });

  const handleDelete = (id: number, name: string) => {
    if (!confirm(`Delete the estimate for "${name}"? This cannot be undone.`)) return;
    setDeletingId(id);
    deleteMutation.mutate({ id });
  };

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-canyon" /></div>;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-display text-charcoal">Sent Design Package Estimates</h3>
        <p className="text-xs text-muted-foreground mt-0.5">{emails.length} estimates sent</p>
      </div>
      {emails.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">No design package estimates sent yet.</div>
      ) : (
        <div className="space-y-3">
          {emails.map((e: any) => {
            const questionnaireItems = parseQuestionnaireFromSnapshot(e.estimateSnapshot);
            const isExpanded = expandedId === e.id;
            const jobtreadUrl = e.jobtreadJobId
              ? `https://app.jobtread.com/jobs/${e.jobtreadJobId}`
              : null;
            return (
              <div key={e.id} className="bg-white rounded-xl border border-border/60 shadow-sm p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-sm text-charcoal">{e.customerName || "\u2014"}</span>
                    <div className="mt-1 text-xs text-muted-foreground space-y-0.5">
                      {e.customerEmail && <div>{e.customerEmail}</div>}
                      {e.customerPhone && <div>{e.customerPhone}</div>}
                      <div>Total: <strong className="text-charcoal">${Number(e.totalAmount || e.finalTotal || 0).toLocaleString()}</strong></div>
                      <div>Sent: {new Date(e.sentAt || e.createdAt).toLocaleDateString()}</div>
                    </div>
                    {/* Jobtread link */}
                    {jobtreadUrl && (
                      <a
                        href={jobtreadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium hover:underline"
                      >
                        <ExternalLink className="w-3 h-3" />
                        View in Jobtread
                      </a>
                    )}
                    {/* Linked dynamic questionnaire session */}
                    {e.questionnaireSessionId && (
                      <div className="mt-2 inline-flex items-center gap-1.5 bg-blue-50 border border-blue-200/60 rounded px-2 py-1">
                        <ClipboardList className="w-3 h-3 text-blue-600" />
                        <span className="text-xs text-blue-700 font-medium">Linked Questionnaire Session #{e.questionnaireSessionId}</span>
                      </div>
                    )}
                    {/* Questionnaire answers */}
                    {questionnaireItems.length > 0 && (
                      <div className="mt-2">
                        <button
                          className="text-xs text-canyon font-medium flex items-center gap-1 hover:underline"
                          onClick={() => setExpandedId(isExpanded ? null : e.id)}
                        >
                          <ClipboardList className="w-3 h-3" />
                          {isExpanded ? "Hide" : "Show"} Rough Pricing Inputs ({questionnaireItems.length})
                        </button>
                        {isExpanded && (
                          <div className="mt-2 bg-amber-50 border border-amber-100 rounded-lg p-3 space-y-1.5">
                            {questionnaireItems.map((item, idx) => (
                              <div key={idx} className="flex justify-between gap-2 text-xs">
                                <span className="text-muted-foreground shrink-0 max-w-[55%]">{item.question}</span>
                                <span className="text-charcoal font-medium text-right">{item.answer}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  {/* Action buttons */}
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <button
                      onClick={() => handleDelete(e.id, e.customerName)}
                      disabled={deletingId === e.id}
                      className="p-1.5 rounded-md text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                      title="Delete estimate"
                    >
                      {deletingId === e.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Contracts Panel (thin wrapper to ContractTemplatesPanel) ─────────────
const CONTRACT_SERVICE_TYPES = [
  { value: "design_package", label: "Design Package" },
  { value: "feasibility_study", label: "Feasibility Study" },
  { value: "deck", label: "Deck / Materials" },
];

const CONTRACT_PLACEHOLDERS = [
  { token: "{customerName}", description: "Customer's full name" },
  { token: "{collectionName}", description: "Product / package name" },
  { token: "{sqft}", description: "Square footage" },
  { token: "{grandTotal}", description: "Total price" },
  { token: "{depositAmount}", description: "Deposit / payment due now" },
  { token: "{balanceAmount}", description: "Remaining balance" },
];

/** Per-project-type contract editors for Design Package proposals */
const DP_CONTRACT_PROJECT_TYPES = [
  { value: "bathroom", label: "Bathroom Remodel", icon: "🛁" },
  { value: "kitchen", label: "Kitchen Remodel", icon: "🍳" },
  { value: "full_home_remodel", label: "Full Home Remodel", icon: "🏠" },
  { value: "addition", label: "Addition", icon: "🏗️" },
  { value: "basement", label: "Basement Finish", icon: "🏚️" },
];

function DPProjectTypeContractsSection({ utils }: { utils: ReturnType<typeof trpc.useUtils> }) {
  const { data: allTemplates = [], isLoading } = trpc.contractTemplates.getAll.useQuery();
  const updateMutation = trpc.contractTemplates.update.useMutation({
    onSuccess: () => { utils.contractTemplates.getAll.invalidate(); toast.success("Contract saved"); },
    onError: (e) => toast.error(e.message),
  });
  const createMutation = trpc.contractTemplates.create.useMutation({
    onSuccess: () => { utils.contractTemplates.getAll.invalidate(); toast.success("Contract created"); },
    onError: (e) => toast.error(e.message),
  });

  const [editingType, setEditingType] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  if (isLoading) return <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-canyon" /></div>;

  const dpTemplates = allTemplates.filter((t: any) => t.serviceType === "design_package");

  const getTemplate = (projectType: string) =>
    dpTemplates.find((t: any) => t.projectType === projectType);

  const handleEdit = (projectType: string) => {
    const tmpl = getTemplate(projectType);
    setEditText(tmpl?.contractText ?? "");
    setEditingType(projectType);
  };

  const handleSave = (projectType: string) => {
    const tmpl = getTemplate(projectType);
    if (tmpl) {
      updateMutation.mutate({ id: tmpl.id, contractText: editText });
    } else {
      // Create a new template for this project type
      const label = DP_CONTRACT_PROJECT_TYPES.find(p => p.value === projectType)?.label ?? projectType;
      createMutation.mutate({
        name: `Design Package — ${label}`,
        serviceType: "design_package",
        contractText: editText,
        isDefault: 0,
        isActive: 1,
      });
    }
    setEditingType(null);
    setEditText("");
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-display text-charcoal">Design Package Contracts by Project Type</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Each project type has its own contract terms. These are appended to the proposal sent to the client in Jobtread.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3">
        {DP_CONTRACT_PROJECT_TYPES.map(({ value, label, icon }) => {
          const tmpl = getTemplate(value);
          const isEditing = editingType === value;
          return (
            <div key={value} className="bg-white rounded-xl border border-border/60 shadow-sm p-4 space-y-2">
              {/* Header row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-base">{icon}</span>
                  <span className="font-semibold text-sm text-charcoal">{label}</span>
                  {tmpl ? (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-50 text-green-700 font-medium">Configured</span>
                  ) : (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 font-medium">Not set</span>
                  )}
                </div>
                {!isEditing && (
                  <Button size="sm" variant="outline" className="h-7 px-3 text-xs" onClick={() => handleEdit(value)}>Edit Contract</Button>
                )}
              </div>
              {/* Edit mode: textarea + save/cancel */}
              {isEditing ? (
                <div className="space-y-2">
                  <textarea
                    rows={16}
                    className="w-full px-3 py-2 text-sm border border-canyon/40 rounded-lg font-mono bg-amber-50/30 focus:outline-none focus:ring-1 focus:ring-canyon"
                    value={editText}
                    onChange={e => setEditText(e.target.value)}
                    placeholder={`Paste the ${label} contract terms here...`}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" className="bg-canyon hover:bg-canyon/90 text-white" onClick={() => handleSave(value)}
                      disabled={updateMutation.isPending || createMutation.isPending}>
                      {(updateMutation.isPending || createMutation.isPending) ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save Contract"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { setEditingType(null); setEditText(""); }}>Cancel</Button>
                  </div>
                </div>
              ) : (
                /* Preview mode: show first 160 chars */
                tmpl && <p className="text-xs text-muted-foreground line-clamp-2 font-mono">{tmpl.contractText?.slice(0, 160)}…</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DPContractsPanel() {
  const utils = trpc.useUtils();
  const { data: templates = [], isLoading } = trpc.contractTemplates.getAll.useQuery();
  const createMutation = trpc.contractTemplates.create.useMutation({
    onSuccess: () => { utils.contractTemplates.getAll.invalidate(); toast.success("Contract template created"); },
    onError: (e) => toast.error(e.message),
  });
  const updateMutation = trpc.contractTemplates.update.useMutation({
    onSuccess: () => { utils.contractTemplates.getAll.invalidate(); toast.success("Template saved"); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMutation = trpc.contractTemplates.delete.useMutation({
    onSuccess: () => { utils.contractTemplates.getAll.invalidate(); toast.success("Template deleted"); },
    onError: (e) => toast.error(e.message),
  });

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "Design Package Contract", serviceType: "design_package", contractText: "" });
  const [filterType, setFilterType] = useState<string>("all");

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-canyon" /></div>;

  const filteredTemplates = filterType === "all" ? templates : templates.filter((t: any) => (t.serviceType ?? "deck") === filterType);

  return (
    <div className="space-y-6">
      {/* ── Per-project-type Design Package contracts ── */}
      <DPProjectTypeContractsSection utils={utils} />

      {/* ── Divider ── */}
      <div className="border-t border-border/60 pt-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-display text-charcoal">Other Contract Templates</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Contracts for checkout pages (deck estimator, etc.) and other service types.</p>
        </div>
        <Button size="sm" className="bg-canyon hover:bg-canyon/90 text-white" onClick={() => setShowCreate(true)}>+ Add Template</Button>
      </div>

      {/* Placeholder tokens reference */}
      <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4">
        <p className="text-xs font-semibold text-blue-800 mb-2">Available Placeholder Tokens</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
          {CONTRACT_PLACEHOLDERS.map(p => (
            <div key={p.token} className="flex items-center gap-1.5">
              <code className="text-[11px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-mono">{p.token}</code>
              <span className="text-[11px] text-blue-700">{p.description}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {[{ value: "all", label: "All" }, ...CONTRACT_SERVICE_TYPES].map(t => (
          <button key={t.value} onClick={() => setFilterType(t.value)}
            className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
              filterType === t.value ? "bg-canyon text-white border-canyon" : "border-border text-muted-foreground hover:bg-sandstone/50"
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
          <h4 className="text-sm font-semibold text-charcoal">New Contract Template</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input className="sm:col-span-2 w-full px-3 py-1.5 text-sm border border-border rounded-lg" placeholder="Template name (e.g. Design Package Contract)" value={createForm.name} onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))} />
            <select className="w-full px-3 py-1.5 text-sm border border-border rounded-lg bg-white" value={createForm.serviceType} onChange={e => setCreateForm(f => ({ ...f, serviceType: e.target.value }))}>
              {CONTRACT_SERVICE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <textarea rows={12} className="w-full px-3 py-1.5 text-sm border border-border rounded-lg font-mono" placeholder="Paste or type your contract text here. Use {customerName}, {grandTotal}, etc. for dynamic values." value={createForm.contractText} onChange={e => setCreateForm(f => ({ ...f, contractText: e.target.value }))} />
          <div className="flex gap-2">
            <Button size="sm" className="bg-canyon hover:bg-canyon/90 text-white" onClick={() => { createMutation.mutate(createForm); setShowCreate(false); }}>Save Template</Button>
            <Button size="sm" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Templates list */}
      <div className="space-y-3">
        {filteredTemplates.map((t: any) => (
          <div key={t.id} className="bg-white rounded-xl border border-border/60 shadow-sm p-4">
            {editingId === t.id ? (
              <div className="space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input className="w-full px-3 py-1.5 text-sm border border-border rounded-lg" placeholder="Template name" value={editForm.name ?? t.name} onChange={e => setEditForm((f: any) => ({ ...f, name: e.target.value }))} />
                  <select className="w-full px-3 py-1.5 text-sm border border-border rounded-lg bg-white" value={editForm.serviceType ?? t.serviceType ?? "design_package"} onChange={e => setEditForm((f: any) => ({ ...f, serviceType: e.target.value }))}>
                    {CONTRACT_SERVICE_TYPES.map(st => <option key={st.value} value={st.value}>{st.label}</option>)}
                  </select>
                </div>
                <textarea rows={14} className="w-full px-3 py-1.5 text-sm border border-border rounded-lg font-mono" value={editForm.contractText ?? t.contractText ?? ""} onChange={e => setEditForm((f: any) => ({ ...f, contractText: e.target.value }))} />
                <div className="flex gap-2">
                  <Button size="sm" className="bg-canyon hover:bg-canyon/90 text-white" onClick={() => { updateMutation.mutate({ id: t.id, ...editForm }); setEditingId(null); setEditForm({}); }}>Save Changes</Button>
                  <Button size="sm" variant="outline" onClick={() => { setEditingId(null); setEditForm({}); }}>Cancel</Button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm text-charcoal">{t.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">
                      {CONTRACT_SERVICE_TYPES.find(st => st.value === (t.serviceType ?? "deck"))?.label ?? t.serviceType}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2 font-mono">{t.contractText?.slice(0, 140)}…</p>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => { setEditingId(t.id); setEditForm({}); }}>Edit</Button>
                  <Button size="sm" variant="outline" className="h-7 px-2 text-xs text-red-600 hover:bg-red-50 border-red-200" onClick={() => { if (confirm("Delete this template?")) deleteMutation.mutate({ id: t.id }); }}>Delete</Button>
                </div>
              </div>
            )}
          </div>
        ))}
        {filteredTemplates.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No contract templates found. Add one above.</p>}
      </div>
      </div>
    </div>
  );
}

// ─── Section Config Panel ────────────────────────────────────────────────────
const PROJECT_TYPE_LABELS: Record<string, string> = {
  addition: "Addition",
  basement: "Basement Finish",
  full_home_remodel: "Full Home Remodel",
  kitchen: "Kitchen Remodel",
  bathroom: "Bathroom Remodel",
};

function DPSectionConfigPanel({ utils }: { utils: ReturnType<typeof trpc.useUtils> }) {
  const { data: allSections = [], isLoading } = trpc.designPackage.getAllSections.useQuery();
  const updateMutation = trpc.designPackage.updateSection.useMutation({
    onSuccess: () => { utils.designPackage.getAllSections.invalidate(); toast.success("Section updated"); },
    onError: () => toast.error("Failed to update section"),
  });
  const resetMutation = trpc.designPackage.resetSections.useMutation({
    onSuccess: () => { utils.designPackage.getAllSections.invalidate(); toast.success("Sections reset to defaults"); },
    onError: () => toast.error("Failed to reset sections"),
  });
  const reorderMutation = trpc.designPackage.reorderSections.useMutation({
    onError: () => toast.error("Reorder failed"),
  });

  const [editingLabel, setEditingLabel] = useState<{ id: number; value: string } | null>(null);

  const projectTypes = ["addition", "basement", "full_home_remodel", "kitchen", "bathroom"];

  if (isLoading) return <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-canyon" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-display text-charcoal">Calculator Section Configuration</h3>
          <p className="text-sm text-muted-foreground mt-1">Toggle which sections appear for each project type and rename their labels.</p>
        </div>
        <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => { if (confirm("Reset all sections to defaults?")) resetMutation.mutate(); }}>
          <RefreshCw className="w-3.5 h-3.5" /> Reset Defaults
        </Button>
      </div>

      {projectTypes.map(pt => {
        const sections = allSections.filter((s: any) => s.projectType === pt).sort((a: any, b: any) => a.sortOrder - b.sortOrder);
        return (
          <div key={pt} className="bg-white rounded-2xl border border-border/60 shadow-sm p-5">
            <h4 className="text-sm font-display text-charcoal mb-4">{PROJECT_TYPE_LABELS[pt] || pt}</h4>
            <SortableList
              items={sections}
              onReorder={(reordered) => {
                reorderMutation.mutate(reordered.map((it: any, idx: number) => ({ id: it.id, sortOrder: idx })));
              }}
              className="space-y-2"
              renderItem={(sec: any, dragHandleProps) => (
                <div className="flex items-center gap-3 p-3 rounded-lg border border-border/40 bg-warm-cream/30">
                  {/* Enable/Disable toggle */}
                  <button
                    onClick={() => updateMutation.mutate({ id: sec.id, isEnabled: sec.isEnabled ? 0 : 1 })}
                    className="shrink-0"
                    title={sec.isEnabled ? "Click to disable" : "Click to enable"}
                  >
                    {sec.isEnabled ? (
                      <ToggleRight className="w-7 h-7 text-canyon" />
                    ) : (
                      <ToggleLeft className="w-7 h-7 text-muted-foreground/40" />
                    )}
                  </button>

                  {/* Label — click to edit */}
                  {editingLabel?.id === sec.id ? (
                    <input
                      className="flex-1 px-2 py-1 text-sm border border-canyon rounded"
                      value={editingLabel?.value ?? ""}
                      onChange={e => setEditingLabel(prev => prev ? { ...prev, value: e.target.value } : null)}
                      onBlur={() => {
                        if (editingLabel?.value?.trim()) {
                          updateMutation.mutate({ id: sec.id, sectionLabel: editingLabel.value.trim() });
                        }
                        setEditingLabel(null);
                      }}
                      onKeyDown={e => {
                        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                        if (e.key === "Escape") setEditingLabel(null);
                      }}
                      autoFocus
                    />
                  ) : (
                    <button
                      className="flex-1 text-left text-sm font-body text-charcoal hover:text-canyon transition-colors"
                      onClick={() => setEditingLabel({ id: sec.id, value: sec.sectionLabel })}
                      title="Click to rename"
                    >
                      {sec.sectionLabel}
                    </button>
                  )}

                  <span className="text-xs text-muted-foreground font-mono bg-warm-cream px-2 py-0.5 rounded shrink-0">{sec.sectionKey}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${sec.isEnabled ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {sec.isEnabled ? "Visible" : "Hidden"}
                  </span>
                  <button
                    ref={dragHandleProps.ref}
                    style={dragHandleProps.style}
                    {...dragHandleProps.listeners}
                    {...dragHandleProps.attributes}
                    className="p-1 text-muted-foreground/40 hover:text-muted-foreground rounded shrink-0"
                    title="Drag to reorder"
                  >
                    <GripVertical className="w-4 h-4" />
                  </button>
                </div>
              )}
            />
            {sections.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No sections configured. Click Reset Defaults to seed them.</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────
export default function DesignPackageAdminPage() {
  const utils = trpc.useUtils();
  const adminMe = trpc.adminAuth.me.useQuery();
  const logoutMutation = trpc.adminAuth.logout.useMutation();
  const loginWithPinMutation = trpc.adminAuth.loginWithPin.useMutation();
  const [, navigate] = useLocation();

  const [pinUnlocked, setPinUnlocked] = useState(() => sessionStorage.getItem("admin_pin_ok") === "1");
  const [pinEntry, setPinEntry] = useState("");
  const [pinError, setPinError] = useState(false);
  const [pinLoading, setPinLoading] = useState(false);

  const handlePinDigit = async (digit: string) => {
    if (pinEntry.length >= 4 || pinLoading) return;
    const next = pinEntry + digit;
    setPinEntry(next);
    setPinError(false);
    if (next.length === 4) {
      setPinLoading(true);
      try {
        const result = await loginWithPinMutation.mutateAsync({ pin: next });
        if (result.success) {
          sessionStorage.setItem("admin_pin_ok", "1");
          setPinUnlocked(true);
          utils.adminAuth.me.invalidate();
        } else {
          setPinError(true);
          setTimeout(() => { setPinEntry(""); setPinError(false); }, 700);
        }
      } catch {
        setPinError(true);
        setTimeout(() => { setPinEntry(""); setPinError(false); }, 700);
      } finally {
        setPinLoading(false);
      }
    }
  };

  const handlePinBackspace = () => {
    if (pinLoading) return;
    setPinEntry(prev => prev.slice(0, -1));
    setPinError(false);
  };

  const isAdmin = adminMe.data?.isAdmin === true;
  const calUser = useCalcUser();

  const [section, setSection] = useState<"home" | "pricing" | "sales" | "contracts" | "team" | "sections" | "questionnaire-submissions" | "questionnaire-builder" | "settings" | "initial-consult">("home");

  // Sign request counts for dashboard
  const { data: signRequestsData = [] } = trpc.sign.getAll.useQuery(undefined, { enabled: pinUnlocked && isAdmin });
  const { data: sentEmailsData = [] } = trpc.sentEmails.getAll.useQuery(undefined, { enabled: pinUnlocked && isAdmin });
  const dpSignRequests = signRequestsData.filter((r: any) => r.productType === "design_package" || !r.productType);
  const dpEmails = sentEmailsData.filter((e: any) => e.productType === "design_package" || !e.productType);

  const handleLogout = async () => {
    await logoutMutation.mutateAsync();
    sessionStorage.removeItem("admin_pin_ok");
    window.location.href = "/";
  };

  // PIN gate
  if (!pinUnlocked) {
    const dots = Array.from({ length: 4 }, (_, i) => i < pinEntry.length);
    return (
      <div className="min-h-screen flex items-center justify-center bg-charcoal">
        <div className="bg-white rounded-2xl p-8 max-w-xs w-full mx-4 shadow-2xl text-center">
          <img src={LOGO_URL} alt="Design Your Price" className="w-16 h-16 mx-auto mb-4 rounded-lg" />
          <h1 className="text-xl font-display text-charcoal mb-1">Design Package Admin</h1>
          <p className="text-sm text-muted-foreground font-body mb-6">Enter your 4-digit PIN to continue</p>
          <div className="flex justify-center gap-3 mb-6">
            {dots.map((filled, i) => (
              <div key={i} className={`w-4 h-4 rounded-full border-2 transition-all duration-150 ${pinError ? "border-red-400 bg-red-400" : filled ? "border-canyon bg-canyon" : "border-border bg-transparent"}`} />
            ))}
          </div>
          {pinError && <p className="text-red-500 text-xs mb-4 font-medium">Incorrect PIN. Try again.</p>}
          <div className="grid grid-cols-3 gap-2">
            {["1","2","3","4","5","6","7","8","9"].map(d => (
              <button key={d} onClick={() => handlePinDigit(d)} className="h-12 rounded-xl text-lg font-semibold bg-warm-cream hover:bg-sandstone/40 active:scale-95 transition-all text-charcoal border border-border">{d}</button>
            ))}
            <button onClick={() => navigate("/")} className="h-12 rounded-xl text-xs font-medium bg-transparent hover:bg-red-50 active:scale-95 transition-all text-muted-foreground">Cancel</button>
            <button onClick={() => handlePinDigit("0")} className="h-12 rounded-xl text-lg font-semibold bg-warm-cream hover:bg-sandstone/40 active:scale-95 transition-all text-charcoal border border-border">0</button>
            <button onClick={handlePinBackspace} className="h-12 rounded-xl text-sm font-medium bg-transparent hover:bg-muted/40 active:scale-95 transition-all text-charcoal">⌫</button>
          </div>
        </div>
      </div>
    );
  }

  if (pinUnlocked && !isAdmin) {
    return <div className="min-h-screen flex items-center justify-center bg-charcoal"><Loader2 className="w-8 h-8 animate-spin text-canyon" /></div>;
  }

  const sectionTitle = section === "home" ? "Design Package" : section === "pricing" ? "Pricing & Services" : section === "sales" ? "Sales" : section === "contracts" ? "Contracts" : section === "sections" ? "Calculator Sections" : section === "questionnaire-submissions" ? "Questionnaire Submissions" : section === "questionnaire-builder" ? "Questionnaire Builder" : section === "settings" ? "Site Settings" : section === "initial-consult" ? "Initial Consult" : "Team";

  return (
    <div className="min-h-screen bg-warm-cream">
      {/* Header */}
      <header className="bg-charcoal text-white sticky top-0 z-50">
        <div className="container flex items-center justify-between h-14 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {section !== "home" && (
              <button onClick={() => setSection("home")} className="text-warm-cream/60 hover:text-white transition-colors shrink-0" title="Back to Dashboard">
                <ChevronRight className="w-4 h-4 rotate-180" />
              </button>
            )}
            <img src={LOGO_URL} alt="Logo" className="w-7 h-7 rounded shrink-0" />
            <div className="min-w-0">
              <h1 className="text-sm font-display truncate">{sectionTitle}</h1>
              <p className="text-[10px] text-warm-cream/60 font-body truncate hidden sm:block">
                {calUser ? `${calUser.name} — ${calUser.role.replace("_", " ")}` : "Design Package Admin"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {/* Portal toggle */}
            <PortalToggle current="design-package" />
            {section !== "home" && (
              <button onClick={() => setSection("home")} className="text-warm-cream/60 hover:text-white transition-colors p-1.5 rounded hover:bg-white/10" title="Dashboard">
                <Home className="w-4 h-4" />
              </button>
            )}
            <button onClick={() => navigate("/")} className="text-warm-cream/60 hover:text-white transition-colors p-1.5 rounded hover:bg-white/10 flex items-center gap-1 text-xs font-medium" title="Calculator">
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Calculator</span>
            </button>
            <button onClick={handleLogout} className="text-warm-cream/60 hover:text-white transition-colors p-1.5 rounded hover:bg-white/10 flex items-center gap-1 text-xs font-medium" title="Sign Out">
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="container py-6">

        {/* ── DASHBOARD HOME ─────────────────────────────────────────── */}
        {section === "home" && (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-display text-charcoal">
                Welcome back{calUser ? `, ${calUser.name.split(" ")[0]}` : ""}
              </h2>
              <p className="text-sm text-muted-foreground font-body mt-1">Design Package Admin Portal — manage pricing, services, and contracts.</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl border border-border/60 shadow-sm p-4 text-center cursor-pointer hover:border-canyon/40 transition-colors" onClick={() => setSection("sales")}>
                <p className="text-3xl font-display text-canyon">{dpEmails.filter((e: any) => { const d = new Date(e.createdAt); const now = new Date(); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); }).length}</p>
                <p className="text-xs text-muted-foreground mt-1">Estimates This Month</p>
              </div>
              <div className="bg-white rounded-xl border border-border/60 shadow-sm p-4 text-center cursor-pointer hover:border-canyon/40 transition-colors" onClick={() => setSection("sales")}>
                <p className="text-3xl font-display text-canyon">{dpSignRequests.filter((r: any) => r.status === "pending").length}</p>
                <p className="text-xs text-muted-foreground mt-1">Pending Contracts</p>
              </div>
              <div className="bg-white rounded-xl border border-border/60 shadow-sm p-4 text-center cursor-pointer hover:border-canyon/40 transition-colors" onClick={() => setSection("sales")}>
                <p className="text-3xl font-display text-canyon">{dpSignRequests.filter((r: any) => r.status === "signed").length}</p>
                <p className="text-xs text-muted-foreground mt-1">Signed Contracts</p>
              </div>
              <div className="bg-white rounded-xl border border-border/60 shadow-sm p-4 text-center cursor-pointer hover:border-canyon/40 transition-colors" onClick={() => setSection("sales")}>
                <p className="text-3xl font-display text-canyon">{dpEmails.length}</p>
                <p className="text-xs text-muted-foreground mt-1">Total Estimates Sent</p>
              </div>
            </div>

            {/* Section cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Sales */}
              <button onClick={() => setSection("sales")} className="group bg-white rounded-2xl border border-border/60 shadow-sm p-6 text-left hover:shadow-md hover:border-canyon/40 transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center"><BarChart3 className="w-6 h-6 text-green-600" /></div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground/40 group-hover:text-canyon transition-colors" />
                </div>
                <h3 className="text-base font-display text-charcoal">Sales</h3>
                <p className="text-xs text-muted-foreground mt-1 font-body">Sign requests and sent estimates for design packages</p>
                <div className="flex gap-3 mt-4">
                  <span className="text-xs bg-warm-cream text-charcoal px-2 py-1 rounded-full font-medium">{dpSignRequests.length} contracts</span>
                  <span className="text-xs bg-warm-cream text-charcoal px-2 py-1 rounded-full font-medium">{dpEmails.length} estimates</span>
                </div>
              </button>

              {/* Pricing & Services */}
              <button onClick={() => setSection("pricing")} className="group bg-white rounded-2xl border border-border/60 shadow-sm p-6 text-left hover:shadow-md hover:border-canyon/40 transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-canyon/10 flex items-center justify-center"><Zap className="w-6 h-6 text-canyon" /></div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground/40 group-hover:text-canyon transition-colors" />
                </div>
                <h3 className="text-base font-display text-charcoal">Pricing &amp; Services</h3>
                <p className="text-xs text-muted-foreground mt-1 font-body">Design package items, gross profit %, commission, and discounts</p>
                <div className="flex gap-3 mt-4">
                  <span className="text-xs bg-warm-cream text-charcoal px-2 py-1 rounded-full font-medium">Items</span>
                  <span className="text-xs bg-warm-cream text-charcoal px-2 py-1 rounded-full font-medium">Commission</span>
                  <span className="text-xs bg-warm-cream text-charcoal px-2 py-1 rounded-full font-medium">Discounts</span>
                </div>
              </button>

              {/* Contracts */}
              <button onClick={() => setSection("contracts")} className="group bg-white rounded-2xl border border-border/60 shadow-sm p-6 text-left hover:shadow-md hover:border-canyon/40 transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center"><FileText className="w-6 h-6 text-purple-600" /></div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground/40 group-hover:text-canyon transition-colors" />
                </div>
                <h3 className="text-base font-display text-charcoal">Contracts</h3>
                <p className="text-xs text-muted-foreground mt-1 font-body">Design package contract templates used in the checkout flow</p>
              </button>

              {/* Team */}
              <button onClick={() => setSection("team")} className="group bg-white rounded-2xl border border-border/60 shadow-sm p-6 text-left hover:shadow-md hover:border-canyon/40 transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center"><Users className="w-6 h-6 text-amber-600" /></div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground/40 group-hover:text-canyon transition-colors" />
                </div>
                <h3 className="text-base font-display text-charcoal">Team</h3>
                <p className="text-xs text-muted-foreground mt-1 font-body">Calculator users, roles, and permissions</p>
              </button>

              {/* Questionnaire Builder */}
              <button onClick={() => setSection("questionnaire-builder")} className="group bg-white rounded-2xl border border-border/60 shadow-sm p-6 text-left hover:shadow-md hover:border-canyon/40 transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center"><ClipboardList className="w-6 h-6 text-teal-600" /></div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground/40 group-hover:text-canyon transition-colors" />
                </div>
                <h3 className="text-base font-display text-charcoal">Questionnaire Builder</h3>
                <p className="text-xs text-muted-foreground mt-1 font-body">Build pre-visit questionnaires with branching logic, room types, voice notes, and rough price estimates</p>
                <div className="flex gap-3 mt-4">
                  <span className="text-xs bg-warm-cream text-charcoal px-2 py-1 rounded-full font-medium">Questions</span>
                  <span className="text-xs bg-warm-cream text-charcoal px-2 py-1 rounded-full font-medium">Price Rules</span>
                  <span className="text-xs bg-warm-cream text-charcoal px-2 py-1 rounded-full font-medium">Sent Questionnaires</span>
                </div>
              </button>

              {/* Questionnaire Submissions */}
              <button onClick={() => setSection("questionnaire-submissions")} className="group bg-white rounded-2xl border border-border/60 shadow-sm p-6 text-left hover:shadow-md hover:border-canyon/40 transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center"><ClipboardList className="w-6 h-6 text-teal-600" /></div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground/40 group-hover:text-canyon transition-colors" />
                </div>
                <h3 className="text-base font-display text-charcoal">Questionnaire Submissions</h3>
                <p className="text-xs text-muted-foreground mt-1 font-body">View customer questionnaire answers and manage inspiration photos per trade</p>
              </button>

              {/* Calculator Sections */}
              <button onClick={() => setSection("sections")} className="group bg-white rounded-2xl border border-border/60 shadow-sm p-6 text-left hover:shadow-md hover:border-canyon/40 transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center"><Settings className="w-6 h-6 text-blue-600" /></div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground/40 group-hover:text-canyon transition-colors" />
                </div>
                <h3 className="text-base font-display text-charcoal">Calculator Sections</h3>
                <p className="text-xs text-muted-foreground mt-1 font-body">Configure which sections appear for each project type and rename them</p>
              </button>

              {/* Initial Consult */}
              <button onClick={() => setSection("initial-consult")} className="group bg-white rounded-2xl border border-border/60 shadow-sm p-6 text-left hover:shadow-md hover:border-canyon/40 transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center"><ClipboardList className="w-6 h-6 text-green-600" /></div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground/40 group-hover:text-canyon transition-colors" />
                </div>
                <h3 className="text-base font-display text-charcoal">Initial Consult</h3>
                <p className="text-xs text-muted-foreground mt-1 font-body">View saved consultations and configure financial assumption defaults for reps</p>
                <div className="flex gap-2 mt-4">
                  <span className="text-xs bg-warm-cream text-charcoal px-2 py-1 rounded-full font-medium">Sessions</span>
                  <span className="text-xs bg-warm-cream text-charcoal px-2 py-1 rounded-full font-medium">Financial Defaults</span>
                  <span className="text-xs bg-warm-cream text-charcoal px-2 py-1 rounded-full font-medium">Lock Controls</span>
                </div>
              </button>
              {/* Site Settings */}
              <button onClick={() => setSection("settings")} className="group bg-white rounded-2xl border border-border/60 shadow-sm p-6 text-left hover:shadow-md hover:border-canyon/40 transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center"><Settings className="w-6 h-6 text-slate-600" /></div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground/40 group-hover:text-canyon transition-colors" />
                </div>
                <h3 className="text-base font-display text-charcoal">Site Settings</h3>
                <p className="text-xs text-muted-foreground mt-1 font-body">Edit appointment booking URLs and other site-wide settings</p>
              </button>
            </div>
          </div>
        )}

        {/* ── SALES SECTION ──────────────────────────────────────────── */}
        {section === "sales" && (
          <Tabs defaultValue="sign-requests" className="space-y-6">
            <TabsList className="bg-white border border-border/60 shadow-sm flex-wrap h-auto gap-1 p-1">
              <TabsTrigger value="sign-requests" className="gap-1.5 text-xs sm:text-sm"><PenLine className="w-4 h-4" /> Sign Requests</TabsTrigger>
              <TabsTrigger value="sent-emails" className="gap-1.5 text-xs sm:text-sm"><Mail className="w-4 h-4" /> Sent Estimates</TabsTrigger>
            </TabsList>
            <TabsContent value="sign-requests"><DPSignRequestsPanel /></TabsContent>
            <TabsContent value="sent-emails"><DPSentEmailsPanel /></TabsContent>
          </Tabs>
        )}

        {/* ── PRICING & SERVICES SECTION ─────────────────────────────── */}
        {section === "pricing" && (
          <Tabs defaultValue="items" className="space-y-6">
            <TabsList className="bg-white border border-border/60 shadow-sm flex-wrap h-auto gap-1 p-1">
              <TabsTrigger value="items" className="gap-1.5 text-xs sm:text-sm"><Zap className="w-4 h-4" /> Design Package Items</TabsTrigger>
              <TabsTrigger value="commission" className="gap-1.5 text-xs sm:text-sm"><DollarSign className="w-4 h-4" /> Commission</TabsTrigger>
              <TabsTrigger value="discounts" className="gap-1.5 text-xs sm:text-sm"><Package className="w-4 h-4" /> Discounts</TabsTrigger>
              <TabsTrigger value="free-features" className="gap-1.5 text-xs sm:text-sm"><Package className="w-4 h-4" /> Parade Stoppers</TabsTrigger>
              <TabsTrigger value="questionnaire" className="gap-1.5 text-xs sm:text-sm"><PenLine className="w-4 h-4" /> Questionnaire</TabsTrigger>
              <TabsTrigger value="feasibility" className="gap-1.5 text-xs sm:text-sm"><ClipboardList className="w-4 h-4" /> Feasibility Study</TabsTrigger>
              <TabsTrigger value="engineer-letter" className="gap-1.5 text-xs sm:text-sm"><FileText className="w-4 h-4" /> Engineer's Letter</TabsTrigger>
            </TabsList>
            <TabsContent value="items"><DesignPackageItemsPanel utils={utils} /></TabsContent>
            <TabsContent value="commission"><DPCommissionPanel utils={utils} /></TabsContent>
            <TabsContent value="discounts"><DPDiscountsPanel utils={utils} /></TabsContent>
            <TabsContent value="free-features"><DPFreeFeaturesPanel utils={utils} /></TabsContent>
            <TabsContent value="questionnaire"><DPQuestionnairePanel utils={utils} /></TabsContent>
            <TabsContent value="feasibility"><DPFeasibilityConfigPanel utils={utils} /></TabsContent>
            <TabsContent value="engineer-letter"><DPEngineerLetterConfigPanel utils={utils} /></TabsContent>
          </Tabs>
        )}

        {/* ── PRICE CONSULT SECTION ──────────────────────────────────── */}
        {/* ── CONTRACTS SECTION ──────────────────────────────────────── */}
        {section === "contracts" && (
          <Tabs defaultValue="templates" className="space-y-6">
            <TabsList className="bg-white border border-border/60 shadow-sm flex-wrap h-auto gap-1 p-1">
              <TabsTrigger value="templates" className="gap-1.5 text-xs sm:text-sm"><FileText className="w-4 h-4" /> Contract Templates</TabsTrigger>
            </TabsList>
            <TabsContent value="templates"><DPContractsPanel /></TabsContent>
          </Tabs>
        )}

        {/* ── CALCULATOR SECTIONS SECTION ────────────────────────────── */}
        {section === "sections" && <DPSectionConfigPanel utils={utils} />}

        {/* ── QUESTIONNAIRE BUILDER SECTION ────────────────────── */}
        {section === "questionnaire-builder" && <QuestionnaireBuilderPanel />}

        {/* ── QUESTIONNAIRE SUBMISSIONS SECTION ──────────────────── */}
        {section === "questionnaire-submissions" && <QuestionnaireSubmissionsPanel />}

        {/* ── SITE SETTINGS SECTION ──────────────────────────────────── */}
        {section === "settings" && <DPSiteSettingsPanel utils={utils} />}
        {section === "initial-consult" && <InitialConsultAdminPanel utils={utils} />}

        {/* ── TEAM SECTION ───────────────────────────────────────────── */}
        {section === "team" && (
          <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <Users className="w-5 h-5 text-amber-600" />
              <h3 className="text-base font-display text-charcoal">Calculator Users</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">Manage calculator users, roles, and permissions in the Decking Admin portal (shared across both portals).</p>
            <Button variant="outline" onClick={() => navigate("/admin")} className="gap-2">
              <ArrowLeft className="w-4 h-4" /> Go to Decking Admin → Team
            </Button>
          </div>
        )}

        <div className="pb-8" />
      </div>
    </div>
  );
}

// ─── Feasibility Study Config Panel ─────────────────────────────────────────

function DPFeasibilityConfigPanel({ utils }: { utils: ReturnType<typeof trpc.useUtils> }) {
  const { data: configs, isLoading } = trpc.designPackage.getAllFeasibilityConfigs.useQuery();
  const createMutation = trpc.designPackage.createFeasibilityConfig.useMutation({
    onSuccess: () => {
      utils.designPackage.getAllFeasibilityConfigs.invalidate();
      utils.designPackage.getFeasibilityConfig.invalidate();
      toast.success("Feasibility config created");
      setShowCreate(false);
      resetForm();
    },
    onError: (e) => toast.error(e.message),
  });
  const updateMutation = trpc.designPackage.updateFeasibilityConfig.useMutation({
    onSuccess: () => {
      utils.designPackage.getAllFeasibilityConfigs.invalidate();
      utils.designPackage.getFeasibilityConfig.invalidate();
      toast.success("Feasibility config updated");
      setEditingId(null);
      resetForm();
    },
    onError: (e) => toast.error(e.message),
  });
  const deleteMutation = trpc.designPackage.deleteFeasibilityConfig.useMutation({
    onSuccess: () => {
      utils.designPackage.getAllFeasibilityConfigs.invalidate();
      utils.designPackage.getFeasibilityConfig.invalidate();
      toast.success("Feasibility config deleted");
    },
    onError: (e) => toast.error(e.message),
  });

  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    name: "",
    price: "",
    repCommission: "",
    drafterCost: "",
    description: "",
    tags: "",
  });

  const resetForm = () => setForm({ name: "", price: "", repCommission: "", drafterCost: "", description: "", tags: "" });

  const startEdit = (cfg: any) => {
    setForm({
      name: cfg.name || "",
      price: String(Number(cfg.price).toFixed(2)),
      repCommission: String(Number(cfg.repCommission).toFixed(2)),
      drafterCost: String(Number(cfg.drafterCost).toFixed(2)),
      description: cfg.description,
      tags: cfg.tags,
    });
    setEditingId(cfg.id);
    setShowCreate(false);
  };

  const handleSave = () => {
    if (editingId !== null) {
      updateMutation.mutate({
        id: editingId,
        name: form.name,
        price: Number(form.price),
        repCommission: Number(form.repCommission),
        drafterCost: Number(form.drafterCost),
        description: form.description,
        tags: form.tags,
      });
    } else {
      createMutation.mutate({
        name: form.name,
        price: Number(form.price),
        repCommission: Number(form.repCommission),
        drafterCost: Number(form.drafterCost),
        description: form.description,
        tags: form.tags,
        sortOrder: (configs?.length ?? 0),
      });
    }
  };

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-canyon" /></div>;

  const isFormOpen = showCreate || editingId !== null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-display text-charcoal">Feasibility Study Configurations</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage multiple feasibility study options with different scopes and pricing.
            Internal costs (rep commission, drafter cost) are never shown to customers.
          </p>
        </div>
        {!isFormOpen && (
          <Button size="sm" onClick={() => { setShowCreate(true); setEditingId(null); resetForm(); }} className="bg-canyon hover:bg-canyon/90 text-white">
            <Plus className="w-4 h-4 mr-1" /> Add Config
          </Button>
        )}
      </div>

      {/* Create / Edit Form */}
      {isFormOpen && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 space-y-4">
          <h4 className="text-sm font-semibold text-charcoal">
            {editingId !== null ? "Edit Feasibility Config" : "New Feasibility Config"}
          </h4>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Config Name</label>
            <input
              className="w-full mt-1 px-3 py-1.5 text-sm border border-border rounded-lg"
              placeholder="e.g. Standard Feasibility Study"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Customer Price ($)</label>
              <input
                type="number" step="0.01" min="0"
                className="w-full mt-1 px-3 py-1.5 text-sm border border-border rounded-lg"
                value={form.price}
                onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Rep Commission ($) <span className="text-muted-foreground/60">internal</span></label>
              <input
                type="number" step="0.01" min="0"
                className="w-full mt-1 px-3 py-1.5 text-sm border border-border rounded-lg"
                value={form.repCommission}
                onChange={e => setForm(f => ({ ...f, repCommission: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Drafter Cost ($) <span className="text-muted-foreground/60">internal</span></label>
              <input
                type="number" step="0.01" min="0"
                className="w-full mt-1 px-3 py-1.5 text-sm border border-border rounded-lg"
                value={form.drafterCost}
                onChange={e => setForm(f => ({ ...f, drafterCost: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Description (shown in calculator card)</label>
            <textarea
              rows={3}
              className="w-full mt-1 px-3 py-1.5 text-sm border border-border rounded-lg resize-y"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">
              Bullet Tags <span className="text-muted-foreground/60">(comma-separated, shown as pills in calculator)</span>
            </label>
            <input
              className="w-full mt-1 px-3 py-1.5 text-sm border border-border rounded-lg"
              placeholder="Zoning Review,Structural Assessment,Preliminary Drawings,Cost Validation"
              value={form.tags}
              onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
            />
            <div className="flex flex-wrap gap-1.5 mt-2">
              {form.tags.split(",").map(t => t.trim()).filter(Boolean).map(tag => (
                <span key={tag} className="px-2 py-0.5 rounded-full bg-sandstone/60 text-xs font-body text-stone-dark border border-border/40">{tag}</span>
              ))}
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <Button size="sm" className="bg-canyon hover:bg-canyon/90 text-white" onClick={handleSave}
              disabled={updateMutation.isPending || createMutation.isPending || !form.name.trim() || !form.description.trim()}>
              {(updateMutation.isPending || createMutation.isPending) ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => { setEditingId(null); setShowCreate(false); resetForm(); }}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Config Cards List */}
      {configs && configs.length > 0 ? (
        <div className="space-y-3">
          {configs.map(cfg => (
            <div key={cfg.id} className={cn(
              "bg-white rounded-xl border shadow-sm p-5 space-y-3 transition-all",
              cfg.isActive ? "border-border/60" : "border-red-200 opacity-70"
            )}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold text-charcoal">{cfg.name}</h4>
                  {!cfg.isActive && <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-600 font-medium">Inactive</span>}
                </div>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => startEdit(cfg)}>
                    <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={() => { if (confirm(`Delete "${cfg.name}"?`)) deleteMutation.mutate({ id: cfg.id }); }}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-sandstone/30 rounded-lg p-2.5">
                  <p className="text-[10px] text-muted-foreground font-medium">Customer Price</p>
                  <p className="text-lg font-bold text-canyon mt-0.5">${Number(cfg.price).toFixed(2)}</p>
                </div>
                <div className="bg-sandstone/30 rounded-lg p-2.5">
                  <p className="text-[10px] text-muted-foreground font-medium">Rep Commission <span className="text-muted-foreground/60">(int)</span></p>
                  <p className="text-lg font-bold text-charcoal mt-0.5">${Number(cfg.repCommission).toFixed(2)}</p>
                </div>
                <div className="bg-sandstone/30 rounded-lg p-2.5">
                  <p className="text-[10px] text-muted-foreground font-medium">Drafter Cost <span className="text-muted-foreground/60">(int)</span></p>
                  <p className="text-lg font-bold text-charcoal mt-0.5">${Number(cfg.drafterCost).toFixed(2)}</p>
                </div>
              </div>
              <p className="text-xs text-charcoal leading-relaxed">{cfg.description}</p>
              <div className="flex flex-wrap gap-1.5">
                {cfg.tags.split(",").map(t => t.trim()).filter(Boolean).map(tag => (
                  <span key={tag} className="px-2 py-0.5 rounded-full bg-sandstone/60 text-[10px] font-body text-stone-dark border border-border/40">{tag}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-sm text-muted-foreground italic">No feasibility configs found. Click "Add Config" to create one.</div>
      )}
    </div>
  );
}


// ─── Questionnaire Submissions Panel ─────────────────────────────────────────

const TRADE_LABELS: Record<string, string> = {
  cabinetry: "Cabinetry",
  countertops: "Countertops",
  flooring: "Flooring",
  tile: "Tile",
  plumbing_fixtures: "Plumbing Fixtures",
  lighting: "Lighting",
  paint: "Paint & Finishes",
  trim_millwork: "Trim & Millwork",
};

const ROOM_LABELS: Record<string, string> = {
  kitchen: "Kitchen",
  living_room: "Living Room",
  game_room: "Game Room",
  office: "Office",
  bedroom: "Bedroom",
  powder_room: "Powder Room",
  master_bathroom: "Master Bathroom",
  full_bathroom: "Full Bathroom",
};

function SubmissionDetail({ id }: { id: number }) {
  const { data, isLoading } = trpc.questionnaire.getSubmission.useQuery({ id });
  if (isLoading) return <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-canyon" /></div>;
  if (!data) return null;
  const { rooms, trades, photos } = data;
  const photoMap: Record<number, { id: number; photoUrl: string; title: string }> = {};
  photos.forEach((p: { id: number; photoUrl: string; title: string }) => { photoMap[p.id] = p; });
  return (
    <div className="border-t border-border/40 p-4 space-y-4 bg-warm-cream/30">
      {rooms.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Rooms Selected</p>
          <div className="space-y-3">
            {rooms.map((room: { id: number; roomKey: string; details: unknown }) => {
              const roomDetails = (room.details && typeof room.details === 'object') ? room.details as Record<string, string> : null;
              return (
                <div key={room.id} className="bg-white rounded-lg p-3 border border-border/40">
                  <p className="text-sm font-medium text-charcoal mb-1">{ROOM_LABELS[room.roomKey] ?? room.roomKey}</p>
                  {roomDetails && Object.keys(roomDetails).length > 0 && (
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-1">
                      {Object.entries(roomDetails).map(([k, v]: [string, string]) => (
                        <div key={k} className="flex gap-1 text-xs">
                          <span className="text-muted-foreground capitalize">{k.replace(/_/g, " ")}:</span>
                          <span className="text-charcoal font-medium">{String(v)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
      {trades.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Trade Selections</p>
          <div className="space-y-2">
            {trades.map((trade: { id: number; tradeKey: string; notes: string | null; selectedPhotoIds: unknown }) => (
              <div key={trade.id} className="bg-white rounded-lg p-3 border border-border/40">
                <p className="text-sm font-medium text-charcoal">{TRADE_LABELS[trade.tradeKey] ?? trade.tradeKey}</p>
                {Array.isArray(trade.selectedPhotoIds) && (trade.selectedPhotoIds as number[]).length > 0 && (
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {(trade.selectedPhotoIds as number[]).map(pid => photoMap[pid] && (
                      <div key={pid} className="relative">
                        <img src={photoMap[pid].photoUrl} alt={photoMap[pid].title ?? ""} className="w-16 h-16 object-cover rounded-lg border border-border/40" />
                        {photoMap[pid].title && <p className="text-xs text-center mt-0.5 text-muted-foreground truncate w-16">{photoMap[pid].title}</p>}
                      </div>
                    ))}
                  </div>
                )}
                {trade.notes && <p className="text-xs text-muted-foreground mt-1 italic">"{trade.notes}"</p>}
              </div>
            ))}
          </div>
        </div>
      )}
      {data.submission.status !== "completed" && (
        <p className="text-xs text-amber-600 italic">Customer has not yet completed this questionnaire.</p>
      )}
    </div>
  );
}

function QuestionnaireSubmissionsPanel() {
  const [activeTab, setActiveTab] = useState<"submissions" | "photos">("submissions");
  const [searchPhone, setSearchPhone] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const { data: submissions = [], isLoading } = trpc.questionnaire.listSubmissions.useQuery({});
  const { data: allPhotos = [], isLoading: loadingPhotos } = trpc.questionnaire.listPhotos.useQuery({});
  const deletePhotoMutation = trpc.questionnaire.deletePhoto.useMutation({ onSuccess: () => utils.questionnaire.listPhotos.invalidate() });
  const utils = trpc.useUtils();

  const filtered = searchPhone.trim()
    ? submissions.filter(s => s.customerPhone?.replace(/\D/g, "").includes(searchPhone.replace(/\D/g, "")))
    : submissions;

  const photosByTrade: Record<string, typeof allPhotos> = {};
  allPhotos.forEach(p => {
    if (!photosByTrade[p.tradeKey]) photosByTrade[p.tradeKey] = [];
    photosByTrade[p.tradeKey]!.push(p);
  });

  return (
    <div className="space-y-6">
      <div className="flex gap-2 border-b border-border/60 pb-0">
        <button
          onClick={() => setActiveTab("submissions")}
          className={cn("px-4 py-2 text-sm font-medium border-b-2 transition-colors", activeTab === "submissions" ? "border-canyon text-canyon" : "border-transparent text-muted-foreground hover:text-charcoal")}
        >
          Submissions
        </button>
        <button
          onClick={() => setActiveTab("photos")}
          className={cn("px-4 py-2 text-sm font-medium border-b-2 transition-colors", activeTab === "photos" ? "border-canyon text-canyon" : "border-transparent text-muted-foreground hover:text-charcoal")}
        >
          Inspiration Photos
        </button>
      </div>

      {activeTab === "submissions" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <input
              className="px-3 py-1.5 text-sm border border-border rounded-lg w-56"
              placeholder="Search by phone number…"
              value={searchPhone}
              onChange={e => setSearchPhone(e.target.value)}
            />
            <span className="text-xs text-muted-foreground">{filtered.length} result{filtered.length !== 1 ? "s" : ""}</span>
          </div>
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-canyon" /></div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground italic text-center py-8">No questionnaire submissions yet.</p>
          ) : (
            <div className="space-y-3">
              {filtered.map(sub => (
                <div key={sub.id} className="bg-white rounded-xl border border-border/60 shadow-sm overflow-hidden">
                  <button
                    className="w-full p-4 text-left hover:bg-warm-cream/40 transition-colors"
                    onClick={() => setExpandedId(expandedId === sub.id ? null : sub.id)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-charcoal truncate">{sub.customerName}</p>
                        <p className="text-xs text-muted-foreground truncate">{sub.customerPhone}{sub.customerEmail ? ` · ${sub.customerEmail}` : ""}</p>
                        {sub.customerAddress && <p className="text-xs text-muted-foreground truncate">{sub.customerAddress}</p>}
                        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                          <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", sub.status === "completed" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700")}>
                            {sub.status === "completed" ? "Completed" : "Pending"}
                          </span>
                          <span className="text-xs text-muted-foreground">{sub.mode === "know" ? "I know what I need" : sub.mode === "help" ? "Help me decide" : "—"}</span>
                        </div>
                      </div>
                      <ChevronRight className={cn("w-4 h-4 text-muted-foreground transition-transform shrink-0 mt-0.5", expandedId === sub.id && "rotate-90")} />
                    </div>
                  </button>
                  {expandedId === sub.id && <SubmissionDetail id={sub.id} />}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "photos" && (
        <InspirationPhotosPanel
          photosByTrade={photosByTrade}
          loadingPhotos={loadingPhotos}
          onDelete={(id) => deletePhotoMutation.mutate({ id })}
          utils={utils}
        />
      )}
    </div>
  );
}

// ─── Inspiration Photos Panel ─────────────────────────────────────────────────

const ALL_TRADES = [
  { key: "cabinetry", label: "Cabinetry" },
  { key: "countertops", label: "Countertops" },
  { key: "flooring", label: "Flooring" },
  { key: "tile", label: "Tile" },
  { key: "plumbing_fixtures", label: "Plumbing Fixtures" },
  { key: "lighting", label: "Lighting" },
  { key: "paint", label: "Paint & Finishes" },
  { key: "trim_millwork", label: "Trim & Millwork" },
];

function InspirationPhotosPanel({
  photosByTrade,
  loadingPhotos,
  onDelete,
  utils,
}: {
  photosByTrade: Record<string, { id: number; tradeKey: string; photoUrl: string; title?: string | null; subtitle?: string | null; sortOrder?: number | null; isActive?: number | null }[]>;
  loadingPhotos: boolean;
  onDelete: (id: number) => void;
  utils: ReturnType<typeof trpc.useUtils>;
}) {
  const [activeTrade, setActiveTrade] = useState(ALL_TRADES[0].key);
  const [uploading, setUploading] = useState(false);
  const [uploadForm, setUploadForm] = useState({ title: "", subtitle: "", sortOrder: 0 });
  const uploadMutation = trpc.questionnaire.addPhoto.useMutation({
    onSuccess: () => { utils.questionnaire.listPhotos.invalidate(); setUploadForm({ title: "", subtitle: "", sortOrder: 0 }); },
  });
  const updateMutation = trpc.questionnaire.updatePhoto.useMutation({ onSuccess: () => utils.questionnaire.listPhotos.invalidate() });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const base64 = (ev.target?.result as string).split(",")[1];
        await uploadMutation.mutateAsync({
          tradeKey: activeTrade,
          photoBase64: base64,
          mimeType: file.type,
          title: uploadForm.title || undefined,
          subtitle: uploadForm.subtitle || undefined,
          sortOrder: uploadForm.sortOrder,
        });
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch {
      setUploading(false);
    }
    e.target.value = "";
  };

  const photos = photosByTrade[activeTrade] ?? [];

  return (
    <div className="space-y-4">
      {/* Trade selector */}
      <div className="flex flex-wrap gap-2">
        {ALL_TRADES.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTrade(t.key)}
            className={cn("px-3 py-1.5 rounded-full text-xs font-medium border transition-all", activeTrade === t.key ? "bg-canyon text-white border-canyon" : "bg-white text-stone-700 border-stone-300 hover:border-canyon/50")}
          >
            {t.label} {(photosByTrade[t.key]?.length ?? 0) > 0 && <span className="ml-1 opacity-70">({photosByTrade[t.key]?.length})</span>}
          </button>
        ))}
      </div>

      {/* Upload form */}
      <div className="bg-white rounded-xl border border-border/60 p-4 space-y-3">
        <p className="text-sm font-semibold text-charcoal">Upload Photo for {ALL_TRADES.find(t => t.key === activeTrade)?.label}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            className="px-3 py-1.5 text-sm border border-border rounded-lg"
            placeholder="Title (e.g. High-End)"
            value={uploadForm.title}
            onChange={e => setUploadForm(f => ({ ...f, title: e.target.value }))}
          />
          <input
            className="px-3 py-1.5 text-sm border border-border rounded-lg"
            placeholder="Subtitle (optional)"
            value={uploadForm.subtitle}
            onChange={e => setUploadForm(f => ({ ...f, subtitle: e.target.value }))}
          />
        </div>
        <div className="flex items-center gap-3">
          <label className={cn("cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all", uploading ? "opacity-50 cursor-not-allowed" : "bg-canyon text-white border-canyon hover:bg-canyon/90")}>
            {uploading ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading…</> : <><Upload className="w-4 h-4" /> Choose Photo</>}
            <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} disabled={uploading} />
          </label>
          <span className="text-xs text-muted-foreground">JPG, PNG, WebP recommended</span>
        </div>
      </div>

      {/* Photo grid */}
      {loadingPhotos ? (
        <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-canyon" /></div>
      ) : photos.length === 0 ? (
        <p className="text-sm text-muted-foreground italic text-center py-8">No photos uploaded for this trade yet.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {photos.map(photo => (
            <div key={photo.id} className="bg-white rounded-xl border border-border/60 overflow-hidden shadow-sm">
              <div className="relative group">
                <img src={photo.photoUrl} alt={photo.title ?? ""} className="w-full h-36 object-cover" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    onClick={() => { if (confirm("Delete this photo?")) onDelete(photo.id); }}
                    className="bg-red-600 text-white px-3 py-1 rounded-lg text-xs font-medium hover:bg-red-700"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => updateMutation.mutate({ id: photo.id, isActive: photo.isActive === 1 ? 0 : 1 })}
                    className="bg-white text-charcoal px-3 py-1 rounded-lg text-xs font-medium hover:bg-warm-cream"
                  >
                    {photo.isActive === 1 ? "Hide" : "Show"}
                  </button>
                </div>
                {photo.isActive === 0 && (
                  <div className="absolute top-2 left-2 bg-stone-600/80 text-white text-xs px-2 py-0.5 rounded-full">Hidden</div>
                )}
              </div>
              <div className="p-2">
                {photo.title && <p className="text-xs font-semibold text-charcoal truncate">{photo.title}</p>}
                {photo.subtitle && <p className="text-xs text-muted-foreground truncate">{photo.subtitle}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── DP Site Settings Panel ──────────────────────────────────────────────────
function DPSiteSettingsPanel({ utils }: { utils: ReturnType<typeof trpc.useUtils> }) {
  const { data: config, isLoading } = trpc.admin.getConfig.useQuery();
  const updateMutation = trpc.admin.bulkUpdateSettings.useMutation({
    onSuccess: () => { utils.admin.getConfig.invalidate(); toast.success("Settings saved"); },
    onError: (e: any) => toast.error(e.message),
  });

  // The two booking URL keys we care about
  const BOOKING_KEYS = [
    {
      key: "design_package_appointment_url",
      label: "Design Package Appointment Booking URL",
      description: "GHL booking widget URL used when customers click 'Book a Consultation' in the Design Package calculator.",
    },
    {
      key: "decking_appointment_url",
      label: "Decking Appointment Booking URL",
      description: "GHL booking widget URL used when customers click 'Book an Appointment' in the Decking calculator.",
    },
  ];

  const [values, setValues] = useState<Record<string, string>>({});

  const settings: any[] = (config as any)?.settings || [];

  // Populate local state from DB values
  useState(() => {
    if (!settings.length) return;
    const map: Record<string, string> = {};
    for (const s of settings) map[s.settingKey] = s.settingValue;
    setValues(map);
  });

  // Also update when config loads
  const settingsRef = JSON.stringify(settings.map((s: any) => s.settingKey + s.settingValue));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const [initialized, setInitialized] = useState(false);
  if (!initialized && settings.length > 0) {
    const map: Record<string, string> = {};
    for (const s of settings) map[s.settingKey] = s.settingValue;
    setValues(map);
    setInitialized(true);
  }

  const dirty = BOOKING_KEYS.some(({ key }) => {
    const current = settings.find((s: any) => s.settingKey === key)?.settingValue;
    return values[key] !== undefined && values[key] !== current;
  });

  const handleSave = () => {
    const updates = BOOKING_KEYS
      .filter(({ key }) => {
        const current = settings.find((s: any) => s.settingKey === key)?.settingValue;
        return values[key] !== undefined && values[key] !== current;
      })
      .map(({ key }) => ({ key, value: values[key] || "" }));
    if (updates.length > 0) updateMutation.mutate({ updates });
  };

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-canyon" /></div>;

  return (
    <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-display text-charcoal">Site Settings</h3>
          <p className="text-sm text-muted-foreground mt-1">Edit appointment booking URLs and other site-wide configuration.</p>
        </div>
        {dirty && (
          <Button size="sm" className="bg-canyon hover:bg-canyon/90 text-white gap-1.5" onClick={handleSave} disabled={updateMutation.isPending}>
            <Save className="w-4 h-4" /> Save Changes
          </Button>
        )}
      </div>

      <div className="space-y-4">
        {BOOKING_KEYS.map(({ key, label, description }) => {
          const currentVal = values[key] ?? settings.find((s: any) => s.settingKey === key)?.settingValue ?? "";
          return (
            <div key={key}>
              <label className="text-xs font-body font-medium text-charcoal mb-1 block">{label}</label>
              {description && <p className="text-[10px] text-muted-foreground mb-1">{description}</p>}
              <input
                type="url"
                value={currentVal}
                onChange={(e) => setValues(prev => ({ ...prev, [key]: e.target.value }))}
                className="w-full h-9 px-3 rounded-md border border-border text-sm font-mono focus:outline-none focus:ring-2 focus:ring-canyon/40"
                placeholder="https://api.leadconnectorhq.com/widget/bookings/..."
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}


// ─── Bathroom Remodel Config Panel ──────────────────────────────────────────

function DPBathroomConfigPanel({ utils }: { utils: ReturnType<typeof trpc.useUtils> }) {
  const { data: sizeTiers, isLoading: loadingTiers } = trpc.designPackage.getBathroomSizeTiers.useQuery();
  const { data: plumbingItems, isLoading: loadingPlumbing } = trpc.designPackage.getBathroomPlumbingItems.useQuery();
  const { data: electricalItems, isLoading: loadingElectrical } = trpc.designPackage.getBathroomElectricalOptions.useQuery();
  const { data: hvacItems, isLoading: loadingHvac } = trpc.designPackage.getBathroomHvacOptions.useQuery();
  const { data: finishLevels, isLoading: loadingFinish } = trpc.designPackage.getBathroomFinishTiers.useQuery();
  const { data: addOns, isLoading: loadingAddOns } = trpc.designPackage.getBathroomAddons.useQuery();
  // New material categories
  const { data: showerSurrounds, isLoading: loadingShower } = trpc.designPackage.getBathroomShowerSurround.useQuery();
  const { data: vanityOptions, isLoading: loadingVanity } = trpc.designPackage.getBathroomVanity.useQuery();
  const { data: flooringOptions, isLoading: loadingFlooring } = trpc.designPackage.getBathroomFlooring.useQuery();
  const { data: countertopOptions, isLoading: loadingCountertop } = trpc.designPackage.getBathroomCountertop.useQuery();
  const { data: countertopEdges, isLoading: loadingEdges } = trpc.designPackage.getBathroomCountertopEdge.useQuery();
  const { data: toiletOptions, isLoading: loadingToilet } = trpc.designPackage.getBathroomToilet.useQuery();
  const { data: wallFinishes, isLoading: loadingWall } = trpc.designPackage.getBathroomWallFinish.useQuery();
  // New expanded data
  const { data: plumbingChecklist } = trpc.designPackage.getBathroomPlumbingChecklist.useQuery({});
  const { data: hvacChecklist } = trpc.designPackage.getBathroomHvacChecklist.useQuery({});
  // Fixture inventory
  const { data: fixtureTypes } = trpc.designPackage.getBathroomFixtureTypes.useQuery();
  const { data: fixtureActions } = trpc.designPackage.getBathroomFixtureActions.useQuery();
  const { data: tubConfigs } = trpc.designPackage.getBathroomTubConfig.useQuery();
  const { data: showerConfigs } = trpc.designPackage.getBathroomShowerConfig.useQuery();
  const { data: tileSizes } = trpc.designPackage.getBathroomTileSizes.useQuery();
  const { data: tilePatterns } = trpc.designPackage.getBathroomTilePatterns.useQuery();
  const { data: vanityPricing } = trpc.designPackage.getBathroomVanityPricing.useQuery();
  // Checklist state
  const [newPlumbingCheck, setNewPlumbingCheck] = useState("");
  const [newHvacCheck, setNewHvacCheck] = useState("");
  const addPlumbingCheck = trpc.designPackage.createBathroomPlumbingChecklistItem.useMutation({
    onSuccess: () => { utils.designPackage.getBathroomPlumbingChecklist.invalidate(); setNewPlumbingCheck(""); toast.success("Checklist item added"); },
    onError: (e: any) => toast.error(e.message),
  });
  const deletePlumbingCheck = trpc.designPackage.deleteBathroomPlumbingChecklistItem.useMutation({
    onSuccess: () => { utils.designPackage.getBathroomPlumbingChecklist.invalidate(); toast.success("Item removed"); },
    onError: (e: any) => toast.error(e.message),
  });
  const addHvacCheck = trpc.designPackage.createBathroomHvacChecklistItem.useMutation({
    onSuccess: () => { utils.designPackage.getBathroomHvacChecklist.invalidate(); setNewHvacCheck(""); toast.success("Checklist item added"); },
    onError: (e: any) => toast.error(e.message),
  });
  const deleteHvacCheck = trpc.designPackage.deleteBathroomHvacChecklistItem.useMutation({
    onSuccess: () => { utils.designPackage.getBathroomHvacChecklist.invalidate(); toast.success("Item removed"); },
    onError: (e: any) => toast.error(e.message),
  });
  // Tub config mutations
  const updateTubConfig = trpc.designPackage.updateBathroomTubConfig.useMutation({
    onSuccess: () => { utils.designPackage.getBathroomTubConfig.invalidate(); toast.success("Tub config updated"); },
    onError: (e: any) => toast.error(e.message),
  });
  // Shower config mutations
  const updateShowerConfig = trpc.designPackage.updateBathroomShowerConfigItem.useMutation({
    onSuccess: () => { utils.designPackage.getBathroomShowerConfig.invalidate(); toast.success("Shower config updated"); },
    onError: (e: any) => toast.error(e.message),
  });
  // Tile size mutations
  const updateTileSize = trpc.designPackage.updateBathroomTileSize.useMutation({
    onSuccess: () => { utils.designPackage.getBathroomTileSizes.invalidate(); toast.success("Tile size updated"); },
    onError: (e: any) => toast.error(e.message),
  });
  // Tile pattern mutations
  const updateTilePattern = trpc.designPackage.updateBathroomTilePattern.useMutation({
    onSuccess: () => { utils.designPackage.getBathroomTilePatterns.invalidate(); toast.success("Tile pattern updated"); },
    onError: (e: any) => toast.error(e.message),
  });
  // Vanity pricing mutations
  const updateVanityPricingRow = trpc.designPackage.updateBathroomVanityPricing.useMutation({
    onSuccess: () => { utils.designPackage.getBathroomVanityPricing.invalidate(); toast.success("Vanity pricing updated"); },
    onError: (e: any) => toast.error(e.message),
  });
  // Painting options
  const { data: paintingOptions } = trpc.designPackage.getBathroomPaintingOptions.useQuery();
  const updatePaintingOption = trpc.designPackage.updateBathroomPaintingOption.useMutation({
    onSuccess: () => { utils.designPackage.getBathroomPaintingOptions.invalidate(); toast.success("Painting option updated"); },
    onError: (e: any) => toast.error(e.message),
  });
  // Accessories
  const { data: accessories } = trpc.designPackage.getBathroomAccessories.useQuery();
  const updateAccessory = trpc.designPackage.updateBathroomAccessory.useMutation({
    onSuccess: () => { utils.designPackage.getBathroomAccessories.invalidate(); toast.success("Accessory updated"); },
    onError: (e: any) => toast.error(e.message),
  });
  // Floating vanity config
  const { data: floatingVanityCfg } = trpc.designPackage.getBathroomFloatingVanityConfig.useQuery();
  const updateFloatingVanity = trpc.designPackage.updateBathroomFloatingVanityConfig.useMutation({
    onSuccess: () => { utils.designPackage.getBathroomFloatingVanityConfig.invalidate(); toast.success("Floating vanity config updated"); },
    onError: (e: any) => toast.error(e.message),
  });
  const [fvMountCost, setFvMountCost] = useState("");
  const [fvTurnDownRate, setFvTurnDownRate] = useState("");
  const [fvEditing, setFvEditing] = useState(false);

  // Fixture action mutations
  const updateFixtureAction = trpc.designPackage.updateBathroomFixtureAction.useMutation({
    onSuccess: () => { utils.designPackage.getBathroomFixtureActions.invalidate(); toast.success("Fixture action updated"); },
    onError: (e: any) => toast.error(e.message),
  });

  const updateSizeTier = trpc.designPackage.updateBathroomSizeTier.useMutation({
    onSuccess: () => { utils.designPackage.getBathroomSizeTiers.invalidate(); toast.success("Size tier updated"); },
    onError: (e: any) => toast.error(e.message),
  });
  const updatePlumbing = trpc.designPackage.updateBathroomPlumbingItem.useMutation({
    onSuccess: () => { utils.designPackage.getBathroomPlumbingItems.invalidate(); toast.success("Plumbing item updated"); },
    onError: (e: any) => toast.error(e.message),
  });
  const updateElectrical = trpc.designPackage.updateBathroomElectricalOption.useMutation({
    onSuccess: () => { utils.designPackage.getBathroomElectricalOptions.invalidate(); toast.success("Electrical item updated"); },
    onError: (e: any) => toast.error(e.message),
  });
  const updateHvac = trpc.designPackage.updateBathroomHvacOption.useMutation({
    onSuccess: () => { utils.designPackage.getBathroomHvacOptions.invalidate(); toast.success("HVAC item updated"); },
    onError: (e: any) => toast.error(e.message),
  });
  const updateFinishLevel = trpc.designPackage.updateBathroomFinishTier.useMutation({
    onSuccess: () => { utils.designPackage.getBathroomFinishTiers.invalidate(); toast.success("Finish level updated"); },
    onError: (e: any) => toast.error(e.message),
  });
  const updateAddOn = trpc.designPackage.updateBathroomAddon.useMutation({
    onSuccess: () => { utils.designPackage.getBathroomAddons.invalidate(); toast.success("Add-on updated"); },
    onError: (e: any) => toast.error(e.message),
  });
  const updateShowerSurround = trpc.designPackage.updateBathroomShowerSurround.useMutation({
    onSuccess: () => { utils.designPackage.getBathroomShowerSurround.invalidate(); toast.success("Shower/tub option updated"); },
    onError: (e: any) => toast.error(e.message),
  });
  const updateVanity = trpc.designPackage.updateBathroomVanity.useMutation({
    onSuccess: () => { utils.designPackage.getBathroomVanity.invalidate(); toast.success("Vanity option updated"); },
    onError: (e: any) => toast.error(e.message),
  });
  const updateFlooring = trpc.designPackage.updateBathroomFlooring.useMutation({
    onSuccess: () => { utils.designPackage.getBathroomFlooring.invalidate(); toast.success("Flooring option updated"); },
    onError: (e: any) => toast.error(e.message),
  });
  const updateCountertop = trpc.designPackage.updateBathroomCountertop.useMutation({
    onSuccess: () => { utils.designPackage.getBathroomCountertop.invalidate(); toast.success("Countertop option updated"); },
    onError: (e: any) => toast.error(e.message),
  });
  const updateCountertopEdge = trpc.designPackage.updateBathroomCountertopEdge.useMutation({
    onSuccess: () => { utils.designPackage.getBathroomCountertopEdge.invalidate(); toast.success("Edge profile updated"); },
    onError: (e: any) => toast.error(e.message),
  });
  const updateToilet = trpc.designPackage.updateBathroomToilet.useMutation({
    onSuccess: () => { utils.designPackage.getBathroomToilet.invalidate(); toast.success("Toilet option updated"); },
    onError: (e: any) => toast.error(e.message),
  });
  const updateWallFinish = trpc.designPackage.updateBathroomWallFinish.useMutation({
    onSuccess: () => { utils.designPackage.getBathroomWallFinish.invalidate(); toast.success("Wall finish updated"); },
    onError: (e: any) => toast.error(e.message),
  });

  const isLoading = loadingTiers || loadingPlumbing || loadingElectrical || loadingHvac || loadingFinish || loadingAddOns
    || loadingShower || loadingVanity || loadingFlooring || loadingCountertop || loadingEdges || loadingToilet || loadingWall;
  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-canyon" /></div>;

  // Normalise each data set to { id, name, cost, sellPrice, marginPct? } for the shared table
  const normSizeTiers = (sizeTiers ?? []).map(t => ({
    id: t.id,
    name: t.label,
    slug: t.slug,
    cost: Number(t.baseCost),
    sellPrice: Number(t.costPerSqft),
    description: t.description,
    extra: `Base: $${Number(t.baseCost).toFixed(0)}  $/sqft: $${Number(t.costPerSqft).toFixed(2)}`,
  }));
  const normPlumbing = (plumbingItems ?? []).map(t => ({ id: t.id, name: t.label, cost: Number(t.cost), sellPrice: Number(t.cost) * 2, description: t.description }));
  const normElectrical = (electricalItems ?? []).map(t => ({ id: t.id, name: t.label, cost: Number(t.cost), sellPrice: Number(t.cost) * 2, description: t.description }));
  const normHvac = (hvacItems ?? []).map(t => ({ id: t.id, name: t.label, cost: Number(t.cost), sellPrice: Number(t.cost) * 2, description: t.description }));
  const normFinish = (finishLevels ?? []).map(t => ({ id: t.id, name: t.label, cost: Number(t.costPerSqft), sellPrice: Number(t.costPerSqft) * 2, description: t.description, extra: `$/sqft: $${Number(t.costPerSqft).toFixed(2)}` }));
  const normAddOns = (addOns ?? []).map(t => ({ id: t.id, name: t.label, cost: Number(t.cost), sellPrice: Number(t.cost) * 2, description: t.description }));
  const normShower = (showerSurrounds ?? []).map((t: any) => ({ id: t.id, name: t.label, cost: Number(t.cost), sellPrice: Number(t.cost) * 2, description: t.description, extra: t.patternLayout ? `Layout: ${t.patternLayout}` : undefined }));
  const normVanity = (vanityOptions ?? []).map((t: any) => ({ id: t.id, name: t.label, cost: Number(t.cost), sellPrice: Number(t.cost) * 2, description: t.description }));
  const normFlooring = (flooringOptions ?? []).map((t: any) => ({ id: t.id, name: t.label, cost: Number(t.costPerSqft ?? t.cost), sellPrice: Number(t.costPerSqft ?? t.cost) * 2, description: t.description, extra: [t.tileSize ? `Size: ${t.tileSize}` : null, t.patternLayout ? `Layout: ${t.patternLayout}` : null].filter(Boolean).join(' | ') || undefined }));
  const normCountertop = (countertopOptions ?? []).map((t: any) => ({ id: t.id, name: t.label, cost: Number(t.costPerSqft ?? t.cost), sellPrice: Number(t.costPerSqft ?? t.cost) * 2, description: t.description, extra: t.pricingType === 'per_sqft' ? '$/sqft pricing' : 'Flat rate' }));
  const normEdges = (countertopEdges ?? []).map((t: any) => ({ id: t.id, name: t.label, cost: Number(t.cost), sellPrice: Number(t.cost) * 2, description: t.description }));
  const normToilet = (toiletOptions ?? []).map((t: any) => ({ id: t.id, name: t.label, cost: Number(t.cost), sellPrice: Number(t.cost) * 2, description: t.description }));
  const normWall = (wallFinishes ?? []).map((t: any) => ({ id: t.id, name: t.label, cost: Number(t.costPerSqft ?? t.cost), sellPrice: Number(t.costPerSqft ?? t.cost) * 2, description: t.description, extra: [t.tileSize ? `Size: ${t.tileSize}` : null, t.patternLayout ? `Layout: ${t.patternLayout}` : null].filter(Boolean).join(' | ') || undefined }));

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-base font-display text-charcoal">Bathroom Remodel Pricing</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Configure all pricing for the bathroom remodel calculator. Edit cost and sell price for each item.
          Internal costs are never shown to customers.
        </p>
      </div>

      {/* Section Manager */}
      <DPSectionManagerPanel consultType="bathroom" utils={utils} />

      {/* Size Tiers */}
      <BathroomSimpleTable
        title="Size Tiers"
        description="Base cost and $/sqft (for custom size) per bathroom tier."
        items={normSizeTiers}
        onSave={(id, cost, sellPrice) => updateSizeTier.mutate({ id, baseCost: cost, costPerSqft: sellPrice })}
      />

      {/* Plumbing — Fixture Inventory */}
      <div className="bg-white rounded-xl border border-border/60 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border/40 bg-sandstone/20">
          <h4 className="text-sm font-semibold text-charcoal">Plumbing — Fixture Actions</h4>
          <p className="text-xs text-muted-foreground mt-0.5">Cost per action for each fixture type. "Leave As-Is" has no cost. "Add New" uses cost-per-fixture. "Relocate" and "Update" use flat cost.</p>
        </div>
        <div className="divide-y divide-border/30">
          {(fixtureTypes ?? []).map((ft: any) => {
            const actions = (fixtureActions ?? []).filter((a: any) => a.fixtureKey === ft.fixtureKey);
            return (
              <div key={ft.fixtureKey} className="px-5 py-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-base">{ft.icon}</span>
                  <p className="text-sm font-semibold text-charcoal">{ft.label}</p>
                </div>
                <div className="space-y-1.5">
                  {actions.map((action: any) => (
                    <FixtureActionRow
                      key={action.id}
                      action={action}
                      onSave={(id, cost, costPerFixture) => updateFixtureAction.mutate({ id, cost, costPerFixture })}
                    />
                  ))}
                  {actions.length === 0 && <p className="text-xs text-muted-foreground italic">No actions configured.</p>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Electrical */}
      <BathroomSimpleTable
        title="Electrical Options"
        description="Selectable electrical scope items."
        items={normElectrical}
        onSave={(id, cost, _sell, description) => updateElectrical.mutate({ id, cost, description })}
      />

      {/* HVAC */}
      <BathroomSimpleTable
        title="HVAC Options"
        description="Selectable HVAC scope items."
        items={normHvac}
        onSave={(id, cost, _sell, description) => updateHvac.mutate({ id, cost, description })}
      />

      {/* Shower / Tub Surround */}
      <BathroomSimpleTable
        title="Shower / Tub Surround"
        description="Options for shower and tub surround material. Fiberglass inserts, cultured marble, tile with pattern layouts."
        items={normShower}
        onSave={(id, cost, _sell, description) => updateShowerSurround.mutate({ id, flatCost: cost, description })}
      />

      {/* Vanity */}
      <BathroomSimpleTable
        title="Vanity"
        description="Custom built, pre-built wood, or pre-built painted vanity options."
        items={normVanity}
        onSave={(id, cost, _sell, description) => updateVanity.mutate({ id, flatCost: cost, description })}
      />

      {/* Flooring */}
      <BathroomSimpleTable
        title="Flooring"
        description="LVP click-and-lock and tile options with sizes and pattern layouts. Per-sqft pricing."
        items={normFlooring}
        onSave={(id, cost, _sell, description) => updateFlooring.mutate({ id, costPerSqft: cost, description })}
        costLabel="$/sqft"
      />

      {/* Countertop */}
      <BathroomSimpleTable
        title="Countertop"
        description="Remnant pieces (flat rate) and full slabs (per sqft). Fabrication included."
        items={normCountertop}
        onSave={(id, cost, _sell, description) => updateCountertop.mutate({ id, costPerSqft: cost, description })}
        costLabel="$/sqft or flat"
      />

      {/* Countertop Edge Profiles */}
      <BathroomSimpleTable
        title="Countertop Edge Profiles"
        description="Optional edge profile add-ons for countertops (eased, bullnose, ogee, waterfall, etc.)."
        items={normEdges}
        onSave={(id, cost, _sell, description) => updateCountertopEdge.mutate({ id, costPerLinearFt: cost, description })}
      />

      {/* Toilet */}
      <BathroomSimpleTable
        title="Toilet Options"
        description="Standard, concealed p-trap, and smart toilet options."
        items={normToilet}
        onSave={(id, cost, _sell, description) => updateToilet.mutate({ id, flatCost: cost, description })}
      />

      {/* Wall Finish */}
      <BathroomSimpleTable
        title="Wall Finish"
        description="Paint, wallpaper, and tile options with sizes and pattern layouts."
        items={normWall}
        onSave={(id, cost, _sell, description) => updateWallFinish.mutate({ id, costPerSqft: cost, description })}
        costLabel="$/sqft or flat"
      />

      {/* Finish Levels (legacy) */}
      <BathroomSimpleTable
        title="Finish Levels (Legacy)"
        description="Legacy finish level tiers. Kept for reference — new material selections replace these."
        items={normFinish}
        onSave={(id, cost, _sell, description) => updateFinishLevel.mutate({ id, costPerSqft: cost, description })}
        costLabel="$/sqft"
      />

      {/* Add-Ons */}
      <BathroomSimpleTable
        title="Add-Ons"
        description="Optional extras the customer can select."
        items={normAddOns}
        onSave={(id, cost, _sell, description) => updateAddOn.mutate({ id, cost, description })}
      />

      {/* ── PLUMBING FEASIBILITY CHECKLISTS (per fixture:action) ── */}
      <div className="bg-white rounded-xl border border-border/60 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border/40 bg-sandstone/20">
          <h4 className="text-sm font-semibold text-charcoal">Plumbing Feasibility Checklists</h4>
          <p className="text-xs text-muted-foreground mt-0.5">Each fixture action (Relocate, Add New) can have its own checklist. The customer must confirm all conditions before that action is counted. itemKey format: <code className="bg-sandstone/40 px-1 rounded">fixtureKey:actionType</code></p>
        </div>
        <div className="divide-y divide-border/30">
          {(fixtureTypes ?? []).map((ft: any) => {
            const actions = (fixtureActions ?? []).filter((a: any) => a.fixtureKey === ft.fixtureKey && a.actionType !== 'leave_as_is');
            return (
              <div key={ft.fixtureKey} className="px-5 py-4 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-base">{ft.icon}</span>
                  <p className="text-sm font-semibold text-charcoal">{ft.label}</p>
                </div>
                {actions.map((action: any) => {
                  const ckKey = `${ft.fixtureKey}:${action.actionType}`;
                  const itemChecks = (plumbingChecklist ?? []).filter((c: any) => c.itemKey === ckKey);
                  return (
                    <div key={action.actionType} className="ml-4 space-y-1.5">
                      <p className="text-xs font-semibold text-stone-600">{action.label}</p>
                      <p className="text-xs text-muted-foreground font-mono">itemKey: <code className="bg-sandstone/40 px-1 rounded">{ckKey}</code></p>
                      <div className="space-y-1">
                        {itemChecks.map((c: any) => (
                          <div key={c.id} className="flex items-center justify-between gap-3 bg-amber-50 rounded-lg px-3 py-1.5">
                            <span className="text-xs text-amber-900">{c.itemText}</span>
                            <Button size="sm" variant="outline" className="gap-1 text-red-600 border-red-200 hover:bg-red-50 h-6 text-xs px-2"
                              onClick={() => deletePlumbingCheck.mutate({ id: c.id })}>
                              <Trash2 className="w-3 h-3" /> Remove
                            </Button>
                          </div>
                        ))}
                        {itemChecks.length === 0 && (
                          <p className="text-xs text-muted-foreground italic">No conditions — this action can always be selected.</p>
                        )}
                      </div>
                      <PerItemChecklistAdd
                        placeholder={`Add condition for "${ft.label} — ${action.label}"...`}
                        onAdd={(text) => addPlumbingCheck.mutate({ itemText: text, itemKey: ckKey })}
                      />
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── HVAC FEASIBILITY CHECKLISTS (per item) ── */}
      <div className="bg-white rounded-xl border border-border/60 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border/40 bg-sandstone/20">
          <h4 className="text-sm font-semibold text-charcoal">HVAC Feasibility Checklists</h4>
          <p className="text-xs text-muted-foreground mt-0.5">Each HVAC option has its own checklist. The customer must confirm all conditions before that option is counted in the estimate.</p>
        </div>
        <div className="divide-y divide-border/30">
          {(hvacItems ?? []).map((hvItem: any) => {
            const slug = hvItem.slug ?? hvItem.label.toLowerCase().replace(/\s+/g, '_');
            const itemChecks = (hvacChecklist ?? []).filter((c: any) => c.itemKey === slug);
            return (
              <div key={hvItem.id} className="px-5 py-4 space-y-2">
                <p className="text-sm font-semibold text-charcoal">{hvItem.label}</p>
                <p className="text-xs text-muted-foreground font-mono">itemKey: <code className="bg-sandstone/40 px-1 rounded">{slug}</code></p>
                <div className="space-y-1">
                  {itemChecks.map((c: any) => (
                    <div key={c.id} className="flex items-center justify-between gap-3 bg-amber-50 rounded-lg px-3 py-1.5">
                      <span className="text-xs text-amber-900">{c.itemText}</span>
                      <Button size="sm" variant="outline" className="gap-1 text-red-600 border-red-200 hover:bg-red-50 h-6 text-xs px-2"
                        onClick={() => deleteHvacCheck.mutate({ id: c.id })}>
                        <Trash2 className="w-3 h-3" /> Remove
                      </Button>
                    </div>
                  ))}
                  {itemChecks.length === 0 && (
                    <p className="text-xs text-muted-foreground italic">No feasibility conditions — this option can always be selected.</p>
                  )}
                </div>
                <PerItemChecklistAdd
                  placeholder={`Add condition for "${hvItem.label}"...`}
                  onAdd={(text) => addHvacCheck.mutate({ itemText: text, itemKey: slug })}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* ── TUB CONFIGURATION ── */}
      <div className="bg-white rounded-xl border border-border/60 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border/40 bg-sandstone/20">
          <h4 className="text-sm font-semibold text-charcoal">Tub Configuration</h4>
          <p className="text-xs text-muted-foreground mt-0.5">Alcove, drop-in, and freestanding tub options with sizes and pricing.</p>
        </div>
        <div className="divide-y divide-border/30">
          {(tubConfigs ?? []).map((item: any) => (
            <TubConfigRow key={item.id} item={item} onSave={(id, cost) => updateTubConfig.mutate({ id, installCost: cost })} />
          ))}
        </div>
      </div>

      {/* ── SHOWER CONFIGURATION ── */}
      <div className="bg-white rounded-xl border border-border/60 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border/40 bg-sandstone/20">
          <h4 className="text-sm font-semibold text-charcoal">Shower Configuration</h4>
          <p className="text-xs text-muted-foreground mt-0.5">Curb type, niches, benches, shelves, and glass enclosure options with pricing.</p>
        </div>
        <div className="divide-y divide-border/30">
          {(showerConfigs ?? []).map((item: any) => (
            <ShowerConfigRow key={item.id} item={item} onSave={(id, cost) => updateShowerConfig.mutate({ id, cost })} />
          ))}
        </div>
      </div>

      {/* ── TILE SIZES ── */}
      <div className="bg-white rounded-xl border border-border/60 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border/40 bg-sandstone/20">
          <h4 className="text-sm font-semibold text-charcoal">Tile Sizes</h4>
          <p className="text-xs text-muted-foreground mt-0.5">Floor and wall cost per sqft for each tile size category.</p>
        </div>
        <div className="divide-y divide-border/30">
          {(tileSizes ?? []).map((item: any) => (
            <TileSizeRow key={item.id} item={item} onSave={(id, floor, wall) => updateTileSize.mutate({ id, floorCostPerSqft: floor, wallCostPerSqft: wall })} />
          ))}
        </div>
      </div>

      {/* ── TILE PATTERNS ── */}
      <div className="bg-white rounded-xl border border-border/60 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border/40 bg-sandstone/20">
          <h4 className="text-sm font-semibold text-charcoal">Tile Lay Patterns</h4>
          <p className="text-xs text-muted-foreground mt-0.5">Upcharge per sqft for each pattern. Standard patterns have $0 upcharge.</p>
        </div>
        <div className="divide-y divide-border/30">
          {(tilePatterns ?? []).map((item: any) => (
            <TilePatternRow key={item.id} item={item} onSave={(id, upcharge) => updateTilePattern.mutate({ id, upchargePerSqft: upcharge })} />
          ))}
        </div>
      </div>

      {/* ── VANITY PRICING MATRIX ── */}
      <div className="bg-white rounded-xl border border-border/60 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border/40 bg-sandstone/20">
          <h4 className="text-sm font-semibold text-charcoal">Vanity Pricing Matrix</h4>
          <p className="text-xs text-muted-foreground mt-0.5">Cost by width (inches) and material. The calculator uses this matrix to price vanities.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-sandstone/20 border-b border-border/40">
                <th className="px-4 py-2 text-left font-semibold text-charcoal">Width</th>
                <th className="px-4 py-2 text-left font-semibold text-charcoal">Material</th>
                <th className="px-4 py-2 text-right font-semibold text-charcoal">Cost ($)</th>
                <th className="px-4 py-2 text-center font-semibold text-charcoal">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {(vanityPricing ?? []).map((row: any) => (
                <VanityPricingRow key={row.id} row={row} onSave={(id, cost) => updateVanityPricingRow.mutate({ id, cost })} />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Painting Options */}
      <div className="rounded-xl border border-border/40 bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-border/30 bg-sandstone/10">
          <h4 className="text-sm font-semibold text-charcoal">Painting Options</h4>
          <p className="text-xs text-muted-foreground mt-0.5">Manage painting scope items shown in the calculator. Per-unit items show a quantity input; flat items show a checkbox.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-sandstone/20 border-b border-border/40">
                <th className="px-4 py-2 text-left font-semibold text-charcoal">Label</th>
                <th className="px-4 py-2 text-left font-semibold text-charcoal">Pricing Type</th>
                <th className="px-4 py-2 text-right font-semibold text-charcoal">Cost/Unit ($)</th>
                <th className="px-4 py-2 text-right font-semibold text-charcoal">Flat Cost ($)</th>
                <th className="px-4 py-2 text-center font-semibold text-charcoal">Active</th>
                <th className="px-4 py-2 text-center font-semibold text-charcoal">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {(paintingOptions ?? []).map((opt: any) => (
                <PaintingOptionRow key={opt.id} opt={opt} onSave={(id, data) => updatePaintingOption.mutate({ id, ...data })} />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Accessories */}
      <div className="rounded-xl border border-border/40 bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-border/30 bg-sandstone/10">
          <h4 className="text-sm font-semibold text-charcoal">Accessories</h4>
          <p className="text-xs text-muted-foreground mt-0.5">Manage accessories shown in the bathroom Price Consult calculator (medicine cabinet, towel bars, shelves, doors, etc.).</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-sandstone/20 border-b border-border/40">
                <th className="px-4 py-2 text-left font-semibold text-charcoal">Label</th>
                <th className="px-4 py-2 text-left font-semibold text-charcoal">Qty Type</th>
                <th className="px-4 py-2 text-right font-semibold text-charcoal">Cost ($)</th>
                <th className="px-4 py-2 text-center font-semibold text-charcoal">Active</th>
                <th className="px-4 py-2 text-center font-semibold text-charcoal">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {(accessories ?? []).map((acc: any) => (
                <AccessoryRow key={acc.id} acc={acc} onSave={(id, data) => updateAccessory.mutate({ id, ...data })} />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Floating Vanity Config */}
      <div className="rounded-xl border border-border/40 bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-border/30 bg-sandstone/10">
          <h4 className="text-sm font-semibold text-charcoal">Floating Countertop Vanity Pricing</h4>
          <p className="text-xs text-muted-foreground mt-0.5">Set the base floating mount cost and per-linear-foot cost for the 8" turn-down panel.</p>
        </div>
        <div className="px-5 py-4">
          {floatingVanityCfg && !fvEditing && (
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-1">
                <p className="text-sm text-charcoal"><span className="font-semibold">Floating Mount Cost:</span> ${Number(floatingVanityCfg.floatingMountCost).toFixed(2)}</p>
                <p className="text-sm text-charcoal"><span className="font-semibold">Turn-Down Cost / LF:</span> ${Number(floatingVanityCfg.turnDownCostPerLinearFt).toFixed(2)}</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => { setFvMountCost(String(Number(floatingVanityCfg.floatingMountCost).toFixed(2))); setFvTurnDownRate(String(Number(floatingVanityCfg.turnDownCostPerLinearFt).toFixed(2))); setFvEditing(true); }}>Edit</Button>
            </div>
          )}
          {fvEditing && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Floating Mount Cost ($)</label>
                  <input type="number" step="0.01" min="0" className="w-full mt-1 px-2 py-1.5 text-sm border border-border rounded-md" value={fvMountCost} onChange={e => setFvMountCost(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Turn-Down Cost / Linear Ft ($)</label>
                  <input type="number" step="0.01" min="0" className="w-full mt-1 px-2 py-1.5 text-sm border border-border rounded-md" value={fvTurnDownRate} onChange={e => setFvTurnDownRate(e.target.value)} />
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => { updateFloatingVanity.mutate({ floatingMountCost: Number(fvMountCost), turnDownCostPerLinearFt: Number(fvTurnDownRate) }); setFvEditing(false); }} className="bg-canyon hover:bg-canyon/90 text-white">Save</Button>
                <Button size="sm" variant="outline" onClick={() => setFvEditing(false)}>Cancel</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function BathroomSimpleTable({
  title,
  description,
  items,
  onSave,
  costLabel = "Cost ($)",
}: {
  title: string;
  description: string;
  items: { id: number; name: string; cost: number; sellPrice: number; description?: string | null; extra?: string }[];
  onSave: (id: number, cost: number, sellPrice: number, description?: string) => void;
  costLabel?: string;
}) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editCost, setEditCost] = useState("");
  const [editSell, setEditSell] = useState("");
  const [editDesc, setEditDesc] = useState("");

  const startEdit = (item: { id: number; cost: number; sellPrice: number; description?: string | null }) => {
    setEditingId(item.id);
    setEditCost(String(Number(item.cost).toFixed(2)));
    setEditSell(String(Number(item.sellPrice).toFixed(2)));
    setEditDesc(item.description ?? "");
  };

  return (
    <div className="bg-white rounded-xl border border-border/60 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-border/40 bg-sandstone/20">
        <h4 className="text-sm font-semibold text-charcoal">{title}</h4>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <div className="divide-y divide-border/30">
        {items.map((item) => (
          <div key={item.id} className="px-5 py-3">
            {editingId === item.id ? (
              <div className="space-y-3">
                <p className="text-sm font-medium text-charcoal">{item.name}</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground">{costLabel}</label>
                    <input
                      type="number" step="0.01" min="0"
                      className="w-full mt-1 px-2 py-1.5 text-sm border border-border rounded-md"
                      value={editCost}
                      onChange={e => setEditCost(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Sell Price ($)</label>
                    <input
                      type="number" step="0.01" min="0"
                      className="w-full mt-1 px-2 py-1.5 text-sm border border-border rounded-md"
                      value={editSell}
                      onChange={e => setEditSell(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Tooltip Description (shown to customers on hover)</label>
                  <textarea
                    rows={2}
                    className="w-full mt-1 px-2 py-1.5 text-sm border border-border rounded-md resize-none"
                    placeholder="Describe what this option includes, e.g. 'Includes demo, rough-in, and finish plumbing for one fixture'"
                    value={editDesc}
                    onChange={e => setEditDesc(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => { onSave(item.id, Number(editCost), Number(editSell), editDesc); setEditingId(null); }} className="bg-canyon hover:bg-canyon/90 text-white gap-1">
                    <Check className="w-3 h-3" /> Save
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-4">
                <div>
                  <span className="text-sm text-charcoal font-medium">{item.name}</span>
                  {item.description && <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>}
                  {item.extra && <p className="text-xs text-muted-foreground font-mono mt-0.5">{item.extra}</p>}
                </div>
                <div className="flex items-center gap-6 shrink-0">
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Cost</p>
                    <p className="text-sm font-mono text-charcoal">${Number(item.cost).toFixed(2)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Sell</p>
                    <p className="text-sm font-mono text-canyon font-semibold">${Number(item.sellPrice).toFixed(2)}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => startEdit(item)} className="gap-1">
                    <Pencil className="w-3 h-3" /> Edit
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Tub Config Row ────────────────────────────────────────────────────────
function TubConfigRow({ item, onSave }: { item: any; onSave: (id: number, cost: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [editCost, setEditCost] = useState("");
  const tubTypeLabel: Record<string, string> = { alcove: "Alcove", drop_in: "Drop-In", freestanding: "Freestanding" };
  return (
    <div className="px-5 py-3">
      {editing ? (
        <div className="space-y-2">
          <p className="text-sm font-medium text-charcoal">{item.label} ({tubTypeLabel[item.tubType] ?? item.tubType})</p>
          {item.sizeDescription && <p className="text-xs text-muted-foreground">{item.sizeDescription}</p>}
          <div className="flex gap-2 items-center">
            <input type="number" step="0.01" min="0" className="w-32 px-2 py-1.5 text-sm border border-border rounded-md" value={editCost} onChange={e => setEditCost(e.target.value)} />
            <Button size="sm" className="bg-canyon hover:bg-canyon/90 text-white gap-1" onClick={() => { onSave(item.id, Number(editCost)); setEditing(false); }}><Check className="w-3 h-3" /> Save</Button>
            <Button size="sm" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-4">
          <div>
            <span className="text-sm text-charcoal font-medium">{item.label}</span>
            <p className="text-xs text-muted-foreground">{tubTypeLabel[item.tubType] ?? item.tubType}{item.sizeDescription ? ` — ${item.sizeDescription}` : ""}</p>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <div className="text-right"><p className="text-xs text-muted-foreground">Cost</p><p className="text-sm font-mono text-charcoal">${Number(item.cost).toFixed(2)}</p></div>
            <Button size="sm" variant="outline" className="gap-1" onClick={() => { setEditCost(String(Number(item.cost).toFixed(2))); setEditing(true); }}><Pencil className="w-3 h-3" /> Edit</Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Shower Config Row ───────────────────────────────────────────────────────
function ShowerConfigRow({ item, onSave }: { item: any; onSave: (id: number, cost: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [editCost, setEditCost] = useState("");
  const categoryLabel: Record<string, string> = { curb: "Curb Type", niche: "Niche", bench: "Bench", shelf: "Shelf", glass: "Glass Enclosure" };
  return (
    <div className="px-5 py-3">
      {editing ? (
        <div className="space-y-2">
          <p className="text-sm font-medium text-charcoal">{item.label} ({categoryLabel[item.category] ?? item.category})</p>
          {item.pricingType === "per_lf" && <p className="text-xs text-amber-600">Priced per linear foot</p>}
          <div className="flex gap-2 items-center">
            <input type="number" step="0.01" min="0" className="w-32 px-2 py-1.5 text-sm border border-border rounded-md" value={editCost} onChange={e => setEditCost(e.target.value)} />
            <Button size="sm" className="bg-canyon hover:bg-canyon/90 text-white gap-1" onClick={() => { onSave(item.id, Number(editCost)); setEditing(false); }}><Check className="w-3 h-3" /> Save</Button>
            <Button size="sm" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-4">
          <div>
            <span className="text-sm text-charcoal font-medium">{item.label}</span>
            <p className="text-xs text-muted-foreground">{categoryLabel[item.category] ?? item.category}{item.pricingType === "per_lf" ? " — per linear foot" : ""}</p>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <div className="text-right"><p className="text-xs text-muted-foreground">Cost</p><p className="text-sm font-mono text-charcoal">${Number(item.cost).toFixed(2)}{item.pricingType === "per_lf" ? "/LF" : ""}</p></div>
            <Button size="sm" variant="outline" className="gap-1" onClick={() => { setEditCost(String(Number(item.cost).toFixed(2))); setEditing(true); }}><Pencil className="w-3 h-3" /> Edit</Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Fixture Action Row ─────────────────────────────────────────────────────
function FixtureActionRow({ action, onSave }: { action: any; onSave: (id: number, cost: number, costPerFixture: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [editCost, setEditCost] = useState("");
  const [editCostPer, setEditCostPer] = useState("");
  const actionTypeLabel: Record<string, string> = {
    leave_as_is: "Leave As-Is",
    relocate: "Relocate",
    update_in_place: "Update In Place",
    add_new: "Add New Fixture",
  };
  return (
    <div className="bg-stone-50 rounded-lg px-4 py-2.5">
      {editing ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-charcoal">{actionTypeLabel[action.actionType] ?? action.actionType}</p>
          <div className="flex gap-3 flex-wrap">
            <div>
              <label className="text-xs text-muted-foreground">Flat Cost ($)</label>
              <input type="number" step="0.01" min="0" className="block w-28 px-2 py-1 text-sm border border-border rounded-md" value={editCost} onChange={e => setEditCost(e.target.value)} />
            </div>
            {action.actionType === 'add_new' && (
              <div>
                <label className="text-xs text-muted-foreground">Cost Per Fixture ($)</label>
                <input type="number" step="0.01" min="0" className="block w-28 px-2 py-1 text-sm border border-border rounded-md" value={editCostPer} onChange={e => setEditCostPer(e.target.value)} />
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button size="sm" className="bg-canyon hover:bg-canyon/90 text-white gap-1" onClick={() => { onSave(action.id, Number(editCost), Number(editCostPer)); setEditing(false); }}><Check className="w-3 h-3" /> Save</Button>
            <Button size="sm" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold text-charcoal">{actionTypeLabel[action.actionType] ?? action.actionType}</span>
            {action.costNote && <p className="text-xs text-muted-foreground">{action.costNote}</p>}
          </div>
          <div className="flex items-center gap-4 shrink-0">
            {action.actionType === 'leave_as_is' ? (
              <span className="text-xs text-muted-foreground">No cost</span>
            ) : (
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Cost</p>
                <p className="text-xs font-mono text-charcoal">${Number(action.cost).toFixed(2)}{action.actionType === 'add_new' ? ` + $${Number(action.costPerFixture).toFixed(2)}/ea` : ""}</p>
              </div>
            )}
            {action.actionType !== 'leave_as_is' && (
              <Button size="sm" variant="outline" className="gap-1 h-7 text-xs" onClick={() => { setEditCost(String(Number(action.cost).toFixed(2))); setEditCostPer(String(Number(action.costPerFixture).toFixed(2))); setEditing(true); }}><Pencil className="w-3 h-3" /> Edit</Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tile Size Row ───────────────────────────────────────────────────────────
function TileSizeRow({ item, onSave }: { item: any; onSave: (id: number, floor: number, wall: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [editFloor, setEditFloor] = useState("");
  const [editWall, setEditWall] = useState("");
  return (
    <div className="px-5 py-3">
      {editing ? (
        <div className="space-y-2">
          <p className="text-sm font-medium text-charcoal">{item.label}</p>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-muted-foreground">Floor $/sqft</label><input type="number" step="0.01" min="0" className="w-full mt-1 px-2 py-1.5 text-sm border border-border rounded-md" value={editFloor} onChange={e => setEditFloor(e.target.value)} /></div>
            <div><label className="text-xs text-muted-foreground">Wall $/sqft</label><input type="number" step="0.01" min="0" className="w-full mt-1 px-2 py-1.5 text-sm border border-border rounded-md" value={editWall} onChange={e => setEditWall(e.target.value)} /></div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" className="bg-canyon hover:bg-canyon/90 text-white gap-1" onClick={() => { onSave(item.id, Number(editFloor), Number(editWall)); setEditing(false); }}><Check className="w-3 h-3" /> Save</Button>
            <Button size="sm" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm text-charcoal font-medium">{item.label}</span>
          <div className="flex items-center gap-4 shrink-0">
            <div className="text-right"><p className="text-xs text-muted-foreground">Floor</p><p className="text-sm font-mono text-charcoal">${Number(item.floorCostPerSqft).toFixed(2)}/sqft</p></div>
            <div className="text-right"><p className="text-xs text-muted-foreground">Wall</p><p className="text-sm font-mono text-charcoal">${Number(item.wallCostPerSqft).toFixed(2)}/sqft</p></div>
            <Button size="sm" variant="outline" className="gap-1" onClick={() => { setEditFloor(String(Number(item.floorCostPerSqft).toFixed(2))); setEditWall(String(Number(item.wallCostPerSqft).toFixed(2))); setEditing(true); }}><Pencil className="w-3 h-3" /> Edit</Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tile Pattern Row ────────────────────────────────────────────────────────
function TilePatternRow({ item, onSave }: { item: any; onSave: (id: number, upcharge: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [editUpcharge, setEditUpcharge] = useState("");
  return (
    <div className="px-5 py-3">
      {editing ? (
        <div className="space-y-2">
          <p className="text-sm font-medium text-charcoal">{item.label}</p>
          <div className="flex gap-2 items-center">
            <input type="number" step="0.01" min="0" className="w-32 px-2 py-1.5 text-sm border border-border rounded-md" value={editUpcharge} onChange={e => setEditUpcharge(e.target.value)} />
            <span className="text-xs text-muted-foreground">$/sqft upcharge</span>
            <Button size="sm" className="bg-canyon hover:bg-canyon/90 text-white gap-1" onClick={() => { onSave(item.id, Number(editUpcharge)); setEditing(false); }}><Check className="w-3 h-3" /> Save</Button>
            <Button size="sm" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm text-charcoal font-medium">{item.label}</span>
          <div className="flex items-center gap-4 shrink-0">
            <div className="text-right"><p className="text-xs text-muted-foreground">Upcharge</p><p className="text-sm font-mono text-charcoal">{Number(item.upchargePerSqft) > 0 ? `+$${Number(item.upchargePerSqft).toFixed(2)}/sqft` : "Standard"}</p></div>
            <Button size="sm" variant="outline" className="gap-1" onClick={() => { setEditUpcharge(String(Number(item.upchargePerSqft).toFixed(2))); setEditing(true); }}><Pencil className="w-3 h-3" /> Edit</Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Vanity Pricing Row ──────────────────────────────────────────────────────
function VanityPricingRow({ row, onSave }: { row: any; onSave: (id: number, cost: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [editCost, setEditCost] = useState("");
  const matLabel: Record<string, string> = { painted: "Painted", alder_maple: "Alder/Maple", white_oak: "White Oak", walnut: "Walnut" };
  return (
    <tr className="hover:bg-sandstone/10">
      <td className="px-4 py-2 text-charcoal font-medium">{row.widthInches}"</td>
      <td className="px-4 py-2 text-charcoal">{matLabel[row.material] ?? row.material}</td>
      <td className="px-4 py-2 text-right">
        {editing ? (
          <input type="number" step="0.01" min="0" className="w-28 px-2 py-1 text-sm border border-border rounded-md text-right" value={editCost} onChange={e => setEditCost(e.target.value)} />
        ) : (
          <span className="font-mono text-charcoal">${Number(row.cost).toFixed(2)}</span>
        )}
      </td>
      <td className="px-4 py-2 text-center">
        {editing ? (
          <div className="flex gap-1 justify-center">
            <Button size="sm" className="bg-canyon hover:bg-canyon/90 text-white gap-1 h-7 px-2" onClick={() => { onSave(row.id, Number(editCost)); setEditing(false); }}><Check className="w-3 h-3" /></Button>
            <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => setEditing(false)}>✕</Button>
          </div>
        ) : (
          <Button size="sm" variant="outline" className="gap-1 h-7 px-2" onClick={() => { setEditCost(String(Number(row.cost).toFixed(2))); setEditing(true); }}><Pencil className="w-3 h-3" /></Button>
        )}
      </td>
    </tr>
  );
}

// ─── PerItemChecklistAdd helper ─────────────────────────────────────────────
function PerItemChecklistAdd({ placeholder, onAdd }: { placeholder: string; onAdd: (text: string) => void }) {
  const [text, setText] = useState("");
  return (
    <div className="flex gap-2 mt-1">
      <input
        type="text"
        placeholder={placeholder}
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter" && text.trim()) { onAdd(text.trim()); setText(""); } }}
        className="flex-1 px-3 py-1.5 text-xs border border-border rounded-md"
      />
      <Button size="sm" className="bg-canyon hover:bg-canyon/90 text-white gap-1 h-7 px-2 text-xs"
        onClick={() => { if (text.trim()) { onAdd(text.trim()); setText(""); } }}>
        <Plus className="w-3 h-3" /> Add
      </Button>
    </div>
  );
}

// ─── Engineer's Letter Config Panel ─────────────────────────────────────────
function DPEngineerLetterConfigPanel({ utils }: { utils: ReturnType<typeof trpc.useUtils> }) {
  const { data: config, isLoading } = trpc.designPackage.getEngineerLetterConfig.useQuery();
  const updateMutation = trpc.designPackage.updateEngineerLetterConfig.useMutation({
    onSuccess: () => {
      utils.designPackage.getEngineerLetterConfig.invalidate();
      toast.success("Engineer's letter config updated");
      setEditing(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ price: "", internalCost: "", description: "", isActive: true });

  const startEdit = () => {
    if (!config) return;
    setForm({
      price: String(Number(config.price).toFixed(2)),
      internalCost: String(Number(config.internalCost).toFixed(2)),
      description: config.description,
      isActive: config.isActive,
    });
    setEditing(true);
  };

  const handleSave = () => {
    if (!config) return;
    updateMutation.mutate({
      id: config.id,
      price: parseFloat(form.price),
      internalCost: parseFloat(form.internalCost),
      description: form.description,
      isActive: form.isActive,
    });
  };

  if (isLoading) return <div className="py-8 text-center text-muted-foreground text-sm">Loading…</div>;
  if (!config) return <div className="py-8 text-center text-muted-foreground text-sm">No config found.</div>;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-amber-600" />
            <div>
              <h3 className="text-base font-display text-charcoal">Engineer's Letter</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Configures the optional engineer's letter add-on in Basement and Addition modes.</p>
            </div>
          </div>
          {!editing && (
            <Button size="sm" variant="outline" onClick={startEdit} className="gap-1">
              <Pencil className="w-3 h-3" /> Edit
            </Button>
          )}
        </div>

        {!editing ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-sandstone/30 rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-1">Customer Price</p>
              <p className="text-lg font-semibold font-mono text-canyon">${Number(config.price).toFixed(2)}</p>
            </div>
            <div className="bg-sandstone/30 rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-1">Internal Cost</p>
              <p className="text-lg font-semibold font-mono text-charcoal">${Number(config.internalCost).toFixed(2)}</p>
            </div>
            <div className="bg-sandstone/30 rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-1">Margin</p>
              <p className="text-lg font-semibold font-mono text-charcoal">
                {Number(config.price) > 0 ? Math.round((1 - Number(config.internalCost) / Number(config.price)) * 100) : 0}%
              </p>
            </div>
            <div className="bg-sandstone/30 rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-1">Status</p>
              <p className={`text-sm font-semibold ${config.isActive ? "text-green-600" : "text-red-500"}`}>
                {config.isActive ? "Active" : "Inactive"}
              </p>
            </div>
            <div className="col-span-2 sm:col-span-4 bg-sandstone/30 rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-1">Description (shown in calculator)</p>
              <p className="text-sm text-charcoal">{config.description}</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Customer Price ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.price}
                  onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm font-mono"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Internal Cost ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.internalCost}
                  onChange={(e) => setForm((f) => ({ ...f, internalCost: e.target.value }))}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm font-mono"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Description</label>
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm resize-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="eng-active"
                checked={form.isActive}
                onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                className="rounded"
              />
              <label htmlFor="eng-active" className="text-sm text-charcoal">Active (visible in calculator)</label>
            </div>
            <div className="flex gap-2 pt-2">
              <Button size="sm" onClick={handleSave} disabled={updateMutation.isPending} className="gap-1">
                {updateMutation.isPending ? "Saving…" : "Save Changes"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Painting Option Row ──────────────────────────────────────────────────────
function PaintingOptionRow({ opt, onSave }: {
  opt: any;
  onSave: (id: number, data: { costPerUnit?: number; cost?: number; isActive?: boolean; description?: string }) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [costPerUnit, setCostPerUnit] = useState(String(opt.costPerUnit ?? opt.cost_per_unit ?? "0"));
  const [cost, setCost] = useState(String(opt.cost ?? "0"));
  const [isActive, setIsActive] = useState<boolean>(Boolean(opt.isActive ?? opt.is_active));
  const [editDesc, setEditDesc] = useState(String(opt.description ?? ""));

  return (
    <>
      <tr className="hover:bg-sandstone/5 transition-colors">
        <td className="px-4 py-2.5 text-charcoal font-medium">{opt.label}</td>
        <td className="px-4 py-2.5 text-stone-dark capitalize">{(opt.pricingType ?? opt.pricing_type ?? "flat").replace(/_/g, " ")}</td>
        {editing ? (
          <>
            <td className="px-4 py-2.5">
              <input type="number" value={costPerUnit} onChange={(e) => setCostPerUnit(e.target.value)}
                className="w-20 text-right border border-border/40 rounded px-1.5 py-0.5 text-xs" />
            </td>
            <td className="px-4 py-2.5">
              <input type="number" value={cost} onChange={(e) => setCost(e.target.value)}
                className="w-20 text-right border border-border/40 rounded px-1.5 py-0.5 text-xs" />
            </td>
            <td className="px-4 py-2.5 text-center">
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="w-4 h-4" />
            </td>
            <td className="px-4 py-2.5 text-center">
              <div className="flex gap-1 justify-center">
                <button onClick={() => { onSave(opt.id, { costPerUnit: parseFloat(costPerUnit) || 0, cost: parseFloat(cost) || 0, isActive, description: editDesc }); setEditing(false); }}
                  className="px-2 py-1 bg-canyon text-white rounded text-xs hover:bg-canyon/80">Save</button>
                <button onClick={() => setEditing(false)} className="px-2 py-1 border border-border/40 rounded text-xs hover:bg-sandstone/20">Cancel</button>
              </div>
            </td>
          </>
        ) : (
          <>
            <td className="px-4 py-2.5 text-right text-stone-dark">${Number(opt.costPerUnit ?? opt.cost_per_unit ?? 0).toFixed(2)}</td>
            <td className="px-4 py-2.5 text-right text-stone-dark">${Number(opt.cost ?? 0).toFixed(2)}</td>
            <td className="px-4 py-2.5 text-center">
              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                {isActive ? "Active" : "Off"}
              </span>
            </td>
            <td className="px-4 py-2.5 text-center">
              <button onClick={() => setEditing(true)} className="px-2 py-1 border border-border/40 rounded text-xs hover:bg-sandstone/20">Edit</button>
            </td>
          </>
        )}
      </tr>
      {editing && (
        <tr className="bg-sandstone/10">
          <td colSpan={6} className="px-4 pb-3 pt-0">
            <label className="text-xs text-muted-foreground block mb-1">Tooltip Description (shown to customers on hover)</label>
            <textarea
              rows={2}
              className="w-full px-2 py-1.5 text-sm border border-border rounded-md resize-none"
              placeholder="Describe what this painting option includes..."
              value={editDesc}
              onChange={e => setEditDesc(e.target.value)}
            />
          </td>
        </tr>
      )}
    </>
  );
}

function AccessoryRow({ acc, onSave }: {
  acc: any;
  onSave: (id: number, data: { cost?: number; isActive?: boolean; description?: string }) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [cost, setCost] = useState(String(acc.cost ?? "0"));
  const [isActive, setIsActive] = useState<boolean>(Boolean(acc.isActive ?? acc.is_active));
  const [editDesc, setEditDesc] = useState(String(acc.description ?? ""));

  return (
    <>
      <tr className="hover:bg-sandstone/5 transition-colors">
        <td className="px-4 py-2.5 text-charcoal font-medium">{acc.label}</td>
        <td className="px-4 py-2.5 text-stone-dark capitalize">{(acc.quantityType ?? acc.quantity_type ?? "toggle").replace(/_/g, " ")}</td>
        {editing ? (
          <>
            <td className="px-4 py-2.5">
              <input type="number" value={cost} onChange={(e) => setCost(e.target.value)}
                className="w-24 text-right border border-border/40 rounded px-1.5 py-0.5 text-xs" />
            </td>
            <td className="px-4 py-2.5 text-center">
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="w-4 h-4" />
            </td>
            <td className="px-4 py-2.5 text-center">
              <div className="flex gap-1 justify-center">
                <button onClick={() => { onSave(acc.id, { cost: parseFloat(cost) || 0, isActive, description: editDesc }); setEditing(false); }}
                  className="px-2 py-1 bg-canyon text-white rounded text-xs hover:bg-canyon/80">Save</button>
                <button onClick={() => setEditing(false)} className="px-2 py-1 border border-border/40 rounded text-xs hover:bg-sandstone/20">Cancel</button>
              </div>
            </td>
          </>
        ) : (
          <>
            <td className="px-4 py-2.5 text-right text-stone-dark">${Number(acc.cost ?? 0).toFixed(2)}</td>
            <td className="px-4 py-2.5 text-center">
              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                {isActive ? "Active" : "Off"}
              </span>
            </td>
            <td className="px-4 py-2.5 text-center">
              <button onClick={() => setEditing(true)} className="px-2 py-1 border border-border/40 rounded text-xs hover:bg-sandstone/20">Edit</button>
            </td>
          </>
        )}
      </tr>
      {editing && (
        <tr className="bg-sandstone/10">
          <td colSpan={5} className="px-4 pb-3 pt-0">
            <label className="text-xs text-muted-foreground block mb-1">Tooltip Description (shown to customers on hover)</label>
            <textarea
              rows={2}
              className="w-full px-2 py-1.5 text-sm border border-border rounded-md resize-none"
              placeholder="Describe what this accessory includes..."
              value={editDesc}
              onChange={e => setEditDesc(e.target.value)}
            />
          </td>
        </tr>
      )}
    </>
  );
}


// ─── Shared Price Consult Option Row ─────────────────────────────────────────
function PriceConsultOptionRow({ item, onSave }: {
  item: any;
  onSave: (id: number, data: { cost?: number; costGood?: number; costBetter?: number; costBest?: number; hasTiers?: boolean; isActive?: boolean; description?: string }) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [cost, setCost] = useState(String(item.cost ?? "0"));
  const [costGood, setCostGood] = useState(String(item.costGood ?? item.cost_good ?? "0"));
  const [costBetter, setCostBetter] = useState(String(item.costBetter ?? item.cost_better ?? "0"));
  const [costBest, setCostBest] = useState(String(item.costBest ?? item.cost_best ?? "0"));
  const [hasTiers, setHasTiers] = useState<boolean>(Number(item.hasTiers ?? item.has_tiers ?? 0) === 1);
  const [isActive, setIsActive] = useState<boolean>(Boolean(item.isActive ?? item.is_active ?? 1));
  const [editDesc, setEditDesc] = useState(String(item.description ?? ""));

  const pricingLabel = (item.pricingType ?? item.pricing_type ?? "flat")
    .replace("per_sqft", "/ sqft").replace("per_unit", "/ unit").replace("per_lf", "/ LF").replace("flat", "flat");

  return (
    <>
      <tr className="hover:bg-sandstone/5 transition-colors">
        <td className="px-4 py-2.5 text-charcoal font-medium">
          {item.label}
          {hasTiers && <span className="ml-1.5 text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-semibold">Tiered</span>}
        </td>
        <td className="px-4 py-2.5 text-stone-dark text-xs capitalize">{pricingLabel}</td>
        {editing ? (
          <>
            <td className="px-4 py-2.5">
              {hasTiers ? (
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-green-700 font-semibold w-12">Good:</span>
                    <input type="number" value={costGood} onChange={(e) => setCostGood(e.target.value)}
                      className="w-24 text-right border border-green-300 rounded px-1.5 py-0.5 text-xs" step="0.01" />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-blue-700 font-semibold w-12">Better:</span>
                    <input type="number" value={costBetter} onChange={(e) => setCostBetter(e.target.value)}
                      className="w-24 text-right border border-blue-300 rounded px-1.5 py-0.5 text-xs" step="0.01" />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-purple-700 font-semibold w-12">Best:</span>
                    <input type="number" value={costBest} onChange={(e) => setCostBest(e.target.value)}
                      className="w-24 text-right border border-purple-300 rounded px-1.5 py-0.5 text-xs" step="0.01" />
                  </div>
                </div>
              ) : (
                <input type="number" value={cost} onChange={(e) => setCost(e.target.value)}
                  className="w-28 text-right border border-border/40 rounded px-1.5 py-0.5 text-xs" step="0.01" />
              )}
            </td>
            <td className="px-4 py-2.5 text-center">
              <div className="flex flex-col gap-1 items-center">
                <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="w-4 h-4" />
                <label className="text-[10px] text-muted-foreground">Active</label>
                <div className="flex items-center gap-1 mt-1">
                  <input type="checkbox" checked={hasTiers} onChange={(e) => setHasTiers(e.target.checked)} className="w-3 h-3" />
                  <label className="text-[10px] text-muted-foreground">Tiers</label>
                </div>
              </div>
            </td>
            <td className="px-4 py-2.5 text-center">
              <div className="flex gap-1 justify-center">
                <button onClick={() => {
                  onSave(item.id, {
                    cost: parseFloat(cost) || 0,
                    costGood: parseFloat(costGood) || 0,
                    costBetter: parseFloat(costBetter) || 0,
                    costBest: parseFloat(costBest) || 0,
                    hasTiers,
                    isActive,
                    description: editDesc,
                  });
                  setEditing(false);
                }}
                  className="px-2 py-1 bg-canyon text-white rounded text-xs hover:bg-canyon/80">Save</button>
                <button onClick={() => setEditing(false)} className="px-2 py-1 border border-border/40 rounded text-xs hover:bg-sandstone/20">Cancel</button>
              </div>
            </td>
          </>
        ) : (
          <>
            <td className="px-4 py-2.5 text-right text-stone-dark">
              {hasTiers ? (
                <div className="text-xs space-y-0.5">
                  <div><span className="text-green-700 font-semibold">G:</span> ${Number(item.costGood ?? item.cost_good ?? 0).toFixed(2)}</div>
                  <div><span className="text-blue-700 font-semibold">B:</span> ${Number(item.costBetter ?? item.cost_better ?? 0).toFixed(2)}</div>
                  <div><span className="text-purple-700 font-semibold">B+:</span> ${Number(item.costBest ?? item.cost_best ?? 0).toFixed(2)}</div>
                </div>
              ) : (
                <>${Number(item.cost ?? 0).toFixed(2)}</>
              )}
            </td>
            <td className="px-4 py-2.5 text-center">
              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                {isActive ? "Active" : "Off"}
              </span>
            </td>
            <td className="px-4 py-2.5 text-center">
              <button onClick={() => setEditing(true)} className="px-2 py-1 border border-border/40 rounded text-xs hover:bg-sandstone/20">Edit</button>
            </td>
          </>
        )}
      </tr>
      {editing && (
        <tr className="bg-sandstone/10">
          <td colSpan={5} className="px-4 pb-3 pt-0">
            <label className="text-xs text-muted-foreground block mb-1">Tooltip Description (shown to customers on hover)</label>
            <textarea
              rows={2}
              className="w-full px-2 py-1.5 text-sm border border-border rounded-md resize-none"
              placeholder="Describe what this option includes..."
              value={editDesc}
              onChange={e => setEditDesc(e.target.value)}
            />
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Kitchen Price Consult Config Panel ──────────────────────────────────────
function DPKitchenConfigPanel({ utils }: { utils: ReturnType<typeof trpc.useUtils> }) {
  const { data: options, isLoading } = trpc.designPackage.getKitchenOptions.useQuery();
  const { data: config } = trpc.designPackage.getKitchenConfig.useQuery();
  const updateMutation = trpc.designPackage.updateKitchenOption.useMutation({
    onSuccess: () => { utils.designPackage.getKitchenOptions.invalidate(); toast.success("Saved"); },
    onError: () => toast.error("Save failed"),
  });
  const updateConfigMutation = trpc.designPackage.updateKitchenConfig.useMutation({
    onSuccess: () => { utils.designPackage.getKitchenConfig.invalidate(); toast.success("Config saved"); },
    onError: () => toast.error("Config save failed"),
  });
  const [markupPct, setMarkupPct] = React.useState("");
  const [repCommission, setRepCommission] = React.useState("");
  React.useEffect(() => {
    if (config) {
      setMarkupPct(String(Math.round(Number(config.markupPct) * 100)));
      setRepCommission(String(Math.round(Number(config.repCommission) * 100)));
    }
  }, [config]);

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-canyon" /></div>;
  if (!options?.length) return <div className="text-center py-12 text-stone-dark">No kitchen options found.</div>;

  // Group by category
  const grouped = options.reduce<Record<string, typeof options>>((acc, item) => {
    const cat = item.category ?? "General";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-base font-display text-charcoal">Kitchen Remodel Pricing</h3>
        <p className="text-xs text-stone-dark mt-1">Set costs for each kitchen price consult option. Pricing type shown next to each item.</p>
      </div>
      {/* Section Manager */}
      <DPSectionManagerPanel consultType="kitchen" utils={utils} />
      {/* Config: Markup & Commission */}
      <div className="rounded-xl border border-border/30 p-4 bg-sandstone/10 space-y-3">
        <h4 className="text-sm font-semibold text-charcoal">Markup &amp; Commission</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-stone-dark font-medium">Markup % (GP)</label>
            <div className="flex items-center gap-2 mt-1">
              <input type="number" min="0" max="100" value={markupPct} onChange={e => setMarkupPct(e.target.value)}
                className="w-20 px-2 py-1 rounded border border-border/60 text-sm text-right" />
              <span className="text-xs text-stone-dark">%</span>
            </div>
          </div>
          <div>
            <label className="text-xs text-stone-dark font-medium">Rep Commission %</label>
            <div className="flex items-center gap-2 mt-1">
              <input type="number" min="0" max="100" value={repCommission} onChange={e => setRepCommission(e.target.value)}
                className="w-20 px-2 py-1 rounded border border-border/60 text-sm text-right" />
              <span className="text-xs text-stone-dark">%</span>
            </div>
          </div>
        </div>
        <button onClick={() => updateConfigMutation.mutate({ markupPct: Number(markupPct) / 100, repCommission: Number(repCommission) / 100 })}
          className="px-4 py-1.5 rounded bg-canyon text-white text-xs font-semibold hover:bg-canyon/90 transition-colors">
          Save Config
        </button>
      </div>
      {Object.entries(grouped).map(([category, items]) => (
        <div key={category} className="rounded-xl border border-border/30 overflow-hidden">
          <div className="bg-sandstone/20 px-4 py-2.5 border-b border-border/30">
            <h4 className="text-sm font-semibold text-charcoal capitalize">{category.replace(/_/g, " ")}</h4>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/20 bg-sandstone/10">
                <th className="px-4 py-2 text-left text-xs font-semibold text-stone-dark uppercase tracking-wide">Item</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-stone-dark uppercase tracking-wide">Type</th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-stone-dark uppercase tracking-wide">Cost ($)</th>
                <th className="px-4 py-2 text-center text-xs font-semibold text-stone-dark uppercase tracking-wide">Active</th>
                <th className="px-4 py-2 text-center text-xs font-semibold text-stone-dark uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/10">
              {items.map((item) => (
                <PriceConsultOptionRow
                  key={item.id}
                  item={item}
                  onSave={(id, data) => updateMutation.mutate({ id, ...data })}
                />
              ))}
            </tbody>
          </table>
        </div>
      ))}

      {/* Cabinet Pricing Config */}
      <DPCabinetConfigPanel utils={utils} />
    </div>
  );
}

// ─── Cabinet Pricing Config Panel ───────────────────────────────────────────────
function DPCabinetConfigPanel({ utils }: { utils: ReturnType<typeof trpc.useUtils> }) {
  const { data: config } = trpc.designPackage.getCabinetConfig.useQuery();
  const updateMutation = trpc.designPackage.updateCabinetConfig.useMutation({
    onSuccess: () => { utils.designPackage.getCabinetConfig.invalidate(); toast.success("Cabinet config saved"); },
    onError: () => toast.error("Save failed"),
  });

  const [fields, setFields] = React.useState<Record<string, string>>({});
  React.useEffect(() => {
    if (config) {
      setFields({
        baseShaker_baseCabinet: String(config.baseShaker_baseCabinet ?? "120"),
        baseShaker_wallCabinet: String(config.baseShaker_wallCabinet ?? "90"),
        baseShaker_tallCabinet: String(config.baseShaker_tallCabinet ?? "200"),
        baseShaker_vanityCabinet: String(config.baseShaker_vanityCabinet ?? "130"),
        mult_standard: String(Number(config.mult_standard ?? 1)),
        mult_color: String(Number(config.mult_color ?? 1.1)),
        mult_essenceOak: String(Number(config.mult_essenceOak ?? 1.16)),
        mult_essenceOakFullHeight: String(Number(config.mult_essenceOakFullHeight ?? 1.21)),
        mult_havenDune: String(Number(config.mult_havenDune ?? 1.16)),
        mult_havenEmber: String(Number(config.mult_havenEmber ?? 1.21)),
        wallUpcharge_36in: String(config.wallUpcharge_36in ?? "15"),
        wallUpcharge_42in: String(config.wallUpcharge_42in ?? "30"),
        baseUpcharge_fullHeight: String(config.baseUpcharge_fullHeight ?? "20"),
        baseUpcharge_drawer: String(config.baseUpcharge_drawer ?? "25"),
        baseUpcharge_specialty: String(config.baseUpcharge_specialty ?? "40"),
        tallPrice_pantry: String(config.tallPrice_pantry ?? "350"),
        tallPrice_oven: String(config.tallPrice_oven ?? "400"),
        tallPrice_linen: String(config.tallPrice_linen ?? "300"),
        addon_trashPullout: String(config.addon_trashPullout ?? "120"),
        addon_trayBase: String(config.addon_trayBase ?? "80"),
        addon_spicePullout: String(config.addon_spicePullout ?? "90"),
        addon_glassDoors: String(config.addon_glassDoors ?? "150"),
        addon_decorativeEndPanels: String(config.addon_decorativeEndPanels ?? "100"),
        addon_finishedSides: String(config.addon_finishedSides ?? "80"),
        addon_mouldingPackage: String(config.addon_mouldingPackage ?? "250"),
        addon_islandBackPanels: String(config.addon_islandBackPanels ?? "200"),
        rate_assembly: String(config.rate_assembly ?? "25"),
        rate_install: String(config.rate_install ?? "45"),
        markupPct: String(Math.round(Number(config.markupPct ?? 0.4) * 100)),
      });
    }
  }, [config]);

  const f = (key: string) => fields[key] ?? "";
  const set = (key: string, val: string) => setFields(prev => ({ ...prev, [key]: val }));

  const numInput = (key: string, label: string, prefix = "$") => (
    <div key={key}>
      <label className="text-xs text-stone-dark font-medium block mb-1">{label}</label>
      <div className="flex items-center gap-1">
        {prefix && <span className="text-xs text-stone-dark">{prefix}</span>}
        <input type="number" min="0" step="0.01" value={f(key)} onChange={e => set(key, e.target.value)}
          className="w-24 px-2 py-1 rounded border border-border/60 text-sm text-right" />
      </div>
    </div>
  );

  const handleSave = () => {
    updateMutation.mutate({
      baseShaker_baseCabinet: Number(f("baseShaker_baseCabinet")),
      baseShaker_wallCabinet: Number(f("baseShaker_wallCabinet")),
      baseShaker_tallCabinet: Number(f("baseShaker_tallCabinet")),
      baseShaker_vanityCabinet: Number(f("baseShaker_vanityCabinet")),
      mult_standard: Number(f("mult_standard")),
      mult_color: Number(f("mult_color")),
      mult_essenceOak: Number(f("mult_essenceOak")),
      mult_essenceOakFullHeight: Number(f("mult_essenceOakFullHeight")),
      mult_havenDune: Number(f("mult_havenDune")),
      mult_havenEmber: Number(f("mult_havenEmber")),
      wallUpcharge_36in: Number(f("wallUpcharge_36in")),
      wallUpcharge_42in: Number(f("wallUpcharge_42in")),
      baseUpcharge_fullHeight: Number(f("baseUpcharge_fullHeight")),
      baseUpcharge_drawer: Number(f("baseUpcharge_drawer")),
      baseUpcharge_specialty: Number(f("baseUpcharge_specialty")),
      tallPrice_pantry: Number(f("tallPrice_pantry")),
      tallPrice_oven: Number(f("tallPrice_oven")),
      tallPrice_linen: Number(f("tallPrice_linen")),
      addon_trashPullout: Number(f("addon_trashPullout")),
      addon_trayBase: Number(f("addon_trayBase")),
      addon_spicePullout: Number(f("addon_spicePullout")),
      addon_glassDoors: Number(f("addon_glassDoors")),
      addon_decorativeEndPanels: Number(f("addon_decorativeEndPanels")),
      addon_finishedSides: Number(f("addon_finishedSides")),
      addon_mouldingPackage: Number(f("addon_mouldingPackage")),
      addon_islandBackPanels: Number(f("addon_islandBackPanels")),
      rate_assembly: Number(f("rate_assembly")),
      rate_install: Number(f("rate_install")),
      markupPct: Number(f("markupPct")) / 100,
    });
  };

  return (
    <div className="space-y-6 border-t border-border/20 pt-6 mt-6">
      <div>
        <h3 className="text-base font-display text-charcoal">Cabinet Pricing Configuration</h3>
        <p className="text-xs text-stone-dark mt-1">Set base Shaker prices per LF, finish multipliers, add-on costs, and assembly/install rates. All prices are cost (before markup).</p>
      </div>
      <div className="rounded-xl border border-border/30 p-4 bg-sandstone/10 space-y-3">
        <h4 className="text-sm font-semibold text-charcoal">Base Shaker Prices per Linear Foot (Cost)</h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {numInput("baseShaker_baseCabinet", "Base Cabinets")}
          {numInput("baseShaker_wallCabinet", "Wall Cabinets")}
          {numInput("baseShaker_tallCabinet", "Tall Cabinets")}
          {numInput("baseShaker_vanityCabinet", "Vanity Cabinets")}
        </div>
      </div>
      <div className="rounded-xl border border-border/30 p-4 bg-sandstone/10 space-y-3">
        <h4 className="text-sm font-semibold text-charcoal">Finish Multipliers</h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {numInput("mult_standard", "Standard (White/Dove/Grey)", "×")}
          {numInput("mult_color", "Color (Ivy/Navy/Black)", "×")}
          {numInput("mult_essenceOak", "Essence Oak", "×")}
          {numInput("mult_essenceOakFullHeight", "Essence Oak Full-Height", "×")}
          {numInput("mult_havenDune", "Haven Dune", "×")}
          {numInput("mult_havenEmber", "Haven Ember", "×")}
        </div>
      </div>
      <div className="rounded-xl border border-border/30 p-4 bg-sandstone/10 space-y-3">
        <h4 className="text-sm font-semibold text-charcoal">Upcharges per LF (Cost Delta Above Standard)</h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {numInput("wallUpcharge_36in", '36" Wall Upcharge')}
          {numInput("wallUpcharge_42in", '42" Wall Upcharge')}
          {numInput("baseUpcharge_fullHeight", "Full-Height Base Upcharge")}
          {numInput("baseUpcharge_drawer", "Drawer Base Upcharge")}
          {numInput("baseUpcharge_specialty", "Specialty Base Upcharge")}
        </div>
      </div>
      <div className="rounded-xl border border-border/30 p-4 bg-sandstone/10 space-y-3">
        <h4 className="text-sm font-semibold text-charcoal">Tall Cabinet Prices per Unit (Cost)</h4>
        <div className="grid grid-cols-3 gap-4">
          {numInput("tallPrice_pantry", "Pantry Cabinet")}
          {numInput("tallPrice_oven", "Oven Cabinet")}
          {numInput("tallPrice_linen", "Linen Cabinet")}
        </div>
      </div>
      <div className="rounded-xl border border-border/30 p-4 bg-sandstone/10 space-y-3">
        <h4 className="text-sm font-semibold text-charcoal">Add-On Prices per Unit (Cost)</h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {numInput("addon_trashPullout", "Trash Pullout")}
          {numInput("addon_trayBase", "Tray Base")}
          {numInput("addon_spicePullout", "Spice Pullout")}
          {numInput("addon_glassDoors", "Glass Doors")}
          {numInput("addon_decorativeEndPanels", "Decorative End Panels")}
          {numInput("addon_finishedSides", "Finished Sides")}
          {numInput("addon_mouldingPackage", "Crown/Moulding Package")}
          {numInput("addon_islandBackPanels", "Island/Back Panels")}
        </div>
      </div>
      <div className="rounded-xl border border-border/30 p-4 bg-sandstone/10 space-y-3">
        <h4 className="text-sm font-semibold text-charcoal">Assembly &amp; Install Rates per LF (Cost)</h4>
        <div className="grid grid-cols-2 gap-4">
          {numInput("rate_assembly", "Assembly Rate")}
          {numInput("rate_install", "Install Rate")}
        </div>
      </div>
      <div className="rounded-xl border border-border/30 p-4 bg-sandstone/10 space-y-3">
        <h4 className="text-sm font-semibold text-charcoal">Cabinet Markup %</h4>
        <div className="flex items-center gap-2">
          <input type="number" min="0" max="100" value={f("markupPct")} onChange={e => set("markupPct", e.target.value)}
            className="w-20 px-2 py-1 rounded border border-border/60 text-sm text-right" />
          <span className="text-xs text-stone-dark">%</span>
        </div>
      </div>
      <button onClick={handleSave} disabled={updateMutation.isPending}
        className="px-5 py-2 rounded-lg bg-canyon text-white text-sm font-semibold hover:bg-canyon/90 transition-colors disabled:opacity-50">
        {updateMutation.isPending ? "Saving..." : "Save Cabinet Config"}
      </button>
    </div>
  );
}

// ─── Addition Price Consult Config Panel ─────────────────────────────────────
function DPAdditionConfigPanel({ utils }: { utils: ReturnType<typeof trpc.useUtils> }) {
  const { data: options, isLoading } = trpc.designPackage.getAdditionOptions.useQuery();
  const { data: config } = trpc.designPackage.getAdditionConfig.useQuery();
  const updateMutation = trpc.designPackage.updateAdditionOption.useMutation({
    onSuccess: () => { utils.designPackage.getAdditionOptions.invalidate(); toast.success("Saved"); },
    onError: () => toast.error("Save failed"),
  });
  const updateConfigMutation = trpc.designPackage.updateAdditionConfig.useMutation({
    onSuccess: () => { utils.designPackage.getAdditionConfig.invalidate(); toast.success("Config saved"); },
    onError: () => toast.error("Config save failed"),
  });
  const [markupPct, setMarkupPct] = React.useState("");
  const [repCommission, setRepCommission] = React.useState("");
  React.useEffect(() => {
    if (config) {
      setMarkupPct(String(Math.round(Number(config.markupPct) * 100)));
      setRepCommission(String(Math.round(Number(config.repCommission) * 100)));
    }
  }, [config]);

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-canyon" /></div>;
  if (!options?.length) return <div className="text-center py-12 text-stone-dark">No addition options found.</div>;

  const grouped = options.reduce<Record<string, typeof options>>((acc, item) => {
    const cat = item.category ?? "General";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-base font-display text-charcoal">Addition Pricing</h3>
        <p className="text-xs text-stone-dark mt-1">Set costs for each addition price consult option. Pricing type shown next to each item.</p>
      </div>
      {/* Section Manager */}
      <DPSectionManagerPanel consultType="addition" utils={utils} />
      {/* Config: Markup & Commission */}
      <div className="rounded-xl border border-border/30 p-4 bg-sandstone/10 space-y-3">
        <h4 className="text-sm font-semibold text-charcoal">Markup &amp; Commission</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-stone-dark font-medium">Markup % (GP)</label>
            <div className="flex items-center gap-2 mt-1">
              <input type="number" min="0" max="100" value={markupPct} onChange={e => setMarkupPct(e.target.value)}
                className="w-20 px-2 py-1 rounded border border-border/60 text-sm text-right" />
              <span className="text-xs text-stone-dark">%</span>
            </div>
          </div>
          <div>
            <label className="text-xs text-stone-dark font-medium">Rep Commission %</label>
            <div className="flex items-center gap-2 mt-1">
              <input type="number" min="0" max="100" value={repCommission} onChange={e => setRepCommission(e.target.value)}
                className="w-20 px-2 py-1 rounded border border-border/60 text-sm text-right" />
              <span className="text-xs text-stone-dark">%</span>
            </div>
          </div>
        </div>
        <button onClick={() => updateConfigMutation.mutate({ markupPct: Number(markupPct) / 100, repCommission: Number(repCommission) / 100 })}
          className="px-4 py-1.5 rounded bg-canyon text-white text-xs font-semibold hover:bg-canyon/90 transition-colors">
          Save Config
        </button>
      </div>
      {Object.entries(grouped).map(([category, items]) => (
        <div key={category} className="rounded-xl border border-border/30 overflow-hidden">
          <div className="bg-sandstone/20 px-4 py-2.5 border-b border-border/30">
            <h4 className="text-sm font-semibold text-charcoal capitalize">{category.replace(/_/g, " ")}</h4>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/20 bg-sandstone/10">
                <th className="px-4 py-2 text-left text-xs font-semibold text-stone-dark uppercase tracking-wide">Item</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-stone-dark uppercase tracking-wide">Type</th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-stone-dark uppercase tracking-wide">Cost ($)</th>
                <th className="px-4 py-2 text-center text-xs font-semibold text-stone-dark uppercase tracking-wide">Active</th>
                <th className="px-4 py-2 text-center text-xs font-semibold text-stone-dark uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/10">
              {items.map((item) => (
                <PriceConsultOptionRow
                  key={item.id}
                  item={item}
                  onSave={(id, data) => updateMutation.mutate({ id, ...data })}
                />
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

// ─── Basement Price Consult Config Panel ─────────────────────────────────────
function DPBasementConfigPanel({ utils }: { utils: ReturnType<typeof trpc.useUtils> }) {
  const { data: options, isLoading } = trpc.designPackage.getBasementOptions.useQuery();
  const { data: config } = trpc.designPackage.getBasementConfig.useQuery();
  const updateMutation = trpc.designPackage.updateBasementOption.useMutation({
    onSuccess: () => { utils.designPackage.getBasementOptions.invalidate(); toast.success("Saved"); },
    onError: () => toast.error("Save failed"),
  });
  const updateConfigMutation = trpc.designPackage.updateBasementConfig.useMutation({
    onSuccess: () => { utils.designPackage.getBasementConfig.invalidate(); toast.success("Config saved"); },
    onError: () => toast.error("Config save failed"),
  });
  const [markupPct, setMarkupPct] = React.useState("");
  const [repCommission, setRepCommission] = React.useState("");
  React.useEffect(() => {
    if (config) {
      setMarkupPct(String(Math.round(Number(config.markupPct) * 100)));
      setRepCommission(String(Math.round(Number(config.repCommission) * 100)));
    }
  }, [config]);

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-canyon" /></div>;
  if (!options?.length) return <div className="text-center py-12 text-stone-dark">No basement options found.</div>;

  const grouped = options.reduce<Record<string, typeof options>>((acc, item) => {
    const cat = item.category ?? "General";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-base font-display text-charcoal">Basement Finish Pricing</h3>
        <p className="text-xs text-stone-dark mt-1">Set costs for each basement price consult option. Pricing type shown next to each item.</p>
      </div>
      {/* Section Manager */}
      <DPSectionManagerPanel consultType="basement" utils={utils} />
      {/* Config: Markup & Commission */}
      <div className="rounded-xl border border-border/30 p-4 bg-sandstone/10 space-y-3">
        <h4 className="text-sm font-semibold text-charcoal">Markup &amp; Commission</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-stone-dark font-medium">Markup % (GP)</label>
            <div className="flex items-center gap-2 mt-1">
              <input type="number" min="0" max="100" value={markupPct} onChange={e => setMarkupPct(e.target.value)}
                className="w-20 px-2 py-1 rounded border border-border/60 text-sm text-right" />
              <span className="text-xs text-stone-dark">%</span>
            </div>
          </div>
          <div>
            <label className="text-xs text-stone-dark font-medium">Rep Commission %</label>
            <div className="flex items-center gap-2 mt-1">
              <input type="number" min="0" max="100" value={repCommission} onChange={e => setRepCommission(e.target.value)}
                className="w-20 px-2 py-1 rounded border border-border/60 text-sm text-right" />
              <span className="text-xs text-stone-dark">%</span>
            </div>
          </div>
        </div>
        <button onClick={() => updateConfigMutation.mutate({ markupPct: Number(markupPct) / 100, repCommission: Number(repCommission) / 100 })}
          className="px-4 py-1.5 rounded bg-canyon text-white text-xs font-semibold hover:bg-canyon/90 transition-colors">
          Save Config
        </button>
      </div>
      {Object.entries(grouped).map(([category, items]) => (
        <div key={category} className="rounded-xl border border-border/30 overflow-hidden">
          <div className="bg-sandstone/20 px-4 py-2.5 border-b border-border/30">
            <h4 className="text-sm font-semibold text-charcoal capitalize">{category.replace(/_/g, " ")}</h4>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/20 bg-sandstone/10">
                <th className="px-4 py-2 text-left text-xs font-semibold text-stone-dark uppercase tracking-wide">Item</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-stone-dark uppercase tracking-wide">Type</th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-stone-dark uppercase tracking-wide">Cost ($)</th>
                <th className="px-4 py-2 text-center text-xs font-semibold text-stone-dark uppercase tracking-wide">Active</th>
                <th className="px-4 py-2 text-center text-xs font-semibold text-stone-dark uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/10">
              {items.map((item) => (
                <PriceConsultOptionRow
                  key={item.id}
                  item={item}
                  onSave={(id, data) => updateMutation.mutate({ id, ...data })}
                />
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

// ─── Windows & SGD Config Panel ───────────────────────────────────────────────
function DPWindowConfigPanel({ utils }: { utils: ReturnType<typeof trpc.useUtils> }) {
  const { data: cfg, isLoading } = trpc.designPackage.getWindowConfig.useQuery();
  const updateMutation = trpc.designPackage.updateWindowConfig.useMutation({
    onSuccess: () => { toast.success("Window pricing saved"); utils.designPackage.getWindowConfig.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const [form, setForm] = React.useState<Record<string, string>>({});
  React.useEffect(() => {
    if (!cfg) return;
    const f: Record<string, string> = {};
    for (const [k, v] of Object.entries(cfg)) {
      f[k] = v !== null && v !== undefined ? String(v) : "";
    }
    setForm(f);
  }, [cfg]);

  if (isLoading) return <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-canyon" /></div>;

  const field = (key: string, label: string, hint?: string) => (
    <div key={key} className="flex items-center gap-3">
      <div className="flex-1">
        <label className="text-xs font-semibold text-stone-dark block mb-0.5">{label}</label>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="text-sm text-muted-foreground">$</span>
        <input
          type="number"
          min="0"
          step="0.01"
          value={form[key] ?? ""}
          onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))}
          className="w-28 px-2 py-1.5 text-sm border border-border/60 rounded-lg focus:outline-none focus:ring-2 focus:ring-canyon/40 text-right"
        />
      </div>
    </div>
  );

  const handleSave = () => {
    const payload: Record<string, number> = {};
    for (const [k, v] of Object.entries(form)) {
      const n = parseFloat(v);
      if (!isNaN(n)) payload[k] = n;
    }
    updateMutation.mutate(payload as any);
  };

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="bg-white rounded-xl border border-border/60 shadow-sm p-5 space-y-3">
      <h4 className="text-sm font-display text-charcoal font-semibold border-b border-border/40 pb-2">{title}</h4>
      <div className="space-y-3">{children}</div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-display text-charcoal">Windows & Sliding Glass Doors</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Base material costs per unit. Markup is applied via each mode's markup %.</p>
        </div>
        <Button onClick={handleSave} disabled={updateMutation.isPending} className="gap-2 bg-canyon hover:bg-canyon/90 text-white">
          {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Pricing
        </Button>
      </div>

      {/* Color Upcharges */}
      <Section title="Color Upcharges (added to base price per window)">
        {field("colorUpcharge_blackOnWhite", "Black on White", "Exterior black, interior white")}
        {field("colorUpcharge_blackOnBlack", "Black on Black", "Full black interior & exterior")}
      </Section>

      {/* Window Base Prices */}
      <Section title="Vinyl Windows — Base Cost per Unit">
        {field("price_vinyl_singleHung", "Single Hung")}
        {field("price_vinyl_doubleHung", "Double Hung")}
        {field("price_vinyl_casement", "Casement")}
        {field("price_vinyl_slider", "Slider")}
        {field("price_vinyl_picture", "Picture")}
      </Section>

      <Section title="Aluminum Windows — Base Cost per Unit">
        {field("price_alum_singleHung", "Single Hung")}
        {field("price_alum_doubleHung", "Double Hung")}
        {field("price_alum_casement", "Casement")}
        {field("price_alum_slider", "Slider")}
        {field("price_alum_picture", "Picture")}
      </Section>

      <Section title="Wood Windows — Base Cost per Unit">
        {field("price_wood_singleHung", "Single Hung")}
        {field("price_wood_doubleHung", "Double Hung")}
        {field("price_wood_casement", "Casement")}
        {field("price_wood_slider", "Slider")}
        {field("price_wood_picture", "Picture")}
      </Section>

      {/* Window Size Upcharges */}
      <Section title="Window Size Upcharges (added to base price per unit)">
        <p className="text-xs text-muted-foreground -mt-1 pb-1">Upcharge added per window based on size category. Bathroom and Standard Egress are typically $0.</p>
        {field("windowSize_bathroom", "Bathroom Window", "Small privacy window, ~14\"–24\" wide")}
        {field("windowSize_standardEgress", "Standard Egress", "Code-minimum egress, ~20\"×24\" opening")}
        {field("windowSize_largeEgress", "Large Egress", "Larger egress, ~36\"×48\"")}
        {field("windowSize_oversized", "Oversized Window", "Wide or tall beyond standard sizing")}
        {field("windowSize_skylight", "Skylight", "Roof-mounted, includes flashing & curb")}
      </Section>

      {/* Pane Upcharge */}
      <Section title="Pane Upcharge">
        {field("paneUpcharge_triple", "Triple Pane Upcharge", "Added per window for triple pane glass")}
      </Section>

      {/* Sliding Glass Doors */}
      <Section title="Sliding Glass Doors — Base Cost per Unit">
        {field("price_sgd_2panel", "2-Panel SGD")}
        {field("price_sgd_3panel", "3-Panel SGD")}
        {field("price_sgd_4panel", "4-Panel SGD")}
        {field("sgd_movingPanelUpcharge", "Moving Panel Upcharge", "Per extra moving panel on 3-panel")}
        {field("sgd_multiSlideUpcharge", "Multi-Slide Upcharge", "For 4-panel multi-slide configuration")}
        {field("sgd_alum_upcharge", "Aluminum Frame Upcharge", "Per SGD for aluminum frame")}
        {field("sgd_wood_upcharge", "Wood Frame Upcharge", "Per SGD for wood frame")}
        {field("sgd_colorUpcharge_blackOnWhite", "SGD Black/White Color Upcharge")}
        {field("sgd_colorUpcharge_blackOnBlack", "SGD Black/Black Color Upcharge")}
      </Section>

      {/* SGD Opening Type */}
      <Section title="SGD Opening Type Upcharge">
        <p className="text-xs text-muted-foreground -mt-1 pb-1">Upcharge applied when a new opening must be cut into the wall for the SGD.</p>
        {field("sgd_newOpeningUpcharge", "New Opening Upcharge", "Includes framing, header, and structural work")}
      </Section>

      {/* Headers & Casings */}
      <Section title="Headers & Casings">
        {field("price_header_per_lf", "Header Material (per LF)")}
        {field("price_casing_per_set", "Casing Set (per opening)")}
      </Section>

      {/* Markup */}
      <Section title="Windows Markup %">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <label className="text-xs font-semibold text-stone-dark block mb-0.5">Markup Percentage</label>
            <p className="text-xs text-muted-foreground">Applied on top of base cost to arrive at sell price</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <input
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={form["markupPct"] !== undefined ? (parseFloat(form["markupPct"] || "0") * 100).toFixed(1) : ""}
              onChange={e => setForm(prev => ({ ...prev, markupPct: String(parseFloat(e.target.value) / 100) }))}
              className="w-20 px-2 py-1.5 text-sm border border-border/60 rounded-lg focus:outline-none focus:ring-2 focus:ring-canyon/40 text-right"
            />
            <span className="text-sm text-muted-foreground">%</span>
          </div>
        </div>
      </Section>
    </div>
  );
}

// ─── Section Manager Panel ─────────────────────────────────────────────────
/**
 * Reusable panel that lets admins toggle visibility and drag-to-reorder
 * sections for a given price consult type (bathroom | addition | basement | kitchen).
 */
function DPSectionManagerPanel({
  consultType,
  utils,
}: {
  consultType: "bathroom" | "addition" | "basement" | "kitchen";
  utils: ReturnType<typeof trpc.useUtils>;
}) {
  const { data: sections, isLoading } = trpc.designPackage.getPriceConsultSections.useQuery({ consultType });
  const batchUpdateMutation = trpc.designPackage.batchUpdatePriceConsultSections.useMutation({
    onSuccess: () => {
      utils.designPackage.getPriceConsultSections.invalidate({ consultType });
      toast.success("Section order saved");
    },
    onError: () => toast.error("Save failed"),
  });
  const updateMutation = trpc.designPackage.updatePriceConsultSection.useMutation({
    onSuccess: () => {
      utils.designPackage.getPriceConsultSections.invalidate({ consultType });
    },
    onError: () => toast.error("Save failed"),
  });

  const CONSULT_LABELS: Record<string, string> = {
    bathroom: "Bathroom",
    addition: "Addition",
    basement: "Basement",
    kitchen: "Kitchen",
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-canyon" />
      </div>
    );
  }

  const items = (sections ?? []).map((s: any) => ({ ...s, id: s.id }));

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <h4 className="text-sm font-semibold text-charcoal">
            {CONSULT_LABELS[consultType]} Price Consult — Section Order &amp; Visibility
          </h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            Drag to reorder sections. Toggle the switch to show or hide a section in the calculator.
            Changes to order are saved automatically on drop.
          </p>
        </div>
      </div>

      <SortableList
        items={items}
        onReorder={(reordered) => {
          batchUpdateMutation.mutate(
            reordered.map((s: any, idx: number) => ({
              id: s.id,
              sortOrder: idx,
              isVisible: s.isVisible,
            }))
          );
        }}
        className="space-y-1.5"
        renderItem={(item: any, dragHandleProps) => (
          <div
            className={cn(
              "flex items-center gap-3 bg-white rounded-lg border px-3 py-2.5 shadow-sm transition-colors",
              item.isVisible ? "border-border/60" : "border-border/30 opacity-60"
            )}
          >
            {/* Drag handle */}
            <button
              ref={dragHandleProps.ref as any}
              style={dragHandleProps.style}
              {...(dragHandleProps.listeners as any)}
              {...(dragHandleProps.attributes as any)}
              className="text-muted-foreground/50 hover:text-muted-foreground shrink-0 cursor-grab active:cursor-grabbing"
              title="Drag to reorder"
            >
              <GripVertical className="w-4 h-4" />
            </button>

            {/* Step badge */}
            <span className="shrink-0 w-6 h-6 rounded-full bg-sandstone/60 text-charcoal/70 text-xs font-semibold flex items-center justify-center">
              {item.sortOrder + 1}
            </span>

            {/* Section label */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-charcoal truncate">{item.label}</p>
              {item.slug && (
                <p className="text-xs text-muted-foreground/60 truncate">{item.slug}</p>
              )}
            </div>

            {/* Visibility toggle */}
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-xs text-muted-foreground">
                {item.isVisible ? "Visible" : "Hidden"}
              </span>
              <Switch
                checked={!!item.isVisible}
                onCheckedChange={(checked) => {
                  updateMutation.mutate({
                    id: item.id,
                    isVisible: checked ? 1 : 0,
                    sortOrder: item.sortOrder,
                  });
                }}
                className="data-[state=checked]:bg-canyon"
              />
            </div>
          </div>
        )}
      />
    </div>
  );
}
