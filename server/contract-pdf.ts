/**
 * contract-pdf.ts
 *
 * Generates a professional signed-contract PDF using PDFKit.
 * Returns a Buffer that can be base64-encoded for Zapier or uploaded to S3.
 */

import PDFDocument from "pdfkit";

export interface EstimateLineItem {
  name: string;
  cost: number;
}

export interface ContractPdfData {
  contractText: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  customerAddress?: string;
  collectionName: string;
  sqft: number;
  grandTotal: number;
  depositAmount: number;
  balanceAmount: number;
  signedName: string;
  signedAt: Date;
  orderId: number;
  companyName?: string;
  /** When true, renders a prominent "BUILDER PRICING" badge on the contract */
  isBuilderPricing?: boolean;
  /** Post & Beam Wrap details */
  postWrap?: {
    optionName: string;
    postPieces: { lengthFt: number; count: number; priceEach: number }[];
    beamPieces: { lengthFt: number; count: number; priceEach: number }[];
    materialCost: number;
    laborCost: number;
    totalCost: number;
  };
  /** Parsed from estimateSnapshot — all cost line items to display in the PDF */
  lineItems?: EstimateLineItem[];
  /** High-level cost categories for the summary table */
  costCategories?: {
    materials?: number;
    labor?: number;
    delivery?: number;
    demoRebuild?: number;
    rainEscape?: number;
    accessories?: number;
    tax?: number;
    permit?: number;
  };
  /** Site photos to embed directly in the PDF — each is a Buffer of image bytes */
  sitePhotos?: Array<{
    imageBuffer: Buffer;
    caption: string;
    category: string;
  }>;
}

