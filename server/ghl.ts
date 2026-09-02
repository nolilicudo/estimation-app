/**
 * GoHighLevel (GHL) CRM Integration
 *
 * Uses the GHL v2 REST API (services.leadconnectorhq.com) to:
 *   1. Upsert a contact (create or update by email)
 *   2. Create an opportunity linked to that contact
 *   3. Send an email to the contact via GHL Conversations API
 *
 * Authentication: Private Integration Token (Bearer)
 * Docs: https://marketplace.gohighlevel.com/docs/ghl/contacts/upsert-contact/
 */

const GHL_BASE = "https://services.leadconnectorhq.com";

function ghlHeaders(apiKey: string) {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    Version: "2021-07-28",
  };
}

export interface GhlEstimateData {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  customerCity?: string;
  collectionName: string;
  colorName: string;
  sqft: number;
  laborName: string;
  deliveryName: string;
  finalTotal: number;
  pricePerSqft: number;
  discountApplied: boolean;
  discountName: string;
  discountValue: number;
  discount2Applied?: boolean;
  discount2Name?: string;
  discount2Value?: number;
  showPricing: boolean;
  scopeOfWork: string;
  pricingBreakdown: string;
  estimateDisclaimer: string;
  companyName: string;
  companyPhone: string;
  companyLocation: string;
  signUrl?: string; // Virtual contract signing link
  monthlyPayment?: number; // Enhancify financing monthly payment estimate
  moodboardNotes?: string; // Project mood board notes from the rep/customer
  sitePhotos?: Array<{ url: string; caption: string; category: string }>; // Site photos taken during estimate
}

