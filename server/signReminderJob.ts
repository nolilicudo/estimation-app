/**
 * Scheduled job: send a follow-up reminder email to customers who have a
 * pending (unsigned) sign request that is at least 3 days old.
 *
 * Runs once per day at 9:00 AM server time.
 * Uses GoHighLevel to send the reminder email (same as the original estimate email).
 */

import { getPendingSignRequestsOlderThan, updateSignRequest, getFullConfig } from "./db";
import { ENV } from "./_core/env";

async function sendReminderEmails() {
  if (!ENV.ghlApiKey || !ENV.ghlLocationId) {
    console.log("[SignReminder] GHL not configured — skipping reminder run");
    return;
  }

  // Read settings from DB (with safe defaults)
  let reminderAfterDays = 3;
  let maxReminders = 2;
  try {
    const config = await getFullConfig();
    if (config?.settings) {
      const afterDays = parseInt(config.settings.sign_reminder_after_days || "3", 10);
      const maxR = parseInt(config.settings.sign_reminder_max_count || "2", 10);
      if (!isNaN(afterDays) && afterDays > 0) reminderAfterDays = afterDays;
      if (!isNaN(maxR) && maxR >= 0) maxReminders = maxR;
    }
  } catch (err) {
    console.warn("[SignReminder] Could not read settings, using defaults:", err);
  }

  console.log(`[SignReminder] Settings: remind after ${reminderAfterDays} days, max ${maxReminders} reminders`);

  const cutoff = new Date(Date.now() - reminderAfterDays * 24 * 60 * 60 * 1000);
  let pending;
  try {
    pending = await getPendingSignRequestsOlderThan(cutoff);
  } catch (err) {
    console.error("[SignReminder] Failed to query pending sign requests:", err);
    return;
  }

  if (!pending.length) {
    console.log("[SignReminder] No pending sign requests older than 3 days");
    return;
  }

  console.log(`[SignReminder] Found ${pending.length} pending sign request(s) — sending reminders`);

  const { ghlUpsertContact, ghlSendEmail } = await import("./ghl");
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

  let sent = 0;
  let failed = 0;

  for (const req of pending) {
    // Skip if already expired
    if (req.expiresAt && new Date(req.expiresAt) < new Date()) {
      // Mark as expired in DB
      try {
        await updateSignRequest(req.id, { status: "expired" });
      } catch {}
      continue;
    }

    // Skip if max reminders already sent
    const currentCount = req.reminderCount ?? 0;
    if (currentCount >= maxReminders) {
      console.log(`[SignReminder] Request #${req.id} already has ${currentCount} reminder(s) — skipping (max: ${maxReminders})`);
      continue;
    }

    const signUrl = `https://app.designyourpricedecks.com/sign/${req.token}`;

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
      estimateDisclaimer:
        "This estimate is valid for 30 days. Prices subject to change based on material availability.",
      companyName: "Design Your Price",
      companyPhone: "801-762-8267",
      companyLocation: "Orem, Utah",
      signUrl,
    };

    try {
      const { contactId } = await ghlUpsertContact(ENV.ghlApiKey, ENV.ghlLocationId, ghlData);
      if (!contactId) {
        console.warn(`[SignReminder] Could not upsert GHL contact for request #${req.id}`);
        failed++;
        continue;
      }

      // Build a reminder-specific email body by overriding the subject/intro
      const reminderData = {
        ...ghlData,
        // Append a reminder note to the scope of work so the email body reflects this is a follow-up
        scopeOfWork:
          `[REMINDER — your estimate is still waiting for your signature]\n\n` +
          ghlData.scopeOfWork,
      };

      const result = await ghlSendEmail(ENV.ghlApiKey, ENV.ghlLocationId, contactId, reminderData);
      if (result.success) {
        console.log(`[SignReminder] Reminder sent for request #${req.id} → ${req.customerEmail}`);
        // Increment reminder count and update lastReminderAt
        try {
          await updateSignRequest(req.id, {
            reminderCount: currentCount + 1,
            lastReminderAt: new Date(),
          });
        } catch (updateErr) {
          console.warn(`[SignReminder] Failed to update reminder count for #${req.id}:`, updateErr);
        }
        sent++;
      } else {
        console.warn(`[SignReminder] Email failed for request #${req.id}:`, result.error);
        failed++;
      }
    } catch (err) {
      console.error(`[SignReminder] Unexpected error for request #${req.id}:`, err);
      failed++;
    }
  }

  console.log(`[SignReminder] Done: ${sent} sent, ${failed} failed`);
}

const REMINDER_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
const REMINDER_CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000; // re-check every 4 hours

let lastReminderRun: Date | null = null;
let reminderRunning = false;

async function runRemindersIfDue() {
  if (reminderRunning) return;
  const now = Date.now();
  const msSinceLast = lastReminderRun ? now - lastReminderRun.getTime() : Infinity;
  if (msSinceLast < REMINDER_INTERVAL_MS) {
    const hoursUntilNext = ((REMINDER_INTERVAL_MS - msSinceLast) / 3_600_000).toFixed(1);
    console.log(`[SignReminder] Last run was ${(msSinceLast / 3_600_000).toFixed(1)}h ago — next in ~${hoursUntilNext}h`);
    return;
  }
  reminderRunning = true;
  lastReminderRun = new Date();
  console.log("[SignReminder] Running daily pending-signature reminder check…");
  try {
    await sendReminderEmails();
  } catch (err) {
    console.error("[SignReminder] Error during reminder run:", err);
  } finally {
    reminderRunning = false;
  }
}

export function startSignReminderJob() {
  if (!ENV.ghlApiKey) {
    console.log("[SignReminder] GHL_API_KEY not set — reminder job disabled");
    return;
  }

  // Check on startup (catches up after hibernation)
  runRemindersIfDue().catch((err) =>
    console.error("[SignReminder] Startup check error:", err)
  );

  // Re-check every 4 hours so we never miss a day by more than 4h
  setInterval(() => {
    runRemindersIfDue().catch((err) =>
      console.error("[SignReminder] Interval check error:", err)
    );
  }, REMINDER_CHECK_INTERVAL_MS);

  console.log("[SignReminder] Daily reminder job scheduled (checked every 4h)");
}