function fmt(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

/** Returns true if the line item name represents a subfloor charge */
function isSubfloor(name: string): boolean {
  return name.toLowerCase().includes("subfloor");
}

export function generateContractPdf(data: ContractPdfData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "LETTER",
      margins: { top: 60, bottom: 60, left: 72, right: 72 },
      info: {
        Title: "Material Purchase Agreement",
        Author: data.companyName || "Design Your Price",
        Subject: `Order #${data.orderId} -- ${data.customerName}`,
        CreationDate: data.signedAt,
      },
    });

    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const DARK = "#1a1a1a";
    const ACCENT = "#8B4513"; // canyon rust
    const MUTED = "#666666";
    const LIGHT_GRAY = "#f5f5f5";
    const SUBFLOOR_HIGHLIGHT = "#fff8f0"; // warm tint for subfloor rows
    const BUILDER_BG = "#92400e";   // deep amber-brown for builder badge bg
    const BUILDER_TEXT = "#ffffff"; // white text on builder badge
    const BUILDER_BORDER = "#d97706"; // amber border

    // -- Header --
    doc
      .fillColor(ACCENT)
      .fontSize(20)
      .font("Helvetica-Bold")
      .text(data.companyName || "Design Your Price", { align: "center" });

    doc
      .fillColor(MUTED)
      .fontSize(10)
      .font("Helvetica")
      .text("Material Purchase Agreement", { align: "center" });

    doc.moveDown(0.3);

    // Thin rule
    doc
      .moveTo(72, doc.y)
      .lineTo(doc.page.width - 72, doc.y)
      .strokeColor(ACCENT)
      .lineWidth(1.5)
      .stroke();

    doc.moveDown(0.8);

    // -- Builder Pricing Badge (only when isBuilderPricing is true) --
    if (data.isBuilderPricing) {
      const badgeX = 72;
      const badgeW = doc.page.width - 144;
      const badgeH = 28;
      const badgeY = doc.y;

      // Badge background
      doc.rect(badgeX, badgeY, badgeW, badgeH).fillColor(BUILDER_BG).fill();

      // Left accent stripe
      doc.rect(badgeX, badgeY, 5, badgeH).fillColor(BUILDER_BORDER).fill();

      // Badge text — centered
      doc
        .fillColor(BUILDER_TEXT)
        .fontSize(10)
        .font("Helvetica-Bold")
        .text("★  BUILDER / CONTRACTOR PRICING APPLIED  ★", badgeX + 5, badgeY + 8, {
          width: badgeW - 10,
          align: "center",
        });

      doc.y = badgeY + badgeH + 14;
    } else {
      doc.moveDown(0.2);
    }

    // -- Order meta --
    const metaY = doc.y;
    doc
      .fillColor(DARK)
      .fontSize(9)
      .font("Helvetica-Bold")
      .text(`Order #${data.orderId}`, 72, metaY)
      .font("Helvetica")
      .fillColor(MUTED)
      .text(
        `Signed: ${data.signedAt.toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}`,
        72,
        metaY + 14
      );

    doc.moveDown(2.5);

    // -- Customer & order summary box --
    const boxX = 72;
    const boxW = doc.page.width - 144;
    const boxY = doc.y;
    const summaryLines = [
      ["Customer", data.customerName],
      ["Email", data.customerEmail],
      ...(data.customerPhone ? [["Phone", data.customerPhone]] : []),
      ...(data.customerAddress ? [["Address", data.customerAddress]] : []),
      ["Product", `${data.collectionName} -- ${data.sqft} sq ft`],
      ...(data.isBuilderPricing ? [["Pricing Type", "Builder / Contractor Pricing (10% off materials, 15% off labor)"]] : []),
      ["Total Estimate", fmt(data.grandTotal)],
      ["Deposit Due", fmt(data.depositAmount)],
      ["Balance Due on Delivery", fmt(data.balanceAmount)],
    ] as [string, string][];

    const lineH = 18;
    const boxH = summaryLines.length * lineH + 20;

    doc.rect(boxX, boxY, boxW, boxH).fillColor(LIGHT_GRAY).fill();

    // If builder pricing, draw a subtle amber left border on the summary box
    if (data.isBuilderPricing) {
      doc.rect(boxX, boxY, 4, boxH).fillColor(BUILDER_BORDER).fill();
    }

    summaryLines.forEach(([label, value], i) => {
      const y = boxY + 10 + i * lineH;
      const isBuilderRow = label === "Pricing Type";
      doc
        .fillColor(isBuilderRow ? BUILDER_BG : MUTED)
        .fontSize(8.5)
        .font("Helvetica-Bold")
        .text(label + ":", boxX + 10, y, { width: 140, continued: false });
      doc
        .fillColor(isBuilderRow ? BUILDER_BG : DARK)
        .font(isBuilderRow ? "Helvetica-Bold" : "Helvetica")
        .text(value, boxX + 155, y, { width: boxW - 165 });
    });

    doc.y = boxY + boxH + 20;

    // -- Estimate Breakdown Table --
    // Build rows from lineItems (detailed) or costCategories (summary)
    const tableRows: Array<{ label: string; amount: number; isSubfloor: boolean; isDiscount: boolean; note?: string }> = [];

    if (data.lineItems && data.lineItems.length > 0) {
      // Detailed line items from estimateSnapshot
      for (const item of data.lineItems) {
        const sf = isSubfloor(item.name);
        const isDiscount = item.cost < 0;
        tableRows.push({
          label: item.name,
          amount: item.cost,
          isSubfloor: sf,
          isDiscount,
          note: sf ? "Required for Rainier waterproof system" : undefined,
        });
      }
    } else if (data.costCategories) {
      // Fallback: high-level categories
      const cats = data.costCategories;
      if (cats.materials) tableRows.push({ label: "Materials", amount: cats.materials, isSubfloor: false, isDiscount: false });
      if (cats.labor) tableRows.push({ label: "Labor", amount: cats.labor, isSubfloor: false, isDiscount: false });
      if (cats.delivery) tableRows.push({ label: "Delivery", amount: cats.delivery, isSubfloor: false, isDiscount: false });
      if (cats.demoRebuild) tableRows.push({ label: "Demo & Rebuild", amount: cats.demoRebuild, isSubfloor: false, isDiscount: false });
      if (cats.rainEscape) tableRows.push({ label: "RainEscape System", amount: cats.rainEscape, isSubfloor: false, isDiscount: false });
      if (cats.accessories) tableRows.push({ label: "Accessories", amount: cats.accessories, isSubfloor: false, isDiscount: false });
      if (cats.permit) tableRows.push({ label: "Permit", amount: cats.permit, isSubfloor: false, isDiscount: false });
      if (cats.tax) tableRows.push({ label: "Tax", amount: cats.tax, isSubfloor: false, isDiscount: false });
    }

    // -- Post & Beam Wrap Scope Section --
    if (data.postWrap && data.postWrap.totalCost > 0) {
      doc
        .fillColor(ACCENT)
        .fontSize(11)
        .font("Helvetica-Bold")
        .text("Post & Beam Wrap");

      doc.moveDown(0.3);

      const wrapBoxX = 72;
      const wrapBoxW = doc.page.width - 144;
      const wrapBoxY = doc.y;
      const wrapRows: [string, string][] = [
        ["Wrap Style", data.postWrap.optionName],
      ];

      // Post pieces
      if (data.postWrap.postPieces.length > 0) {
        const postDesc = data.postWrap.postPieces
          .map(p => `${p.count} × ${p.lengthFt}' pieces`)
          .join(", ");
        wrapRows.push(["Post Wrap Material", postDesc]);
      }

      // Beam pieces
      if (data.postWrap.beamPieces.length > 0) {
        const beamDesc = data.postWrap.beamPieces
          .map(p => `${p.count} × ${p.lengthFt}' pieces`)
          .join(", ");
        wrapRows.push(["Beam Wrap Material", beamDesc]);
      }

      wrapRows.push(["Material Subtotal", fmt(data.postWrap.materialCost)]);
      if (data.postWrap.laborCost > 0) {
        wrapRows.push(["Labor Subtotal", fmt(data.postWrap.laborCost)]);
      }
      wrapRows.push(["Wrap Total", fmt(data.postWrap.totalCost)]);

      const wrapLineH = 18;
      const wrapBoxH = wrapRows.length * wrapLineH + 20;
      doc.rect(wrapBoxX, wrapBoxY, wrapBoxW, wrapBoxH).fillColor(LIGHT_GRAY).fill();
      // Accent left stripe
      doc.rect(wrapBoxX, wrapBoxY, 4, wrapBoxH).fillColor(ACCENT).fill();

      wrapRows.forEach(([label, value], i) => {
        const y = wrapBoxY + 10 + i * wrapLineH;
        const isTotal = label === "Wrap Total";
        doc
          .fillColor(MUTED)
          .fontSize(8.5)
          .font(isTotal ? "Helvetica-Bold" : "Helvetica-Bold")
          .text(label + ":", wrapBoxX + 10, y, { width: 140, continued: false });
        doc
          .fillColor(isTotal ? ACCENT : DARK)
          .font(isTotal ? "Helvetica-Bold" : "Helvetica")
          .text(value, wrapBoxX + 155, y, { width: wrapBoxW - 165 });
      });

      doc.y = wrapBoxY + wrapBoxH + 16;
    }

    if (tableRows.length > 0) {
      // Section heading
      doc
        .fillColor(ACCENT)
        .fontSize(11)
        .font("Helvetica-Bold")
        .text("Estimate Breakdown");

      doc.moveDown(0.4);

      // Table header row
      const tblX = 72;
      const tblW = doc.page.width - 144;
      const amtColW = 100;
      const labelColW = tblW - amtColW;
      const rowH = 16;

      // Header background
      doc.rect(tblX, doc.y, tblW, rowH).fillColor("#e8e0d8").fill();
      const hdrY = doc.y + 3;
      doc
        .fillColor(DARK)
        .fontSize(8.5)
        .font("Helvetica-Bold")
        .text("Description", tblX + 8, hdrY, { width: labelColW - 16 });
      doc.text("Amount", tblX + labelColW, hdrY, { width: amtColW - 8, align: "right" });

      doc.y = doc.y + rowH;

      // Data rows
      tableRows.forEach((row, idx) => {
        const rowY = doc.y;
        const bgColor = row.isDiscount
          ? "#fffbeb"   // warm yellow tint for discount rows
          : row.isSubfloor
          ? SUBFLOOR_HIGHLIGHT
          : idx % 2 === 0
          ? "#ffffff"
          : LIGHT_GRAY;

        doc.rect(tblX, rowY, tblW, rowH).fillColor(bgColor).fill();

        // Label
        const labelColor = row.isDiscount ? BUILDER_BG : row.isSubfloor ? ACCENT : DARK;
        doc
          .fillColor(labelColor)
          .fontSize(8)
          .font(row.isDiscount || row.isSubfloor ? "Helvetica-Bold" : "Helvetica")
          .text(row.label, tblX + 8, rowY + 4, { width: labelColW - 16 });

        // Amount — discount rows show in amber/builder color
        const amtColor = row.isDiscount ? BUILDER_BG : DARK;
        doc
          .fillColor(amtColor)
          .font(row.isDiscount ? "Helvetica-Bold" : "Helvetica")
          .text(fmt(row.amount), tblX + labelColW, rowY + 4, {
            width: amtColW - 8,
            align: "right",
          });

        doc.y = rowY + rowH;

        // Note line for subfloor
        if (row.note) {
          doc
            .fillColor(MUTED)
            .fontSize(7)
            .font("Helvetica-Oblique")
            .text(`  * ${row.note}`, tblX + 8, doc.y, { width: tblW - 16 });
          doc.moveDown(0.2);
        }
      });

      // Total row
      const totY = doc.y;
      doc.rect(tblX, totY, tblW, rowH + 2).fillColor("#e8e0d8").fill();
      doc
        .fillColor(DARK)
        .fontSize(9)
        .font("Helvetica-Bold")
        .text("TOTAL", tblX + 8, totY + 4, { width: labelColW - 16 });
      doc
        .fillColor(ACCENT)
        .font("Helvetica-Bold")
        .text(fmt(data.grandTotal), tblX + labelColW, totY + 4, {
          width: amtColW - 8,
          align: "right",
        });

      doc.y = totY + rowH + 2;
      doc.moveDown(1.2);
    }

    // -- Contract body --
    doc
      .fillColor(DARK)
      .fontSize(10)
      .font("Helvetica")
      .text(data.contractText, {
        align: "justify",
        lineGap: 3,
      });

    doc.moveDown(1.5);

    // -- Signature block --
    doc
      .moveTo(72, doc.y)
      .lineTo(doc.page.width - 72, doc.y)
      .strokeColor("#cccccc")
      .lineWidth(0.5)
      .stroke();

    doc.moveDown(1);

    doc
      .fillColor(DARK)
      .fontSize(10)
      .font("Helvetica-Bold")
      .text("DIGITAL SIGNATURE");

    doc.moveDown(0.5);

    doc
      .fillColor(MUTED)
      .fontSize(9)
      .font("Helvetica")
      .text(
        "By typing their name below, the Buyer has acknowledged reading and agreeing to all terms of this Agreement."
      );

    doc.moveDown(0.8);

    // Signature line
    const sigY = doc.y;
    doc
      .fillColor(ACCENT)
      .fontSize(16)
      .font("Helvetica-BoldOblique")
      .text(data.signedName, 72, sigY);

    doc
      .moveTo(72, sigY + 24)
      .lineTo(280, sigY + 24)
      .strokeColor(DARK)
      .lineWidth(0.8)
      .stroke();

    doc
      .fillColor(MUTED)
      .fontSize(8)
      .font("Helvetica")
      .text("Buyer Signature (Digital)", 72, sigY + 28);

    // Date
    doc
      .fillColor(DARK)
      .fontSize(11)
      .font("Helvetica")
      .text(
        data.signedAt.toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
        320,
        sigY
      );

    doc
      .moveTo(320, sigY + 24)
      .lineTo(520, sigY + 24)
      .strokeColor(DARK)
      .lineWidth(0.8)
      .stroke();

    doc
      .fillColor(MUTED)
      .fontSize(8)
      .font("Helvetica")
      .text("Date", 320, sigY + 28);

    doc.moveDown(3);

    // -- Footer --
    doc
      .moveTo(72, doc.y)
      .lineTo(doc.page.width - 72, doc.y)
      .strokeColor("#cccccc")
      .lineWidth(0.5)
      .stroke();

    doc.moveDown(0.5);

    doc
      .fillColor(MUTED)
      .fontSize(8)
      .font("Helvetica")
      .text(
        `This document was electronically signed on ${data.signedAt.toISOString()} and constitutes a legally binding agreement. Order #${data.orderId}.`,
        { align: "center" }
      );

    // -- Site Photos Page --
    if (data.sitePhotos && data.sitePhotos.length > 0) {
      doc.addPage();

      // Page header
      doc
        .fillColor(ACCENT)
        .fontSize(16)
        .font("Helvetica-Bold")
        .text("Site Photos", { align: "center" });

      doc
        .fillColor(MUTED)
        .fontSize(9)
        .font("Helvetica")
        .text(`${data.sitePhotos.length} photo${data.sitePhotos.length !== 1 ? "s" : ""} captured during estimate appointment`, { align: "center" });

      doc.moveDown(0.5);

      // Thin rule
      doc
        .moveTo(72, doc.y)
        .lineTo(doc.page.width - 72, doc.y)
        .lineWidth(0.5)
        .strokeColor(ACCENT)
        .stroke();

      doc.moveDown(0.5);

      const CATEGORY_LABELS: Record<string, string> = {
        "site": "Site Overview",
        "materials": "Materials",
        "existing-deck": "Existing Deck",
        "damage": "Damage / Issues",
        "other": "Other",
      };

      // Layout: 2 photos per row
      const pageWidth = doc.page.width - 144; // margins
      const photoW = (pageWidth - 16) / 2;   // 2 cols with 16px gap
      const photoH = photoW * 0.75;           // 4:3 aspect ratio
      const colGap = 16;
      const rowGap = 28; // space for caption below

      let col = 0;
      let rowStartY = doc.y;

      for (let i = 0; i < data.sitePhotos.length; i++) {
        const photo = data.sitePhotos[i];
        const x = 72 + col * (photoW + colGap);
        const y = rowStartY;

        // Check if we need a new page
        if (y + photoH + rowGap > doc.page.height - 80) {
          doc.addPage();
          rowStartY = doc.y;
          col = 0;
        }

        const imgX = 72 + col * (photoW + colGap);
        const imgY = rowStartY;

        // Draw photo border
        doc
          .rect(imgX - 1, imgY - 1, photoW + 2, photoH + 2)
          .lineWidth(0.5)
          .strokeColor("#e5e2dc")
          .stroke();

        // Embed image
        try {
          doc.image(photo.imageBuffer, imgX, imgY, {
            width: photoW,
            height: photoH,
            cover: [photoW, photoH],
          });
        } catch {
          // If image fails to embed, draw a placeholder
          doc
            .rect(imgX, imgY, photoW, photoH)
            .fillColor("#f5f5f0")
            .fill();
          doc
            .fillColor(MUTED)
            .fontSize(8)
            .text("[Image unavailable]", imgX, imgY + photoH / 2 - 8, { width: photoW, align: "center" });
        }

        // Category badge
        const catLabel = CATEGORY_LABELS[photo.category] ?? photo.category;
        doc
          .fillColor("#ffffff")
          .rect(imgX + 4, imgY + 4, catLabel.length * 5 + 8, 14)
          .fill();
        doc
          .fillColor(ACCENT)
          .fontSize(7)
          .font("Helvetica-Bold")
          .text(catLabel, imgX + 8, imgY + 6);

        // Caption below photo
        if (photo.caption) {
          doc
            .fillColor(DARK)
            .fontSize(8)
            .font("Helvetica")
            .text(photo.caption, imgX, imgY + photoH + 4, { width: photoW, ellipsis: true });
        } else {
          doc
            .fillColor(MUTED)
            .fontSize(8)
            .font("Helvetica")
            .text(`Photo ${i + 1}`, imgX, imgY + photoH + 4, { width: photoW });
        }

        // Advance column
        col++;
        if (col >= 2) {
          col = 0;
          rowStartY += photoH + rowGap + 8;
        }
      }
    }

    doc.end();
  });
}
