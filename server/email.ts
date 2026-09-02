/**
 * Zapier Webhook Email Integration
 *
 * Instead of sending email directly via SMTP, we POST a structured JSON payload
 * to a Zapier Webhook trigger. Zapier then handles sending the email via Gmail,
 * Outlook, or any other email service configured in the Zap.
 *
 * Zapier Webhook Payload Fields:
 *   customer_name, customer_email, company_name, company_phone, company_location,
 *   collection_name, color_name, sqft, labor_name, delivery_name,
 *   grand_total, final_total, price_per_sqft, discount_applied, discount_name,
 *   discount_value, show_pricing, has_stairs, stair_treads, stair_length,
 *   edge_linear_ft, waste_factor, include_permit, scope_items (string),
 *   pricing_breakdown (string), estimate_disclaimer
 */

export interface EstimateWebhookData {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  companyName: string;
  companyPhone: string;
  companyLocation: string;
  collectionName: string;
  colorName: string;
  colorHex: string;
  sqft: number;
  laborName: string;
  deliveryName: string;
  grandTotal: number;
  finalTotal: number;
  pricePerSqft: number;
  discountApplied: boolean;
  discountName: string;
  discountValue: number;
  discount2Applied?: boolean;
  discount2Name?: string;
  discount2Value?: number;
  showPricing: boolean;
  showItemized: boolean;
  breakdown: {
    materialCost: number;
    laborCost: number;
    deliveryCost: number;
    accessoryCost: number;
    taxAmount: number;
    demoRebuildSubtotal: number;
    rainEscapeSubtotal: number;
    demoRebuildDetails: Array<{ name: string; cost: number }>;
    rainEscapeDetails: Array<{ name: string; cost: number }>;
    accessoryDetails: Array<{ name: string; cost: number; showInScope?: boolean }>;
    laborLineItemDetails: Array<{ name: string; cost: number }>;
    frostFootingCost?: number;
    frostFootingCornerCount?: number;
    frostFootingIntermediateCount?: number;
    frostFootingCornerDiameter?: number;
    frostFootingIntermediateDiameter?: number;
    /** Post & Beam Wrap */
    postWrapCost?: number;
    postWrapMaterialCost?: number;
    postWrapLaborCost?: number;
    postWrapOptionName?: string;
    postWrapPostPieces?: { lengthFt: number; count: number; priceEach: number }[];
    postWrapBeamPieces?: { lengthFt: number; count: number; priceEach: number }[];
  };
  stairRuns: Array<{ id: string; label?: string; stairType: string; stairLength: number; stairTreads: number; spiralDiameter?: number; stairTreadMaterial?: string; landingCount?: number; needsLanding?: boolean; isPreliminary?: boolean; landings?: Array<{ id: string; position: string; label: string; widthFt: number; depthFt: number; material: string; notes?: string }> }>;
  edgeLinearFt: number;
  wasteFactor: number;
  includePermit: boolean;
  estimateDisclaimer: string;
}