function fmt(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

/**
 * Upsert a GHL contact. Returns the contact ID.
 */
export async function ghlUpsertContact(
  apiKey: string,
  locationId: string,
  data: GhlEstimateData
): Promise<{ contactId: string | null; error?: string }> {
  try {
    // Parse first/last name
    const nameParts = data.customerName.trim().split(" ");
    const firstName = nameParts[0] || data.customerName;
    const lastName = nameParts.slice(1).join(" ") || "";

    const body: Record<string, unknown> = {
      locationId,
      firstName,
      lastName,
      email: data.customerEmail,
      phone: data.customerPhone || undefined,
      address1: data.customerAddress || undefined,
      city: data.customerCity || undefined,
      source: "Tanzite Calculator",
      tags: ["tanzite-estimate", data.collectionName.toLowerCase().replace(/\s+/g, "-")],
      customFields: [
        { key: "estimate_sqft", field_value: String(data.sqft) },
        { key: "estimate_collection", field_value: data.collectionName },
        { key: "estimate_color", field_value: data.colorName },
        { key: "estimate_total", field_value: fmt(data.finalTotal) },
      ],
    };

    const res = await fetch(`${GHL_BASE}/contacts/upsert`, {
      method: "POST",
      headers: ghlHeaders(apiKey),
      body: JSON.stringify(body),
    });

    const json = await res.json() as any;

    if (!res.ok) {
      console.error("[GHL] Upsert contact failed:", res.status, JSON.stringify(json));
      return { contactId: null, error: `GHL contact upsert failed (${res.status}): ${json?.message || JSON.stringify(json)}` };
    }

    const contactId = json?.contact?.id ?? json?.id ?? null;
    return { contactId };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[GHL] Upsert contact error:", msg);
    return { contactId: null, error: msg };
  }
}

/**
 * Create a GHL opportunity linked to a contact.
 */
export async function ghlCreateOpportunity(
  apiKey: string,
  locationId: string,
  contactId: string,
  data: GhlEstimateData
): Promise<{ opportunityId: string | null; error?: string }> {
  try {
    // First, find the default pipeline for this location
    const pipelineRes = await fetch(
      `${GHL_BASE}/opportunities/pipelines?locationId=${locationId}`,
      { headers: ghlHeaders(apiKey) }
    );
    const pipelineJson = await pipelineRes.json() as any;
    const pipelines: any[] = pipelineJson?.pipelines ?? [];
    const pipeline = pipelines[0]; // use first available pipeline
    const pipelineId = pipeline?.id;
    const stageId = pipeline?.stages?.[0]?.id; // first stage

    if (!pipelineId || !stageId) {
      return { opportunityId: null, error: "No pipeline/stage found in GHL location" };
    }

    // Check for an existing opportunity for this contact — update instead of creating a duplicate
    const searchRes = await fetch(
      `${GHL_BASE}/opportunities/search?location_id=${locationId}&contact_id=${contactId}&limit=1`,
      { headers: ghlHeaders(apiKey) }
    );
    const searchJson = await searchRes.json() as any;
    const existingOpps: any[] = searchJson?.opportunities ?? [];
    const existing = existingOpps[0];

    const oppName = `${data.customerName} — ${data.collectionName} ${data.sqft} sqft`;
    const customFields = [
      { key: "estimate_sqft", field_value: String(data.sqft) },
      { key: "estimate_collection", field_value: data.collectionName },
      { key: "estimate_color", field_value: data.colorName },
      { key: "estimate_labor", field_value: data.laborName },
      { key: "estimate_delivery", field_value: data.deliveryName },
      { key: "estimate_price_per_sqft", field_value: fmt(data.pricePerSqft) },
    ];

    if (existing?.id) {
      // Update the existing opportunity with fresh estimate data
      console.log("[GHL] Updating existing opportunity:", existing.id);
      const updateBody = {
        name: oppName,
        pipelineStageId: stageId,
        status: "open",
        monetaryValue: data.finalTotal,
        customFields,
      };
      const updateRes = await fetch(`${GHL_BASE}/opportunities/${existing.id}`, {
        method: "PUT",
        headers: ghlHeaders(apiKey),
        body: JSON.stringify(updateBody),
      });
      const updateJson = await updateRes.json() as any;
      if (!updateRes.ok) {
        console.error("[GHL] Update opportunity failed:", updateRes.status, JSON.stringify(updateJson));
        return { opportunityId: null, error: `GHL opportunity update failed (${updateRes.status}): ${updateJson?.message || JSON.stringify(updateJson)}` };
      }
      console.log("[GHL] Opportunity updated successfully:", existing.id);
      return { opportunityId: existing.id };
    }

    // No existing opportunity — create a new one
    console.log("[GHL] Creating new opportunity for contact:", contactId);
    const body = {
      pipelineId,
      locationId,
      name: oppName,
      pipelineStageId: stageId,
      status: "open",
      contactId,
      monetaryValue: data.finalTotal,
      source: "Tanzite Calculator",
      customFields,
    };

    const res = await fetch(`${GHL_BASE}/opportunities/`, {
      method: "POST",
      headers: ghlHeaders(apiKey),
      body: JSON.stringify(body),
    });

    const json = await res.json() as any;

    if (!res.ok) {
      console.error("[GHL] Create opportunity failed:", res.status, JSON.stringify(json));
      return { opportunityId: null, error: `GHL opportunity creation failed (${res.status}): ${json?.message || JSON.stringify(json)}` };
    }

    const opportunityId = json?.opportunity?.id ?? json?.id ?? null;
    console.log("[GHL] Opportunity created successfully:", opportunityId);
    return { opportunityId };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[GHL] Create opportunity error:", msg);
    return { opportunityId: null, error: msg };
  }
}

/**
 * Find the most recent opportunity for a contact and move it to a "Contract Signed" stage.
 * Falls back gracefully if the stage or opportunity is not found.
 */
export async function ghlMoveOpportunityToSigned(
  apiKey: string,
  locationId: string,
  contactId: string,
  customerName: string
): Promise<{ success: boolean; opportunityId?: string; error?: string }> {
  try {
    // Fetch pipelines to find the "Contract Signed" stage
    const pipelineRes = await fetch(
      `${GHL_BASE}/opportunities/pipelines?locationId=${locationId}`,
      { headers: ghlHeaders(apiKey) }
    );
    const pipelineJson = await pipelineRes.json() as any;
    const pipelines: any[] = pipelineJson?.pipelines ?? [];
    const pipeline = pipelines[0];
    if (!pipeline) return { success: false, error: "No pipeline found" };

    // Find a stage whose name contains "signed" or "contract" (case-insensitive)
    const stages: any[] = pipeline.stages ?? [];
    let targetStage = stages.find((s: any) =>
      /signed|contract/i.test(s.name)
    );
    // Fall back to the last stage if no explicit "signed" stage exists
    if (!targetStage && stages.length > 0) {
      targetStage = stages[stages.length - 1];
    }
    if (!targetStage) return { success: false, error: "No suitable stage found" };

    // Search for the contact's most recent opportunity
    const searchRes = await fetch(
      `${GHL_BASE}/opportunities/search?location_id=${locationId}&contact_id=${contactId}&limit=1`,
      { headers: ghlHeaders(apiKey) }
    );
    const searchJson = await searchRes.json() as any;
    const opportunities: any[] = searchJson?.opportunities ?? [];
    const opp = opportunities[0];

    if (!opp?.id) {
      // No existing opportunity — create a new one in the signed stage
      const createBody = {
        pipelineId: pipeline.id,
        locationId,
        name: `${customerName} — Contract Signed`,
        pipelineStageId: targetStage.id,
        status: "won",
        contactId,
        source: "Tanzite Calculator",
      };
      const createRes = await fetch(`${GHL_BASE}/opportunities/`, {
        method: "POST",
        headers: ghlHeaders(apiKey),
        body: JSON.stringify(createBody),
      });
      const createJson = await createRes.json() as any;
      const newId = createJson?.opportunity?.id ?? createJson?.id;
      if (!createRes.ok || !newId) {
        return { success: false, error: `Could not create signed opportunity: ${JSON.stringify(createJson)}` };
      }
      return { success: true, opportunityId: newId };
    }

    // Update existing opportunity to signed stage
    const updateBody = {
      pipelineStageId: targetStage.id,
      status: "won",
    };
    const updateRes = await fetch(`${GHL_BASE}/opportunities/${opp.id}`, {
      method: "PUT",
      headers: ghlHeaders(apiKey),
      body: JSON.stringify(updateBody),
    });
    const updateJson = await updateRes.json() as any;
    if (!updateRes.ok) {
      return { success: false, error: `GHL opportunity update failed (${updateRes.status}): ${updateJson?.message || JSON.stringify(updateJson)}` };
    }

    return { success: true, opportunityId: opp.id };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[GHL] Move opportunity to signed error:", msg);
    return { success: false, error: msg };
  }
}

/**
 * Add a note to a GHL contact (used to attach project photo URLs after signing).
 */
export async function ghlAddContactNote(
  apiKey: string,
  contactId: string,
  body: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`${GHL_BASE}/contacts/${contactId}/notes`, {
      method: "POST",
      headers: ghlHeaders(apiKey),
      body: JSON.stringify({ body }),
    });
    const json = await res.json() as any;
    if (!res.ok) {
      console.error("[GHL] Add note failed:", res.status, JSON.stringify(json));
      return { success: false, error: JSON.stringify(json) };
    }
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[GHL] Add note error:", msg);
    return { success: false, error: msg };
  }
}

