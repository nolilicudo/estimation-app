/**
 * StructuralCalcPanel -- Admin tab for viewing and editing structural engineering tables.
 * All three tables (joist spans, LVL beams, hot tub weights) are fetched from the database
 * and can be edited inline, with add/delete support.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ChevronDown, ChevronRight, Plus, Trash2, Check, X,
  Thermometer, Info, Calculator, Layers, Ruler,
  AlertTriangle, CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

// - Inline editable cell -
function EditableCell({
  value,
  onSave,
  type = "text",
}: {
  value: string | number;
  onSave: (v: string) => void;
  type?: "text" | "number";
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));

  if (!editing) {
    return (
      <span
        className="cursor-pointer hover:underline hover:text-primary"
        onClick={() => { setDraft(String(value)); setEditing(true); }}
        title="Click to edit"
      >
        {value}
      </span>
    );
  }

  return (
    <span className="flex items-center gap-1">
      <Input
        autoFocus
        type={type}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        className="h-7 w-24 text-sm px-1"
        onKeyDown={(e) => {
          if (e.key === "Enter") { onSave(draft); setEditing(false); }
          if (e.key === "Escape") setEditing(false);
        }}
      />
      <button onClick={() => { onSave(draft); setEditing(false); }} className="text-green-600 hover:text-green-700"><Check className="w-3 h-3" /></button>
      <button onClick={() => setEditing(false)} className="text-red-500 hover:text-red-600"><X className="w-3 h-3" /></button>
    </span>
  );
}

// - Section collapse wrapper -
function Section({
  title, icon, children, defaultOpen = true,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button className="flex items-center gap-2 w-full text-left px-5 py-3.5 bg-sandstone/40 hover:bg-sandstone/70 transition-colors rounded-xl border border-border mb-2">
          {icon}
          <span className="font-semibold text-sm text-charcoal flex-1">{title}</span>
          {open ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mb-6 px-1">{children}</CollapsibleContent>
    </Collapsible>
  );
}

function FormulaBox({ label, formula, note }: { label: string; formula: string; note?: string }) {
  return (
    <div className="bg-charcoal/5 border border-charcoal/10 rounded-lg p-3">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <code className="text-sm font-mono text-charcoal block">{formula}</code>
      {note && <p className="text-xs text-muted-foreground mt-1.5 italic">{note}</p>}
    </div>
  );
}

// - Joist Span Table -
function JoistSpanTable() {
  const utils = trpc.useUtils();
  const { data: rows = [], isLoading } = trpc.admin.getJoistSpanEntries.useQuery();

  const update = trpc.admin.updateJoistSpanEntry.useMutation({
    onSuccess: () => utils.admin.getJoistSpanEntries.invalidate(),
    onError: (e) => toast.error(e.message),
  });
  const del = trpc.admin.deleteJoistSpanEntry.useMutation({
    onSuccess: () => utils.admin.getJoistSpanEntries.invalidate(),
    onError: (e) => toast.error(e.message),
  });
  const create = trpc.admin.createJoistSpanEntry.useMutation({
    onSuccess: () => { utils.admin.getJoistSpanEntries.invalidate(); setAddOpen(false); },
    onError: (e) => toast.error(e.message),
  });

  const [addOpen, setAddOpen] = useState(false);
  const [newRow, setNewRow] = useState({
    joistSize: "2x10", spacingIn: 16, maxSpanFt: "14.00",
    loadFactorMin: "0.00", loadFactorMax: "9999.00", notes: "",
  });

  if (isLoading) return <p className="text-sm text-muted-foreground px-3 py-2">Loading...</p>;

  return (
    <>
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Joist Size</TableHead>
              <TableHead>Spacing (in)</TableHead>
              <TableHead>Max Span (ft)</TableHead>
              <TableHead>Load Factor Min</TableHead>
              <TableHead>Load Factor Max</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead>Active</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell><EditableCell value={row.joistSize} onSave={(v) => update.mutate({ id: row.id, joistSize: v })} /></TableCell>
                <TableCell><EditableCell value={row.spacingIn} type="number" onSave={(v) => update.mutate({ id: row.id, spacingIn: parseInt(v) })} /></TableCell>
                <TableCell><EditableCell value={row.maxSpanFt} type="number" onSave={(v) => update.mutate({ id: row.id, maxSpanFt: v })} /></TableCell>
                <TableCell><EditableCell value={row.loadFactorMin} type="number" onSave={(v) => update.mutate({ id: row.id, loadFactorMin: v })} /></TableCell>
                <TableCell><EditableCell value={row.loadFactorMax} type="number" onSave={(v) => update.mutate({ id: row.id, loadFactorMax: v })} /></TableCell>
                <TableCell><EditableCell value={row.notes ?? ""} onSave={(v) => update.mutate({ id: row.id, notes: v })} /></TableCell>
                <TableCell>
                  <button
                    onClick={() => update.mutate({ id: row.id, isActive: row.isActive ? 0 : 1 })}
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${row.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}
                  >
                    {row.isActive ? "Yes" : "No"}
                  </button>
                </TableCell>
                <TableCell>
                  <button onClick={() => del.mutate({ id: row.id })} className="text-red-400 hover:text-red-600">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Button size="sm" variant="outline" className="mt-2 gap-1" onClick={() => setAddOpen(true)}>
        <Plus className="w-3.5 h-3.5" /> Add Row
      </Button>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Joist Span Entry</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            {([
              { label: "Joist Size", key: "joistSize", type: "text" },
              { label: "Spacing (in)", key: "spacingIn", type: "number" },
              { label: "Max Span (ft)", key: "maxSpanFt", type: "text" },
              { label: "Load Factor Min", key: "loadFactorMin", type: "text" },
              { label: "Load Factor Max", key: "loadFactorMax", type: "text" },
              { label: "Notes", key: "notes", type: "text" },
            ] as const).map(({ label, key, type }) => (
              <div key={key} className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">{label}</label>
                <Input
                  type={type}
                  value={(newRow as Record<string, string | number>)[key] as string}
                  onChange={(e) => setNewRow((r) => ({ ...r, [key]: type === "number" ? Number(e.target.value) : e.target.value }))}
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={() => create.mutate(newRow)} disabled={create.isPending}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// - LVL Beam Table -
function LvlBeamTable() {
  const utils = trpc.useUtils();
  const { data: rows = [], isLoading } = trpc.admin.getLvlBeamEntries.useQuery();

  const update = trpc.admin.updateLvlBeamEntry.useMutation({
    onSuccess: () => utils.admin.getLvlBeamEntries.invalidate(),
    onError: (e) => toast.error(e.message),
  });
  const del = trpc.admin.deleteLvlBeamEntry.useMutation({
    onSuccess: () => utils.admin.getLvlBeamEntries.invalidate(),
    onError: (e) => toast.error(e.message),
  });
  const create = trpc.admin.createLvlBeamEntry.useMutation({
    onSuccess: () => { utils.admin.getLvlBeamEntries.invalidate(); setAddOpen(false); },
    onError: (e) => toast.error(e.message),
  });

  const [addOpen, setAddOpen] = useState(false);
  const [newRow, setNewRow] = useState({
    maxPostSpacingFt: "12.00", maxPlf: "500.00",
    beamSize: '3.5"x11.25"', isDouble: 0, notes: "",
  });

  if (isLoading) return <p className="text-sm text-muted-foreground px-3 py-2">Loading...</p>;

  return (
    <>
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Max Post Spacing (ft)</TableHead>
              <TableHead>Max Load (plf)</TableHead>
              <TableHead>Beam Size</TableHead>
              <TableHead>Doubled?</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead>Active</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell><EditableCell value={row.maxPostSpacingFt} type="number" onSave={(v) => update.mutate({ id: row.id, maxPostSpacingFt: v })} /></TableCell>
                <TableCell><EditableCell value={row.maxPlf} type="number" onSave={(v) => update.mutate({ id: row.id, maxPlf: v })} /></TableCell>
                <TableCell><EditableCell value={row.beamSize} onSave={(v) => update.mutate({ id: row.id, beamSize: v })} /></TableCell>
                <TableCell>
                  <button
                    onClick={() => update.mutate({ id: row.id, isDouble: row.isDouble ? 0 : 1 })}
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${row.isDouble ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-500"}`}
                  >
                    {row.isDouble ? "Yes" : "No"}
                  </button>
                </TableCell>
                <TableCell><EditableCell value={row.notes ?? ""} onSave={(v) => update.mutate({ id: row.id, notes: v })} /></TableCell>
                <TableCell>
                  <button
                    onClick={() => update.mutate({ id: row.id, isActive: row.isActive ? 0 : 1 })}
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${row.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}
                  >
                    {row.isActive ? "Yes" : "No"}
                  </button>
                </TableCell>
                <TableCell>
                  <button onClick={() => del.mutate({ id: row.id })} className="text-red-400 hover:text-red-600">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Button size="sm" variant="outline" className="mt-2 gap-1" onClick={() => setAddOpen(true)}>
        <Plus className="w-3.5 h-3.5" /> Add Row
      </Button>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add LVL Beam Entry</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            {([
              { label: "Max Post Spacing (ft)", key: "maxPostSpacingFt", type: "text" },
              { label: "Max Load (plf)", key: "maxPlf", type: "text" },
              { label: "Beam Size", key: "beamSize", type: "text" },
              { label: "Notes", key: "notes", type: "text" },
            ] as const).map(({ label, key, type }) => (
              <div key={key} className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">{label}</label>
                <Input
                  type={type}
                  value={(newRow as Record<string, string | number>)[key] as string}
                  onChange={(e) => setNewRow((r) => ({ ...r, [key]: e.target.value }))}
                />
              </div>
            ))}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Doubled Beam?</label>
              <button
                onClick={() => setNewRow((r) => ({ ...r, isDouble: r.isDouble ? 0 : 1 }))}
                className={`text-xs px-3 py-1.5 rounded-md font-medium border ${newRow.isDouble ? "bg-amber-100 text-amber-700 border-amber-200" : "bg-gray-100 text-gray-600 border-gray-200"}`}
              >
                {newRow.isDouble ? "Yes -- Doubled" : "No -- Single"}
              </button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={() => create.mutate(newRow)} disabled={create.isPending}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// - Glulam Beam Table -
function GlulamBeamTable() {
  const utils = trpc.useUtils();
  const { data: rows = [], isLoading } = trpc.admin.getGlulamBeamEntries.useQuery();

  const update = trpc.admin.updateGlulamBeamEntry.useMutation({
    onSuccess: () => utils.admin.getGlulamBeamEntries.invalidate(),
    onError: (e) => toast.error(e.message),
  });
  const del = trpc.admin.deleteGlulamBeamEntry.useMutation({
    onSuccess: () => utils.admin.getGlulamBeamEntries.invalidate(),
    onError: (e) => toast.error(e.message),
  });
  const create = trpc.admin.createGlulamBeamEntry.useMutation({
    onSuccess: () => { utils.admin.getGlulamBeamEntries.invalidate(); setAddOpen(false); },
    onError: (e) => toast.error(e.message),
  });

  const [addOpen, setAddOpen] = useState(false);
  const [newRow, setNewRow] = useState({
    widthIn: "3.5", depthIn: "9.0", spanFt: 12,
    maxPlfFloor: 500, maxPlfSnow: 0, species: "24F-V4", notes: "",
  });

  if (isLoading) return <p className="text-sm text-muted-foreground px-3 py-2">Loading...</p>;

  // Group by width for display
  const widths = Array.from(new Set(rows.map(r => parseFloat(String(r.widthIn))))).sort((a, b) => a - b);

  return (
    <>
      <p className="text-xs text-muted-foreground mb-2">
        {rows.length} entries loaded. Showing all widths: {widths.map(w => `${w}"`).join(', ')}.
        The calculator uses 100% load duration (maxPlfFloor) for hot tub loads.
      </p>
      <div className="rounded-md border overflow-x-auto max-h-96">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Width (in)</TableHead>
              <TableHead>Depth (in)</TableHead>
              <TableHead>Span (ft)</TableHead>
              <TableHead>Max PLF (Floor)</TableHead>
              <TableHead>Max PLF (Snow)</TableHead>
              <TableHead>Species</TableHead>
              <TableHead>Active</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell><EditableCell value={row.widthIn} type="number" onSave={(v) => update.mutate({ id: row.id, widthIn: v })} /></TableCell>
                <TableCell><EditableCell value={row.depthIn} type="number" onSave={(v) => update.mutate({ id: row.id, depthIn: v })} /></TableCell>
                <TableCell><EditableCell value={row.spanFt} type="number" onSave={(v) => update.mutate({ id: row.id, spanFt: parseInt(v) })} /></TableCell>
                <TableCell><EditableCell value={row.maxPlfFloor} type="number" onSave={(v) => update.mutate({ id: row.id, maxPlfFloor: parseInt(v) })} /></TableCell>
                <TableCell><EditableCell value={row.maxPlfSnow} type="number" onSave={(v) => update.mutate({ id: row.id, maxPlfSnow: parseInt(v) })} /></TableCell>
                <TableCell><EditableCell value={row.species} onSave={(v) => update.mutate({ id: row.id, species: v })} /></TableCell>
                <TableCell>
                  <button
                    onClick={() => update.mutate({ id: row.id, isActive: row.isActive ? 0 : 1 })}
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${row.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}
                  >
                    {row.isActive ? "Yes" : "No"}
                  </button>
                </TableCell>
                <TableCell>
                  <button onClick={() => del.mutate({ id: row.id })} className="text-red-400 hover:text-red-600">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Button size="sm" variant="outline" className="mt-2 gap-1" onClick={() => setAddOpen(true)}>
        <Plus className="w-3.5 h-3.5" /> Add Row
      </Button>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Glulam Beam Entry</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            {([
              { label: "Width (in)", key: "widthIn", type: "text" },
              { label: "Depth (in)", key: "depthIn", type: "text" },
              { label: "Span (ft)", key: "spanFt", type: "number" },
              { label: "Max PLF Floor", key: "maxPlfFloor", type: "number" },
              { label: "Max PLF Snow", key: "maxPlfSnow", type: "number" },
              { label: "Species", key: "species", type: "text" },
              { label: "Notes", key: "notes", type: "text" },
            ] as const).map(({ label, key, type }) => (
              <div key={key} className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">{label}</label>
                <Input
                  type={type}
                  value={(newRow as Record<string, string | number>)[key] as string}
                  onChange={(e) => setNewRow((r) => ({ ...r, [key]: type === "number" ? Number(e.target.value) : e.target.value }))}
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={() => create.mutate(newRow)} disabled={create.isPending}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// - Hot Tub Weights Table -
function HotTubWeightsTable() {
  const utils = trpc.useUtils();
  const { data: rows = [], isLoading } = trpc.admin.getHotTubWeights.useQuery();

  const update = trpc.admin.updateHotTubWeight.useMutation({
    onSuccess: () => utils.admin.getHotTubWeights.invalidate(),
    onError: (e) => toast.error(e.message),
  });
  const del = trpc.admin.deleteHotTubWeight.useMutation({
    onSuccess: () => utils.admin.getHotTubWeights.invalidate(),
    onError: (e) => toast.error(e.message),
  });
  const create = trpc.admin.createHotTubWeight.useMutation({
    onSuccess: () => { utils.admin.getHotTubWeights.invalidate(); setAddOpen(false); },
    onError: (e) => toast.error(e.message),
  });

  const [addOpen, setAddOpen] = useState(false);
  const [newRow, setNewRow] = useState({
    persons: 6, weightLb: 3500, footprintSqft: "36.00",
    psf: "97.00", loadFactor: "1.50", notes: "",
  });

  if (isLoading) return <p className="text-sm text-muted-foreground px-3 py-2">Loading...</p>;

  return (
    <>
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Persons</TableHead>
              <TableHead>Weight (lb)</TableHead>
              <TableHead>Footprint (sqft)</TableHead>
              <TableHead>PSF</TableHead>
              <TableHead>Load Factor</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead>Active</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell><EditableCell value={row.persons} type="number" onSave={(v) => update.mutate({ id: row.id, persons: parseInt(v) })} /></TableCell>
                <TableCell><EditableCell value={row.weightLb} type="number" onSave={(v) => update.mutate({ id: row.id, weightLb: parseInt(v) })} /></TableCell>
                <TableCell><EditableCell value={row.footprintSqft} type="number" onSave={(v) => update.mutate({ id: row.id, footprintSqft: v })} /></TableCell>
                <TableCell><EditableCell value={row.psf} type="number" onSave={(v) => update.mutate({ id: row.id, psf: v })} /></TableCell>
                <TableCell><EditableCell value={row.loadFactor} type="number" onSave={(v) => update.mutate({ id: row.id, loadFactor: v })} /></TableCell>
                <TableCell><EditableCell value={row.notes ?? ""} onSave={(v) => update.mutate({ id: row.id, notes: v })} /></TableCell>
                <TableCell>
                  <button
                    onClick={() => update.mutate({ id: row.id, isActive: row.isActive ? 0 : 1 })}
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${row.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}
                  >
                    {row.isActive ? "Yes" : "No"}
                  </button>
                </TableCell>
                <TableCell>
                  <button onClick={() => del.mutate({ id: row.id })} className="text-red-400 hover:text-red-600">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Button size="sm" variant="outline" className="mt-2 gap-1" onClick={() => setAddOpen(true)}>
        <Plus className="w-3.5 h-3.5" /> Add Row
      </Button>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Hot Tub Weight Entry</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            {([
              { label: "Persons", key: "persons", type: "number" },
              { label: "Weight (lb)", key: "weightLb", type: "number" },
              { label: "Footprint (sqft)", key: "footprintSqft", type: "text" },
              { label: "PSF", key: "psf", type: "text" },
              { label: "Load Factor", key: "loadFactor", type: "text" },
              { label: "Notes", key: "notes", type: "text" },
            ] as const).map(({ label, key, type }) => (
              <div key={key} className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">{label}</label>
                <Input
                  type={type}
                  value={(newRow as Record<string, string | number>)[key] as string}
                  onChange={(e) => setNewRow((r) => ({ ...r, [key]: type === "number" ? Number(e.target.value) : e.target.value }))}
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={() => create.mutate(newRow)} disabled={create.isPending}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// - Live Scenario Tester (uses hardcoded fallback -- DB tables drive the real calc) -
function LiveTester() {
  const [spanFt, setSpanFt] = useState(12);
  const [personSize, setPersonSize] = useState(6);
  const [snowPsf, setSnowPsf] = useState(30);
  const [postSpacing, setPostSpacing] = useState(8);
  const [placement, setPlacement] = useState<"middle" | "near-post">("middle");

  const { data: joistRows = [] } = trpc.admin.getJoistSpanEntries.useQuery();
  const { data: beamRows = [] } = trpc.admin.getLvlBeamEntries.useQuery();
  const { data: tubRows = [] } = trpc.admin.getHotTubWeights.useQuery();
  const { data: glulamRows = [] } = trpc.admin.getGlulamBeamEntries.useQuery();

  // Hot tub can be placed anywhere -> always use worst-case (mid-span)
  const tributaryWidth = spanFt / 2;
  const snowFactor = ((snowPsf + 10) * 1.307) / 50;

  const tubData = tubRows.find((r) => r.persons === personSize && r.isActive);
  const hotTubFactor = tubData ? parseFloat(String(tubData.loadFactor)) : 0;
  const effectiveFactor = Math.max(snowFactor, hotTubFactor);

  // Joist recommendation from DB rows
  const activeJoists = joistRows.filter((r) => r.isActive).sort((a, b) => parseFloat(String(a.maxSpanFt)) - parseFloat(String(b.maxSpanFt)));
  const matchingJoists = activeJoists.filter(
    (r) => parseFloat(String(r.maxSpanFt)) >= spanFt
      && effectiveFactor >= parseFloat(String(r.loadFactorMin))
      && effectiveFactor <= parseFloat(String(r.loadFactorMax))
  );
  const joistRec = matchingJoists[0]?.joistSize ?? "Consult engineer";

  // Beam recommendation: dimensional -> LVL -> glulam hierarchy
  const requiredPlf = Math.ceil(tributaryWidth * (snowPsf + 10));
  const lvlRows = beamRows.filter((r) => r.isActive).map((r) => ({
    maxSpan: parseFloat(String(r.maxPostSpacingFt)),
    maxPlf: parseFloat(String(r.maxPlf)),
    size: r.beamSize,
    isDouble: !!r.isDouble,
  }));
  const glulamData = glulamRows.filter((r) => r.isActive).map((r) => ({
    widthIn: parseFloat(String(r.widthIn)),
    depthIn: parseFloat(String(r.depthIn)),
    spanFt: r.spanFt,
    maxPlfFloor: r.maxPlfFloor,
    maxPlfSnow: r.maxPlfSnow,
  }));

  // Import beam hierarchy function inline for the tester
  const DIMENSIONAL_BEAMS_TESTER = [
    { size: '(2)2x8',  spanFt: 6,  maxPlfFloor: 460 }, { size: '(2)2x8',  spanFt: 8,  maxPlfFloor: 260 },
    { size: '(2)2x8',  spanFt: 10, maxPlfFloor: 165 }, { size: '(2)2x8',  spanFt: 12, maxPlfFloor: 115 },
    { size: '(2)2x10', spanFt: 6,  maxPlfFloor: 740 }, { size: '(2)2x10', spanFt: 8,  maxPlfFloor: 415 },
    { size: '(2)2x10', spanFt: 10, maxPlfFloor: 265 }, { size: '(2)2x10', spanFt: 12, maxPlfFloor: 185 },
    { size: '(2)2x10', spanFt: 14, maxPlfFloor: 135 },
    { size: '(2)2x12', spanFt: 6,  maxPlfFloor: 1070 }, { size: '(2)2x12', spanFt: 8,  maxPlfFloor: 600 },
    { size: '(2)2x12', spanFt: 10, maxPlfFloor: 385 }, { size: '(2)2x12', spanFt: 12, maxPlfFloor: 265 },
    { size: '(2)2x12', spanFt: 14, maxPlfFloor: 195 }, { size: '(2)2x12', spanFt: 16, maxPlfFloor: 150 },
    { size: '(3)2x12', spanFt: 6,  maxPlfFloor: 1600 }, { size: '(3)2x12', spanFt: 8,  maxPlfFloor: 900 },
    { size: '(3)2x12', spanFt: 10, maxPlfFloor: 575 }, { size: '(3)2x12', spanFt: 12, maxPlfFloor: 400 },
    { size: '(3)2x12', spanFt: 14, maxPlfFloor: 295 }, { size: '(3)2x12', spanFt: 16, maxPlfFloor: 225 },
    { size: '(3)2x12', spanFt: 18, maxPlfFloor: 175 },
  ];
  const dimBySize: Record<string, { size: string; spanFt: number; maxPlfFloor: number }> = {};
  for (const b of DIMENSIONAL_BEAMS_TESTER) {
    if (b.spanFt >= postSpacing) {
      if (!dimBySize[b.size] || b.spanFt < dimBySize[b.size].spanFt) dimBySize[b.size] = b;
    }
  }
  const dimMatch = Object.values(dimBySize).filter(b => b.maxPlfFloor >= requiredPlf).sort((a, b) => a.maxPlfFloor - b.maxPlfFloor)[0];
  let beamRec = "Consult engineer";
  let beamType: "dimensional" | "lvl" | "glulam" = "dimensional";
  if (dimMatch) {
    beamRec = dimMatch.size; beamType = "dimensional";
  } else {
    const lvlMatch = lvlRows.filter(b => b.maxSpan >= postSpacing && b.maxPlf >= requiredPlf).sort((a, b) => a.maxPlf - b.maxPlf)[0];
    if (lvlMatch && !lvlMatch.isDouble && !lvlMatch.size.toLowerCase().includes('14') && !lvlMatch.size.toLowerCase().includes('16')) {
      beamRec = lvlMatch.size; beamType = "lvl";
    } else {
      const glulamMatch = glulamData.filter(b => b.spanFt >= postSpacing && b.maxPlfFloor >= requiredPlf).sort((a, b) => { if (a.widthIn !== b.widthIn) return a.widthIn - b.widthIn; return a.depthIn - b.depthIn; })[0];
      if (glulamMatch) {
        const w = glulamMatch.widthIn === 3.5 ? '3.5"' : glulamMatch.widthIn === 5.125 ? '5.125"' : glulamMatch.widthIn === 6.75 ? '6.75"' : `${glulamMatch.widthIn}"`;
        beamRec = `${w}x${glulamMatch.depthIn}" Glulam (24F-V4)`; beamType = "glulam";
      }
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { label: "Joist Span (ft)", value: spanFt, setter: setSpanFt, min: 4, max: 20, step: 0.5 },
          { label: "Snow Load (psf)", value: snowPsf, setter: setSnowPsf, min: 0, max: 300, step: 1 },
          { label: "Post Spacing (ft)", value: postSpacing, setter: setPostSpacing, min: 4, max: 20, step: 1 },
        ].map(({ label, value, setter, min, max, step }) => (
          <div key={label}>
            <label className="block text-xs font-semibold text-charcoal mb-1">{label}</label>
            <input
              type="number" min={min} max={max} step={step} value={value}
              onChange={(e) => setter(Number(e.target.value))}
              className="w-full text-sm text-charcoal bg-sandstone/50 border border-border rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-canyon/40"
            />
          </div>
        ))}
        <div>
          <label className="block text-xs font-semibold text-charcoal mb-1">Hot Tub Size (persons)</label>
          <select
            value={personSize}
            onChange={(e) => setPersonSize(Number(e.target.value))}
            className="w-full text-sm text-charcoal bg-sandstone/50 border border-border rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-canyon/40"
          >
            {[2,3,4,5,6,7,8,9,10].map((n) => <option key={n} value={n}>{n}-person</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-charcoal mb-1">Hot Tub Placement</label>
          <select
            value={placement}
            onChange={(e) => setPlacement(e.target.value as "middle" | "near-post")}
            className="w-full text-sm text-charcoal bg-sandstone/50 border border-border rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-canyon/40"
          >
            <option value="middle">Middle of span</option>
            <option value="near-post">Near a post</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-canyon/10 border border-canyon/30 rounded-lg p-3">
          <p className="text-xs text-muted-foreground mb-1">Recommended Joist</p>
          <p className="text-base font-bold text-charcoal">{joistRec}</p>
          <p className="text-xs text-muted-foreground mt-1">Effective factor: {effectiveFactor.toFixed(2)}&times; &middot; worst-case mid-span</p>
        </div>
        <div className="bg-canyon/10 border border-canyon/30 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-xs text-muted-foreground">Outside Edge Beam</p>
            <span className={`text-xs px-1.5 py-0.5 rounded font-semibold border ${
              beamType === "dimensional" ? "bg-green-100 text-green-800 border-green-300" :
              beamType === "lvl" ? "bg-blue-100 text-blue-800 border-blue-300" :
              "bg-purple-100 text-purple-800 border-purple-300"
            }`}>{beamType === "dimensional" ? "Dimensional" : beamType === "lvl" ? "LVL" : "Glulam"}</span>
          </div>
          <p className="text-base font-bold text-charcoal">{beamRec}</p>
          <p className="text-xs text-muted-foreground mt-1">Trib. width: {tributaryWidth.toFixed(1)} ft &middot; {requiredPlf} plf required</p>
        </div>
        <div className="bg-sandstone/60 border border-border rounded-lg p-3">
          <p className="text-xs text-muted-foreground mb-1">Load Factors</p>
          <p className="text-sm font-bold text-charcoal">Snow: {snowFactor.toFixed(2)}&times; &nbsp;|&nbsp; Hot tub: {hotTubFactor.toFixed(2)}&times;</p>
          {tubData && (
            <p className="text-xs text-muted-foreground mt-1">
              {personSize}-person: ~{tubData.weightLb.toLocaleString()} lb &middot; {tubData.psf} psf
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// - Main Panel -
export function StructuralCalcPanel() {
  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-start gap-3 p-4 bg-canyon/5 border border-canyon/20 rounded-xl">
        <AlertTriangle className="w-5 h-5 text-canyon flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-charcoal">Editable Engineering Tables</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Click any cell to edit it inline. Changes take effect immediately for new customer estimates.
            Always have a licensed structural engineer verify designs for permitted projects.
          </p>
        </div>
      </div>

      <Section title="Live Scenario Tester" icon={<Calculator className="w-4 h-4 text-canyon" />} defaultOpen={true}>
        <p className="text-xs text-muted-foreground mb-3">
          Adjust the inputs to see what the calculator recommends using the current database tables.
        </p>
        <LiveTester />
      </Section>

      <Section title="Joist Span Table (IRC R507.5 -- Douglas Fir-Larch, 16&quot; OC)" icon={<Ruler className="w-4 h-4 text-canyon" />} defaultOpen={true}>
        <p className="text-xs text-muted-foreground mb-3">
          Each row defines the maximum allowable joist span for a given joist size and load factor range.
          <strong> Load Factor Min/Max</strong> define the range where this row applies -- use 9999 for &ldquo;unlimited&rdquo;.
        </p>
        <JoistSpanTable />
      </Section>

      <Section title="LVL Beam Sizing Table (3.5&quot; Versa-Lam 2.1E)" icon={<Layers className="w-4 h-4 text-canyon" />} defaultOpen={true}>
        <p className="text-xs text-muted-foreground mb-3">
          Tier 2 beam: used when dimensional lumber is insufficient. Max size before escalating to glulam is 3.5"&times;11.25" (single ply).
          Rows are matched by finding the first entry where post spacing &le; maxPostSpacingFt AND load &le; maxPlf.
        </p>
        <LvlBeamTable />
      </Section>

      <Section title="Glulam Beam Table (Boise Cascade 24F-V4)" icon={<Layers className="w-4 h-4 text-purple-600" />} defaultOpen={false}>
        <p className="text-xs text-muted-foreground mb-3">
          Tier 3 beam: used when LVL would exceed 3.5"&times;11.25" doubled. Based on Boise Cascade 24F-V4 floor load tables
          (100% load duration). The calculator picks the smallest beam (width first, then depth) that meets the required PLF.
        </p>
        <GlulamBeamTable />
      </Section>

      <Section title="Hot Tub Weight &amp; Load Data" icon={<Thermometer className="w-4 h-4 text-canyon" />} defaultOpen={true}>
        <p className="text-xs text-muted-foreground mb-3">
          Approximate filled weights and load factors by hot tub size. The load factor reduces the allowable joist span.
        </p>
        <HotTubWeightsTable />
      </Section>

      <Section title="Calculation Formulas (Reference)" icon={<Info className="w-4 h-4 text-canyon" />} defaultOpen={false}>
        <div className="space-y-3">
          <FormulaBox
            label="Snow load factor"
            formula="snowFactor = (snowPsf + 10) x 1.307 / 50"
            note="+10 = dead load; x1.307 = combined adjustment (0.7 Cs x 1.0 Ct x 1.15 Cd x 1.0 I). 50 = IRC standard design load."
          />
          <FormulaBox
            label="Beam load (plf) -- hot tub anywhere"
            formula="requiredPlf = (joistSpan / 2) x (snowPsf + 10)"
            note="Tributary width is always joistSpan / 2 (worst-case mid-span), so the hot tub can be placed anywhere on the deck."
          />
          <FormulaBox
            label="Beam hierarchy"
            formula="Dimensional -> LVL (max 3.5 x 11.25) -> Glulam (Boise Cascade 24F-V4)"
            note="Calculator tries each tier in order, picking the smallest member that meets the required PLF at the given span."
          />
          <FormulaBox
            label="Effective load factor"
            formula="effectiveFactor = max(snowFactor, hotTubLoadFactor)"
            note="The larger of the snow load factor and the hot tub load factor governs joist sizing."
          />
        </div>
      </Section>
    </div>
  );
}