function fmt(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

export function buildScopeText(data: EstimateWebhookData): string {
  const lines: string[] = [];
  lines.push(`• Tanzite Stone Decking — ${data.sqft} ft² ${data.collectionName} — ${data.colorName}`);
  if (data.edgeLinearFt > 0) lines.push(`• Edge Finishing — ${data.edgeLinearFt} linear ft`);
  for (const run of data.stairRuns ?? []) {
    const runLabel = run.label ?? "Stair Installation";
    if (run.stairType === "spiral") {
      lines.push(`• ${runLabel} — Spiral ${run.spiralDiameter}" (${run.stairTreadMaterial ?? ""})`);
    } else if (run.stairType === "floating") {
      lines.push(`• ${runLabel} — Floating Steps × ${run.stairLength} ft wide${run.isPreliminary ? " [PRELIMINARY]" : ""}`);
    } else {
      lines.push(`• ${runLabel} — ${run.stairTreads} treads × ${run.stairLength} ft wide${run.isPreliminary ? " [PRELIMINARY]" : ""}`);
      if (run.landings && run.landings.length > 0) {
        for (const landing of run.landings) {
          const sqft = Math.round(landing.widthFt * landing.depthFt * 10) / 10;
          lines.push(`  — ${landing.label} (${landing.position}): ${landing.widthFt}'×${landing.depthFt}' ${sqft} ft² — ${landing.material}${landing.notes ? " — " + landing.notes : ""}`);
        }
      } else if (run.stairType === "landing-turn" && (run.landingCount ?? 0) > 0) {
        lines.push(`  — ${run.landingCount} turn landing${(run.landingCount ?? 0) > 1 ? "s" : ""}`);
      }
    }
  }
  if (data.laborName) lines.push(`• Installation Labor — ${data.laborName}`);
  if (data.deliveryName) lines.push(`• Delivery — ${data.deliveryName}`);
  if (data.includePermit) lines.push(`• Permit Assistance`);
  if (data.breakdown.demoRebuildSubtotal > 0) {
    lines.push(`• Demo & Rebuild`);
    for (const item of data.breakdown.demoRebuildDetails) {
      lines.push(`  — ${item.name}`);
    }
  }
  if (data.breakdown.rainEscapeSubtotal > 0) {
    lines.push(`• Waterproof Under-Deck System`);
    for (const item of data.breakdown.rainEscapeDetails) {
      lines.push(`  — ${item.name}`);
    }
  }
  if ((data.breakdown.postWrapCost ?? 0) > 0 && data.breakdown.postWrapOptionName) {
    lines.push(`• Post & Beam Wrap — ${data.breakdown.postWrapOptionName}`);
    const postPieces = data.breakdown.postWrapPostPieces ?? [];
    const beamPieces = data.breakdown.postWrapBeamPieces ?? [];
    if (postPieces.length > 0) {
      const postSummary = postPieces.map(p => `${p.count} × ${p.lengthFt}' piece${p.count !== 1 ? 's' : ''}`).join(', ');
      lines.push(`  — Posts: ${postSummary}`);
    }
    if (beamPieces.length > 0) {
      const beamSummary = beamPieces.map(p => `${p.count} × ${p.lengthFt}' piece${p.count !== 1 ? 's' : ''}`).join(', ');
      lines.push(`  — Beams: ${beamSummary}`);
    }
  }
  const scopeAccessories = (data.breakdown.accessoryDetails ?? []).filter(a => a.showInScope);
  if (scopeAccessories.length > 0) {
    for (const acc of scopeAccessories) {
      lines.push(`• ${acc.name}`);
    }
  }
  if ((data.breakdown.laborLineItemDetails ?? []).length > 0) {
    for (const li of data.breakdown.laborLineItemDetails) {
      lines.push(`• ${li.name}`);
    }
  }
  return lines.join("\n");
}

export function buildPricingText(data: EstimateWebhookData): string {
  if (!data.showPricing) return "(Pricing hidden — scope of work only)";
  const lines: string[] = [];
  if (data.showItemized) {
    if (data.breakdown.materialCost > 0) lines.push(`Materials: ${fmt(data.breakdown.materialCost)}`);
    if (data.breakdown.accessoryCost > 0) lines.push(`Accessories: ${fmt(data.breakdown.accessoryCost)}`);
    if (data.breakdown.laborCost > 0) lines.push(`Labor: ${fmt(data.breakdown.laborCost)}`);
    for (const li of data.breakdown.laborLineItemDetails) {
      lines.push(`  — ${li.name}: ${fmt(li.cost)}`);
    }
    if (data.breakdown.deliveryCost > 0) lines.push(`Delivery: ${fmt(data.breakdown.deliveryCost)}`);
    if (data.breakdown.taxAmount > 0) lines.push(`Sales Tax: ${fmt(data.breakdown.taxAmount)}`);
    if (data.breakdown.demoRebuildSubtotal > 0) lines.push(`Demo & Rebuild: ${fmt(data.breakdown.demoRebuildSubtotal)}`);
    if (data.breakdown.rainEscapeSubtotal > 0) lines.push(`Waterproof Under-Deck: ${fmt(data.breakdown.rainEscapeSubtotal)}`);
    if ((data.breakdown.postWrapCost ?? 0) > 0) {
      const optName = data.breakdown.postWrapOptionName ? ` — ${data.breakdown.postWrapOptionName}` : '';
      lines.push(`Post & Beam Wrap${optName}: ${fmt(data.breakdown.postWrapCost ?? 0)}`);
      const matCost = data.breakdown.postWrapMaterialCost ?? 0;
      const labCost = data.breakdown.postWrapLaborCost ?? 0;
      const postPieces = data.breakdown.postWrapPostPieces ?? [];
      const beamPieces = data.breakdown.postWrapBeamPieces ?? [];
      if (postPieces.length > 0) {
        const postSummary = postPieces.map(p => `${p.count} × ${p.lengthFt}' (${fmt(p.priceEach)}/ea)`).join(', ');
        lines.push(`  — Post material: ${postSummary}`);
      }
      if (beamPieces.length > 0) {
        const beamSummary = beamPieces.map(p => `${p.count} × ${p.lengthFt}' (${fmt(p.priceEach)}/ea)`).join(', ');
        lines.push(`  — Beam material: ${beamSummary}`);
      }
      if (matCost > 0) lines.push(`  — Material subtotal: ${fmt(matCost)}`);
      if (labCost > 0) lines.push(`  — Labor subtotal: ${fmt(labCost)}`);
    }
    if ((data.breakdown.frostFootingCost ?? 0) > 0) {
      const cf = data.breakdown.frostFootingCornerCount ?? 0;
      const im = data.breakdown.frostFootingIntermediateCount ?? 0;
      const cd = data.breakdown.frostFootingCornerDiameter ?? 0;
      const id = data.breakdown.frostFootingIntermediateDiameter ?? 0;
      lines.push(`Frost Footings: ${fmt(data.breakdown.frostFootingCost ?? 0)}`);
      if (cf > 0) lines.push(`  — ${cf} Corner Footings (${cd}"⌀)`);
      if (im > 0) lines.push(`  — ${im} Intermediate Footings (${id}"⌀)`);
    }
    if (data.discountApplied && data.discountValue > 0) {
      lines.push(`${data.discountName}: -${fmt(data.discountValue)}`);
    }
    if (data.discount2Applied && (data.discount2Value ?? 0) > 0) {
      lines.push(`${data.discount2Name || 'Discount'}: -${fmt(data.discount2Value ?? 0)}`);
    }
    lines.push(`─────────────────────`);
  }
  lines.push(`GRAND TOTAL: ${fmt(data.finalTotal)}`);
  lines.push(`(${fmt(data.pricePerSqft)}/ft² × ${data.sqft} ft²)`);
  return lines.join("\n");
}

export async function sendEstimateViaZapier(
  webhookUrl: string,
  data: EstimateWebhookData
): Promise<{ success: boolean; error?: string }> {
  try {
    const payload = {
      // Customer info
      customer_name: data.customerName,
      customer_email: data.customerEmail,
      customer_phone: data.customerPhone,
      customer_address: data.customerAddress,

      // Company info
      company_name: data.companyName,
      company_phone: data.companyPhone,
      company_location: data.companyLocation,

      // Project details
      collection_name: data.collectionName,
      color_name: data.colorName,
      color_hex: data.colorHex,
      sqft: data.sqft,
      labor_name: data.laborName,
      delivery_name: data.deliveryName,
      has_stairs: (data.stairRuns ?? []).length > 0,
      stair_runs: data.stairRuns ?? [],
      stair_treads: (data.stairRuns ?? []).reduce((s, r) => s + r.stairTreads, 0),
      stair_length: (data.stairRuns ?? []).reduce((s, r) => s + r.stairLength, 0),
      edge_linear_ft: data.edgeLinearFt,
      waste_factor: data.wasteFactor,
      include_permit: data.includePermit,

      // Pricing
      show_pricing: data.showPricing,
      grand_total: data.grandTotal,
      final_total: data.finalTotal,
      final_total_formatted: fmt(data.finalTotal),
      price_per_sqft: data.pricePerSqft,
      price_per_sqft_formatted: fmt(data.pricePerSqft),
      discount_applied: data.discountApplied,
      discount_name: data.discountName,
      discount_value: data.discountValue,
      discount_value_formatted: data.discountValue > 0 ? fmt(data.discountValue) : "",

      // Breakdown totals
      material_cost: data.breakdown.materialCost,
      labor_cost: data.breakdown.laborCost,
      delivery_cost: data.breakdown.deliveryCost,
      tax_amount: data.breakdown.taxAmount,
      demo_rebuild_subtotal: data.breakdown.demoRebuildSubtotal,
      rain_escape_subtotal: data.breakdown.rainEscapeSubtotal,

      // Human-readable text blocks (useful for email body in Zapier)
      scope_of_work: buildScopeText(data),
      pricing_breakdown: buildPricingText(data),
      estimate_disclaimer: data.estimateDisclaimer,

      // Email subject suggestion
      email_subject: `Your ${data.companyName} Estimate — ${data.collectionName} Stone Decking (${fmt(data.finalTotal)})`,
    };

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text();
      return { success: false, error: `Zapier webhook returned ${response.status}: ${text}` };
    }

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[Zapier] Failed to send estimate webhook:", message);
    return { success: false, error: message };
  }
}
