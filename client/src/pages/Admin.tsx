import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Settings, Palette, Layers, Ruler, Truck, Wrench, Type,
  Plus, Trash2, Save, LogOut, ArrowLeft, DollarSign, Hammer,
  Loader2, Shield, BarChart3, CircleDot, Building2, Frame, Grid3X3, Droplets,
  ShoppingCart, BookOpen, ExternalLink, Copy, FileText, Fence, PenLine, RefreshCw, Clock, CheckCircle, XCircle, Tag, Mail, Send, Users, UserPlus, Eye, EyeOff, ChevronDown, UserCog, Crown, Star,
  FolderKanban, Camera, AlertTriangle, ChevronRight, ChevronDown as ChevronDownIcon, ImageIcon, Upload, X as XIcon, Pencil, Package, Zap, Home, CalendarDays, Download, ClipboardList,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { StructuralCalcPanel } from "@/components/StructuralCalcPanel";
import { useCalcUser } from "@/hooks/useCalcUser";
import { useLocation } from "wouter";

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663346810257/CCcDY8JrM76jeYgqBkzZHs/logo_1fad62fa.png";


export default function AdminPage() {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const adminMe = trpc.adminAuth.me.useQuery();
  const logoutMutation = trpc.adminAuth.logout.useMutation();
  const loginWithPinMutation = trpc.adminAuth.loginWithPin.useMutation();

  // PIN gate — persisted in sessionStorage so it survives hot-reloads but clears on tab close
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

  const { data: config, isLoading } = trpc.admin.getConfig.useQuery(undefined, {
    enabled: pinUnlocked && isAdmin,
  });

  // Dashboard section navigation state — must be declared before any early returns
  const [section, setSection] = useState<"home" | "sales" | "products" | "pricing" | "scope" | "content" | "team">("home");

  // Live counts for dashboard cards — declared unconditionally to satisfy Rules of Hooks
  const { data: signRequestsData = [] } = trpc.sign.getAll.useQuery(undefined, { enabled: pinUnlocked && isAdmin });
  const { data: sentEmailsData = [] } = trpc.sentEmails.getAll.useQuery(undefined, { enabled: pinUnlocked && isAdmin });
  const { data: calcUsersData = [] } = trpc.calculatorUsers.getAll.useQuery(undefined, { enabled: pinUnlocked && isAdmin });
  const { data: projectsData = [] } = trpc.projects.getAll.useQuery(undefined, { enabled: pinUnlocked && isAdmin });

  // Calculator user / permissions — must be declared before early returns
  const calUser = useCalcUser();

  const handleLogout = async () => {
    // Clear PIN session and admin cookie, then redirect
    sessionStorage.removeItem("admin_pin_ok");
    await logoutMutation.mutateAsync();
    window.location.href = "/";
  };

  if (adminMe.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-charcoal">
        <Loader2 className="w-8 h-8 animate-spin text-canyon" />
      </div>
    );
  }

  // PIN gate — shown before any admin content regardless of auth state
  if (!pinUnlocked) {
    const dots = Array.from({ length: 4 }, (_, i) => i < pinEntry.length);
    return (
      <div className="min-h-screen flex items-center justify-center bg-charcoal">
        <div className="bg-white rounded-2xl p-8 max-w-xs w-full mx-4 shadow-2xl text-center">
          <img src={LOGO_URL} alt="Design Your Price" className="w-16 h-16 mx-auto mb-4 rounded-lg" />
          <h1 className="text-xl font-display text-charcoal mb-1">Admin Access</h1>
          <p className="text-sm text-muted-foreground font-body mb-6">Enter your 4-digit PIN to continue</p>

          {/* PIN dots */}
          <div className="flex justify-center gap-3 mb-6">
            {dots.map((filled, i) => (
              <div
                key={i}
                className={`w-4 h-4 rounded-full border-2 transition-all duration-150 ${
                  pinError
                    ? "border-red-400 bg-red-400"
                    : filled
                    ? "border-canyon bg-canyon"
                    : "border-border bg-transparent"
                }`}
              />
            ))}
          </div>

          {pinError && (
            <p className="text-red-500 text-xs mb-4 font-medium">Incorrect PIN. Try again.</p>
          )}

          {/* Numpad */}
          <div className="grid grid-cols-3 gap-2">
            {["1","2","3","4","5","6","7","8","9"].map(d => (
              <button
                key={d}
                onClick={() => handlePinDigit(d)}
                className="h-12 rounded-xl text-lg font-semibold bg-warm-cream hover:bg-sandstone/40 active:scale-95 transition-all text-charcoal border border-border"
              >
                {d}
              </button>
            ))}
            <button
              onClick={() => { window.location.href = "/"; }}
              className="h-12 rounded-xl text-xs font-medium bg-transparent hover:bg-red-50 active:scale-95 transition-all text-muted-foreground"
            >
              Cancel
            </button>
            <button
              onClick={() => handlePinDigit("0")}
              className="h-12 rounded-xl text-lg font-semibold bg-warm-cream hover:bg-sandstone/40 active:scale-95 transition-all text-charcoal border border-border"
            >
              0
            </button>
            <button
              onClick={handlePinBackspace}
              className="h-12 rounded-xl text-sm font-medium bg-transparent hover:bg-muted/40 active:scale-95 transition-all text-charcoal"
            >
              ⌫
            </button>
          </div>
        </div>
      </div>
    );
  }

  // If PIN is unlocked but admin session cookie hasn't propagated yet, show a brief spinner
  if (pinUnlocked && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-charcoal">
        <Loader2 className="w-8 h-8 animate-spin text-canyon" />
      </div>
    );
  }

  if (isLoading || !config) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-warm-cream">
        <Loader2 className="w-8 h-8 animate-spin text-canyon" />
      </div>
    );
  }

  // Permissions derived from calUser (declared above before early returns)
  const perms = calUser?.permissions ?? {};
  const isSuperAdmin = !calUser || calUser.role === "super_admin";
  const isManager = calUser?.role === "manager";
  // Permission helpers
  const can = {
    viewPricingTabs: isSuperAdmin || perms.editPricing,
    viewEstimates: isSuperAdmin || perms.viewAllEstimates || perms.viewTeamEstimates || perms.viewOwnEstimates,
    viewContracts: isSuperAdmin || perms.viewAllContracts || perms.viewTeamContracts || perms.viewOwnContracts,
    manageUsers: isSuperAdmin || isManager || perms.manageUsers,
    viewOrders: isSuperAdmin || perms.viewAllEstimates || perms.viewTeamEstimates,
    viewAdminPanel: isSuperAdmin || perms.viewAdminPanel,
  };
  // Default tab based on permissions
  const defaultTab = can.viewPricingTabs ? "collections" : can.viewContracts ? "sign-requests" : can.viewEstimates ? "sent-emails" : "calc-users";

  const pendingContracts = signRequestsData.filter((r: any) => r.status === "pending").length;
  const signedContracts = signRequestsData.filter((r: any) => r.status === "signed").length;
  const activeProjects = projectsData.filter((p: any) => p.projectStatus === "in_progress").length;
  const thisMonthEstimates = sentEmailsData.filter((e: any) => {
    const d = new Date(e.createdAt);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  return (
    <div className="min-h-screen bg-warm-cream">
      {/* Admin header */}
      <header className="bg-charcoal text-white sticky top-0 z-50">
        <div className="container flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            {section !== "home" && (
              <button
                onClick={() => setSection("home")}
                className="text-warm-cream/60 hover:text-white transition-colors mr-1"
                title="Back to Dashboard"
              >
                <ChevronRight className="w-4 h-4 rotate-180" />
              </button>
            )}
            <img src={LOGO_URL} alt="Logo" className="w-8 h-8 rounded" />
            <div>
              <h1 className="text-sm font-display">
                {section === "home" ? "Design Your Price" :
                 section === "sales" ? "Sales" :
                 section === "products" ? "Product Catalog" :
                 section === "pricing" ? "Pricing Engine" :
                 section === "scope" ? "Scope of Work" :
                 section === "content" ? "Content & Docs" :
                 "Team"}
              </h1>
              <p className="text-[10px] text-warm-cream/60 font-body">
                {calUser ? `${calUser.name} — ${calUser.role.replace("_", " ")}` : "Admin Portal"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {section !== "home" && (
              <button
                onClick={() => setSection("home")}
                className="text-warm-cream/60 hover:text-white text-xs font-medium flex items-center gap-1 transition-colors"
              >
                <Home className="w-3.5 h-3.5" /> Dashboard
              </button>
            )}
            {/* Portal toggle pill */}
            <div className="flex items-center bg-white/10 rounded-full p-0.5 gap-0.5">
              <span className="px-3 py-1 rounded-full bg-white text-charcoal text-xs font-medium shadow-sm">Decking</span>
              <button
                className="px-3 py-1 rounded-full text-xs font-medium text-warm-cream/70 hover:text-white transition-all"
                onClick={() => navigate("/admin-dp")}
              >Design Package</button>
            </div>
            <Button variant="ghost" size="sm" className="text-warm-cream/80 hover:text-white hover:bg-white/10" onClick={() => { window.location.href = "/"; }}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Calculator
            </Button>
            <Button variant="ghost" size="sm" className="text-warm-cream/80 hover:text-white hover:bg-white/10" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-1" /> Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Admin content */}
      <div className="container py-6">

        {/* ── DASHBOARD HOME ───────────────────────────────────────────── */}
        {section === "home" && (
          <div className="space-y-8">
            {/* Welcome banner */}
            <div>
              <h2 className="text-2xl font-display text-charcoal">
                Welcome back{calUser ? `, ${calUser.name.split(" ")[0]}` : ""}
              </h2>
              <p className="text-sm text-muted-foreground font-body mt-1">Select a section below to manage your admin settings.</p>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {can.viewEstimates && (
                <div className="bg-white rounded-xl border border-border/60 shadow-sm p-4 text-center cursor-pointer hover:border-canyon/40 transition-colors" onClick={() => setSection("sales")}>
                  <p className="text-3xl font-display text-canyon">{thisMonthEstimates}</p>
                  <p className="text-xs text-muted-foreground mt-1">Estimates This Month</p>
                </div>
              )}
              {can.viewContracts && (
                <div className="bg-white rounded-xl border border-border/60 shadow-sm p-4 text-center cursor-pointer hover:border-canyon/40 transition-colors" onClick={() => setSection("sales")}>
                  <p className="text-3xl font-display text-amber-600">{pendingContracts}</p>
                  <p className="text-xs text-muted-foreground mt-1">Pending Signatures</p>
                </div>
              )}
              {can.viewContracts && (
                <div className="bg-white rounded-xl border border-border/60 shadow-sm p-4 text-center cursor-pointer hover:border-canyon/40 transition-colors" onClick={() => setSection("sales")}>
                  <p className="text-3xl font-display text-green-600">{signedContracts}</p>
                  <p className="text-xs text-muted-foreground mt-1">Signed Contracts</p>
                </div>
              )}
              {can.viewContracts && (
                <div className="bg-white rounded-xl border border-border/60 shadow-sm p-4 text-center cursor-pointer hover:border-canyon/40 transition-colors" onClick={() => setSection("sales")}>
                  <p className="text-3xl font-display text-blue-600">{activeProjects}</p>
                  <p className="text-xs text-muted-foreground mt-1">Active Projects</p>
                </div>
              )}
            </div>

            {/* Category cards grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {/* Sales Pipeline */}
              {(can.viewEstimates || can.viewContracts || can.viewOrders) && (
                <button
                  onClick={() => setSection("sales")}
                  className="group bg-white rounded-2xl border border-border/60 shadow-sm p-6 text-left hover:shadow-md hover:border-canyon/40 transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-canyon/10 flex items-center justify-center">
                      <ShoppingCart className="w-6 h-6 text-canyon" />
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground/40 group-hover:text-canyon transition-colors" />
                  </div>
                  <h3 className="text-base font-display text-charcoal">Sales Pipeline</h3>
                  <p className="text-xs text-muted-foreground mt-1 font-body">Sent estimates, sign requests, projects, and orders</p>
                  <div className="flex gap-3 mt-4">
                    {can.viewEstimates && <span className="text-xs bg-warm-cream text-charcoal px-2 py-1 rounded-full font-medium">{sentEmailsData.length} estimates</span>}
                    {can.viewContracts && <span className="text-xs bg-warm-cream text-charcoal px-2 py-1 rounded-full font-medium">{signRequestsData.length} contracts</span>}
                  </div>
                </button>
              )}

              {/* Product Catalog */}
              {can.viewPricingTabs && (
                <button
                  onClick={() => setSection("products")}
                  className="group bg-white rounded-2xl border border-border/60 shadow-sm p-6 text-left hover:shadow-md hover:border-canyon/40 transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-sandstone/30 flex items-center justify-center">
                      <Layers className="w-6 h-6 text-charcoal" />
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground/40 group-hover:text-canyon transition-colors" />
                  </div>
                  <h3 className="text-base font-display text-charcoal">Product Catalog</h3>
                  <p className="text-xs text-muted-foreground mt-1 font-body">Collections, colors, edges, comparison materials, and surface products</p>
                  <div className="flex gap-3 mt-4">
                    <span className="text-xs bg-warm-cream text-charcoal px-2 py-1 rounded-full font-medium">{config.collections?.length ?? 0} collections</span>
                    <span className="text-xs bg-warm-cream text-charcoal px-2 py-1 rounded-full font-medium">{config.colors?.length ?? 0} colors</span>
                  </div>
                </button>
              )}

              {/* Pricing Engine */}
              {can.viewPricingTabs && (
                <button
                  onClick={() => setSection("pricing")}
                  className="group bg-white rounded-2xl border border-border/60 shadow-sm p-6 text-left hover:shadow-md hover:border-canyon/40 transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center">
                      <DollarSign className="w-6 h-6 text-green-600" />
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground/40 group-hover:text-canyon transition-colors" />
                  </div>
                  <h3 className="text-base font-display text-charcoal">Pricing Engine</h3>
                  <p className="text-xs text-muted-foreground mt-1 font-body">Labor tiers, delivery, pricing rules, lumber items, and corners/waste</p>
                  <div className="flex gap-3 mt-4">
                    <span className="text-xs bg-warm-cream text-charcoal px-2 py-1 rounded-full font-medium">{config.laborTiers?.length ?? 0} labor tiers</span>
                    <span className="text-xs bg-warm-cream text-charcoal px-2 py-1 rounded-full font-medium">{config.lumberItems?.length ?? 0} lumber items</span>
                  </div>
                </button>
              )}

              {/* Scope of Work */}
              {can.viewPricingTabs && (
                <button
                  onClick={() => setSection("scope")}
                  className="group bg-white rounded-2xl border border-border/60 shadow-sm p-6 text-left hover:shadow-md hover:border-canyon/40 transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                      <Hammer className="w-6 h-6 text-blue-600" />
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground/40 group-hover:text-canyon transition-colors" />
                  </div>
                  <h3 className="text-base font-display text-charcoal">Scope of Work</h3>
                  <p className="text-xs text-muted-foreground mt-1 font-body">Demo, footings, concrete, framing, facade, railing, stairs, rain escape, and soffit</p>
                  <div className="flex gap-3 mt-4">
                    <span className="text-xs bg-warm-cream text-charcoal px-2 py-1 rounded-full font-medium">{config.framingOptions?.length ?? 0} framing options</span>
                    <span className="text-xs bg-warm-cream text-charcoal px-2 py-1 rounded-full font-medium">{config.railingOptions?.length ?? 0} railing options</span>
                  </div>
                </button>
              )}

              {/* Content & Docs */}
              {can.viewPricingTabs && (
                <button
                  onClick={() => setSection("content")}
                  className="group bg-white rounded-2xl border border-border/60 shadow-sm p-6 text-left hover:shadow-md hover:border-canyon/40 transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center">
                      <FileText className="w-6 h-6 text-purple-600" />
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground/40 group-hover:text-canyon transition-colors" />
                  </div>
                  <h3 className="text-base font-display text-charcoal">Content &amp; Docs</h3>
                  <p className="text-xs text-muted-foreground mt-1 font-body">Verbiage, contract templates, brochures, project details, and site settings</p>
                  <div className="flex gap-3 mt-4">
                    <span className="text-xs bg-warm-cream text-charcoal px-2 py-1 rounded-full font-medium">Contracts</span>
                    <span className="text-xs bg-warm-cream text-charcoal px-2 py-1 rounded-full font-medium">Brochures</span>
                  </div>
                </button>
              )}

              {/* Team */}
              {can.manageUsers && (
                <button
                  onClick={() => setSection("team")}
                  className="group bg-white rounded-2xl border border-border/60 shadow-sm p-6 text-left hover:shadow-md hover:border-canyon/40 transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center">
                      <Users className="w-6 h-6 text-amber-600" />
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground/40 group-hover:text-canyon transition-colors" />
                  </div>
                  <h3 className="text-base font-display text-charcoal">Team</h3>
                  <p className="text-xs text-muted-foreground mt-1 font-body">Calculator users, roles, manager assignments, and permission settings</p>
                  <div className="flex gap-3 mt-4">
                    <span className="text-xs bg-warm-cream text-charcoal px-2 py-1 rounded-full font-medium">{calcUsersData.length} users</span>
                  </div>
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── SALES SECTION ────────────────────────────────────────────── */}
        {section === "sales" && (
          <Tabs defaultValue={can.viewContracts ? "projects" : can.viewEstimates ? "sent-emails" : "orders"} className="space-y-6">
            <TabsList className="bg-white border border-border/60 shadow-sm flex-wrap h-auto gap-1 p-1">
              {can.viewContracts && <TabsTrigger value="projects" className="gap-1.5 text-xs sm:text-sm"><FolderKanban className="w-4 h-4" /> Projects</TabsTrigger>}
              {can.viewContracts && <TabsTrigger value="sign-requests" className="gap-1.5 text-xs sm:text-sm"><PenLine className="w-4 h-4" /> Sign Requests</TabsTrigger>}
              {can.viewEstimates && <TabsTrigger value="sent-emails" className="gap-1.5 text-xs sm:text-sm"><Mail className="w-4 h-4" /> Sent Estimates</TabsTrigger>}
              {can.viewOrders && <TabsTrigger value="orders" className="gap-1.5 text-xs sm:text-sm"><ShoppingCart className="w-4 h-4" /> Orders</TabsTrigger>}
              {can.viewPricingTabs && <TabsTrigger value="brochures" className="gap-1.5 text-xs sm:text-sm"><BookOpen className="w-4 h-4" /> Brochures</TabsTrigger>}
            </TabsList>
            <TabsContent value="projects"><ProjectManagementPanel /></TabsContent>
            <TabsContent value="sign-requests"><SignRequestsPanel /></TabsContent>
            <TabsContent value="sent-emails"><SentEmailsPanel /></TabsContent>
            <TabsContent value="orders"><OrdersPanel utils={utils} /></TabsContent>
            <TabsContent value="brochures"><BrochureRequestsPanel utils={utils} /></TabsContent>
          </Tabs>
        )}

        {/* ── PRODUCTS SECTION ─────────────────────────────────────────── */}
        {section === "products" && (
          <Tabs defaultValue="collections" className="space-y-6">
            <TabsList className="bg-white border border-border/60 shadow-sm flex-wrap h-auto gap-1 p-1">
              <TabsTrigger value="collections" className="gap-1.5 text-xs sm:text-sm"><Layers className="w-4 h-4" /> Collections</TabsTrigger>
              <TabsTrigger value="colors" className="gap-1.5 text-xs sm:text-sm"><Palette className="w-4 h-4" /> Colors</TabsTrigger>
              <TabsTrigger value="edges" className="gap-1.5 text-xs sm:text-sm"><Ruler className="w-4 h-4" /> Edges</TabsTrigger>
              <TabsTrigger value="accessories" className="gap-1.5 text-xs sm:text-sm"><Wrench className="w-4 h-4" /> Accessories</TabsTrigger>
              <TabsTrigger value="comparison" className="gap-1.5 text-xs sm:text-sm"><BarChart3 className="w-4 h-4" /> Comparison</TabsTrigger>
              <TabsTrigger value="resin-surfaces" className="gap-1.5 text-xs sm:text-sm"><Layers className="w-4 h-4" /> Resin Surfaces</TabsTrigger>
              <TabsTrigger value="resin-colors" className="gap-1.5 text-xs sm:text-sm"><Palette className="w-4 h-4" /> Resin Colors</TabsTrigger>
              <TabsTrigger value="waterproofing" className="gap-1.5 text-xs sm:text-sm"><Shield className="w-4 h-4" /> Waterproofing</TabsTrigger>
              <TabsTrigger value="duradek-colors" className="gap-1.5 text-xs sm:text-sm"><Palette className="w-4 h-4" /> Duradek Colors</TabsTrigger>
              <TabsTrigger value="tile-sizes" className="gap-1.5 text-xs sm:text-sm"><Grid3X3 className="w-4 h-4" /> Tile Sizes</TabsTrigger>
              <TabsTrigger value="product-settings" className="gap-1.5 text-xs sm:text-sm"><Settings className="w-4 h-4" /> Product Settings</TabsTrigger>
            </TabsList>
            <TabsContent value="collections"><CollectionsPanel collections={config.collections} utils={utils} /></TabsContent>
            <TabsContent value="colors"><ColorsPanel colors={config.colors} collections={config.collections} utils={utils} /></TabsContent>
            <TabsContent value="edges"><EdgesPanel edges={config.edgeOptions} collections={config.collections} utils={utils} /></TabsContent>
            <TabsContent value="accessories"><AccessoriesPanel accessories={config.accessories} utils={utils} /></TabsContent>
            <TabsContent value="comparison"><ComparisonPanel materials={config.comparisonMaterials || []} utils={utils} /></TabsContent>
            <TabsContent value="resin-surfaces">
              <DemoRebuildGenericPanel title="Resin Rock Surfaces" description="Manage surface types that Resin Rock can be applied to and their pricing" items={config.resinSurfaces || []} fields={[{key:"slug",label:"Slug",type:"text"},{key:"name",label:"Name",type:"text"},{key:"description",label:"Description",type:"textarea"},{key:"pricePerSqft",label:"Price/sqft",type:"text"},{key:"requiresWaterproofing",label:"Requires Waterproofing",type:"toggle"},{key:"sortOrder",label:"Sort Order",type:"number"},{key:"isActive",label:"Active",type:"toggle"}]} createMutation="createResinSurface" updateMutation="updateResinSurface" deleteMutation="deleteResinSurface" createDefaults={{slug:"",name:"",description:"",pricePerSqft:"0.00",requiresWaterproofing:0,sortOrder:0,isActive:1}} utils={utils} />
            </TabsContent>
            <TabsContent value="resin-colors">
              <DemoRebuildGenericPanel title="Resin Rock Colors" description="Manage Resin Rock color blends and their pricing" items={config.resinColors || []} fields={[{key:"slug",label:"Slug",type:"text"},{key:"name",label:"Name",type:"text"},{key:"hex",label:"Hex Color",type:"text"},{key:"category",label:"Category",type:"text"},{key:"pricePerSqft",label:"Price/sqft",type:"text"},{key:"sortOrder",label:"Sort Order",type:"number"},{key:"isActive",label:"Active",type:"toggle"}]} createMutation="createResinColor" updateMutation="updateResinColor" deleteMutation="deleteResinColor" createDefaults={{slug:"",name:"",hex:"#888888",category:"Standard",pricePerSqft:"0.00",sortOrder:0,isActive:1}} utils={utils} />
            </TabsContent>
            <TabsContent value="waterproofing">
              <DemoRebuildGenericPanel title="Waterproofing Options" description="Manage poured rubber membrane waterproofing options for Resin Rock" items={config.waterproofingOptions || []} fields={[{key:"slug",label:"Slug",type:"text"},{key:"name",label:"Name",type:"text"},{key:"description",label:"Description",type:"textarea"},{key:"pricePerSqft",label:"Price/sqft",type:"text"},{key:"sortOrder",label:"Sort Order",type:"number"},{key:"isActive",label:"Active",type:"toggle"}]} createMutation="createWaterproofingOption" updateMutation="updateWaterproofingOption" deleteMutation="deleteWaterproofingOption" createDefaults={{slug:"",name:"",description:"",pricePerSqft:"0.00",sortOrder:0,isActive:1}} utils={utils} />
            </TabsContent>
            <TabsContent value="duradek-colors">
              <DemoRebuildGenericPanel title="Duradek Colors" description="Manage Duradek vinyl membrane colors, series, and pricing" items={config.duradekColors || []} fields={[{key:"slug",label:"Slug",type:"text"},{key:"name",label:"Name",type:"text"},{key:"series",label:"Series",type:"text"},{key:"hex",label:"Hex Color",type:"text"},{key:"pricePerSqft",label:"Price/sqft",type:"text"},{key:"sortOrder",label:"Sort Order",type:"number"},{key:"isActive",label:"Active",type:"toggle"}]} createMutation="createDuradekColor" updateMutation="updateDuradekColor" deleteMutation="deleteDuradekColor" createDefaults={{slug:"",name:"",series:"Standard",hex:"#888888",pricePerSqft:"0.00",sortOrder:0,isActive:1}} utils={utils} />
            </TabsContent>
            <TabsContent value="tile-sizes">
              <DemoRebuildGenericPanel title="Tile Sizes" description="Manage tile size options for Tiledek installations with labor and material pricing" items={config.tileSizes || []} fields={[{key:"slug",label:"Slug",type:"text"},{key:"name",label:"Name",type:"text"},{key:"description",label:"Description",type:"textarea"},{key:"laborPerSqft",label:"Labor/sqft",type:"text"},{key:"materialPerSqft",label:"Material/sqft",type:"text"},{key:"sortOrder",label:"Sort Order",type:"number"},{key:"isActive",label:"Active",type:"toggle"}]} createMutation="createTileSize" updateMutation="updateTileSize" deleteMutation="deleteTileSize" createDefaults={{slug:"",name:"",description:"",laborPerSqft:"0.00",materialPerSqft:"0.00",sortOrder:0,isActive:1}} utils={utils} />
            </TabsContent>
            <TabsContent value="product-settings"><ProductSettingsPanel settings={config.productSettings || []} utils={utils} /></TabsContent>
          </Tabs>
        )}

        {/* ── PRICING SECTION ──────────────────────────────────────────── */}
        {section === "pricing" && (
          <Tabs defaultValue="labor" className="space-y-6">
            <TabsList className="bg-white border border-border/60 shadow-sm flex-wrap h-auto gap-1 p-1">
              <TabsTrigger value="labor" className="gap-1.5 text-xs sm:text-sm"><Hammer className="w-4 h-4" /> Labor</TabsTrigger>
              <TabsTrigger value="delivery" className="gap-1.5 text-xs sm:text-sm"><Truck className="w-4 h-4" /> Delivery</TabsTrigger>
              <TabsTrigger value="pricing" className="gap-1.5 text-xs sm:text-sm"><DollarSign className="w-4 h-4" /> Pricing Rules</TabsTrigger>
              <TabsTrigger value="lumber-items" className="gap-1.5 text-xs sm:text-sm"><Package className="w-4 h-4" /> Lumber Items</TabsTrigger>
              <TabsTrigger value="structural-calc" className="gap-1.5 text-xs sm:text-sm"><Ruler className="w-4 h-4" /> Structural Calc</TabsTrigger>
              <TabsTrigger value="corners-waste" className="gap-1.5 text-xs sm:text-sm"><Grid3X3 className="w-4 h-4" /> Corners/Waste</TabsTrigger>
            </TabsList>
            <TabsContent value="labor"><LaborPanel tiers={config.laborTiers} utils={utils} /></TabsContent>
            <TabsContent value="delivery"><DeliveryPanel options={config.deliveryOptions} utils={utils} /></TabsContent>
            <TabsContent value="pricing"><SettingsPanel settings={config.settings} category="pricing" utils={utils} /></TabsContent>
            <TabsContent value="lumber-items">
              <div className="space-y-6">
                <SettingsPanel settings={config.settings} category="subfloor" utils={utils} />
                <SettingsPanel settings={config.settings} category="lift" utils={utils} />
                <LumberItemsPanel items={config.lumberItems || []} utils={utils} />
              </div>
            </TabsContent>
            <TabsContent value="structural-calc"><StructuralCalcPanel /></TabsContent>
            <TabsContent value="corners-waste"><CornersWastePanel rules={config.cornersWasteRules || []} utils={utils} /></TabsContent>
          </Tabs>
        )}

        {/* ── SCOPE OF WORK SECTION ────────────────────────────────────── */}
        {section === "scope" && (
          <Tabs defaultValue="demolition" className="space-y-6">
            <TabsList className="bg-white border border-border/60 shadow-sm flex-wrap h-auto gap-1 p-1">
              <TabsTrigger value="demolition" className="gap-1.5 text-xs sm:text-sm"><Hammer className="w-4 h-4" /> Demo</TabsTrigger>
              <TabsTrigger value="footings" className="gap-1.5 text-xs sm:text-sm"><CircleDot className="w-4 h-4" /> Footings</TabsTrigger>
              <TabsTrigger value="concrete" className="gap-1.5 text-xs sm:text-sm"><Layers className="w-4 h-4" /> Concrete</TabsTrigger>
              <TabsTrigger value="framing" className="gap-1.5 text-xs sm:text-sm"><Frame className="w-4 h-4" /> Framing</TabsTrigger>
              <TabsTrigger value="facade" className="gap-1.5 text-xs sm:text-sm"><Building2 className="w-4 h-4" /> Facade</TabsTrigger>
              <TabsTrigger value="railing" className="gap-1.5 text-xs sm:text-sm"><Fence className="w-4 h-4" /> Railing</TabsTrigger>
              <TabsTrigger value="stairs" className="gap-1.5 text-xs sm:text-sm"><Layers className="w-4 h-4" /> Stairs</TabsTrigger>
              <TabsTrigger value="rain-escape" className="gap-1.5 text-xs sm:text-sm"><Droplets className="w-4 h-4" /> Rain Escape</TabsTrigger>
              <TabsTrigger value="soffit" className="gap-1.5 text-xs sm:text-sm"><Layers className="w-4 h-4" /> Soffit</TabsTrigger>
              <TabsTrigger value="steel-jacket" className="gap-1.5 text-xs sm:text-sm"><Shield className="w-4 h-4" /> Steel Jacket</TabsTrigger>
              <TabsTrigger value="install-slots" className="gap-1.5 text-xs sm:text-sm"><CalendarDays className="w-4 h-4" /> Install Dates</TabsTrigger>
              <TabsTrigger value="post-beam-wrap" className="gap-1.5 text-xs sm:text-sm"><Package className="w-4 h-4" /> Post &amp; Beam Wrap</TabsTrigger>
              <TabsTrigger value="design-packages" className="gap-1.5 text-xs sm:text-sm"><Zap className="w-4 h-4" /> Design Packages</TabsTrigger>
            </TabsList>
            <TabsContent value="demolition">
              <DemoRebuildGenericPanel title="Demolition Options" description="Manage deck demolition and removal pricing tiers" items={config.demolitionOptions || []} fields={[{key:"slug",label:"Slug",type:"text"},{key:"name",label:"Name",type:"text"},{key:"description",label:"Description",type:"textarea"},{key:"pricing",label:"Pricing",type:"cost-margin-price",costKey:"costPerSqft",marginKey:"marginPct",priceKey:"pricePerSqft"},{key:"minimumPrice",label:"Minimum Price ($)",type:"text"},{key:"hasSeparateSqft",label:"Separate Sqft Input (e.g. Concrete Removal)",type:"toggle"},{key:"sortOrder",label:"Sort Order",type:"number"},{key:"isActive",label:"Active",type:"toggle"}]} createMutation="createDemolitionOption" updateMutation="updateDemolitionOption" deleteMutation="deleteDemolitionOption" createDefaults={{slug:"",name:"",description:"",costPerSqft:"0.00",marginPct:"35.00",pricePerSqft:"0.00",minimumPrice:"0.00",hasSeparateSqft:0,sortOrder:0,isActive:1}} utils={utils} />
            </TabsContent>
            <TabsContent value="footings">
              <div className="space-y-8">
                <DemoRebuildGenericPanel title="Demo/Rebuild Footing Options" description="Manage post footing types and pricing for demo &amp; rebuild projects" items={config.footingOptions || []} fields={[{key:"slug",label:"Slug",type:"text"},{key:"name",label:"Name",type:"text"},{key:"description",label:"Description",type:"textarea"},{key:"pricing",label:"Pricing",type:"cost-margin-price",costKey:"costPerUnit",marginKey:"marginPct",priceKey:"pricePerUnit"},{key:"unit",label:"Unit",type:"text"},{key:"sortOrder",label:"Sort Order",type:"number"},{key:"isActive",label:"Active",type:"toggle"}]} createMutation="createFootingOption" updateMutation="updateFootingOption" deleteMutation="deleteFootingOption" createDefaults={{slug:"",name:"",description:"",costPerUnit:"0.00",marginPct:"35.00",pricePerUnit:"0.00",unit:"each",sortOrder:0,isActive:1}} utils={utils} />
                <FrostFootingPricingPanel />
                <FrostFootingFormulasPanel />
              </div>
            </TabsContent>
            <TabsContent value="concrete">
              <DemoRebuildGenericPanel title="Concrete Options" description="Manage concrete work types and pricing" items={config.concreteOptions || []} fields={[{key:"slug",label:"Slug",type:"text"},{key:"name",label:"Name",type:"text"},{key:"description",label:"Description",type:"textarea"},{key:"pricing",label:"Pricing",type:"cost-margin-price",costKey:"costPerUnit",marginKey:"marginPct",priceKey:"pricePerUnit"},{key:"unit",label:"Unit (sqft or each)",type:"text"},{key:"sortOrder",label:"Sort Order",type:"number"},{key:"isActive",label:"Active",type:"toggle"}]} createMutation="createConcreteOption" updateMutation="updateConcreteOption" deleteMutation="deleteConcreteOption" createDefaults={{slug:"",name:"",description:"",costPerUnit:"0.00",marginPct:"35.00",pricePerUnit:"0.00",unit:"sqft",sortOrder:0,isActive:1}} utils={utils} />
            </TabsContent>
            <TabsContent value="framing">
              <DemoRebuildGenericPanel title="Framing Options" description="Manage deck framing and substructure pricing. 'Appalachian Rate' is used for Appalachian projects; 'Rainier Rate' overrides it for Rainier projects (leave blank to use Appalachian rate). Subfloor is auto-added for Rainier — set the rate in Admin → Pricing settings." items={config.framingOptions || []} fields={[{key:"slug",label:"Slug",type:"text"},{key:"name",label:"Name",type:"text"},{key:"description",label:"Description",type:"textarea"},{key:"pricing",label:"Appalachian Pricing",type:"cost-margin-price",costKey:"costPerSqft",marginKey:"marginPct",priceKey:"pricePerSqft"},{key:"rainierRate",label:"Rainier Rate ($/sqft, overrides price above)",type:"text"},{key:"minimumPrice",label:"Minimum Price ($)",type:"text"},{key:"sortOrder",label:"Sort Order",type:"number"},{key:"isActive",label:"Active",type:"toggle"}]} createMutation="createFramingOption" updateMutation="updateFramingOption" deleteMutation="deleteFramingOption" createDefaults={{slug:"",name:"",description:"",costPerSqft:"0.00",marginPct:"35.00",pricePerSqft:"0.00",rainierRate:"",minimumPrice:"0.00",sortOrder:0,isActive:1}} utils={utils} />
            </TabsContent>
            <TabsContent value="facade">
              <DemoRebuildGenericPanel title="Facade Options" description="Manage exterior facade repair materials and pricing" items={config.facadeOptions || []} fields={[{key:"slug",label:"Slug",type:"text"},{key:"name",label:"Name",type:"text"},{key:"description",label:"Description",type:"textarea"},{key:"pricing",label:"Pricing",type:"cost-margin-price",costKey:"costPerSqft",marginKey:"marginPct",priceKey:"pricePerSqft"},{key:"minimumPrice",label:"Minimum Price ($)",type:"text"},{key:"sortOrder",label:"Sort Order",type:"number"},{key:"isActive",label:"Active",type:"toggle"}]} createMutation="createFacadeOption" updateMutation="updateFacadeOption" deleteMutation="deleteFacadeOption" createDefaults={{slug:"",name:"",description:"",costPerSqft:"0.00",marginPct:"35.00",pricePerSqft:"0.00",minimumPrice:"0.00",sortOrder:0,isActive:1}} utils={utils} />
            </TabsContent>
            <TabsContent value="railing">
              <RailingPanel items={config.railingOptions || []} utils={utils} />
              <div className="mt-6"><SettingsPanel settings={config.settings} category="railing" utils={utils} /></div>
            </TabsContent>
            <TabsContent value="stairs"><StairsPanel settings={config.settings} spiralPricing={config.spiralStairPricing || []} utils={utils} /></TabsContent>
            <TabsContent value="rain-escape"><RainEscapePanel options={config.rainEscapeOptions || []} utils={utils} /></TabsContent>
            <TabsContent value="soffit"><SoffitPanel materials={config.soffitMaterials || []} utils={utils} /></TabsContent>
            <TabsContent value="steel-jacket"><SteelJacketPanel options={config.steelJacketOptions || []} utils={utils} /></TabsContent>
            <TabsContent value="install-slots"><InstallSlotsPanel utils={utils} /></TabsContent>
            <TabsContent value="post-beam-wrap"><PostBeamWrapPanel utils={utils} /></TabsContent>
            <TabsContent value="design-packages"><DesignPackagePanel utils={utils} /></TabsContent>
          </Tabs>
        )}

        {/* ── CONTENT & DOCS SECTION ───────────────────────────────────── */}
        {section === "content" && (
          <Tabs defaultValue="verbiage" className="space-y-6">
            <TabsList className="bg-white border border-border/60 shadow-sm flex-wrap h-auto gap-1 p-1">
              <TabsTrigger value="verbiage" className="gap-1.5 text-xs sm:text-sm"><Type className="w-4 h-4" /> Verbiage</TabsTrigger>
              <TabsTrigger value="contracts" className="gap-1.5 text-xs sm:text-sm"><FileText className="w-4 h-4" /> Contracts</TabsTrigger>
              <TabsTrigger value="brochures" className="gap-1.5 text-xs sm:text-sm"><BookOpen className="w-4 h-4" /> Brochures</TabsTrigger>
              <TabsTrigger value="project-details" className="gap-1.5 text-xs sm:text-sm"><Tag className="w-4 h-4" /> Project Details</TabsTrigger>
              <TabsTrigger value="site" className="gap-1.5 text-xs sm:text-sm"><Settings className="w-4 h-4" /> Site Settings</TabsTrigger>
            </TabsList>
            <TabsContent value="verbiage"><VerbiagePanel settings={config.settings} utils={utils} /></TabsContent>
            <TabsContent value="contracts"><ContractTemplatesPanel /></TabsContent>
            <TabsContent value="brochures"><BrochureRequestsPanel utils={utils} /></TabsContent>
            <TabsContent value="project-details"><ProjectDetailsPanel /></TabsContent>
            <TabsContent value="site"><SettingsPanel settings={config.settings} category="company" utils={utils} extraCategories={["hero"]} /></TabsContent>
          </Tabs>
        )}

        {/* ── TEAM SECTION ─────────────────────────────────────────────── */}
        {section === "team" && (
          <Tabs defaultValue="calc-users" className="space-y-6">
            <TabsList className="bg-white border border-border/60 shadow-sm flex-wrap h-auto gap-1 p-1">
              <TabsTrigger value="calc-users" className="gap-1.5 text-xs sm:text-sm"><Users className="w-4 h-4" /> Calculator Users</TabsTrigger>
            </TabsList>
            <TabsContent value="calc-users"><CalculatorUsersPanel /></TabsContent>
          </Tabs>
        )}

        {/* Legacy spacer — replaced by section views above */}
        <div className="pb-8" />
      </div>
    </div>
  );
}

/* ─── Project Details Panel ─────────────────────────────────────────────── */
function ProjectDetailsPanel() {
  const utils = trpc.useUtils();
  const { data: options = [], isLoading } = trpc.projectDetails.getAllAdmin.useQuery();

  const [newLabel, setNewLabel] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editLabel, setEditLabel] = useState("");

  const create = trpc.projectDetails.create.useMutation({
    onSuccess: () => { utils.projectDetails.getAllAdmin.invalidate(); utils.projectDetails.getAll.invalidate(); setNewLabel(""); toast.success("Option added"); },
    onError: () => toast.error("Failed to add option"),
  });

  const update = trpc.projectDetails.update.useMutation({
    onSuccess: () => { utils.projectDetails.getAllAdmin.invalidate(); utils.projectDetails.getAll.invalidate(); setEditingId(null); toast.success("Option updated"); },
    onError: () => toast.error("Failed to update option"),
  });

  const remove = trpc.projectDetails.delete.useMutation({
    onSuccess: () => { utils.projectDetails.getAllAdmin.invalidate(); utils.projectDetails.getAll.invalidate(); toast.success("Option deleted"); },
    onError: () => toast.error("Failed to delete option"),
  });

  const toggleActive = (id: number, current: number) => {
    update.mutate({ id, isActive: current === 1 ? 0 : 1 });
  };

  return (
    <PanelCard title="Project Detail Options" description="Manage the custom detail tags that can be attached to any project in the order flow.">
      {/* Add new */}
      <div className="flex gap-2 mb-4">
        <Input
          placeholder="New option label (e.g. 'Elevated Deck', 'Pergola Included')..."
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && newLabel.trim()) create.mutate({ label: newLabel.trim() }); }}
          className="flex-1"
        />
        <Button
          onClick={() => { if (newLabel.trim()) create.mutate({ label: newLabel.trim() }); }}
          disabled={!newLabel.trim() || create.isPending}
          className="bg-canyon hover:bg-canyon/90 text-white"
        >
          <Plus className="w-4 h-4 mr-1" /> Add
        </Button>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground py-4"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>
      ) : options.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">No project detail options yet. Add one above.</p>
      ) : (
        <div className="space-y-2">
          {options.map((opt: any) => (
            <div key={opt.id} className="flex items-center gap-3 p-3 rounded-lg border bg-muted/20">
              {editingId === opt.id ? (
                <>
                  <Input
                    value={editLabel}
                    onChange={(e) => setEditLabel(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && editLabel.trim()) update.mutate({ id: opt.id, label: editLabel.trim() }); if (e.key === "Escape") setEditingId(null); }}
                    className="flex-1 h-8"
                    autoFocus
                  />
                  <Button size="sm" onClick={() => { if (editLabel.trim()) update.mutate({ id: opt.id, label: editLabel.trim() }); }} disabled={update.isPending} className="bg-canyon hover:bg-canyon/90 text-white h-8">
                    <Save className="w-3 h-3" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setEditingId(null)} className="h-8">
                    <XCircle className="w-3 h-3" />
                  </Button>
                </>
              ) : (
                <>
                  <Tag className="w-4 h-4 text-canyon shrink-0" />
                  <span className={`flex-1 text-sm font-medium ${opt.isActive === 0 ? "text-muted-foreground line-through" : ""}`}>{opt.label}</span>
                  <span className="text-xs text-muted-foreground mr-2">#{opt.sortOrder}</span>
                  <Switch
                    checked={opt.isActive === 1}
                    onCheckedChange={() => toggleActive(opt.id, opt.isActive)}
                    title={opt.isActive === 1 ? "Active — visible in order form" : "Inactive — hidden from order form"}
                  />
                  <Button size="sm" variant="outline" onClick={() => { setEditingId(opt.id); setEditLabel(opt.label); }} className="h-8">
                    <Settings className="w-3 h-3" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => remove.mutate({ id: opt.id })} disabled={remove.isPending} className="h-8 text-destructive hover:text-destructive">
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </PanelCard>
  );
}

// ─── Panel wrapper ───────────────────────────────────────────────────────────

function PanelCard({ title, description, actions, children }: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-border/60 overflow-hidden">
      <div className="px-5 py-4 border-b border-border/40 bg-sandstone/30 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-display text-charcoal">{title}</h2>
          {description && <p className="text-xs font-body text-muted-foreground mt-0.5">{description}</p>}
        </div>
        {actions}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

// ─── Collections Panel ───────────────────────────────────────────────────────

function CollectionsPanel({ collections, utils }: { collections: any[]; utils: any }) {
  const updateMutation = trpc.admin.updateCollection.useMutation({
    onSuccess: () => { utils.admin.getConfig.invalidate(); toast.success("Collection updated"); },
    onError: (e: any) => toast.error(e.message),
  });
  const createMutation = trpc.admin.createCollection.useMutation({
    onSuccess: () => { utils.admin.getConfig.invalidate(); toast.success("Collection created"); },
    onError: (e: any) => toast.error(e.message),
  });
  const deleteMutation = trpc.admin.deleteCollection.useMutation({
    onSuccess: () => { utils.admin.getConfig.invalidate(); toast.success("Collection deleted"); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <PanelCard
      title="Collections"
      description="Manage stone decking product collections"
      actions={
        <AddDialog
          title="Add Collection"
          fields={[
            { key: "slug", label: "Slug (ID)", placeholder: "e.g. rainier" },
            { key: "name", label: "Name", placeholder: "e.g. Rainier Collection" },
            { key: "description", label: "Description", placeholder: "Collection description", multiline: true },
            { key: "imageUrl", label: "Image URL", placeholder: "https://..." },
            { key: "sortOrder", label: "Sort Order", placeholder: "1", type: "number" },
          ]}
          onSave={(data) => createMutation.mutate({ ...data, sortOrder: Number(data.sortOrder) || 0 })}
        />
      }
    >
      <div className="space-y-4">
        {collections.map((col) => (
          <CollectionRow key={col.id} collection={col} onUpdate={updateMutation.mutate} onDelete={deleteMutation.mutate} />
        ))}
      </div>
    </PanelCard>
  );
}

function CollectionRow({ collection, onUpdate, onDelete }: { collection: any; onUpdate: any; onDelete: any }) {
  const [name, setName] = useState(collection.name);
  const [description, setDescription] = useState(collection.description || "");
  const [isActive, setIsActive] = useState(collection.isActive === 1);
  const [sortOrder, setSortOrder] = useState(String(collection.sortOrder));
  const dirty = name !== collection.name || description !== (collection.description || "") || isActive !== (collection.isActive === 1) || sortOrder !== String(collection.sortOrder);

  return (
    <div className="border border-border/40 rounded-lg p-4">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono bg-sandstone/50 px-2 py-0.5 rounded">{collection.slug}</span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Active</span>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>
        </div>
        <div className="flex gap-1">
          {dirty && (
            <Button size="sm" variant="default" className="bg-canyon hover:bg-canyon-light text-white h-7 text-xs" onClick={() => onUpdate({ id: collection.id, name, description, isActive: isActive ? 1 : 0, sortOrder: Number(sortOrder) })}>
              <Save className="w-3 h-3 mr-1" /> Save
            </Button>
          )}
          <ConfirmDelete name={collection.name} onConfirm={() => onDelete({ id: collection.id })} />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-body text-muted-foreground mb-1 block">Name</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} className="h-8 text-sm" />
        </div>
        <div>
          <label className="text-xs font-body text-muted-foreground mb-1 block">Sort Order</label>
          <Input type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="h-8 text-sm" />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs font-body text-muted-foreground mb-1 block">Description</label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="text-sm min-h-[60px]" />
        </div>
      </div>
    </div>
  );
}

// ─── Colors Panel ────────────────────────────────────────────────────────────

function ColorsPanel({ colors, collections, utils }: { colors: any[]; collections: any[]; utils: any }) {
  const updateMutation = trpc.admin.updateColor.useMutation({
    onSuccess: () => { utils.admin.getConfig.invalidate(); toast.success("Color updated"); },
    onError: (e: any) => toast.error(e.message),
  });
  const createMutation = trpc.admin.createColor.useMutation({
    onSuccess: () => { utils.admin.getConfig.invalidate(); toast.success("Color created"); },
    onError: (e: any) => toast.error(e.message),
  });
  const deleteMutation = trpc.admin.deleteColor.useMutation({
    onSuccess: () => { utils.admin.getConfig.invalidate(); toast.success("Color deleted"); },
    onError: (e: any) => toast.error(e.message),
  });

  const [filterCol, setFilterCol] = useState<number | "all">("all");
  const filtered = filterCol === "all" ? colors : colors.filter(c => c.collectionId === filterCol);

  return (
    <PanelCard
      title="Stone Colors"
      description="Manage color options and pricing per collection"
      actions={
        <div className="flex gap-2">
          <select
            className="text-xs border border-border rounded px-2 py-1 bg-white"
            value={filterCol === "all" ? "all" : filterCol}
            onChange={(e) => setFilterCol(e.target.value === "all" ? "all" : Number(e.target.value))}
          >
            <option value="all">All Collections</option>
            {collections.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <AddDialog
            title="Add Color"
            fields={[
              { key: "collectionId", label: "Collection", placeholder: "Collection ID", type: "select", options: collections.map(c => ({ value: String(c.id), label: c.name })) },
              { key: "slug", label: "Slug", placeholder: "e.g. aged-teak" },
              { key: "name", label: "Display Name", placeholder: "e.g. Aged Teak" },
              { key: "hex", label: "Hex Color", placeholder: "#8B7355" },
              { key: "pricePerSqft", label: "Price per sqft", placeholder: "11.95" },
              { key: "sortOrder", label: "Sort Order", placeholder: "1", type: "number" },
            ]}
            onSave={(data) => createMutation.mutate({ ...data, collectionId: Number(data.collectionId), sortOrder: Number(data.sortOrder) || 0 })}
          />
        </div>
      }
    >
      <div className="space-y-3">
        {filtered.map((color) => (
          <div key={color.id} className="border border-border/40 rounded-lg p-3">
            <div className="flex items-center justify-between gap-3 mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded border border-border" style={{ backgroundColor: color.hex }} />
                <span className="text-xs font-mono bg-sandstone/50 px-2 py-0.5 rounded">{color.slug}</span>
                <span className="text-xs text-muted-foreground">
                  {collections.find((c: any) => c.id === color.collectionId)?.name}
                </span>
              </div>
              <div className="flex gap-1">
                <ConfirmDelete name={color.name} onConfirm={() => deleteMutation.mutate({ id: color.id })} />
              </div>
            </div>
            <ColorEditRow color={color} onUpdate={updateMutation.mutate} />
          </div>
        ))}
      </div>
    </PanelCard>
  );
}

function ColorEditRow({ color, onUpdate }: { color: any; onUpdate: any }) {
  const [name, setName] = useState(color.name);
  const [hex, setHex] = useState(color.hex);
  const [price, setPrice] = useState(color.pricePerSqft);
  const [isActive, setIsActive] = useState(color.isActive === 1);
  const dirty = name !== color.name || hex !== color.hex || price !== color.pricePerSqft || isActive !== (color.isActive === 1);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 items-end">
      <div>
        <label className="text-[10px] font-body text-muted-foreground">Name</label>
        <Input value={name} onChange={(e) => setName(e.target.value)} className="h-7 text-xs" />
      </div>
      <div>
        <label className="text-[10px] font-body text-muted-foreground">Hex</label>
        <div className="flex gap-1">
          <input type="color" value={hex} onChange={(e) => setHex(e.target.value)} className="w-7 h-7 rounded border border-border cursor-pointer" />
          <Input value={hex} onChange={(e) => setHex(e.target.value)} className="h-7 text-xs flex-1" />
        </div>
      </div>
      <div>
        <label className="text-[10px] font-body text-muted-foreground">$/sqft</label>
        <Input value={price} onChange={(e) => setPrice(e.target.value)} className="h-7 text-xs" />
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-muted-foreground">Active</span>
        <Switch checked={isActive} onCheckedChange={setIsActive} />
      </div>
      {dirty && (
        <Button size="sm" className="bg-canyon hover:bg-canyon-light text-white h-7 text-xs" onClick={() => onUpdate({ id: color.id, name, hex, pricePerSqft: price, isActive: isActive ? 1 : 0 })}>
          <Save className="w-3 h-3 mr-1" /> Save
        </Button>
      )}
    </div>
  );
}

// ─── Generic table panels ────────────────────────────────────────────────────

function EdgesPanel({ edges, collections, utils }: { edges: any[]; collections: any[]; utils: any }) {
  const updateMutation = trpc.admin.updateEdgeOption.useMutation({
    onSuccess: () => { utils.admin.getConfig.invalidate(); toast.success("Edge option updated"); },
    onError: (e: any) => toast.error(e.message),
  });
  const createMutation = trpc.admin.createEdgeOption.useMutation({
    onSuccess: () => { utils.admin.getConfig.invalidate(); toast.success("Edge option created"); },
    onError: (e: any) => toast.error(e.message),
  });
  const deleteMutation = trpc.admin.deleteEdgeOption.useMutation({
    onSuccess: () => { utils.admin.getConfig.invalidate(); toast.success("Edge option deleted"); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <PanelCard
      title="Edge Finishing Options"
      description="Manage edge finishing options per collection. Cost is your cost; margin % auto-computes the customer price."
      actions={
        <Button
          size="sm"
          className="bg-canyon hover:bg-canyon-light text-white h-7 text-xs"
          onClick={() => createMutation.mutate({ collectionSlug: collections[0]?.slug ?? "", slug: "", name: "New Edge Option", costPerLinearFt: "0.00", marginPct: "35.00", pricePerLinearFt: "0.00", sortOrder: 0, isActive: 1 })}
          disabled={createMutation.isPending}
        >
          <Plus className="w-3 h-3 mr-1" /> Add
        </Button>
      }
    >
      <div className="space-y-4">
        {edges.length === 0 && (
          <p className="text-sm text-muted-foreground font-body text-center py-4">No edge options yet. Click Add to create one.</p>
        )}
        {edges.map((item: any) => (
          <DemoRebuildItemRow
            key={item.id}
            item={item}
            fields={[
              { key: "collectionSlug", label: "Collection Slug", type: "text" },
              { key: "slug", label: "Slug", type: "text" },
              { key: "name", label: "Name", type: "text" },
              { key: "pricing", label: "Pricing", type: "cost-margin-price", costKey: "costPerLinearFt", marginKey: "marginPct", priceKey: "pricePerLinearFt" },
              { key: "sortOrder", label: "Sort Order", type: "number" },
              { key: "isActive", label: "Active", type: "toggle" },
            ]}
            onUpdate={(data: any) => updateMutation.mutate({ id: item.id, ...data })}
            onDelete={() => deleteMutation.mutate({ id: item.id })}
          />
        ))}
      </div>
    </PanelCard>
  );
}

function AccessoriesPanel({ accessories, utils }: { accessories: any[]; utils: any }) {
  const updateMutation = trpc.admin.updateAccessory.useMutation({
    onSuccess: () => { utils.admin.getConfig.invalidate(); toast.success("Accessory updated"); },
    onError: (e: any) => toast.error(e.message),
  });
  const createMutation = trpc.admin.createAccessory.useMutation({
    onSuccess: () => { utils.admin.getConfig.invalidate(); toast.success("Accessory created"); },
    onError: (e: any) => toast.error(e.message),
  });
  const deleteMutation = trpc.admin.deleteAccessory.useMutation({
    onSuccess: () => { utils.admin.getConfig.invalidate(); toast.success("Accessory deleted"); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <PanelCard
      title="Accessories & Hardware"
      description="Manage clips, fasteners, membranes, and other accessories. Cost is your cost; margin % auto-computes the customer price."
      actions={
        <Button
          size="sm"
          className="bg-canyon hover:bg-canyon-light text-white h-7 text-xs"
          onClick={() => createMutation.mutate({ slug: "", name: "New Accessory", unit: "sqft", costPerUnit: "0.00", marginPct: "35.00", pricePerUnit: "0.00", sortOrder: 0, isActive: 1 })}
          disabled={createMutation.isPending}
        >
          <Plus className="w-3 h-3 mr-1" /> Add
        </Button>
      }
    >
      <div className="space-y-4">
        {accessories.length === 0 && (
          <p className="text-sm text-muted-foreground font-body text-center py-4">No accessories yet. Click Add to create one.</p>
        )}
        {accessories.map((item: any) => (
          <DemoRebuildItemRow
            key={item.id}
            item={item}
            fields={[
              { key: "slug", label: "Slug", type: "text" },
              { key: "name", label: "Name", type: "text" },
              { key: "unit", label: "Unit (sqft/linear_ft/each)", type: "text" },
              { key: "pricing", label: "Pricing", type: "cost-margin-price", costKey: "costPerUnit", marginKey: "marginPct", priceKey: "pricePerUnit" },
              { key: "description", label: "Description", type: "textarea" },
              { key: "sortOrder", label: "Sort Order", type: "number" },
              { key: "isActive", label: "Active", type: "toggle" },
              { key: "showInScope", label: "Show in Email Scope", type: "toggle" },
            ]}
            onUpdate={(data: any) => updateMutation.mutate({ id: item.id, ...data })}
            onDelete={() => deleteMutation.mutate({ id: item.id })}
          />
        ))}
      </div>
    </PanelCard>
  );
}

function LaborPanel({ tiers, utils }: { tiers: any[]; utils: any }) {
  const updateMutation = trpc.admin.updateLaborTier.useMutation({
    onSuccess: () => { utils.admin.getConfig.invalidate(); toast.success("Labor tier updated"); },
    onError: (e: any) => toast.error(e.message),
  });
  const createMutation = trpc.admin.createLaborTier.useMutation({
    onSuccess: () => { utils.admin.getConfig.invalidate(); toast.success("Labor tier created"); },
    onError: (e: any) => toast.error(e.message),
  });
  const deleteMutation = trpc.admin.deleteLaborTier.useMutation({
    onSuccess: () => { utils.admin.getConfig.invalidate(); toast.success("Labor tier deleted"); },
    onError: (e: any) => toast.error(e.message),
  });

  const sharedTiers = tiers.filter((t: any) => !t.collectionSlug);
  const rainierTiers = tiers.filter((t: any) => t.collectionSlug === "rainier");
  const appalachianTiers = tiers.filter((t: any) => t.collectionSlug === "appalachian");

  const addDialogFields = [
    { key: "slug", label: "Slug", placeholder: "e.g. premium" },
    { key: "name", label: "Name", placeholder: "Premium Installation" },
    { key: "description", label: "Description", placeholder: "Full installation..." },
    { key: "laborCostPerSqft", label: "Labor Cost ($/sqft)", placeholder: "12.00" },
    { key: "marginPercent", label: "Margin %", placeholder: "35" },
    { key: "pricePerSqft", label: "Price ($/sqft) — override if no margin set", placeholder: "18.00" },
    { key: "minimumPrice", label: "Minimum Price ($)", placeholder: "500" },
    { key: "sortOrder", label: "Sort Order", placeholder: "1", type: "number" as const },
  ];

  const renderTierList = (tierList: any[], collectionSlug: string | null) => (
    <div className="space-y-4">
      <div className="bg-sandstone/30 border border-border/40 rounded-lg px-4 py-3 text-xs font-body text-muted-foreground">
        <strong className="text-charcoal">How pricing works:</strong> Enter a <em>Labor Cost</em> and <em>Margin %</em> to auto-compute the customer price (cost ÷ (1 − margin%)). Set a <em>Minimum Price</em> floor — if sqft × rate is below this, the minimum is used. Tiers in <em>Shared</em> apply to all collections.
      </div>
      <div className="flex justify-end">
        <AddDialog
          title={`Add ${collectionSlug === "rainier" ? "Rainier" : collectionSlug === "appalachian" ? "Appalachian" : "Shared"} Labor Tier`}
          fields={addDialogFields}
          onSave={(data) => createMutation.mutate({ ...data, sortOrder: Number(data.sortOrder) || 0, collectionSlug: collectionSlug ?? undefined })}
        />
      </div>
      {tierList.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">No tiers yet — add one above.</p>
      ) : (
        tierList.map((tier: any) => (
          <LaborTierRow key={tier.id} tier={tier} onUpdate={updateMutation.mutate} onDelete={deleteMutation.mutate} utils={utils} />
        ))
      )}
    </div>
  );

  return (
    <PanelCard
      title="Installation Labor Tiers"
      description="Manage per-collection labor rates, custom line items, and minimum price floors"
    >
      <Tabs defaultValue="shared">
        <TabsList className="mb-4">
          <TabsTrigger value="shared">Shared (All Collections)</TabsTrigger>
          <TabsTrigger value="rainier">Rainier Only</TabsTrigger>
          <TabsTrigger value="appalachian">Appalachian Only</TabsTrigger>
        </TabsList>
        <TabsContent value="shared">{renderTierList(sharedTiers, null)}</TabsContent>
        <TabsContent value="rainier">{renderTierList(rainierTiers, "rainier")}</TabsContent>
        <TabsContent value="appalachian">{renderTierList(appalachianTiers, "appalachian")}</TabsContent>
      </Tabs>
    </PanelCard>
  );
}

function LaborTierRow({ tier, onUpdate, onDelete, utils }: { tier: any; onUpdate: any; onDelete: any; utils: any }) {
  const [name, setName] = useState(tier.name);
  const [description, setDescription] = useState(tier.description || "");
  const [pricePerSqft, setPricePerSqft] = useState(String(tier.pricePerSqft));
  const [laborCost, setLaborCost] = useState(String(tier.laborCostPerSqft || "0"));
  const [margin, setMargin] = useState(String(tier.marginPercent || "0"));
  const [minimumPrice, setMinimumPrice] = useState(String(tier.minimumPrice || "0"));
  const [isActive, setIsActive] = useState(tier.isActive === 1);
  const [sortOrder, setSortOrder] = useState(String(tier.sortOrder));
  const [showLineItems, setShowLineItems] = useState(false);

  const createLineItemMutation = trpc.admin.createLaborLineItem.useMutation({
    onSuccess: () => { utils.admin.getConfig.invalidate(); toast.success("Line item added"); },
    onError: (e: any) => toast.error(e.message),
  });
  const updateLineItemMutation = trpc.admin.updateLaborLineItem.useMutation({
    onSuccess: () => { utils.admin.getConfig.invalidate(); toast.success("Line item updated"); },
    onError: (e: any) => toast.error(e.message),
  });
  const deleteLineItemMutation = trpc.admin.deleteLaborLineItem.useMutation({
    onSuccess: () => { utils.admin.getConfig.invalidate(); toast.success("Line item deleted"); },
    onError: (e: any) => toast.error(e.message),
  });

  // Compute derived price for display
  const lc = parseFloat(laborCost) || 0;
  const mg = parseFloat(margin) || 0;
  const derivedPrice = (lc > 0 && mg > 0 && mg < 100)
    ? (lc / (1 - mg / 100)).toFixed(2)
    : null;

  const dirty = name !== tier.name || description !== (tier.description || "") ||
    pricePerSqft !== String(tier.pricePerSqft) || laborCost !== String(tier.laborCostPerSqft || "0") ||
    margin !== String(tier.marginPercent || "0") || minimumPrice !== String(tier.minimumPrice || "0") ||
    isActive !== (tier.isActive === 1) || sortOrder !== String(tier.sortOrder);

  const lineItems: any[] = tier.lineItems ?? [];

  return (
    <div className="border border-border/40 rounded-lg p-4">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono bg-sandstone/50 px-2 py-0.5 rounded">{tier.slug}</span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Active</span>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>
        </div>
        <div className="flex gap-1">
          {dirty && (
            <Button size="sm" className="bg-canyon hover:bg-canyon-light text-white h-7 text-xs" onClick={() => onUpdate({
              id: tier.id, name, description, pricePerSqft, laborCostPerSqft: laborCost,
              marginPercent: margin, minimumPrice, isActive: isActive ? 1 : 0, sortOrder: Number(sortOrder)
            })}>
              <Save className="w-3 h-3 mr-1" /> Save
            </Button>
          )}
          <ConfirmDelete name={tier.name} onConfirm={() => onDelete({ id: tier.id })} />
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        <div className="col-span-2 sm:col-span-3 lg:col-span-2">
          <label className="text-[10px] font-body text-muted-foreground">Name</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} className="h-7 text-xs" />
        </div>
        <div>
          <label className="text-[10px] font-body text-muted-foreground">Labor Cost $/sqft</label>
          <Input value={laborCost} onChange={(e) => setLaborCost(e.target.value)} className="h-7 text-xs" placeholder="12.00" />
        </div>
        <div>
          <label className="text-[10px] font-body text-muted-foreground">Margin %</label>
          <Input value={margin} onChange={(e) => setMargin(e.target.value)} className="h-7 text-xs" placeholder="35" />
        </div>
        <div>
          <label className="text-[10px] font-body text-muted-foreground">
            {derivedPrice ? (
              <span className="text-green-700 font-semibold">→ Derived Price $/sqft</span>
            ) : "Price $/sqft (direct)"}
          </label>
          <div className="relative">
            <Input
              value={derivedPrice ?? pricePerSqft}
              onChange={(e) => setPricePerSqft(e.target.value)}
              className={`h-7 text-xs ${derivedPrice ? "bg-green-50 text-green-800 font-semibold" : ""}`}
              readOnly={!!derivedPrice}
            />
          </div>
          {derivedPrice && (
            <p className="text-[9px] text-green-700 mt-0.5">Auto-computed from cost + margin</p>
          )}
        </div>
        <div>
          <label className="text-[10px] font-body text-muted-foreground">Min Price ($)</label>
          <Input value={minimumPrice} onChange={(e) => setMinimumPrice(e.target.value)} className="h-7 text-xs" placeholder="500" />
          <p className="text-[9px] text-muted-foreground mt-0.5">Floor if sqft×rate &lt; min</p>
        </div>
        <div>
          <label className="text-[10px] font-body text-muted-foreground">Sort Order</label>
          <Input type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="h-7 text-xs" />
        </div>
      </div>
      <div className="mt-2">
        <label className="text-[10px] font-body text-muted-foreground">Description</label>
        <Input value={description} onChange={(e) => setDescription(e.target.value)} className="h-7 text-xs" />
      </div>
      {/* Custom Line Items */}
      <div className="mt-3 border-t border-border/30 pt-3">
        <button
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-charcoal transition-colors"
          onClick={() => setShowLineItems(!showLineItems)}
        >
          <DollarSign className="w-3 h-3" />
          <span>Custom Line Items ({lineItems.length})</span>
          <span className="text-[10px]">{showLineItems ? "▲" : "▼"}</span>
        </button>
        {showLineItems && (
          <div className="mt-2 space-y-2">
            {lineItems.map((li: any) => (
              <LaborLineItemRow key={li.id} item={li} onUpdate={updateLineItemMutation.mutate} onDelete={deleteLineItemMutation.mutate} />
            ))}
            <AddLaborLineItemRow tierId={tier.id} onCreate={createLineItemMutation.mutate} />
          </div>
        )}
      </div>
    </div>
  );
}

function LaborLineItemRow({ item, onUpdate, onDelete }: { item: any; onUpdate: any; onDelete: any }) {
  const [name, setName] = useState(item.name);
  const [amount, setAmount] = useState(String(item.amount));
  const [unit, setUnit] = useState(item.unit);

  const dirty = name !== item.name || amount !== String(item.amount) || unit !== item.unit;

  return (
    <div className="flex items-center gap-2 bg-sandstone/20 rounded px-3 py-2">
      <Input value={name} onChange={(e) => setName(e.target.value)} className="h-6 text-xs flex-1" placeholder="Line item name" />
      <Input value={amount} onChange={(e) => setAmount(e.target.value)} className="h-6 text-xs w-20" placeholder="0.00" />
      <select
        value={unit}
        onChange={(e) => setUnit(e.target.value)}
        className="h-6 text-xs border border-border rounded px-1 bg-background"
      >
        <option value="flat">Flat $</option>
        <option value="sqft">$/sqft</option>
        <option value="linear_ft">$/lin.ft</option>
      </select>
      {dirty && (
        <Button size="sm" className="h-6 text-[10px] px-2 bg-canyon hover:bg-canyon-light text-white" onClick={() => onUpdate({ id: item.id, name, amount, unit })}>
          <Save className="w-3 h-3" />
        </Button>
      )}
      <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10" onClick={() => onDelete({ id: item.id })}>
        <Trash2 className="w-3 h-3" />
      </Button>
    </div>
  );
}

function AddLaborLineItemRow({ tierId, onCreate }: { tierId: number; onCreate: any }) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [unit, setUnit] = useState("flat");

  const handleAdd = () => {
    if (!name.trim() || !amount.trim()) return;
    onCreate({ tierId, name: name.trim(), amount, unit, sortOrder: 0, isActive: 1 });
    setName("");
    setAmount("");
    setUnit("flat");
  };

  return (
    <div className="flex items-center gap-2 border border-dashed border-border/50 rounded px-3 py-2">
      <Input value={name} onChange={(e) => setName(e.target.value)} className="h-6 text-xs flex-1" placeholder="New line item name..." />
      <Input value={amount} onChange={(e) => setAmount(e.target.value)} className="h-6 text-xs w-20" placeholder="0.00" />
      <select
        value={unit}
        onChange={(e) => setUnit(e.target.value)}
        className="h-6 text-xs border border-border rounded px-1 bg-background"
      >
        <option value="flat">Flat $</option>
        <option value="sqft">$/sqft</option>
        <option value="linear_ft">$/lin.ft</option>
      </select>
      <Button size="sm" className="h-6 text-[10px] px-2 bg-canyon hover:bg-canyon-light text-white" onClick={handleAdd}>
        <Plus className="w-3 h-3" />
      </Button>
    </div>
  );
}

function DeliveryPanel({ options, utils }: { options: any[]; utils: any }) {
  const updateMutation = trpc.admin.updateDeliveryOption.useMutation({
    onSuccess: () => { utils.admin.getConfig.invalidate(); toast.success("Delivery option updated"); },
    onError: (e: any) => toast.error(e.message),
  });
  const createMutation = trpc.admin.createDeliveryOption.useMutation({
    onSuccess: () => { utils.admin.getConfig.invalidate(); toast.success("Delivery option created"); },
    onError: (e: any) => toast.error(e.message),
  });
  const deleteMutation = trpc.admin.deleteDeliveryOption.useMutation({
    onSuccess: () => { utils.admin.getConfig.invalidate(); toast.success("Delivery option deleted"); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <PanelCard
      title="Delivery Options"
      description="Manage delivery zones and pricing"
      actions={
        <AddDialog
          title="Add Delivery Option"
          fields={[
            { key: "slug", label: "Slug", placeholder: "e.g. local" },
            { key: "name", label: "Name", placeholder: "Local Delivery" },
            { key: "description", label: "Description", placeholder: "Delivery within Utah County" },
            { key: "price", label: "Price", placeholder: "150.00" },
            { key: "sortOrder", label: "Sort Order", placeholder: "1", type: "number" },
          ]}
          onSave={(data) => createMutation.mutate({ ...data, sortOrder: Number(data.sortOrder) || 0 })}
        />
      }
    >
      <GenericTable
        items={options}
        columns={[
          { key: "slug", label: "Slug", width: "w-28" },
          { key: "name", label: "Name" },
          { key: "description", label: "Description" },
          { key: "price", label: "Price", width: "w-20" },
          { key: "sortOrder", label: "Order", width: "w-16", type: "number" },
        ]}
        onUpdate={(id, data) => updateMutation.mutate({ id, ...data })}
        onDelete={(id) => deleteMutation.mutate({ id })}
      />
    </PanelCard>
  );
}

// ─── Settings Panel ──────────────────────────────────────────────────────────

function SettingsPanel({ settings, category, utils, extraCategories = [] }: {
  settings: any[];
  category: string;
  utils: any;
  extraCategories?: string[];
}) {
  const categories = [category, ...extraCategories];
  const filtered = settings.filter(s => categories.includes(s.category));
  const updateMutation = trpc.admin.bulkUpdateSettings.useMutation({
    onSuccess: () => { utils.admin.getConfig.invalidate(); toast.success("Settings saved"); },
    onError: (e: any) => toast.error(e.message),
  });

  const [values, setValues] = useState<Record<string, string>>({});

  useEffect(() => {
    const map: Record<string, string> = {};
    for (const s of filtered) map[s.settingKey] = s.settingValue;
    setValues(map);
  }, [settings]);

  const dirty = filtered.some(s => values[s.settingKey] !== s.settingValue);

  const handleSave = () => {
    const updates = filtered
      .filter(s => values[s.settingKey] !== s.settingValue)
      .map(s => ({ key: s.settingKey, value: values[s.settingKey] || "" }));
    if (updates.length > 0) updateMutation.mutate({ updates });
  };

  const titleMap: Record<string, string> = {
    pricing: "Pricing Settings",
    verbiage: "Verbiage & Copy",
    company: "Site & Company Settings",
    subfloor: "Subfloor Settings",
    stairs: "Stair Settings",
    lift: "Material Lift Settings",
    railing: "Railing Settings",
  };

  return (
    <PanelCard
      title={titleMap[category] || "Settings"}
      description="Edit values and click Save to apply changes"
      actions={
        dirty ? (
          <Button size="sm" className="bg-canyon hover:bg-canyon-light text-white" onClick={handleSave} disabled={updateMutation.isPending}>
            <Save className="w-4 h-4 mr-1" /> Save Changes
          </Button>
        ) : null
      }
    >
      <div className="space-y-4">
        {categories.map(cat => {
          const catSettings = filtered.filter(s => s.category === cat);
          if (catSettings.length === 0) return null;
          return (
            <div key={cat}>
              {categories.length > 1 && (
                <h3 className="text-sm font-semibold font-body text-charcoal mb-3 capitalize border-b border-border/40 pb-1">{cat} Settings</h3>
              )}
              <div className="space-y-3">
                {catSettings.map(s => {
                  const isBool = s.settingValue === "0" || s.settingValue === "1";
                  const currentVal = values[s.settingKey] ?? s.settingValue;
                  return (
                    <div key={s.settingKey}>
                      <label className="text-xs font-body font-medium text-charcoal mb-1 block">{s.label}</label>
                      {s.description && <p className="text-[10px] text-muted-foreground mb-1">{s.description}</p>}
                      {isBool ? (
                        <div className="flex items-center gap-3">
                          <Switch
                            checked={currentVal === "1"}
                            onCheckedChange={(checked) => setValues(prev => ({ ...prev, [s.settingKey]: checked ? "1" : "0" }))}
                          />
                          <span className="text-xs text-muted-foreground">{currentVal === "1" ? "Enabled" : "Disabled"}</span>
                        </div>
                      ) : (s.settingValue?.length > 80) ? (
                        <Textarea
                          value={currentVal || ""}
                          onChange={(e) => setValues(prev => ({ ...prev, [s.settingKey]: e.target.value }))}
                          className={`text-sm font-mono ${s.settingKey === 'contract_text' ? 'min-h-[400px]' : 'min-h-[80px]'}`}
                        />
                      ) : (
                        <Input
                          value={currentVal || ""}
                          onChange={(e) => setValues(prev => ({ ...prev, [s.settingKey]: e.target.value }))}
                          className="h-8 text-sm"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </PanelCard>
  );
}

// ─── Comparison Materials Panel ─────────────────────────────────────────────

function ComparisonPanel({ materials, utils }: { materials: any[]; utils: any }) {
  const updateMutation = trpc.admin.updateComparisonMaterial.useMutation({
    onSuccess: () => { utils.admin.getConfig.invalidate(); toast.success("Comparison material updated"); },
    onError: (e: any) => toast.error(e.message),
  });
  const createMutation = trpc.admin.createComparisonMaterial.useMutation({
    onSuccess: () => { utils.admin.getConfig.invalidate(); toast.success("Comparison material created"); },
    onError: (e: any) => toast.error(e.message),
  });
  const deleteMutation = trpc.admin.deleteComparisonMaterial.useMutation({
    onSuccess: () => { utils.admin.getConfig.invalidate(); toast.success("Comparison material deleted"); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <PanelCard
      title="Material Comparison"
      description="Manage alternative materials shown in the comparison section (composite, wood, resin stone, etc.)"
      actions={
        <AddDialog
          title="Add Comparison Material"
          fields={[
            { key: "slug", label: "Slug (ID)", placeholder: "e.g. composite" },
            { key: "name", label: "Name", placeholder: "Composite Decking" },
            { key: "description", label: "Description", placeholder: "Material description", multiline: true },
            { key: "materialCostPerSqft", label: "Material Cost ($/sqft)", placeholder: "15.00" },
            { key: "laborCostPerSqft", label: "Labor Cost ($/sqft)", placeholder: "12.00" },
            { key: "annualMaintenanceCostPerSqft", label: "Annual Maintenance ($/sqft)", placeholder: "0.50" },
            { key: "lifespanYears", label: "Lifespan (years)", placeholder: "25", type: "number" },
            { key: "warrantyYears", label: "Warranty (years)", placeholder: "25", type: "number" },
            { key: "colorHex", label: "Color (hex)", placeholder: "#888888" },
            { key: "sortOrder", label: "Sort Order", placeholder: "1", type: "number" },
          ]}
          onSave={(data) => createMutation.mutate({
            ...data,
            lifespanYears: Number(data.lifespanYears) || 20,
            warrantyYears: Number(data.warrantyYears) || 0,
            sortOrder: Number(data.sortOrder) || 0,
          })}
        />
      }
    >
      <div className="space-y-4">
        {materials.length === 0 && (
          <p className="text-sm text-muted-foreground font-body text-center py-4">No comparison materials yet. Add one to show the comparison section on the calculator.</p>
        )}
        {materials.map((mat) => (
          <ComparisonMaterialRow key={mat.id} material={mat} onUpdate={updateMutation.mutate} onDelete={deleteMutation.mutate} />
        ))}
      </div>
    </PanelCard>
  );
}

function ComparisonMaterialRow({ material, onUpdate, onDelete }: { material: any; onUpdate: any; onDelete: any }) {
  const [name, setName] = useState(material.name);
  const [description, setDescription] = useState(material.description || "");
  const [materialCost, setMaterialCost] = useState(String(material.materialCostPerSqft));
  const [laborCost, setLaborCost] = useState(String(material.laborCostPerSqft));
  const [maintCost, setMaintCost] = useState(String(material.annualMaintenanceCostPerSqft));
  const [lifespan, setLifespan] = useState(String(material.lifespanYears));
  const [warranty, setWarranty] = useState(String(material.warrantyYears));
  const [colorHex, setColorHex] = useState(material.colorHex || "#888888");
  const [isActive, setIsActive] = useState(material.isActive === 1);
  const [showByDefault, setShowByDefault] = useState(material.showByDefault === 1);
  const [sortOrder, setSortOrder] = useState(String(material.sortOrder));
  const [prosText, setProsText] = useState((material.pros || []).join("\n"));
  const [consText, setConsText] = useState((material.cons || []).join("\n"));

  const dirty =
    name !== material.name ||
    description !== (material.description || "") ||
    materialCost !== String(material.materialCostPerSqft) ||
    laborCost !== String(material.laborCostPerSqft) ||
    maintCost !== String(material.annualMaintenanceCostPerSqft) ||
    lifespan !== String(material.lifespanYears) ||
    warranty !== String(material.warrantyYears) ||
    colorHex !== (material.colorHex || "#888888") ||
    isActive !== (material.isActive === 1) ||
    showByDefault !== (material.showByDefault === 1) ||
    sortOrder !== String(material.sortOrder) ||
    prosText !== (material.pros || []).join("\n") ||
    consText !== (material.cons || []).join("\n");

  const handleSave = () => {
    const data: any = { id: material.id };
    if (name !== material.name) data.name = name;
    if (description !== (material.description || "")) data.description = description;
    if (materialCost !== String(material.materialCostPerSqft)) data.materialCostPerSqft = materialCost;
    if (laborCost !== String(material.laborCostPerSqft)) data.laborCostPerSqft = laborCost;
    if (maintCost !== String(material.annualMaintenanceCostPerSqft)) data.annualMaintenanceCostPerSqft = maintCost;
    if (lifespan !== String(material.lifespanYears)) data.lifespanYears = Number(lifespan);
    if (warranty !== String(material.warrantyYears)) data.warrantyYears = Number(warranty);
    if (colorHex !== (material.colorHex || "#888888")) data.colorHex = colorHex;
    if (isActive !== (material.isActive === 1)) data.isActive = isActive ? 1 : 0;
    if (showByDefault !== (material.showByDefault === 1)) data.showByDefault = showByDefault ? 1 : 0;
    if (sortOrder !== String(material.sortOrder)) data.sortOrder = Number(sortOrder);
    if (prosText !== (material.pros || []).join("\n")) data.pros = prosText.split("\n").filter(Boolean);
    if (consText !== (material.cons || []).join("\n")) data.cons = consText.split("\n").filter(Boolean);
    onUpdate(data);
  };

  return (
    <div className="border border-border/40 rounded-lg p-4">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded-full border border-border" style={{ backgroundColor: colorHex }} />
          <span className="text-xs font-mono bg-sandstone/50 px-2 py-0.5 rounded">{material.slug}</span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Active</span>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>
          <div className="flex items-center gap-2 ml-2">
            <span className="text-xs text-muted-foreground">Show by Default</span>
            <Switch checked={showByDefault} onCheckedChange={setShowByDefault} />
          </div>
        </div>
        <div className="flex items-center gap-1">
          {dirty && (
            <Button size="sm" className="bg-canyon hover:bg-canyon-light text-white h-7 text-xs" onClick={handleSave}>
              <Save className="w-3 h-3 mr-1" /> Save
            </Button>
          )}
          <ConfirmDelete name={material.name} onConfirm={() => onDelete({ id: material.id })} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div>
          <label className="text-[10px] font-body text-muted-foreground">Name</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} className="h-7 text-xs" />
        </div>
        <div>
          <label className="text-[10px] font-body text-muted-foreground">Material $/sqft</label>
          <Input value={materialCost} onChange={(e) => setMaterialCost(e.target.value)} className="h-7 text-xs" />
        </div>
        <div>
          <label className="text-[10px] font-body text-muted-foreground">Labor $/sqft</label>
          <Input value={laborCost} onChange={(e) => setLaborCost(e.target.value)} className="h-7 text-xs" />
        </div>
        <div>
          <label className="text-[10px] font-body text-muted-foreground">Annual Maint. $/sqft</label>
          <Input value={maintCost} onChange={(e) => setMaintCost(e.target.value)} className="h-7 text-xs" />
        </div>
        <div>
          <label className="text-[10px] font-body text-muted-foreground">Lifespan (years)</label>
          <Input type="number" value={lifespan} onChange={(e) => setLifespan(e.target.value)} className="h-7 text-xs" />
        </div>
        <div>
          <label className="text-[10px] font-body text-muted-foreground">Warranty (years)</label>
          <Input type="number" value={warranty} onChange={(e) => setWarranty(e.target.value)} className="h-7 text-xs" />
        </div>
        <div>
          <label className="text-[10px] font-body text-muted-foreground">Color Hex</label>
          <div className="flex gap-1">
            <Input value={colorHex} onChange={(e) => setColorHex(e.target.value)} className="h-7 text-xs" />
            <input type="color" value={colorHex} onChange={(e) => setColorHex(e.target.value)} className="w-7 h-7 rounded border border-border cursor-pointer" />
          </div>
        </div>
        <div>
          <label className="text-[10px] font-body text-muted-foreground">Sort Order</label>
          <Input type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="h-7 text-xs" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
        <div>
          <label className="text-[10px] font-body text-muted-foreground">Description</label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="text-xs min-h-[60px]" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] font-body text-muted-foreground">Pros (one per line)</label>
            <Textarea value={prosText} onChange={(e) => setProsText(e.target.value)} className="text-xs min-h-[60px]" placeholder="Lower upfront cost\nWidely available" />
          </div>
          <div>
            <label className="text-[10px] font-body text-muted-foreground">Cons (one per line)</label>
            <Textarea value={consText} onChange={(e) => setConsText(e.target.value)} className="text-xs min-h-[60px]" placeholder="Requires staining\nShorter lifespan" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Demo & Rebuild Generic Panel ───────────────────────────────────────────

interface DemoField {
  key: string;
  label: string;
  type: "text" | "textarea" | "number" | "toggle" | "cost-margin-price";
  /** For cost-margin-price: the cost field key */
  costKey?: string;
  /** For cost-margin-price: the margin % field key */
  marginKey?: string;
  /** For cost-margin-price: the computed price field key */
  priceKey?: string;
}

function DemoRebuildGenericPanel({ title, description, items, fields, createMutation, updateMutation, deleteMutation, createDefaults, utils }: {
  title: string;
  description: string;
  items: any[];
  fields: DemoField[];
  createMutation: string;
  updateMutation: string;
  deleteMutation: string;
  createDefaults: Record<string, any>;
  utils: any;
}) {
  const createMut = (trpc.admin as any)[createMutation].useMutation({
    onSuccess: () => { utils.admin.getConfig.invalidate(); toast.success("Created"); },
    onError: (e: any) => toast.error(e.message),
  });
  const updateMut = (trpc.admin as any)[updateMutation].useMutation({
    onSuccess: () => { utils.admin.getConfig.invalidate(); toast.success("Updated"); },
    onError: (e: any) => toast.error(e.message),
  });
  const deleteMut = (trpc.admin as any)[deleteMutation].useMutation({
    onSuccess: () => { utils.admin.getConfig.invalidate(); toast.success("Deleted"); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <PanelCard
      title={title}
      description={description}
      actions={
        <Button
          size="sm"
          className="bg-canyon hover:bg-canyon-light text-white h-7 text-xs"
          onClick={() => createMut.mutate(createDefaults)}
          disabled={createMut.isPending}
        >
          <Plus className="w-3 h-3 mr-1" /> Add
        </Button>
      }
    >
      <div className="space-y-4">
        {items.length === 0 && (
          <p className="text-sm text-muted-foreground font-body text-center py-4">No items yet. Click Add to create one.</p>
        )}
        {items.map((item) => (
          <DemoRebuildItemRow
            key={item.id}
            item={item}
            fields={fields}
            onUpdate={(data: any) => updateMut.mutate({ id: item.id, ...data })}
            onDelete={() => deleteMut.mutate({ id: item.id })}
          />
        ))}
      </div>
    </PanelCard>
  );
}

function DemoRebuildItemRow({ item, fields, onUpdate, onDelete }: {
  item: any;
  fields: DemoField[];
  onUpdate: (data: any) => void;
  onDelete: () => void;
}) {
  // Collect all field keys including cost-margin-price sub-keys
  const [values, setValues] = useState<Record<string, any>>(() => {
    const v: Record<string, any> = {};
    for (const f of fields) {
      if (f.type === "cost-margin-price") {
        v[f.costKey!] = item[f.costKey!] ?? "0.00";
        v[f.marginKey!] = item[f.marginKey!] ?? "35.00";
        v[f.priceKey!] = item[f.priceKey!] ?? "0.00";
      } else {
        v[f.key] = item[f.key] ?? "";
      }
    }
    return v;
  });

  const dirty = fields.some(f => {
    if (f.type === "toggle") return (values[f.key] ? 1 : 0) !== (item[f.key] ?? 0);
    if (f.type === "cost-margin-price") {
      return String(values[f.costKey!] ?? "") !== String(item[f.costKey!] ?? "")
        || String(values[f.marginKey!] ?? "") !== String(item[f.marginKey!] ?? "")
        || String(values[f.priceKey!] ?? "") !== String(item[f.priceKey!] ?? "");
    }
    return String(values[f.key] ?? "") !== String(item[f.key] ?? "");
  });

  // Auto-compute price when cost or margin changes
  const handleCostMarginChange = (costKey: string, marginKey: string, priceKey: string, field: "cost" | "margin", val: string) => {
    setValues(prev => {
      const newVals = { ...prev, [field === "cost" ? costKey : marginKey]: val };
      const cost = parseFloat(field === "cost" ? val : prev[costKey]) || 0;
      const mg = parseFloat(field === "margin" ? val : prev[marginKey]) || 0;
      const price = mg >= 0 && mg < 100 ? (cost / (1 - mg / 100)).toFixed(2) : cost.toFixed(2);
      newVals[priceKey] = price;
      return newVals;
    });
  };

  const handleSave = () => {
    const data: any = {};
    for (const f of fields) {
      if (f.type === "toggle") {
        data[f.key] = values[f.key] ? 1 : 0;
      } else if (f.type === "number") {
        data[f.key] = Number(values[f.key]) || 0;
      } else if (f.type === "cost-margin-price") {
        data[f.costKey!] = values[f.costKey!];
        data[f.marginKey!] = values[f.marginKey!];
        data[f.priceKey!] = values[f.priceKey!];
      } else {
        data[f.key] = values[f.key];
      }
    }
    onUpdate(data);
  };

  return (
    <div className="border border-border/40 rounded-lg p-4">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono bg-sandstone/50 px-2 py-0.5 rounded">{item.slug || `#${item.id}`}</span>
          {fields.some(f => f.key === "isActive") && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Active</span>
              <Switch
                checked={!!values.isActive}
                onCheckedChange={(v) => setValues(prev => ({ ...prev, isActive: v }))}
              />
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          {dirty && (
            <Button size="sm" className="bg-canyon hover:bg-canyon-light text-white h-7 text-xs" onClick={handleSave}>
              <Save className="w-3 h-3 mr-1" /> Save
            </Button>
          )}
          <ConfirmDelete name={item.name || item.slug || `Item #${item.id}`} onConfirm={onDelete} />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {fields.filter(f => f.type !== "toggle" && f.type !== "textarea" && f.type !== "cost-margin-price").map(f => (
          <div key={f.key}>
            <label className="text-[10px] font-body text-muted-foreground">{f.label}</label>
            <Input
              value={String(values[f.key] ?? "")}
              onChange={(e) => setValues(prev => ({ ...prev, [f.key]: e.target.value }))}
              type={f.type === "number" ? "number" : "text"}
              className="h-7 text-xs"
            />
          </div>
        ))}
      </div>
      {/* Cost / Margin / Price groups */}
      {fields.filter(f => f.type === "cost-margin-price").map(f => (
        <div key={f.key} className="mt-3 p-3 bg-sandstone/30 rounded-lg border border-border/30">
          <p className="text-[10px] font-body font-semibold text-charcoal uppercase tracking-wider mb-2">{f.label}</p>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[10px] font-body text-muted-foreground">Cost ($)</label>
              <Input
                value={String(values[f.costKey!] ?? "")}
                onChange={(e) => handleCostMarginChange(f.costKey!, f.marginKey!, f.priceKey!, "cost", e.target.value)}
                type="text"
                className="h-7 text-xs"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="text-[10px] font-body text-muted-foreground">Margin %</label>
              <Input
                value={String(values[f.marginKey!] ?? "")}
                onChange={(e) => handleCostMarginChange(f.costKey!, f.marginKey!, f.priceKey!, "margin", e.target.value)}
                type="text"
                className="h-7 text-xs"
                placeholder="35"
              />
            </div>
            <div>
              <label className="text-[10px] font-body text-muted-foreground">Price ($) — auto</label>
              <Input
                value={String(values[f.priceKey!] ?? "")}
                onChange={(e) => setValues(prev => ({ ...prev, [f.priceKey!]: e.target.value }))}
                type="text"
                className="h-7 text-xs bg-sandstone/50"
                placeholder="0.00"
              />
            </div>
          </div>
        </div>
      ))}
      {fields.filter(f => f.type === "textarea").map(f => (
        <div key={f.key} className="mt-3">
          <label className="text-[10px] font-body text-muted-foreground">{f.label}</label>
          <Textarea
            value={String(values[f.key] ?? "")}
            onChange={(e) => setValues(prev => ({ ...prev, [f.key]: e.target.value }))}
            className="text-xs min-h-[60px]"
          />
        </div>
      ))}
    </div>
  );
}

// ─── Generic editable table ──────────────────────────────────────────────────

interface Column {
  key: string;
  label: string;
  width?: string;
  type?: "number";
}

function GenericTable({ items, columns, onUpdate, onDelete }: {
  items: any[];
  columns: Column[];
  onUpdate: (id: number, data: any) => void;
  onDelete: (id: number) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/40">
            {columns.map(col => (
              <th key={col.key} className={`text-left text-[10px] font-body font-medium text-muted-foreground uppercase tracking-wider py-2 px-2 ${col.width || ""}`}>
                {col.label}
              </th>
            ))}
            <th className="w-20 text-right py-2 px-2 text-[10px] font-body font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map(item => (
            <GenericTableRow key={item.id} item={item} columns={columns} onUpdate={onUpdate} onDelete={onDelete} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GenericTableRow({ item, columns, onUpdate, onDelete }: {
  item: any;
  columns: Column[];
  onUpdate: (id: number, data: any) => void;
  onDelete: (id: number) => void;
}) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const v: Record<string, string> = {};
    for (const col of columns) v[col.key] = String(item[col.key] ?? "");
    return v;
  });

  const dirty = columns.some(col => values[col.key] !== String(item[col.key] ?? ""));

  return (
    <tr className="border-b border-border/20 hover:bg-sandstone/20">
      {columns.map(col => (
        <td key={col.key} className={`py-1.5 px-2 ${col.width || ""}`}>
          <Input
            value={values[col.key]}
            onChange={(e) => setValues(prev => ({ ...prev, [col.key]: e.target.value }))}
            type={col.type === "number" ? "number" : "text"}
            className="h-7 text-xs border-transparent hover:border-border focus:border-border bg-transparent"
          />
        </td>
      ))}
      <td className="py-1.5 px-2 text-right">
        <div className="flex justify-end gap-1">
          {dirty && (
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-canyon hover:text-canyon-light" onClick={() => {
              const data: any = {};
              for (const col of columns) {
                if (values[col.key] !== String(item[col.key] ?? "")) {
                  data[col.key] = col.type === "number" ? Number(values[col.key]) : values[col.key];
                }
              }
              onUpdate(item.id, data);
            }}>
              <Save className="w-3.5 h-3.5" />
            </Button>
          )}
          <ConfirmDelete name={item.name || item.slug} onConfirm={() => onDelete(item.id)} />
        </div>
      </td>
    </tr>
  );
}

// ─── Shared components ───────────────────────────────────────────────────────

function ConfirmDelete({ name, onConfirm }: { name: string; onConfirm: () => void }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive">
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete "{name}"?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">This action cannot be undone. This will permanently delete this item from the calculator.</p>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <DialogClose asChild>
            <Button variant="destructive" onClick={onConfirm}>Delete</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface FieldDef {
  key: string;
  label: string;
  placeholder?: string;
  type?: "number" | "select";
  multiline?: boolean;
  options?: { value: string; label: string }[];
}

function AddDialog({ title, fields, onSave }: { title: string; fields: FieldDef[]; onSave: (data: any) => void }) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [open, setOpen] = useState(false);

  const handleSave = () => {
    onSave(values);
    setValues({});
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-canyon hover:bg-canyon-light text-white h-7 text-xs">
          <Plus className="w-3 h-3 mr-1" /> Add
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          {fields.map(f => (
            <div key={f.key}>
              <label className="text-xs font-body font-medium text-charcoal mb-1 block">{f.label}</label>
              {f.type === "select" && f.options ? (
                <select
                  className="w-full border border-border rounded px-3 py-1.5 text-sm bg-white"
                  value={values[f.key] || ""}
                  onChange={(e) => setValues(prev => ({ ...prev, [f.key]: e.target.value }))}
                >
                  <option value="">Select...</option>
                  {f.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              ) : f.multiline ? (
                <Textarea
                  placeholder={f.placeholder}
                  value={values[f.key] || ""}
                  onChange={(e) => setValues(prev => ({ ...prev, [f.key]: e.target.value }))}
                  className="text-sm"
                />
              ) : (
                <Input
                  type={f.type === "number" ? "number" : "text"}
                  placeholder={f.placeholder}
                  value={values[f.key] || ""}
                  onChange={(e) => setValues(prev => ({ ...prev, [f.key]: e.target.value }))}
                  className="h-8 text-sm"
                />
              )}
            </div>
          ))}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button className="bg-canyon hover:bg-canyon-light text-white" onClick={handleSave}>Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Product Settings Panel ──────────────────────────────────────────────────

function ProductSettingsPanel({ settings, utils }: { settings: any[]; utils: any }) {
  const updateMutation = trpc.admin.updateProductSetting.useMutation({
    onSuccess: () => { utils.admin.getConfig.invalidate(); toast.success("Setting updated"); },
    onError: (e: any) => toast.error(e.message),
  });

  // Group settings by productType
  const grouped = settings.reduce((acc: Record<string, any[]>, s: any) => {
    const key = s.productType || "general";
    if (!acc[key]) acc[key] = [];
    acc[key].push(s);
    return acc;
  }, {});

  const productLabels: Record<string, string> = {
    resin_rock: "Resin Rock",
    duradek: "Duradek",
    tiledek: "Tiledek",
    general: "General",
  };

  return (
    <PanelCard
      title="Product Settings"
      description="Manage pricing and configuration for each product type"
    >
      <div className="space-y-6">
        {Object.entries(grouped).map(([productType, items]) => (
          <div key={productType}>
            <h3 className="text-sm font-display text-charcoal mb-3 border-b border-border/40 pb-2">
              {productLabels[productType] || productType}
            </h3>
            <div className="space-y-2">
              {(items as any[]).map((setting: any) => (
                <ProductSettingRow
                  key={setting.id}
                  setting={setting}
                  onUpdate={(val) => updateMutation.mutate({ id: setting.id, settingValue: val })}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </PanelCard>
  );
}

function ProductSettingRow({ setting, onUpdate }: { setting: any; onUpdate: (val: string) => void }) {
  const [value, setValue] = useState(setting.settingValue || "");
  const dirty = value !== (setting.settingValue || "");

  useEffect(() => {
    setValue(setting.settingValue || "");
  }, [setting.settingValue]);

  return (
    <div className="flex items-center gap-3 p-2 rounded hover:bg-sandstone/20">
      <div className="flex-1 min-w-0">
        <div className="text-xs font-body font-medium text-charcoal">{setting.label || setting.settingKey}</div>
        {setting.description && <div className="text-[10px] text-muted-foreground">{setting.description}</div>}
      </div>
      <div className="flex items-center gap-2">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="h-7 text-xs w-32"
        />
        {dirty && (
          <Button size="sm" className="bg-canyon hover:bg-canyon-light text-white h-7 text-xs" onClick={() => onUpdate(value)}>
            <Save className="w-3 h-3 mr-1" /> Save
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Rain Escape Options Panel ───────────────────────────────────────────────

function RainEscapePanel({ options, utils }: { options: any[]; utils: any }) {
  const updateMutation = trpc.admin.updateRainEscapeOption.useMutation({
    onSuccess: () => { utils.admin.getConfig.invalidate(); toast.success("Rain escape option updated"); },
    onError: (e: any) => toast.error(e.message),
  });
  const createMutation = trpc.admin.createRainEscapeOption.useMutation({
    onSuccess: () => { utils.admin.getConfig.invalidate(); toast.success("Rain escape option created"); },
    onError: (e: any) => toast.error(e.message),
  });
  const deleteMutation = trpc.admin.deleteRainEscapeOption.useMutation({
    onSuccess: () => { utils.admin.getConfig.invalidate(); toast.success("Rain escape option deleted"); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <PanelCard
      title="Appalachian: Rain Escape Options"
      description="Trex RainEscape under-deck drainage system with concealed gutter — only shown for Appalachian collection"
      actions={
        <AddDialog
          title="Add Rain Escape Option"
          fields={[
            { key: "slug", label: "Slug", placeholder: "e.g. standard" },
            { key: "name", label: "Name", placeholder: "Trex RainEscape Standard" },
            { key: "description", label: "Description", placeholder: "Under-deck drainage system..." },
            { key: "systemMaterialCostPerSqft", label: "System Material Cost $/sqft", placeholder: "2.60" },
            { key: "systemInstallCostPerSqft", label: "System Install Cost $/sqft", placeholder: "1.25" },
            { key: "gutterMaterialCostPerLf", label: "Gutter Material Cost $/LF", placeholder: "6.90" },
            { key: "gutterInstallCostPerLf", label: "Gutter Install Cost $/LF", placeholder: "1.25" },
            { key: "marginPct", label: "Margin %", placeholder: "35" },
            { key: "sortOrder", label: "Sort Order", placeholder: "1", type: "number" },
          ]}
          onSave={(data) => createMutation.mutate({ ...data, sortOrder: Number(data.sortOrder) || 0 })}
        />
      }
    >
      <GenericTable
        items={options}
        columns={[
          { key: "slug", label: "Slug", width: "w-28" },
          { key: "name", label: "Name" },
          { key: "systemMaterialCostPerSqft", label: "Sys Mat $/sqft", width: "w-28" },
          { key: "systemInstallCostPerSqft", label: "Sys Install $/sqft", width: "w-28" },
          { key: "gutterMaterialCostPerLf", label: "Gutter Mat $/LF", width: "w-28" },
          { key: "gutterInstallCostPerLf", label: "Gutter Install $/LF", width: "w-28" },
          { key: "marginPct", label: "Margin %", width: "w-20" },
          { key: "description", label: "Description" },
          { key: "sortOrder", label: "Order", width: "w-16", type: "number" },
          { key: "isActive", label: "Active", width: "w-16", type: "number" },
        ]}
        onUpdate={(id, data) => updateMutation.mutate({ id, ...data })}
        onDelete={(id) => deleteMutation.mutate({ id })}
      />
    </PanelCard>
  );
}

// ─── Soffit Materials Panel ───────────────────────────────────────────────────

function SoffitPanel({ materials, utils }: { materials: any[]; utils: any }) {
  const updateMutation = trpc.admin.updateSoffitMaterial.useMutation({
    onSuccess: () => { utils.admin.getConfig.invalidate(); toast.success("Soffit material updated"); },
    onError: (e: any) => toast.error(e.message),
  });
  const createMutation = trpc.admin.createSoffitMaterial.useMutation({
    onSuccess: () => { utils.admin.getConfig.invalidate(); toast.success("Soffit material created"); },
    onError: (e: any) => toast.error(e.message),
  });
  const deleteMutation = trpc.admin.deleteSoffitMaterial.useMutation({
    onSuccess: () => { utils.admin.getConfig.invalidate(); toast.success("Soffit material deleted"); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <PanelCard
      title="Appalachian: Soffit Materials"
      description="Optional soffit finish materials for the underside of the deck when RainEscape is installed"
      actions={
        <AddDialog
          title="Add Soffit Material"
          fields={[
            { key: "slug", label: "Slug", placeholder: "e.g. tongue-groove-wood" },
            { key: "name", label: "Name", placeholder: "Tongue & Groove Wood" },
            { key: "description", label: "Description", placeholder: "Natural cedar or pine T&G boards..." },
            { key: "materialCostPerSqft", label: "Material Cost $/sqft", placeholder: "4.50" },
            { key: "installCostPerSqft", label: "Install Cost $/sqft", placeholder: "3.00" },
            { key: "marginPct", label: "Margin %", placeholder: "35" },
            { key: "sortOrder", label: "Sort Order", placeholder: "1", type: "number" },
          ]}
          onSave={(data) => createMutation.mutate({ ...data, sortOrder: Number(data.sortOrder) || 0 })}
        />
      }
    >
      <GenericTable
        items={materials}
        columns={[
          { key: "slug", label: "Slug", width: "w-28" },
          { key: "name", label: "Name" },
          { key: "materialCostPerSqft", label: "Mat. Cost $/sqft", width: "w-28" },
          { key: "installCostPerSqft", label: "Install Cost $/sqft", width: "w-28" },
          { key: "marginPct", label: "Margin %", width: "w-20" },
          { key: "pricePerSqft", label: "Customer $/sqft", width: "w-28" },
          { key: "description", label: "Description" },
          { key: "sortOrder", label: "Order", width: "w-16", type: "number" },
          { key: "isActive", label: "Active", width: "w-16", type: "number" },
        ]}
        onUpdate={(id, data) => updateMutation.mutate({ id, ...data })}
        onDelete={(id) => deleteMutation.mutate({ id })}
      />
    </PanelCard>
  );
}

// ─── A Steel Jacket Panel ───────────────────────────────────────────────────────

function SteelJacketPanel({ options, utils }: { options: any[]; utils: any }) {
  const updateMutation = trpc.admin.updateSteelJacketOption.useMutation({
    onSuccess: () => { utils.admin.getConfig.invalidate(); toast.success("Steel Jacket option updated"); },
    onError: (e: any) => toast.error(e.message),
  });
  const createMutation = trpc.admin.createSteelJacketOption.useMutation({
    onSuccess: () => { utils.admin.getConfig.invalidate(); toast.success("Steel Jacket option created"); },
    onError: (e: any) => toast.error(e.message),
  });
  const deleteMutation = trpc.admin.deleteSteelJacketOption.useMutation({
    onSuccess: () => { utils.admin.getConfig.invalidate(); toast.success("Steel Jacket option deleted"); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <PanelCard
      title="Appalachian: A Steel Jacket Waterproofing"
      description="Steel panel under-deck waterproofing system — only shown for Appalachian collection. Set material cost, install cost, margin, and customer price per sqft."
      actions={
        <AddDialog
          title="Add Steel Jacket Option"
          fields={[
            { key: "slug", label: "Slug", placeholder: "e.g. steel-jacket-standard" },
            { key: "name", label: "Name", placeholder: "A Steel Jacket Standard" },
            { key: "description", label: "Description", placeholder: "Steel panel waterproofing system..." },
            { key: "materialCostPerSqft", label: "Material Cost $/sqft", placeholder: "6.00" },
            { key: "installCostPerSqft", label: "Install Cost $/sqft", placeholder: "4.00" },
            { key: "marginPct", label: "Margin %", placeholder: "35" },
            { key: "pricePerSqft", label: "Customer Price $/sqft (overrides cost+margin)", placeholder: "15.00" },
            { key: "sortOrder", label: "Sort Order", placeholder: "1", type: "number" },
          ]}
          onSave={(data) => createMutation.mutate({
            slug: data.slug,
            name: data.name,
            description: data.description,
            materialCostPerSqft: data.materialCostPerSqft || "0",
            installCostPerSqft: data.installCostPerSqft || "0",
            marginPct: data.marginPct || "35",
            pricePerSqft: data.pricePerSqft || "0",
            sortOrder: Number(data.sortOrder) || 0,
          })}
        />
      }
    >
      <GenericTable
        items={options}
        columns={[
          { key: "slug", label: "Slug", width: "w-28" },
          { key: "name", label: "Name" },
          { key: "materialCostPerSqft", label: "Mat. Cost $/sqft", width: "w-28" },
          { key: "installCostPerSqft", label: "Install Cost $/sqft", width: "w-28" },
          { key: "marginPct", label: "Margin %", width: "w-20" },
          { key: "pricePerSqft", label: "Customer $/sqft", width: "w-28" },
          { key: "description", label: "Description" },
          { key: "sortOrder", label: "Order", width: "w-16", type: "number" },
          { key: "isActive", label: "Active", width: "w-16", type: "number" },
        ]}
        onUpdate={(id, data) => updateMutation.mutate({ id, ...data })}
        onDelete={(id) => deleteMutation.mutate({ id })}
      />
    </PanelCard>
  );
}

// ─── Install Slots Panel ──────────────────────────────────────────────────────

function InstallSlotsPanel({ utils }: { utils: any }) {
  const { data: slots, isLoading } = trpc.installSlots.getAll.useQuery();
  const createMutation = trpc.installSlots.create.useMutation({
    onSuccess: () => { utils.installSlots.getAll.invalidate(); utils.installSlots.getAvailable.invalidate(); toast.success("Install slot created"); },
    onError: (e: any) => toast.error(e.message),
  });
  const updateMutation = trpc.installSlots.update.useMutation({
    onSuccess: () => { utils.installSlots.getAll.invalidate(); utils.installSlots.getAvailable.invalidate(); toast.success("Slot updated"); },
    onError: (e: any) => toast.error(e.message),
  });
  const deleteMutation = trpc.installSlots.delete.useMutation({
    onSuccess: () => { utils.installSlots.getAll.invalidate(); utils.installSlots.getAvailable.invalidate(); toast.success("Slot deleted"); },
    onError: (e: any) => toast.error(e.message),
  });

  const [newLabel, setNewLabel] = useState("");
  const [newStart, setNewStart] = useState("");
  const [newEnd, setNewEnd] = useState("");
  const [newOrder, setNewOrder] = useState(0);

  function handleCreate() {
    if (!newLabel.trim() || !newStart || !newEnd) { toast.error("Label, start date, and end date are required"); return; }
    createMutation.mutate({ label: newLabel.trim(), startDate: newStart, endDate: newEnd, isAvailable: 1, sortOrder: newOrder });
    setNewLabel(""); setNewStart(""); setNewEnd(""); setNewOrder(0);
  }

  return (
    <PanelCard
      title="Available Install Dates"
      description="Manage upcoming install slots shown in the calculator to create urgency. Only slots marked Available will appear to customers."
    >
      {/* Add new slot form */}
      <div className="bg-muted/30 rounded-lg p-4 mb-6 space-y-3">
        <p className="text-sm font-semibold text-foreground">Add New Install Slot</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Label</label>
            <Input value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="e.g. Week of May 12" className="h-8 text-sm" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Start Date</label>
            <Input type="date" value={newStart} onChange={e => setNewStart(e.target.value)} className="h-8 text-sm" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">End Date</label>
            <Input type="date" value={newEnd} onChange={e => setNewEnd(e.target.value)} className="h-8 text-sm" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Sort Order</label>
            <Input type="number" value={newOrder} onChange={e => setNewOrder(Number(e.target.value))} className="h-8 text-sm" />
          </div>
        </div>
        <Button size="sm" onClick={handleCreate} disabled={createMutation.isPending} className="gap-1.5">
          {createMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
          Add Slot
        </Button>
      </div>

      {/* Slots list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : !slots?.length ? (
        <div className="text-center py-8 text-muted-foreground font-body text-sm">No install slots yet. Add your first available week above.</div>
      ) : (
        <div className="space-y-2">
          {slots.map(slot => (
            <div key={slot.id} className="flex items-center gap-3 p-3 rounded-lg border border-border/60 bg-white hover:bg-muted/20 transition-colors">
              <CalendarDays className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{slot.label}</p>
                <p className="text-xs text-muted-foreground">{slot.startDate} – {slot.endDate} · Order: {slot.sortOrder}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ slot.isAvailable ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700" }`}>
                  {slot.isAvailable ? "Available" : "Booked"}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => updateMutation.mutate({ id: slot.id, isAvailable: slot.isAvailable ? 0 : 1 })}
                  disabled={updateMutation.isPending}
                >
                  {slot.isAvailable ? "Mark Booked" : "Mark Available"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                  onClick={() => deleteMutation.mutate({ id: slot.id })}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </PanelCard>
  );
}

// ─── Orders Panel ─────────────────────────────────────────────────────────────

function OrdersPanel({ utils }: { utils: ReturnType<typeof trpc.useUtils> }) {
  const { data: orders, isLoading } = trpc.orders.getAll.useQuery();
  const [pricingFilter, setPricingFilter] = useState<"all" | "builder" | "retail">("all");

  /** Detect builder pricing from the stored estimateSnapshot JSON */
  function isBuilderOrder(order: any): boolean {
    try {
      const snap = JSON.parse(order.estimateSnapshot);
      return ((snap.builderMaterialDiscount ?? 0) > 0) || ((snap.builderLaborDiscount ?? 0) > 0);
    } catch {
      return false;
    }
  }

  const filteredOrders = (orders ?? []).filter((order) => {
    if (pricingFilter === "builder") return isBuilderOrder(order);
    if (pricingFilter === "retail") return !isBuilderOrder(order);
    return true;
  });

  const builderCount = (orders ?? []).filter(isBuilderOrder).length;
  const retailCount = (orders ?? []).length - builderCount;

  const sendBalanceMutation = trpc.orders.sendBalanceLink.useMutation({
    onSuccess: (data) => {
      toast.success("Balance payment link generated!");
      navigator.clipboard.writeText(data.balanceUrl).catch(() => {});
    },
    onError: () => toast.error("Failed to generate balance link"),
  });

  function statusBadge(status: string) {
    const colors: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800",
      deposit_paid: "bg-blue-100 text-blue-800",
      fully_paid: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800",
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${colors[status] || "bg-gray-100 text-gray-700"}`}>
        {status.replace("_", " ")}
      </span>
    );
  }

  return (
    <PanelCard
      title="Customer Orders"
      description="View submitted orders, contract signatures, and payment status"
    >
      {/* Pricing type filter */}
      {!isLoading && (orders?.length ?? 0) > 0 && (
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span className="text-xs text-muted-foreground font-body mr-1">Filter:</span>
          {([
            { value: "all", label: `All (${orders?.length ?? 0})` },
            { value: "retail", label: `Retail (${retailCount})` },
            { value: "builder", label: `Builder (${builderCount})` },
          ] as const).map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setPricingFilter(value)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                pricingFilter === value
                  ? value === "builder"
                    ? "bg-amber-600 text-white border-amber-600"
                    : "bg-foreground text-background border-foreground"
                  : "border-border hover:bg-muted"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      {isLoading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : !orders?.length ? (
        <div className="text-center py-10 text-muted-foreground font-body">
          No orders yet. Orders will appear here when customers complete the Order Material flow.
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground font-body">
          No {pricingFilter === "builder" ? "builder" : "retail"} orders found.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm font-body">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 pr-3 font-medium">ID</th>
                <th className="pb-2 pr-3 font-medium">Customer</th>
                <th className="pb-2 pr-3 font-medium">Product</th>
                <th className="pb-2 pr-3 font-medium">Total</th>
                <th className="pb-2 pr-3 font-medium">Deposit</th>
                <th className="pb-2 pr-3 font-medium">Balance</th>
                <th className="pb-2 pr-3 font-medium">Status</th>
                <th className="pb-2 pr-3 font-medium">Signed</th>
                <th className="pb-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => (
                <tr key={order.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="py-2 pr-3 text-muted-foreground">#{order.id}</td>
                  <td className="py-2 pr-3">
                    <div className="font-medium text-charcoal">{order.customerName}</div>
                    <div className="text-xs text-muted-foreground">{order.customerEmail}</div>
                    {order.customerPhone && <div className="text-xs text-muted-foreground">{order.customerPhone}</div>}
                  </td>
                  <td className="py-2 pr-3">
                    <div className="flex items-center gap-1.5">
                      <span>{order.collectionName || order.productType}</span>
                      {isBuilderOrder(order) && (
                        <span className="text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-300 px-1.5 py-0.5 rounded-full leading-none">
                          Builder
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">{order.sqft} sq ft</div>
                    {(() => {
                      try {
                        const snap = JSON.parse(order.estimateSnapshot);
                        if ((snap.postWrapCost ?? 0) > 0 && snap.postWrapOptionName) {
                          return (
                            <div className="text-xs text-muted-foreground mt-0.5">
                              <span className="font-medium text-foreground/70">Wrap:</span> {snap.postWrapOptionName}
                              {snap.postWrapPostPieces?.length > 0 && (
                                <span className="ml-1">({snap.postWrapPostPieces.map((p: any) => `${p.count}×${p.lengthFt}'`).join(', ')} posts</span>
                              )}
                              {snap.postWrapBeamPieces?.length > 0 && (
                                <span>, {snap.postWrapBeamPieces.map((p: any) => `${p.count}×${p.lengthFt}'`).join(', ')} beams)</span>
                              )}
                              {snap.postWrapPostPieces?.length > 0 && !snap.postWrapBeamPieces?.length && <span>)</span>}
                            </div>
                          );
                        }
                      } catch { return null; }
                      return null;
                    })()}
                  </td>
                  <td className="py-2 pr-3 font-semibold">${Number(order.grandTotal).toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                  <td className="py-2 pr-3 text-blue-700">${Number(order.depositAmount).toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                  <td className="py-2 pr-3 text-amber-700">${Number(order.balanceAmount).toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                  <td className="py-2 pr-3">{statusBadge(order.paymentStatus)}</td>
                  <td className="py-2 pr-3">
                    {order.signedName ? (
                      <span className="text-green-600 text-xs">✓ {order.signedName}</span>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </td>
                  <td className="py-2">
                    {order.paymentStatus === "deposit_paid" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs gap-1"
                        disabled={sendBalanceMutation.isPending}
                        onClick={() => sendBalanceMutation.mutate({ orderId: order.id, origin: window.location.origin })}
                      >
                        <Copy className="w-3 h-3" />
                        Balance Link
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PanelCard>
  );
}

// ─── Brochure Requests Panel ──────────────────────────────────────────────────

function BrochureRequestsPanel({ utils }: { utils: ReturnType<typeof trpc.useUtils> }) {
  const { data: requests, isLoading } = trpc.brochure.getAll.useQuery();

  return (
    <PanelCard
      title="Brochure Requests"
      description="Leads who requested a brochure — sent to Zapier → Go High Level"
    >
      {isLoading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : !requests?.length ? (
        <div className="text-center py-10 text-muted-foreground font-body">
          No brochure requests yet.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm font-body">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 pr-3 font-medium">Name</th>
                <th className="pb-2 pr-3 font-medium">Email</th>
                <th className="pb-2 pr-3 font-medium">Phone</th>
                <th className="pb-2 pr-3 font-medium">Zapier</th>
                <th className="pb-2 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="py-2 pr-3 font-medium text-charcoal">{r.name}</td>
                  <td className="py-2 pr-3 text-muted-foreground">{r.email}</td>
                  <td className="py-2 pr-3 text-muted-foreground">{r.phone || "—"}</td>
                  <td className="py-2 pr-3">
                    {r.sentToZapier ? (
                      <span className="text-green-600 text-xs font-semibold">✓ Sent</span>
                    ) : (
                      <span className="text-amber-600 text-xs">Pending</span>
                    )}
                  </td>
                  <td className="py-2 text-muted-foreground text-xs">
                    {new Date(r.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PanelCard>
  );
}

// ─── Verbiage Panel (with Preview Contract button) ──────────────────────────

function VerbiagePanel({ settings, utils }: { settings: any[]; utils: any }) {
  const [isPreviewing, setIsPreviewing] = useState(false);

  const previewMutation = trpc.admin.previewContract.useMutation({
    onSuccess: (data) => {
      // Decode base64 PDF and open in a new tab
      try {
        const byteChars = atob(data.pdfBase64);
        const byteNums = new Array(byteChars.length);
        for (let i = 0; i < byteChars.length; i++) {
          byteNums[i] = byteChars.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNums);
        const blob = new Blob([byteArray], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        window.open(url, "_blank");
        // Revoke after 60 s
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      } catch {
        toast.error("Failed to open PDF preview");
      }
      setIsPreviewing(false);
    },
    onError: (e: any) => {
      toast.error("Preview failed: " + e.message);
      setIsPreviewing(false);
    },
  });

  // Find the current contract_text value from settings
  const contractSetting = settings.find((s: any) => s.settingKey === "contract_text");
  const contractText = contractSetting?.settingValue || "";

  const handlePreview = () => {
    if (!contractText) {
      toast.error("No contract text found. Save your contract text first.");
      return;
    }
    setIsPreviewing(true);
    previewMutation.mutate({ contractText });
  };

  return (
    <div className="space-y-4">
      {/* Preview button card */}
      <div className="flex items-center justify-between rounded-lg border border-border/40 bg-card px-4 py-3">
        <div>
          <p className="text-sm font-semibold font-body text-charcoal">Contract Preview</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Generate a sample PDF with placeholder values to verify layout and formatting before going live.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="ml-4 shrink-0 gap-1.5"
          onClick={handlePreview}
          disabled={isPreviewing || previewMutation.isPending}
        >
          {isPreviewing || previewMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <FileText className="w-4 h-4" />
          )}
          {isPreviewing || previewMutation.isPending ? "Generating…" : "Preview Contract PDF"}
        </Button>
      </div>

      {/* Standard settings editor */}
      <SettingsPanel settings={settings} category="verbiage" utils={utils} />
    </div>
  );
}

// ─── Corners Waste Rules Panel ────────────────────────────────────────────────

function CornersWastePanel({ rules, utils }: { rules: any[]; utils: any }) {
  const updateMutation = trpc.admin.updateCornersWasteRule.useMutation({
    onSuccess: () => { utils.admin.getConfig.invalidate(); toast.success("Rule updated"); },
    onError: (e: any) => toast.error(e.message),
  });
  const createMutation = trpc.admin.createCornersWasteRule.useMutation({
    onSuccess: () => { utils.admin.getConfig.invalidate(); toast.success("Rule created"); },
    onError: (e: any) => toast.error(e.message),
  });
  const deleteMutation = trpc.admin.deleteCornersWasteRule.useMutation({
    onSuccess: () => { utils.admin.getConfig.invalidate(); toast.success("Rule deleted"); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <PanelCard
      title="Corners / Waste Rules"
      description="Define waste percentages based on the number of corners and whether all angles are 90°. The calculator picks the best matching rule automatically."
      actions={
        <AddDialog
          title="Add Corners Waste Rule"
          fields={[
            { key: "corners", label: "Number of Corners", placeholder: "4", type: "number" },
            { key: "allNinetyDegrees", label: "All 90° (1=yes, 0=no)", placeholder: "1", type: "number" },
            { key: "wastePercent", label: "Waste %", placeholder: "10.00" },
          ]}
          onSave={(data) => createMutation.mutate({
            corners: Number(data.corners) || 0,
            allNinetyDegrees: Number(data.allNinetyDegrees) ?? 1,
            wastePercent: data.wastePercent || "10.00",
          })}
        />
      }
    >
      {rules.length === 0 ? (
        <p className="text-sm text-muted-foreground font-body text-center py-4">No rules yet. Add one to enable corner-based waste calculations.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm font-body">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 pr-4 font-medium">ID</th>
                <th className="pb-2 pr-4 font-medium">Corners</th>
                <th className="pb-2 pr-4 font-medium">All 90°</th>
                <th className="pb-2 pr-4 font-medium">Waste %</th>
                <th className="pb-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => (
                <CornersWasteRuleRow
                  key={rule.id}
                  rule={rule}
                  onUpdate={(data) => updateMutation.mutate({ id: rule.id, ...data })}
                  onDelete={() => deleteMutation.mutate({ id: rule.id })}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PanelCard>
  );
}

function CornersWasteRuleRow({ rule, onUpdate, onDelete }: { rule: any; onUpdate: (d: any) => void; onDelete: () => void }) {
  const [corners, setCorners] = useState(String(rule.corners));
  const [allNinety, setAllNinety] = useState(String(rule.allNinetyDegrees ? 1 : 0));
  const [wastePercent, setWastePercent] = useState(String(rule.wastePercent));

  const dirty = corners !== String(rule.corners) || allNinety !== String(rule.allNinetyDegrees ? 1 : 0) || wastePercent !== String(rule.wastePercent);

  return (
    <tr className="border-b last:border-0 hover:bg-muted/20">
      <td className="py-2 pr-4 text-muted-foreground text-xs">#{rule.id}</td>
      <td className="py-2 pr-4">
        <Input type="number" value={corners} onChange={(e) => setCorners(e.target.value)} className="h-7 text-xs w-20" />
      </td>
      <td className="py-2 pr-4">
        <select
          className="border border-border rounded px-2 py-1 text-xs bg-white h-7"
          value={allNinety}
          onChange={(e) => setAllNinety(e.target.value)}
        >
          <option value="1">Yes</option>
          <option value="0">No</option>
        </select>
      </td>
      <td className="py-2 pr-4">
        <Input value={wastePercent} onChange={(e) => setWastePercent(e.target.value)} className="h-7 text-xs w-24" />
      </td>
      <td className="py-2">
        <div className="flex gap-1">
          {dirty && (
            <Button size="sm" className="bg-canyon hover:bg-canyon-light text-white h-7 text-xs" onClick={() => onUpdate({ corners: Number(corners), allNinetyDegrees: Number(allNinety), wastePercent })}>
              <Save className="w-3 h-3 mr-1" /> Save
            </Button>
          )}
          <ConfirmDelete name={`Rule #${rule.id} (${rule.corners} corners)`} onConfirm={onDelete} />
        </div>
      </td>
    </tr>
  );
}

// ─── Lumber Items Panel ───────────────────────────────────────────────────────
// Margin % formula: displayPrice = costPrice / (1 - margin/100)
// Inverse:          margin = (1 - costPrice/displayPrice) * 100

/** Cost after applying tax: cost × (1 + taxPct/100) */
function costWithTax(cost: number, taxPct: number): number {
  return cost * (1 + (taxPct || 0) / 100);
}
/** Display price from taxed cost and margin: taxedCost / (1 - margin/100) */
function marginToDisplay(cost: number, margin: number, taxPct = 0): string {
  const taxed = costWithTax(cost, taxPct);
  if (margin >= 100 || margin < 0) return taxed.toFixed(2);
  return (taxed / (1 - margin / 100)).toFixed(2);
}
/** Back-compute margin from display price and taxed cost */
function displayToMargin(cost: number, display: number, taxPct = 0): string {
  const taxed = costWithTax(cost, taxPct);
  if (display <= 0 || taxed <= 0) return "0.00";
  return ((1 - taxed / display) * 100).toFixed(2);
}

function LumberItemsPanel({ items, utils }: { items: any[]; utils: any }) {
  const [globalMarginEnabled, setGlobalMarginEnabled] = useState(false);
  const [globalMargin, setGlobalMargin] = useState("40");

  // Add item form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [addName, setAddName] = useState("");
  const [addDescription, setAddDescription] = useState("");
  const [addCategory, setAddCategory] = useState("joist");
  const [addUnit, setAddUnit] = useState("each");
  const [addCostPrice, setAddCostPrice] = useState("");
  const [addTaxPercent, setAddTaxPercent] = useState("8.35");
  const [addMarginPercent, setAddMarginPercent] = useState("40");
  const [addDisplayPrice, setAddDisplayPrice] = useState("");
  const [addPosition, setAddPosition] = useState<"bottom" | number>("bottom"); // "bottom" or sortOrder of item to insert after

  const updateMutation = trpc.admin.updateLumberItem.useMutation({
    onSuccess: () => { utils.admin.getConfig.invalidate(); toast.success("Lumber item updated"); },
    onError: (e: any) => toast.error(e.message),
  });
  const createMutation = trpc.admin.createLumberItem.useMutation({
    onSuccess: () => {
      utils.admin.getConfig.invalidate();
      toast.success("Lumber item created");
      setShowAddForm(false);
      setAddName(""); setAddDescription(""); setAddCostPrice(""); setAddTaxPercent("8.35"); setAddMarginPercent("40"); setAddDisplayPrice(""); setAddPosition("bottom");
    },
    onError: (e: any) => toast.error(e.message),
  });
  const deleteMutation = trpc.admin.deleteLumberItem.useMutation({
    onSuccess: () => { utils.admin.getConfig.invalidate(); toast.success("Lumber item deleted"); },
    onError: (e: any) => toast.error(e.message),
  });

  const [syncResults, setSyncResults] = useState<any[] | null>(null);
  const syncMutation = trpc.admin.syncLumberPrices.useMutation({
    onSuccess: (data) => {
      utils.admin.getConfig.invalidate();
      setSyncResults(data.results);
      toast.success(`Home Depot sync complete: ${data.succeeded}/${data.total} items updated`);
    },
    onError: (e: any) => toast.error(`Sync failed: ${e.message}`),
  });

  // Apply global margin to all active items
  const handleApplyGlobalMargin = () => {
    const mg = parseFloat(globalMargin);
    if (isNaN(mg) || mg < 0 || mg >= 100) { toast.error("Enter a valid margin % (0–99)"); return; }
    const activeItems = items.filter((i: any) => i.isActive === 1);
    if (activeItems.length === 0) { toast.error("No active items to update"); return; }
    let count = 0;
    for (const item of activeItems) {
      const cost = parseFloat(item.costPrice) || 0;
      const tax = parseFloat(item.taxPercent) || 8.35;
      const newDisplay = marginToDisplay(cost, mg, tax);
      const newMultiplier = mg < 100 ? (1 / (1 - mg / 100)).toFixed(3) : "1.000";
      updateMutation.mutate({ id: item.id, name: item.name, unit: item.unit, category: item.category,
        costPrice: item.costPrice, taxPercent: String(tax), markupMultiplier: newMultiplier, displayPrice: newDisplay,
        sortOrder: item.sortOrder, isActive: item.isActive });
      count++;
    }
    toast.success(`Applied ${mg}% margin to ${count} items`);
  };

  const handleAddSubmit = () => {
    if (!addName.trim()) { toast.error("Name is required"); return; }
    const cost = parseFloat(addCostPrice) || 0;
    const tax = parseFloat(addTaxPercent) || 8.35;
    const mg = parseFloat(addMarginPercent) || 0;
    const display = addDisplayPrice || marginToDisplay(cost, mg, tax);
    const multiplier = mg < 100 ? (1 / (1 - mg / 100)).toFixed(3) : "1.000";
    createMutation.mutate({
      name: addName.trim(),
      description: addDescription || undefined,
      category: addCategory,
      unit: addUnit,
      costPrice: cost.toFixed(2),
      taxPercent: tax.toFixed(2),
      markupMultiplier: multiplier,
      displayPrice: display,
      isActive: 1,
      insertAfterSortOrder: addPosition === "bottom" ? undefined : addPosition as number,
    });
  };

  const CATEGORIES = ["joist", "hanger", "rimboard", "beam", "hardware", "fastener", "other"];
  const UNITS = ["each", "lf", "sf", "box", "bundle", "lb"];

  // Group by category for display (sorted by sortOrder within each group)
  const grouped = items.reduce((acc: Record<string, any[]>, item: any) => {
    const cat = item.category || "other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});
  // Sort each category by sortOrder
  for (const cat of Object.keys(grouped)) {
    grouped[cat].sort((a: any, b: any) => a.sortOrder - b.sortOrder);
  }

  // Items in the selected add-category for position picker
  const categoryItemsForPosition = (grouped[addCategory] || []) as any[];

  return (
    <PanelCard
      title="Lumber Package Items"
      description="Manage individual lumber and hardware items. Set cost price and margin % — display price is computed automatically. Margin = (Price − Cost) ÷ Price × 100."
      actions={
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs border-green-600 text-green-700 hover:bg-green-50"
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
          >
            {syncMutation.isPending ? (
              <><span className="animate-spin mr-1">⟳</span> Syncing…</>
            ) : (
              <><span className="mr-1">🏪</span> Sync from Home Depot</>
            )}
          </Button>
          <Button size="sm" className="bg-canyon hover:bg-canyon-light text-white h-8 text-xs" onClick={() => setShowAddForm(v => !v)}>
            <Plus className="w-3 h-3 mr-1" /> Add Item
          </Button>
        </div>
      }
    >
      {/* Inline add form */}
      {showAddForm && (
        <div className="mb-5 p-4 rounded-lg border border-canyon/30 bg-canyon/5 space-y-3">
          <p className="text-sm font-display font-bold text-charcoal">New Lumber Item</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="col-span-2 sm:col-span-1">
              <label className="text-xs font-semibold text-charcoal block mb-1">Name *</label>
              <Input value={addName} onChange={(e) => setAddName(e.target.value)} placeholder="e.g. 2×10 Joist 16ft" className="h-8 text-xs" />
            </div>
            <div>
              <label className="text-xs font-semibold text-charcoal block mb-1">Category</label>
              <select className="w-full border border-border rounded px-2 py-1.5 text-xs bg-white h-8" value={addCategory} onChange={(e) => { setAddCategory(e.target.value); setAddPosition("bottom"); }}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-charcoal block mb-1">Unit</label>
              <select className="w-full border border-border rounded px-2 py-1.5 text-xs bg-white h-8" value={addUnit} onChange={(e) => setAddUnit(e.target.value)}>
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-charcoal block mb-1">Cost $</label>
              <Input value={addCostPrice} onChange={(e) => { setAddCostPrice(e.target.value); setAddDisplayPrice(marginToDisplay(parseFloat(e.target.value) || 0, parseFloat(addMarginPercent) || 0, parseFloat(addTaxPercent) || 8.35)); }} placeholder="12.50" className="h-8 text-xs" />
            </div>
            <div>
              <label className="text-xs font-semibold text-charcoal block mb-1">Tax %</label>
              <Input value={addTaxPercent} onChange={(e) => { setAddTaxPercent(e.target.value); setAddDisplayPrice(marginToDisplay(parseFloat(addCostPrice) || 0, parseFloat(addMarginPercent) || 0, parseFloat(e.target.value) || 0)); }} placeholder="8.35" className="h-8 text-xs" />
            </div>
            <div>
              <label className="text-xs font-semibold text-charcoal block mb-1">Margin %</label>
              <Input value={addMarginPercent} onChange={(e) => { setAddMarginPercent(e.target.value); setAddDisplayPrice(marginToDisplay(parseFloat(addCostPrice) || 0, parseFloat(e.target.value) || 0, parseFloat(addTaxPercent) || 8.35)); }} placeholder="40" className="h-8 text-xs" />
            </div>
            <div>
              <label className="text-xs font-semibold text-charcoal block mb-1">Display $</label>
              <Input value={addDisplayPrice} onChange={(e) => setAddDisplayPrice(e.target.value)} placeholder="auto" className="h-8 text-xs" />
            </div>
            <div className="col-span-2 sm:col-span-3">
              <label className="text-xs font-semibold text-charcoal block mb-1">Position in "{addCategory}" category</label>
              <select
                className="w-full border border-border rounded px-2 py-1.5 text-xs bg-white h-8"
                value={addPosition === "bottom" ? "bottom" : String(addPosition)}
                onChange={(e) => setAddPosition(e.target.value === "bottom" ? "bottom" : Number(e.target.value))}
              >
                <option value="bottom">Add to bottom of list</option>
                {categoryItemsForPosition.map((it: any) => (
                  <option key={it.id} value={String(it.sortOrder)}>After: {it.name}</option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground mt-1">Items below the chosen position will automatically shift down.</p>
            </div>
            <div className="col-span-2 sm:col-span-3">
              <label className="text-xs font-semibold text-charcoal block mb-1">Description (optional)</label>
              <Input value={addDescription} onChange={(e) => setAddDescription(e.target.value)} placeholder="Optional description" className="h-8 text-xs" />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <Button size="sm" className="bg-canyon hover:bg-canyon-light text-white h-8 text-xs" onClick={handleAddSubmit} disabled={createMutation.isPending}>
              {createMutation.isPending ? "Saving..." : "Save Item"}
            </Button>
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setShowAddForm(false)}>Cancel</Button>
          </div>
        </div>
      )}
      {/* Global margin toggle */}
      <div className="mb-4 p-3 rounded-md bg-sandstone/50 border border-border/60">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Switch checked={globalMarginEnabled} onCheckedChange={setGlobalMarginEnabled} />
            <span className="text-sm font-body font-semibold text-charcoal">
              Apply same margin % to all items
            </span>
          </div>
          {globalMarginEnabled && (
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={0}
                max={99}
                step={0.5}
                value={globalMargin}
                onChange={(e) => setGlobalMargin(e.target.value)}
                className="h-7 text-xs w-20"
                placeholder="35"
              />
              <span className="text-xs text-muted-foreground">%</span>
              <Button size="sm" className="bg-canyon hover:bg-canyon-light text-white h-7 text-xs" onClick={handleApplyGlobalMargin}>
                Apply to All
              </Button>
            </div>
          )}
        </div>
        {globalMarginEnabled && (
          <p className="text-xs text-muted-foreground mt-2">
            This will recompute the display price for all active items using the specified margin. Individual items can still be adjusted after.
          </p>
        )}
      </div>

      {/* Sync results panel */}
      {syncResults && syncResults.length > 0 && (
        <div className="mb-4 p-3 rounded-lg border border-green-200 bg-green-50">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-green-800">
              Home Depot Sync Results — {syncResults.filter((r: any) => r.success).length}/{syncResults.length} items updated
            </p>
            <button className="text-xs text-green-600 hover:text-green-800" onClick={() => setSyncResults(null)}>✕ Dismiss</button>
          </div>
          <div className="max-h-48 overflow-y-auto space-y-1">
            {syncResults.map((r: any) => (
              <div key={r.itemId} className={`flex items-center justify-between text-xs px-2 py-1 rounded ${r.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-700'}`}>
                <span className="font-medium">{r.itemName}</span>
                {r.success ? (
                  <span>${r.oldCostPrice.toFixed(2)} → ${r.newCostPrice.toFixed(2)}</span>
                ) : (
                  <span>{r.error || 'Failed'}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground font-body text-center py-4">No lumber items yet. Add items to build the framing package catalog.</p>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([category, catItems]) => (
            <div key={category}>
              <h3 className="text-sm font-display text-charcoal mb-3 border-b border-border/40 pb-1 capitalize">{category}</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm font-body">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-2 pr-3 font-medium">Name</th>
                      <th className="pb-2 pr-3 font-medium">Category</th>
                      <th className="pb-2 pr-3 font-medium">Unit</th>
                      <th className="pb-2 pr-3 font-medium">Cost $</th>
                      <th className="pb-2 pr-3 font-medium">Tax %</th>
                      <th className="pb-2 pr-3 font-medium">Margin %</th>
                      <th className="pb-2 pr-3 font-medium">Display $</th>
                      <th className="pb-2 pr-3 font-medium">Order</th>
                      <th className="pb-2 pr-3 font-medium">HD SKU</th>
                      <th className="pb-2 pr-3 font-medium">Active</th>
                      <th className="pb-2 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(catItems as any[]).map((item: any) => (
                      <LumberItemRow
                        key={item.id}
                        item={item}
                        units={UNITS}
                        categories={CATEGORIES}
                        globalMarginEnabled={globalMarginEnabled}
                        globalMargin={globalMargin}
                        onUpdate={(data) => updateMutation.mutate({ id: item.id, ...data })}
                        onDelete={() => deleteMutation.mutate({ id: item.id })}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </PanelCard>
  );
}

function LumberItemRow({ item, units, categories, globalMarginEnabled, globalMargin, onUpdate, onDelete }: {
  item: any; units: string[]; categories: string[];
  globalMarginEnabled?: boolean;
  globalMargin?: string;
  onUpdate: (d: any) => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(item.name);
  const [category, setCategory] = useState(item.category || "other");
  const [unit, setUnit] = useState(item.unit);
  const [costPrice, setCostPrice] = useState(String(item.costPrice));
  const [taxPercent, setTaxPercent] = useState(String(item.taxPercent ?? "8.35"));
  // Derive initial margin from existing cost/display prices (accounting for tax)
  const [marginPercent, setMarginPercent] = useState(() => displayToMargin(parseFloat(item.costPrice), parseFloat(item.displayPrice), parseFloat(item.taxPercent ?? "8.35")));
  const [displayPrice, setDisplayPrice] = useState(String(item.displayPrice));
  const [sortOrder, setSortOrder] = useState(String(item.sortOrder));
  const [isActive, setIsActive] = useState(item.isActive === 1);
  const [homeDepotSku, setHomeDepotSku] = useState(item.homeDepotSku || "");
  const [isSyncingPrice, setIsSyncingPrice] = useState(false);
  const rowUtils = trpc.useUtils();
  const syncSingleMutation = trpc.admin.syncSingleLumberItem.useMutation({
    onSuccess: (data) => {
      rowUtils.admin.getConfig.invalidate();
      toast.success(`Price updated: $${data.newCostPrice.toFixed(2)} cost / $${data.newDisplayPrice.toFixed(2)} display`);
      setCostPrice(data.newCostPrice.toFixed(2));
      setDisplayPrice(data.newDisplayPrice.toFixed(2));
      const tax = parseFloat(taxPercent) || 8.35;
      setMarginPercent(displayToMargin(data.newCostPrice, data.newDisplayPrice, tax));
    },
    onError: (e: any) => toast.error(`SKU sync failed: ${e.message}`),
    onSettled: () => setIsSyncingPrice(false),
  });

  // Sync margin and display price in real-time when global margin is enabled and changes
  const prevGlobalMarginRef = useRef(globalMargin);
  useEffect(() => {
    if (globalMarginEnabled && globalMargin !== undefined) {
      const mg = parseFloat(globalMargin);
      if (!isNaN(mg) && mg >= 0 && mg < 100) {
        const cost = parseFloat(costPrice) || 0;
        const tax = parseFloat(taxPercent) || 8.35;
        setMarginPercent(globalMargin);
        setDisplayPrice(marginToDisplay(cost, mg, tax));
      }
    }
    prevGlobalMarginRef.current = globalMargin;
  }, [globalMarginEnabled, globalMargin]);

  const dirty = name !== item.name || category !== (item.category || "other") || unit !== item.unit || costPrice !== String(item.costPrice) ||
    taxPercent !== String(item.taxPercent ?? "8.35") ||
    displayPrice !== String(item.displayPrice) ||
    sortOrder !== String(item.sortOrder) || isActive !== (item.isActive === 1) ||
    homeDepotSku !== (item.homeDepotSku || "");

  // Auto-compute display price when cost, tax, or margin changes
  const handleCostChange = (val: string) => {
    setCostPrice(val);
    const cost = parseFloat(val) || 0;
    const tax = parseFloat(taxPercent) || 8.35;
    const mg = parseFloat(marginPercent) || 0;
    setDisplayPrice(marginToDisplay(cost, mg, tax));
  };
  const handleTaxChange = (val: string) => {
    setTaxPercent(val);
    const cost = parseFloat(costPrice) || 0;
    const tax = parseFloat(val) || 0;
    const mg = parseFloat(marginPercent) || 0;
    setDisplayPrice(marginToDisplay(cost, mg, tax));
  };
  const handleMarginChange = (val: string) => {
    setMarginPercent(val);
    const cost = parseFloat(costPrice) || 0;
    const tax = parseFloat(taxPercent) || 8.35;
    const mg = parseFloat(val) || 0;
    setDisplayPrice(marginToDisplay(cost, mg, tax));
  };
  const handleDisplayChange = (val: string) => {
    setDisplayPrice(val);
    // Back-compute margin from display price (using current tax)
    const cost = parseFloat(costPrice) || 0;
    const tax = parseFloat(taxPercent) || 8.35;
    const display = parseFloat(val) || 0;
    setMarginPercent(displayToMargin(cost, display, tax));
  };

  const skuChanged = homeDepotSku.trim() !== (item.homeDepotSku || "");

  const handleSave = () => {
    const cost = parseFloat(costPrice) || 0;
    const tax = parseFloat(taxPercent) || 8.35;
    const mg = parseFloat(marginPercent) || 0;
    const multiplier = mg < 100 ? (1 / (1 - mg / 100)).toFixed(3) : "1.000";
    // Recompute display price from current cost+tax+margin to ensure consistency
    const recomputedDisplay = marginToDisplay(cost, mg, tax);
    onUpdate({ name, category, unit, costPrice, taxPercent: tax.toFixed(2), markupMultiplier: multiplier, displayPrice: recomputedDisplay, sortOrder: Number(sortOrder), isActive: isActive ? 1 : 0, homeDepotSku: homeDepotSku || null });
    // If SKU was added or changed, immediately fetch the current price from Home Depot
    if (skuChanged && homeDepotSku.trim()) {
      setIsSyncingPrice(true);
      syncSingleMutation.mutate({ id: item.id, sku: homeDepotSku.trim() });
    }
  };

  return (
    <tr className="border-b last:border-0 hover:bg-muted/20">
      <td className="py-2 pr-3">
        <Input value={name} onChange={(e) => setName(e.target.value)} className="h-7 text-xs w-36" />
      </td>
      <td className="py-2 pr-3">
        <select className="border border-border rounded px-2 py-1 text-xs bg-white h-7" value={category} onChange={(e) => setCategory(e.target.value)}>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </td>
      <td className="py-2 pr-3">
        <select className="border border-border rounded px-2 py-1 text-xs bg-white h-7" value={unit} onChange={(e) => setUnit(e.target.value)}>
          {units.map(u => <option key={u} value={u}>{u}</option>)}
        </select>
      </td>
      <td className="py-2 pr-3">
        <Input value={costPrice} onChange={(e) => handleCostChange(e.target.value)} className="h-7 text-xs w-20" />
      </td>
      <td className="py-2 pr-3">
        <div className="flex items-center gap-1">
          <Input value={taxPercent} onChange={(e) => handleTaxChange(e.target.value)} className="h-7 text-xs w-14" />
          <span className="text-xs text-muted-foreground">%</span>
        </div>
      </td>
      <td className="py-2 pr-3">
        <div className="flex items-center gap-1">
          <Input value={marginPercent} onChange={(e) => handleMarginChange(e.target.value)} className="h-7 text-xs w-16" />
          <span className="text-xs text-muted-foreground">%</span>
        </div>
      </td>
      <td className="py-2 pr-3">
        <Input value={displayPrice} onChange={(e) => handleDisplayChange(e.target.value)} className="h-7 text-xs w-20" />
      </td>
      <td className="py-2 pr-3">
        <Input type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="h-7 text-xs w-16" />
      </td>
      <td className="py-2 pr-3">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1">
            <Input
              value={homeDepotSku}
              onChange={(e) => setHomeDepotSku(e.target.value)}
              className="h-7 text-xs w-24"
              placeholder="SKU"
            />
            {/* Manual re-sync button — shown when item already has a saved SKU */}
            {item.homeDepotSku && !skuChanged && (
              <button
                title="Re-sync price from Home Depot now"
                disabled={isSyncingPrice}
                onClick={() => {
                  setIsSyncingPrice(true);
                  syncSingleMutation.mutate({ id: item.id, sku: item.homeDepotSku });
                }}
                className="text-muted-foreground hover:text-canyon disabled:opacity-40 transition-colors"
              >
                {isSyncingPrice
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <RefreshCw className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>
          {item.lastSyncedAt && (
            <span className="text-[10px] text-green-600" title={`Last synced: $${item.lastSyncedPrice}`}>
              ✓ {new Date(item.lastSyncedAt).toLocaleDateString()}
            </span>
          )}
          {skuChanged && homeDepotSku.trim() && (
            <span className="text-[10px] text-amber-600">Save to sync price</span>
          )}
        </div>
      </td>
      <td className="py-2 pr-3">
        <Switch checked={isActive} onCheckedChange={setIsActive} />
      </td>
      <td className="py-2">
        <div className="flex gap-1">
          {dirty && (
            <Button size="sm" className="bg-canyon hover:bg-canyon-light text-white h-7 text-xs" onClick={handleSave}>
              <Save className="w-3 h-3 mr-1" /> Save
            </Button>
          )}
          <ConfirmDelete name={item.name} onConfirm={onDelete} />
        </div>
      </td>
    </tr>
  );
}

// ─── Railing Panel ────────────────────────────────────────────────────────────

function RailingPanel({ items, utils }: { items: any[]; utils: any }) {
  const createMutation = trpc.admin.createRailingOption.useMutation({
    onSuccess: () => { utils.admin.getConfig.invalidate(); toast.success("Railing option created"); },
    onError: (e: any) => toast.error(e.message),
  });
  const updateMutation = trpc.admin.updateRailingOption.useMutation({
    onSuccess: () => { utils.admin.getConfig.invalidate(); toast.success("Railing option updated"); },
    onError: (e: any) => toast.error(e.message),
  });
  const deleteMutation = trpc.admin.deleteRailingOption.useMutation({
    onSuccess: () => { utils.admin.getConfig.invalidate(); toast.success("Railing option deleted"); },
    onError: (e: any) => toast.error(e.message),
  });

  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<"wire" | "welded" | "wood" | "glass">("wire");
  const [newBarOrientation, setNewBarOrientation] = useState<"horizontal" | "vertical" | null>(null);
  const [newCostPerLf, setNewCostPerLf] = useState("0");
  const [newInstallCostPerLf, setNewInstallCostPerLf] = useState("0");
  const [newMarginPct, setNewMarginPct] = useState("35");
  const [newPricePerLf, setNewPricePerLf] = useState("0");
  const [newIsActive, setNewIsActive] = useState(true);
  const [newDescription, setNewDescription] = useState("");

  const handleNewCostChange = (val: string) => {
    setNewCostPerLf(val);
    const mat = parseFloat(val) || 0;
    const inst = parseFloat(newInstallCostPerLf) || 0;
    const margin = parseFloat(newMarginPct) || 0;
    if (margin < 100) setNewPricePerLf(((mat + inst) / (1 - margin / 100)).toFixed(2));
  };
  const handleNewInstallCostChange = (val: string) => {
    setNewInstallCostPerLf(val);
    const mat = parseFloat(newCostPerLf) || 0;
    const inst = parseFloat(val) || 0;
    const margin = parseFloat(newMarginPct) || 0;
    if (margin < 100) setNewPricePerLf(((mat + inst) / (1 - margin / 100)).toFixed(2));
  };
  const handleNewMarginChange = (val: string) => {
    setNewMarginPct(val);
    const mat = parseFloat(newCostPerLf) || 0;
    const inst = parseFloat(newInstallCostPerLf) || 0;
    const margin = parseFloat(val) || 0;
    if (margin < 100) setNewPricePerLf(((mat + inst) / (1 - margin / 100)).toFixed(2));
  };

  const handleCreate = () => {
    if (!newName.trim()) return;
    createMutation.mutate({
      name: newName.trim(),
      railingType: newType,
      orientation: newType === "welded" ? (newBarOrientation ?? "horizontal") : null,
      costPerLf: parseFloat(newCostPerLf) || 0,
      installCostPerLf: parseFloat(newInstallCostPerLf) || 0,
      marginPct: parseFloat(newMarginPct) || 35,
      pricePerLf: parseFloat(newPricePerLf) || 0,
      isActive: newIsActive ? 1 : 0,
      description: newDescription.trim() || undefined,
    });
    setNewName(""); setNewType("wire" as "wire" | "welded" | "wood" | "glass"); setNewBarOrientation(null);
    setNewCostPerLf("0"); setNewInstallCostPerLf("0"); setNewMarginPct("35"); setNewPricePerLf("0"); setNewIsActive(true); setNewDescription("");
  };

  return (
    <PanelCard
      title="Railing Options"
      description="Manage railing types (wire, custom welded, wood, or glass). Set price per linear foot. Edge-mounted only. Decks 24&quot;+ automatically require railing."
      actions={
        <Dialog>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-canyon hover:bg-canyon-light text-white gap-1.5">
              <Plus className="w-4 h-4" /> Add Railing Option
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Railing Option</DialogTitle></DialogHeader>
            <div className="space-y-3 py-2">
              <div>
                <label className="text-sm font-medium">Name</label>
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Wire Railing System" className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Type</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as "wire" | "welded" | "wood" | "glass")}
                  className="mt-1 w-full border border-border rounded-md px-3 py-2 text-sm bg-background"
                >
                  <option value="wire">Wire Railing</option>
                  <option value="welded">Custom Welded Powder-Coated</option>
                  <option value="wood">Wood Railing</option>
                  <option value="glass">Glass Railing</option>
                </select>
              </div>
              {newType === "welded" && (
                <div>
                  <label className="text-sm font-medium">Bar Orientation</label>
                  <select
                    value={newBarOrientation ?? "horizontal"}
                    onChange={(e) => setNewBarOrientation(e.target.value as "horizontal" | "vertical")}
                    className="mt-1 w-full border border-border rounded-md px-3 py-2 text-sm bg-background"
                  >
                    <option value="horizontal">Horizontal Bars</option>
                    <option value="vertical">Vertical Bars</option>
                  </select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-sm font-medium">Material Cost/LF ($)</label>
                  <Input type="number" value={newCostPerLf} onChange={(e) => handleNewCostChange(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium">Install Cost/LF ($)</label>
                  <Input type="number" value={newInstallCostPerLf} onChange={(e) => handleNewInstallCostChange(e.target.value)} className="mt-1" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-sm font-medium">Margin %</label>
                  <Input type="number" value={newMarginPct} onChange={(e) => handleNewMarginChange(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium">Customer Price/LF ($)</label>
                  <Input type="number" value={newPricePerLf} onChange={(e) => setNewPricePerLf(e.target.value)} className="mt-1" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Description (optional)</label>
                <Input value={newDescription} onChange={(e) => setNewDescription(e.target.value)} placeholder="e.g. 1x1 stainless wire with powder-coated posts" className="mt-1" />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={newIsActive} onCheckedChange={setNewIsActive} />
                <label className="text-sm">Active (visible to customers)</label>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button className="bg-canyon hover:bg-canyon-light text-white" onClick={handleCreate}>Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      }
    >
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground font-body text-center py-4">No railing options yet. Add a railing option above.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm font-body">
            <thead>
              <tr className="border-b border-border/40 text-xs text-muted-foreground uppercase tracking-wider">
                <th className="text-left py-2 pr-3 font-medium">Name</th>
                <th className="text-left py-2 pr-3 font-medium">Type</th>
                <th className="text-left py-2 pr-3 font-medium">Orientation</th>
                <th className="text-left py-2 pr-3 font-medium">Cost / Margin / Price (per LF)</th>
                <th className="text-left py-2 pr-3 font-medium">Description</th>
                <th className="text-left py-2 pr-3 font-medium">Active</th>
                <th className="py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item: any) => (
                <RailingOptionRow
                  key={item.id}
                  item={item}
                  onUpdate={(d) => updateMutation.mutate({ id: item.id, ...d })}
                  onDelete={() => deleteMutation.mutate({ id: item.id })}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PanelCard>
  );
}

function RailingOptionRow({ item, onUpdate, onDelete }: { item: any; onUpdate: (d: any) => void; onDelete: () => void }) {
  const [name, setName] = useState(item.name);
  const [type, setType] = useState<"wire" | "welded" | "wood" | "glass">(item.type);
  const [barOrientation, setBarOrientation] = useState<"horizontal" | "vertical" | null>(item.barOrientation ?? null);
  const [costPerLf, setCostPerLf] = useState(String(item.costPerLf ?? 0));
  const [marginPct, setMarginPct] = useState(String(item.marginPct ?? 35));
  const [pricePerLf, setPricePerLf] = useState(String(item.pricePerLf ?? 0));
  const [description, setDescription] = useState(item.description ?? "");
  const [isActive, setIsActive] = useState(item.isActive !== false);

  // Auto-compute price from cost + margin
  const handleCostChange = (val: string) => {
    setCostPerLf(val);
    const cost = parseFloat(val) || 0;
    const margin = parseFloat(marginPct) || 0;
    if (margin < 100) {
      setPricePerLf((cost / (1 - margin / 100)).toFixed(2));
    }
  };
  const handleMarginChange = (val: string) => {
    setMarginPct(val);
    const cost = parseFloat(costPerLf) || 0;
    const margin = parseFloat(val) || 0;
    if (margin < 100) {
      setPricePerLf((cost / (1 - margin / 100)).toFixed(2));
    }
  };

  const dirty =
    name !== item.name ||
    type !== item.type ||
    barOrientation !== (item.barOrientation ?? null) ||
    costPerLf !== String(item.costPerLf ?? 0) ||
    marginPct !== String(item.marginPct ?? 35) ||
    pricePerLf !== String(item.pricePerLf ?? 0) ||
    description !== (item.description ?? "") ||
    isActive !== (item.isActive !== false);

  const handleSave = () => {
    onUpdate({
      name,
      railingType: type,
      orientation: type === "welded" ? (barOrientation ?? "horizontal") : null,
      costPerLf: parseFloat(costPerLf) || 0,
      marginPct: parseFloat(marginPct) || 35,
      pricePerLf: parseFloat(pricePerLf) || 0,
      description: description.trim() || undefined,
      isActive: isActive ? 1 : 0,
    });
  };

  return (
    <tr className="border-b border-border/20 hover:bg-sandstone/20">
      <td className="py-2 pr-3">
        <Input value={name} onChange={(e) => setName(e.target.value)} className="h-7 text-xs w-40" />
      </td>
      <td className="py-2 pr-3">
        <select
          value={type}
          onChange={(e) => setType(e.target.value as "wire" | "welded" | "wood" | "glass")}
          className="h-7 text-xs border border-border rounded px-2 bg-background w-28"
        >
          <option value="wire">Wire</option>
          <option value="welded">Welded</option>
          <option value="wood">Wood</option>
          <option value="glass">Glass</option>
        </select>
      </td>
      <td className="py-2 pr-3">
        {type === "welded" ? (
          <select
            value={barOrientation ?? "horizontal"}
            onChange={(e) => setBarOrientation(e.target.value as "horizontal" | "vertical")}
            className="h-7 text-xs border border-border rounded px-2 bg-background w-28"
          >
            <option value="horizontal">Horizontal</option>
            <option value="vertical">Vertical</option>
          </select>
        ) : (
          <span className="text-xs text-muted-foreground">N/A</span>
        )}
      </td>
      <td className="py-2 pr-3">
        <div className="flex items-center gap-1">
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] text-muted-foreground">Cost $</span>
            <Input type="number" value={costPerLf} onChange={(e) => handleCostChange(e.target.value)} className="h-7 text-xs w-20" />
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] text-muted-foreground">Margin %</span>
            <Input type="number" value={marginPct} onChange={(e) => handleMarginChange(e.target.value)} className="h-7 text-xs w-16" />
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] text-muted-foreground">Price $</span>
            <Input type="number" value={pricePerLf} onChange={(e) => setPricePerLf(e.target.value)} className="h-7 text-xs w-20" />
          </div>
        </div>
      </td>
      <td className="py-2 pr-3">
        <Input value={description} onChange={(e) => setDescription(e.target.value)} className="h-7 text-xs w-48" />
      </td>
      <td className="py-2 pr-3">
        <Switch checked={isActive} onCheckedChange={setIsActive} />
      </td>
      <td className="py-2">
        <div className="flex gap-1">
          {dirty && (
            <Button size="sm" className="bg-canyon hover:bg-canyon-light text-white h-7 text-xs" onClick={handleSave}>
              <Save className="w-3 h-3 mr-1" /> Save
            </Button>
          )}
          <ConfirmDelete name={item.name} onConfirm={onDelete} />
        </div>
      </td>
    </tr>
  );
}

// ─── StairsPanel ─────────────────────────────────────────────────────────────

const SPIRAL_DIAMETERS = ["60\"", "72\"", "84\"", "96\""];
const SPIRAL_MATERIALS = ["Metal Diamond Grate", "Dekton", "Stone Decking", "Resin Rock"];

function StairsPanel({ settings, spiralPricing, utils }: {
  settings: any[];
  spiralPricing: any[];
  utils: any;
}) {
  const stairsSettings = settings.filter(s => s.category === "stairs");
  const standardSettings = stairsSettings.filter(s =>
    ["stair_base_price", "stair_per_lf_over_4ft", "stair_tread_price", "stair_riser_price", "stair_center_support_cost"].includes(s.settingKey)
  );
  const engineerSettings = stairsSettings.filter(s =>
    ["engineer_letter_cost", "permit_cost_framing"].includes(s.settingKey)
  );
  const landingSettings = stairsSettings.filter(s =>
    ["landing_cost_per_unit"].includes(s.settingKey)
  );

  const updateMutation = trpc.admin.bulkUpdateSettings.useMutation({
    onSuccess: () => { utils.admin.getConfig.invalidate(); toast.success("Settings saved"); },
    onError: (e: any) => toast.error(e.message),
  });
  const updateSpiralMutation = trpc.spiralStairs.update.useMutation({
    onSuccess: () => { utils.admin.getConfig.invalidate(); toast.success("Spiral pricing saved"); },
    onError: (e: any) => toast.error(e.message),
  });

  const [values, setValues] = useState<Record<string, string>>({});
  const [spiralValues, setSpiralValues] = useState<Record<string, { cost: string; margin: string; price: string }>>({});

  useEffect(() => {
    const map: Record<string, string> = {};
    for (const s of stairsSettings) map[s.settingKey] = s.settingValue;
    setValues(map);
  }, [settings]);

  useEffect(() => {
    const map: Record<string, { cost: string; margin: string; price: string }> = {};
    for (const row of spiralPricing) {
      const key = `${row.diameter}__${row.treadMaterial}`;
      map[key] = {
        cost: String(row.costPrice ?? "0.00"),
        margin: String(row.marginPct ?? "35.00"),
        price: String(row.pricePerUnit ?? "0.00"),
      };
    }
    setSpiralValues(map);
  }, [spiralPricing]);

  const handleSaveSettings = (keys: string[]) => {
    const updates = keys
      .filter(k => values[k] !== undefined)
      .map(k => ({ key: k, value: values[k] || "" }));
    if (updates.length > 0) updateMutation.mutate({ updates });
  };

  const handleSpiralCostChange = (diameter: string, material: string, cost: string) => {
    const key = `${diameter}__${material}`;
    const margin = parseFloat(spiralValues[key]?.margin ?? "35") / 100;
    const costNum = parseFloat(cost) || 0;
    const price = margin < 1 ? (costNum / (1 - margin)).toFixed(2) : costNum.toFixed(2);
    setSpiralValues(prev => ({ ...prev, [key]: { cost, margin: prev[key]?.margin ?? "35.00", price } }));
  };

  const handleSpiralMarginChange = (diameter: string, material: string, margin: string) => {
    const key = `${diameter}__${material}`;
    const marginNum = parseFloat(margin) / 100;
    const costNum = parseFloat(spiralValues[key]?.cost ?? "0") || 0;
    const price = marginNum < 1 ? (costNum / (1 - marginNum)).toFixed(2) : costNum.toFixed(2);
    setSpiralValues(prev => ({ ...prev, [key]: { cost: prev[key]?.cost ?? "0.00", margin, price } }));
  };

  const handleSpiralPriceChange = (diameter: string, material: string, price: string) => {
    const key = `${diameter}__${material}`;
    setSpiralValues(prev => ({ ...prev, [key]: { ...prev[key], price } }));
  };

  const handleSaveSpiralRow = (diameter: string, material: string) => {
    const key = `${diameter}__${material}`;
    const vals = spiralValues[key];
    if (!vals) return;
    const row = spiralPricing.find(r => r.diameter === diameter && r.treadMaterial === material);
    if (!row) return;
    updateSpiralMutation.mutate({
      id: row.id,
      costPrice: parseFloat(vals.cost) || 0,
      marginPct: parseFloat(vals.margin) || 35,
      price: parseFloat(vals.price) || 0,
    });
  };

  const standardDirty = standardSettings.some(s => values[s.settingKey] !== s.settingValue);
  const engineerDirty = engineerSettings.some(s => values[s.settingKey] !== s.settingValue);
  const landingDirty = landingSettings.some(s => values[s.settingKey] !== s.settingValue);

  return (
    <div className="space-y-6">
      {/* Standard Stairs */}
      <PanelCard
        title="Standard Stairs Pricing"
        description="Base price per stair run + extra per linear foot over 4ft wide. Center support auto-adds for runs over 10 treads."
        actions={
          standardDirty ? (
            <Button size="sm" className="bg-canyon hover:bg-canyon-light text-white" onClick={() => handleSaveSettings(standardSettings.map(s => s.settingKey))} disabled={updateMutation.isPending}>
              <Save className="w-4 h-4 mr-1" /> Save
            </Button>
          ) : null
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-1">
          {standardSettings.map(s => (
            <div key={s.settingKey}>
              <label className="text-xs font-body font-medium text-charcoal mb-1 block">{s.label}</label>
              <Input
                value={values[s.settingKey] ?? s.settingValue}
                onChange={e => setValues(prev => ({ ...prev, [s.settingKey]: e.target.value }))}
                className="h-8 text-sm font-mono"
              />
            </div>
          ))}
        </div>
      </PanelCard>

      {/* Engineering & Permit */}
      <PanelCard
        title="Engineering & Permit Costs"
        description="Auto-added when framing is selected. Both are mandatory for second-story decks (8ft+ off ground)."
        actions={
          engineerDirty ? (
            <Button size="sm" className="bg-canyon hover:bg-canyon-light text-white" onClick={() => handleSaveSettings(engineerSettings.map(s => s.settingKey))} disabled={updateMutation.isPending}>
              <Save className="w-4 h-4 mr-1" /> Save
            </Button>
          ) : null
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-1">
          {engineerSettings.map(s => (
            <div key={s.settingKey}>
              <label className="text-xs font-body font-medium text-charcoal mb-1 block">{s.label}</label>
              <Input
                value={values[s.settingKey] ?? s.settingValue}
                onChange={e => setValues(prev => ({ ...prev, [s.settingKey]: e.target.value }))}
                className="h-8 text-sm font-mono"
              />
            </div>
          ))}
        </div>
      </PanelCard>

      {/* Spiral Stairs */}
      <PanelCard
        title="Spiral Stairs Pricing"
        description="Pricing matrix by diameter and tread material. Cost → Margin % → Price auto-calculates. Edit price directly to override."
      >
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/40 bg-sandstone/20">
                <th className="text-left py-2 px-3 font-semibold text-charcoal w-40">Tread Material</th>
                {SPIRAL_DIAMETERS.map(d => (
                  <th key={d} className="text-center py-2 px-2 font-semibold text-charcoal" colSpan={3}>
                    {d} Diameter
                  </th>
                ))}
              </tr>
              <tr className="border-b border-border/40 bg-sandstone/10">
                <th className="py-1 px-3"></th>
                {SPIRAL_DIAMETERS.map(d => (
                  <>
                    <th key={`${d}-cost`} className="py-1 px-1 text-center text-[10px] text-muted-foreground font-normal">Cost $</th>
                    <th key={`${d}-margin`} className="py-1 px-1 text-center text-[10px] text-muted-foreground font-normal">Margin %</th>
                    <th key={`${d}-price`} className="py-1 px-1 text-center text-[10px] text-muted-foreground font-normal">Price $</th>
                  </>
                ))}
              </tr>
            </thead>
            <tbody>
              {SPIRAL_MATERIALS.map(material => (
                <tr key={material} className="border-b border-border/20 hover:bg-sandstone/10">
                  <td className="py-2 px-3 font-medium text-charcoal">{material}</td>
                  {SPIRAL_DIAMETERS.map(diameter => {
                    const key = `${diameter}__${material}`;
                    const vals = spiralValues[key] ?? { cost: "0.00", margin: "35.00", price: "0.00" };
                    const row = spiralPricing.find(r => r.diameter === diameter && r.treadMaterial === material);
                    const dirty = row && (
                      parseFloat(vals.cost) !== parseFloat(row.costPrice ?? 0) ||
                      parseFloat(vals.margin) !== parseFloat(row.marginPct ?? 35) ||
                      parseFloat(vals.price) !== parseFloat(row.pricePerUnit ?? 0)
                    );
                    return (
                      <>
                        <td key={`${key}-cost`} className="py-1 px-1">
                          <Input
                            value={vals.cost}
                            onChange={e => handleSpiralCostChange(diameter, material, e.target.value)}
                            className="h-7 text-xs font-mono w-20 text-center"
                          />
                        </td>
                        <td key={`${key}-margin`} className="py-1 px-1">
                          <Input
                            value={vals.margin}
                            onChange={e => handleSpiralMarginChange(diameter, material, e.target.value)}
                            className="h-7 text-xs font-mono w-16 text-center"
                          />
                        </td>
                        <td key={`${key}-price`} className="py-1 px-1">
                          <div className="flex items-center gap-1">
                            <Input
                              value={vals.price}
                              onChange={e => handleSpiralPriceChange(diameter, material, e.target.value)}
                              className="h-7 text-xs font-mono w-20 text-center"
                            />
                            {dirty && (
                              <Button
                                size="sm"
                                className="h-7 w-7 p-0 bg-canyon hover:bg-canyon-light text-white"
                                onClick={() => handleSaveSpiralRow(diameter, material)}
                                disabled={updateSpiralMutation.isPending}
                              >
                                <Save className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PanelCard>

      {/* Landing Turn */}
      <PanelCard
        title="Landing Turn Pricing"
        description="Cost per landing platform when a stair run turns a corner."
        actions={
          landingDirty ? (
            <Button size="sm" className="bg-canyon hover:bg-canyon-light text-white" onClick={() => handleSaveSettings(landingSettings.map(s => s.settingKey))} disabled={updateMutation.isPending}>
              <Save className="w-4 h-4 mr-1" /> Save
            </Button>
          ) : null
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-1">
          {landingSettings.map(s => (
            <div key={s.settingKey}>
              <label className="text-xs font-body font-medium text-charcoal mb-1 block">{s.label}</label>
              <Input
                value={values[s.settingKey] ?? s.settingValue}
                onChange={e => setValues(prev => ({ ...prev, [s.settingKey]: e.target.value }))}
                className="h-8 text-sm font-mono"
              />
            </div>
          ))}
        </div>
      </PanelCard>

      {/* Floating Steps — Placeholder */}
      <PanelCard
        title="Floating Steps Pricing (Placeholder)"
        description="Floating steps are priced per project. These fields are placeholders for reference — actual quotes are generated manually. Set base material, fabrication, and installation rates here for rough estimates."
      >
        <div className="space-y-4 p-1">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-800">
              <strong>Note:</strong> Floating step pricing is highly variable based on material, stringer type, finish, and site conditions. These fields provide a rough placeholder rate. Final quotes should be generated manually and reviewed before sending to clients.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-body font-medium text-charcoal mb-1 block">Base Material Cost (per step)</label>
              <Input
                value={values["floating_stair_material_cost_per_step"] ?? ""}
                onChange={e => setValues(prev => ({ ...prev, floating_stair_material_cost_per_step: e.target.value }))}
                placeholder="e.g. 350.00"
                className="h-8 text-sm font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-body font-medium text-charcoal mb-1 block">Fabrication Cost (per step)</label>
              <Input
                value={values["floating_stair_fabrication_cost_per_step"] ?? ""}
                onChange={e => setValues(prev => ({ ...prev, floating_stair_fabrication_cost_per_step: e.target.value }))}
                placeholder="e.g. 200.00"
                className="h-8 text-sm font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-body font-medium text-charcoal mb-1 block">Installation Cost (per step)</label>
              <Input
                value={values["floating_stair_install_cost_per_step"] ?? ""}
                onChange={e => setValues(prev => ({ ...prev, floating_stair_install_cost_per_step: e.target.value }))}
                placeholder="e.g. 150.00"
                className="h-8 text-sm font-mono"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-body font-medium text-charcoal mb-1 block">Stringer / Support Base Cost (flat)</label>
              <Input
                value={values["floating_stair_stringer_base_cost"] ?? ""}
                onChange={e => setValues(prev => ({ ...prev, floating_stair_stringer_base_cost: e.target.value }))}
                placeholder="e.g. 800.00"
                className="h-8 text-sm font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-body font-medium text-charcoal mb-1 block">Margin %</label>
              <Input
                value={values["floating_stair_margin_pct"] ?? ""}
                onChange={e => setValues(prev => ({ ...prev, floating_stair_margin_pct: e.target.value }))}
                placeholder="e.g. 35"
                className="h-8 text-sm font-mono"
              />
            </div>
          </div>
          <Button
            size="sm"
            className="bg-canyon hover:bg-canyon-light text-white"
            onClick={() => handleSaveSettings(["floating_stair_material_cost_per_step", "floating_stair_fabrication_cost_per_step", "floating_stair_install_cost_per_step", "floating_stair_stringer_base_cost", "floating_stair_margin_pct"])}
            disabled={updateMutation.isPending}
          >
            <Save className="w-4 h-4 mr-1" /> Save Floating Stairs Pricing
          </Button>
        </div>
      </PanelCard>
    </div>
  );
}

// ─── Sign Requests Panel ──────────────────────────────────────────────────────

function SignRequestsPanel() {
  const utils = trpc.useUtils();
  const { data: requests, isLoading, refetch } = trpc.sign.getAll.useQuery();
  const { data: calcUsers = [] } = trpc.calculatorUsers.getAll.useQuery();
  const calUser = useCalcUser();
  const { data: config } = trpc.admin.getConfig.useQuery();
  const settings: any[] = config?.settings
    ? Object.entries(config.settings)
        .filter(([key]) => key.startsWith("sign_reminder"))
        .map(([key, value]) => ({
          settingKey: key,
          settingValue: value,
          category: "reminders",
          label: key === "sign_reminder_after_days" ? "Remind after (days)" : "Max reminders per request",
        }))
    : [];
  const [reminderValues, setReminderValues] = useState<Record<string, string>>({});
  useEffect(() => {
    const map: Record<string, string> = {};
    for (const s of settings) map[s.settingKey] = s.settingValue;
    setReminderValues(map);
  }, [config]);
  const reminderDirty = settings.some(s => reminderValues[s.settingKey] !== s.settingValue);
  const saveReminderMutation = trpc.admin.bulkUpdateSettings.useMutation({
    onSuccess: () => { utils.admin.getConfig.invalidate(); toast.success("Reminder settings saved"); },
    onError: (e: any) => toast.error(e.message),
  });
  const downloadMutation = trpc.sign.downloadContract.useMutation({
    onSuccess: (data) => {
      try {
        const byteChars = atob(data.pdfBase64);
        const byteNums = new Array(byteChars.length);
        for (let i = 0; i < byteChars.length; i++) {
          byteNums[i] = byteChars.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNums);
        const blob = new Blob([byteArray], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = data.filename;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
        toast.success("Contract PDF downloaded");
      } catch {
        toast.error("Failed to download PDF");
      }
    },
    onError: (e: any) => toast.error(e.message || "Failed to generate PDF"),
  });
  const resendMutation = trpc.sign.resend.useMutation({
    onSuccess: (data) => {
      toast.success("Signing email resent!");
      if (data.signUrl) {
        navigator.clipboard.writeText(data.signUrl).catch(() => {});
      }
    },
    onError: (e: any) => toast.error(e.message || "Failed to resend email"),
  });

  function statusBadge(status: string, expiresAt: Date | null) {
    const isExpired = expiresAt && new Date(expiresAt) < new Date();
    if (status === "signed") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">
          <CheckCircle className="w-3 h-3" /> Signed
        </span>
      );
    }
    if (status === "expired" || isExpired) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">
          <XCircle className="w-3 h-3" /> Expired
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">
        <Clock className="w-3 h-3" /> Pending
      </span>
    );
  }

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

  // Role-scoped filtering
  const scopedRequests = (requests || []).filter((req: any) => {
    if (!calUser || calUser.role === "super_admin") return true;
    if (calUser.role === "manager") {
      const teamIds = [(calUser as any).id, ...(calcUsers as any[]).filter((u: any) => u.managerId === (calUser as any).id).map((u: any) => u.id)];
      return teamIds.includes(req.assignedUserId) || !req.assignedUserId;
    }
    return req.assignedUserId === (calUser as any).id || !req.assignedUserId;
  });
  const getCalcUserName = (id: number | null) => {
    if (!id) return null;
    const u = (calcUsers as any[]).find((u: any) => u.id === id);
    return u ? u.name : `User #${id}`;
  };
  const scopeLabel = !calUser || calUser.role === "super_admin" ? "All Contracts" :
    calUser.role === "manager" ? "Your Team's Contracts" : "Your Contracts";

  return (
    <div className="space-y-6">
    {/* Reminder Settings Card */}
    <PanelCard
      title="Reminder Email Settings"
      description="Configure how often follow-up emails are sent to customers with unsigned contracts"
      actions={
        reminderDirty ? (
          <Button
            size="sm"
            className="bg-canyon hover:bg-canyon-light text-white"
            disabled={saveReminderMutation.isPending}
            onClick={() => {
              const updates = settings
                .filter(s => reminderValues[s.settingKey] !== s.settingValue)
                .map(s => ({ key: s.settingKey, value: reminderValues[s.settingKey] || "" }));
              if (updates.length > 0) saveReminderMutation.mutate({ updates });
            }}
          >
            <Save className="w-4 h-4 mr-1" /> Save
          </Button>
        ) : null
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-1">
        {settings.length === 0 ? (
          <p className="text-sm text-muted-foreground col-span-2">Loading settings…</p>
        ) : (
          settings.map(s => (
            <div key={s.settingKey}>
              <label className="text-xs font-body font-medium text-charcoal mb-1 block">{s.label}</label>
              <Input
                type="number"
                min={0}
                value={reminderValues[s.settingKey] ?? s.settingValue}
                onChange={e => setReminderValues(prev => ({ ...prev, [s.settingKey]: e.target.value }))}
                className="h-8 text-sm font-mono w-24"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {s.settingKey === "sign_reminder_after_days"
                  ? "Days after sending before first reminder fires"
                  : "Set to 0 to disable reminders entirely"}
              </p>
            </div>
          ))
        )}
      </div>
    </PanelCard>

    <PanelCard
      title="Sign Requests"
      description={`Track estimate signing links sent to customers. Showing: ${scopeLabel}.`}
      actions={
        <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => refetch()}>
          <RefreshCw className="w-3 h-3" /> Refresh
        </Button>
      }
    >
      {isLoading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : !scopedRequests?.length ? (
        <div className="text-center py-10 text-muted-foreground font-body">
          No sign requests yet. They appear here when you send estimate emails with signing links.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm font-body">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 pr-3 font-medium">ID</th>
                <th className="pb-2 pr-3 font-medium">Customer</th>
                <th className="pb-2 pr-3 font-medium">Project</th>
                <th className="pb-2 pr-3 font-medium">Total</th>
                <th className="pb-2 pr-3 font-medium">Assigned To</th>
                <th className="pb-2 pr-3 font-medium">Status</th>
                <th className="pb-2 pr-3 font-medium">Signed By</th>
                <th className="pb-2 pr-3 font-medium">Sent</th>
                <th className="pb-2 pr-3 font-medium">Expires</th>
                <th className="pb-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {scopedRequests.map((req: any) => (
                <tr key={req.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="py-2 pr-3 text-muted-foreground">#{req.id}</td>
                  <td className="py-2 pr-3">
                    <div className="font-medium text-charcoal">{req.customerName}</div>
                    <div className="text-xs text-muted-foreground">{req.customerEmail}</div>
                    {req.customerPhone && (
                      <div className="text-xs text-muted-foreground">{req.customerPhone}</div>
                    )}
                  </td>
                  <td className="py-2 pr-3">
                    <div>{req.collectionName || "Tanzite"}</div>
                    {req.colorName && (
                      <div className="text-xs text-muted-foreground">{req.colorName}</div>
                    )}
                    <div className="text-xs text-muted-foreground">{req.sqft} sq ft</div>
                  </td>
                  <td className="py-2 pr-3 font-semibold">{fmt(Number(req.finalTotal))}</td>
                  <td className="py-2 pr-3 text-xs">
                    {getCalcUserName(req.assignedUserId) ? (
                      <span className="font-medium text-foreground">{getCalcUserName(req.assignedUserId)}</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="py-2 pr-3">{statusBadge(req.status, req.expiresAt)}</td>
                  <td className="py-2 pr-3">
                    {req.signedName ? (
                      <div>
                        <div className="text-green-700 font-medium text-xs">{req.signedName}</div>
                        {req.signedAt && (
                          <div className="text-xs text-muted-foreground">
                            {new Date(req.signedAt).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </td>
                  <td className="py-2 pr-3 text-xs text-muted-foreground">
                    {new Date(req.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-2 pr-3 text-xs text-muted-foreground">
                    {req.expiresAt ? new Date(req.expiresAt).toLocaleDateString() : "—"}
                  </td>
                  <td className="py-2">
                    <div className="flex flex-col gap-1">
                      {/* Open signing page — always visible */}
                      <a
                        href={`${window.location.origin}/sign/${req.token}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium text-canyon hover:text-canyon-light hover:underline"
                        title="Open signing page in new tab"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Open
                      </a>
                      {/* Copy signing link to clipboard */}
                      <button
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-charcoal hover:underline text-left"
                        title="Copy signing link"
                        onClick={() => {
                          navigator.clipboard
                            .writeText(`${window.location.origin}/sign/${req.token}`)
                            .then(() => toast.success("Signing link copied!"))
                            .catch(() => toast.error("Failed to copy"));
                        }}
                      >
                        <Copy className="w-3 h-3" />
                        Copy link
                      </button>
                      {req.status === "pending" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs gap-1"
                          disabled={resendMutation.isPending}
                          onClick={() =>
                            resendMutation.mutate({
                              id: req.id,
                              origin: window.location.origin,
                            })
                          }
                        >
                          <RefreshCw className="w-3 h-3" />
                          Resend
                        </Button>
                      )}
                      {req.status === "signed" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs gap-1 text-green-700 border-green-300 hover:bg-green-50"
                          disabled={downloadMutation.isPending}
                          onClick={() => downloadMutation.mutate({ id: req.id })}
                        >
                          <FileText className="w-3 h-3" />
                          PDF
                        </Button>
                      )}
                      {req.checkoutUrl && req.status === "signed" && (
                        <a
                          href={req.checkoutUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Checkout
                        </a>
                      )}
                      {/* Site Photos button */}
                      <EstimatePhotosButton signRequestId={req.id} customerName={req.customerName} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PanelCard>
    </div>
  );
}

/* ─── Estimate Photos Button (used in SignRequestsPanel) ────────────────── */
function EstimatePhotosButton({ signRequestId, customerName }: { signRequestId: number; customerName: string }) {
  const [open, setOpen] = useState(false);
  const { data: photos = [], isLoading } = trpc.estimatePhotos.listBySignRequest.useQuery(
    { signRequestId },
    { enabled: open }
  );

  const CATEGORY_LABELS: Record<string, string> = {
    "site": "Site Overview", "materials": "Materials", "existing-deck": "Existing Deck",
    "damage": "Damage / Issues", "other": "Other",
  };
  const CATEGORY_COLORS: Record<string, string> = {
    "site": "bg-blue-100 text-blue-700", "materials": "bg-green-100 text-green-700",
    "existing-deck": "bg-amber-100 text-amber-700", "damage": "bg-red-100 text-red-700",
    "other": "bg-stone-100 text-stone-600",
  };

  const [lightbox, setLightbox] = useState<string | null>(null);

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className="text-xs gap-1"
        onClick={() => setOpen(true)}
      >
        <Camera className="w-3 h-3" />
        Photos
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="w-4 h-4 text-canyon" />
              Site Photos — {customerName}
            </DialogTitle>
          </DialogHeader>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-canyon" />
            </div>
          ) : photos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <ImageIcon className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm font-medium">No site photos for this estimate</p>
              <p className="text-xs mt-1">Photos taken during the estimate appointment will appear here.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Category summary */}
              <div className="flex flex-wrap gap-1.5">
                {Object.keys(CATEGORY_LABELS).map(cat => {
                  const count = (photos as any[]).filter((p: any) => p.category === cat).length;
                  if (count === 0) return null;
                  return (
                    <span key={cat} className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${CATEGORY_COLORS[cat] ?? "bg-stone-100 text-stone-600"}`}>
                      {CATEGORY_LABELS[cat]}: {count}
                    </span>
                  );
                })}
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-charcoal/10 text-charcoal">
                  Total: {photos.length}
                </span>
              </div>

              {/* Photo grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {(photos as any[]).map((photo: any) => (
                  <div key={photo.id} className="rounded-xl overflow-hidden border border-border bg-white shadow-sm group cursor-pointer"
                    onClick={() => setLightbox(photo.url)}>
                    <div className="relative aspect-[4/3] bg-stone-100 overflow-hidden">
                      <img src={photo.url} alt={photo.caption || "Site photo"}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" loading="lazy" />
                      <div className={`absolute top-2 left-2 text-[10px] font-semibold px-1.5 py-0.5 rounded ${CATEGORY_COLORS[photo.category] ?? "bg-stone-100 text-stone-600"}`}>
                        {CATEGORY_LABELS[photo.category] ?? photo.category}
                      </div>
                    </div>
                    <div className="p-2">
                      <p className="text-xs text-charcoal truncate">{photo.caption || <span className="text-muted-foreground italic">No caption</span>}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {new Date(photo.createdAt).toLocaleDateString()} {new Date(photo.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" size="sm">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <button onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white">
            <XIcon className="w-5 h-5" />
          </button>
          <img src={lightbox} alt="Site photo" className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl" onClick={e => e.stopPropagation()} />
        </div>
      )}
    </>
  );
}

/* ─── Sent Emails Panel ──────────────────────────────────────────────────── */
function SentEmailsPanel() {
  const utils = trpc.useUtils();
  const { data: emails = [], isLoading, refetch } = trpc.sentEmails.getAll.useQuery();
  const { data: calcUsers = [] } = trpc.calculatorUsers.getAll.useQuery();
  const calUser = useCalcUser();
  const resendMutation = trpc.sentEmails.resend.useMutation({
    onSuccess: () => { utils.sentEmails.getAll.invalidate(); toast.success("Email resent successfully"); },
    onError: (e: any) => toast.error(e.message || "Failed to resend email"),
  });
  const [search, setSearch] = useState("");

  // Role-scoped filtering
  const scopedEmails = (emails as any[]).filter((e: any) => {
    if (!calUser || calUser.role === "super_admin") return true;
    if (calUser.role === "manager") {
      // Managers see their own + their reps'
      const teamIds = [(calUser as any).id, ...(calcUsers as any[]).filter((u: any) => u.managerId === (calUser as any).id).map((u: any) => u.id)];
      return teamIds.includes(e.assignedUserId) || !e.assignedUserId;
    }
    // Reps see only their own
    return e.assignedUserId === (calUser as any).id || !e.assignedUserId;
  });

  const filtered = scopedEmails.filter((e: any) =>
    !search ||
    e.customerName.toLowerCase().includes(search.toLowerCase()) ||
    e.customerEmail.toLowerCase().includes(search.toLowerCase()) ||
    (e.customerCity || "").toLowerCase().includes(search.toLowerCase())
  );
  const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
  const getUserName = (id: number | null) => {
    if (!id) return null;
    const u = (calcUsers as any[]).find((u: any) => u.id === id);
    return u ? u.name : `User #${id}`;
  };
  const scopeLabel = !calUser || calUser.role === "super_admin" ? "All Estimates" :
    calUser.role === "manager" ? "Your Team's Estimates" : "Your Estimates";
  return (
    <PanelCard
      title="Sent Emails"
      description={`Log of estimate emails. Showing: ${scopeLabel}.`}
      actions={
        <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5">
          <RefreshCw className="w-4 h-4" /> Refresh
        </Button>
      }
    >
      <div className="mb-4">
        <Input
          placeholder="Search by name, email, or city…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>
      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground py-8 justify-center">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading…
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-muted-foreground text-sm py-8 text-center">No emails found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-border/60 text-left">
                <th className="py-2 pr-4 font-medium text-muted-foreground">Date</th>
                <th className="py-2 pr-4 font-medium text-muted-foreground">Customer</th>
                <th className="py-2 pr-4 font-medium text-muted-foreground">City</th>
                <th className="py-2 pr-4 font-medium text-muted-foreground">Collection</th>
                <th className="py-2 pr-4 font-medium text-muted-foreground">Sqft</th>
                <th className="py-2 pr-4 font-medium text-muted-foreground">Total</th>
                <th className="py-2 pr-4 font-medium text-muted-foreground">Assigned To</th>
                <th className="py-2 pr-4 font-medium text-muted-foreground">Type</th>
                <th className="py-2 pr-4 font-medium text-muted-foreground">Status</th>
                <th className="py-2 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((email: any) => (
                <tr key={email.id} className="border-b border-border/40 hover:bg-muted/30">
                  <td className="py-2 pr-4 text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(email.sentAt).toLocaleDateString()}
                    <br />
                    <span className="text-xs">{new Date(email.sentAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  </td>
                  <td className="py-2 pr-4">
                    <div className="font-medium">{email.customerName}</div>
                    <div className="text-xs text-muted-foreground">{email.customerEmail}</div>
                    {email.customerPhone && <div className="text-xs text-muted-foreground">{email.customerPhone}</div>}
                  </td>
                  <td className="py-2 pr-4 text-sm">
                    {email.customerCity || <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="py-2 pr-4 text-sm">
                    {email.collectionName || <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="py-2 pr-4 text-sm">
                    {email.sqft ? `${email.sqft} ft²` : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="py-2 pr-4 text-sm font-medium">
                    {email.finalTotal ? fmt(Number(email.finalTotal)) : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="py-2 pr-4 text-xs">
                    {getUserName(email.assignedUserId) ? (
                      <span className="font-medium text-foreground">{getUserName(email.assignedUserId)}</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="py-2 pr-4">
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
                      email.emailType === "resend" ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-700"
                    }`}>
                      {email.emailType === "resend" ? <RefreshCw className="w-3 h-3" /> : <Send className="w-3 h-3" />}
                      {email.emailType}
                    </span>
                  </td>
                  <td className="py-2 pr-4">
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
                      email.status === "sent" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                    }`}>
                      {email.status === "sent" ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      {email.status}
                    </span>
                    {email.errorMessage && (
                      <p className="text-xs text-red-600 mt-0.5 max-w-[160px] truncate" title={email.errorMessage}>
                        {email.errorMessage}
                      </p>
                    )}
                  </td>
                  <td className="py-2">
                    <div className="flex items-center gap-2">
                      {email.signRequestToken && (
                        <a
                          href={`/sign/${email.signRequestToken}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                        >
                          <ExternalLink className="w-3 h-3" /> Sign Link
                        </a>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-7 px-2"
                        onClick={() => resendMutation.mutate({ id: email.id })}
                        disabled={resendMutation.isPending}
                      >
                        {resendMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                        Resend
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PanelCard>
  );
}

/* ─── Contract Templates Panel ───────────────────────────────────────────── */
function ContractTemplatesPanel() {
  const utils = trpc.useUtils();
  const { data: templates = [], isLoading } = trpc.contractTemplates.getAll.useQuery();
  const createMutation = trpc.contractTemplates.create.useMutation({
    onSuccess: () => { utils.contractTemplates.getAll.invalidate(); setShowCreate(false); setNewName(""); setNewServiceType(""); setNewText(""); toast.success("Contract template created"); },
    onError: (e: any) => toast.error(e.message || "Failed to create template"),
  });
  const updateMutation = trpc.contractTemplates.update.useMutation({
    onSuccess: () => { utils.contractTemplates.getAll.invalidate(); setEditingId(null); toast.success("Template updated"); },
    onError: (e: any) => toast.error(e.message || "Failed to update template"),
  });
  const deleteMutation = trpc.contractTemplates.delete.useMutation({
    onSuccess: () => { utils.contractTemplates.getAll.invalidate(); toast.success("Template deleted"); },
    onError: (e: any) => toast.error(e.message || "Failed to delete template"),
  });

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newServiceType, setNewServiceType] = useState("");
  const [newText, setNewText] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editServiceType, setEditServiceType] = useState("");
  const [editText, setEditText] = useState("");
  const [editIsDefault, setEditIsDefault] = useState(0);
  const [editIsActive, setEditIsActive] = useState(1);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const startEdit = (t: any) => {
    setEditingId(t.id);
    setEditName(t.name);
    setEditServiceType(t.serviceType);
    setEditText(t.contractText);
    setEditIsDefault(t.isDefault ?? 0);
    setEditIsActive(t.isActive ?? 1);
  };

  return (
    <PanelCard
      title="Contract Templates"
      description="Manage the contract verbiage for different services. These templates define the legal text included in estimate signing links."
      actions={
        <Button size="sm" className="gap-1.5" onClick={() => setShowCreate(v => !v)}>
          <Plus className="w-4 h-4" /> New Template
        </Button>
      }
    >
      {showCreate && (
        <div className="mb-6 p-4 border border-border/60 rounded-lg bg-muted/30 space-y-3">
          <h3 className="font-semibold text-sm">New Contract Template</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Template Name</label>
              <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Tanzite Decking Standard" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Service Type</label>
              <Input value={newServiceType} onChange={e => setNewServiceType(e.target.value)} placeholder="e.g. tanzite, resin, duradek" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Contract Text</label>
            <Textarea
              value={newText}
              onChange={e => setNewText(e.target.value)}
              placeholder="Enter the full contract verbiage here…"
              rows={12}
              className="font-mono text-xs"
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => createMutation.mutate({ name: newName, serviceType: newServiceType, contractText: newText, isDefault: 0, isActive: 1 })} disabled={!newName || !newServiceType || !newText || createMutation.isPending}>
              {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Template
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowCreate(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground py-8 justify-center">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading…
        </div>
      ) : templates.length === 0 ? (
        <p className="text-muted-foreground text-sm py-8 text-center">No contract templates yet. Create one above.</p>
      ) : (
        <div className="space-y-3">
          {templates.map(t => (
            <div key={t.id} className="border border-border/60 rounded-lg overflow-hidden">
              {editingId === t.id ? (
                <div className="p-4 space-y-3 bg-muted/20">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium mb-1">Template Name</label>
                      <Input value={editName} onChange={e => setEditName(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">Service Type</label>
                      <Input value={editServiceType} onChange={e => setEditServiceType(e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Contract Text</label>
                    <Textarea
                      value={editText}
                      onChange={e => setEditText(e.target.value)}
                      rows={16}
                      className="font-mono text-xs"
                    />
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <Switch checked={editIsDefault === 1} onCheckedChange={v => setEditIsDefault(v ? 1 : 0)} />
                      Default template
                    </label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <Switch checked={editIsActive === 1} onCheckedChange={v => setEditIsActive(v ? 1 : 0)} />
                      Active
                    </label>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => updateMutation.mutate({ id: t.id, name: editName, serviceType: editServiceType, contractText: editText, isDefault: editIsDefault, isActive: editIsActive })} disabled={updateMutation.isPending}>
                      {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setEditingId(null)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">{t.name}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{t.serviceType}</span>
                        {t.isDefault === 1 && <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">Default</span>}
                        {t.isActive === 0 && <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">Inactive</span>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {t.contractText.length} characters · Last updated {new Date(t.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button variant="outline" size="sm" className="text-xs h-7 px-2" onClick={() => setExpandedId(expandedId === t.id ? null : t.id)}>
                        {expandedId === t.id ? "Hide" : "Preview"}
                      </Button>
                      <Button variant="outline" size="sm" className="text-xs h-7 px-2" onClick={() => startEdit(t)}>
                        <Save className="w-3 h-3" /> Edit
                      </Button>
                      <Button variant="outline" size="sm" className="text-xs h-7 px-2 text-red-600 hover:text-red-700" onClick={() => { if (confirm("Delete this template?")) deleteMutation.mutate({ id: t.id }); }}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  {expandedId === t.id && (
                    <div className="mt-3 p-3 bg-muted/30 rounded border border-border/40">
                      <pre className="text-xs font-mono whitespace-pre-wrap text-foreground/80 max-h-64 overflow-y-auto">{t.contractText}</pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </PanelCard>
  );
}

/* ─── Calculator Users Panel ─────────────────────────────────────────────── */
// Permission labels for display
const PERMISSION_LABELS: Record<string, string> = {
  viewCalculator: "View Calculator",
  sendEstimate: "Send Estimates",
  viewOwnEstimates: "View Own Estimates",
  viewOwnContracts: "View Own Contracts",
  viewTeamEstimates: "View Team Estimates",
  viewTeamContracts: "View Team Contracts",
  viewAllEstimates: "View All Estimates",
  viewAllContracts: "View All Contracts",
  viewPricing: "View Pricing",
  editPricing: "Edit Pricing",
  manageUsers: "Manage Users",
  viewAdminPanel: "View Admin Panel",
};

const DEFAULT_PERMISSIONS_BY_ROLE: Record<string, Record<string, boolean>> = {
  super_admin: {
    viewCalculator: true, sendEstimate: true, viewOwnEstimates: true, viewOwnContracts: true,
    viewTeamEstimates: true, viewTeamContracts: true, viewAllEstimates: true, viewAllContracts: true,
    viewPricing: true, editPricing: true, manageUsers: true, viewAdminPanel: true,
  },
  manager: {
    viewCalculator: true, sendEstimate: true, viewOwnEstimates: true, viewOwnContracts: true,
    viewTeamEstimates: true, viewTeamContracts: true, viewAllEstimates: false, viewAllContracts: false,
    viewPricing: true, editPricing: false, manageUsers: false, viewAdminPanel: false,
  },
  rep: {
    viewCalculator: true, sendEstimate: true, viewOwnEstimates: true, viewOwnContracts: true,
    viewTeamEstimates: false, viewTeamContracts: false, viewAllEstimates: false, viewAllContracts: false,
    viewPricing: true, editPricing: false, manageUsers: false, viewAdminPanel: false,
  },
};

function getRoleBadge(role: string) {
  if (role === "super_admin") return <span className="inline-flex items-center gap-1 text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 px-1.5 py-0.5 rounded-full font-medium"><Crown className="w-3 h-3" /> Super Admin</span>;
  if (role === "manager") return <span className="inline-flex items-center gap-1 text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-1.5 py-0.5 rounded-full font-medium"><Star className="w-3 h-3" /> Manager</span>;
  return <span className="inline-flex items-center gap-1 text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full font-medium"><UserCog className="w-3 h-3" /> Rep</span>;
}

function CalculatorUsersPanel() {
  const utils = trpc.useUtils();
  const { data: users = [], isLoading } = trpc.calculatorUsers.getAll.useQuery();

  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [expandedUserId, setExpandedUserId] = useState<number | null>(null);
  const [form, setForm] = useState({
    name: "", email: "", phone: "", pin: "", isActive: 1,
    role: "rep" as "super_admin" | "manager" | "rep",
    managerId: null as number | null,
    permissions: { ...DEFAULT_PERMISSIONS_BY_ROLE.rep },
  });
  const [showPin, setShowPin] = useState(false);
  const [saving, setSaving] = useState(false);

  const createMutation = trpc.calculatorUsers.create.useMutation({
    onSuccess: () => { utils.calculatorUsers.getAll.invalidate(); setShowForm(false); resetForm(); toast.success("User created"); },
    onError: (e) => toast.error(e.message),
  });
  const updateMutation = trpc.calculatorUsers.update.useMutation({
    onSuccess: () => { utils.calculatorUsers.getAll.invalidate(); setEditingUser(null); setExpandedUserId(null); resetForm(); toast.success("User updated"); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMutation = trpc.calculatorUsers.delete.useMutation({
    onSuccess: () => { utils.calculatorUsers.getAll.invalidate(); toast.success("User deleted"); },
    onError: (e) => toast.error(e.message),
  });

  function resetForm() {
    setForm({ name: "", email: "", phone: "", pin: "", isActive: 1, role: "rep", managerId: null, permissions: { ...DEFAULT_PERMISSIONS_BY_ROLE.rep } });
    setShowPin(false);
  }

  function startEdit(u: any) {
    setEditingUser(u);
    setForm({
      name: u.name, email: u.email, phone: u.phone ?? "", pin: u.pin, isActive: u.isActive,
      role: u.role ?? "rep",
      managerId: u.managerId ?? null,
      permissions: u.permissions ?? { ...DEFAULT_PERMISSIONS_BY_ROLE[u.role ?? "rep"] },
    });
    setShowForm(false);
    setExpandedUserId(null);
  }

  function handleRoleChange(role: "super_admin" | "manager" | "rep") {
    setForm(f => ({
      ...f,
      role,
      managerId: role === "super_admin" ? null : f.managerId,
      permissions: { ...DEFAULT_PERMISSIONS_BY_ROLE[role] },
    }));
  }

  async function handleSave() {
    if (!form.name.trim()) return toast.error("Name is required");
    if (!form.email.trim()) return toast.error("Email is required");
    if (!/^\d{4}$/.test(form.pin)) return toast.error("PIN must be exactly 4 digits");
    setSaving(true);
    try {
      if (editingUser) {
        await updateMutation.mutateAsync({
          id: editingUser.id, name: form.name, email: form.email,
          phone: form.phone || undefined, pin: form.pin, isActive: form.isActive,
          role: form.role, managerId: form.managerId, permissions: form.permissions,
        });
      } else {
        await createMutation.mutateAsync({
          name: form.name, email: form.email, phone: form.phone || undefined,
          pin: form.pin, isActive: form.isActive, role: form.role,
          managerId: form.managerId ?? undefined, permissions: form.permissions,
        });
      }
    } finally {
      setSaving(false);
    }
  }

  // Managers and super admins available for assignment
  const managers = (users as any[]).filter((u: any) => u.role === "manager" || u.role === "super_admin");

  return (
    <PanelCard title="Calculator Users" description="Manage who can access the cost calculator. Each user has a unique 4-digit PIN and a role (Rep, Manager, or Super Admin).">
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-muted-foreground">{(users as any[]).length} user{(users as any[]).length !== 1 ? "s" : ""} total</p>
        <Button size="sm" onClick={() => { setShowForm(!showForm); setEditingUser(null); resetForm(); }} className="gap-1.5">
          <UserPlus className="w-4 h-4" /> Add User
        </Button>
      </div>

      {/* Add / Edit Form */}
      {(showForm || editingUser) && (
        <div className="mb-6 p-4 border border-border rounded-lg bg-muted/20 space-y-4">
          <h3 className="text-sm font-semibold">{editingUser ? `Edit: ${editingUser.name}` : "New Calculator User"}</h3>

          {/* Basic Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Name *</label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Full name" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Email *</label>
              <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@example.com" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Phone (optional)</label>
              <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="(555) 000-0000" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">4-Digit PIN *</label>
              <div className="relative">
                <Input
                  type={showPin ? "text" : "password"}
                  value={form.pin}
                  onChange={e => { const v = e.target.value.replace(/\D/g, "").slice(0, 4); setForm(f => ({ ...f, pin: v })); }}
                  placeholder="••••"
                  maxLength={4}
                  className="pr-10 font-mono tracking-widest"
                />
                <button type="button" onClick={() => setShowPin(s => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Role & Manager Assignment */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Role</label>
              <Select value={form.role} onValueChange={(v) => handleRoleChange(v as any)}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rep">Rep — Basic access</SelectItem>
                  <SelectItem value="manager">Manager — Manages reps</SelectItem>
                  <SelectItem value="super_admin">Super Admin — Full access</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.role !== "super_admin" && (
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Reports To (optional)</label>
                <Select
                  value={form.managerId ? String(form.managerId) : "none"}
                  onValueChange={(v) => setForm(f => ({ ...f, managerId: v === "none" ? null : Number(v) }))}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="No manager assigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No manager assigned</SelectItem>
                    {managers
                      .filter((m: any) => !editingUser || m.id !== editingUser.id)
                      .map((m: any) => (
                        <SelectItem key={m.id} value={String(m.id)}>{m.name} ({m.role === "super_admin" ? "Super Admin" : "Manager"})</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Permissions */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block">Permissions</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 bg-background rounded-md border border-border">
              {Object.entries(PERMISSION_LABELS).map(([key, label]) => (
                <div key={key} className="flex items-center justify-between gap-2">
                  <span className="text-xs text-foreground">{label}</span>
                  <Switch
                    checked={!!form.permissions[key]}
                    onCheckedChange={v => setForm(f => ({ ...f, permissions: { ...f.permissions, [key]: v } }))}
                    id={`perm-${key}`}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Switch checked={form.isActive === 1} onCheckedChange={v => setForm(f => ({ ...f, isActive: v ? 1 : 0 }))} id="calc-user-active" />
            <label htmlFor="calc-user-active" className="text-sm">Active (can log in)</label>
          </div>
          <div className="flex gap-2 pt-1">
            <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {editingUser ? "Save Changes" : "Create User"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => { setShowForm(false); setEditingUser(null); resetForm(); }}>Cancel</Button>
          </div>
        </div>
      )}

      {/* User List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : (users as any[]).length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No calculator users yet. Add one to get started.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {(users as any[]).map((u: any) => {
            const managerUser = u.managerId ? (users as any[]).find((m: any) => m.id === u.managerId) : null;
            const isExpanded = expandedUserId === u.id;
            const perms: Record<string, boolean> = u.permissions ?? {};
            return (
              <div key={u.id} className={`rounded-lg border ${u.isActive ? "border-border bg-card" : "border-border/40 bg-muted/20 opacity-60"}`}>
                {/* User row */}
                <div className="flex items-center justify-between p-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{u.name}</span>
                      {getRoleBadge(u.role ?? "rep")}
                      {u.isActive ? (
                        <span className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-1.5 py-0.5 rounded-full font-medium">Active</span>
                      ) : (
                        <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full font-medium">Inactive</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{u.email}{u.phone ? ` · ${u.phone}` : ""}</p>
                    {managerUser && (
                      <p className="text-xs text-muted-foreground mt-0.5">Reports to: <span className="font-medium">{managerUser.name}</span></p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 ml-3 flex-shrink-0">
                    <Button
                      variant="outline" size="sm" className="text-xs h-7 px-2 gap-1"
                      onClick={() => setExpandedUserId(isExpanded ? null : u.id)}
                    >
                      <ChevronDown className={`w-3 h-3 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                      Perms
                    </Button>
                    <Button variant="outline" size="sm" className="text-xs h-7 px-2" onClick={() => startEdit(u)}>Edit</Button>
                    <Button
                      variant="outline" size="sm" className="text-xs h-7 px-2"
                      onClick={() => updateMutation.mutate({ id: u.id, isActive: u.isActive ? 0 : 1 })}
                    >
                      {u.isActive ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    </Button>
                    <Button
                      variant="outline" size="sm" className="text-xs h-7 px-2 text-red-600 hover:text-red-700"
                      onClick={() => { if (confirm(`Delete user "${u.name}"? This cannot be undone.`)) deleteMutation.mutate({ id: u.id }); }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>

                {/* Expanded permissions panel */}
                {isExpanded && (
                  <div className="border-t border-border px-3 pb-3 pt-2">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Permissions — click to toggle</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                      {Object.entries(PERMISSION_LABELS).map(([key, label]) => {
                        const enabled = !!perms[key];
                        return (
                          <button
                            key={key}
                            onClick={() => {
                              const newPerms = { ...perms, [key]: !enabled };
                              updateMutation.mutate({ id: u.id, permissions: newPerms });
                            }}
                            className={`text-left text-xs px-2 py-1.5 rounded border transition-colors ${
                              enabled
                                ? "bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-700 dark:text-green-300"
                                : "bg-muted/30 border-border text-muted-foreground"
                            }`}
                          >
                            {enabled ? "✓" : "✗"} {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </PanelCard>
  );
}

/* ─── Project Management Panel ──────────────────────────────────────────── */

const PROJECT_STATUSES = [
  { value: "lead", label: "Lead", color: "bg-slate-100 text-slate-700" },
  { value: "estimate-sent", label: "Estimate Sent", color: "bg-blue-100 text-blue-700" },
  { value: "contract-signed", label: "Contract Signed", color: "bg-purple-100 text-purple-700" },
  { value: "in-progress", label: "In Progress", color: "bg-amber-100 text-amber-700" },
  { value: "complete", label: "Complete", color: "bg-green-100 text-green-700" },
  { value: "cancelled", label: "Cancelled", color: "bg-red-100 text-red-700" },
];

function statusBadgeClass(status: string) {
  return PROJECT_STATUSES.find(s => s.value === status)?.color ?? "bg-slate-100 text-slate-700";
}
function statusLabel(status: string) {
  return PROJECT_STATUSES.find(s => s.value === status)?.label ?? status;
}

type MaterialSnapshot = {
  deckingPieces?: number;
  deckingBoards?: number;
  edgeLinearFt?: number;
  edgeTrimPieces?: number;
  railingLf?: number;
  railingStyle?: string;
  concreteWork?: string;
  demoWork?: string;
  lumberPackageCost?: number;
  lumberPackageItems?: { name: string; qty: number; cost: number }[];
  planDetails?: string;
  stairRuns?: { stairType: string; treads: number; lf: number }[];
  postWrapOptionName?: string;
  postWrapPostPieces?: { lengthFt: number; count: number }[];
  postWrapBeamPieces?: { lengthFt: number; count: number }[];
  postWrapMaterialCost?: number;
  postWrapLaborCost?: number;
  postWrapTotalCost?: number;
};

/* ─── Project Photos Section ───────────────────────────────────────────── */
function ProjectPhotosSection({
  project,
  customerPhotos,
  adminPhotos,
  allPhotos,
  onDeleteAdminPhoto,
  onUpload,
}: {
  project: any;
  customerPhotos: string[];
  adminPhotos: string[];
  allPhotos: string[];
  onDeleteAdminPhoto: (url: string) => void;
  onUpload: (file: File) => void;
}) {
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"site" | "project">("site");

  // Fetch site photos linked to this sign request
  const { data: sitePhotos = [] } = trpc.estimatePhotos.listBySignRequest.useQuery(
    { signRequestId: project.id },
    { enabled: true }
  );

  const CATEGORY_LABELS: Record<string, string> = {
    "site": "Site Overview", "materials": "Materials", "existing-deck": "Existing Deck",
    "damage": "Damage / Issues", "other": "Other",
  };
  const CATEGORY_COLORS: Record<string, string> = {
    "site": "bg-blue-100 text-blue-700", "materials": "bg-green-100 text-green-700",
    "existing-deck": "bg-amber-100 text-amber-700", "damage": "bg-red-100 text-red-700",
    "other": "bg-stone-100 text-stone-600",
  };

  const totalCount = allPhotos.length + (sitePhotos as any[]).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Photos ({totalCount})
        </p>
        {(sitePhotos as any[]).length > 0 && (
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab("site")}
              className={`text-[10px] font-semibold px-2 py-0.5 rounded transition-colors ${
                activeTab === "site" ? "bg-canyon text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              Site Photos ({(sitePhotos as any[]).length})
            </button>
            <button
              onClick={() => setActiveTab("project")}
              className={`text-[10px] font-semibold px-2 py-0.5 rounded transition-colors ${
                activeTab === "project" ? "bg-canyon text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              Project Photos ({allPhotos.length})
            </button>
          </div>
        )}
      </div>

      {/* Site photos tab */}
      {activeTab === "site" && (sitePhotos as any[]).length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 mb-3">
          {(sitePhotos as any[]).map((photo: any) => (
            <div key={photo.id} className="relative group cursor-pointer" onClick={() => setLightbox(photo.url)}>
              <img
                src={photo.url}
                alt={photo.caption || "Site photo"}
                className="w-full aspect-square object-cover rounded-md border border-border group-hover:opacity-90 transition-opacity"
              />
              <div className={`absolute top-1 left-1 text-[9px] font-semibold px-1 py-0.5 rounded ${CATEGORY_COLORS[photo.category] ?? "bg-stone-100 text-stone-600"}`}>
                {CATEGORY_LABELS[photo.category] ?? photo.category}
              </div>
              {photo.caption && (
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[9px] px-1 py-0.5 rounded-b-md truncate">
                  {photo.caption}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Site photos empty state */}
      {activeTab === "site" && (sitePhotos as any[]).length === 0 && (
        <p className="text-xs text-muted-foreground italic mb-3">No site photos captured during estimate appointment.</p>
      )}

      {/* Project photos tab (admin + customer uploads) */}
      {(activeTab === "project" || (sitePhotos as any[]).length === 0) && (
        <div className="flex flex-wrap gap-2">
          {allPhotos.map((url, i) => (
            <div key={i} className="relative group cursor-pointer" onClick={() => setLightbox(url)}>
              <img
                src={url}
                alt={`Project photo ${i + 1}`}
                className="w-24 h-24 object-cover rounded-md border border-border"
              />
              {adminPhotos.includes(url) && (
                <button
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => { e.stopPropagation(); onDeleteAdminPhoto(url); }}
                >
                  <XIcon className="w-3 h-3" />
                </button>
              )}
              {customerPhotos.includes(url) && (
                <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[10px] px-1 rounded">Customer</span>
              )}
            </div>
          ))}
          <label className="w-24 h-24 border-2 border-dashed border-border rounded-md flex flex-col items-center justify-center cursor-pointer hover:bg-muted/30 transition-colors">
            <Upload className="w-5 h-5 text-muted-foreground mb-1" />
            <span className="text-[10px] text-muted-foreground">Add Photo</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => { const file = e.target.files?.[0]; if (file) onUpload(file); }}
            />
          </label>
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <button onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white">
            <XIcon className="w-5 h-5" />
          </button>
          <img src={lightbox} alt="Photo" className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl" onClick={e => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}

function ProjectManagementPanel() {
  const utils = trpc.useUtils();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);

  const { data: projects = [], isLoading } = trpc.projects.getAll.useQuery(
    statusFilter !== "all" ? { status: statusFilter } : undefined
  );

  const updateProject = trpc.projects.updateProject.useMutation({
    onSuccess: () => { utils.projects.getAll.invalidate(); toast.success("Project updated"); },
    onError: (e) => toast.error(e.message),
  });

  const uploadPhoto = trpc.projects.uploadPhoto.useMutation({
    onSuccess: () => { utils.projects.getAll.invalidate(); toast.success("Photo uploaded"); },
    onError: (e) => toast.error(e.message),
  });

  const deletePhoto = trpc.projects.deletePhoto.useMutation({
    onSuccess: () => { utils.projects.getAll.invalidate(); toast.success("Photo removed"); },
    onError: (e) => toast.error(e.message),
  });

  const exportMaterialPickList = (project: any, snap: MaterialSnapshot | null, estimateSnap: any) => {
    const rows: string[][] = [];
    const esc = (v: string | number | undefined | null) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    rows.push(["Tanzite Stone Decking — Material Pick List"]);
    rows.push([`Customer: ${project.customerName || ""}`, `Date: ${new Date().toLocaleDateString()}`, `Address: ${project.customerAddress || ""}${project.customerCity ? `, ${project.customerCity}` : ""}`]);
    rows.push([`Collection: ${project.collectionName || ""}`, `Color: ${project.colorName || ""}`, `Deck Size: ${project.sqft > 0 ? project.sqft + " sq ft" : ""}`]);
    rows.push([]);
    rows.push(["Category", "Item", "Qty / LF", "Unit", "Notes"]);
    // Decking
    if (snap?.deckingPieces) rows.push(["Decking", "Decking Pieces", String(snap.deckingPieces), "pcs", ""]);
    if (snap?.deckingBoards) rows.push(["Decking", "Decking Boards", String(snap.deckingBoards), "boards", ""]);
    // Edge
    if (snap?.edgeLinearFt) rows.push(["Edge", "Edge Linear Feet", String(snap.edgeLinearFt), "LF", ""]);
    if (snap?.edgeTrimPieces) rows.push(["Edge", "Edge Trim Pieces", String(snap.edgeTrimPieces), "pcs", ""]);
    // Railing
    if (snap?.railingLf) rows.push(["Railing", `Railing (${snap.railingStyle || ""})`, String(snap.railingLf), "LF", ""]);
    // Lumber package
    if (snap?.lumberPackageItems && snap.lumberPackageItems.length > 0) {
      snap.lumberPackageItems.forEach(item => {
        rows.push(["Lumber", item.name, String(item.qty), "pcs", `$${item.cost.toFixed(2)}`]);
      });
    } else if (snap?.lumberPackageCost) {
      rows.push(["Lumber", "Lumber Package", "", "", `$${snap.lumberPackageCost.toFixed(2)}`]);
    }
    // Stairs
    if (snap?.stairRuns && snap.stairRuns.length > 0) {
      snap.stairRuns.forEach((run, i) => {
        rows.push(["Stairs", `Stair Run ${i + 1} (${run.stairType})`, String(run.treads), "treads", `${run.lf} LF`]);
      });
    }
    // Post & Beam Wrap
    const wrapData = snap?.postWrapOptionName ? snap : estimateSnap;
    if (wrapData?.postWrapOptionName) {
      rows.push([]);
      rows.push(["POST & BEAM WRAP PICK LIST", "", "", "", ""]);
      rows.push(["Wrap Style", wrapData.postWrapOptionName, "", "", ""]);
      if (wrapData.postWrapPostPieces && wrapData.postWrapPostPieces.length > 0) {
        rows.push(["Wrap — Posts", "Length", "Count", "Unit", ""]);
        wrapData.postWrapPostPieces.forEach((p: { lengthFt: number; count: number }) => {
          rows.push(["", `${p.lengthFt}' pieces`, String(p.count), "pcs", ""]);
        });
      }
      if (wrapData.postWrapBeamPieces && wrapData.postWrapBeamPieces.length > 0) {
        rows.push(["Wrap — Beams", "Length", "Count", "Unit", ""]);
        wrapData.postWrapBeamPieces.forEach((p: { lengthFt: number; count: number }) => {
          rows.push(["", `${p.lengthFt}' pieces`, String(p.count), "pcs", ""]);
        });
      }
      if (wrapData.postWrapMaterialCost != null) rows.push(["Wrap Material Cost", "", "", "", `$${Number(wrapData.postWrapMaterialCost).toFixed(2)}`]);
      if (wrapData.postWrapLaborCost != null && wrapData.postWrapLaborCost > 0) rows.push(["Wrap Labor Cost", "", "", "", `$${Number(wrapData.postWrapLaborCost).toFixed(2)}`]);
      if (wrapData.postWrapTotalCost != null) rows.push(["Wrap Total", "", "", "", `$${Number(wrapData.postWrapTotalCost).toFixed(2)}`]);
    }
    // Other
    if (snap?.concreteWork) rows.push(["Concrete", snap.concreteWork, "", "", ""]);
    if (snap?.demoWork) rows.push(["Demo", snap.demoWork, "", "", ""]);
    if (snap?.planDetails) rows.push(["Plan", snap.planDetails, "", "", ""]);
    // Totals
    rows.push([]);
    rows.push(["Total", "", "", "", `$${Number(project.finalTotal || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`]);

    const csvContent = rows.map(r => r.map(esc).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const safeName = (project.customerName || "project").replace(/[^a-z0-9]/gi, "_").toLowerCase();
    a.href = url;
    a.download = `pick_list_${safeName}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Pick list downloaded");
  };

  const handlePhotoUpload = (id: number, file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      uploadPhoto.mutate({ id, fileBase64: base64, mimeType: file.type });
    };
    reader.readAsDataURL(file);
  };

  const fmt = (n: number | string | null | undefined) =>
    n == null ? "—" : `$${Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const totalsByStatus = PROJECT_STATUSES.map(s => ({
    ...s,
    count: projects.filter(p => p.projectStatus === s.value).length,
  }));

  return (
    <PanelCard
      title="Project Management"
      description="Track every project from lead through completion — view material quantities, cost breakdown, photos, and status."
    >
      {/* Status summary bar */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => setStatusFilter("all")}
          className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${statusFilter === "all" ? "bg-foreground text-background border-foreground" : "border-border hover:bg-muted"}`}
        >
          All ({projects.length})
        </button>
        {totalsByStatus.map(s => (
          <button
            key={s.value}
            onClick={() => setStatusFilter(s.value === statusFilter ? "all" : s.value)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${statusFilter === s.value ? "bg-foreground text-background border-foreground" : "border-border hover:bg-muted"}`}
          >
            {s.label} ({s.count})
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      )}

      {!isLoading && projects.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <FolderKanban className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No projects found{statusFilter !== "all" ? ` with status "${statusLabel(statusFilter)}"` : ""}.</p>
          <p className="text-xs mt-1">Projects are created automatically when an estimate is sent.</p>
        </div>
      )}

      <div className="space-y-3">
        {projects.map(project => {
          const isExpanded = expandedId === project.id;
          const isEditing = editingId === project.id;
          const snap = project.materialSnapshot as MaterialSnapshot | null;
          const customerPhotos = (project.photoUrls as string[]) || [];
          const adminPhotos = (project.projectPhotos as string[]) || [];
          const allPhotos = [...customerPhotos, ...adminPhotos];

          // Parse pricingBreakdown for line items
          let lineItems: { name: string; cost: number }[] = [];
          if (project.pricingBreakdown) {
            // pricingBreakdown is a text summary; also try estimateSnapshot for structured data
          }
          let estimateSnap: any = null;
          try { estimateSnap = project.estimateSnapshot ? JSON.parse(project.estimateSnapshot) : null; } catch {}

          return (
            <div key={project.id} className="border border-border rounded-lg overflow-hidden bg-card">
              {/* Project card header */}
              <div
                className="flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => setExpandedId(isExpanded ? null : project.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm truncate">{project.customerName}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBadgeClass(project.projectStatus)}`}>
                      {statusLabel(project.projectStatus)}
                    </span>
                    {project.status === "signed" && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">✓ Signed</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                    {project.customerAddress && <span>{project.customerAddress}{project.customerCity ? `, ${project.customerCity}` : ""}</span>}
                    {project.collectionName && <span className="font-medium text-foreground/70">{project.collectionName}</span>}
                    {project.colorName && <span>{project.colorName}</span>}
                    {project.sqft > 0 && <span>{project.sqft.toLocaleString()} sq ft</span>}
                    <span className="font-semibold text-foreground">{fmt(project.finalTotal)}</span>
                    <span>{new Date(project.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {allPhotos.length > 0 && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Camera className="w-3 h-3" />{allPhotos.length}
                    </span>
                  )}
                  {isExpanded ? <ChevronDownIcon className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                </div>
              </div>

              {/* Expanded project details */}
              {isExpanded && (
                <div className="border-t border-border p-4 space-y-5 bg-muted/10">
                  {/* Status + Rep row */}
                  <div className="flex flex-wrap gap-4 items-start">
                    <div className="flex-1 min-w-[200px]">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Project Status</p>
                      <Select
                        value={project.projectStatus}
                        onValueChange={(v) => updateProject.mutate({ id: project.id, projectStatus: v })}
                      >
                        <SelectTrigger className="h-8 text-xs w-48">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PROJECT_STATUSES.map(s => (
                            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex-1 min-w-[200px]">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Customer Contact</p>
                      <div className="text-xs space-y-0.5">
                        <p>{project.customerEmail}</p>
                        {project.customerPhone && <p>{project.customerPhone}</p>}
                      </div>
                    </div>
                    {project.signedAt && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Signed</p>
                        <p className="text-xs">{new Date(project.signedAt).toLocaleDateString()} by {project.signedName}</p>
                      </div>
                    )}
                  </div>

                  {/* Material quantities grid */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Material Quantities</p>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 text-xs gap-1"
                          onClick={() => exportMaterialPickList(project, snap, estimateSnap)}
                          title="Export pick list as CSV"
                        >
                          <Download className="w-3 h-3" />Export CSV
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 text-xs gap-1"
                          onClick={() => setEditingId(isEditing ? null : project.id)}
                        >
                          <Pencil className="w-3 h-3" />{isEditing ? "Done" : "Edit"}
                        </Button>
                      </div>
                    </div>
                    <ProjectMaterialEditor
                      projectId={project.id}
                      snap={snap}
                      estimateSnap={estimateSnap}
                      editing={isEditing}
                      onSave={(data) => {
                        updateProject.mutate({ id: project.id, materialSnapshot: data });
                        setEditingId(null);
                      }}
                    />
                  </div>

                  {/* Cost breakdown */}
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Cost Breakdown</p>
                    <ProjectCostBreakdown project={project} estimateSnap={estimateSnap} fmt={fmt} />
                  </div>

                  {/* Scope of work */}
                  {project.scopeOfWork && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Scope of Work</p>
                      <pre className="text-xs whitespace-pre-wrap bg-muted/30 rounded p-3 max-h-48 overflow-y-auto">{project.scopeOfWork}</pre>
                    </div>
                  )}

                  {/* Mood Board Notes (from rep/customer during estimate) */}
                  {project.projectNotes && project.projectNotes.trim() && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1">
                        <span>📋</span> Project Notes (from Estimate)
                      </p>
                      <div className="text-xs whitespace-pre-wrap bg-amber-50/60 border border-amber-200/60 rounded p-3 text-foreground leading-relaxed">
                        {project.projectNotes}
                      </div>
                    </div>
                  )}

                  {/* Linked Questionnaire Session */}
                  {project.questionnaireSessionId && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1">
                        <ClipboardList className="w-3.5 h-3.5" /> Linked Questionnaire
                      </p>
                      <div className="bg-blue-50/60 border border-blue-200/60 rounded p-3 flex items-center gap-3">
                        <span className="text-xs text-blue-700 font-medium">Session #{project.questionnaireSessionId}</span>
                        <span className="text-xs text-muted-foreground">Questionnaire answers are linked to this estimate</span>
                      </div>
                    </div>
                  )}

                  {/* Internal Admin Notes */}
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Internal Notes</p>
                    <ProjectNotesEditor
                      projectId={project.id}
                      notes={project.projectNotes || ""}
                      onSave={(notes) => updateProject.mutate({ id: project.id, projectNotes: notes })}
                    />
                  </div>

                  {/* Photos */}
                  <ProjectPhotosSection
                    project={project}
                    customerPhotos={customerPhotos}
                    adminPhotos={adminPhotos}
                    allPhotos={allPhotos}
                    onDeleteAdminPhoto={(url) => deletePhoto.mutate({ id: project.id, photoUrl: url })}
                    onUpload={(file) => handlePhotoUpload(project.id, file)}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </PanelCard>
  );
}

/* ─── Project Material Editor ───────────────────────────────────────────── */
function ProjectMaterialEditor({
  projectId,
  snap,
  estimateSnap,
  editing,
  onSave,
}: {
  projectId: number;
  snap: MaterialSnapshot | null;
  estimateSnap?: any;
  editing: boolean;
  onSave: (data: MaterialSnapshot) => void;
}) {
  const [form, setForm] = useState<MaterialSnapshot>(snap || {});
  useEffect(() => { setForm(snap || {}); }, [snap]);

  const field = (key: keyof MaterialSnapshot, label: string, type: "number" | "text" = "text") => (
    <div key={key} className="flex flex-col gap-0.5">
      <span className="text-[10px] text-muted-foreground">{label}</span>
      {editing ? (
        <Input
          type={type}
          value={(form[key] as any) ?? ""}
          onChange={(e) => setForm(f => ({ ...f, [key]: type === "number" ? (e.target.value === "" ? undefined : Number(e.target.value)) : e.target.value }))}
          className="h-7 text-xs"
        />
      ) : (
        <span className="text-xs font-medium">{(snap as any)?.[key] ?? <span className="text-muted-foreground italic">—</span>}</span>
      )}
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 bg-muted/20 rounded-lg p-3">
        {field("deckingPieces", "Decking Pieces", "number")}
        {field("deckingBoards", "Decking Boards", "number")}
        {field("edgeLinearFt", "Edge Linear Ft", "number")}
        {field("edgeTrimPieces", "Edge Trim Pieces", "number")}
        {field("railingLf", "Railing Linear Ft", "number")}
        {field("railingStyle", "Railing Style")}
        {field("lumberPackageCost", "Lumber Package Cost", "number")}
        {field("planDetails", "Plan Details")}
        {field("concreteWork", "Concrete Work")}
        {field("demoWork", "Demo Work")}
      </div>

      {/* Post & Beam Wrap Materials — read-only from estimateSnapshot */}
      {(snap?.postWrapOptionName || estimateSnap?.postWrapOptionName) && (() => {
        const wrapData = snap?.postWrapOptionName ? snap : estimateSnap;
        return (
        <div className="bg-amber-50/60 border border-amber-200/50 rounded-lg p-3 space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-700">Post &amp; Beam Wrap</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] text-muted-foreground">Wrap Style</span>
              <span className="text-xs font-medium">{wrapData.postWrapOptionName}</span>
            </div>
            {wrapData.postWrapPostPieces && wrapData.postWrapPostPieces.length > 0 && (
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] text-muted-foreground">Post Pieces</span>
                <span className="text-xs font-medium">{wrapData.postWrapPostPieces.map((p: any) => `${p.count}×${p.lengthFt}'`).join(', ')}</span>
              </div>
            )}
            {wrapData.postWrapBeamPieces && wrapData.postWrapBeamPieces.length > 0 && (
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] text-muted-foreground">Beam Pieces</span>
                <span className="text-xs font-medium">{wrapData.postWrapBeamPieces.map((p: any) => `${p.count}×${p.lengthFt}'`).join(', ')}</span>
              </div>
            )}
            {wrapData.postWrapMaterialCost != null && (
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] text-muted-foreground">Material Cost</span>
                <span className="text-xs font-medium">${Number(wrapData.postWrapMaterialCost).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            {wrapData.postWrapLaborCost != null && wrapData.postWrapLaborCost > 0 && (
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] text-muted-foreground">Labor Cost</span>
                <span className="text-xs font-medium">${Number(wrapData.postWrapLaborCost).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            {wrapData.postWrapTotalCost != null && (
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] text-muted-foreground">Wrap Total</span>
                <span className="text-xs font-semibold text-amber-700">${Number(wrapData.postWrapTotalCost).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
            )}
          </div>
        </div>
        );
      })()}

      {editing && (
        <div className="flex gap-2">
          <Button size="sm" className="h-7 text-xs" onClick={() => onSave(form)}>
            <Save className="w-3 h-3 mr-1" /> Save Quantities
          </Button>
        </div>
      )}
    </div>
  );
}

/* ─── Project Cost Breakdown ────────────────────────────────────────────── */
function ProjectCostBreakdown({
  project,
  estimateSnap,
  fmt,
}: {
  project: any;
  estimateSnap: any;
  fmt: (n: any) => string;
}) {
  // Try to extract structured breakdown from pricingBreakdown text or estimateSnap
  const lines: { name: string; value: string }[] = [];

  if (estimateSnap) {
    if (estimateSnap.materialCost != null) lines.push({ name: "Materials", value: fmt(estimateSnap.materialCost) });
    if (estimateSnap.laborCost != null) lines.push({ name: "Labor", value: fmt(estimateSnap.laborCost) });
    if (estimateSnap.deliveryCost != null) lines.push({ name: "Delivery", value: fmt(estimateSnap.deliveryCost) });
    if (estimateSnap.accessoryCost != null && estimateSnap.accessoryCost > 0) lines.push({ name: "Accessories", value: fmt(estimateSnap.accessoryCost) });
    if (estimateSnap.demoRebuildSubtotal != null && estimateSnap.demoRebuildSubtotal > 0) lines.push({ name: "Demo & Rebuild", value: fmt(estimateSnap.demoRebuildSubtotal) });
    if (estimateSnap.rainEscapeSubtotal != null && estimateSnap.rainEscapeSubtotal > 0) lines.push({ name: "Rain Escape", value: fmt(estimateSnap.rainEscapeSubtotal) });
    if (estimateSnap.steelJacketSubtotal != null && estimateSnap.steelJacketSubtotal > 0) lines.push({ name: "A Steel Jacket", value: fmt(estimateSnap.steelJacketSubtotal) });
    if ((estimateSnap.postWrapCost ?? 0) > 0) lines.push({ name: `Post & Beam Wrap${estimateSnap.postWrapOptionName ? ` (${estimateSnap.postWrapOptionName})` : ''}`, value: fmt(estimateSnap.postWrapCost) });
    if (estimateSnap.taxAmount != null) lines.push({ name: "Tax", value: fmt(estimateSnap.taxAmount) });
  }

  // Build discount lines from project fields
  const discountLines: { name: string; value: string }[] = [];
  if (project.discountApplied && Number(project.discountValue) > 0) {
    discountLines.push({ name: project.discountName || "Discount", value: `-${fmt(Number(project.discountValue))}` });
  }
  if (project.discount2Applied && Number(project.discount2Value) > 0) {
    discountLines.push({ name: project.discount2Name || "Discount 2", value: `-${fmt(Number(project.discount2Value))}` });
  }

  // Always show grand total
  const hasLines = lines.length > 0;

  return (
    <div className="bg-muted/20 rounded-lg p-3 space-y-1">
      {hasLines ? (
        <>
          {lines.map((l, i) => (
            <div key={i} className="flex justify-between text-xs">
              <span className="text-muted-foreground">{l.name}</span>
              <span className="font-medium">{l.value}</span>
            </div>
          ))}
          {discountLines.map((l, i) => (
            <div key={`disc-${i}`} className="flex justify-between text-xs">
              <span className="text-green-600 font-medium">{l.name}</span>
              <span className="text-green-600 font-medium">{l.value}</span>
            </div>
          ))}
          <div className="border-t border-border pt-1 mt-1 flex justify-between text-sm font-semibold">
            <span>Grand Total</span>
            <span>{fmt(project.finalTotal)}</span>
          </div>
        </>
      ) : (
        /* Fall back to the text-based pricing breakdown */
        project.pricingBreakdown ? (
          <pre className="text-xs whitespace-pre-wrap max-h-48 overflow-y-auto">{project.pricingBreakdown}</pre>
        ) : (
          <div className="flex justify-between text-sm font-semibold">
            <span>Grand Total</span>
            <span>{fmt(project.finalTotal)}</span>
          </div>
        )
      )}
      <div className="flex justify-between text-xs text-muted-foreground pt-1">
        <span>Price / sq ft</span>
        <span>{fmt(project.pricePerSqft)}</span>
      </div>
      {project.laborName && (
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Labor Tier</span>
          <span>{project.laborName}</span>
        </div>
      )}
      {project.deliveryName && (
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Delivery</span>
          <span>{project.deliveryName}</span>
        </div>
      )}
    </div>
  );
}

/* ─── Project Notes Editor ──────────────────────────────────────────────── */
function ProjectNotesEditor({
  projectId,
  notes,
  onSave,
}: {
  projectId: number;
  notes: string;
  onSave: (notes: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(notes);
  useEffect(() => { setValue(notes); }, [notes]);

  if (!editing) {
    return (
      <div
        className="text-xs text-muted-foreground bg-muted/20 rounded p-3 min-h-[48px] cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => setEditing(true)}
      >
        {notes || <span className="italic">Click to add internal notes…</span>}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="text-xs min-h-[80px]"
        placeholder="Internal notes visible only to your team…"
        autoFocus
      />
      <div className="flex gap-2">
        <Button size="sm" className="h-7 text-xs" onClick={() => { onSave(value); setEditing(false); }}>
          <Save className="w-3 h-3 mr-1" /> Save Notes
        </Button>
        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setValue(notes); setEditing(false); }}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

/* ─── Frost Footing Pricing Panel ───────────────────────────────────────────── */
function FrostFootingPricingPanel() {
  const utils = trpc.useUtils();
  const { data: rows = [], isLoading } = trpc.frostFooting.getPricing.useQuery();
  const updateMutation = trpc.frostFooting.updatePricing.useMutation({
    onSuccess: () => { utils.frostFooting.getPricing.invalidate(); toast.success("Footing pricing updated"); },
    onError: () => toast.error("Failed to update footing pricing"),
  });

  const [editing, setEditing] = useState<Record<number, { costPerUnit: string; marginPct: string; pricePerUnit: string }>>({});

  const startEdit = (row: any) => {
    setEditing(prev => ({
      ...prev,
      [row.id]: { costPerUnit: row.costPerUnit, marginPct: row.marginPct, pricePerUnit: row.pricePerUnit },
    }));
  };

  const saveRow = (id: number) => {
    const e = editing[id];
    if (!e) return;
    updateMutation.mutate({ id, costPerUnit: e.costPerUnit, marginPct: e.marginPct, pricePerUnit: e.pricePerUnit });
    setEditing(prev => { const n = { ...prev }; delete n[id]; return n; });
  };

  return (
    <div className="bg-white rounded-xl border border-border/60 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-border/60 bg-muted/20">
        <h3 className="font-semibold text-base">Frost Footing Diameter Pricing</h3>
        <p className="text-sm text-muted-foreground mt-0.5">Set cost and price per footing by diameter (inches). These are used for automatic footing calculations based on joist span and post spacing.</p>
      </div>
      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground py-8 justify-center"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 border-b border-border/60">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Diameter (in)</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Label</th>
                <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Cost/Unit ($)</th>
                <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Margin (%)</th>
                <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Price/Unit ($)</th>
                <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row: any) => {
                const e = editing[row.id];
                return (
                  <tr key={row.id} className="border-b border-border/40 last:border-0 hover:bg-muted/10">
                    <td className="px-4 py-2.5 font-mono font-medium">{row.diameterIn}"</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{row.label}</td>
                    {e ? (
                      <>
                        <td className="px-4 py-2.5 text-right">
                          <Input value={e.costPerUnit} onChange={ev => setEditing(prev => ({ ...prev, [row.id]: { ...prev[row.id], costPerUnit: ev.target.value } }))} className="h-7 w-24 text-right ml-auto" />
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <Input value={e.marginPct} onChange={ev => setEditing(prev => ({ ...prev, [row.id]: { ...prev[row.id], marginPct: ev.target.value } }))} className="h-7 w-20 text-right ml-auto" />
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <Input value={e.pricePerUnit} onChange={ev => setEditing(prev => ({ ...prev, [row.id]: { ...prev[row.id], pricePerUnit: ev.target.value } }))} className="h-7 w-24 text-right ml-auto" />
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <div className="flex gap-1 justify-end">
                            <Button size="sm" className="h-7 text-xs" onClick={() => saveRow(row.id)} disabled={updateMutation.isPending}><Save className="w-3 h-3 mr-1" />Save</Button>
                            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditing(prev => { const n = { ...prev }; delete n[row.id]; return n; })}>Cancel</Button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-2.5 text-right font-mono">${Number(row.costPerUnit).toFixed(2)}</td>
                        <td className="px-4 py-2.5 text-right font-mono">{Number(row.marginPct).toFixed(1)}%</td>
                        <td className="px-4 py-2.5 text-right font-mono font-semibold">${Number(row.pricePerUnit).toFixed(2)}</td>
                        <td className="px-4 py-2.5 text-right">
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => startEdit(row)}><Pencil className="w-3 h-3 mr-1" />Edit</Button>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ─── Frost Footing Formulas Panel ──────────────────────────────────────────── */
function FrostFootingFormulasPanel() {
  const utils = trpc.useUtils();
  const { data: formulas = [], isLoading } = trpc.frostFooting.getFormulas.useQuery();
  const updateMutation = trpc.frostFooting.updateFormula.useMutation({
    onSuccess: () => { utils.frostFooting.getFormulas.invalidate(); toast.success("Formula updated"); },
    onError: () => toast.error("Failed to update formula"),
  });

  const [editing, setEditing] = useState<Record<number, string>>({});

  const FORMULA_DESCRIPTIONS: Record<string, { label: string; description: string; hint: string }> = {
    diameter_column: {
      label: "Diameter Column",
      description: "Which diameter column to use from the frost footing table (1 = smallest, 2 = middle, 3 = largest)",
      hint: "Enter 1, 2, or 3",
    },
    corner_count_formula: {
      label: "Corner Footing Count",
      description: "Number of corner footings per deck (typically 4 for a rectangular deck)",
      hint: "e.g. 4",
    },
    intermediate_count_formula: {
      label: "Intermediate Footing Count Formula",
      description: "Formula to calculate intermediate footings. Use 'postCount' as the variable (postCount = ceil(deckWidth / postSpacing) + 1)",
      hint: "e.g. postCount - 2",
    },
    post_count_formula: {
      label: "Post Count Formula",
      description: "Formula for total post count based on deck width and post spacing",
      hint: "e.g. ceil(deckWidth / postSpacing) + 1",
    },
    enabled: {
      label: "Auto-Footing Enabled",
      description: "Whether automatic frost footing calculation is included in the bid (1 = enabled, 0 = disabled)",
      hint: "Enter 1 to enable, 0 to disable",
    },
  };

  return (
    <div className="bg-white rounded-xl border border-border/60 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-border/60 bg-muted/20">
        <h3 className="font-semibold text-base">Frost Footing Formulas &amp; Settings</h3>
        <p className="text-sm text-muted-foreground mt-0.5">Configure how post footings are automatically calculated from the lumber package's joist span and post spacing.</p>
      </div>
      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground py-8 justify-center"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>
      ) : (
        <div className="divide-y divide-border/40">
          {formulas.map((f: any) => {
            const meta = FORMULA_DESCRIPTIONS[f.key] ?? { label: f.key, description: "", hint: "" };
            const isEditing = editing[f.id] !== undefined;
            return (
              <div key={f.id} className="px-6 py-4 flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{meta.label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{meta.description}</div>
                  {isEditing ? (
                    <div className="flex items-center gap-2 mt-2">
                      <Input
                        value={editing[f.id]}
                        onChange={ev => setEditing(prev => ({ ...prev, [f.id]: ev.target.value }))}
                        className="h-8 w-48 font-mono text-sm"
                        placeholder={meta.hint}
                      />
                      <Button size="sm" className="h-8 text-xs" onClick={() => {
                        updateMutation.mutate({ id: f.id, value: editing[f.id] });
                        setEditing(prev => { const n = { ...prev }; delete n[f.id]; return n; });
                      }} disabled={updateMutation.isPending}><Save className="w-3 h-3 mr-1" />Save</Button>
                      <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setEditing(prev => { const n = { ...prev }; delete n[f.id]; return n; })}>Cancel</Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 mt-1.5">
                      <code className="bg-muted px-2 py-0.5 rounded text-xs font-mono">{f.value}</code>
                    </div>
                  )}
                </div>
                {!isEditing && (
                  <Button size="sm" variant="outline" className="h-7 text-xs shrink-0" onClick={() => setEditing(prev => ({ ...prev, [f.id]: f.value }))}><Pencil className="w-3 h-3 mr-1" />Edit</Button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Post & Beam Wrap Panel ──────────────────────────────────────────────────

function PostBeamWrapPanel({ utils }: { utils: ReturnType<typeof trpc.useUtils> }) {
  const { data, isLoading, refetch } = trpc.postWrap.getAll.useQuery();
  const updateOption = trpc.postWrap.updateOption.useMutation({ onSuccess: () => { refetch(); toast.success("Saved"); } });
  const createTier = trpc.postWrap.createLengthTier.useMutation({ onSuccess: () => { refetch(); toast.success("Length tier added"); } });
  const updateTier = trpc.postWrap.updateLengthTier.useMutation({ onSuccess: () => { refetch(); toast.success("Tier updated"); } });
  const deleteTier = trpc.postWrap.deleteLengthTier.useMutation({ onSuccess: () => { refetch(); toast.success("Tier deleted"); } });

  const [editingOption, setEditingOption] = useState<Record<number, any>>({});
  const [editingTier, setEditingTier] = useState<Record<number, any>>({});
  const [newTier, setNewTier] = useState<Record<number, { lengthFt: string; materialCostPerPiece: string; materialPricePerPiece: string }>>({});

  if (isLoading) return <div className="flex items-center gap-2 py-8 text-stone-500"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>;

  const options = (data?.options || []) as any[];
  const tiers = (data?.tiers || []) as any[];

  const fmt = (n: any) => Number(n ?? 0).toFixed(2);

  return (
    <PanelCard
      title="Post & Beam Wrap"
      description="Configure wrap options, material length tiers, and labor rates. The calculator uses the shortest available piece length that covers the required post height or beam span."
    >
      <div className="space-y-8">
        {options.map((opt: any) => {
          const optTiers = tiers.filter((t: any) => t.postWrapOptionId === opt.id).sort((a: any, b: any) => a.lengthFt - b.lengthFt);
          const eo = editingOption[opt.id] ?? {};
          const isEditingOpt = Object.keys(eo).length > 0;
          const nt = newTier[opt.id] ?? { lengthFt: "", materialCostPerPiece: "", materialPricePerPiece: "" };

          return (
            <div key={opt.id} className="rounded-xl border border-stone-200 bg-white shadow-sm overflow-hidden">
              {/* Option header */}
              <div className="bg-stone-50 border-b border-stone-200 px-5 py-4 flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-stone-800">{opt.name}</p>
                  <p className="text-xs text-stone-500 mt-0.5">{opt.slug}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant={opt.isActive ? "default" : "secondary"} className="text-xs">
                    {opt.isActive ? "Active" : "Inactive"}
                  </Badge>
                  {!isEditingOpt ? (
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                      onClick={() => setEditingOption(prev => ({
                        ...prev,
                        [opt.id]: {
                          laborPricePerPost: fmt(opt.laborPricePerPost),
                          laborPricePerBeamLf: fmt(opt.laborPricePerBeamLf),
                          isActive: opt.isActive,
                        }
                      }))}>
                      <Pencil className="w-3 h-3" /> Edit Labor Rates
                    </Button>
                  ) : (
                    <div className="flex gap-1.5">
                      <Button size="sm" className="h-7 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700"
                        disabled={updateOption.isPending}
                        onClick={() => {
                          updateOption.mutate({
                            id: opt.id,
                            laborPricePerPost: parseFloat(eo.laborPricePerPost) || 0,
                            laborPricePerBeamLf: parseFloat(eo.laborPricePerBeamLf) || 0,
                            isActive: eo.isActive,
                          });
                          setEditingOption(prev => { const n = { ...prev }; delete n[opt.id]; return n; });
                        }}>
                        <Save className="w-3 h-3" /> Save
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs"
                        onClick={() => setEditingOption(prev => { const n = { ...prev }; delete n[opt.id]; return n; })}>
                        Cancel
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              <div className="px-5 py-4 space-y-5">
                {/* Labor rates */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-stone-600">Labor — Per Post ($)</Label>
                    {isEditingOpt ? (
                      <Input type="number" min={0} step={0.01} value={eo.laborPricePerPost ?? ""}
                        onChange={e => setEditingOption(prev => ({ ...prev, [opt.id]: { ...prev[opt.id], laborPricePerPost: e.target.value } }))}
                        className="h-8 text-sm" />
                    ) : (
                      <p className="text-sm font-semibold text-stone-800">${fmt(opt.laborPricePerPost)}</p>
                    )}
                    <p className="text-xs text-stone-400">Charged once per post wrapped</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-stone-600">Labor — Per Beam LF ($)</Label>
                    {isEditingOpt ? (
                      <Input type="number" min={0} step={0.01} value={eo.laborPricePerBeamLf ?? ""}
                        onChange={e => setEditingOption(prev => ({ ...prev, [opt.id]: { ...prev[opt.id], laborPricePerBeamLf: e.target.value } }))}
                        className="h-8 text-sm" />
                    ) : (
                      <p className="text-sm font-semibold text-stone-800">${fmt(opt.laborPricePerBeamLf)}</p>
                    )}
                    <p className="text-xs text-stone-400">Charged per lineal foot of beam wrapped</p>
                  </div>
                </div>

                {/* Length tiers */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-stone-700">Material Length Tiers</p>
                    <p className="text-xs text-stone-400">Calculator picks the shortest piece that covers the required height/span</p>
                  </div>

                  {optTiers.length === 0 && (
                    <p className="text-xs text-stone-400 italic">No length tiers configured — using legacy flat rate per LF.</p>
                  )}

                  {optTiers.length > 0 && (
                    <div className="rounded-lg border border-stone-200 overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-stone-50 border-b border-stone-200">
                          <tr>
                            <th className="text-left px-3 py-2 text-xs font-medium text-stone-600">Length</th>
                            <th className="text-right px-3 py-2 text-xs font-medium text-stone-600">Cost/Piece</th>
                            <th className="text-right px-3 py-2 text-xs font-medium text-stone-600">Price/Piece</th>
                            <th className="text-right px-3 py-2 text-xs font-medium text-stone-600">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {optTiers.map((tier: any) => {
                            const et = editingTier[tier.id] ?? {};
                            const isEditingT = Object.keys(et).length > 0;
                            return (
                              <tr key={tier.id} className="border-b border-stone-100 last:border-0">
                                <td className="px-3 py-2">
                                  {isEditingT ? (
                                    <Input type="number" min={1} step={1} value={et.lengthFt ?? tier.lengthFt}
                                      onChange={e => setEditingTier(prev => ({ ...prev, [tier.id]: { ...prev[tier.id], lengthFt: e.target.value } }))}
                                      className="h-7 w-20 text-xs" />
                                  ) : (
                                    <span className="font-semibold">{tier.lengthFt}'</span>
                                  )}
                                </td>
                                <td className="px-3 py-2 text-right">
                                  {isEditingT ? (
                                    <Input type="number" min={0} step={0.01} value={et.materialCostPerPiece ?? fmt(tier.materialCostPerPiece)}
                                      onChange={e => setEditingTier(prev => ({ ...prev, [tier.id]: { ...prev[tier.id], materialCostPerPiece: e.target.value } }))}
                                      className="h-7 w-24 text-xs text-right" />
                                  ) : (
                                    <span className="text-stone-600">${fmt(tier.materialCostPerPiece)}</span>
                                  )}
                                </td>
                                <td className="px-3 py-2 text-right">
                                  {isEditingT ? (
                                    <Input type="number" min={0} step={0.01} value={et.materialPricePerPiece ?? fmt(tier.materialPricePerPiece)}
                                      onChange={e => setEditingTier(prev => ({ ...prev, [tier.id]: { ...prev[tier.id], materialPricePerPiece: e.target.value } }))}
                                      className="h-7 w-24 text-xs text-right" />
                                  ) : (
                                    <span className="font-semibold text-stone-800">${fmt(tier.materialPricePerPiece)}</span>
                                  )}
                                </td>
                                <td className="px-3 py-2 text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    {isEditingT ? (
                                      <>
                                        <Button size="sm" className="h-6 text-xs px-2 bg-emerald-600 hover:bg-emerald-700"
                                          disabled={updateTier.isPending}
                                          onClick={() => {
                                            updateTier.mutate({
                                              id: tier.id,
                                              lengthFt: parseInt(et.lengthFt) || tier.lengthFt,
                                              materialCostPerPiece: parseFloat(et.materialCostPerPiece) || 0,
                                              materialPricePerPiece: parseFloat(et.materialPricePerPiece) || 0,
                                            });
                                            setEditingTier(prev => { const n = { ...prev }; delete n[tier.id]; return n; });
                                          }}>
                                          <Save className="w-3 h-3" />
                                        </Button>
                                        <Button size="sm" variant="outline" className="h-6 text-xs px-2"
                                          onClick={() => setEditingTier(prev => { const n = { ...prev }; delete n[tier.id]; return n; })}>
                                          ✕
                                        </Button>
                                      </>
                                    ) : (
                                      <>
                                        <Button size="sm" variant="outline" className="h-6 text-xs px-2"
                                          onClick={() => setEditingTier(prev => ({ ...prev, [tier.id]: { lengthFt: String(tier.lengthFt), materialCostPerPiece: fmt(tier.materialCostPerPiece), materialPricePerPiece: fmt(tier.materialPricePerPiece) } }))}>
                                          <Pencil className="w-3 h-3" />
                                        </Button>
                                        <Button size="sm" variant="outline" className="h-6 text-xs px-2 text-red-600 hover:text-red-700 hover:border-red-300"
                                          disabled={deleteTier.isPending}
                                          onClick={() => { if (confirm(`Delete ${tier.lengthFt}' tier?`)) deleteTier.mutate({ id: tier.id }); }}>
                                          <Trash2 className="w-3 h-3" />
                                        </Button>
                                      </>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Add new tier */}
                  <div className="rounded-lg border border-dashed border-stone-300 p-3 space-y-2">
                    <p className="text-xs font-medium text-stone-600">Add Length Tier</p>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <Label className="text-xs text-stone-500">Length (ft)</Label>
                        <Input type="number" min={1} step={1} placeholder="e.g. 8"
                          value={nt.lengthFt}
                          onChange={e => setNewTier(prev => ({ ...prev, [opt.id]: { ...nt, lengthFt: e.target.value } }))}
                          className="h-8 text-sm mt-0.5" />
                      </div>
                      <div>
                        <Label className="text-xs text-stone-500">Cost/Piece ($)</Label>
                        <Input type="number" min={0} step={0.01} placeholder="0.00"
                          value={nt.materialCostPerPiece}
                          onChange={e => setNewTier(prev => ({ ...prev, [opt.id]: { ...nt, materialCostPerPiece: e.target.value } }))}
                          className="h-8 text-sm mt-0.5" />
                      </div>
                      <div>
                        <Label className="text-xs text-stone-500">Price/Piece ($)</Label>
                        <Input type="number" min={0} step={0.01} placeholder="0.00"
                          value={nt.materialPricePerPiece}
                          onChange={e => setNewTier(prev => ({ ...prev, [opt.id]: { ...nt, materialPricePerPiece: e.target.value } }))}
                          className="h-8 text-sm mt-0.5" />
                      </div>
                    </div>
                    <Button size="sm" className="gap-1.5 text-xs h-8"
                      disabled={!nt.lengthFt || createTier.isPending}
                      onClick={() => {
                        createTier.mutate({
                          postWrapOptionId: opt.id,
                          lengthFt: parseInt(nt.lengthFt) || 8,
                          materialCostPerPiece: parseFloat(nt.materialCostPerPiece) || 0,
                          materialPricePerPiece: parseFloat(nt.materialPricePerPiece) || 0,
                        });
                        setNewTier(prev => ({ ...prev, [opt.id]: { lengthFt: "", materialCostPerPiece: "", materialPricePerPiece: "" } }));
                      }}>
                      <Plus className="w-3.5 h-3.5" /> Add {nt.lengthFt ? `${nt.lengthFt}' Tier` : "Tier"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {options.length === 0 && (
          <p className="text-sm text-stone-400 italic text-center py-8">No post/beam wrap options configured. Add options via the database.</p>
        )}
      </div>
    </PanelCard>
  );
}

// ─── Design Package Panel ──────────────────────────────────────────────────

function DesignPackagePanel({ utils }: { utils: ReturnType<typeof trpc.useUtils> }) {
  const { data: items = [], isLoading } = trpc.designPackage.getAll.useQuery();
  const createMutation = trpc.designPackage.create.useMutation({
    onSuccess: () => { utils.designPackage.getAll.invalidate(); utils.admin.getConfig.invalidate(); toast.success("Design package item created"); },
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

  const emptyForm = {
    name: "", description: "", pricingType: "flat" as "sqft" | "flat" | "rendering",
    costPerSqft: 0, flatCost: 0, markupPct: 50,
    projectTypes: "all", renderingType: null as string | null,
    isActive: 1, sortOrder: 0,
  };
  const [newItem, setNewItem] = useState(emptyForm);
  const [editId, setEditId] = useState<number | null>(null);
  const [editData, setEditData] = useState<typeof emptyForm | null>(null);

  const sellPrice = (item: typeof emptyForm) => {
    if (item.pricingType === "sqft") return null; // depends on sqft
    const cost = item.pricingType === "flat" || item.pricingType === "rendering" ? item.flatCost : 0;
    return cost * (1 + item.markupPct / 100);
  };

  const renderingTypeLabel = (rt: string | null) => {
    if (!rt) return "—";
    return { small_bathroom: "Small Bathroom", large_bathroom: "Large Bathroom", kitchen: "Kitchen", exterior: "Exterior" }[rt] ?? rt;
  };

  const projectTypeLabel = (pt: string) => {
    if (pt === "all") return "All";
    return pt.split(",").map(p => ({ addition: "Addition", full_home_remodel: "Full Home Remodel", kitchen: "Kitchen", bathroom: "Bathroom" }[p] ?? p).trim()).join(", ");
  };

  if (isLoading) return <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-canyon" /></div>;

  return (
    <PanelCard
      title="Design Package Line Items"
      description="Manage design package services and pricing. Sell price = cost × (1 + markup%). Sqft items: sell price = cost/sqft × sqft. Rendering items appear only when that rendering type is selected."
      actions={null}
    >
      {/* Add new item */}
      <div className="bg-warm-cream/60 rounded-lg p-4 border border-border/40 mb-6">
        <h4 className="text-sm font-semibold text-charcoal mb-3">Add New Item</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div>
            <Label className="text-xs">Name *</Label>
            <Input value={newItem.name} onChange={e => setNewItem(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Architectural Engineering" className="mt-1 text-sm" />
          </div>
          <div>
            <Label className="text-xs">Description</Label>
            <Input value={newItem.description} onChange={e => setNewItem(p => ({ ...p, description: e.target.value }))} placeholder="Short description" className="mt-1 text-sm" />
          </div>
          <div>
            <Label className="text-xs">Pricing Type *</Label>
            <Select value={newItem.pricingType} onValueChange={v => setNewItem(p => ({ ...p, pricingType: v as any, renderingType: v === "rendering" ? "small_bathroom" : null }))}>
              <SelectTrigger className="mt-1 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="sqft">Per Sqft</SelectItem>
                <SelectItem value="flat">Flat Fee</SelectItem>
                <SelectItem value="rendering">3D Rendering</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {newItem.pricingType === "sqft" && (
            <div>
              <Label className="text-xs">Cost per Sqft ($)</Label>
              <Input type="number" value={newItem.costPerSqft} onChange={e => setNewItem(p => ({ ...p, costPerSqft: parseFloat(e.target.value) || 0 }))} className="mt-1 text-sm" />
            </div>
          )}
          {(newItem.pricingType === "flat" || newItem.pricingType === "rendering") && (
            <div>
              <Label className="text-xs">Flat Cost ($)</Label>
              <Input type="number" value={newItem.flatCost} onChange={e => setNewItem(p => ({ ...p, flatCost: parseFloat(e.target.value) || 0 }))} className="mt-1 text-sm" />
            </div>
          )}
          <div>
            <Label className="text-xs">Markup %</Label>
            <Input type="number" value={newItem.markupPct} onChange={e => setNewItem(p => ({ ...p, markupPct: parseFloat(e.target.value) || 0 }))} className="mt-1 text-sm" />
          </div>
          <div>
            <Label className="text-xs">Project Types (comma-separated or "all")</Label>
            <Input value={newItem.projectTypes} onChange={e => setNewItem(p => ({ ...p, projectTypes: e.target.value }))} placeholder="all" className="mt-1 text-sm" />
            <p className="text-[10px] text-muted-foreground mt-0.5">Options: all, addition, full_home_remodel, kitchen, bathroom</p>
          </div>
          {newItem.pricingType === "rendering" && (
            <div>
              <Label className="text-xs">Rendering Type *</Label>
              <Select value={newItem.renderingType ?? "small_bathroom"} onValueChange={v => setNewItem(p => ({ ...p, renderingType: v }))}>
                <SelectTrigger className="mt-1 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="small_bathroom">Small Bathroom</SelectItem>
                  <SelectItem value="large_bathroom">Large Bathroom</SelectItem>
                  <SelectItem value="kitchen">Kitchen</SelectItem>
                  <SelectItem value="exterior">Exterior</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label className="text-xs">Sort Order</Label>
            <Input type="number" value={newItem.sortOrder} onChange={e => setNewItem(p => ({ ...p, sortOrder: parseInt(e.target.value) || 0 }))} className="mt-1 text-sm" />
          </div>
        </div>
        <div className="flex items-center gap-3 mt-3">
          <div className="flex items-center gap-2">
            <Switch checked={newItem.isActive === 1} onCheckedChange={v => setNewItem(p => ({ ...p, isActive: v ? 1 : 0 }))} />
            <Label className="text-xs">Active</Label>
          </div>
          {newItem.pricingType !== "sqft" && (
            <span className="text-xs text-muted-foreground">Sell price: <strong>${(newItem.flatCost * (1 + newItem.markupPct / 100)).toFixed(2)}</strong></span>
          )}
          <Button size="sm" className="ml-auto" disabled={!newItem.name || createMutation.isPending} onClick={() => {
            createMutation.mutate({
              name: newItem.name,
              description: newItem.description,
              pricingType: newItem.pricingType,
              costPerSqft: newItem.costPerSqft,
              flatCost: newItem.flatCost,
              markupPct: newItem.markupPct,
              projectTypes: newItem.projectTypes,
              renderingType: newItem.renderingType as any,
              isActive: newItem.isActive,
              sortOrder: newItem.sortOrder,
            });
            setNewItem(emptyForm);
          }}>
            {createMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />} Add Item
          </Button>
        </div>
      </div>

      {/* Item list */}
      <div className="space-y-2">
        {items.length === 0 && (
          <p className="text-sm text-stone-400 italic text-center py-8">No design package items configured.</p>
        )}
        {(items as any[]).map((item: any) => {
          const isEditing = editId === item.id;
          const ed = editData;
          return (
            <div key={item.id} className="bg-white rounded-lg border border-border/50 p-3">
              {!isEditing ? (
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm text-charcoal">{item.name}</span>
                      <Badge variant={item.isActive ? "default" : "secondary"} className="text-[10px] px-1.5 py-0">{item.isActive ? "Active" : "Inactive"}</Badge>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {item.pricingType === "sqft" ? "$/sqft" : item.pricingType === "rendering" ? "Rendering" : "Flat"}
                      </Badge>
                    </div>
                    {item.description && <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>}
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                      {item.pricingType === "sqft" && <span>Cost: ${Number(item.costPerSqft).toFixed(4)}/sqft → Sell: ${(Number(item.costPerSqft) * (1 + Number(item.markupPct) / 100)).toFixed(4)}/sqft</span>}
                      {(item.pricingType === "flat" || item.pricingType === "rendering") && <span>Cost: ${Number(item.flatCost).toFixed(2)} → Sell: ${(Number(item.flatCost) * (1 + Number(item.markupPct) / 100)).toFixed(2)}</span>}
                      <span>Markup: {Number(item.markupPct)}%</span>
                      <span>Projects: {projectTypeLabel(item.projectTypes)}</span>
                      {item.pricingType === "rendering" && <span>Type: {renderingTypeLabel(item.renderingType)}</span>}
                      <span>Order: {item.sortOrder}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => {
                      setEditId(item.id);
                      setEditData({
                        name: item.name, description: item.description ?? '',
                        pricingType: item.pricingType, costPerSqft: Number(item.costPerSqft),
                        flatCost: Number(item.flatCost), markupPct: Number(item.markupPct),
                        projectTypes: item.projectTypes, renderingType: item.renderingType ?? null,
                        isActive: item.isActive, sortOrder: item.sortOrder,
                      });
                    }}><Pencil className="w-3.5 h-3.5" /></Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500 hover:text-red-600" onClick={() => {
                      if (confirm(`Delete "${item.name}"?`)) deleteMutation.mutate({ id: item.id });
                    }}><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                </div>
              ) : ed && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs">Name</Label>
                      <Input value={ed.name} onChange={e => setEditData(p => p ? { ...p, name: e.target.value } : p)} className="mt-1 text-sm" />
                    </div>
                    <div>
                      <Label className="text-xs">Description</Label>
                      <Input value={ed.description} onChange={e => setEditData(p => p ? { ...p, description: e.target.value } : p)} className="mt-1 text-sm" />
                    </div>
                    <div>
                      <Label className="text-xs">Pricing Type</Label>
                      <Select value={ed.pricingType} onValueChange={v => setEditData(p => p ? { ...p, pricingType: v as any, renderingType: v === "rendering" ? (p.renderingType ?? "small_bathroom") : null } : p)}>
                        <SelectTrigger className="mt-1 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sqft">Per Sqft</SelectItem>
                          <SelectItem value="flat">Flat Fee</SelectItem>
                          <SelectItem value="rendering">3D Rendering</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {ed.pricingType === "sqft" && (
                      <div>
                        <Label className="text-xs">Cost per Sqft ($)</Label>
                        <Input type="number" value={ed.costPerSqft} onChange={e => setEditData(p => p ? { ...p, costPerSqft: parseFloat(e.target.value) || 0 } : p)} className="mt-1 text-sm" />
                      </div>
                    )}
                    {(ed.pricingType === "flat" || ed.pricingType === "rendering") && (
                      <div>
                        <Label className="text-xs">Flat Cost ($)</Label>
                        <Input type="number" value={ed.flatCost} onChange={e => setEditData(p => p ? { ...p, flatCost: parseFloat(e.target.value) || 0 } : p)} className="mt-1 text-sm" />
                      </div>
                    )}
                    <div>
                      <Label className="text-xs">Markup %</Label>
                      <Input type="number" value={ed.markupPct} onChange={e => setEditData(p => p ? { ...p, markupPct: parseFloat(e.target.value) || 0 } : p)} className="mt-1 text-sm" />
                    </div>
                    <div>
                      <Label className="text-xs">Project Types</Label>
                      <Input value={ed.projectTypes} onChange={e => setEditData(p => p ? { ...p, projectTypes: e.target.value } : p)} className="mt-1 text-sm" />
                    </div>
                    {ed.pricingType === "rendering" && (
                      <div>
                        <Label className="text-xs">Rendering Type</Label>
                        <Select value={ed.renderingType ?? "small_bathroom"} onValueChange={v => setEditData(p => p ? { ...p, renderingType: v } : p)}>
                          <SelectTrigger className="mt-1 text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="small_bathroom">Small Bathroom</SelectItem>
                            <SelectItem value="large_bathroom">Large Bathroom</SelectItem>
                            <SelectItem value="kitchen">Kitchen</SelectItem>
                            <SelectItem value="exterior">Exterior</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <div>
                      <Label className="text-xs">Sort Order</Label>
                      <Input type="number" value={ed.sortOrder} onChange={e => setEditData(p => p ? { ...p, sortOrder: parseInt(e.target.value) || 0 } : p)} className="mt-1 text-sm" />
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Switch checked={ed.isActive === 1} onCheckedChange={v => setEditData(p => p ? { ...p, isActive: v ? 1 : 0 } : p)} />
                      <Label className="text-xs">Active</Label>
                    </div>
                    <div className="flex items-center gap-2 ml-auto">
                      <Button variant="outline" size="sm" onClick={() => { setEditId(null); setEditData(null); }}>Cancel</Button>
                      <Button size="sm" disabled={updateMutation.isPending} onClick={() => {
                        updateMutation.mutate({
                          id: item.id,
                          name: ed.name,
                          description: ed.description,
                          pricingType: ed.pricingType,
                          costPerSqft: ed.costPerSqft,
                          flatCost: ed.flatCost,
                          markupPct: ed.markupPct,
                          projectTypes: ed.projectTypes,
                          renderingType: ed.renderingType as any,
                          isActive: ed.isActive,
                          sortOrder: ed.sortOrder,
                        });
                        setEditId(null);
                        setEditData(null);
                      }}>
                        {updateMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Save
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Sales Rep Commission */}
      <CommissionPanel utils={utils} />
    </PanelCard>
  );
}

function CommissionPanel({ utils }: { utils: ReturnType<typeof trpc.useUtils> }) {
  const { data: commissionRows = [], isLoading } = trpc.designPackage.getCommission.useQuery();
  const updateMutation = trpc.designPackage.updateCommission.useMutation({
    onSuccess: () => {
      utils.designPackage.getCommission.invalidate();
      utils.config.getAll.invalidate();
      toast.success("Commission updated");
    },
    onError: (e) => toast.error(e.message),
  });
  const seedMutation = trpc.designPackage.seedCommission.useMutation({
    onSuccess: () => {
      utils.designPackage.getCommission.invalidate();
      toast.success("Commission defaults seeded");
    },
    onError: (e) => toast.error(e.message),
  });

  const [editValues, setEditValues] = useState<Record<string, string>>({});

  const PROJECT_TYPE_LABELS: Record<string, string> = {
    addition: "Addition",
    full_home_remodel: "Full Home Remodel",
    kitchen: "Kitchen Remodel",
    bathroom: "Bathroom / Small Kitchen Remodel",
  };

  const defaultRows = [
    { projectType: "bathroom", label: "Bathroom / Small Kitchen Remodel", commissionAmount: 750 },
    { projectType: "kitchen", label: "Kitchen Remodel", commissionAmount: 750 },
    { projectType: "full_home_remodel", label: "Full Home Remodel", commissionAmount: 1000 },
    { projectType: "addition", label: "Addition", commissionAmount: 2000 },
  ];

  const rows: Array<{ projectType: string; label: string; commissionAmount: number }> =
    commissionRows.length > 0
      ? (commissionRows as any[]).map((r: any) => ({
          projectType: r.projectType,
          label: r.label,
          commissionAmount: Number(r.commissionAmount),
        }))
      : defaultRows;

  if (isLoading) return null;

  return (
    <div className="mt-8 border-t border-border/40 pt-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-sm font-semibold text-charcoal">Sales Rep Commission</h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            Commission is baked into the design package total — never shown to the customer as a line item.
          </p>
        </div>
        {commissionRows.length === 0 && (
          <Button size="sm" variant="outline" onClick={() => seedMutation.mutate()} disabled={seedMutation.isPending}>
            {seedMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null} Seed Defaults
          </Button>
        )}
      </div>
      <div className="space-y-2">
        {rows.map((row) => {
          const key = row.projectType;
          const editVal = editValues[key];
          const displayVal = editVal !== undefined ? editVal : String(Number(row.commissionAmount).toFixed(2));
          return (
            <div key={key} className="flex items-center gap-3 bg-white rounded-lg border border-border/50 px-4 py-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-charcoal">
                  {PROJECT_TYPE_LABELS[key] ?? row.label}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-muted-foreground">$</span>
                <Input
                  type="number"
                  min={0}
                  step={50}
                  value={displayVal}
                  onChange={e => setEditValues(prev => ({ ...prev, [key]: e.target.value }))}
                  className="w-28 text-sm h-8"
                />
                <Button
                  size="sm"
                  className="h-8"
                  disabled={updateMutation.isPending}
                  onClick={() => {
                    const amount = parseFloat(editValues[key] ?? String(row.commissionAmount)) || 0;
                    updateMutation.mutate({
                      projectType: key as "addition" | "full_home_remodel" | "kitchen" | "bathroom",
                      label: PROJECT_TYPE_LABELS[key] ?? row.label,
                      commissionAmount: amount,
                    });
                    setEditValues(prev => { const n = { ...prev }; delete n[key]; return n; });
                  }}
                >
                  {updateMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                  <span className="ml-1">Save</span>
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
