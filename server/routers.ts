import { COOKIE_NAME, ADMIN_COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, adminProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "./db";
import { verifyAdminPin, createAdminSessionToken } from "./adminAuth";
import { createDepositCheckoutSession, createBalanceCheckoutSession } from "./stripe";
import { lumberItems, lumberPriceHistory, dpPriceConsultSections } from "../drizzle/schema";
import { eq, desc, asc } from "drizzle-orm";
import { questionnaireRouter } from "./routers/questionnaire";

// Default permission set for new calculator users
const DEFAULT_PERMISSIONS: Record<string, boolean> = {
  viewCalculator: true,
  sendEstimate: true,
  viewOwnEstimates: true,
  viewOwnContracts: true,
  viewTeamEstimates: false,
  viewTeamContracts: false,
  viewAllEstimates: false,
  viewAllContracts: false,
  viewPricing: true,
  editPricing: false,
  manageUsers: false,
  viewAdminPanel: false,
};

export const appRouter = router({
  system: systemRouter,
  questionnaire: questionnaireRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      ctx.res.clearCookie(ADMIN_COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // --- Admin Auth (PIN-only) ---
  adminAuth: router({
    me: publicProcedure.query(({ ctx }) => {
      if (ctx.user && ctx.user.role === "admin") {
        return { isAdmin: true };
      }
      return { isAdmin: false };
    }),

    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(ADMIN_COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),

    /**
     * PIN-based login — verifies the PIN server-side and sets the admin session cookie.
     * The PIN is stored as an env var (ADMIN_PIN) so it never touches the DB.
     */
    loginWithPin: publicProcedure
      .input(z.object({ pin: z.string().length(4) }))
      .mutation(async ({ input, ctx }) => {
        if (!verifyAdminPin(input.pin)) {
          return { success: false, error: "Incorrect PIN" } as const;
        }
        const token = await createAdminSessionToken();
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(ADMIN_COOKIE_NAME, token, {
          ...cookieOptions,
          maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
        });
        return { success: true } as const;
      }),
  }),

  // --- Public: calculator config ---
  config: router({
    getAll: publicProcedure.query(async () => {
      const [config, projectDetailOpts] = await Promise.all([
        db.getFullConfig(),
        db.getProjectDetailOptions(),
      ]);
      return { ...config, projectDetailOptions: projectDetailOpts };
    }),
    getStructuralTables: publicProcedure.query(async () => {
      const [joistSpans, lvlBeams, hotTubWeights, glulamBeams] = await Promise.all([
        db.getJoistSpanEntries(),
        db.getLvlBeamEntries(),
        db.getHotTubWeights(),
        db.getGlulamBeamEntries(),
      ]);
      return { joistSpans, lvlBeams, hotTubWeights, glulamBeams };
    }),
  }),

  // --- Admin: full CRUD ---
  admin: router({
    getConfig: adminProcedure.query(async () => {
      return await db.getAdminConfig();
    }),

    // Collections
    updateCollection: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        slug: z.string().optional(),
        description: z.string().optional(),
        features: z.array(z.string()).optional(),
        imageUrl: z.string().optional(),
        sortOrder: z.number().optional(),
        isActive: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateCollection(id, data);
        return { success: true };
      }),

    createCollection: adminProcedure
      .input(z.object({
        slug: z.string(),
        name: z.string(),
        description: z.string().optional(),
        features: z.array(z.string()).optional(),
        imageUrl: z.string().optional(),
        sortOrder: z.number().optional(),
        isActive: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createCollection(input);
        return { success: true, id };
      }),

    deleteCollection: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteCollection(input.id);
        return { success: true };
      }),

    // Colors
    updateColor: adminProcedure
      .input(z.object({
        id: z.number(),
        description: z.string().optional(),
        collectionId: z.number().optional(),
        slug: z.string().optional(),
        name: z.string().optional(),
        hex: z.string().optional(),
        pricePerSqft: z.string().optional(),
        sortOrder: z.number().optional(),
        isActive: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateColor(id, data);
        return { success: true };
      }),

    createColor: adminProcedure
      .input(z.object({
        description: z.string().optional(),
        collectionId: z.number(),
        slug: z.string(),
        name: z.string(),
        hex: z.string(),
        pricePerSqft: z.string(),
        sortOrder: z.number().optional(),
        isActive: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createColor(input);
        return { success: true, id };
      }),

    deleteColor: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteColor(input.id);
        return { success: true };
      }),

    // Edge Options
    updateEdgeOption: adminProcedure
      .input(z.object({
        id: z.number(),
        description: z.string().optional(),
        collectionSlug: z.string().optional(),
        slug: z.string().optional(),
        name: z.string().optional(),
        costPerLinearFt: z.string().optional(),
        marginPct: z.string().optional(),
        pricePerLinearFt: z.string().optional(),
        sortOrder: z.number().optional(),
        isActive: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateEdgeOption(id, data);
        return { success: true };
      }),

    createEdgeOption: adminProcedure
      .input(z.object({
        description: z.string().optional(),
        collectionSlug: z.string(),
        slug: z.string(),
        name: z.string(),
        costPerLinearFt: z.string().optional(),
        marginPct: z.string().optional(),
        pricePerLinearFt: z.string(),
        sortOrder: z.number().optional(),
        isActive: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createEdgeOption(input);
        return { success: true, id };
      }),

    deleteEdgeOption: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteEdgeOption(input.id);
        return { success: true };
      }),

    // Accessories
    updateAccessory: adminProcedure
      .input(z.object({
        id: z.number(),
        slug: z.string().optional(),
        name: z.string().optional(),
        unit: z.string().optional(),
        costPerUnit: z.string().optional(),
        marginPct: z.string().optional(),
        pricePerUnit: z.string().optional(),
        description: z.string().optional(),
        requiredForCollections: z.array(z.string()).nullable().optional(),
        isOptional: z.number().optional(),
        isActive: z.number().optional(),
        showInScope: z.number().optional(),
        sortOrder: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateAccessory(id, data);
        return { success: true };
      }),

    createAccessory: adminProcedure
      .input(z.object({
        slug: z.string(),
        name: z.string(),
        unit: z.string(),
        costPerUnit: z.string().optional(),
        marginPct: z.string().optional(),
        pricePerUnit: z.string(),
        description: z.string().optional(),
        requiredForCollections: z.array(z.string()).nullable().optional(),
        isOptional: z.number().optional(),
        isActive: z.number().optional(),
        showInScope: z.number().optional(),
        sortOrder: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createAccessory(input);
        return { success: true, id };
      }),

    deleteAccessory: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteAccessory(input.id);
        return { success: true };
      }),

    // Labor Tiers
    updateLaborTier: adminProcedure
      .input(z.object({
        id: z.number(),
        slug: z.string().optional(),
        name: z.string().optional(),
        description: z.string().optional(),
        pricePerSqft: z.string().optional(),
        laborCostPerSqft: z.string().optional(),
        marginPercent: z.string().optional(),
        minimumPrice: z.string().optional(),
        collectionSlug: z.string().nullable().optional(),
        sortOrder: z.number().optional(),
        isActive: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateLaborTier(id, data);
        return { success: true };
      }),

    createLaborTier: adminProcedure
      .input(z.object({
        slug: z.string(),
        name: z.string(),
        description: z.string().optional(),
        pricePerSqft: z.string(),
        laborCostPerSqft: z.string().optional(),
        marginPercent: z.string().optional(),
        minimumPrice: z.string().optional(),
        collectionSlug: z.string().nullable().optional(),
        sortOrder: z.number().optional(),
        isActive: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createLaborTier(input);
        return { success: true, id };
      }),

    deleteLaborTier: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteLaborTier(input.id);
        return { success: true };
      }),

    // Labor Line Items
    createLaborLineItem: adminProcedure
      .input(z.object({
        tierId: z.number(),
        name: z.string(),
        description: z.string().optional(),
        amount: z.string(),
        unit: z.enum(['flat', 'sqft', 'linear_ft']),
        sortOrder: z.number().optional(),
        isActive: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createLaborLineItem(input);
        return { success: true, id };
      }),

    updateLaborLineItem: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        amount: z.string().optional(),
        unit: z.enum(['flat', 'sqft', 'linear_ft']).optional(),
        sortOrder: z.number().optional(),
        isActive: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateLaborLineItem(id, data);
        return { success: true };
      }),

    deleteLaborLineItem: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteLaborLineItem(input.id);
        return { success: true };
      }),

    // Delivery Options
    updateDeliveryOption: adminProcedure
      .input(z.object({
        id: z.number(),
        slug: z.string().optional(),
        name: z.string().optional(),
        description: z.string().optional(),
        price: z.string().optional(),
        sortOrder: z.number().optional(),
        isActive: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateDeliveryOption(id, data);
        return { success: true };
      }),

    createDeliveryOption: adminProcedure
      .input(z.object({
        slug: z.string(),
        name: z.string(),
        description: z.string().optional(),
        price: z.string(),
        sortOrder: z.number().optional(),
        isActive: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createDeliveryOption(input);
        return { success: true, id };
      }),

    deleteDeliveryOption: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteDeliveryOption(input.id);
        return { success: true };
      }),

    // Site Settings
    updateSetting: adminProcedure
      .input(z.object({
        key: z.string(),
        value: z.string(),
      }))
      .mutation(async ({ input }) => {
        await db.updateSiteSetting(input.key, input.value);
        return { success: true };
      }),

    bulkUpdateSettings: adminProcedure
      .input(z.object({
        updates: z.array(z.object({
          key: z.string(),
          value: z.string(),
        })),
      }))
      .mutation(async ({ input }) => {
        await db.bulkUpdateSettings(input.updates);
        return { success: true };
      }),

    // Preview Contract PDF
    previewContract: adminProcedure
      .input(z.object({
        contractText: z.string(),
      }))
      .mutation(async ({ input }) => {
        const { generateContractPdf } = await import("./contract-pdf");
        const config = await db.getFullConfig();
        const companyName = config?.settings?.company_name || "Design Your Price";
        const now = new Date();
        const sampleLineItems = [
          { name: "Materials", cost: 7500 },
          { name: "Labor", cost: 1800 },
          { name: "Delivery", cost: 350 },
          { name: "Demolition: Existing Deck Removal", cost: 800 },
          { name: "Framing: Standard Deck Frame", cost: 950 },
          { name: "Subfloor (Rainier)", cost: 600 },
          { name: "Accessories", cost: 200 },
          { name: "Tax", cost: 300 },
        ];
        const pdfBuffer = await generateContractPdf({
          contractText: input.contractText,
          customerName: "Jane Sample",
          customerEmail: "jane@example.com",
          customerPhone: "(801) 555-0100",
          customerAddress: "123 Mountain View Dr, Orem, UT 84097",
          collectionName: "Rainier Collection",
          sqft: 500,
          grandTotal: 12500,
          depositAmount: 6250,
          balanceAmount: 6250,
          signedName: "Jane Sample",
          signedAt: now,
          orderId: 0,
          companyName,
          lineItems: sampleLineItems,
        });
        return { pdfBase64: pdfBuffer.toString("base64") };
      }),

    // Comparison Materials
    updateComparisonMaterial: adminProcedure
      .input(z.object({
        id: z.number(),
        slug: z.string().optional(),
        name: z.string().optional(),
        description: z.string().optional(),
        materialCostPerSqft: z.string().optional(),
        laborCostPerSqft: z.string().optional(),
        annualMaintenanceCostPerSqft: z.string().optional(),
        lifespanYears: z.number().optional(),
        warrantyYears: z.number().optional(),
        colorHex: z.string().optional(),
        pros: z.array(z.string()).optional(),
        cons: z.array(z.string()).optional(),
        sortOrder: z.number().optional(),
        isActive: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateComparisonMaterial(id, data);
        return { success: true };
      }),

    createComparisonMaterial: adminProcedure
      .input(z.object({
        slug: z.string(),
        name: z.string(),
        description: z.string().optional(),
        materialCostPerSqft: z.string(),
        laborCostPerSqft: z.string(),
        annualMaintenanceCostPerSqft: z.string(),
        lifespanYears: z.number(),
        warrantyYears: z.number().optional(),
        colorHex: z.string().optional(),
        pros: z.array(z.string()).optional(),
        cons: z.array(z.string()).optional(),
        sortOrder: z.number().optional(),
        isActive: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createComparisonMaterial(input);
        return { success: true, id };
      }),

    deleteComparisonMaterial: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteComparisonMaterial(input.id);
        return { success: true };
      }),

    // Demolition Options
    updateDemolitionOption: adminProcedure
      .input(z.object({
        id: z.number(),
        slug: z.string().optional(),
        name: z.string().optional(),
        description: z.string().optional(),
        costPerSqft: z.string().optional(),
        marginPct: z.string().optional(),
        pricePerSqft: z.string().optional(),
        minimumPrice: z.string().optional(),
        hasSeparateSqft: z.number().optional(),
        sortOrder: z.number().optional(),
        isActive: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateDemolitionOption(id, data);
        return { success: true };
      }),

    createDemolitionOption: adminProcedure
      .input(z.object({
        slug: z.string(),
        name: z.string(),
        description: z.string().optional(),
        costPerSqft: z.string().optional(),
        marginPct: z.string().optional(),
        pricePerSqft: z.string(),
        minimumPrice: z.string().optional(),
        hasSeparateSqft: z.number().optional(),
        sortOrder: z.number().optional(),
        isActive: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createDemolitionOption(input);
        return { success: true, id };
      }),

    deleteDemolitionOption: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteDemolitionOption(input.id);
        return { success: true };
      }),

    // Footing Options
    updateFootingOption: adminProcedure
      .input(z.object({
        id: z.number(),
        slug: z.string().optional(),
        name: z.string().optional(),
        description: z.string().optional(),
        costPerUnit: z.string().optional(),
        marginPct: z.string().optional(),
        pricePerUnit: z.string().optional(),
        unit: z.string().optional(),
        sortOrder: z.number().optional(),
        isActive: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateFootingOption(id, data);
        return { success: true };
      }),

    createFootingOption: adminProcedure
      .input(z.object({
        slug: z.string(),
        name: z.string(),
        description: z.string().optional(),
        costPerUnit: z.string().optional(),
        marginPct: z.string().optional(),
        pricePerUnit: z.string(),
        unit: z.string().optional(),
        sortOrder: z.number().optional(),
        isActive: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createFootingOption(input);
        return { success: true, id };
      }),

    deleteFootingOption: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteFootingOption(input.id);
        return { success: true };
      }),

    // Concrete Options
    updateConcreteOption: adminProcedure
      .input(z.object({
        id: z.number(),
        slug: z.string().optional(),
        name: z.string().optional(),
        description: z.string().optional(),
        costPerUnit: z.string().optional(),
        marginPct: z.string().optional(),
        pricePerUnit: z.string().optional(),
        unit: z.string().optional(),
        sortOrder: z.number().optional(),
        isActive: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateConcreteOption(id, data);
        return { success: true };
      }),

    createConcreteOption: adminProcedure
      .input(z.object({
        slug: z.string(),
        name: z.string(),
        description: z.string().optional(),
        costPerUnit: z.string().optional(),
        marginPct: z.string().optional(),
        pricePerUnit: z.string(),
        unit: z.string().optional(),
        sortOrder: z.number().optional(),
        isActive: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createConcreteOption(input);
        return { success: true, id };
      }),

    deleteConcreteOption: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteConcreteOption(input.id);
        return { success: true };
      }),

    // Framing Options
    updateFramingOption: adminProcedure
      .input(z.object({
        id: z.number(),
        slug: z.string().optional(),
        name: z.string().optional(),
        description: z.string().optional(),
        costPerSqft: z.string().optional(),
        marginPct: z.string().optional(),
        pricePerSqft: z.string().optional(),
        rainierRate: z.string().nullable().optional(),
        minimumPrice: z.string().optional(),
        sortOrder: z.number().optional(),
        isActive: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateFramingOption(id, data);
        return { success: true };
      }),

    createFramingOption: adminProcedure
      .input(z.object({
        slug: z.string(),
        name: z.string(),
        description: z.string().optional(),
        costPerSqft: z.string().optional(),
        marginPct: z.string().optional(),
        pricePerSqft: z.string(),
        rainierRate: z.string().nullable().optional(),
        minimumPrice: z.string().optional(),
        sortOrder: z.number().optional(),
        isActive: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createFramingOption(input);
        return { success: true, id };
      }),

    deleteFramingOption: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteFramingOption(input.id);
        return { success: true };
      }),

    // Facade Options
    updateFacadeOption: adminProcedure
      .input(z.object({
        id: z.number(),
        slug: z.string().optional(),
        name: z.string().optional(),
        description: z.string().optional(),
        costPerSqft: z.string().optional(),
        marginPct: z.string().optional(),
        pricePerSqft: z.string().optional(),
        minimumPrice: z.string().optional(),
        sortOrder: z.number().optional(),
        isActive: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateFacadeOption(id, data);
        return { success: true };
      }),

    createFacadeOption: adminProcedure
      .input(z.object({
        slug: z.string(),
        name: z.string(),
        description: z.string().optional(),
        costPerSqft: z.string().optional(),
        marginPct: z.string().optional(),
        pricePerSqft: z.string(),
        minimumPrice: z.string().optional(),
        sortOrder: z.number().optional(),
        isActive: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createFacadeOption(input);
        return { success: true, id };
      }),

    deleteFacadeOption: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteFacadeOption(input.id);
        return { success: true };
      }),

    // --- Resin Rock: Surfaces ---
    updateResinSurface: adminProcedure
      .input(z.object({
        id: z.number(),
        slug: z.string().optional(),
        name: z.string().optional(),
        description: z.string().optional(),
        pricePerSqft: z.string().optional(),
        requiresWaterproofing: z.number().optional(),
        sortOrder: z.number().optional(),
        isActive: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateResinSurface(id, data);
        return { success: true };
      }),

    createResinSurface: adminProcedure
      .input(z.object({
        slug: z.string(),
        name: z.string(),
        description: z.string().optional(),
        pricePerSqft: z.string(),
        requiresWaterproofing: z.number().optional(),
        sortOrder: z.number().optional(),
        isActive: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createResinSurface(input);
        return { success: true, id };
      }),

    deleteResinSurface: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteResinSurface(input.id);
        return { success: true };
      }),

    // --- Resin Rock: Colors ---
    updateResinColor: adminProcedure
      .input(z.object({
        id: z.number(),
        description: z.string().optional(),
        slug: z.string().optional(),
        name: z.string().optional(),
        hex: z.string().optional(),
        category: z.string().optional(),
        pricePerSqft: z.string().optional(),
        sortOrder: z.number().optional(),
        isActive: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateResinColor(id, data);
        return { success: true };
      }),

    createResinColor: adminProcedure
      .input(z.object({
        description: z.string().optional(),
        slug: z.string(),
        name: z.string(),
        hex: z.string(),
        category: z.string().optional(),
        pricePerSqft: z.string(),
        sortOrder: z.number().optional(),
        isActive: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createResinColor(input);
        return { success: true, id };
      }),

    deleteResinColor: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteResinColor(input.id);
        return { success: true };
      }),

    // --- Waterproofing Options ---
    updateWaterproofingOption: adminProcedure
      .input(z.object({
        id: z.number(),
        slug: z.string().optional(),
        name: z.string().optional(),
        description: z.string().optional(),
        pricePerSqft: z.string().optional(),
        sortOrder: z.number().optional(),
        isActive: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateWaterproofingOption(id, data);
        return { success: true };
      }),

    createWaterproofingOption: adminProcedure
      .input(z.object({
        slug: z.string(),
        name: z.string(),
        description: z.string().optional(),
        pricePerSqft: z.string(),
        sortOrder: z.number().optional(),
        isActive: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createWaterproofingOption(input);
        return { success: true, id };
      }),

    deleteWaterproofingOption: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteWaterproofingOption(input.id);
        return { success: true };
      }),

    // --- Duradek Colors ---
    updateDuradekColor: adminProcedure
      .input(z.object({
        id: z.number(),
        description: z.string().optional(),
        slug: z.string().optional(),
        name: z.string().optional(),
        series: z.string().optional(),
        hex: z.string().optional(),
        pricePerSqft: z.string().optional(),
        sortOrder: z.number().optional(),
        isActive: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateDuradekColor(id, data);
        return { success: true };
      }),

    createDuradekColor: adminProcedure
      .input(z.object({
        description: z.string().optional(),
        slug: z.string(),
        name: z.string(),
        series: z.string(),
        hex: z.string(),
        pricePerSqft: z.string(),
        sortOrder: z.number().optional(),
        isActive: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createDuradekColor(input);
        return { success: true, id };
      }),

    deleteDuradekColor: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteDuradekColor(input.id);
        return { success: true };
      }),

    // --- Tile Sizes ---
    updateTileSize: adminProcedure
      .input(z.object({
        id: z.number(),
        slug: z.string().optional(),
        name: z.string().optional(),
        description: z.string().optional(),
        laborPerSqft: z.string().optional(),
        materialPerSqft: z.string().optional(),
        sortOrder: z.number().optional(),
        isActive: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateTileSize(id, data);
        return { success: true };
      }),

    createTileSize: adminProcedure
      .input(z.object({
        slug: z.string(),
        name: z.string(),
        description: z.string().optional(),
        laborPerSqft: z.string(),
        materialPerSqft: z.string(),
        sortOrder: z.number().optional(),
        isActive: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createTileSize(input);
        return { success: true, id };
      }),

    deleteTileSize: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteTileSize(input.id);
        return { success: true };
      }),

    // --- Product Settings ---
    updateProductSetting: adminProcedure
      .input(z.object({
        id: z.number(),
        settingValue: z.string(),
      }))
      .mutation(async ({ input }) => {
        await db.updateProductSetting(input.id, input.settingValue);
        return { success: true };
      }),

    createProductSetting: adminProcedure
      .input(z.object({
        productType: z.string(),
        settingKey: z.string(),
        settingValue: z.string(),
        label: z.string(),
        description: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createProductSetting(input);
        return { success: true, id };
      }),

    deleteProductSetting: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteProductSetting(input.id);
        return { success: true };
      }),

    // --- Appalachian: Rain Escape Options ---
    updateRainEscapeOption: adminProcedure
      .input(z.object({
        id: z.number(),
        slug: z.string().optional(),
        name: z.string().optional(),
        description: z.string().optional(),
        gutterPricePerLinearFt: z.string().optional(),
        systemPricePerSqft: z.string().optional(),
        laborPricePerSqft: z.string().optional(),
        sortOrder: z.number().optional(),
        isActive: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateRainEscapeOption(id, data);
        return { success: true };
      }),

    createRainEscapeOption: adminProcedure
      .input(z.object({
        slug: z.string(),
        name: z.string(),
        description: z.string().optional(),
        gutterPricePerLinearFt: z.string(),
        systemPricePerSqft: z.string(),
        laborPricePerSqft: z.string(),
        sortOrder: z.number().optional(),
        isActive: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createRainEscapeOption(input);
        return { success: true, id };
      }),

    deleteRainEscapeOption: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteRainEscapeOption(input.id);
        return { success: true };
      }),

    // --- Appalachian: Soffit Materials ---
    updateSoffitMaterial: adminProcedure
      .input(z.object({
        id: z.number(),
        slug: z.string().optional(),
        name: z.string().optional(),
        description: z.string().optional(),
        pricePerSqft: z.string().optional(),
        laborPricePerSqft: z.string().optional(),
        sortOrder: z.number().optional(),
        isActive: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateSoffitMaterial(id, data);
        return { success: true };
      }),

    createSoffitMaterial: adminProcedure
      .input(z.object({
        slug: z.string(),
        name: z.string(),
        description: z.string().optional(),
        pricePerSqft: z.string(),
        laborPricePerSqft: z.string().optional(),
        sortOrder: z.number().optional(),
        isActive: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createSoffitMaterial(input);
        return { success: true, id };
      }),

     deleteSoffitMaterial: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteSoffitMaterial(input.id);
        return { success: true };
      }),

    // --- Appalachian: A Steel Jacket Options ---
    updateSteelJacketOption: adminProcedure
      .input(z.object({
        id: z.number(),
        slug: z.string().optional(),
        name: z.string().optional(),
        description: z.string().optional(),
        materialCostPerSqft: z.string().optional(),
        installCostPerSqft: z.string().optional(),
        marginPct: z.string().optional(),
        pricePerSqft: z.string().optional(),
        photoUrls: z.array(z.string()).optional(),
        sortOrder: z.number().optional(),
        isActive: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateSteelJacketOption(id, data);
        return { success: true };
      }),

    createSteelJacketOption: adminProcedure
      .input(z.object({
        slug: z.string(),
        name: z.string(),
        description: z.string().optional(),
        materialCostPerSqft: z.string(),
        installCostPerSqft: z.string(),
        marginPct: z.string().optional(),
        pricePerSqft: z.string(),
        photoUrls: z.array(z.string()).optional(),
        sortOrder: z.number().optional(),
        isActive: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createSteelJacketOption(input);
        return { success: true, id };
      }),

    deleteSteelJacketOption: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteSteelJacketOption(input.id);
        return { success: true };
      }),

    // --- Corners Waste Rules ---
    updateCornersWasteRule: adminProcedure
      .input(z.object({
        id: z.number(),
        corners: z.number().optional(),
        allNinetyDegrees: z.number().optional(),
        wastePercent: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateCornersWasteRule(id, data);
        return { success: true };
      }),

    createCornersWasteRule: adminProcedure
      .input(z.object({
        corners: z.number(),
        allNinetyDegrees: z.number(),
        wastePercent: z.string(),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createCornersWasteRule(input);
        return { success: true, id };
      }),

    deleteCornersWasteRule: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteCornersWasteRule(input.id);
        return { success: true };
      }),

    // --- Lumber Items ---
    updateLumberItem: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        unit: z.string().optional(),
        category: z.string().optional(),
        costPrice: z.string().optional(),
        taxPercent: z.string().optional(),
        markupMultiplier: z.string().optional(),
        displayPrice: z.string().optional(),
        sortOrder: z.number().optional(),
        isActive: z.number().optional(),
        homeDepotSku: z.string().nullable().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateLumberItem(id, data);
        return { success: true };
      }),

    createLumberItem: adminProcedure
      .input(z.object({
        name: z.string(),
        description: z.string().optional(),
        unit: z.string(),
        category: z.string(),
        costPrice: z.string(),
        taxPercent: z.string().optional(),
        markupMultiplier: z.string(),
        displayPrice: z.string(),
        sortOrder: z.number().optional(),
        isActive: z.number().optional(),
        insertAfterSortOrder: z.number().optional(), // if set, inserts at this position and bumps items below
      }))
      .mutation(async ({ input }) => {
        const { insertAfterSortOrder, ...data } = input;
        const id = await db.createLumberItem(data as any, insertAfterSortOrder);
        return { success: true, id };
      }),

    deleteLumberItem: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteLumberItem(input.id);
        return { success: true };
      }),

    // --- Home Depot Price Sync ---
    syncLumberPrices: adminProcedure
      .mutation(async () => {
        const { syncAllLumberPrices } = await import("./homeDepotSync");
        const results = await syncAllLumberPrices();
        const succeeded = results.filter((r) => r.success).length;
        const failed = results.filter((r) => !r.success).length;
        return { results, succeeded, failed, total: results.length };
      }),

    syncSingleLumberItem: adminProcedure
      .input(z.object({ id: z.number(), sku: z.string() }))
      .mutation(async ({ input }) => {
        const { fetchHomeDepotPrice } = await import("./homeDepotSync");
        const drizzle = await db.getDb();
        if (!drizzle) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

        const rows = await drizzle.select().from(lumberItems).where(eq(lumberItems.id, input.id)).limit(1);
        if (!rows.length) throw new TRPCError({ code: "NOT_FOUND", message: "Lumber item not found" });
        const item = rows[0];

        const newPrice = await fetchHomeDepotPrice(input.sku);
        if (newPrice === null) {
          throw new TRPCError({ code: "BAD_REQUEST", message: `Could not fetch price for SKU ${input.sku}. Please verify the SKU is correct.` });
        }

        const oldCostPrice = parseFloat(item.costPrice as unknown as string) || 0;
        const oldDisplayPrice = parseFloat(item.displayPrice as unknown as string) || 0;
        const markupMultiplier = parseFloat(item.markupMultiplier as unknown as string) || 1.3;
        const newDisplayPrice = parseFloat((newPrice * markupMultiplier).toFixed(2));

        await drizzle.update(lumberItems).set({
          costPrice: newPrice.toFixed(2) as unknown as any,
          displayPrice: newDisplayPrice.toFixed(2) as unknown as any,
          lastSyncedPrice: newPrice.toFixed(2) as unknown as any,
          lastSyncedAt: new Date(),
        }).where(eq(lumberItems.id, input.id));

        // Log price history only when price actually changed
        if (Math.abs(newPrice - oldCostPrice) >= 0.01) {
          try {
            await drizzle.insert(lumberPriceHistory).values({
              lumberItemId: item.id,
              lumberItemName: item.name,
              sku: input.sku,
              oldCostPrice: oldCostPrice.toFixed(2) as unknown as any,
              newCostPrice: newPrice.toFixed(2) as unknown as any,
              oldDisplayPrice: oldDisplayPrice.toFixed(2) as unknown as any,
              newDisplayPrice: newDisplayPrice.toFixed(2) as unknown as any,
              source: "manual",
            });
          } catch (histErr) {
            console.warn(`[HomeDepotSync] Failed to log price history for ${item.name}:`, histErr);
          }
        }

        console.log(`[HomeDepotSync] Single sync: ${item.name} (SKU ${input.sku}): $${oldCostPrice} → $${newPrice} (display: $${newDisplayPrice})`);
        return { success: true, newCostPrice: newPrice, newDisplayPrice, oldCostPrice };
      }),

    syncAllLumberItems: adminProcedure
      .mutation(async () => {
        const { syncAllLumberPrices } = await import("./homeDepotSync");
        const results = await syncAllLumberPrices();
        const succeeded = results.filter((r) => r.success).length;
        const failed = results.filter((r) => !r.success).length;
        return { results, succeeded, failed, total: results.length };
      }),

    getLumberPriceHistory: adminProcedure
      .input(z.object({ limit: z.number().int().min(1).max(500).default(200) }).optional())
      .query(async ({ input }) => {
        const drizzle = await db.getDb();
        if (!drizzle) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        const rows = await drizzle
          .select()
          .from(lumberPriceHistory)
          .orderBy(desc(lumberPriceHistory.syncedAt))
          .limit(input?.limit ?? 200);
        return rows;
      }),
    // --- Joist Span Entries ---
    getJoistSpanEntries: adminProcedure.query(async () => {
      return db.getJoistSpanEntries();
    }),
    createJoistSpanEntry: adminProcedure
      .input(z.object({
        joistSize: z.string().min(1),
        spacingIn: z.number().int().default(16),
        maxSpanFt: z.string(),
        loadFactorMin: z.string().default("0.00"),
        loadFactorMax: z.string().default("9999.00"),
        notes: z.string().optional(),
        sortOrder: z.number().int().default(0),
        isActive: z.number().int().default(1),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createJoistSpanEntry(input);
        return { success: true, id };
      }),
    updateJoistSpanEntry: adminProcedure
      .input(z.object({
        id: z.number(),
        joistSize: z.string().optional(),
        spacingIn: z.number().int().optional(),
        maxSpanFt: z.string().optional(),
        loadFactorMin: z.string().optional(),
        loadFactorMax: z.string().optional(),
        notes: z.string().optional(),
        sortOrder: z.number().int().optional(),
        isActive: z.number().int().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateJoistSpanEntry(id, data);
        return { success: true };
      }),
    deleteJoistSpanEntry: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteJoistSpanEntry(input.id);
        return { success: true };
      }),

    // --- LVL Beam Entries ---
    getLvlBeamEntries: adminProcedure.query(async () => {
      return db.getLvlBeamEntries();
    }),
    createLvlBeamEntry: adminProcedure
      .input(z.object({
        maxPostSpacingFt: z.string(),
        maxPlf: z.string(),
        beamSize: z.string().min(1),
        isDouble: z.number().int().default(0),
        notes: z.string().optional(),
        sortOrder: z.number().int().default(0),
        isActive: z.number().int().default(1),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createLvlBeamEntry(input);
        return { success: true, id };
      }),
    updateLvlBeamEntry: adminProcedure
      .input(z.object({
        id: z.number(),
        maxPostSpacingFt: z.string().optional(),
        maxPlf: z.string().optional(),
        beamSize: z.string().optional(),
        isDouble: z.number().int().optional(),
        notes: z.string().optional(),
        sortOrder: z.number().int().optional(),
        isActive: z.number().int().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateLvlBeamEntry(id, data);
        return { success: true };
      }),
    deleteLvlBeamEntry: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteLvlBeamEntry(input.id);
        return { success: true };
      }),

    // --- Hot Tub Weights ---
    getHotTubWeights: adminProcedure.query(async () => {
      return db.getHotTubWeights();
    }),
    createHotTubWeight: adminProcedure
      .input(z.object({
        persons: z.number().int().min(2).max(20),
        weightLb: z.number().int(),
        footprintSqft: z.string(),
        psf: z.string(),
        loadFactor: z.string().default("1.50"),
        notes: z.string().optional(),
        sortOrder: z.number().int().default(0),
        isActive: z.number().int().default(1),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createHotTubWeight(input);
        return { success: true, id };
      }),
    updateHotTubWeight: adminProcedure
      .input(z.object({
        id: z.number(),
        persons: z.number().int().optional(),
        weightLb: z.number().int().optional(),
        footprintSqft: z.string().optional(),
        psf: z.string().optional(),
        loadFactor: z.string().optional(),
        notes: z.string().optional(),
        sortOrder: z.number().int().optional(),
        isActive: z.number().int().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateHotTubWeight(id, data);
        return { success: true };
      }),
    deleteHotTubWeight: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteHotTubWeight(input.id);
        return { success: true };
      }),

    // --- Glulam Beam Entries ---
    getGlulamBeamEntries: adminProcedure.query(async () => {
      return db.getGlulamBeamEntries();
    }),
    createGlulamBeamEntry: adminProcedure
      .input(z.object({
        widthIn: z.string(),
        depthIn: z.string(),
        spanFt: z.number().int(),
        maxPlfFloor: z.number().int(),
        maxPlfSnow: z.number().int().default(0),
        species: z.string().default('24F-V4'),
        notes: z.string().optional(),
        isActive: z.number().int().default(1),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createGlulamBeamEntry(input);
        return { success: true, id };
      }),
    updateGlulamBeamEntry: adminProcedure
      .input(z.object({
        id: z.number(),
        widthIn: z.string().optional(),
        depthIn: z.string().optional(),
        spanFt: z.number().int().optional(),
        maxPlfFloor: z.number().int().optional(),
        maxPlfSnow: z.number().int().optional(),
        species: z.string().optional(),
        notes: z.string().optional(),
        isActive: z.number().int().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateGlulamBeamEntry(id, data);
        return { success: true };
      }),
    deleteGlulamBeamEntry: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteGlulamBeamEntry(input.id);
        return { success: true };
      }),

    // --- Railing Options CRUD ---
    createRailingOption: adminProcedure
      .input(z.object({
        name: z.string().min(1),
        railingType: z.string().default("wire"),
        orientation: z.string().nullable().optional(),
        description: z.string().optional(),
        pricePerLf: z.number().min(0).default(0),
        costPerLf: z.number().min(0).default(0),
        installCostPerLf: z.number().min(0).default(0),
        marginPct: z.number().min(0).max(100).default(0),
        sortOrder: z.number().int().default(0),
        isActive: z.number().int().min(0).max(1).default(1),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createRailingOption({
          ...input,
          pricePerLf: String(input.pricePerLf),
          costPerLf: String(input.costPerLf),
          installCostPerLf: String(input.installCostPerLf),
          marginPct: String(input.marginPct),
        });
        return { id };
      }),
    updateRailingOption: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        railingType: z.string().optional(),
        orientation: z.string().nullable().optional(),
        description: z.string().optional(),
        pricePerLf: z.number().min(0).optional(),
        costPerLf: z.number().min(0).optional(),
        installCostPerLf: z.number().min(0).optional(),
        marginPct: z.number().min(0).max(100).optional(),
        sortOrder: z.number().int().optional(),
        isActive: z.number().int().min(0).max(1).optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, pricePerLf, costPerLf, installCostPerLf, marginPct, ...rest } = input;
        await db.updateRailingOption(id, {
          ...rest,
          ...(pricePerLf !== undefined ? { pricePerLf: String(pricePerLf) } : {}),
          ...(costPerLf !== undefined ? { costPerLf: String(costPerLf) } : {}),
          ...(installCostPerLf !== undefined ? { installCostPerLf: String(installCostPerLf) } : {}),
          ...(marginPct !== undefined ? { marginPct: String(marginPct) } : {}),
        });
        return { success: true };
      }),
    deleteRailingOption: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteRailingOption(input.id);
        return { success: true };
      }),
  }),

  // --- Spiral Stair Pricing ---
  spiralStairs: router({
    getAll: adminProcedure.query(async () => {
      return db.getAllSpiralStairPricing();
    }),
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        costPrice: z.number().min(0).optional(),
        marginPct: z.number().min(0).max(100).optional(),
        price: z.number().min(0).optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, costPrice, marginPct, price } = input;
        await db.updateSpiralStairPricing(id, {
          ...(costPrice !== undefined ? { costPrice: String(costPrice) } : {}),
          ...(marginPct !== undefined ? { marginPct: String(marginPct) } : {}),
          ...(price !== undefined ? { price: String(price) } : {}),
        });
        return { success: true };
      }),
  }),

  // --- Post / Beam Wrap ---
  postWrap: router({
    getAll: adminProcedure.query(async () => {
      const options = await db.getAllPostWrapOptions();
      const tiers = await db.getPostWrapLengthTiers();
      return { options, tiers };
    }),

    updateOption: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        laborPricePerPost: z.number().min(0).optional(),
        laborPricePerBeamLf: z.number().min(0).optional(),
        // Legacy flat-rate fields (kept for backward compat)
        pricePerLf: z.number().min(0).optional(),
        laborPricePerLf: z.number().min(0).optional(),
        isActive: z.number().min(0).max(1).optional(),
        sortOrder: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updatePostWrapOption(id, {
          ...(data.name !== undefined ? { name: data.name } : {}),
          ...(data.description !== undefined ? { description: data.description } : {}),
          ...(data.laborPricePerPost !== undefined ? { laborPricePerPost: String(data.laborPricePerPost) } : {}),
          ...(data.laborPricePerBeamLf !== undefined ? { laborPricePerBeamLf: String(data.laborPricePerBeamLf) } : {}),
          ...(data.pricePerLf !== undefined ? { pricePerLf: String(data.pricePerLf) } : {}),
          ...(data.laborPricePerLf !== undefined ? { laborPricePerLf: String(data.laborPricePerLf) } : {}),
          ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
          ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
        });
        return { success: true };
      }),

    createLengthTier: adminProcedure
      .input(z.object({
        postWrapOptionId: z.number(),
        lengthFt: z.number().int().min(1),
        materialCostPerPiece: z.number().min(0),
        materialPricePerPiece: z.number().min(0),
        sortOrder: z.number().optional().default(0),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createPostWrapLengthTier({
          postWrapOptionId: input.postWrapOptionId,
          lengthFt: input.lengthFt,
          materialCostPerPiece: String(input.materialCostPerPiece),
          materialPricePerPiece: String(input.materialPricePerPiece),
          sortOrder: input.sortOrder,
        });
        return { id };
      }),

    updateLengthTier: adminProcedure
      .input(z.object({
        id: z.number(),
        lengthFt: z.number().int().min(1).optional(),
        materialCostPerPiece: z.number().min(0).optional(),
        materialPricePerPiece: z.number().min(0).optional(),
        sortOrder: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updatePostWrapLengthTier(id, {
          ...(data.lengthFt !== undefined ? { lengthFt: data.lengthFt } : {}),
          ...(data.materialCostPerPiece !== undefined ? { materialCostPerPiece: String(data.materialCostPerPiece) } : {}),
          ...(data.materialPricePerPiece !== undefined ? { materialPricePerPiece: String(data.materialPricePerPiece) } : {}),
          ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
        });
        return { success: true };
      }),

    deleteLengthTier: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deletePostWrapLengthTier(input.id);
        return { success: true };
      }),
  }),

  // --- Email Estimate ---
  estimate: router({
    sendEmail: publicProcedure
      .input(z.object({
        customerName: z.string().min(1),
        customerEmail: z.string().email(),
        customerPhone: z.string().default(""),
        customerAddress: z.string().default(""),
        customerCity: z.string().default(""),
        collectionName: z.string(),
        colorName: z.string(),
        colorHex: z.string(),
        sqft: z.number(),
        laborName: z.string(),
        deliveryName: z.string(),
        grandTotal: z.number(),
        finalTotal: z.number(),
        pricePerSqft: z.number(),
        discountApplied: z.boolean(),
        discountName: z.string(),
        discountValue: z.number(),
        discount2Applied: z.boolean().optional().default(false),
        discount2Name: z.string().optional().default(""),
        discount2Value: z.number().optional().default(0),
        showPricing: z.boolean(),
        showItemized: z.boolean(),
        breakdown: z.object({
          materialCost: z.number(),
          laborCost: z.number(),
          deliveryCost: z.number(),
          accessoryCost: z.number(),
          taxAmount: z.number(),
          demoRebuildSubtotal: z.number(),
          rainEscapeSubtotal: z.number(),
          steelJacketSubtotal: z.number().optional().default(0),
          demoRebuildDetails: z.array(z.object({ name: z.string(), cost: z.number() })),
          rainEscapeDetails: z.array(z.object({ name: z.string(), cost: z.number() })),
          steelJacketDetails: z.array(z.object({ name: z.string(), cost: z.number() })).optional().default([]),
          accessoryDetails: z.array(z.object({ name: z.string(), cost: z.number(), showInScope: z.boolean().optional() })),
          laborLineItemDetails: z.array(z.object({ name: z.string(), cost: z.number() })),
          frostFootingCost: z.number().optional().default(0),
          frostFootingCornerCount: z.number().optional().default(0),
          frostFootingIntermediateCount: z.number().optional().default(0),
          frostFootingCornerDiameter: z.number().optional().default(0),
          frostFootingIntermediateDiameter: z.number().optional().default(0),
          builderMaterialDiscount: z.number().optional().default(0),
          builderLaborDiscount: z.number().optional().default(0),
          postWrapCost: z.number().optional().default(0),
          postWrapMaterialCost: z.number().optional().default(0),
          postWrapLaborCost: z.number().optional().default(0),
          postWrapOptionName: z.string().optional().default(''),
          postWrapPostPieces: z.array(z.object({ lengthFt: z.number(), count: z.number(), priceEach: z.number() })).optional().default([]),
          postWrapBeamPieces: z.array(z.object({ lengthFt: z.number(), count: z.number(), priceEach: z.number() })).optional().default([]),
        }),
        stairRuns: z.array(z.object({
          id: z.string(),
          stairType: z.string(),
          stairLength: z.number(),
          stairTreads: z.number(),
          spiralDiameter: z.number().optional(),
          stairTreadMaterial: z.string().optional(),
          landingCount: z.number().optional(),
          needsLanding: z.boolean().optional(),
          label: z.string().optional(),
          isPreliminary: z.boolean().optional(),
          landings: z.array(z.object({
            id: z.string(),
            position: z.enum(["top", "turn", "bottom"]),
            label: z.string(),
            widthFt: z.number(),
            depthFt: z.number(),
            material: z.string(),
            matchesDeck: z.boolean().optional(),
            notes: z.string().optional(),
          })).optional().default([]),
        })).optional().default([]),
        edgeLinearFt: z.number(),
        wasteFactor: z.number(),
        includePermit: z.boolean(),
        contractText: z.string().default(""),
        origin: z.string().default(""),
        estimateSnapshot: z.string().default(""),
        assignedUserId: z.number().optional(),
        repName: z.string().optional(),
        repEmail: z.string().optional(),
        repPhone: z.string().optional(),
        repTitle: z.string().optional(),
        includeFinancing: z.boolean().optional(),
        monthlyPayment: z.number().optional(),
        moodboardNotes: z.string().optional(),
        questionnaireSessionId: z.number().optional(),
        /** Session key for site photos taken during this estimate appointment */
        photoSessionKey: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { ENV } = await import("./_core/env");
        const { ghlSendEstimate } = await import("./ghl");
        const { buildScopeText, buildPricingText } = await import("./email");

        if (!ENV.ghlApiKey || !ENV.ghlLocationId) {
          return {
            success: false,
            error: "GHL is not configured. Please ask your administrator to set GHL_API_KEY and GHL_LOCATION_ID.",
          };
        }

        // Fetch company settings from DB
        const config = await db.getFullConfig();
        const settings = config?.settings || {};

        const companyName = settings.company_name || "Design Your Price";
        const companyPhone = settings.company_phone || "";
        const companyLocation = settings.company_location || "Orem, Utah";
        const estimateDisclaimer = settings.estimate_disclaimer ||
          "This estimate is for informational purposes only and does not constitute a binding quote.";

        // Build text blocks for the email body
        const fullData = {
          ...input,
          companyName,
          companyPhone,
          companyLocation,
          estimateDisclaimer,
        };
        const scopeOfWork = buildScopeText(fullData);
        const pricingBreakdown = buildPricingText(fullData);

        // Create a virtual sign request so the customer can sign & pay from the email
        let signUrl: string | undefined;
        if (input.origin && input.contractText) {
          try {
            const { randomUUID } = await import("crypto");
            const token = randomUUID();
            const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
            const signRequestId = await db.createSignRequest({
              token,
              customerName: input.customerName,
              customerEmail: input.customerEmail,
              customerPhone: input.customerPhone,
              customerAddress: input.customerAddress,
              customerCity: input.customerCity,
            estimateSnapshot: input.estimateSnapshot,
            collectionName: input.collectionName,
            colorName: "",
            sqft: input.sqft,
            grandTotal: String(input.grandTotal),
            finalTotal: String(input.finalTotal),
            pricePerSqft: String(input.pricePerSqft),
            laborName: input.laborName,
            deliveryName: input.deliveryName,
            contractText: input.contractText,
            scopeOfWork,
            pricingBreakdown,
            showPricing: input.showPricing ? 1 : 0,
            status: "pending",
            expiresAt,
            assignedUserId: input.assignedUserId || undefined,
            discountApplied: input.discountApplied ? 1 : 0,
            discountName: input.discountName,
            discountValue: String(input.discountValue),
            discount2Applied: input.discount2Applied ? 1 : 0,
            discount2Name: input.discount2Name,
            discount2Value: String(input.discount2Value),
            projectNotes: input.moodboardNotes || undefined,
            questionnaireSessionId: input.questionnaireSessionId || undefined,
            });
            signUrl = `${input.origin}/sign/${token}`;

            // Link session photos to the sign request
            if (input.photoSessionKey && signRequestId) {
              try {
                const { estimateSitePhotos } = await import("../drizzle/schema");
                const drizzleDb = await db.getDb();
                if (drizzleDb) {
                  const { eq } = await import("drizzle-orm");
                  await drizzleDb
                    .update(estimateSitePhotos)
                    .set({ signRequestId })
                    .where(eq(estimateSitePhotos.sessionKey, input.photoSessionKey));
                }
              } catch (photoErr) {
                console.warn("[sendEmail] Failed to link photos to sign request:", photoErr);
              }
            }
          } catch (err) {
            console.error("[sendEmail] Failed to create sign request:", err);
          }
        }

        // Fetch site photos for email attachment
        let sitePhotoUrls: Array<{ url: string; caption: string; category: string }> = [];
        if (input.photoSessionKey) {
          try {
            const { estimateSitePhotos } = await import("../drizzle/schema");
            const drizzleDb = await db.getDb();
            if (drizzleDb) {
              const { eq, desc } = await import("drizzle-orm");
              const photos = await drizzleDb
                .select()
                .from(estimateSitePhotos)
                .where(eq(estimateSitePhotos.sessionKey, input.photoSessionKey))
                .orderBy(desc(estimateSitePhotos.createdAt));
              sitePhotoUrls = photos.map(p => ({
                url: p.url,
                caption: p.caption ?? "",
                category: p.category ?? "site",
              }));
            }
          } catch (photoErr) {
            console.warn("[sendEmail] Failed to fetch site photos:", photoErr);
          }
        }

        const result = await ghlSendEstimate(
          ENV.ghlApiKey,
          ENV.ghlLocationId,
          {
            customerName: input.customerName,
            customerEmail: input.customerEmail,
            customerPhone: input.customerPhone,
            customerAddress: input.customerAddress,
            customerCity: input.customerCity,
            collectionName: input.collectionName,
            colorName: input.colorName,
            sqft: input.sqft,
            laborName: input.laborName,
            deliveryName: input.deliveryName,
            finalTotal: input.finalTotal,
            pricePerSqft: input.pricePerSqft,
            discountApplied: input.discountApplied,
            discountName: input.discountName,
            discountValue: input.discountValue,
            discount2Applied: input.discount2Applied,
            discount2Name: input.discount2Name,
            discount2Value: input.discount2Value,
            showPricing: input.showPricing,
            scopeOfWork,
            pricingBreakdown,
            estimateDisclaimer,
            companyName,
            companyPhone,
            companyLocation,
            signUrl,
            monthlyPayment: input.monthlyPayment,
            moodboardNotes: input.moodboardNotes,
            sitePhotos: sitePhotoUrls,
          }
        );

        // Log the sent email
        const signRequestToken = signUrl ? signUrl.split("/sign/")[1] : undefined;
        try {
          await db.createSentEmail({
            customerName: input.customerName,
            customerEmail: input.customerEmail,
            customerPhone: input.customerPhone || undefined,
            customerAddress: input.customerAddress || undefined,
            customerCity: input.customerCity || undefined,
            emailType: "estimate",
            subject: `Your ${companyName} Estimate — ${input.collectionName} Stone Decking`,
            signRequestToken: signRequestToken || undefined,
            estimateSnapshot: input.estimateSnapshot || undefined,
            collectionName: input.collectionName,
            colorName: input.colorName,
            sqft: input.sqft,
            finalTotal: String(input.finalTotal),
            ghlContactId: result.contactId || undefined,
            ghlOpportunityId: result.opportunityId || undefined,
            status: result.success ? "sent" : "failed",
            errorMessage: result.error || undefined,
            assignedUserId: input.assignedUserId || undefined,
          });
        } catch (logErr) {
          console.warn("[sendEmail] Failed to log sent email:", logErr);
        }

        return { success: result.success, error: result.error, signUrl };
      }),
    /**
     * Create a Jobtread project, lump-sum budget, and proposal (with 100% payment
     * schedule on signing) after the design-package estimate is reviewed.
     */
    createJobtreadProject: publicProcedure
      .input(z.object({
        customerName: z.string().min(1),
        customerEmail: z.string().email(),
        customerPhone: z.string().optional().default(""),
        customerAddress: z.string().optional().default(""),
        customerCity: z.string().optional().default(""),
        projectDescription: z.string().min(1),
        totalAmount: z.number().positive(),
        scopeOfWork: z.string().default(""),
        contractText: z.string().default(""),
        /** Optional override for the budget line item name (e.g. "Dreams to Reality Design Package") */
        budgetLineItemName: z.string().optional(),
        /** Name for the cost group (budget section header) — use the project type label */
        costGroupName: z.string().optional(),
        /** Individual service line items for the budget tab */
        services: z.array(z.object({
          name: z.string(),
          amount: z.number(),
          detail: z.string().optional(),
          /** Scope of work text — goes into the cost item description in the Jobtread budget tab */
          scopeOfWork: z.string().optional(),
        })).optional(),
        /** Sales rep name ("Prepared By" on proposal) */
        salesRepName: z.string().optional(),
        /** Sales rep email ("Prepared By" on proposal) */
        salesRepEmail: z.string().optional(),
        /** Sales rep phone ("Prepared By" on proposal) */
        salesRepPhone: z.string().optional(),
        /** Company office address ("Prepared By" on proposal) */
        companyAddress: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { ENV } = await import("./_core/env");
        if (!ENV.jobtreadGrantKey || !ENV.jobtreadOrgId) {
          return {
            success: false,
            error: "Jobtread is not configured. Please ask your administrator to set JOBTREAD_GRANT_KEY and JOBTREAD_ORG_ID.",
          };
        }
        const { createJobtreadProject } = await import("./jobtread");
        const result = await createJobtreadProject({
          grantKey: ENV.jobtreadGrantKey,
          orgId: ENV.jobtreadOrgId,
          customerName: input.customerName,
          customerEmail: input.customerEmail,
          customerPhone: input.customerPhone || undefined,
          customerAddress: input.customerAddress || undefined,
          customerCity: input.customerCity || undefined,
          projectDescription: input.projectDescription,
          totalAmount: input.totalAmount,
          scopeOfWork: input.scopeOfWork,
          contractText: input.contractText,
          budgetLineItemName: input.budgetLineItemName || undefined,
          costGroupName: input.costGroupName || undefined,
          services: input.services || undefined,
          fromName: input.salesRepName || "Design Your Price",
          salesRepEmail: input.salesRepEmail || undefined,
          salesRepPhone: input.salesRepPhone || undefined,
          companyAddress: input.companyAddress || undefined,
        });
        // Link the Jobtread job ID to the most recent sent email for this customer
        if (result.success && result.jobId) {
          try {
            const recentEmail = await db.getRecentSentEmailByCustomer(input.customerEmail);
            if (recentEmail) {
              await db.updateSentEmailJobtreadId(recentEmail.id, result.jobId);
            }
          } catch (linkErr) {
            console.warn("[createJobtreadProject] Failed to link jobId to sent email:", linkErr);
          }
        }
        return result;
      }),
  }),

  // --- Customer Orders ---
  orders: router({
    /** Submit a signed order and create a Stripe deposit checkout session */
    create: publicProcedure
      .input(z.object({
        customerName: z.string().min(1),
        customerEmail: z.string().email(),
        customerPhone: z.string().optional(),
        customerAddress: z.string().optional(),
        estimateSnapshot: z.string(), // JSON string of the full estimate
        productType: z.string().default("tanzite"),
        collectionName: z.string().optional(),
        sqft: z.number().default(0),
        grandTotal: z.number().positive(),
        depositAmount: z.number().positive().optional(), // custom deposit; defaults to 50%
        signedName: z.string().min(1),
        contractText: z.string(),
        origin: z.string(), // frontend origin for Stripe redirect URLs
        projectDetails: z.string().optional(), // comma-separated list of selected project detail labels
      }))
      .mutation(async ({ input }) => {
        const depositAmount = input.depositAmount
          ? Math.round(Math.min(input.depositAmount, input.grandTotal) * 100) / 100
          : Math.round(input.grandTotal * 0.5 * 100) / 100;
        const balanceAmount = Math.round((input.grandTotal - depositAmount) * 100) / 100;

        const orderId = await db.createOrder({
          customerName: input.customerName,
          customerEmail: input.customerEmail,
          customerPhone: input.customerPhone,
          customerAddress: input.customerAddress,
          estimateSnapshot: input.estimateSnapshot,
          productType: input.productType,
          collectionName: input.collectionName,
          sqft: input.sqft,
          grandTotal: input.grandTotal.toFixed(2),
          depositAmount: depositAmount.toFixed(2),
          balanceAmount: balanceAmount.toFixed(2),
          signedName: input.signedName,
          signedAt: new Date(),
          contractText: input.contractText,
          paymentStatus: "pending",
          projectDetails: input.projectDetails || null,
        });

        const productDesc = `${input.collectionName || input.productType} Decking -- ${input.sqft} sq ft`;
        const { url, sessionId } = await createDepositCheckoutSession({
          orderId,
          customerName: input.customerName,
          customerEmail: input.customerEmail,
          productDescription: productDesc,
          depositAmountCents: Math.round(depositAmount * 100),
          balanceAmountCents: Math.round(balanceAmount * 100),
          origin: input.origin,
        });

        await db.updateOrder(orderId, { stripeDepositSessionId: sessionId });

        // Fire Zapier "order_signed" event with PDF contract attachment (non-blocking)
        const zapierUrl = process.env.ZAPIER_WEBHOOK_URL ?? "";
        if (zapierUrl) {
          (async () => {
            try {
              const { generateContractPdf } = await import("./contract-pdf");
              const config = await import("./db").then(m => m.getFullConfig());
              const companyName = config?.settings?.company_name || "Design Your Price";

              // Parse estimateSnapshot to extract line items for the PDF table
              let lineItems: Array<{ name: string; cost: number }> | undefined;
              let costCategories: Record<string, number> | undefined;
              try {
                const snap = JSON.parse(input.estimateSnapshot);
                // Collect all named line items from the breakdown
                const items: Array<{ name: string; cost: number }> = [];
                if (snap.subtotalMaterials > 0) items.push({ name: "Materials", cost: snap.subtotalMaterials });
                if (snap.laborCost > 0) items.push({ name: "Labor", cost: snap.laborCost });
                if (snap.deliveryCost > 0) items.push({ name: "Delivery", cost: snap.deliveryCost });
                // Demo & rebuild detailed line items (includes Subfloor (Rainier))
                if (snap.demoRebuild?.details?.length > 0) {
                  for (const d of snap.demoRebuild.details) {
                    items.push({ name: d.name, cost: d.cost });
                  }
                } else if (snap.demoRebuild?.subtotal > 0) {
                  items.push({ name: "Demo & Rebuild", cost: snap.demoRebuild.subtotal });
                }
                // RainEscape detailed line items
                if (snap.rainEscape?.details?.length > 0) {
                  for (const d of snap.rainEscape.details) {
                    items.push({ name: d.name, cost: d.cost });
                  }
                } else if (snap.rainEscape?.subtotal > 0) {
                  items.push({ name: "RainEscape System", cost: snap.rainEscape.subtotal });
                }
                // A Steel Jacket detailed line items
                if (snap.steelJacket?.details?.length > 0) {
                  for (const d of snap.steelJacket.details) {
                    items.push({ name: d.name, cost: d.cost });
                  }
                } else if (snap.steelJacket?.subtotal > 0) {
                  items.push({ name: "A Steel Jacket", cost: snap.steelJacket.subtotal });
                }
                if (snap.accessoriesTotal > 0) items.push({ name: "Accessories", cost: snap.accessoriesTotal });
                if (snap.permitCost > 0) items.push({ name: "Permit", cost: snap.permitCost });
                if (snap.taxAmount > 0) items.push({ name: "Tax", cost: snap.taxAmount });
                if ((snap.builderMaterialDiscount ?? 0) > 0) items.push({ name: "Builder Pricing — Materials (15% off)", cost: -(snap.builderMaterialDiscount ?? 0) });
                if ((snap.builderLaborDiscount ?? 0) > 0) items.push({ name: "Builder Pricing — Labor (10% off)", cost: -(snap.builderLaborDiscount ?? 0) });
                if (items.length > 0) lineItems = items;
              } catch (_) {
                // estimateSnapshot parse failed -- fall back to no line items
              }

              // Detect builder pricing from snapshot
              let isBuilderPricing1 = false;
              let postWrap1: import('./contract-pdf').ContractPdfData['postWrap'] | undefined;
              try {
                const snapCheck = JSON.parse(input.estimateSnapshot);
                isBuilderPricing1 = ((snapCheck.builderMaterialDiscount ?? 0) > 0) || ((snapCheck.builderLaborDiscount ?? 0) > 0);
                // Extract post & beam wrap details
                if ((snapCheck.postWrapCost ?? 0) > 0 && snapCheck.postWrapOptionName) {
                  postWrap1 = {
                    optionName: snapCheck.postWrapOptionName,
                    postPieces: snapCheck.postWrapPostPieces ?? [],
                    beamPieces: snapCheck.postWrapBeamPieces ?? [],
                    materialCost: snapCheck.postWrapMaterialCost ?? 0,
                    laborCost: snapCheck.postWrapLaborCost ?? 0,
                    totalCost: snapCheck.postWrapCost ?? 0,
                  };
                }
              } catch (_) {}

              const pdfBuffer = await generateContractPdf({
                contractText: input.contractText,
                customerName: input.customerName,
                customerEmail: input.customerEmail,
                customerPhone: input.customerPhone,
                customerAddress: input.customerAddress,
                collectionName: input.collectionName || input.productType,
                sqft: input.sqft,
                grandTotal: input.grandTotal,
                depositAmount,
                balanceAmount,
                signedName: input.signedName,
                signedAt: new Date(),
                orderId,
                companyName,
                lineItems,
                costCategories,
                isBuilderPricing: isBuilderPricing1,
                postWrap: postWrap1,
              });
              const pdfBase64 = pdfBuffer.toString("base64");
              const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
              await fetch(zapierUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  event_type: "order_signed",
                  order_id: orderId,
                  customer_name: input.customerName,
                  customer_email: input.customerEmail,
                  customer_phone: input.customerPhone || "",
                  customer_address: input.customerAddress || "",
                  collection_name: input.collectionName || input.productType,
                  sqft: input.sqft,
                  grand_total: input.grandTotal,
                  grand_total_formatted: fmt(input.grandTotal),
                  deposit_amount: depositAmount,
                  deposit_amount_formatted: fmt(depositAmount),
                  balance_amount: balanceAmount,
                  balance_amount_formatted: fmt(balanceAmount),
                  signed_name: input.signedName,
                  signed_at: new Date().toISOString(),
                  contract_pdf_base64: pdfBase64,
                  contract_pdf_filename: `contract-order-${orderId}-${input.customerName.replace(/\s+/g, "-").toLowerCase()}.pdf`,
                  email_subject: `Signed Contract — Order #${orderId} — ${input.collectionName || input.productType} Decking`,
                }),
              });
              console.log(`[Zapier] order_signed event sent for order #${orderId}`);
            } catch (err) {
              console.error("[Zapier] Failed to send order_signed event:", err);
            }
          })();
        }

        return { success: true, orderId, checkoutUrl: url };
      }),

    /** Admin: get all orders */
    getAll: adminProcedure.query(async () => {
      return db.getAllOrders();
    }),

    /** Admin: send balance payment link to customer */
    sendBalanceLink: adminProcedure
      .input(z.object({
        orderId: z.number(),
        origin: z.string(),
      }))
      .mutation(async ({ input }) => {
        const order = await db.getOrderById(input.orderId);
        if (!order) throw new Error("Order not found");
        const productDesc = `${order.collectionName || order.productType} Decking -- ${order.sqft} sq ft`;
        const { url, sessionId } = await createBalanceCheckoutSession({
          orderId: order.id,
          customerName: order.customerName,
          customerEmail: order.customerEmail,
          productDescription: productDesc,
          balanceAmountCents: Math.round(Number(order.balanceAmount) * 100),
          origin: input.origin,
        });
        await db.updateOrder(order.id, { stripeBalanceSessionId: sessionId });
        return { success: true, balanceUrl: url };
      }),

    /** Webhook callback: mark deposit as paid (called from success page) */
    confirmDeposit: publicProcedure
      .input(z.object({ orderId: z.number(), sessionId: z.string() }))
      .mutation(async ({ input }) => {
        const order = await db.getOrderById(input.orderId);
        if (!order) return { success: false };
        if (order.stripeDepositSessionId === input.sessionId) {
          await db.updateOrder(input.orderId, {
            paymentStatus: "deposit_paid",
            stripeDepositPaymentIntentId: input.sessionId,
          });
        }
        return { success: true };
      }),
  }),

  // --- Brochure Requests ---
  brochure: router({
    request: publicProcedure
      .input(z.object({
        name: z.string().min(1),
        email: z.string().email(),
        phone: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        // Save to DB
        await db.createBrochureRequest({
          name: input.name,
          email: input.email,
          phone: input.phone,
          sentToZapier: 0,
        });

        // Send to Zapier -> Go High Level
        const zapierUrl = process.env.ZAPIER_WEBHOOK_URL ?? "";
        if (zapierUrl) {
          try {
            await fetch(zapierUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                event_type: "brochure_request",
                name: input.name,
                email: input.email,
                phone: input.phone || "",
                source: "Design Your Price Calculator",
                timestamp: new Date().toISOString(),
              }),
            });
          } catch (err) {
            console.error("[Brochure] Zapier webhook failed:", err);
          }
        }

        return { success: true };
      }),

    getAll: adminProcedure.query(async () => {
      return db.getAllBrochureRequests();
    }),
  }),

  // --- Project Detail Options ---
  projectDetails: router({
    /** Public: list all active project detail options */
    getAll: publicProcedure.query(async () => {
      const opts = await db.getProjectDetailOptions();
      return opts.filter(o => o.isActive === 1);
    }),

    /** Admin: list all (including inactive) */
    getAllAdmin: adminProcedure.query(async () => {
      return db.getProjectDetailOptions();
    }),

    /** Admin: create a new option */
    create: adminProcedure
      .input(z.object({ label: z.string().min(1), sortOrder: z.number().optional() }))
      .mutation(async ({ input }) => {
        const id = await db.createProjectDetailOption(input);
        return { success: true, id };
      }),

    /** Admin: update label / sortOrder / isActive */
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        label: z.string().min(1).optional(),
        sortOrder: z.number().optional(),
        isActive: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateProjectDetailOption(id, data);
        return { success: true };
      }),

    /** Admin: delete an option */
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteProjectDetailOption(input.id);
        return { success: true };
      }),
  }),

  // --- Virtual Contract Signing ---
  sign: router({
    /** Admin: list all sign requests (newest first) */
    getAll: adminProcedure.query(async () => {
      return await db.getAllSignRequests();
    }),

    /** Admin: download signed contract as PDF */
    downloadContract: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const req = await db.getSignRequestById(input.id);
        if (!req) throw new TRPCError({ code: "NOT_FOUND", message: "Sign request not found." });
        if (req.status !== "signed" || !req.signedName || !req.signedAt) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Contract has not been signed yet." });
        }

        const { generateContractPdf } = await import("./contract-pdf");
        const config = await db.getFullConfig();
        const companyName = config?.settings?.company_name || "Design Your Price";

        const grandTotal = Number(req.finalTotal);
        const depositAmount = Math.round(grandTotal * 0.5 * 100) / 100;
        const balanceAmount = Math.round((grandTotal - depositAmount) * 100) / 100;

        // Parse estimateSnapshot for line items
        let lineItems: Array<{ name: string; cost: number }> | undefined;
        try {
          const snap = JSON.parse(req.estimateSnapshot);
          const items: Array<{ name: string; cost: number }> = [];
          if (snap.subtotalMaterials > 0) items.push({ name: "Materials", cost: snap.subtotalMaterials });
          if (snap.laborCost > 0) items.push({ name: "Labor", cost: snap.laborCost });
          if (snap.deliveryCost > 0) items.push({ name: "Delivery", cost: snap.deliveryCost });
          if (snap.demoRebuild?.details?.length > 0) {
            for (const d of snap.demoRebuild.details) items.push({ name: d.name, cost: d.cost });
          } else if (snap.demoRebuild?.subtotal > 0) {
            items.push({ name: "Demo & Rebuild", cost: snap.demoRebuild.subtotal });
          }
          if (snap.rainEscape?.details?.length > 0) {
            for (const d of snap.rainEscape.details) items.push({ name: d.name, cost: d.cost });
          } else if (snap.rainEscape?.subtotal > 0) {
            items.push({ name: "RainEscape System", cost: snap.rainEscape.subtotal });
          }
          if (snap.steelJacket?.details?.length > 0) {
            for (const d of snap.steelJacket.details) items.push({ name: d.name, cost: d.cost });
          } else if (snap.steelJacket?.subtotal > 0) {
            items.push({ name: "A Steel Jacket", cost: snap.steelJacket.subtotal });
          }
          if (snap.accessoriesTotal > 0) items.push({ name: "Accessories", cost: snap.accessoriesTotal });
          if (snap.permitCost > 0) items.push({ name: "Permit", cost: snap.permitCost });
          if (snap.taxAmount > 0) items.push({ name: "Tax", cost: snap.taxAmount });
          if ((snap.builderMaterialDiscount ?? 0) > 0) items.push({ name: "Builder Pricing — Materials (15% off)", cost: -(snap.builderMaterialDiscount ?? 0) });
          if ((snap.builderLaborDiscount ?? 0) > 0) items.push({ name: "Builder Pricing — Labor (10% off)", cost: -(snap.builderLaborDiscount ?? 0) });
          if (items.length > 0) lineItems = items;
        } catch (_) {
          // fall back to no line items
        }

        // Detect builder pricing from snapshot
        let isBuilderPricing2 = false;
        let postWrap2: import('./contract-pdf').ContractPdfData['postWrap'] | undefined;
        try {
          const snapCheck2 = JSON.parse(req.estimateSnapshot);
          isBuilderPricing2 = ((snapCheck2.builderMaterialDiscount ?? 0) > 0) || ((snapCheck2.builderLaborDiscount ?? 0) > 0);
          if ((snapCheck2.postWrapCost ?? 0) > 0 && snapCheck2.postWrapOptionName) {
            postWrap2 = {
              optionName: snapCheck2.postWrapOptionName,
              postPieces: snapCheck2.postWrapPostPieces ?? [],
              beamPieces: snapCheck2.postWrapBeamPieces ?? [],
              materialCost: snapCheck2.postWrapMaterialCost ?? 0,
              laborCost: snapCheck2.postWrapLaborCost ?? 0,
              totalCost: snapCheck2.postWrapCost ?? 0,
            };
          }
        } catch (_) {}

        // Fetch site photos for PDF embedding
        const { fetchSitePhotosForPdf } = await import("./site-photos-for-pdf");
        const pdfSitePhotos = await fetchSitePhotosForPdf(req.id);

        const pdfBuffer = await generateContractPdf({
          contractText: req.contractText,
          customerName: req.customerName,
          customerEmail: req.customerEmail,
          customerPhone: req.customerPhone || undefined,
          customerAddress: req.customerAddress || undefined,
          collectionName: req.collectionName || "Tanzite",
          sqft: req.sqft,
          grandTotal,
          depositAmount,
          balanceAmount,
          signedName: req.signedName,
          signedAt: new Date(req.signedAt),
          orderId: req.orderId ?? 0,
          companyName,
          lineItems,
          isBuilderPricing: isBuilderPricing2,
          postWrap: postWrap2,
          sitePhotos: pdfSitePhotos.length > 0 ? pdfSitePhotos : undefined,
        });

        return { pdfBase64: pdfBuffer.toString("base64"), filename: `contract-${req.customerName.replace(/\s+/g, "-").toLowerCase()}-${req.id}.pdf` };
      }),

    /** Admin: resend signing email to customer */
    resend: adminProcedure
      .input(z.object({ id: z.number(), origin: z.string() }))
      .mutation(async ({ input }) => {
        const req = await db.getSignRequestById(input.id);
        if (!req) throw new TRPCError({ code: "NOT_FOUND", message: "Sign request not found." });
        const { ENV } = await import("./_core/env");
        if (!ENV.ghlApiKey || !ENV.ghlLocationId) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "GHL not configured." });
        }
        const signUrl = `${input.origin}/sign/${req.token}`;
        const { ghlUpsertContact, ghlSendEmail } = await import("./ghl");
        const ghlData = {
          customerName: req.customerName,
          customerEmail: req.customerEmail,
          customerPhone: req.customerPhone || "",
          customerAddress: req.customerAddress || "",
          collectionName: req.collectionName || "Tanzite",
          colorName: req.colorName || "",
          sqft: req.sqft,
          laborName: req.laborName || "",
          deliveryName: req.deliveryName || "",
          finalTotal: Number(req.finalTotal),
          pricePerSqft: Number(req.pricePerSqft),
          discountApplied: false,
          discountName: "",
          discountValue: 0,
          showPricing: req.showPricing === 1,
          scopeOfWork: req.scopeOfWork || "",
          pricingBreakdown: req.pricingBreakdown || "",
          estimateDisclaimer: "",
          companyName: "Design Your Price",
          companyPhone: "801-762-8267",
          companyLocation: "Orem, Utah",
          signUrl,
        };
        const { contactId } = await ghlUpsertContact(ENV.ghlApiKey, ENV.ghlLocationId, ghlData);
        if (!contactId) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to upsert GHL contact." });
        const result = await ghlSendEmail(ENV.ghlApiKey, ENV.ghlLocationId, contactId, ghlData);
        if (!result.success) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: result.error || "Failed to send email." });
        return { success: true, signUrl };
      }),


    /** Create a sign request when an estimate email is sent */
    create: publicProcedure
      .input(z.object({
        customerName: z.string().min(1),
        customerEmail: z.string().email(),
        customerPhone: z.string().default(""),
        customerAddress: z.string().default(""),
        collectionName: z.string(),
        colorName: z.string(),
        sqft: z.number(),
        grandTotal: z.number(),
        finalTotal: z.number(),
        pricePerSqft: z.number(),
        laborName: z.string(),
        deliveryName: z.string(),
        estimateSnapshot: z.string(),
        contractText: z.string(),
        scopeOfWork: z.string().default(""),
        pricingBreakdown: z.string().default(""),
        showPricing: z.boolean().default(true),
      }))
      .mutation(async ({ input }) => {
        const { randomUUID } = await import("crypto");
        const token = randomUUID();
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        await db.createSignRequest({
          token,
          customerName: input.customerName,
          customerEmail: input.customerEmail,
          customerPhone: input.customerPhone,
          customerAddress: input.customerAddress,
          estimateSnapshot: input.estimateSnapshot,
          collectionName: input.collectionName,
          colorName: input.colorName,
          sqft: input.sqft,
          grandTotal: String(input.grandTotal),
          finalTotal: String(input.finalTotal),
          pricePerSqft: String(input.pricePerSqft),
          laborName: input.laborName,
          deliveryName: input.deliveryName,
          contractText: input.contractText,
          scopeOfWork: input.scopeOfWork,
          pricingBreakdown: input.pricingBreakdown,
          showPricing: input.showPricing ? 1 : 0,
          status: "pending",
          expiresAt,
        });
        return { token };
      }),

    /** Get sign request by token (public — no auth required) */
    getByToken: publicProcedure
      .input(z.object({ token: z.string() }))
      .query(async ({ input }) => {
        const req = await db.getSignRequestByToken(input.token);
        if (!req) throw new TRPCError({ code: "NOT_FOUND", message: "Signing link not found or expired." });
        if (req.status === "expired" || (req.expiresAt && new Date(req.expiresAt) < new Date())) {
          throw new TRPCError({ code: "NOT_FOUND", message: "This signing link has expired." });
        }
        return req;
      }),

    /** Sign the contract and create a Stripe deposit checkout session */
    signAndPay: publicProcedure
      .input(z.object({
        token: z.string(),
        signedName: z.string().min(1),
        origin: z.string(),
        photoUrls: z.array(z.string().url()).min(1).max(6).optional(),
      }))
      .mutation(async ({ input }) => {
        const req = await db.getSignRequestByToken(input.token);
        if (!req) throw new TRPCError({ code: "NOT_FOUND", message: "Signing link not found." });
        if (req.status !== "pending") throw new TRPCError({ code: "BAD_REQUEST", message: "This contract has already been signed." });
        if (req.expiresAt && new Date(req.expiresAt) < new Date()) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "This signing link has expired." });
        }

        const grandTotal = Number(req.finalTotal);
        const depositAmount = Math.round(grandTotal * 0.5 * 100) / 100;
        const balanceAmount = Math.round((grandTotal - depositAmount) * 100) / 100;

        // Insert order record
        const { orders: ordersTable } = await import("../drizzle/schema");
        const { drizzle: drizzleConn } = await import("drizzle-orm/mysql2");
        const { createConnection } = await import("mysql2/promise");
        const { ENV } = await import("./_core/env");
        const conn = await createConnection(ENV.databaseUrl);
        const dbConn = drizzleConn(conn);
        const orderResult = await dbConn.insert(ordersTable).values({
          customerName: req.customerName,
          customerEmail: req.customerEmail,
          customerPhone: req.customerPhone || "",
          customerAddress: req.customerAddress || "",
          estimateSnapshot: req.estimateSnapshot,
          productType: "tanzite",
          collectionName: req.collectionName || "",
          sqft: req.sqft,
          grandTotal: String(grandTotal),
          depositAmount: String(depositAmount),
          balanceAmount: String(balanceAmount),
          signedName: input.signedName,
          signedAt: new Date(),
          contractText: req.contractText,
          paymentStatus: "pending",
        });
        await conn.end();
        const orderId = orderResult[0].insertId;

        // Create Stripe deposit checkout
        const productDesc = `${req.collectionName || "Tanzite"} Stone Decking — ${req.sqft} sq ft`;
        const { url, sessionId } = await createDepositCheckoutSession({
          orderId,
          customerName: req.customerName,
          customerEmail: req.customerEmail,
          productDescription: productDesc,
          depositAmountCents: Math.round(depositAmount * 100),
          balanceAmountCents: Math.round(balanceAmount * 100),
          origin: input.origin,
        });

        // Mark sign request as signed
        await db.updateSignRequest(req.id, {
          status: "signed",
          signedName: input.signedName,
          signedAt: new Date(),
          stripeDepositSessionId: sessionId,
          checkoutUrl: url,
          orderId,
          ...(input.photoUrls && input.photoUrls.length > 0 ? { photoUrls: input.photoUrls } : {}),
        });

        // Attach project photos as a GHL contact note (non-blocking)
        if (input.photoUrls && input.photoUrls.length > 0) {
          try {
            const { ENV: envVars } = await import("./_core/env");
            if (envVars.ghlApiKey) {
              const { ghlUpsertContact, ghlAddContactNote } = await import("./ghl");
              const ghlContactData = {
                customerName: req.customerName,
                customerEmail: req.customerEmail,
                customerPhone: req.customerPhone || "",
                customerAddress: req.customerAddress || "",
                collectionName: req.collectionName || "Tanzite",
                colorName: req.colorName || "",
                sqft: req.sqft,
                laborName: req.laborName || "",
                deliveryName: req.deliveryName || "",
                finalTotal: Number(req.finalTotal),
                pricePerSqft: Number(req.pricePerSqft),
                discountApplied: false,
                discountName: "",
                discountValue: 0,
                showPricing: req.showPricing === 1,
                scopeOfWork: req.scopeOfWork || "",
                pricingBreakdown: req.pricingBreakdown || "",
                estimateDisclaimer: "",
                companyName: "Design Your Price",
                companyPhone: "801-762-8267",
                companyLocation: "Orem, Utah",
              };
              const { contactId: photoContactId } = await ghlUpsertContact(envVars.ghlApiKey, envVars.ghlLocationId || "", ghlContactData);
              if (photoContactId) {
                const photoNoteBody = `Project Photos (${input.photoUrls.length}):\n${input.photoUrls.map((url, i) => `${i + 1}. ${url}`).join("\n")}`;
                await ghlAddContactNote(envVars.ghlApiKey, photoContactId, photoNoteBody);
                console.log(`[signAndPay] GHL photo note added for ${req.customerName}`);
              }
            }
          } catch (photoErr) {
            console.warn("[signAndPay] GHL photo note failed (non-blocking):", photoErr);
          }
        }

        // Update GHL opportunity to "Contract Signed" stage (non-blocking)
        try {
          const { ENV: envVars } = await import("./_core/env");
          if (envVars.ghlApiKey && envVars.ghlLocationId) {
            const { ghlUpsertContact, ghlMoveOpportunityToSigned } = await import("./ghl");
            const ghlContactData = {
              customerName: req.customerName,
              customerEmail: req.customerEmail,
              customerPhone: req.customerPhone || "",
              customerAddress: req.customerAddress || "",
              collectionName: req.collectionName || "Tanzite",
              colorName: req.colorName || "",
              sqft: req.sqft,
              laborName: req.laborName || "",
              deliveryName: req.deliveryName || "",
              finalTotal: Number(req.finalTotal),
              pricePerSqft: Number(req.pricePerSqft),
              discountApplied: false,
              discountName: "",
              discountValue: 0,
              showPricing: req.showPricing === 1,
              scopeOfWork: req.scopeOfWork || "",
              pricingBreakdown: req.pricingBreakdown || "",
              estimateDisclaimer: "",
              companyName: "Design Your Price",
              companyPhone: "801-762-8267",
              companyLocation: "Orem, Utah",
            };
            const { contactId: ghlContactId } = await ghlUpsertContact(envVars.ghlApiKey, envVars.ghlLocationId, ghlContactData);
            if (ghlContactId) {
              const moveResult = await ghlMoveOpportunityToSigned(envVars.ghlApiKey, envVars.ghlLocationId, ghlContactId, req.customerName);
              if (moveResult.success) {
                console.log(`[signAndPay] GHL opportunity moved to signed for ${req.customerName} (opp: ${moveResult.opportunityId})`);
              } else {
                console.warn(`[signAndPay] GHL opportunity move failed (non-blocking): ${moveResult.error}`);
              }
            }
          }
        } catch (ghlErr) {
          console.warn("[signAndPay] GHL opportunity update failed (non-blocking):", ghlErr);
        }

        // Send signed contract PDF to customer via GHL email (non-blocking)
        try {
          const { ENV: envVars } = await import("./_core/env");
          if (envVars.ghlApiKey && envVars.ghlLocationId) {
            const { generateContractPdf } = await import("./contract-pdf");
            const { storagePut } = await import("./storage");
            const { ghlUpsertContact, ghlSendSignedContractEmail } = await import("./ghl");
            const config = await db.getFullConfig();
            const companyName = config?.settings?.company_name || "Design Your Price";
            const companyPhone = config?.settings?.company_phone || "801-762-8267";
            const companyLocation = config?.settings?.company_location || "Orem, Utah";

            // Parse line items from estimate snapshot
            let lineItems: Array<{ name: string; cost: number }> | undefined;
            try {
              const snap = JSON.parse(req.estimateSnapshot);
              const items: Array<{ name: string; cost: number }> = [];
              if (snap.subtotalMaterials > 0) items.push({ name: "Materials", cost: snap.subtotalMaterials });
              if (snap.laborCost > 0) items.push({ name: "Labor", cost: snap.laborCost });
              if (snap.deliveryCost > 0) items.push({ name: "Delivery", cost: snap.deliveryCost });
              if (snap.demoRebuild?.details?.length > 0) {
                for (const d of snap.demoRebuild.details) items.push({ name: d.name, cost: d.cost });
              } else if (snap.demoRebuild?.subtotal > 0) {
                items.push({ name: "Demo & Rebuild", cost: snap.demoRebuild.subtotal });
              }
              if (snap.rainEscape?.details?.length > 0) {
                for (const d of snap.rainEscape.details) items.push({ name: d.name, cost: d.cost });
              } else if (snap.rainEscape?.subtotal > 0) {
                items.push({ name: "RainEscape System", cost: snap.rainEscape.subtotal });
              }
              if (snap.steelJacket?.details?.length > 0) {
                for (const d of snap.steelJacket.details) items.push({ name: d.name, cost: d.cost });
              } else if (snap.steelJacket?.subtotal > 0) {
                items.push({ name: "A Steel Jacket", cost: snap.steelJacket.subtotal });
              }
              if (snap.accessoriesTotal > 0) items.push({ name: "Accessories", cost: snap.accessoriesTotal });
              if (snap.permitCost > 0) items.push({ name: "Permit", cost: snap.permitCost });
              if (snap.taxAmount > 0) items.push({ name: "Tax", cost: snap.taxAmount });
              if ((snap.builderMaterialDiscount ?? 0) > 0) items.push({ name: "Builder Pricing — Materials (15% off)", cost: -(snap.builderMaterialDiscount ?? 0) });
              if ((snap.builderLaborDiscount ?? 0) > 0) items.push({ name: "Builder Pricing — Labor (10% off)", cost: -(snap.builderLaborDiscount ?? 0) });
              if (items.length > 0) lineItems = items;
            } catch (_) { /* ignore */ }

            // Detect builder pricing from snapshot
            let isBuilderPricing3 = false;
            let postWrap3: import('./contract-pdf').ContractPdfData['postWrap'] | undefined;
            try {
              const snapCheck3 = JSON.parse(req.estimateSnapshot);
              isBuilderPricing3 = ((snapCheck3.builderMaterialDiscount ?? 0) > 0) || ((snapCheck3.builderLaborDiscount ?? 0) > 0);
              if ((snapCheck3.postWrapCost ?? 0) > 0 && snapCheck3.postWrapOptionName) {
                postWrap3 = {
                  optionName: snapCheck3.postWrapOptionName,
                  postPieces: snapCheck3.postWrapPostPieces ?? [],
                  beamPieces: snapCheck3.postWrapBeamPieces ?? [],
                  materialCost: snapCheck3.postWrapMaterialCost ?? 0,
                  laborCost: snapCheck3.postWrapLaborCost ?? 0,
                  totalCost: snapCheck3.postWrapCost ?? 0,
                };
              }
            } catch (_) {}

            // Fetch site photos for PDF embedding
            const { fetchSitePhotosForPdf } = await import("./site-photos-for-pdf");
            const pdfSitePhotos3 = await fetchSitePhotosForPdf(req.id);

            // Generate the signed contract PDF
            const pdfBuffer = await generateContractPdf({
              contractText: req.contractText,
              customerName: req.customerName,
              customerEmail: req.customerEmail,
              customerPhone: req.customerPhone || undefined,
              customerAddress: req.customerAddress || undefined,
              collectionName: req.collectionName || "Tanzite",
              sqft: req.sqft,
              grandTotal,
              depositAmount,
              balanceAmount,
              signedName: input.signedName,
              signedAt: new Date(),
              orderId: Number(orderId),
              companyName,
              lineItems,
              isBuilderPricing: isBuilderPricing3,
              postWrap: postWrap3,
              sitePhotos: pdfSitePhotos3.length > 0 ? pdfSitePhotos3 : undefined,
            });

            // Upload PDF to S3 and get a public URL
            const safeCustomerName = req.customerName.replace(/\s+/g, "-").toLowerCase();
            const pdfKey = `signed-contracts/${safeCustomerName}-order-${orderId}-${Date.now()}.pdf`;
            const { url: pdfUrl } = await storagePut(pdfKey, pdfBuffer, "application/pdf");

            // Upsert GHL contact and send the signed contract email
            const ghlContactData = {
              customerName: req.customerName,
              customerEmail: req.customerEmail,
              customerPhone: req.customerPhone || "",
              customerAddress: req.customerAddress || "",
              collectionName: req.collectionName || "Tanzite",
              colorName: req.colorName || "",
              sqft: req.sqft,
              laborName: req.laborName || "",
              deliveryName: req.deliveryName || "",
              finalTotal: grandTotal,
              pricePerSqft: Number(req.pricePerSqft),
              discountApplied: false,
              discountName: "",
              discountValue: 0,
              showPricing: req.showPricing === 1,
              scopeOfWork: req.scopeOfWork || "",
              pricingBreakdown: req.pricingBreakdown || "",
              estimateDisclaimer: "",
              companyName,
              companyPhone,
              companyLocation,
            };
            const { contactId: ghlContactId } = await ghlUpsertContact(envVars.ghlApiKey, envVars.ghlLocationId, ghlContactData);
            if (ghlContactId) {
              const emailResult = await ghlSendSignedContractEmail(
                envVars.ghlApiKey,
                envVars.ghlLocationId,
                ghlContactId,
                {
                  customerName: req.customerName,
                  customerEmail: req.customerEmail,
                  companyName,
                  companyPhone,
                  companyLocation,
                  collectionName: req.collectionName || "Tanzite",
                  sqft: req.sqft,
                  grandTotal,
                  depositAmount,
                  signedName: input.signedName,
                  signedAt: new Date(),
                  orderId: Number(orderId),
                  pdfUrl,
                  checkoutUrl: url || "",
                }
              );
              if (emailResult.success) {
                console.log(`[signAndPay] Signed contract email sent to ${req.customerEmail}`);
              } else {
                console.warn(`[signAndPay] Signed contract email failed (non-blocking): ${emailResult.error}`);
              }
            }
          }
        } catch (emailErr) {
          console.warn("[signAndPay] Signed contract email failed (non-blocking):", emailErr);
        }

        // Notify owner (non-blocking — don't fail the signing if notification fails)
        try {
          const { notifyOwner } = await import("./_core/notification");
          const fmt = (n: number) =>
            new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
          await notifyOwner({
            title: `✍ Contract Signed — ${req.customerName}`,
            content: [
              `Customer: ${req.customerName} <${req.customerEmail}>${req.customerPhone ? ` · ${req.customerPhone}` : ""}`,
              `Project: ${req.collectionName || "Tanzite"} Stone Decking · ${req.sqft} sq ft`,
              `Total: ${fmt(grandTotal)} · Deposit: ${fmt(depositAmount)}`,
              `Signed as: "${input.signedName}"`,
              `Order #${orderId} created · Stripe checkout ready`,
            ].join("\n"),
          });
        } catch (notifyErr) {
          console.warn("[signAndPay] Owner notification failed (non-blocking):", notifyErr);
        }

        return { success: true, orderId, checkoutUrl: url };
      }),

    /** Upload a project photo to S3 and return the URL (public — called before signing) */
    uploadPhoto: publicProcedure
      .input(z.object({
        token: z.string(),
        fileBase64: z.string(),
        mimeType: z.enum(["image/jpeg", "image/png", "image/webp", "image/heic", "image/gif"]),
        fileName: z.string(),
      }))
      .mutation(async ({ input }) => {
        const req = await db.getSignRequestByToken(input.token);
        if (!req) throw new TRPCError({ code: "NOT_FOUND", message: "Signing link not found." });
        if (req.status !== "pending") throw new TRPCError({ code: "BAD_REQUEST", message: "Contract already signed." });

        const { storagePut } = await import("./storage");
        const buffer = Buffer.from(input.fileBase64, "base64");
        const ext = input.mimeType.split("/")[1].replace("jpeg", "jpg");
        const randomSuffix = Math.random().toString(36).slice(2, 10);
        const fileKey = `contract-photos/${req.id}/${randomSuffix}.${ext}`;
        const { url } = await storagePut(fileKey, buffer, input.mimeType);
        return { url };
      }),
  }),

  // --- Estimate Site Photos ---
  estimatePhotos: router({
    /** Upload a site photo for an estimate session — returns S3 URL */
    upload: publicProcedure
      .input(z.object({
        sessionKey: z.string().min(1).max(64),
        fileBase64: z.string(),
        mimeType: z.enum(["image/jpeg", "image/png", "image/webp", "image/heic", "image/gif"]),
        fileName: z.string().default("photo.jpg"),
        caption: z.string().default(""),
        category: z.enum(["site", "materials", "existing-deck", "damage", "other"]).default("site"),
        fileSizeBytes: z.number().default(0),
      }))
      .mutation(async ({ input }) => {
        const { storagePut } = await import("./storage");
        const buffer = Buffer.from(input.fileBase64, "base64");
        const ext = input.mimeType.split("/")[1].replace("jpeg", "jpg").replace("heic", "jpg");
        const randomSuffix = Math.random().toString(36).slice(2, 10);
        const fileKey = `estimate-site-photos/${input.sessionKey}/${randomSuffix}.${ext}`;
        const { url } = await storagePut(fileKey, buffer, input.mimeType);
        const { estimateSitePhotos } = await import("../drizzle/schema");
        const drizzleDb = await db.getDb();
        if (!drizzleDb) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        await drizzleDb.insert(estimateSitePhotos).values({
          sessionKey: input.sessionKey,
          url,
          s3Key: fileKey,
          caption: input.caption,
          category: input.category,
          mimeType: input.mimeType,
          fileSizeBytes: input.fileSizeBytes,
          createdAt: Date.now(),
        });
        return { url, s3Key: fileKey };
      }),

    /** List all photos for a session key */
    listBySession: publicProcedure
      .input(z.object({ sessionKey: z.string() }))
      .query(async ({ input }) => {
        const { estimateSitePhotos } = await import("../drizzle/schema");
        const drizzleDb = await db.getDb();
        if (!drizzleDb) return [];
        const { eq, desc } = await import("drizzle-orm");
        return await drizzleDb
          .select()
          .from(estimateSitePhotos)
          .where(eq(estimateSitePhotos.sessionKey, input.sessionKey))
          .orderBy(desc(estimateSitePhotos.createdAt));
      }),

    /** Update caption or category for a photo */
    update: publicProcedure
      .input(z.object({
        id: z.number(),
        caption: z.string().optional(),
        category: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { estimateSitePhotos } = await import("../drizzle/schema");
        const drizzleDb = await db.getDb();
        if (!drizzleDb) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        const { eq } = await import("drizzle-orm");
        const updates: Record<string, string> = {};
        if (input.caption !== undefined) updates.caption = input.caption;
        if (input.category !== undefined) updates.category = input.category;
        await drizzleDb.update(estimateSitePhotos).set(updates).where(eq(estimateSitePhotos.id, input.id));
        return { ok: true };
      }),

    /** Delete a photo by id */
    delete: publicProcedure
      .input(z.object({ id: z.number(), s3Key: z.string() }))
      .mutation(async ({ input }) => {
        const { estimateSitePhotos } = await import("../drizzle/schema");
        const drizzleDb = await db.getDb();
        if (!drizzleDb) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        const { eq } = await import("drizzle-orm");
        // Delete from DB
        await drizzleDb.delete(estimateSitePhotos).where(eq(estimateSitePhotos.id, input.id));
        // Note: S3 key is preserved in DB for audit trail; physical deletion can be done via admin tools
        return { ok: true };
      }),

    /** Link session photos to a sign request after estimate is sent */
    linkToSignRequest: publicProcedure
      .input(z.object({ sessionKey: z.string(), signRequestId: z.number() }))
      .mutation(async ({ input }) => {
        const { estimateSitePhotos } = await import("../drizzle/schema");
        const drizzleDb = await db.getDb();
        if (!drizzleDb) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        const { eq } = await import("drizzle-orm");
        await drizzleDb
          .update(estimateSitePhotos)
          .set({ signRequestId: input.signRequestId })
          .where(eq(estimateSitePhotos.sessionKey, input.sessionKey));
        return { ok: true };
      }),

    /** Admin: list all photos for a sign request */
    listBySignRequest: adminProcedure
      .input(z.object({ signRequestId: z.number() }))
      .query(async ({ input }) => {
        const { estimateSitePhotos } = await import("../drizzle/schema");
        const drizzleDb = await db.getDb();
        if (!drizzleDb) return [];
        const { eq, desc } = await import("drizzle-orm");
        return await drizzleDb
          .select()
          .from(estimateSitePhotos)
          .where(eq(estimateSitePhotos.signRequestId, input.signRequestId))
          .orderBy(desc(estimateSitePhotos.createdAt));
      }),
  }),

  // --- Sent Emails (admin) ---
  sentEmails: router({
    getAll: adminProcedure.query(async () => {
      return await db.getAllSentEmails();
    }),
    /** Admin: resend an estimate email */
    resend: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const email = await db.getSentEmailById(input.id);
        if (!email) throw new TRPCError({ code: "NOT_FOUND", message: "Email log not found." });
        const { ENV } = await import("./_core/env");
        const { ghlUpsertContact, ghlSendEmail } = await import("./ghl");
        if (!ENV.ghlApiKey || !ENV.ghlLocationId) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "GHL not configured." });
        }
        const config = await db.getFullConfig();
        const settings = config?.settings || {};
        const companyName = settings.company_name || "Design Your Price";
        const companyPhone = settings.company_phone || "";
        const companyLocation = settings.company_location || "Orem, Utah";
        const estimateDisclaimer = settings.estimate_disclaimer ||
          "This estimate is for informational purposes only and does not constitute a binding quote.";
        // Find the sign request to get the sign URL
        let signUrl: string | undefined;
        if (email.signRequestToken) {
          const req = await db.getSignRequestByToken(email.signRequestToken);
          if (req && req.status === "pending" && req.expiresAt > new Date()) {
            signUrl = `https://app.designyourpricedecks.com/sign/${req.token}`;
          }
        }
        const ghlData = {
          customerName: email.customerName,
          customerEmail: email.customerEmail,
          customerPhone: email.customerPhone || "",
          customerAddress: email.customerAddress || "",
          customerCity: email.customerCity || "",
          collectionName: email.collectionName || "Tanzite",
          colorName: email.colorName || "",
          sqft: email.sqft || 0,
          laborName: "",
          deliveryName: "",
          finalTotal: Number(email.finalTotal || 0),
          pricePerSqft: 0,
          discountApplied: false,
          discountName: "",
          discountValue: 0,
          showPricing: true,
          scopeOfWork: "",
          pricingBreakdown: "",
          estimateDisclaimer,
          companyName,
          companyPhone,
          companyLocation,
          signUrl,
        };
        const { contactId } = await ghlUpsertContact(ENV.ghlApiKey, ENV.ghlLocationId, ghlData);
        if (!contactId) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Could not find/create GHL contact." });
        const result = await ghlSendEmail(ENV.ghlApiKey, ENV.ghlLocationId, contactId, ghlData);
        // Log the resend
        await db.createSentEmail({
          customerName: email.customerName,
          customerEmail: email.customerEmail,
          customerPhone: email.customerPhone || undefined,
          customerAddress: email.customerAddress || undefined,
          customerCity: email.customerCity || undefined,
          emailType: "resend",
          subject: email.subject || undefined,
          signRequestToken: email.signRequestToken || undefined,
          estimateSnapshot: email.estimateSnapshot || undefined,
          collectionName: email.collectionName || undefined,
          colorName: email.colorName || undefined,
          sqft: email.sqft || undefined,
          finalTotal: email.finalTotal || undefined,
          ghlContactId: contactId,
          status: result.success ? "sent" : "failed",
          errorMessage: result.error || undefined,
        });
        return { success: result.success, error: result.error };
      }),
    /** Admin: delete a sent email record */
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const deleted = await db.deleteSentEmail(input.id);
        if (!deleted) throw new TRPCError({ code: "NOT_FOUND", message: "Email record not found." });
        return { success: true };
      }),
    /** Link a Jobtread job ID to a sent email record */
    linkJobtread: publicProcedure
      .input(z.object({ sentEmailId: z.number(), jobtreadJobId: z.string() }))
      .mutation(async ({ input }) => {
        await db.updateSentEmailJobtreadId(input.sentEmailId, input.jobtreadJobId);
        return { success: true };
      }),
  }),

  // --- Contract Templates (admin) ---
  contractTemplates: router({
    getAll: adminProcedure.query(async () => {
      return await db.getAllContractTemplates();
    }),
    create: adminProcedure
      .input(z.object({
        name: z.string().min(1),
        serviceType: z.string().min(1),
        contractText: z.string().min(1),
        projectType: z.string().optional(), // e.g. "addition", "bathroom", "kitchen", "full_home_remodel", "default"
        isDefault: z.number().optional().default(0),
        isActive: z.number().optional().default(1),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createContractTemplate(input);
        return { success: true, id };
      }),
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        serviceType: z.string().min(1).optional(),
        contractText: z.string().optional(),
        projectType: z.string().optional(), // e.g. "addition", "bathroom", "kitchen", "full_home_remodel", "default"
        isDefault: z.number().optional(),
        isActive: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateContractTemplate(id, data);
        return { success: true };
      }),
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteContractTemplate(input.id);
        return { success: true };
      }),
    /** Public: fetch a single active contract template by serviceType, with optional projectType fallback */
    getByServiceType: publicProcedure
      .input(z.object({
        serviceType: z.string(),
        /** Optional project type key — "addition", "bathroom", "kitchen", "full_home_remodel", "default" */
        projectType: z.string().optional(),
      }))
      .query(async ({ input }) => {
        const templates = await db.getAllContractTemplates();
        const active = templates.filter(
          (t) => t.serviceType === input.serviceType && t.isActive === 1
        );
        // Try exact project type match first, then fall back to "default", then any active
        const match =
          (input.projectType
            ? active.find((t) => t.projectType === input.projectType)
            : undefined) ??
          active.find((t) => t.projectType === "default") ??
          active[0];
        return match ? { contractText: match.contractText, name: match.name, projectType: match.projectType } : null;
      }),
  }),

  calculatorUsers: router({
    getAll: adminProcedure.query(async () => {
      return await db.getAllCalculatorUsers();
    }),
    create: adminProcedure
      .input(z.object({
        name: z.string().min(1),
        email: z.string().email(),
        phone: z.string().optional(),
        title: z.string().optional(),
        companyPhone: z.string().optional(),
        pin: z.string().length(4).regex(/^\d{4}$/, "PIN must be exactly 4 digits"),
        role: z.enum(["super_admin", "manager", "rep"]).default("rep"),
        managerId: z.number().nullable().optional(),
        permissions: z.record(z.string(), z.boolean()).optional(),
        isActive: z.number().optional().default(1),
      }))
      .mutation(async ({ input }) => {
        const existing = await db.getCalculatorUserByPin(input.pin);
        if (existing) {
          throw new TRPCError({ code: 'CONFLICT', message: 'That PIN is already in use by another active user.' });
        }
        const id = await db.createCalculatorUser({
          ...input,
          managerId: input.managerId ?? null,
          permissions: input.permissions ?? DEFAULT_PERMISSIONS,
        } as any);
        return { success: true, id };
      }),
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        title: z.string().optional(),
        companyPhone: z.string().optional(),
        pin: z.string().length(4).regex(/^\d{4}$/).optional(),
        role: z.enum(["super_admin", "manager", "rep"]).optional(),
        managerId: z.number().nullable().optional(),
        permissions: z.record(z.string(), z.boolean()).optional(),
        isActive: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        if (data.pin) {
          const existing = await db.getCalculatorUserByPin(data.pin);
          if (existing && existing.id !== id) {
            throw new TRPCError({ code: 'CONFLICT', message: 'That PIN is already in use by another active user.' });
          }
        }
        await db.updateCalculatorUser(id, data as any);
        return { success: true };
      }),
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteCalculatorUser(input.id);
        return { success: true };
      }),
    validatePin: publicProcedure
      .input(z.object({ pin: z.string().length(4) }))
      .mutation(async ({ input }) => {
        const user = await db.getCalculatorUserByPin(input.pin);
        if (!user) {
          return { valid: false, user: null };
        }
        return {
          valid: true,
          user: {
            id: user.id,
            name: user.name,
            email: user.email ?? null,
            phone: user.phone ?? null,
            title: (user as any).title ?? null,
            companyPhone: (user as any).companyPhone ?? null,
            role: (user as any).role ?? 'rep',
            managerId: (user as any).managerId ?? null,
            permissions: (user as any).permissions ?? DEFAULT_PERMISSIONS,
          },
        };
      }),
    getScopedSignRequests: publicProcedure
      .input(z.object({ calUserId: z.number() }))
      .query(async ({ input }) => {
        const calUser = await db.getCalculatorUserById(input.calUserId);
        if (!calUser) return [];
        const allUsers = await db.getAllCalculatorUsers();
        return db.getScopedSignRequests(calUser, allUsers);
      }),
    getScopedSentEmails: publicProcedure
      .input(z.object({ calUserId: z.number() }))
      .query(async ({ input }) => {
        const calUser = await db.getCalculatorUserById(input.calUserId);
        if (!calUser) return [];
        const allUsers = await db.getAllCalculatorUsers();
        return db.getScopedSentEmails(calUser, allUsers);
      }),
  }),

  // Snow Load Lookup
  snowLoad: router({
    lookup: publicProcedure
      .input(z.object({ address: z.string().min(1) }))
      .mutation(async ({ input }) => {
        try {
          // Step 1: Geocode address to lat/lng using Manus Maps proxy
          const { makeRequest } = await import("./_core/map");
          const geocodeResult = await makeRequest<any>(
            "/maps/api/geocode/json",
            { address: input.address }
          );

          if (!geocodeResult.results || geocodeResult.results.length === 0) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Address not found. Please enter a valid Utah address.",
            });
          }

          const location = geocodeResult.results[0].geometry.location;
          const lat = location.lat;
          const lng = location.lng;

          // Step 2: Look up snow load from USU matrix
          const { lookupSnowLoadPsf } = await import("./snowLoad");
          const snowLoadPsf = await lookupSnowLoadPsf(lat, lng);

          return {
            snowLoadPsf,
            address: geocodeResult.results[0].formatted_address,
            lat,
            lng,
          };
        } catch (err: any) {
          if (err instanceof TRPCError) throw err;
          console.error("[SnowLoad] Lookup error:", err);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: err?.message?.includes("outside Utah")
              ? "This address appears to be outside Utah. Snow load data is only available for Utah locations."
              : "Snow load lookup failed. Please check the address and try again.",
          });
        }
      }),
  }),

  // ─── Project Management ──────────────────────────────────────────────────────
  projects: router({
    getAll: adminProcedure
      .input(z.object({
        status: z.string().optional(), // filter by projectStatus
        assignedUserId: z.number().optional(),
      }).optional())
      .query(async ({ input }) => {
        const drizzle = await db.getDb();
        if (!drizzle) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        const { signRequests } = await import("../drizzle/schema");
        const { desc: descOrd, eq: eqOp, and, or, isNotNull } = await import("drizzle-orm");
        let query = drizzle.select().from(signRequests).$dynamic();
        const conditions: any[] = [];
        if (input?.status) {
          conditions.push(eq(signRequests.projectStatus, input.status));
        }
        if (input?.assignedUserId) {
          conditions.push(eq(signRequests.assignedUserId, input.assignedUserId));
        }
        if (conditions.length > 0) {
          query = query.where(and(...conditions));
        }
        const rows = await query.orderBy(descOrd(signRequests.createdAt));
        return rows;
      }),

    updateProject: adminProcedure
      .input(z.object({
        id: z.number(),
        projectStatus: z.string().optional(),
        projectNotes: z.string().optional(),
        materialSnapshot: z.object({
          deckingPieces: z.number().optional(),
          deckingBoards: z.number().optional(),
          edgeLinearFt: z.number().optional(),
          edgeTrimPieces: z.number().optional(),
          railingLf: z.number().optional(),
          railingStyle: z.string().optional(),
          concreteWork: z.string().optional(),
          demoWork: z.string().optional(),
          lumberPackageCost: z.number().optional(),
          lumberPackageItems: z.array(z.object({ name: z.string(), qty: z.number(), cost: z.number() })).optional(),
          planDetails: z.string().optional(),
          stairRuns: z.array(z.object({ stairType: z.string(), treads: z.number(), lf: z.number() })).optional(),
          postWrapOptionName: z.string().optional(),
          postWrapPostPieces: z.array(z.object({ lengthFt: z.number(), count: z.number() })).optional(),
          postWrapBeamPieces: z.array(z.object({ lengthFt: z.number(), count: z.number() })).optional(),
          postWrapMaterialCost: z.number().optional(),
          postWrapLaborCost: z.number().optional(),
          postWrapTotalCost: z.number().optional(),
        }).optional(),
      }))
      .mutation(async ({ input }) => {
        const drizzle = await db.getDb();
        if (!drizzle) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        const { signRequests } = await import("../drizzle/schema");
        
        const updateData: any = {};
        if (input.projectStatus !== undefined) updateData.projectStatus = input.projectStatus;
        if (input.projectNotes !== undefined) updateData.projectNotes = input.projectNotes;
        if (input.materialSnapshot !== undefined) updateData.materialSnapshot = input.materialSnapshot;
        if (Object.keys(updateData).length === 0) return { success: true };
        await drizzle.update(signRequests).set(updateData).where(eq(signRequests.id, input.id));
        return { success: true };
      }),

    deletePhoto: adminProcedure
      .input(z.object({ id: z.number(), photoUrl: z.string() }))
      .mutation(async ({ input }) => {
        const drizzle = await db.getDb();
        if (!drizzle) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        const { signRequests } = await import("../drizzle/schema");
        
        const rows = await drizzle.select({ projectPhotos: signRequests.projectPhotos }).from(signRequests).where(eq(signRequests.id, input.id)).limit(1);
        if (!rows.length) throw new TRPCError({ code: "NOT_FOUND" });
        const existing = (rows[0].projectPhotos as string[]) || [];
        const updated = existing.filter((u) => u !== input.photoUrl);
        await drizzle.update(signRequests).set({ projectPhotos: updated }).where(eq(signRequests.id, input.id));
        return { success: true, photos: updated };
      }),

    uploadPhoto: adminProcedure
      .input(z.object({
        id: z.number(),
        fileBase64: z.string(),
        mimeType: z.string(),
      }))
      .mutation(async ({ input }) => {
        const drizzle = await db.getDb();
        if (!drizzle) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        const { signRequests } = await import("../drizzle/schema");
        
        const { storagePut } = await import("./storage");
        const buffer = Buffer.from(input.fileBase64, "base64");
        const ext = input.mimeType.split("/")[1]?.replace("jpeg", "jpg") || "jpg";
        const randomSuffix = Math.random().toString(36).slice(2, 10);
        const fileKey = `project-photos/${input.id}/${randomSuffix}.${ext}`;
        const { url } = await storagePut(fileKey, buffer, input.mimeType);
        const rows = await drizzle.select({ projectPhotos: signRequests.projectPhotos }).from(signRequests).where(eq(signRequests.id, input.id)).limit(1);
        if (!rows.length) throw new TRPCError({ code: "NOT_FOUND" });
        const existing = (rows[0].projectPhotos as string[]) || [];
        const updated = [...existing, url];
        await drizzle.update(signRequests).set({ projectPhotos: updated }).where(eq(signRequests.id, input.id));
        return { success: true, url, photos: updated };
      }),
  }),

  // ─── Frost Footing Admin ────────────────────────────────────────────────────
  frostFooting: router({
    // Get all pricing rows (for admin panel)
    getPricing: adminProcedure.query(async () => {
      return await db.getAllFrostFootingPricing();
    }),

    // Update a pricing row (cost/margin/price)
    updatePricing: adminProcedure
      .input(z.object({
        id: z.number(),
        costPerUnit: z.string().optional(),
        marginPct: z.string().optional(),
        pricePerUnit: z.string().optional(),
        isActive: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateFrostFootingPricing(id, data);
        return { success: true };
      }),

    // Get all formula settings
    getFormulas: adminProcedure.query(async () => {
      return await db.getAllFrostFootingFormulas();
    }),

    // Update a formula value
    updateFormula: adminProcedure
      .input(z.object({ id: z.number(), value: z.string() }))
      .mutation(async ({ input }) => {
        await db.updateFrostFootingFormula(input.id, input.value);
        return { success: true };
      }),

    // Get all size lookup rows (for the reference table in admin)
    getSizes: adminProcedure.query(async () => {
      return await db.getAllFrostFootingSizes();
    }),

    // Public: look up footing sizes + pricing for a given joist length and post spacing
    // Used by the calculator to auto-calculate footing costs
    calculate: publicProcedure
      .input(z.object({
        joistLengthFt: z.number(),
        postSpacingFt: z.number(),
        deckWidthFt: z.number(),
      }))
      .query(async ({ input }) => {
        const { joistLengthFt, postSpacingFt, deckWidthFt } = input;

        // Get formula settings
        const formulas = await db.getAllFrostFootingFormulas();
        const formulaMap = Object.fromEntries(formulas.map(f => [f.key, f.value]));
        const diameterCol = parseInt(formulaMap["diameter_column"] ?? "2") as 1 | 2 | 3;

        // Look up footing sizes
        const { corner, intermediate } = await db.lookupFrostFootingSize(joistLengthFt, postSpacingFt);
        if (!corner || !intermediate) return null;

        // Determine diameters
        const cornerDiameter = diameterCol === 1 ? corner.diameterIn1 : diameterCol === 2 ? corner.diameterIn2 : corner.diameterIn3;
        const intermediateDiameter = diameterCol === 1 ? intermediate.diameterIn1 : diameterCol === 2 ? intermediate.diameterIn2 : intermediate.diameterIn3;

        // Calculate post count
        const postCount = Math.ceil(deckWidthFt / postSpacingFt) + 1;
        const cornerCount = 4;
        const intermediateCount = Math.max(0, postCount - 2);

        // Get pricing for these diameters
        const allPricing = await db.getAllFrostFootingPricing();
        const pricingMap = Object.fromEntries(allPricing.map(p => [p.diameterIn, Number(p.pricePerUnit)]));

        const cornerPriceEach = pricingMap[cornerDiameter] ?? 0;
        const intermediatePriceEach = pricingMap[intermediateDiameter] ?? 0;

        const cornerTotal = cornerCount * cornerPriceEach;
        const intermediateTotal = intermediateCount * intermediatePriceEach;
        const totalCost = cornerTotal + intermediateTotal;

        return {
          joistLengthFt,
          postSpacingFt,
          postCount,
          cornerCount,
          intermediateCount,
          cornerDiameterIn: cornerDiameter,
          intermediateDiameterIn: intermediateDiameter,
          cornerPriceEach,
          intermediatePriceEach,
          cornerTotal,
          intermediateTotal,
          totalCost,
          diameterColumn: diameterCol,
        };
      }),
  }),

  // ─── Install Slots ────────────────────────────────────────────────────────
  installSlots: router({
    /** Public: get available slots for the calculator urgency banner */
    getAvailable: publicProcedure.query(async () => {
      return db.getAvailableInstallSlots();
    }),

    /** Admin: get all slots (including booked/hidden) */
    getAll: adminProcedure.query(async () => {
      return db.getInstallSlots();
    }),

    /** Admin: create a new install slot */
    create: adminProcedure
      .input(z.object({
        label: z.string().min(1),
        startDate: z.string(),
        endDate: z.string(),
        isAvailable: z.number().int().min(0).max(1).default(1),
        sortOrder: z.number().int().default(0),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createInstallSlot(input);
        return { success: true, id };
      }),

    /** Admin: update an install slot */
    update: adminProcedure
      .input(z.object({
        id: z.number().int(),
        label: z.string().min(1).optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        isAvailable: z.number().int().min(0).max(1).optional(),
        sortOrder: z.number().int().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateInstallSlot(id, data);
        return { success: true };
      }),

    /** Admin: delete an install slot */
    delete: adminProcedure
      .input(z.object({ id: z.number().int() }))
      .mutation(async ({ input }) => {
        await db.deleteInstallSlot(input.id);
        return { success: true };
      }),
  }),

  // --- Design Package Items ---
  designPackage: router({
    getAll: adminProcedure.query(async () => {
      return await db.getAllDesignPackageItems();
    }),
    create: adminProcedure
      .input(z.object({
        name: z.string().min(1),
        subtitle: z.string().optional().default(''),
        description: z.string().optional().default(''),
        pricingType: z.enum(['sqft', 'flat', 'rendering']),
        costPerSqft: z.number().min(0).default(0),
        flatCost: z.number().min(0).default(0),
        markupPct: z.number().min(0).default(50),
        projectTypes: z.string().default('all'),
        renderingType: z.enum(['small_bathroom', 'large_bathroom', 'kitchen', 'exterior']).nullable().optional(),
        isActive: z.number().min(0).max(1).default(1),
        isDefaultEnabled: z.number().min(0).max(1).default(1),
        designHours: z.number().min(0).default(0),
        sortOrder: z.number().default(0),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createDesignPackageItem({
          name: input.name,
          subtitle: input.subtitle ?? '',
          description: input.description ?? '',
          pricingType: input.pricingType,
          costPerSqft: String(input.costPerSqft),
          flatCost: String(input.flatCost),
          markupPct: String(input.markupPct),
          projectTypes: input.projectTypes,
          renderingType: input.renderingType ?? null,
          isActive: input.isActive,
          isDefaultEnabled: input.isDefaultEnabled,
          designHours: String(input.designHours),
          sortOrder: input.sortOrder,
        });
        return { id };
      }),
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        subtitle: z.string().optional(),
        description: z.string().optional(),
        pricingType: z.enum(['sqft', 'flat', 'rendering']).optional(),
        costPerSqft: z.number().min(0).optional(),
        flatCost: z.number().min(0).optional(),
        markupPct: z.number().min(0).optional(),
        projectTypes: z.string().optional(),
        renderingType: z.enum(['small_bathroom', 'large_bathroom', 'kitchen', 'exterior']).nullable().optional(),
        isActive: z.number().min(0).max(1).optional(),
        isDefaultEnabled: z.number().min(0).max(1).optional(),
        designHours: z.number().min(0).optional(),
        sortOrder: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateDesignPackageItem(id, {
          ...(data.name !== undefined ? { name: data.name } : {}),
          ...(data.subtitle !== undefined ? { subtitle: data.subtitle } : {}),
          ...(data.description !== undefined ? { description: data.description } : {}),
          ...(data.pricingType !== undefined ? { pricingType: data.pricingType } : {}),
          ...(data.costPerSqft !== undefined ? { costPerSqft: String(data.costPerSqft) } : {}),
          ...(data.flatCost !== undefined ? { flatCost: String(data.flatCost) } : {}),
          ...(data.markupPct !== undefined ? { markupPct: String(data.markupPct) } : {}),
          ...(data.projectTypes !== undefined ? { projectTypes: data.projectTypes } : {}),
          ...(data.renderingType !== undefined ? { renderingType: data.renderingType } : {}),
          ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
          ...(data.isDefaultEnabled !== undefined ? { isDefaultEnabled: data.isDefaultEnabled } : {}),
          ...(data.designHours !== undefined ? { designHours: String(data.designHours) } : {}),
          ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
        });
        return { success: true };
      }),
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteDesignPackageItem(input.id);
        return { success: true };
      }),
    // Commission management
    getCommission: adminProcedure.query(async () => {
      return await db.getAllDesignPackageCommission();
    }),
    updateCommission: adminProcedure
      .input(z.object({
        projectType: z.enum(['addition', 'full_home_remodel', 'kitchen', 'bathroom', 'basement', 'feasibility_study']),
        label: z.string().min(1),
        commissionAmount: z.number().min(0),
      }))
      .mutation(async ({ input }) => {
        await db.upsertDesignPackageCommission(input.projectType, input.label, input.commissionAmount);
        return { success: true };
      }),
    seedCommission: adminProcedure.mutation(async () => {
      await db.seedDesignPackageCommission();
      return { success: true };
    }),
    // Discount management
    getDiscounts: adminProcedure.query(async () => {
      return await db.getAllDesignPackageDiscounts();
    }),
    updateDiscount: adminProcedure
      .input(z.object({
        discountType: z.enum(['early_bird', 'same_day']),
        name: z.string().min(1).optional(),
        discountPct: z.number().min(0).max(100).optional(),
        isActive: z.number().min(0).max(1).optional(),
      }))
      .mutation(async ({ input }) => {
        await db.upsertDesignPackageDiscount(input.discountType, {
          name: input.name,
          discountPct: input.discountPct,
          isActive: input.isActive,
        });
        return { success: true };
      }),

    // ── Free Features ──────────────────────────────────────────────────────
    getAllFreeFeatures: publicProcedure.query(async () => {
      return await db.getAllDpFreeFeatures();
    }),
    createFreeFeature: adminProcedure
      .input(z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        photoUrl: z.string().optional(),
        listPrice: z.number().min(0),
        isActive: z.number().min(0).max(1).optional(),
        projectTypes: z.string().optional().default('all'),
        sortOrder: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        return await db.createDpFreeFeature(input);
      }),
    updateFreeFeature: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        photoUrl: z.string().optional(),
        listPrice: z.number().min(0).optional(),
        isActive: z.number().min(0).max(1).optional(),
        projectTypes: z.string().optional(),
        sortOrder: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateDpFreeFeature(id, data);
        return { success: true };
      }),
    deleteFreeFeature: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteDpFreeFeature(input.id);
        return { success: true };
      }),

    // ── Questionnaire ──────────────────────────────────────────────────────
    getAllQuestions: publicProcedure.query(async () => {
      return await db.getAllDpQuestions();
    }),
    createQuestion: adminProcedure
      .input(z.object({
        question: z.string().min(1),
        questionType: z.enum(['single_choice', 'multi_choice', 'number', 'text']).optional(),
        options: z.string().optional(), // JSON string
        isActive: z.number().min(0).max(1).optional(),
        sortOrder: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        return await db.createDpQuestion(input);
      }),
    updateQuestion: adminProcedure
      .input(z.object({
        id: z.number(),
        question: z.string().min(1).optional(),
        questionType: z.enum(['single_choice', 'multi_choice', 'number', 'text']).optional(),
        options: z.string().optional(), // JSON string
        isActive: z.number().min(0).max(1).optional(),
        sortOrder: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateDpQuestion(id, data);
        return { success: true };
      }),
    deleteQuestion: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteDpQuestion(input.id);
        return { success: true };
      }),

    // ─── Project Type Section Config ───────────────────────────────────────
    getAllSections: publicProcedure.query(async () => {
      return await db.getAllDpProjectTypeSections();
    }),
    getSectionsByType: publicProcedure
      .input(z.object({ projectType: z.string() }))
      .query(async ({ input }) => {
        return await db.getDpProjectTypeSectionsByType(input.projectType);
      }),
    updateSection: adminProcedure
      .input(z.object({
        id: z.number(),
        sectionLabel: z.string().optional(),
        isEnabled: z.number().min(0).max(1).optional(),
        sortOrder: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateDpProjectTypeSection(id, data);
        return { success: true };
      }),
    resetSections: adminProcedure.mutation(async () => {
      await db.resetDpProjectTypeSections();
      return { success: true };
    }),
    // ─── Reorder batch updates ─────────────────────────────────────────────
    reorderItems: adminProcedure
      .input(z.array(z.object({ id: z.number(), sortOrder: z.number() })))
      .mutation(async ({ input }) => {
        await Promise.all(input.map(({ id, sortOrder }) =>
          db.updateDesignPackageItem(id, { sortOrder })
        ));
        return { success: true };
      }),
    reorderFreeFeatures: adminProcedure
      .input(z.array(z.object({ id: z.number(), sortOrder: z.number() })))
      .mutation(async ({ input }) => {
        await Promise.all(input.map(({ id, sortOrder }) =>
          db.updateDpFreeFeature(id, { sortOrder })
        ));
        return { success: true };
      }),
    reorderQuestions: adminProcedure
      .input(z.array(z.object({ id: z.number(), sortOrder: z.number() })))
      .mutation(async ({ input }) => {
        await Promise.all(input.map(({ id, sortOrder }) =>
          db.updateDpQuestion(id, { sortOrder })
        ));
        return { success: true };
      }),
    reorderSections: adminProcedure
      .input(z.array(z.object({ id: z.number(), sortOrder: z.number() })))
      .mutation(async ({ input }) => {
        await Promise.all(input.map(({ id, sortOrder }) =>
          db.updateDpProjectTypeSection(id, { sortOrder })
        ));
        return { success: true };
      }),

    // Upload a photo for a Parade Stopper and save the S3 URL to its photoUrl field
    uploadParadeStopperPhoto: adminProcedure
      .input(z.object({
        id: z.number(),
        fileBase64: z.string(),
        mimeType: z.string(),
      }))
      .mutation(async ({ input }) => {
        const drizzle = await db.getDb();
        if (!drizzle) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        const { dpFreeFeatures } = await import("../drizzle/schema");
        
        const { storagePut } = await import("./storage");
        const buffer = Buffer.from(input.fileBase64, "base64");
        const ext = input.mimeType.split("/")[1]?.replace("jpeg", "jpg") || "jpg";
        const randomSuffix = Math.random().toString(36).slice(2, 10);
        const fileKey = `parade-stoppers/${input.id}/${randomSuffix}.${ext}`;
        const { url } = await storagePut(fileKey, buffer, input.mimeType);
        await drizzle.update(dpFreeFeatures).set({ photoUrl: url }).where(eq(dpFreeFeatures.id, input.id));
        return { success: true, url };
      }),

    // Remove the photo from a Parade Stopper (clears photoUrl to null)
    removeParadeStopperPhoto: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const drizzle = await db.getDb();
        if (!drizzle) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        const { dpFreeFeatures } = await import("../drizzle/schema");
        
        await drizzle.update(dpFreeFeatures).set({ photoUrl: null }).where(eq(dpFreeFeatures.id, input.id));
        return { success: true };
      }),

    // Feasibility Study config (admin-editable price, description, tags)
    /** Get the first (default) feasibility config — backward compat for calculator */
    getFeasibilityConfig: publicProcedure.query(async () => {
      const drizzle = await db.getDb();
      if (!drizzle) return null;
      const { dpFeasibilityConfig } = await import("../drizzle/schema");
      const rows = await drizzle.select().from(dpFeasibilityConfig).orderBy(dpFeasibilityConfig.sortOrder).limit(1);
      return rows[0] ?? null;
    }),
    /** Get ALL feasibility configs (for admin and calculator selection) */
    getAllFeasibilityConfigs: publicProcedure.query(async () => {
      const drizzle = await db.getDb();
      if (!drizzle) return [];
      const { dpFeasibilityConfig } = await import("../drizzle/schema");
      return drizzle.select().from(dpFeasibilityConfig).orderBy(dpFeasibilityConfig.sortOrder);
    }),
    /** Create a new feasibility config */
    createFeasibilityConfig: adminProcedure
      .input(z.object({
        name: z.string().min(1),
        price: z.number().min(0),
        repCommission: z.number().min(0),
        drafterCost: z.number().min(0),
        description: z.string().min(1),
        tags: z.string(),
        sortOrder: z.number().default(0),
        isActive: z.boolean().default(true),
      }))
      .mutation(async ({ input }) => {
        const drizzle = await db.getDb();
        if (!drizzle) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        const { dpFeasibilityConfig } = await import("../drizzle/schema");
        const result = await drizzle.insert(dpFeasibilityConfig).values({
          name: input.name,
          price: String(input.price),
          repCommission: String(input.repCommission),
          drafterCost: String(input.drafterCost),
          description: input.description,
          tags: input.tags,
          sortOrder: input.sortOrder,
          isActive: input.isActive,
        });
        return { success: true, id: Number(result[0].insertId) };
      }),
    /** Update an existing feasibility config by id */
    updateFeasibilityConfig: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        price: z.number().min(0).optional(),
        repCommission: z.number().min(0).optional(),
        drafterCost: z.number().min(0).optional(),
        description: z.string().min(1).optional(),
        tags: z.string().optional(),
        sortOrder: z.number().optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const drizzle = await db.getDb();
        if (!drizzle) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        const { dpFeasibilityConfig } = await import("../drizzle/schema");
        
        const updateData: Record<string, any> = {};
        if (input.name !== undefined) updateData.name = input.name;
        if (input.price !== undefined) updateData.price = String(input.price);
        if (input.repCommission !== undefined) updateData.repCommission = String(input.repCommission);
        if (input.drafterCost !== undefined) updateData.drafterCost = String(input.drafterCost);
        if (input.description !== undefined) updateData.description = input.description;
        if (input.tags !== undefined) updateData.tags = input.tags;
        if (input.sortOrder !== undefined) updateData.sortOrder = input.sortOrder;
        if (input.isActive !== undefined) updateData.isActive = input.isActive;
        await drizzle.update(dpFeasibilityConfig).set(updateData).where(eq(dpFeasibilityConfig.id, input.id));
        return { success: true };
      }),
    /** Delete a feasibility config by id */
    deleteFeasibilityConfig: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const drizzle = await db.getDb();
        if (!drizzle) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        const { dpFeasibilityConfig } = await import("../drizzle/schema");
        
        await drizzle.delete(dpFeasibilityConfig).where(eq(dpFeasibilityConfig.id, input.id));
        return { success: true };
      }),

    // Engineer's Letter config (admin-editable price, description)
    /** Get the engineer's letter config for the basement calculator */
    getEngineerLetterConfig: publicProcedure.query(async () => {
      const drizzle = await db.getDb();
      if (!drizzle) return null;
      const { dpEngineerLetterConfig } = await import("../drizzle/schema");
      const rows = await drizzle.select().from(dpEngineerLetterConfig).limit(1);
      return rows[0] ?? null;
    }),
    /** Update the engineer's letter config */
    updateEngineerLetterConfig: adminProcedure
      .input(z.object({
        id: z.number(),
        price: z.number().min(0).optional(),
        internalCost: z.number().min(0).optional(),
        description: z.string().min(1).optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const drizzle = await db.getDb();
        if (!drizzle) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        const { dpEngineerLetterConfig } = await import("../drizzle/schema");
        
        const updateData: Record<string, any> = {};
        if (input.price !== undefined) updateData.price = String(input.price);
        if (input.internalCost !== undefined) updateData.internalCost = String(input.internalCost);
        if (input.description !== undefined) updateData.description = input.description;
        if (input.isActive !== undefined) updateData.isActive = input.isActive;
        await drizzle.update(dpEngineerLetterConfig).set(updateData).where(eq(dpEngineerLetterConfig.id, input.id));
        return { success: true };
      }),

    // ── Bathroom Remodel Procedures ──────────────────────────────────────────

    getBathroomConfig: publicProcedure.query(async () => {
      const drizzle = await db.getDb();
      if (!drizzle) return null;
      const { dpBathroomConfig } = await import("../drizzle/schema");
      const rows = await drizzle.select().from(dpBathroomConfig).limit(1);
      if (rows.length === 0) {
        await drizzle.insert(dpBathroomConfig).values({});
        const newRows = await drizzle.select().from(dpBathroomConfig).limit(1);
        return newRows[0];
      }
      return rows[0];
    }),

    updateBathroomConfig: adminProcedure
      .input(z.object({
        id: z.number(),
        description: z.string().optional(),
        markupPct: z.number().min(0).max(1).optional(),
        repCommission: z.number().min(0).optional(),
        dpArchEngineeringCost: z.number().min(0).optional(),
        dp3dRenderingsCost: z.number().min(0).optional(),
        dpPlumbingSchematicCost: z.number().min(0).optional(),
        dpElectricalSchematicCost: z.number().min(0).optional(),
        dpMaterialSelectionsCost: z.number().min(0).optional(),
      }))
      .mutation(async ({ input }) => {
        const drizzle = await db.getDb();
        if (!drizzle) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        const { dpBathroomConfig } = await import("../drizzle/schema");
        
        const { id, ...fields } = input;
        const updateData: Record<string, unknown> = {};
        if (fields.markupPct !== undefined) updateData.markupPct = String(fields.markupPct);
        if (fields.repCommission !== undefined) updateData.repCommission = String(fields.repCommission);
        if (fields.dpArchEngineeringCost !== undefined) updateData.dpArchEngineeringCost = String(fields.dpArchEngineeringCost);
        if (fields.dp3dRenderingsCost !== undefined) updateData.dp3dRenderingsCost = String(fields.dp3dRenderingsCost);
        if (fields.dpPlumbingSchematicCost !== undefined) updateData.dpPlumbingSchematicCost = String(fields.dpPlumbingSchematicCost);
        if (fields.dpElectricalSchematicCost !== undefined) updateData.dpElectricalSchematicCost = String(fields.dpElectricalSchematicCost);
        if (fields.dpMaterialSelectionsCost !== undefined) updateData.dpMaterialSelectionsCost = String(fields.dpMaterialSelectionsCost);
        await drizzle.update(dpBathroomConfig).set(updateData).where(eq(dpBathroomConfig.id, id));
        return { success: true };
      }),

    getBathroomSizeTiers: publicProcedure.query(async () => {
      const drizzle = await db.getDb();
      if (!drizzle) return [];
      const { dpBathroomSizeTiers } = await import("../drizzle/schema");
      return drizzle.select().from(dpBathroomSizeTiers).orderBy(dpBathroomSizeTiers.sortOrder);
    }),

    updateBathroomSizeTier: adminProcedure
      .input(z.object({
        id: z.number(),
        label: z.string().optional(),
        description: z.string().optional(),
        sqftRange: z.string().optional(),
        baseCost: z.number().min(0).optional(),
        costPerSqft: z.number().min(0).optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const drizzle = await db.getDb();
        if (!drizzle) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        const { dpBathroomSizeTiers } = await import("../drizzle/schema");
        
        const { id, ...fields } = input;
        const updateData: Record<string, unknown> = {};
        if (fields.label !== undefined) updateData.label = fields.label;
        if (fields.description !== undefined) updateData.description = fields.description;
        if (fields.sqftRange !== undefined) updateData.sqftRange = fields.sqftRange;
        if (fields.baseCost !== undefined) updateData.baseCost = String(fields.baseCost);
        if (fields.costPerSqft !== undefined) updateData.costPerSqft = String(fields.costPerSqft);
        if (fields.isActive !== undefined) updateData.isActive = fields.isActive;
        await drizzle.update(dpBathroomSizeTiers).set(updateData).where(eq(dpBathroomSizeTiers.id, id));
        return { success: true };
      }),

    getBathroomPlumbingItems: publicProcedure.query(async () => {
      const drizzle = await db.getDb();
      if (!drizzle) return [];
      const { dpBathroomPlumbingItems } = await import("../drizzle/schema");
      return drizzle.select().from(dpBathroomPlumbingItems).orderBy(dpBathroomPlumbingItems.sortOrder);
    }),

    updateBathroomPlumbingItem: adminProcedure
      .input(z.object({
        id: z.number(),
        label: z.string().optional(),
        description: z.string().optional(),
        cost: z.number().min(0).optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const drizzle = await db.getDb();
        if (!drizzle) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        const { dpBathroomPlumbingItems } = await import("../drizzle/schema");
        
        const { id, ...fields } = input;
        const updateData: Record<string, unknown> = {};
        if (fields.label !== undefined) updateData.label = fields.label;
        if (fields.description !== undefined) updateData.description = fields.description;
        if (fields.cost !== undefined) updateData.cost = String(fields.cost);
        if (fields.isActive !== undefined) updateData.isActive = fields.isActive;
        await drizzle.update(dpBathroomPlumbingItems).set(updateData).where(eq(dpBathroomPlumbingItems.id, id));
        return { success: true };
      }),

    getBathroomElectricalOptions: publicProcedure.query(async () => {
      const drizzle = await db.getDb();
      if (!drizzle) return [];
      const { dpBathroomElectricalOptions } = await import("../drizzle/schema");
      return drizzle.select().from(dpBathroomElectricalOptions).orderBy(dpBathroomElectricalOptions.sortOrder);
    }),

    updateBathroomElectricalOption: adminProcedure
      .input(z.object({
        id: z.number(),
        label: z.string().optional(),
        description: z.string().optional(),
        cost: z.number().min(0).optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const drizzle = await db.getDb();
        if (!drizzle) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        const { dpBathroomElectricalOptions } = await import("../drizzle/schema");
        
        const { id, ...fields } = input;
        const updateData: Record<string, unknown> = {};
        if (fields.label !== undefined) updateData.label = fields.label;
        if (fields.description !== undefined) updateData.description = fields.description;
        if (fields.cost !== undefined) updateData.cost = String(fields.cost);
        if (fields.isActive !== undefined) updateData.isActive = fields.isActive;
        await drizzle.update(dpBathroomElectricalOptions).set(updateData).where(eq(dpBathroomElectricalOptions.id, id));
        return { success: true };
      }),

    getBathroomHvacOptions: publicProcedure.query(async () => {
      const drizzle = await db.getDb();
      if (!drizzle) return [];
      const { dpBathroomHvacOptions } = await import("../drizzle/schema");
      return drizzle.select().from(dpBathroomHvacOptions).orderBy(dpBathroomHvacOptions.sortOrder);
    }),

    updateBathroomHvacOption: adminProcedure
      .input(z.object({
        id: z.number(),
        label: z.string().optional(),
        description: z.string().optional(),
        cost: z.number().min(0).optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const drizzle = await db.getDb();
        if (!drizzle) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        const { dpBathroomHvacOptions } = await import("../drizzle/schema");
        
        const { id, ...fields } = input;
        const updateData: Record<string, unknown> = {};
        if (fields.label !== undefined) updateData.label = fields.label;
        if (fields.description !== undefined) updateData.description = fields.description;
        if (fields.cost !== undefined) updateData.cost = String(fields.cost);
        if (fields.isActive !== undefined) updateData.isActive = fields.isActive;
        await drizzle.update(dpBathroomHvacOptions).set(updateData).where(eq(dpBathroomHvacOptions.id, id));
        return { success: true };
      }),

    getBathroomFinishTiers: publicProcedure.query(async () => {
      const drizzle = await db.getDb();
      if (!drizzle) return [];
      const { dpBathroomFinishTiers } = await import("../drizzle/schema");
      return drizzle.select().from(dpBathroomFinishTiers).orderBy(dpBathroomFinishTiers.sortOrder);
    }),

    updateBathroomFinishTier: adminProcedure
      .input(z.object({
        id: z.number(),
        label: z.string().optional(),
        description: z.string().optional(),
        costPerSqft: z.number().min(0).optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const drizzle = await db.getDb();
        if (!drizzle) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        const { dpBathroomFinishTiers } = await import("../drizzle/schema");
        
        const { id, ...fields } = input;
        const updateData: Record<string, unknown> = {};
        if (fields.label !== undefined) updateData.label = fields.label;
        if (fields.description !== undefined) updateData.description = fields.description;
        if (fields.costPerSqft !== undefined) updateData.costPerSqft = String(fields.costPerSqft);
        if (fields.isActive !== undefined) updateData.isActive = fields.isActive;
        await drizzle.update(dpBathroomFinishTiers).set(updateData).where(eq(dpBathroomFinishTiers.id, id));
        return { success: true };
      }),

    getBathroomAddons: publicProcedure.query(async () => {
      const drizzle = await db.getDb();
      if (!drizzle) return [];
      const { dpBathroomAddons } = await import("../drizzle/schema");
      return drizzle.select().from(dpBathroomAddons).orderBy(dpBathroomAddons.sortOrder);
    }),

    updateBathroomAddon: adminProcedure
      .input(z.object({
        id: z.number(),
        label: z.string().optional(),
        description: z.string().optional(),
        cost: z.number().min(0).optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const drizzle = await db.getDb();
        if (!drizzle) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        const { dpBathroomAddons } = await import("../drizzle/schema");
        
        const { id, ...fields } = input;
        const updateData: Record<string, unknown> = {};
        if (fields.label !== undefined) updateData.label = fields.label;
        if (fields.description !== undefined) updateData.description = fields.description;
        if (fields.cost !== undefined) updateData.cost = String(fields.cost);
        if (fields.isActive !== undefined) updateData.isActive = fields.isActive;
        await drizzle.update(dpBathroomAddons).set(updateData).where(eq(dpBathroomAddons.id, id));
        return { success: true };
      }),

    // ─── Bathroom Material: Shower Surround ────────────────────────────────
    getBathroomShowerSurround: publicProcedure.query(async () => {
      const drizzle = await db.getDb();
      if (!drizzle) return [];
      const { dpBathroomShowerSurround } = await import("../drizzle/schema");
      return drizzle.select().from(dpBathroomShowerSurround).orderBy(dpBathroomShowerSurround.sortOrder);
    }),
    updateBathroomShowerSurround: adminProcedure
      .input(z.object({
        id: z.number(),
        flatCost: z.number().optional(),
        costPerSqft: z.number().optional(),
        label: z.string().optional(),
        description: z.string().optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const drizzle = await db.getDb();
        if (!drizzle) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        
        const { id, ...rest } = input;
        const updateData: Record<string, unknown> = {};
        if (rest.flatCost !== undefined) updateData.flatCost = rest.flatCost.toFixed(2);
        if (rest.costPerSqft !== undefined) updateData.costPerSqft = rest.costPerSqft.toFixed(2);
        if (rest.label !== undefined) updateData.label = rest.label;
        if (rest.description !== undefined) updateData.description = rest.description;
        if (rest.isActive !== undefined) updateData.isActive = rest.isActive;
        const { dpBathroomShowerSurround } = await import("../drizzle/schema");
        await drizzle.update(dpBathroomShowerSurround).set(updateData).where(eq(dpBathroomShowerSurround.id, id));
        return { success: true };
      }),

    // ─── Bathroom Material: Vanity ───────────────────────────────────────────
    getBathroomVanity: publicProcedure.query(async () => {
      const drizzle = await db.getDb();
      if (!drizzle) return [];
      const { dpBathroomVanity } = await import("../drizzle/schema");
      return drizzle.select().from(dpBathroomVanity).orderBy(dpBathroomVanity.sortOrder);
    }),
    updateBathroomVanity: adminProcedure
      .input(z.object({
        id: z.number(),
        flatCost: z.number().optional(),
        costPerLinearFt: z.number().optional(),
        label: z.string().optional(),
        description: z.string().optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const drizzle = await db.getDb();
        if (!drizzle) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        
        const { id, ...rest } = input;
        const updateData: Record<string, unknown> = {};
        if (rest.flatCost !== undefined) updateData.flatCost = rest.flatCost.toFixed(2);
        if (rest.costPerLinearFt !== undefined) updateData.costPerLinearFt = rest.costPerLinearFt.toFixed(2);
        if (rest.label !== undefined) updateData.label = rest.label;
        if (rest.description !== undefined) updateData.description = rest.description;
        if (rest.isActive !== undefined) updateData.isActive = rest.isActive;
        const { dpBathroomVanity } = await import("../drizzle/schema");
        await drizzle.update(dpBathroomVanity).set(updateData).where(eq(dpBathroomVanity.id, id));
        return { success: true };
      }),

    // ─── Bathroom Material: Flooring ─────────────────────────────────────────
    getBathroomFlooring: publicProcedure.query(async () => {
      const drizzle = await db.getDb();
      if (!drizzle) return [];
      const { dpBathroomFlooring } = await import("../drizzle/schema");
      return drizzle.select().from(dpBathroomFlooring).orderBy(dpBathroomFlooring.sortOrder);
    }),
    updateBathroomFlooring: adminProcedure
      .input(z.object({
        id: z.number(),
        costPerSqft: z.number().optional(),
        label: z.string().optional(),
        description: z.string().optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const drizzle = await db.getDb();
        if (!drizzle) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        
        const { id, ...rest } = input;
        const updateData: Record<string, unknown> = {};
        if (rest.costPerSqft !== undefined) updateData.costPerSqft = rest.costPerSqft.toFixed(2);
        if (rest.label !== undefined) updateData.label = rest.label;
        if (rest.description !== undefined) updateData.description = rest.description;
        if (rest.isActive !== undefined) updateData.isActive = rest.isActive;
        const { dpBathroomFlooring } = await import("../drizzle/schema");
        await drizzle.update(dpBathroomFlooring).set(updateData).where(eq(dpBathroomFlooring.id, id));
        return { success: true };
      }),

    // ─── Bathroom Material: Countertop ───────────────────────────────────────
    getBathroomCountertop: publicProcedure.query(async () => {
      const drizzle = await db.getDb();
      if (!drizzle) return [];
      const { dpBathroomCountertop } = await import("../drizzle/schema");
      return drizzle.select().from(dpBathroomCountertop).orderBy(dpBathroomCountertop.sortOrder);
    }),
    updateBathroomCountertop: adminProcedure
      .input(z.object({
        id: z.number(),
        costPerSqft: z.number().optional(),
        label: z.string().optional(),
        description: z.string().optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const drizzle = await db.getDb();
        if (!drizzle) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        
        const { id, ...rest } = input;
        const updateData: Record<string, unknown> = {};
        if (rest.costPerSqft !== undefined) updateData.costPerSqft = rest.costPerSqft.toFixed(2);
        if (rest.label !== undefined) updateData.label = rest.label;
        if (rest.description !== undefined) updateData.description = rest.description;
        if (rest.isActive !== undefined) updateData.isActive = rest.isActive;
        const { dpBathroomCountertop } = await import("../drizzle/schema");
        await drizzle.update(dpBathroomCountertop).set(updateData).where(eq(dpBathroomCountertop.id, id));
        return { success: true };
      }),

    // ─── Bathroom Material: Countertop Edge ──────────────────────────────────
    getBathroomCountertopEdge: publicProcedure.query(async () => {
      const drizzle = await db.getDb();
      if (!drizzle) return [];
      const { dpBathroomCountertopEdge } = await import("../drizzle/schema");
      return drizzle.select().from(dpBathroomCountertopEdge).orderBy(dpBathroomCountertopEdge.sortOrder);
    }),
    updateBathroomCountertopEdge: adminProcedure
      .input(z.object({
        id: z.number(),
        costPerLinearFt: z.number().optional(),
        label: z.string().optional(),
        description: z.string().optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const drizzle = await db.getDb();
        if (!drizzle) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        
        const { id, ...rest } = input;
        const updateData: Record<string, unknown> = {};
        if (rest.costPerLinearFt !== undefined) updateData.costPerLinearFt = rest.costPerLinearFt.toFixed(2);
        if (rest.label !== undefined) updateData.label = rest.label;
        if (rest.description !== undefined) updateData.description = rest.description;
        if (rest.isActive !== undefined) updateData.isActive = rest.isActive;
        const { dpBathroomCountertopEdge } = await import("../drizzle/schema");
        await drizzle.update(dpBathroomCountertopEdge).set(updateData).where(eq(dpBathroomCountertopEdge.id, id));
        return { success: true };
      }),

    // ─── Bathroom Material: Toilet ───────────────────────────────────────────
    getBathroomToilet: publicProcedure.query(async () => {
      const drizzle = await db.getDb();
      if (!drizzle) return [];
      const { dpBathroomToilet } = await import("../drizzle/schema");
      return drizzle.select().from(dpBathroomToilet).orderBy(dpBathroomToilet.sortOrder);
    }),
    updateBathroomToilet: adminProcedure
      .input(z.object({
        id: z.number(),
        flatCost: z.number().optional(),
        label: z.string().optional(),
        description: z.string().optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const drizzle = await db.getDb();
        if (!drizzle) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        
        const { id, ...rest } = input;
        const updateData: Record<string, unknown> = {};
        if (rest.flatCost !== undefined) updateData.flatCost = rest.flatCost.toFixed(2);
        if (rest.label !== undefined) updateData.label = rest.label;
        if (rest.description !== undefined) updateData.description = rest.description;
        if (rest.isActive !== undefined) updateData.isActive = rest.isActive;
        const { dpBathroomToilet } = await import("../drizzle/schema");
        await drizzle.update(dpBathroomToilet).set(updateData).where(eq(dpBathroomToilet.id, id));
        return { success: true };
      }),

    // ─── Bathroom Material: Wall Finish ──────────────────────────────────────
    getBathroomWallFinish: publicProcedure.query(async () => {
      const drizzle = await db.getDb();
      if (!drizzle) return [];
      const { dpBathroomWallFinish } = await import("../drizzle/schema");
      return drizzle.select().from(dpBathroomWallFinish).orderBy(dpBathroomWallFinish.sortOrder);
    }),
    updateBathroomWallFinish: adminProcedure
      .input(z.object({
        id: z.number(),
        costPerSqft: z.number().optional(),
        label: z.string().optional(),
        description: z.string().optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const drizzle = await db.getDb();
        if (!drizzle) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        
        const { id, ...rest } = input;
        const updateData: Record<string, unknown> = {};
        if (rest.costPerSqft !== undefined) updateData.costPerSqft = rest.costPerSqft.toFixed(2);
        if (rest.label !== undefined) updateData.label = rest.label;
        if (rest.description !== undefined) updateData.description = rest.description;
        if (rest.isActive !== undefined) updateData.isActive = rest.isActive;
        const { dpBathroomWallFinish } = await import("../drizzle/schema");
        await drizzle.update(dpBathroomWallFinish).set(updateData).where(eq(dpBathroomWallFinish.id, id));
        return { success: true };
      }),

    // ─── Bathroom: Plumbing Feasibility Checklist ───────────────────────────
    getBathroomPlumbingChecklist: publicProcedure
      .input(z.object({ itemKey: z.string().optional() }).optional())
      .query(async ({ input }) => {
        const drizzle = await db.getDb();
        if (!drizzle) return [];
        const { dpBathroomPlumbingChecklist } = await import("../drizzle/schema");
        const { eq, and } = await import("drizzle-orm");
        const conditions: any[] = [eq(dpBathroomPlumbingChecklist.isActive, true)];
        if (input?.itemKey) conditions.push(eq(dpBathroomPlumbingChecklist.itemKey, input.itemKey));
        return drizzle.select().from(dpBathroomPlumbingChecklist)
          .where(conditions.length === 1 ? conditions[0] : and(...conditions))
          .orderBy(dpBathroomPlumbingChecklist.sortOrder);
      }),
    createBathroomPlumbingChecklistItem: adminProcedure
      .input(z.object({ itemKey: z.string().optional(), itemText: z.string().min(1), sortOrder: z.number().optional() }))
      .mutation(async ({ input }) => {
        const drizzle = await db.getDb();
        if (!drizzle) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        const { dpBathroomPlumbingChecklist } = await import("../drizzle/schema");
        await drizzle.insert(dpBathroomPlumbingChecklist).values({ itemKey: input.itemKey ?? null, itemText: input.itemText, sortOrder: input.sortOrder ?? 0 });
        return { success: true };
      }),
    updateBathroomPlumbingChecklistItem: adminProcedure
      .input(z.object({ id: z.number(), itemText: z.string().optional(), isActive: z.boolean().optional(), sortOrder: z.number().optional() }))
      .mutation(async ({ input }) => {
        const drizzle = await db.getDb();
        if (!drizzle) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        const { dpBathroomPlumbingChecklist } = await import("../drizzle/schema");
        
        const { id, ...fields } = input;
        const updateData: Record<string, unknown> = {};
        if (fields.itemText !== undefined) updateData.itemText = fields.itemText;
        if (fields.isActive !== undefined) updateData.isActive = fields.isActive;
        if (fields.sortOrder !== undefined) updateData.sortOrder = fields.sortOrder;
        await drizzle.update(dpBathroomPlumbingChecklist).set(updateData).where(eq(dpBathroomPlumbingChecklist.id, id));
        return { success: true };
      }),
    deleteBathroomPlumbingChecklistItem: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const drizzle = await db.getDb();
        if (!drizzle) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        const { dpBathroomPlumbingChecklist } = await import("../drizzle/schema");
        
        await drizzle.update(dpBathroomPlumbingChecklist).set({ isActive: false }).where(eq(dpBathroomPlumbingChecklist.id, input.id));
        return { success: true };
      }),

    // ─── Bathroom: HVAC Feasibility Checklist ───────────────────────────────
    getBathroomHvacChecklist: publicProcedure
      .input(z.object({ itemKey: z.string().optional() }).optional())
      .query(async ({ input }) => {
        const drizzle = await db.getDb();
        if (!drizzle) return [];
        const { dpBathroomHvacChecklist } = await import("../drizzle/schema");
        const { eq, and } = await import("drizzle-orm");
        const conditions: any[] = [eq(dpBathroomHvacChecklist.isActive, true)];
        if (input?.itemKey) conditions.push(eq(dpBathroomHvacChecklist.itemKey, input.itemKey));
        return drizzle.select().from(dpBathroomHvacChecklist)
          .where(conditions.length === 1 ? conditions[0] : and(...conditions))
          .orderBy(dpBathroomHvacChecklist.sortOrder);
      }),
    createBathroomHvacChecklistItem: adminProcedure
      .input(z.object({ itemKey: z.string().optional(), itemText: z.string().min(1), sortOrder: z.number().optional() }))
      .mutation(async ({ input }) => {
        const drizzle = await db.getDb();
        if (!drizzle) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        const { dpBathroomHvacChecklist } = await import("../drizzle/schema");
        await drizzle.insert(dpBathroomHvacChecklist).values({ itemKey: input.itemKey ?? null, itemText: input.itemText, sortOrder: input.sortOrder ?? 0 });
        return { success: true };
      }),
    updateBathroomHvacChecklistItem: adminProcedure
      .input(z.object({ id: z.number(), itemText: z.string().optional(), isActive: z.boolean().optional(), sortOrder: z.number().optional() }))
      .mutation(async ({ input }) => {
        const drizzle = await db.getDb();
        if (!drizzle) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        const { dpBathroomHvacChecklist } = await import("../drizzle/schema");
        
        const { id, ...fields } = input;
        const updateData: Record<string, unknown> = {};
        if (fields.itemText !== undefined) updateData.itemText = fields.itemText;
        if (fields.isActive !== undefined) updateData.isActive = fields.isActive;
        if (fields.sortOrder !== undefined) updateData.sortOrder = fields.sortOrder;
        await drizzle.update(dpBathroomHvacChecklist).set(updateData).where(eq(dpBathroomHvacChecklist.id, id));
        return { success: true };
      }),
    deleteBathroomHvacChecklistItem: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const drizzle = await db.getDb();
        if (!drizzle) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        const { dpBathroomHvacChecklist } = await import("../drizzle/schema");
        
        await drizzle.update(dpBathroomHvacChecklist).set({ isActive: false }).where(eq(dpBathroomHvacChecklist.id, input.id));
        return { success: true };
      }),

    // ─── Bathroom: Tub Configuration ────────────────────────────────────────
    getBathroomTubConfig: publicProcedure.query(async () => {
      const drizzle = await db.getDb();
      if (!drizzle) return [];
      const { dpBathroomTubConfig } = await import("../drizzle/schema");
      return drizzle.select().from(dpBathroomTubConfig)
        .where((await import("drizzle-orm")).eq(dpBathroomTubConfig.isActive, true))
        .orderBy(dpBathroomTubConfig.sortOrder);
    }),
    updateBathroomTubConfig: adminProcedure
      .input(z.object({ id: z.number(),
        description: z.string().optional(), label: z.string().optional(), installCost: z.number().optional(), isActive: z.boolean().optional() }))
      .mutation(async ({ input }) => {
        const drizzle = await db.getDb();
        if (!drizzle) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        const { dpBathroomTubConfig } = await import("../drizzle/schema");
        
        const { id, ...fields } = input;
        const updateData: Record<string, unknown> = {};
        if (fields.label !== undefined) updateData.label = fields.label;
        if (fields.installCost !== undefined) updateData.installCost = fields.installCost.toFixed(2);
        if (fields.isActive !== undefined) updateData.isActive = fields.isActive;
        await drizzle.update(dpBathroomTubConfig).set(updateData).where(eq(dpBathroomTubConfig.id, id));
        return { success: true };
      }),
    createBathroomTubConfig: adminProcedure
      .input(z.object({
        description: z.string().optional(), tubType: z.string(), label: z.string(), installCost: z.number(), sortOrder: z.number().optional() }))
      .mutation(async ({ input }) => {
        const drizzle = await db.getDb();
        if (!drizzle) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        const { dpBathroomTubConfig } = await import("../drizzle/schema");
        await drizzle.insert(dpBathroomTubConfig).values({ tubType: input.tubType, label: input.label, installCost: input.installCost.toFixed(2), sortOrder: input.sortOrder ?? 0 });
        return { success: true };
      }),

    // ─── Bathroom: Shower Configuration ─────────────────────────────────────
    getBathroomShowerConfig: publicProcedure.query(async () => {
      const drizzle = await db.getDb();
      if (!drizzle) return [];
      const { dpBathroomShowerConfig } = await import("../drizzle/schema");
      return drizzle.select().from(dpBathroomShowerConfig)
        .where((await import("drizzle-orm")).eq(dpBathroomShowerConfig.isActive, true))
        .orderBy(dpBathroomShowerConfig.sortOrder);
    }),
    updateBathroomShowerConfigItem: adminProcedure
      .input(z.object({ id: z.number(),
        description: z.string().optional(), label: z.string().optional(), cost: z.number().optional(), pricingType: z.string().optional(), isActive: z.boolean().optional() }))
      .mutation(async ({ input }) => {
        const drizzle = await db.getDb();
        if (!drizzle) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        const { dpBathroomShowerConfig } = await import("../drizzle/schema");
        
        const { id, ...fields } = input;
        const updateData: Record<string, unknown> = {};
        if (fields.label !== undefined) updateData.label = fields.label;
        if (fields.cost !== undefined) updateData.cost = fields.cost.toFixed(2);
        if (fields.pricingType !== undefined) updateData.pricingType = fields.pricingType;
        if (fields.isActive !== undefined) updateData.isActive = fields.isActive;
        await drizzle.update(dpBathroomShowerConfig).set(updateData).where(eq(dpBathroomShowerConfig.id, id));
        return { success: true };
      }),
    createBathroomShowerConfigItem: adminProcedure
      .input(z.object({
        description: z.string().optional(), configType: z.string(), optionKey: z.string(), label: z.string(), cost: z.number(), pricingType: z.string().default("flat"), sortOrder: z.number().optional() }))
      .mutation(async ({ input }) => {
        const drizzle = await db.getDb();
        if (!drizzle) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        const { dpBathroomShowerConfig } = await import("../drizzle/schema");
        await drizzle.insert(dpBathroomShowerConfig).values({ configType: input.configType, optionKey: input.optionKey, label: input.label, cost: input.cost.toFixed(2), pricingType: input.pricingType, sortOrder: input.sortOrder ?? 0 });
        return { success: true };
      }),

    // ─── Bathroom: Tile Sizes ────────────────────────────────────────────────
    getBathroomTileSizes: publicProcedure.query(async () => {
      const drizzle = await db.getDb();
      if (!drizzle) return [];
      const { dpBathroomTileSizes } = await import("../drizzle/schema");
      return drizzle.select().from(dpBathroomTileSizes)
        .where((await import("drizzle-orm")).eq(dpBathroomTileSizes.isActive, true))
        .orderBy(dpBathroomTileSizes.sortOrder);
    }),
    updateBathroomTileSize: adminProcedure
      .input(z.object({ id: z.number(),
        description: z.string().optional(), label: z.string().optional(), floorCostPerSqft: z.number().optional(), wallCostPerSqft: z.number().optional(), ceilingCostPerSqft: z.number().optional(), isActive: z.boolean().optional() }))
      .mutation(async ({ input }) => {
        const drizzle = await db.getDb();
        if (!drizzle) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        const { dpBathroomTileSizes } = await import("../drizzle/schema");
        
        const { id, ...fields } = input;
        const updateData: Record<string, unknown> = {};
        if (fields.label !== undefined) updateData.label = fields.label;
        if (fields.floorCostPerSqft !== undefined) updateData.floorCostPerSqft = fields.floorCostPerSqft.toFixed(2);
        if (fields.wallCostPerSqft !== undefined) updateData.wallCostPerSqft = fields.wallCostPerSqft.toFixed(2);
        if (fields.ceilingCostPerSqft !== undefined) updateData.ceilingCostPerSqft = fields.ceilingCostPerSqft.toFixed(2);
        if (fields.isActive !== undefined) updateData.isActive = fields.isActive;
        await drizzle.update(dpBathroomTileSizes).set(updateData).where(eq(dpBathroomTileSizes.id, id));
        return { success: true };
      }),

    // ─── Bathroom: Tile Patterns ─────────────────────────────────────────────
    getBathroomTilePatterns: publicProcedure.query(async () => {
      const drizzle = await db.getDb();
      if (!drizzle) return [];
      const { dpBathroomTilePatterns } = await import("../drizzle/schema");
      return drizzle.select().from(dpBathroomTilePatterns)
        .where((await import("drizzle-orm")).eq(dpBathroomTilePatterns.isActive, true))
        .orderBy(dpBathroomTilePatterns.sortOrder);
    }),
    updateBathroomTilePattern: adminProcedure
      .input(z.object({ id: z.number(),
        description: z.string().optional(), label: z.string().optional(), upchargePerSqft: z.number().optional(), isActive: z.boolean().optional() }))
      .mutation(async ({ input }) => {
        const drizzle = await db.getDb();
        if (!drizzle) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        const { dpBathroomTilePatterns } = await import("../drizzle/schema");
        
        const { id, ...fields } = input;
        const updateData: Record<string, unknown> = {};
        if (fields.label !== undefined) updateData.label = fields.label;
        if (fields.upchargePerSqft !== undefined) updateData.upchargePerSqft = fields.upchargePerSqft.toFixed(2);
        if (fields.isActive !== undefined) updateData.isActive = fields.isActive;
        await drizzle.update(dpBathroomTilePatterns).set(updateData).where(eq(dpBathroomTilePatterns.id, id));
        return { success: true };
      }),

    // ─── Bathroom: Vanity Pricing Matrix ────────────────────────────────────
    getBathroomVanityPricing: publicProcedure.query(async () => {
      const drizzle = await db.getDb();
      if (!drizzle) return [];
      const { dpBathroomVanityPricing } = await import("../drizzle/schema");
      return drizzle.select().from(dpBathroomVanityPricing)
        .where((await import("drizzle-orm")).eq(dpBathroomVanityPricing.isActive, true))
        .orderBy(dpBathroomVanityPricing.widthInches);
    }),
    updateBathroomVanityPricing: adminProcedure
      .input(z.object({ id: z.number(),
        description: z.string().optional(), cost: z.number().min(0).optional(), isActive: z.boolean().optional() }))
      .mutation(async ({ input }) => {
        const drizzle = await db.getDb();
        if (!drizzle) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        const { dpBathroomVanityPricing } = await import("../drizzle/schema");
        
        const { id, ...fields } = input;
        const updateData: Record<string, unknown> = {};
        if (fields.cost !== undefined) updateData.cost = fields.cost.toFixed(2);
        if (fields.isActive !== undefined) updateData.isActive = fields.isActive;
        await drizzle.update(dpBathroomVanityPricing).set(updateData).where(eq(dpBathroomVanityPricing.id, id));
        return { success: true };
      }),

    // ─── Bathroom: Vanity Support Config ────────────────────────────────────
    getBathroomVanitySupport: publicProcedure.query(async () => {
      const drizzle = await db.getDb();
      if (!drizzle) return null;
      const { dpBathroomVanitySupport } = await import("../drizzle/schema");
      const rows = await drizzle.select().from(dpBathroomVanitySupport).limit(1);
      if (rows.length === 0) {
        await drizzle.insert(dpBathroomVanitySupport).values({});
        const newRows = await drizzle.select().from(dpBathroomVanitySupport).limit(1);
        return newRows[0];
      }
      return rows[0];
    }),
    updateBathroomVanitySupport: adminProcedure
      .input(z.object({ id: z.number(),
        description: z.string().optional(), costPerSupport: z.number().optional(), spacingInches: z.number().optional(), minSupports: z.number().optional() }))
      .mutation(async ({ input }) => {
        const drizzle = await db.getDb();
        if (!drizzle) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        const { dpBathroomVanitySupport } = await import("../drizzle/schema");
        
        const { id, ...fields } = input;
        const updateData: Record<string, unknown> = {};
        if (fields.costPerSupport !== undefined) updateData.costPerSupport = fields.costPerSupport.toFixed(2);
        if (fields.spacingInches !== undefined) updateData.spacingInches = fields.spacingInches;
        if (fields.minSupports !== undefined) updateData.minSupports = fields.minSupports;
        await drizzle.update(dpBathroomVanitySupport).set(updateData).where(eq(dpBathroomVanitySupport.id, id));
        return { success: true };
      }),

    // ─── Bathroom: Self-Leveler Config ───────────────────────────────────────
    getBathroomSelfLeveler: publicProcedure.query(async () => {
      const drizzle = await db.getDb();
      if (!drizzle) return null;
      const { dpBathroomSelfLeveler } = await import("../drizzle/schema");
      const rows = await drizzle.select().from(dpBathroomSelfLeveler).limit(1);
      if (rows.length === 0) {
        await drizzle.insert(dpBathroomSelfLeveler).values({});
        const newRows = await drizzle.select().from(dpBathroomSelfLeveler).limit(1);
        return newRows[0];
      }
      return rows[0];
    }),
    updateBathroomSelfLeveler: adminProcedure
      .input(z.object({ id: z.number(),
        description: z.string().optional(), costPerBag: z.number().optional(), sqftPerBagQuarterInch: z.number().optional(), sqftPerBagHalfInch: z.number().optional(), sqftPerBagThreeQuarterInch: z.number().optional() }))
      .mutation(async ({ input }) => {
        const drizzle = await db.getDb();
        if (!drizzle) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        const { dpBathroomSelfLeveler } = await import("../drizzle/schema");
        
        const { id, ...fields } = input;
        const updateData: Record<string, unknown> = {};
        if (fields.costPerBag !== undefined) updateData.costPerBag = fields.costPerBag.toFixed(2);
        if (fields.sqftPerBagQuarterInch !== undefined) updateData.sqftPerBagQuarterInch = fields.sqftPerBagQuarterInch;
        if (fields.sqftPerBagHalfInch !== undefined) updateData.sqftPerBagHalfInch = fields.sqftPerBagHalfInch;
        if (fields.sqftPerBagThreeQuarterInch !== undefined) updateData.sqftPerBagThreeQuarterInch = fields.sqftPerBagThreeQuarterInch;
        await drizzle.update(dpBathroomSelfLeveler).set(updateData).where(eq(dpBathroomSelfLeveler.id, id));
        return { success: true };
      }),

    // ── Fixture Inventory ──────────────────────────────────────────────────────
    getBathroomFixtureTypes: publicProcedure.query(async () => {
      const drizzle = await db.getDb();
      if (!drizzle) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const { dpBathroomFixtureTypes } = await import("../drizzle/schema");
      
      return drizzle.select().from(dpBathroomFixtureTypes)
        .where(eq(dpBathroomFixtureTypes.isActive, 1))
        .orderBy(asc(dpBathroomFixtureTypes.sortOrder));
    }),

    getBathroomFixtureActions: publicProcedure.query(async () => {
      const drizzle = await db.getDb();
      if (!drizzle) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const { dpBathroomFixtureActions } = await import("../drizzle/schema");
      
      return drizzle.select().from(dpBathroomFixtureActions)
        .where(eq(dpBathroomFixtureActions.isActive, 1))
        .orderBy(asc(dpBathroomFixtureActions.sortOrder));
    }),

    createBathroomFixtureType: adminProcedure
      .input(z.object({
        description: z.string().optional(),
        fixtureKey: z.string().min(1),
        label: z.string().min(1),
        icon: z.string().optional(),
        sortOrder: z.number().default(0),
      }))
      .mutation(async ({ input }) => {
        const drizzle = await db.getDb();
        if (!drizzle) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        const { dpBathroomFixtureTypes } = await import("../drizzle/schema");
        await drizzle.insert(dpBathroomFixtureTypes).values({
          fixtureKey: input.fixtureKey,
          label: input.label,
          icon: input.icon,
          sortOrder: input.sortOrder,
          isActive: 1,
        });
        return { success: true };
      }),

    updateBathroomFixtureType: adminProcedure
      .input(z.object({
        id: z.number(),
        description: z.string().optional(),
        label: z.string().optional(),
        icon: z.string().optional(),
        sortOrder: z.number().optional(),
        isActive: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const drizzle = await db.getDb();
        if (!drizzle) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        const { dpBathroomFixtureTypes } = await import("../drizzle/schema");
        
        const { id, ...fields } = input;
        const updateData: Record<string, unknown> = {};
        if (fields.label !== undefined) updateData.label = fields.label;
        if (fields.icon !== undefined) updateData.icon = fields.icon;
        if (fields.sortOrder !== undefined) updateData.sortOrder = fields.sortOrder;
        if (fields.isActive !== undefined) updateData.isActive = fields.isActive;
        await drizzle.update(dpBathroomFixtureTypes).set(updateData).where(eq(dpBathroomFixtureTypes.id, id));
        return { success: true };
      }),

    deleteBathroomFixtureType: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const drizzle = await db.getDb();
        if (!drizzle) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        const { dpBathroomFixtureTypes } = await import("../drizzle/schema");
        
        await drizzle.delete(dpBathroomFixtureTypes).where(eq(dpBathroomFixtureTypes.id, input.id));
        return { success: true };
      }),

    createBathroomFixtureAction: adminProcedure
      .input(z.object({
        description: z.string().optional(),
        fixtureKey: z.string().min(1),
        actionType: z.string().min(1),
        label: z.string().min(1),
        cost: z.number().default(0),
        costPerFixture: z.number().default(0),
        costNote: z.string().optional(),
        requiresChecklist: z.number().default(0),
        sortOrder: z.number().default(0),
      }))
      .mutation(async ({ input }) => {
        const drizzle = await db.getDb();
        if (!drizzle) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        const { dpBathroomFixtureActions } = await import("../drizzle/schema");
        await drizzle.insert(dpBathroomFixtureActions).values({
          fixtureKey: input.fixtureKey,
          actionType: input.actionType,
          label: input.label,
          cost: input.cost.toFixed(2),
          costPerFixture: input.costPerFixture.toFixed(2),
          costNote: input.costNote,
          requiresChecklist: input.requiresChecklist,
          sortOrder: input.sortOrder,
          isActive: 1,
        });
        return { success: true };
      }),

    updateBathroomFixtureAction: adminProcedure
      .input(z.object({
        id: z.number(),
        description: z.string().optional(),
        label: z.string().optional(),
        cost: z.number().optional(),
        costPerFixture: z.number().optional(),
        costNote: z.string().optional(),
        requiresChecklist: z.number().optional(),
        sortOrder: z.number().optional(),
        isActive: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const drizzle = await db.getDb();
        if (!drizzle) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        const { dpBathroomFixtureActions } = await import("../drizzle/schema");
        
        const { id, ...fields } = input;
        const updateData: Record<string, unknown> = {};
        if (fields.label !== undefined) updateData.label = fields.label;
        if (fields.cost !== undefined) updateData.cost = fields.cost.toFixed(2);
        if (fields.costPerFixture !== undefined) updateData.costPerFixture = fields.costPerFixture.toFixed(2);
        if (fields.costNote !== undefined) updateData.costNote = fields.costNote;
        if (fields.requiresChecklist !== undefined) updateData.requiresChecklist = fields.requiresChecklist;
        if (fields.sortOrder !== undefined) updateData.sortOrder = fields.sortOrder;
        if (fields.isActive !== undefined) updateData.isActive = fields.isActive;
        await drizzle.update(dpBathroomFixtureActions).set(updateData).where(eq(dpBathroomFixtureActions.id, id));
        return { success: true };
      }),

    deleteBathroomFixtureAction: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const drizzle = await db.getDb();
        if (!drizzle) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        const { dpBathroomFixtureActions } = await import("../drizzle/schema");
        
        await drizzle.delete(dpBathroomFixtureActions).where(eq(dpBathroomFixtureActions.id, input.id));
        return { success: true };
      }),

    // Generic file upload for any DP admin asset (images + PDFs) — returns S3 URL
    uploadAdminFile: adminProcedure
      .input(z.object({
        fileBase64: z.string(),
        mimeType: z.string(),
        folder: z.string().default("dp-admin-uploads"),
      }))
      .mutation(async ({ input }) => {
        const { storagePut } = await import("./storage");
        const buffer = Buffer.from(input.fileBase64, "base64");
        const ext = input.mimeType === "application/pdf" ? "pdf"
          : input.mimeType.split("/")[1]?.replace("jpeg", "jpg") || "bin";
        const randomSuffix = Math.random().toString(36).slice(2, 10);
        const fileKey = `${input.folder}/${randomSuffix}.${ext}`;
        const { url } = await storagePut(fileKey, buffer, input.mimeType);
        return { url };
      }),

    // ─── Bathroom Painting ─────────────────────────────────────────────
    getBathroomPaintingOptions: publicProcedure.query(async () => {
      const drizzle = await db.getDb();
      if (!drizzle) return [];
      const { dpBathroomPainting } = await import("../drizzle/schema");
      const { asc, eq: eqOp2 } = await import("drizzle-orm");
      return drizzle.select().from(dpBathroomPainting)
        .where(eqOp2(dpBathroomPainting.isActive, 1))
        .orderBy(asc(dpBathroomPainting.sortOrder));
    }),

    updateBathroomPaintingOption: adminProcedure
      .input(z.object({
        id: z.number(),
        label: z.string().optional(),
        description: z.string().optional(),
        cost: z.number().min(0).optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const drizzle = await db.getDb();
        if (!drizzle) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        const { dpBathroomPainting } = await import("../drizzle/schema");
        
        const { id, ...fields } = input;
        const updateData: Record<string, unknown> = {};
        if (fields.label !== undefined) updateData.label = fields.label;
        if (fields.description !== undefined) updateData.description = fields.description;
        if (fields.cost !== undefined) updateData.cost = String(fields.cost);
        if (fields.isActive !== undefined) updateData.isActive = fields.isActive ? 1 : 0;
        await drizzle.update(dpBathroomPainting).set(updateData).where(eq(dpBathroomPainting.id, id));
        return { success: true };
      }),
    // ─── Bathroom: Accessories ───────────────────────────────────────────────
    getBathroomAccessories: publicProcedure.query(async () => {
      const drizzle = await db.getDb();
      if (!drizzle) return [];
      const { dpBathroomAccessories } = await import("../drizzle/schema");
      return drizzle.select().from(dpBathroomAccessories).orderBy(dpBathroomAccessories.sortOrder);
    }),
    updateBathroomAccessory: adminProcedure
      .input(z.object({
        id: z.number(),
        label: z.string().optional(),
        description: z.string().optional(),
        cost: z.number().min(0).optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const drizzle = await db.getDb();
        if (!drizzle) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        const { dpBathroomAccessories } = await import("../drizzle/schema");
        
        const { id, ...fields } = input;
        const updateData: Record<string, unknown> = {};
        if (fields.label !== undefined) updateData.label = fields.label;
        if (fields.description !== undefined) updateData.description = fields.description;
        if (fields.cost !== undefined) updateData.cost = String(fields.cost);
        if (fields.isActive !== undefined) updateData.isActive = fields.isActive ? 1 : 0;
        await drizzle.update(dpBathroomAccessories).set(updateData).where(eq(dpBathroomAccessories.id, id));
        return { success: true };
      }),
    // ─── Bathroom: Floating Vanity Config ───────────────────────────────────
    getBathroomFloatingVanityConfig: publicProcedure.query(async () => {
      const drizzle = await db.getDb();
      if (!drizzle) return { id: 1, turnDownCostPerLinearFt: "0.00", floatingMountCost: "0.00" };
      const { dpBathroomFloatingVanityConfig } = await import("../drizzle/schema");
      const rows = await drizzle.select().from(dpBathroomFloatingVanityConfig).limit(1);
      if (rows.length === 0) {
        await drizzle.insert(dpBathroomFloatingVanityConfig).values({});
        const newRows = await drizzle.select().from(dpBathroomFloatingVanityConfig).limit(1);
        return newRows[0];
      }
      return rows[0];
    }),
    updateBathroomFloatingVanityConfig: adminProcedure
      .input(z.object({
        description: z.string().optional(),
        turnDownCostPerLinearFt: z.number().min(0).optional(),
        floatingMountCost: z.number().min(0).optional(),
      }))
      .mutation(async ({ input }) => {
        const drizzle = await db.getDb();
        if (!drizzle) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        const { dpBathroomFloatingVanityConfig } = await import("../drizzle/schema");
        
        const updateData: Record<string, unknown> = {};
        if (input.turnDownCostPerLinearFt !== undefined) updateData.turnDownCostPerLinearFt = String(input.turnDownCostPerLinearFt);
        if (input.floatingMountCost !== undefined) updateData.floatingMountCost = String(input.floatingMountCost);
        await drizzle.update(dpBathroomFloatingVanityConfig).set(updateData).where(eq(dpBathroomFloatingVanityConfig.id, 1));
        return { success: true };
      }),

    // ─── Kitchen Price ─────────────────────────────────────────────────────
    getKitchenConfig: publicProcedure.query(async () => {
      const drizzle = await db.getDb();
      if (!drizzle) return null;
      const { dpKitchenConfig } = await import("../drizzle/schema");
      
      const rows = await drizzle.select().from(dpKitchenConfig).where(eq(dpKitchenConfig.id, 1));
      if (rows.length === 0) {
        await drizzle.insert(dpKitchenConfig).values({ id: 1, markupPct: "0.4000", repCommission: "500.00" });
        return (await drizzle.select().from(dpKitchenConfig).where(eq(dpKitchenConfig.id, 1)))[0];
      }
      return rows[0];
    }),
    updateKitchenConfig: adminProcedure
      .input(z.object({
        markupPct: z.number().min(0).max(1).optional(),
        repCommission: z.number().min(0).optional(),
      }))
      .mutation(async ({ input }) => {
        const drizzle = await db.getDb();
        if (!drizzle) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        const { dpKitchenConfig } = await import("../drizzle/schema");
        
        const updateData: Record<string, unknown> = {};
        if (input.markupPct !== undefined) updateData.markupPct = String(input.markupPct);
        if (input.repCommission !== undefined) updateData.repCommission = String(input.repCommission);
        await drizzle.update(dpKitchenConfig).set(updateData).where(eq(dpKitchenConfig.id, 1));
        return { success: true };
      }),

    // ─── Addition Config ──────────────────────────────────────────────────────
    getAdditionConfig: publicProcedure.query(async () => {
      const drizzle = await db.getDb();
      if (!drizzle) return null;
      const { dpAdditionConfig } = await import("../drizzle/schema");
      
      const rows = await drizzle.select().from(dpAdditionConfig).where(eq(dpAdditionConfig.id, 1));
      if (rows.length === 0) {
        await drizzle.insert(dpAdditionConfig).values({ id: 1, markupPct: "0.4000", repCommission: "1500.00" });
        return (await drizzle.select().from(dpAdditionConfig).where(eq(dpAdditionConfig.id, 1)))[0];
      }
      return rows[0];
    }),
    updateAdditionConfig: adminProcedure
      .input(z.object({
        markupPct: z.number().min(0).max(1).optional(),
        repCommission: z.number().min(0).optional(),
      }))
      .mutation(async ({ input }) => {
        const drizzle = await db.getDb();
        if (!drizzle) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        const { dpAdditionConfig } = await import("../drizzle/schema");
        
        const updateData: Record<string, unknown> = {};
        if (input.markupPct !== undefined) updateData.markupPct = String(input.markupPct);
        if (input.repCommission !== undefined) updateData.repCommission = String(input.repCommission);
        await drizzle.update(dpAdditionConfig).set(updateData).where(eq(dpAdditionConfig.id, 1));
        return { success: true };
      }),

    // ─── Basement Config ──────────────────────────────────────────────────────
    getBasementConfig: publicProcedure.query(async () => {
      const drizzle = await db.getDb();
      if (!drizzle) return null;
      const { dpBasementConfig } = await import("../drizzle/schema");
      
      const rows = await drizzle.select().from(dpBasementConfig).where(eq(dpBasementConfig.id, 1));
      if (rows.length === 0) {
        await drizzle.insert(dpBasementConfig).values({ id: 1, markupPct: "0.4000", repCommission: "750.00" });
        return (await drizzle.select().from(dpBasementConfig).where(eq(dpBasementConfig.id, 1)))[0];
      }
      return rows[0];
    }),
    updateBasementConfig: adminProcedure
      .input(z.object({
        markupPct: z.number().min(0).max(1).optional(),
        repCommission: z.number().min(0).optional(),
      }))
      .mutation(async ({ input }) => {
        const drizzle = await db.getDb();
        if (!drizzle) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        const { dpBasementConfig } = await import("../drizzle/schema");
        
        const updateData: Record<string, unknown> = {};
        if (input.markupPct !== undefined) updateData.markupPct = String(input.markupPct);
        if (input.repCommission !== undefined) updateData.repCommission = String(input.repCommission);
        await drizzle.update(dpBasementConfig).set(updateData).where(eq(dpBasementConfig.id, 1));
        return { success: true };
      }),

    // ─── Kitchen Price Consult ────────────────────────────────────────────────
    getKitchenOptions: publicProcedure.query(async () => {
      const drizzle = await db.getDb();
      if (!drizzle) return [];
      const { dpKitchenOptions } = await import("../drizzle/schema");
      const { asc } = await import("drizzle-orm");
      return drizzle.select().from(dpKitchenOptions).orderBy(asc(dpKitchenOptions.sortOrder));
    }),
    updateKitchenOption: adminProcedure
      .input(z.object({
        id: z.number(),
        label: z.string().optional(),
        description: z.string().optional(),
        cost: z.number().min(0).optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const drizzle = await db.getDb();
        if (!drizzle) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        const { dpKitchenOptions } = await import("../drizzle/schema");
        
        const { id, ...fields } = input;
        const updateData: Record<string, unknown> = {};
        if (fields.label !== undefined) updateData.label = fields.label;
        if (fields.description !== undefined) updateData.description = fields.description;
        if (fields.cost !== undefined) updateData.cost = String(fields.cost);
        if (fields.isActive !== undefined) updateData.isActive = fields.isActive ? 1 : 0;
        await drizzle.update(dpKitchenOptions).set(updateData).where(eq(dpKitchenOptions.id, id));
        return { success: true };
      }),

    // ─── Addition Price Consult ───────────────────────────────────────────────
    getAdditionOptions: publicProcedure.query(async () => {
      const drizzle = await db.getDb();
      if (!drizzle) return [];
      const { dpAdditionOptions } = await import("../drizzle/schema");
      const { asc } = await import("drizzle-orm");
      return drizzle.select().from(dpAdditionOptions).orderBy(asc(dpAdditionOptions.sortOrder));
    }),
    updateAdditionOption: adminProcedure
      .input(z.object({
        id: z.number(),
        label: z.string().optional(),
        description: z.string().optional(),
        cost: z.number().min(0).optional(),
        costGood: z.number().min(0).optional(),
        costBetter: z.number().min(0).optional(),
        costBest: z.number().min(0).optional(),
        hasTiers: z.boolean().optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const drizzle = await db.getDb();
        if (!drizzle) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        const { dpAdditionOptions } = await import("../drizzle/schema");
        
        const { id, ...fields } = input;
        const updateData: Record<string, unknown> = {};
        if (fields.label !== undefined) updateData.label = fields.label;
        if (fields.description !== undefined) updateData.description = fields.description;
        if (fields.cost !== undefined) updateData.cost = String(fields.cost);
        if (fields.costGood !== undefined) updateData.costGood = String(fields.costGood);
        if (fields.costBetter !== undefined) updateData.costBetter = String(fields.costBetter);
        if (fields.costBest !== undefined) updateData.costBest = String(fields.costBest);
        if (fields.hasTiers !== undefined) updateData.hasTiers = fields.hasTiers ? 1 : 0;
        if (fields.isActive !== undefined) updateData.isActive = fields.isActive ? 1 : 0;
        await drizzle.update(dpAdditionOptions).set(updateData).where(eq(dpAdditionOptions.id, id));
        return { success: true };
      }),

    // ─── Basement Price Consult ───────────────────────────────────────────────
    getBasementOptions: publicProcedure.query(async () => {
      const drizzle = await db.getDb();
      if (!drizzle) return [];
      const { dpBasementOptions } = await import("../drizzle/schema");
      const { asc } = await import("drizzle-orm");
      return drizzle.select().from(dpBasementOptions).orderBy(asc(dpBasementOptions.sortOrder));
    }),
    updateBasementOption: adminProcedure
      .input(z.object({
        id: z.number(),
        label: z.string().optional(),
        description: z.string().optional(),
        cost: z.number().min(0).optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const drizzle = await db.getDb();
        if (!drizzle) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        const { dpBasementOptions } = await import("../drizzle/schema");
        
        const { id, ...fields } = input;
        const updateData: Record<string, unknown> = {};
        if (fields.label !== undefined) updateData.label = fields.label;
        if (fields.description !== undefined) updateData.description = fields.description;
        if (fields.cost !== undefined) updateData.cost = String(fields.cost);
        if (fields.isActive !== undefined) updateData.isActive = fields.isActive ? 1 : 0;
        await drizzle.update(dpBasementOptions).set(updateData).where(eq(dpBasementOptions.id, id));
        return { success: true };
      }),

    // ─── Cabinet Pricing Config ───────────────────────────────────────────────
    getCabinetConfig: publicProcedure.query(async () => {
      const drizzle = await db.getDb();
      if (!drizzle) return null;
      const { dpCabinetConfig } = await import("../drizzle/schema");
      const [row] = await drizzle.select().from(dpCabinetConfig).limit(1);
      if (row) return row;
      // Auto-create default row
      await drizzle.insert(dpCabinetConfig).values({ id: 1 }).onDuplicateKeyUpdate({ set: { id: 1 } });
      const [created] = await drizzle.select().from(dpCabinetConfig).limit(1);
      return created ?? null;
    }),
    updateCabinetConfig: adminProcedure
      .input(z.object({
        baseShaker_baseCabinet: z.number().min(0).optional(),
        baseShaker_wallCabinet: z.number().min(0).optional(),
        baseShaker_tallCabinet: z.number().min(0).optional(),
        baseShaker_vanityCabinet: z.number().min(0).optional(),
        mult_standard: z.number().min(0).optional(),
        mult_color: z.number().min(0).optional(),
        mult_essenceOak: z.number().min(0).optional(),
        mult_essenceOakFullHeight: z.number().min(0).optional(),
        mult_havenDune: z.number().min(0).optional(),
        mult_havenEmber: z.number().min(0).optional(),
        wallUpcharge_36in: z.number().min(0).optional(),
        wallUpcharge_42in: z.number().min(0).optional(),
        baseUpcharge_fullHeight: z.number().min(0).optional(),
        baseUpcharge_drawer: z.number().min(0).optional(),
        baseUpcharge_specialty: z.number().min(0).optional(),
        tallPrice_pantry: z.number().min(0).optional(),
        tallPrice_oven: z.number().min(0).optional(),
        tallPrice_linen: z.number().min(0).optional(),
        addon_trashPullout: z.number().min(0).optional(),
        addon_trayBase: z.number().min(0).optional(),
        addon_spicePullout: z.number().min(0).optional(),
        addon_glassDoors: z.number().min(0).optional(),
        addon_decorativeEndPanels: z.number().min(0).optional(),
        addon_finishedSides: z.number().min(0).optional(),
        addon_mouldingPackage: z.number().min(0).optional(),
        addon_islandBackPanels: z.number().min(0).optional(),
        rate_assembly: z.number().min(0).optional(),
        rate_install: z.number().min(0).optional(),
        markupPct: z.number().min(0).max(1).optional(),
      }))
      .mutation(async ({ input }) => {
        const drizzle = await db.getDb();
        if (!drizzle) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        const { dpCabinetConfig } = await import("../drizzle/schema");
        
        const updateData: Record<string, unknown> = {};
        if (input.baseShaker_baseCabinet !== undefined) updateData.base_shaker_base_cabinet = String(input.baseShaker_baseCabinet);
        if (input.baseShaker_wallCabinet !== undefined) updateData.base_shaker_wall_cabinet = String(input.baseShaker_wallCabinet);
        if (input.baseShaker_tallCabinet !== undefined) updateData.base_shaker_tall_cabinet = String(input.baseShaker_tallCabinet);
        if (input.baseShaker_vanityCabinet !== undefined) updateData.base_shaker_vanity_cabinet = String(input.baseShaker_vanityCabinet);
        if (input.mult_standard !== undefined) updateData.mult_standard = String(input.mult_standard);
        if (input.mult_color !== undefined) updateData.mult_color = String(input.mult_color);
        if (input.mult_essenceOak !== undefined) updateData.mult_essence_oak = String(input.mult_essenceOak);
        if (input.mult_essenceOakFullHeight !== undefined) updateData.mult_essence_oak_full_height = String(input.mult_essenceOakFullHeight);
        if (input.mult_havenDune !== undefined) updateData.mult_haven_dune = String(input.mult_havenDune);
        if (input.mult_havenEmber !== undefined) updateData.mult_haven_ember = String(input.mult_havenEmber);
        if (input.wallUpcharge_36in !== undefined) updateData.wall_upcharge_36in = String(input.wallUpcharge_36in);
        if (input.wallUpcharge_42in !== undefined) updateData.wall_upcharge_42in = String(input.wallUpcharge_42in);
        if (input.baseUpcharge_fullHeight !== undefined) updateData.base_upcharge_full_height = String(input.baseUpcharge_fullHeight);
        if (input.baseUpcharge_drawer !== undefined) updateData.base_upcharge_drawer = String(input.baseUpcharge_drawer);
        if (input.baseUpcharge_specialty !== undefined) updateData.base_upcharge_specialty = String(input.baseUpcharge_specialty);
        if (input.tallPrice_pantry !== undefined) updateData.tall_price_pantry = String(input.tallPrice_pantry);
        if (input.tallPrice_oven !== undefined) updateData.tall_price_oven = String(input.tallPrice_oven);
        if (input.tallPrice_linen !== undefined) updateData.tall_price_linen = String(input.tallPrice_linen);
        if (input.addon_trashPullout !== undefined) updateData.addon_trash_pullout = String(input.addon_trashPullout);
        if (input.addon_trayBase !== undefined) updateData.addon_tray_base = String(input.addon_trayBase);
        if (input.addon_spicePullout !== undefined) updateData.addon_spice_pullout = String(input.addon_spicePullout);
        if (input.addon_glassDoors !== undefined) updateData.addon_glass_doors = String(input.addon_glassDoors);
        if (input.addon_decorativeEndPanels !== undefined) updateData.addon_decorative_end_panels = String(input.addon_decorativeEndPanels);
        if (input.addon_finishedSides !== undefined) updateData.addon_finished_sides = String(input.addon_finishedSides);
        if (input.addon_mouldingPackage !== undefined) updateData.addon_moulding_package = String(input.addon_mouldingPackage);
        if (input.addon_islandBackPanels !== undefined) updateData.addon_island_back_panels = String(input.addon_islandBackPanels);
        if (input.rate_assembly !== undefined) updateData.rate_assembly = String(input.rate_assembly);
        if (input.rate_install !== undefined) updateData.rate_install = String(input.rate_install);
        if (input.markupPct !== undefined) updateData.markup_pct = String(input.markupPct);
        await drizzle.update(dpCabinetConfig).set(updateData).where(eq(dpCabinetConfig.id, 1));
        return { success: true };
      }),

    // ── Window & SGD Config ──────────────────────────────────────────────────
    getWindowConfig: publicProcedure.query(async () => {
      const drizzle = await db.getDb();
      if (!drizzle) return null;
      const { dpWindowConfig } = await import("../drizzle/schema");
      
      const [row] = await drizzle.select().from(dpWindowConfig).where(eq(dpWindowConfig.id, 1)).limit(1);
      if (!row) {
        await drizzle.insert(dpWindowConfig).values({ id: 1 });
        const [newRow] = await drizzle.select().from(dpWindowConfig).where(eq(dpWindowConfig.id, 1)).limit(1);
        return newRow!;
      }
      return row;
    }),

    updateWindowConfig: adminProcedure
      .input(z.object({
        price_vinyl_singleHung: z.number().optional(),
        price_vinyl_doubleHung: z.number().optional(),
        price_vinyl_casement: z.number().optional(),
        price_vinyl_slider: z.number().optional(),
        price_vinyl_picture: z.number().optional(),
        price_alum_singleHung: z.number().optional(),
        price_alum_doubleHung: z.number().optional(),
        price_alum_casement: z.number().optional(),
        price_alum_slider: z.number().optional(),
        price_alum_picture: z.number().optional(),
        price_wood_singleHung: z.number().optional(),
        price_wood_doubleHung: z.number().optional(),
        price_wood_casement: z.number().optional(),
        price_wood_slider: z.number().optional(),
        price_wood_picture: z.number().optional(),
        colorUpcharge_blackOnWhite: z.number().optional(),
        colorUpcharge_blackOnBlack: z.number().optional(),
        paneUpcharge_triple: z.number().optional(),
        price_sgd_2panel: z.number().optional(),
        price_sgd_3panel: z.number().optional(),
        price_sgd_4panel: z.number().optional(),
        sgd_movingPanelUpcharge: z.number().optional(),
        sgd_multiSlideUpcharge: z.number().optional(),
        sgd_alum_upcharge: z.number().optional(),
        sgd_wood_upcharge: z.number().optional(),
        sgd_colorUpcharge_blackOnWhite: z.number().optional(),
        sgd_colorUpcharge_blackOnBlack: z.number().optional(),
        price_header_per_lf: z.number().optional(),
        price_casing_per_set: z.number().optional(),
        sgd_newOpeningUpcharge: z.number().optional(),
        windowSize_bathroom: z.number().optional(),
        windowSize_standardEgress: z.number().optional(),
        windowSize_largeEgress: z.number().optional(),
        windowSize_oversized: z.number().optional(),
        windowSize_skylight: z.number().optional(),
        markupPct: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const drizzle = await db.getDb();
        if (!drizzle) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        const { dpWindowConfig } = await import("../drizzle/schema");
        
        const updateData: Record<string, string> = {};
        if (input.price_vinyl_singleHung !== undefined) updateData.price_vinyl_single_hung = String(input.price_vinyl_singleHung);
        if (input.price_vinyl_doubleHung !== undefined) updateData.price_vinyl_double_hung = String(input.price_vinyl_doubleHung);
        if (input.price_vinyl_casement !== undefined) updateData.price_vinyl_casement = String(input.price_vinyl_casement);
        if (input.price_vinyl_slider !== undefined) updateData.price_vinyl_slider = String(input.price_vinyl_slider);
        if (input.price_vinyl_picture !== undefined) updateData.price_vinyl_picture = String(input.price_vinyl_picture);
        if (input.price_alum_singleHung !== undefined) updateData.price_alum_single_hung = String(input.price_alum_singleHung);
        if (input.price_alum_doubleHung !== undefined) updateData.price_alum_double_hung = String(input.price_alum_doubleHung);
        if (input.price_alum_casement !== undefined) updateData.price_alum_casement = String(input.price_alum_casement);
        if (input.price_alum_slider !== undefined) updateData.price_alum_slider = String(input.price_alum_slider);
        if (input.price_alum_picture !== undefined) updateData.price_alum_picture = String(input.price_alum_picture);
        if (input.price_wood_singleHung !== undefined) updateData.price_wood_single_hung = String(input.price_wood_singleHung);
        if (input.price_wood_doubleHung !== undefined) updateData.price_wood_double_hung = String(input.price_wood_doubleHung);
        if (input.price_wood_casement !== undefined) updateData.price_wood_casement = String(input.price_wood_casement);
        if (input.price_wood_slider !== undefined) updateData.price_wood_slider = String(input.price_wood_slider);
        if (input.price_wood_picture !== undefined) updateData.price_wood_picture = String(input.price_wood_picture);
        if (input.colorUpcharge_blackOnWhite !== undefined) updateData.color_upcharge_bow = String(input.colorUpcharge_blackOnWhite);
        if (input.colorUpcharge_blackOnBlack !== undefined) updateData.color_upcharge_bob = String(input.colorUpcharge_blackOnBlack);
        if (input.paneUpcharge_triple !== undefined) updateData.pane_upcharge_triple = String(input.paneUpcharge_triple);
        if (input.price_sgd_2panel !== undefined) updateData.price_sgd_2panel = String(input.price_sgd_2panel);
        if (input.price_sgd_3panel !== undefined) updateData.price_sgd_3panel = String(input.price_sgd_3panel);
        if (input.price_sgd_4panel !== undefined) updateData.price_sgd_4panel = String(input.price_sgd_4panel);
        if (input.sgd_movingPanelUpcharge !== undefined) updateData.sgd_moving_panel_upcharge = String(input.sgd_movingPanelUpcharge);
        if (input.sgd_multiSlideUpcharge !== undefined) updateData.sgd_multi_slide_upcharge = String(input.sgd_multiSlideUpcharge);
        if (input.sgd_alum_upcharge !== undefined) updateData.sgd_alum_upcharge = String(input.sgd_alum_upcharge);
        if (input.sgd_wood_upcharge !== undefined) updateData.sgd_wood_upcharge = String(input.sgd_wood_upcharge);
        if (input.sgd_colorUpcharge_blackOnWhite !== undefined) updateData.sgd_color_upcharge_bow = String(input.sgd_colorUpcharge_blackOnWhite);
        if (input.sgd_colorUpcharge_blackOnBlack !== undefined) updateData.sgd_color_upcharge_bob = String(input.sgd_colorUpcharge_blackOnBlack);
        if (input.price_header_per_lf !== undefined) updateData.price_header_per_lf = String(input.price_header_per_lf);
        if (input.price_casing_per_set !== undefined) updateData.price_casing_per_set = String(input.price_casing_per_set);
        if (input.sgd_newOpeningUpcharge !== undefined) updateData.sgd_new_opening_upcharge = String(input.sgd_newOpeningUpcharge);
        if (input.windowSize_bathroom !== undefined) updateData.window_size_bathroom = String(input.windowSize_bathroom);
        if (input.windowSize_standardEgress !== undefined) updateData.window_size_standard_egress = String(input.windowSize_standardEgress);
        if (input.windowSize_largeEgress !== undefined) updateData.window_size_large_egress = String(input.windowSize_largeEgress);
        if (input.windowSize_oversized !== undefined) updateData.window_size_oversized = String(input.windowSize_oversized);
        if (input.windowSize_skylight !== undefined) updateData.window_size_skylight = String(input.windowSize_skylight);
        if (input.markupPct !== undefined) updateData.markup_pct = String(input.markupPct);
        await drizzle.update(dpWindowConfig).set(updateData).where(eq(dpWindowConfig.id, 1));
        return { success: true };
      }),

      getPriceConsultSections: publicProcedure
        .input(z.object({ consultType: z.string() }))
        .query(async ({ input }) => {
          const drizzle = await db.getDb();
          if (!drizzle) return [];
          
          
          const existing = await drizzle
            .select()
            .from(dpPriceConsultSections)
            .where(eq(dpPriceConsultSections.consultType, input.consultType))
            .orderBy(asc(dpPriceConsultSections.sortOrder));
          if (existing.length > 0) return existing;
          // Auto-seed defaults for this consultType
          const now = Date.now();
          const DEFAULTS: Record<string, Array<{ sectionKey: string; label: string; sortOrder: number }>> = {
            bathroom: [
              { sectionKey: "bathroom_size", label: "Bathroom Size", sortOrder: 0 },
              { sectionKey: "plumbing_fixtures", label: "Plumbing — Fixtures", sortOrder: 1 },
              { sectionKey: "electrical_scope", label: "Electrical Scope", sortOrder: 2 },
              { sectionKey: "hvac_ventilation", label: "HVAC / Ventilation", sortOrder: 3 },
              { sectionKey: "tub_shower", label: "Tub / Shower", sortOrder: 4 },
              { sectionKey: "wall_finish", label: "Wall Finish", sortOrder: 5 },
              { sectionKey: "tile_outside_shower", label: "Tile Outside Shower", sortOrder: 6 },
              { sectionKey: "painting_drywall", label: "Painting & Drywall", sortOrder: 7 },
              { sectionKey: "vanity", label: "Vanity", sortOrder: 8 },
              { sectionKey: "countertop", label: "Countertop", sortOrder: 9 },
              { sectionKey: "flooring", label: "Flooring", sortOrder: 10 },
              { sectionKey: "toilet", label: "Toilet", sortOrder: 11 },
              { sectionKey: "addons", label: "Add-ons", sortOrder: 12 },
              { sectionKey: "accessories", label: "Accessories", sortOrder: 13 },
            ],
            addition: [
              { sectionKey: "foundation", label: "Foundation", sortOrder: 0 },
              { sectionKey: "framing", label: "Framing", sortOrder: 1 },
              { sectionKey: "roofline", label: "Roofline", sortOrder: 2 },
              { sectionKey: "exterior", label: "Exterior", sortOrder: 3 },
              { sectionKey: "windows_doors", label: "Windows & Doors", sortOrder: 4 },
              { sectionKey: "electrical", label: "Electrical", sortOrder: 5 },
              { sectionKey: "plumbing", label: "Plumbing", sortOrder: 6 },
              { sectionKey: "hvac", label: "HVAC", sortOrder: 7 },
              { sectionKey: "interior_finish", label: "Interior Finish", sortOrder: 8 },
              { sectionKey: "structural", label: "Structural", sortOrder: 9 },
              { sectionKey: "windows", label: "Windows & Sliding Glass Doors", sortOrder: 10 },
            ],
            basement: [
              { sectionKey: "ceiling", label: "Ceiling", sortOrder: 0 },
              { sectionKey: "egress", label: "Egress", sortOrder: 1 },
              { sectionKey: "framing", label: "Framing", sortOrder: 2 },
              { sectionKey: "electrical", label: "Electrical", sortOrder: 3 },
              { sectionKey: "plumbing", label: "Plumbing", sortOrder: 4 },
              { sectionKey: "hvac", label: "HVAC", sortOrder: 5 },
              { sectionKey: "flooring", label: "Flooring", sortOrder: 6 },
              { sectionKey: "walls_ceiling", label: "Walls & Ceiling", sortOrder: 7 },
              { sectionKey: "painting", label: "Painting", sortOrder: 8 },
              { sectionKey: "accessories", label: "Accessories", sortOrder: 9 },
              { sectionKey: "windows", label: "Windows & Sliding Glass Doors", sortOrder: 10 },
            ],
            kitchen: [
              { sectionKey: "cabinets", label: "Cabinets", sortOrder: 0 },
              { sectionKey: "plumbing", label: "Plumbing", sortOrder: 1 },
              { sectionKey: "electrical", label: "Electrical", sortOrder: 2 },
              { sectionKey: "countertops", label: "Countertops", sortOrder: 3 },
              { sectionKey: "backsplash", label: "Backsplash", sortOrder: 4 },
              { sectionKey: "flooring", label: "Flooring", sortOrder: 5 },
              { sectionKey: "appliances", label: "Appliances", sortOrder: 6 },
              { sectionKey: "painting", label: "Painting", sortOrder: 7 },
              { sectionKey: "accessories", label: "Accessories", sortOrder: 8 },
              { sectionKey: "windows", label: "Windows & Sliding Glass Doors", sortOrder: 9 },
            ],
          };
          const defs = DEFAULTS[input.consultType] ?? [];
          if (defs.length > 0) {
            await drizzle.insert(dpPriceConsultSections).values(
              defs.map(d => ({ consultType: input.consultType, sectionKey: d.sectionKey, label: d.label, isVisible: 1, sortOrder: d.sortOrder, createdAt: now, updatedAt: now }))
            );
          }
          return drizzle
            .select()
            .from(dpPriceConsultSections)
            .where(eq(dpPriceConsultSections.consultType, input.consultType))
                        .orderBy(asc(dpPriceConsultSections.sortOrder));
        }),
      updatePriceConsultSection: protectedProcedure
        .input(z.object({
          id: z.number(),
          isVisible: z.union([z.boolean(), z.number()]).optional(),
          sortOrder: z.number().optional(),
          label: z.string().optional(),
        }))
        .mutation(async ({ input }) => {
          const drizzle = await db.getDb();
          if (!drizzle) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
          
          
          const updateData: Record<string, unknown> = { updatedAt: Date.now() };
          if (input.isVisible !== undefined) updateData.isVisible = input.isVisible ? 1 : 0;
          if (input.sortOrder !== undefined) updateData.sortOrder = input.sortOrder;
          if (input.label !== undefined) updateData.label = input.label;
          await drizzle.update(dpPriceConsultSections).set(updateData).where(eq(dpPriceConsultSections.id, input.id));
          return { success: true };
        }),

      batchUpdatePriceConsultSections: protectedProcedure
        .input(z.array(z.object({ id: z.number(), sortOrder: z.number(), isVisible: z.union([z.boolean(), z.number()]) })))
        .mutation(async ({ input }) => {
          const drizzle = await db.getDb();
          if (!drizzle) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
          
          
          for (const item of input) {
            await drizzle.update(dpPriceConsultSections)
              .set({ sortOrder: item.sortOrder, isVisible: item.isVisible ? 1 : 0, updatedAt: Date.now() })
              .where(eq(dpPriceConsultSections.id, item.id));
          }
          return { success: true };
        }),

    }),

  // ─── Initial Consult (Stay vs. Move) ──────────────────────────────────
  initialConsult: router({
    lookupProperty: publicProcedure
      .input(z.object({ address: z.string().min(5) }))
      .mutation(async ({ input }) => {
        let rentcastResult: any = null;
        let rentcastError: string | null = null;

        // 1. Try RentCast first for full property data including estimated value
        try {
          const { lookupPropertyByAddress } = await import("./services/propertyData");
          rentcastResult = await lookupPropertyByAddress(input.address);
        } catch (err: unknown) {
          rentcastError = err instanceof Error ? err.message : String(err);
        }

        // 2. If RentCast returned valid coordinates, use it directly
        if (rentcastResult && rentcastResult.latitude && rentcastResult.longitude) {
          return { success: true, property: rentcastResult };
        }

        // 3. Fallback: use Google Maps Geocoder to get coordinates
        try {
          const { makeRequest } = await import("./_core/map");
          const geoRes = await makeRequest<any>("/maps/api/geocode/json", { address: input.address });
          const geoResult = geoRes?.results?.[0];
          if (geoResult) {
            const loc = geoResult.geometry?.location;
            const formattedAddress = geoResult.formatted_address ?? input.address;
            // Merge geocoded coordinates with any partial RentCast data
            const merged = {
              address: formattedAddress,
              formattedAddress,
              city: rentcastResult?.city ?? "",
              state: rentcastResult?.state ?? "",
              zipCode: rentcastResult?.zipCode ?? "",
              latitude: loc?.lat ?? 0,
              longitude: loc?.lng ?? 0,
              squareFootage: rentcastResult?.squareFootage ?? null,
              bedrooms: rentcastResult?.bedrooms ?? null,
              bathrooms: rentcastResult?.bathrooms ?? null,
              propertyType: rentcastResult?.propertyType ?? null,
              yearBuilt: rentcastResult?.yearBuilt ?? null,
              lotSize: rentcastResult?.lotSize ?? null,
              estimatedValue: rentcastResult?.estimatedValue ?? null,
              lastSalePrice: rentcastResult?.lastSalePrice ?? null,
              lastSaleDate: rentcastResult?.lastSaleDate ?? null,
              isEstimate: true,
              geocodedFallback: true,
            };
            return { success: true, property: merged };
          }
        } catch (_geoErr: unknown) {
          // Geocoder also failed — fall through to last resort
        }

        // 4. Last resort: return partial data with the raw address (no coordinates)
        if (rentcastResult) {
          return { success: true, property: rentcastResult };
        }
        return { success: false, property: null, error: rentcastError ?? "Property not found" };
      }),

    searchComparables: publicProcedure
      .input(z.object({
        latitude: z.number(),
        longitude: z.number(),
        squareFootage: z.number(),
        bedrooms: z.number(),
        bathrooms: z.number(),
        propertyType: z.string().default("Single Family"),
        radiusMiles: z.number().optional(),
        daysBack: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        try {
          const { searchComparableSales } = await import("./services/propertyData");
          const { scoreComparables } = await import("./services/financialCalc");
          const raws = await searchComparableSales(input);
          const scored = scoreComparables({
            projectedSqft: input.squareFootage,
            projectedBedrooms: input.bedrooms,
            projectedBathrooms: input.bathrooms,
            propertyType: input.propertyType,
            comparables: raws.map((r) => ({
              address: (r.formattedAddress as string) ?? "",
              soldPrice: (r.soldPrice as number) ?? (r.price as number) ?? 0,
              squareFootage: (r.squareFootage as number) ?? input.squareFootage,
              bedrooms: (r.bedrooms as number) ?? input.bedrooms,
              bathrooms: (r.bathrooms as number) ?? input.bathrooms,
              yearBuilt: r.yearBuilt as number | undefined,
              lotSize: r.lotSize as number | undefined,
              propertyType: r.propertyType as string | undefined,
              soldDate: (r.soldDate as string) ?? (r.lastSeenDate as string) ?? new Date().toISOString().split("T")[0],
              distanceMiles: (r.distance as number) ?? 0,
              latitude: r.latitude as number | undefined,
              longitude: r.longitude as number | undefined,
              imageUrl: r.photoUrl as string | undefined,
            })),
          });
          return { success: true, comparables: scored };
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          return { success: false, comparables: [], error: msg };
        }
      }),

    getMortgageRate: publicProcedure
      .input(z.object({ fallbackRate: z.number().optional() }).optional())
      .query(async ({ input }) => {
        const { getCurrentMortgageRate } = await import("./services/mortgageRate");
        const result = await getCurrentMortgageRate(input?.fallbackRate);
        return result;
      }),

    calculateFinancials: publicProcedure
      .input(z.object({
        currentHomeValue: z.number(),
        mortgageBalance: z.number(),
        existingMortgagePI: z.number(),
        propertyTaxesMonthly: z.number(),
        insuranceMonthly: z.number(),
        hoaMonthly: z.number().default(0),
        additionalMonthly: z.number().default(0),
        renovationBudget: z.number(),
        cashContribution: z.number().default(0),
        loanRatePercent: z.number(),
        loanTermYears: z.number().default(15),
        marketRatePercent: z.number(),
        realtorFeePct: z.number().default(6),
        relocationCostPct: z.number().default(1),
        closingCostPct: z.number().default(2),
        propertyTaxRatePercent: z.number().default(1.2),
        replacementInsuranceAnnual: z.number().default(1800),
        replacementHoaMonthly: z.number().default(0),
        appreciationRatePercent: z.number().default(4),
        projectedAfterAdditionValue: z.number(),
        appreciationYears: z.array(z.number()).default([1, 3, 5, 10, 20]),
      }))
      .mutation(async ({ input }) => {
        const { calcRenovationFunding, calcSellMove, calcAppreciation } = await import("./services/financialCalc");
        const renovation = calcRenovationFunding({
          renovationBudget: input.renovationBudget,
          cashContribution: input.cashContribution,
          loanRatePercent: input.loanRatePercent,
          loanTermYears: input.loanTermYears,
          existingMortgagePI: input.existingMortgagePI,
          propertyTaxesMonthly: input.propertyTaxesMonthly,
          insuranceMonthly: input.insuranceMonthly,
          hoaMonthly: input.hoaMonthly,
          additionalMonthly: input.additionalMonthly,
        });
        const sellMove = calcSellMove({
          currentHomeValue: input.currentHomeValue,
          mortgageBalance: input.mortgageBalance,
          marketRatePercent: input.marketRatePercent,
          targetMonthlyBudget: renovation.totalStayAndBuildMonthly,
          realtorFeePct: input.realtorFeePct,
          relocationCostPct: input.relocationCostPct,
          closingCostPct: input.closingCostPct,
          propertyTaxRatePercent: input.propertyTaxRatePercent,
          insuranceAnnual: input.replacementInsuranceAnnual,
          hoaMonthly: input.replacementHoaMonthly,
        });
        const appreciation = calcAppreciation({
          stayHomeValue: input.projectedAfterAdditionValue,
          moveHomeValue: sellMove.replacementHomePurchasePrice,
          annualRatePercent: input.appreciationRatePercent,
          years: input.appreciationYears,
        });
        return { renovation, sellMove, appreciation };
      }),

    saveConsultation: publicProcedure
      .input(z.object({
        sessionId: z.string(),
        consultantUserId: z.number().optional(),
        status: z.string().optional(),
        inputData: z.string().optional(),
        resultData: z.string().optional(),
        clientName: z.string().optional(),
        clientEmail: z.string().optional(),
        clientPhone: z.string().optional(),
        propertyAddress: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const existing = await db.getInitialConsultationBySession(input.sessionId);
        if (existing) {
          await db.updateInitialConsultation(input.sessionId, {
            status: input.status,
            inputData: input.inputData,
            resultData: input.resultData,
            clientName: input.clientName,
            clientEmail: input.clientEmail,
            clientPhone: input.clientPhone,
            propertyAddress: input.propertyAddress,
          });
          return { success: true, id: existing.id, created: false };
        } else {
          const id = await db.saveInitialConsultation(input);
          return { success: true, id, created: true };
        }
      }),

    loadConsultation: publicProcedure
      .input(z.object({ sessionId: z.string() }))
      .query(async ({ input }) => {
        const consultation = await db.getInitialConsultationBySession(input.sessionId);
        return { consultation };
      }),

    listConsultations: protectedProcedure
      .query(async () => {
        const consultations = await db.listInitialConsultations(100);
        return { consultations };
      }),
    deleteConsultation: protectedProcedure
      .input(z.object({ sessionId: z.string() }))
      .mutation(async ({ input }) => {
        await db.deleteInitialConsultation(input.sessionId);
        return { success: true };
      }),
    getConsultSettings: publicProcedure
      .query(async () => {
        const drizzleDb = await db.getDb();
        const { initialConsultSettings } = await import('../drizzle/schema');
        if (!drizzleDb) return {
          defaultRealtorFeePct: 6, defaultRelocationCostPct: 1, defaultClosingCostPct: 2,
          defaultPropertyTaxRatePct: 1.2, defaultReplacementInsuranceAnnual: 1800,
          defaultAppreciationRatePct: 4, defaultLoanTermYears: 15,
          lockRealtorFee: false, lockRelocationCost: false, lockClosingCost: false,
          lockPropertyTaxRate: false, lockReplacementInsurance: false,
          lockAppreciationRate: false, lockLoanTerm: false,
          companyTagline: 'Stay & Build vs. Sell & Move',
          appreciationYears: '1,3,5,10,20',
          lenderEmail: 'ODonnellTeam@ccm.com',
        };
        const rows = await drizzleDb.select().from(initialConsultSettings).limit(1);
        if (rows.length === 0) {
          return {
            defaultRealtorFeePct: 6, defaultRelocationCostPct: 1, defaultClosingCostPct: 2,
            defaultPropertyTaxRatePct: 1.2, defaultReplacementInsuranceAnnual: 1800,
            defaultAppreciationRatePct: 4, defaultLoanTermYears: 15,
            lockRealtorFee: false, lockRelocationCost: false, lockClosingCost: false,
            lockPropertyTaxRate: false, lockReplacementInsurance: false,
            lockAppreciationRate: false, lockLoanTerm: false,
            companyTagline: 'Stay & Build vs. Sell & Move',
            appreciationYears: '1,3,5,10,20',
            lenderEmail: 'ODonnellTeam@ccm.com',
          };
        }
        const s = rows[0];
        return {
          defaultRealtorFeePct: Number(s.defaultRealtorFeePct),
          defaultRelocationCostPct: Number(s.defaultRelocationCostPct),
          defaultClosingCostPct: Number(s.defaultClosingCostPct),
          defaultPropertyTaxRatePct: Number(s.defaultPropertyTaxRatePct),
          defaultReplacementInsuranceAnnual: Number(s.defaultReplacementInsuranceAnnual),
          defaultAppreciationRatePct: Number(s.defaultAppreciationRatePct),
          defaultLoanTermYears: Number(s.defaultLoanTermYears),
          lockRealtorFee: Boolean(s.lockRealtorFee),
          lockRelocationCost: Boolean(s.lockRelocationCost),
          lockClosingCost: Boolean(s.lockClosingCost),
          lockPropertyTaxRate: Boolean(s.lockPropertyTaxRate),
          lockReplacementInsurance: Boolean(s.lockReplacementInsurance),
          lockAppreciationRate: Boolean(s.lockAppreciationRate),
          lockLoanTerm: Boolean(s.lockLoanTerm),
          companyTagline: s.companyTagline ?? 'Stay & Build vs. Sell & Move',
          appreciationYears: s.appreciationYears ?? '1,3,5,10,20',
          lenderEmail: s.lenderEmail ?? 'ODonnellTeam@ccm.com',
        };
      }),
    updateConsultSettings: protectedProcedure
      .input(z.object({
        defaultRealtorFeePct: z.number().optional(),
        defaultRelocationCostPct: z.number().optional(),
        defaultClosingCostPct: z.number().optional(),
        defaultPropertyTaxRatePct: z.number().optional(),
        defaultReplacementInsuranceAnnual: z.number().optional(),
        defaultAppreciationRatePct: z.number().optional(),
        defaultLoanTermYears: z.number().optional(),
        lockRealtorFee: z.boolean().optional(),
        lockRelocationCost: z.boolean().optional(),
        lockClosingCost: z.boolean().optional(),
        lockPropertyTaxRate: z.boolean().optional(),
        lockReplacementInsurance: z.boolean().optional(),
        lockAppreciationRate: z.boolean().optional(),
        lockLoanTerm: z.boolean().optional(),
        companyTagline: z.string().optional(),
        appreciationYears: z.string().optional(),
        lenderEmail: z.string().email().optional(),
        updatedBy: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const drizzleDb = await db.getDb();
        const { initialConsultSettings } = await import('../drizzle/schema');
        if (!drizzleDb) return { success: false };
        const rows = await drizzleDb.select().from(initialConsultSettings).limit(1);
        const now = Date.now();
        if (rows.length === 0) {
          await drizzleDb.insert(initialConsultSettings).values({ ...input as any, updatedAt: now });
        } else {
          await drizzleDb.update(initialConsultSettings)
            .set({ ...input as any, updatedAt: now })
            .where(eq(initialConsultSettings.id, rows[0].id));
        }
        return { success: true };
      }),

    sendPreApprovalEmail: publicProcedure
      .input(z.object({
        clientName: z.string().min(1),
        clientEmail: z.string().email(),
        clientPhone: z.string().default(""),
        clientAddress: z.string().default(""),
        clientGoals: z.string().default(""),
      }))
      .mutation(async ({ input }) => {
        const APPLY_URL = "https://app.crosscountrymortgage.com/#/milestones?referrerId=eni.odonnell%40myccmortgage.com";

        // Fetch lender email from admin settings (falls back to default if not set)
        let LENDER_EMAIL = "ODonnellTeam@ccm.com";
        try {
          const drizzleDb = await db.getDb();
          const { initialConsultSettings } = await import('../drizzle/schema');
          if (drizzleDb) {
            const rows = await drizzleDb.select().from(initialConsultSettings).limit(1);
            if (rows.length > 0 && rows[0].lenderEmail) {
              LENDER_EMAIL = rows[0].lenderEmail;
            }
          }
        } catch (_) { /* use default */ }

        const subject = `New Referral: ${input.clientName}`;

        const goalsSentence = input.clientGoals?.trim()
          ? input.clientGoals.trim()
          : "exploring renovation financing options for their home";

        const htmlBody = `
<p>Hi ${input.clientName},</p>

<p>As we discussed, the next step in your renovation journey is to connect with my trusted lender partner in Utah, <strong>The O'Donnell Team with CrossCountry Mortgage</strong>. I've copied the O'Donnell Team on this email, and their contact information is included below. They specialize in assisting homeowners like you and will guide you through a straightforward, efficient pre-approval process. This includes a no-cost, no-obligation one-on-one consultation to explore your options, craft a personalized renovation financing strategy, and answer any questions or concerns you may have.</p>

<p>To get started, you can complete the pre-approval application at <a href="${APPLY_URL}"><strong>APPLY NOW</strong></a></p>

<p><strong>Important Note:</strong> Applying for pre-approval won't result in a "hard" credit inquiry and will not impact your credit score.</p>

<hr />

<p>O'Donnell Team, please meet <strong>${input.clientName}</strong>. They are ${goalsSentence}. You can reach them at:</p>

<p>
<strong>Name:</strong> ${input.clientName}<br />
<strong>Phone:</strong> ${input.clientPhone || "—"}<br />
<strong>Email:</strong> ${input.clientEmail}<br />
${input.clientAddress ? `<strong>Address:</strong> ${input.clientAddress}<br />` : ""}
</p>
`;

        const textBody = `Hi ${input.clientName},\n\nAs we discussed, the next step in your renovation journey is to connect with my trusted lender partner in Utah, The O'Donnell Team with CrossCountry Mortgage. I've copied the O'Donnell Team on this email, and their contact information is included below. They specialize in assisting homeowners like you and will guide you through a straightforward, efficient pre-approval process. This includes a no-cost, no-obligation one-on-one consultation to explore your options, craft a personalized renovation financing strategy, and answer any questions or concerns you may have.\n\nTo get started, you can complete the pre-approval application at:\n${APPLY_URL}\n\nImportant Note: Applying for pre-approval won't result in a "hard" credit inquiry and will not impact your credit score.\n\n---\n\nO'Donnell Team, please meet ${input.clientName}. They are ${goalsSentence}. You can reach them at:\n\nName: ${input.clientName}\nPhone: ${input.clientPhone || "—"}\nEmail: ${input.clientEmail}${input.clientAddress ? `\nAddress: ${input.clientAddress}` : ""}`;

        // Send via dedicated pre-approval Zapier webhook
        const webhookUrl = process.env.ZAPIER_PRE_APPROVAL_WEBHOOK_URL ?? "";
        if (!webhookUrl) {
          return { success: false, error: "Pre-approval email webhook not configured" };
        }

        try {
          const payload = {
            email_type: "pre_approval_referral",
            email_subject: subject,
            // Recipients: client + lender
            customer_email: input.clientEmail,
            cc_email: LENDER_EMAIL,
            // Client details
            customer_name: input.clientName,
            customer_phone: input.clientPhone,
            customer_address: input.clientAddress,
            client_goals: goalsSentence,
            apply_url: APPLY_URL,
            lender_email: LENDER_EMAIL,
            // Full body for Zapier to use
            email_body_html: htmlBody,
            email_body_text: textBody,
          };

          const response = await fetch(webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

          if (!response.ok) {
            const text = await response.text();
            return { success: false, error: `Webhook returned ${response.status}: ${text}` };
          }

          return { success: true };
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          console.error("[PreApproval] Failed to send email:", message);
          return { success: false, error: message };
        }
      }),
  }),
});
export type AppRouter = typeof appRouter;