/**
 * Send an email to the contact via GHL Conversations API.
 */
export async function ghlSendEmail(
  apiKey: string,
  locationId: string,
  contactId: string,
  data: GhlEstimateData
): Promise<{ success: boolean; error?: string }> {
  try {
    const subject = `Your ${data.companyName} Estimate — ${data.collectionName} Stone Decking${data.showPricing ? ` (${fmt(data.finalTotal)})` : ""}`;

    const pricingSection = data.showPricing
      ? `<h2 style="color:#8B4513;margin-top:24px;">Pricing Summary</h2>
<pre style="background:#f5f5f0;padding:16px;border-radius:6px;font-size:13px;line-height:1.6;">${data.pricingBreakdown}</pre>
${data.discountApplied && data.discountValue > 0 ? `<p style="color:#16a34a;font-weight:600;">✓ ${data.discountName} applied: −${fmt(data.discountValue)}</p>` : ""}
${data.discount2Applied && (data.discount2Value ?? 0) > 0 ? `<p style="color:#16a34a;font-weight:600;">✓ ${data.discount2Name || 'Discount'} applied: −${fmt(data.discount2Value ?? 0)}</p>` : ""}
<p style="font-size:22px;font-weight:700;color:#333;margin-top:16px;">Total: ${fmt(data.finalTotal)}</p>
<p style="color:#666;font-size:13px;">${fmt(data.pricePerSqft)} per sq ft · ${data.sqft} ft² total</p>`
      : "";

    const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:Georgia,serif;background:#faf9f7;margin:0;padding:0;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border:1px solid #e5e2dc;">
    <!-- Header -->
    <div style="background:#2c2c2c;padding:28px 32px;">
      <h1 style="color:#fff;margin:0;font-size:22px;font-weight:400;letter-spacing:0.5px;">${data.companyName}</h1>
      <p style="color:#d4c5b0;margin:4px 0 0;font-size:13px;">${data.companyLocation}${data.companyPhone ? ` · ${data.companyPhone}` : ""}</p>
    </div>
    <!-- Body -->
    <div style="padding:32px;">
      <p style="font-size:16px;color:#333;">Hi ${data.customerName},</p>
      <p style="color:#555;line-height:1.7;">Thank you for using our online calculator! Here is your personalized estimate for your Tanzite Stone Decking project.</p>

      <h2 style="color:#8B4513;margin-top:24px;">Project Details</h2>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <tr><td style="padding:6px 0;color:#666;width:140px;">Collection</td><td style="padding:6px 0;color:#333;font-weight:600;">${data.collectionName}</td></tr>
        <tr><td style="padding:6px 0;color:#666;">Color</td><td style="padding:6px 0;color:#333;font-weight:600;">${data.colorName}</td></tr>
        <tr><td style="padding:6px 0;color:#666;">Area</td><td style="padding:6px 0;color:#333;font-weight:600;">${data.sqft} sq ft</td></tr>
        <tr><td style="padding:6px 0;color:#666;">Labor</td><td style="padding:6px 0;color:#333;font-weight:600;">${data.laborName}</td></tr>
        <tr><td style="padding:6px 0;color:#666;">Delivery</td><td style="padding:6px 0;color:#333;font-weight:600;">${data.deliveryName}</td></tr>
        ${data.customerAddress ? `<tr><td style="padding:6px 0;color:#666;">Address</td><td style="padding:6px 0;color:#333;font-weight:600;">${data.customerAddress}${data.customerCity ? `, ${data.customerCity}` : ""}</td></tr>` : (data.customerCity ? `<tr><td style="padding:6px 0;color:#666;">City</td><td style="padding:6px 0;color:#333;font-weight:600;">${data.customerCity}</td></tr>` : "")}
      </table>

      <h2 style="color:#8B4513;margin-top:24px;">Scope of Work</h2>
      <pre style="background:#f5f5f0;padding:16px;border-radius:6px;font-size:13px;line-height:1.6;white-space:pre-wrap;">${data.scopeOfWork}</pre>

      ${data.moodboardNotes && data.moodboardNotes.trim() ? `
      <div style="margin-top:24px;background:#fffbf0;border:1px solid #f0d080;border-radius:8px;padding:18px 20px;">
        <h3 style="color:#8B4513;margin:0 0 10px;font-size:15px;font-weight:600;">📋 Project Notes</h3>
        <p style="color:#444;font-size:13px;line-height:1.7;margin:0;white-space:pre-wrap;">${data.moodboardNotes.trim()}</p>
      </div>` : ""}

      ${pricingSection}

      ${data.monthlyPayment && data.monthlyPayment > 0 ? `
      <div style="margin-top:24px;background:#f0f7f0;border:2px solid #68BA62;border-radius:10px;padding:20px 24px;text-align:center;">
        <p style="margin:0 0 4px;font-size:13px;color:#1C418C;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;">💰 Financing Available</p>
        <p style="margin:0;font-size:26px;font-weight:700;color:#1C418C;">$${data.monthlyPayment.toFixed(2)}<span style="font-size:14px;font-weight:400;color:#555;">/mo</span></p>
        <p style="margin:6px 0 0;font-size:12px;color:#555;">Estimated monthly payment · 12.4% APR · 60-month term</p>
        <a href="https://www.enhancify.com/gyvr-home-works-financing-offers?amount=${Math.round(data.finalTotal)}" target="_blank" style="display:inline-block;margin-top:14px;background:#68BA62;color:#ffffff;text-decoration:none;padding:11px 28px;border-radius:6px;font-size:15px;font-weight:700;letter-spacing:0.3px;">Apply Now — Get Financing Offers</a>
        <p style="margin:10px 0 0;font-size:11px;color:#888;">Financing provided by Enhancify. Subject to credit approval. Rates and terms may vary.</p>
      </div>` : ""}

      ${data.sitePhotos && data.sitePhotos.length > 0 ? `
      <div style="margin-top:28px;">
        <h3 style="color:#8B4513;font-size:15px;font-weight:600;margin:0 0 12px;">📸 Site Photos (${data.sitePhotos.length})</h3>
        <div style="display:flex;flex-wrap:wrap;gap:10px;">
          ${data.sitePhotos.map(photo => `
            <div style="flex:0 0 calc(33% - 8px);max-width:180px;">
              <a href="${photo.url}" target="_blank" style="display:block;">
                <img src="${photo.url}" alt="${photo.caption || 'Site photo'}" style="width:100%;height:120px;object-fit:cover;border-radius:6px;border:1px solid #e5e2dc;display:block;" />
              </a>
              ${photo.caption ? `<p style="font-size:11px;color:#666;margin:4px 0 0;">${photo.caption}</p>` : ""}
            </div>
          `).join("")}
        </div>
      </div>` : ""}

      <div style="margin-top:28px;padding:16px;background:#fdf8f4;border-left:3px solid #c0855a;border-radius:4px;">
        <p style="font-size:12px;color:#777;margin:0;line-height:1.6;">${data.estimateDisclaimer}</p>
      </div>

      <div style="margin-top:32px;text-align:center;background:#fdf8f4;border:2px solid #c0855a;border-radius:8px;padding:24px 32px;">
        <p style="color:#333;font-size:16px;font-weight:600;margin:0 0 8px;">Ready to move forward?</p>
        <p style="color:#555;font-size:14px;margin:0 0 20px;">Review and sign your contract online — then pay your 50% deposit to lock in your project date.</p>
        ${data.signUrl
          ? `<a href="${data.signUrl}" style="display:inline-block;background:#8B4513;color:#fff;text-decoration:none;padding:14px 32px;border-radius:6px;font-size:16px;font-weight:600;letter-spacing:0.3px;">✍ Review &amp; Sign Contract</a>
             <p style="color:#888;font-size:12px;margin:16px 0 0;">Click the button above to review your contract and pay your 50% deposit. The link expires in 30 days.</p>
             <p style="color:#777;font-size:12px;margin:8px 0 0;">Or copy this link: <a href="${data.signUrl}" style="color:#8B4513;word-break:break-all;">${data.signUrl}</a></p>`
          : `<p style="color:#555;font-size:14px;margin:0 0 12px;">Please contact us to receive your signing link and complete your deposit.</p>`
        }
        ${data.companyPhone ? `<p style="margin-top:12px;font-size:15px;color:#555;">Questions? Call us: <strong style="color:#8B4513;">${data.companyPhone}</strong></p>` : ""}
      </div>
    </div>
    <!-- Footer -->
    <div style="background:#f5f5f0;padding:16px 32px;text-align:center;border-top:1px solid #e5e2dc;">
      <p style="font-size:11px;color:#999;margin:0;">${data.companyName} · ${data.companyLocation}</p>
    </div>
  </div>
</body>
</html>`;

    const body = {
      type: "Email",
      contactId,
      locationId,
      emailFrom: `noreply@${locationId}.mailgun.org`,
      emailTo: data.customerEmail,
      subject,
      html,
    };

    console.log("[GHL] Sending estimate email to:", data.customerEmail, "contactId:", contactId);
    const res = await fetch(`${GHL_BASE}/conversations/messages`, {
      method: "POST",
      headers: ghlHeaders(apiKey),
      body: JSON.stringify(body),
    });

    const json = await res.json() as any;

    if (!res.ok) {
      console.error("[GHL] Send email failed:", res.status, JSON.stringify(json));
      return { success: false, error: `GHL email send failed (${res.status}): ${json?.message || JSON.stringify(json)}` };
    }
    console.log("[GHL] Estimate email sent successfully to:", data.customerEmail, "messageId:", json?.id || json?.messageId);
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[GHL] Send email error:", msg);
    return { success: false, error: msg };
  }
}

/**
 * Send a "Your signed contract" confirmation email to the customer.
 * Includes a link to download the PDF from S3 and a summary of their order.
 */
export async function ghlSendSignedContractEmail(
  apiKey: string,
  locationId: string,
  contactId: string,
  opts: {
    customerName: string;
    customerEmail: string;
    companyName: string;
    companyPhone: string;
    companyLocation: string;
    collectionName: string;
    sqft: number;
    grandTotal: number;
    depositAmount: number;
    signedName: string;
    signedAt: Date;
    orderId: number;
    pdfUrl: string;
    checkoutUrl: string;
  }
): Promise<{ success: boolean; error?: string }> {
  const fmtCur = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

  const subject = `Your Signed Contract — ${opts.companyName} (Order #${opts.orderId})`;

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:Georgia,serif;background:#faf9f7;margin:0;padding:0;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border:1px solid #e5e2dc;">
    <div style="background:#2c2c2c;padding:28px 32px;">
      <h1 style="color:#fff;margin:0;font-size:22px;font-weight:400;letter-spacing:0.5px;">${opts.companyName}</h1>
      <p style="color:#d4c5b0;margin:4px 0 0;font-size:13px;">${opts.companyLocation}${opts.companyPhone ? ` · ${opts.companyPhone}` : ""}</p>
    </div>
    <div style="padding:32px;">
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
        <p style="color:#15803d;font-size:16px;font-weight:700;margin:0 0 4px;">✅ Contract Signed Successfully</p>
        <p style="color:#166534;font-size:13px;margin:0;">Your signed contract has been recorded. A copy is attached below.</p>
      </div>

      <p style="font-size:16px;color:#333;">Hi ${opts.customerName},</p>
      <p style="color:#555;line-height:1.7;">Thank you for signing your contract with ${opts.companyName}. Here is a summary of your order and a link to download your signed contract PDF for your records.</p>

      <h2 style="color:#8B4513;margin-top:24px;">Order Summary</h2>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <tr><td style="padding:6px 0;color:#666;width:160px;">Order #</td><td style="padding:6px 0;color:#333;font-weight:600;">${opts.orderId}</td></tr>
        <tr><td style="padding:6px 0;color:#666;">Collection</td><td style="padding:6px 0;color:#333;font-weight:600;">${opts.collectionName}</td></tr>
        <tr><td style="padding:6px 0;color:#666;">Area</td><td style="padding:6px 0;color:#333;font-weight:600;">${opts.sqft} sq ft</td></tr>
        <tr><td style="padding:6px 0;color:#666;">Project Total</td><td style="padding:6px 0;color:#333;font-weight:600;">${fmtCur(opts.grandTotal)}</td></tr>
        <tr><td style="padding:6px 0;color:#666;">Deposit Due</td><td style="padding:6px 0;color:#c0855a;font-weight:700;">${fmtCur(opts.depositAmount)}</td></tr>
        <tr><td style="padding:6px 0;color:#666;">Signed By</td><td style="padding:6px 0;color:#333;font-weight:600;">${opts.signedName}</td></tr>
        <tr><td style="padding:6px 0;color:#666;">Signed At</td><td style="padding:6px 0;color:#333;font-weight:600;">${opts.signedAt.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}</td></tr>
      </table>

      <div style="margin-top:28px;text-align:center;">
        <a href="${opts.pdfUrl}" style="display:inline-block;background:#2c2c2c;color:#fff;text-decoration:none;padding:12px 28px;border-radius:6px;font-size:15px;font-weight:600;margin-right:12px;">📄 Download Signed Contract</a>
      </div>

      ${opts.checkoutUrl ? `
      <div style="margin-top:28px;text-align:center;background:#fdf8f4;border:2px solid #c0855a;border-radius:8px;padding:24px 32px;">
        <p style="color:#333;font-size:16px;font-weight:600;margin:0 0 8px;">Complete Your Deposit</p>
        <p style="color:#555;font-size:14px;margin:0 0 20px;">Your 50% deposit of ${fmtCur(opts.depositAmount)} is due to lock in your project date.</p>
        <a href="${opts.checkoutUrl}" style="display:inline-block;background:#8B4513;color:#fff;text-decoration:none;padding:14px 32px;border-radius:6px;font-size:16px;font-weight:600;">💳 Pay Deposit Now</a>
      </div>` : ""}

      <div style="margin-top:28px;padding:16px;background:#fdf8f4;border-left:3px solid #c0855a;border-radius:4px;">
        <p style="font-size:12px;color:#777;margin:0;line-height:1.6;">If you have any questions about your contract or project, please contact us at ${opts.companyPhone || opts.companyName}.</p>
      </div>
    </div>
    <div style="background:#f5f5f0;padding:16px 32px;text-align:center;border-top:1px solid #e5e2dc;">
      <p style="font-size:11px;color:#999;margin:0;">${opts.companyName} · ${opts.companyLocation}</p>
    </div>
  </div>
</body>
</html>`;

  try {
    const body = {
      type: "Email",
      contactId,
      locationId,
      emailFrom: `noreply@${locationId}.mailgun.org`,
      emailTo: opts.customerEmail,
      subject,
      html,
    };

    console.log("[GHL] Sending signed contract email to:", opts.customerEmail);
    const res = await fetch(`${GHL_BASE}/conversations/messages`, {
      method: "POST",
      headers: ghlHeaders(apiKey),
      body: JSON.stringify(body),
    });

    const json = await res.json() as any;
    if (!res.ok) {
      console.error("[GHL] Send signed contract email failed:", res.status, JSON.stringify(json));
      return { success: false, error: `GHL email failed (${res.status}): ${json?.message || JSON.stringify(json)}` };
    }
    console.log("[GHL] Signed contract email sent successfully to:", opts.customerEmail, "messageId:", json?.id || json?.messageId);
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[GHL] Send signed contract email error:", msg);
    return { success: false, error: msg };
  }
}

/**
 * Full estimate flow: upsert contact → create opportunity → send email.
 * Returns success/error. Individual step failures are logged but don't block the email.
 */
export async function ghlSendEstimate(
  apiKey: string,
  locationId: string,
  data: GhlEstimateData
): Promise<{ success: boolean; contactId?: string; opportunityId?: string; error?: string }> {
  // Step 1: Upsert contact
  const { contactId, error: contactError } = await ghlUpsertContact(apiKey, locationId, data);

  if (!contactId) {
    return { success: false, error: contactError || "Failed to create GHL contact" };
  }

  // Step 2: Create opportunity (non-blocking — log error but continue)
  let opportunityId: string | undefined;
  try {
    const oppResult = await ghlCreateOpportunity(apiKey, locationId, contactId, data);
    if (oppResult.opportunityId) {
      opportunityId = oppResult.opportunityId;
    } else {
      console.warn("[GHL] Opportunity creation failed (non-blocking):", oppResult.error);
    }
  } catch (e) {
    console.warn("[GHL] Opportunity creation threw (non-blocking):", e);
  }

  // Step 3: Send email
  const { success, error: emailError } = await ghlSendEmail(apiKey, locationId, contactId, data);

  if (!success) {
    return { success: false, contactId, opportunityId, error: emailError };
  }

  return { success: true, contactId, opportunityId };
}
