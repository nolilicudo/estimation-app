/**
 * Jobtread API helper — Pave query-language client
 *
 * All field names have been validated against the live Jobtread Pave API.
 *
 * Key findings from API testing:
 *  - `email` does NOT exist on `account` or `contact` nodes
 *  - `email` does NOT exist as a filter on `organization.contacts`
 *  - Customer lookup is done by name (organization.accounts where name = ...)
 *  - `createJob` does NOT accept `organizationId` (inferred from grant key)
 *  - `createBudgetItem` does NOT exist — use `createCostGroup` + `createCostItem`
 *  - `createCostItem` requires `costCodeId` and `costTypeId`
 *  - `createDocument` requires: fromName, taxRate, jobLocationAddress/Name, dueDate
 *  - `createDocument` name must be one of the org's document templates
 *    (e.g. "Design Package", "Building Plan >$100k", "Material Selection", etc.)
 *
 * Workflow:
 *  1. Find customer account by name → or create new account
 *  2. Create location (project address)
 *  3. Create job (project) — organizationId NOT passed (inferred)
 *  4. Create cost group + cost item (budget line item)
 *  5. Create proposal document sent to client email
 */

const JOBTREAD_API_URL = "https://api.jobtread.com/pave";

// Org-level IDs fetched once and cached — these are stable for the org
// "Uncategorized" cost code and "Other" cost type are the safest defaults
const DEFAULT_COST_CODE_ID = "22Na3vQzgtCd"; // Uncategorized
const DEFAULT_COST_TYPE_ID = "22Na3vR52iPe"; // Other

export interface JobtreadProjectInput {
  grantKey: string;
  orgId: string;
  /** Homeowner full name */
  customerName: string;
  /** Homeowner email — proposal is sent here */
  customerEmail: string;
  /** Homeowner phone (optional) */
  customerPhone?: string;
  /** Project address */
  customerAddress?: string;
  /** Project city */
  customerCity?: string;
  /** Human-readable project description e.g. "Bathroom Remodel Design Package" */
  projectDescription: string;
  /** Lump-sum total in dollars */
  totalAmount: number;
  /** Scope of work text for the contract body */
  scopeOfWork: string;
  /** Contract / proposal body text */
  contractText?: string;
  /**
   * Optional: override the budget line item name.
   * Defaults to projectDescription.
   */
  budgetLineItemName?: string;
  /**
   * Optional: name for the cost group (budget section header).
   * Defaults to budgetLineItemName or projectDescription.
   * Use the project type label here (e.g. "Addition", "Bathroom Remodel").
   */
  costGroupName?: string;
  /**
   * Optional: individual service line items to add to the budget.
   * If provided, each service gets its own cost item under the cost group.
   * If omitted, a single lump-sum line item is created.
   */
  services?: BudgetServiceItem[];
  /**
   * Optional: company name shown in the "From" field of the proposal.
   * Defaults to "Design Your Price".
   */
  fromName?: string;
  /** Sales rep email — shown in "Prepared By" on the proposal */
  salesRepEmail?: string;
  /** Sales rep phone — embedded in fromName since API has no fromPhone field */
  salesRepPhone?: string;
  /** Company office address — shown in "Prepared By" on the proposal */
  companyAddress?: string;
}

export interface JobtreadProjectResult {
  success: boolean;
  jobId?: string;
  documentId?: string;
  error?: string;
}

/** Low-level Pave query executor */
async function pave(
  grantKey: string,
  query: Record<string, unknown>,
  label?: string,
): Promise<Record<string, unknown>> {
  const body = JSON.stringify({
    query: {
      $: { grantKey },
      ...query,
    },
  });

  const res = await fetch(JOBTREAD_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`[Jobtread] ${label ?? "pave"} HTTP ${res.status} ERROR:`, text);
    throw new Error(`Jobtread API HTTP ${res.status} (${label ?? "pave"}): ${text}`);
  }

  const json = (await res.json()) as Record<string, unknown>;
  if ((json as any).errors) {
    console.error(
      `[Jobtread] ${label ?? "pave"} API ERRORS:`,
      JSON.stringify((json as any).errors),
    );
    throw new Error(
      `Jobtread API errors (${label ?? "pave"}): ${JSON.stringify((json as any).errors)}`,
    );
  }
  return json;
}

/**
 * Find or create a customer account.
 *
 * Search strategy:
 *   1. Query `organization.accounts` filtered by name (email search not supported by API).
 *   2. If not found, create a new account.
 *
 * Returns the account ID.
 */
async function upsertCustomer(
  grantKey: string,
  orgId: string,
  name: string,
): Promise<string> {
  // Step 1: Search accounts by name
  try {
    const searchResult = await pave(
      grantKey,
      {
        organization: {
          $: { id: orgId },
          accounts: {
            $: {
              where: [["name"], "=", name],
              size: 1,
            },
            nodes: {
              id: {},
              name: {},
            },
          },
        },
      },
      "searchAccountByName",
    );

    const nodes = (searchResult as any)?.organization?.accounts?.nodes ?? [];
    if (nodes.length > 0 && nodes[0]?.id) {
      console.log(`[Jobtread] Found existing account: ${nodes[0].id} (${nodes[0].name})`);
      return String(nodes[0].id);
    }
  } catch (err) {
    console.warn(
      "[Jobtread] Account search failed, creating new account:",
      err instanceof Error ? err.message : err,
    );
  }

  // Step 2: Create new customer account
  const createResult = await pave(
    grantKey,
    {
      createAccount: {
        $: {
          organizationId: orgId,
          name,
          type: "customer",
        },
        createdAccount: {
          id: {},
        },
      },
    },
    "createAccount",
  );

  const newId = (createResult as any)?.createAccount?.createdAccount?.id;
  if (!newId) throw new Error("Jobtread: failed to create customer account");
  console.log(`[Jobtread] Created new account: ${newId}`);
  return String(newId);
}

/**
 * Find or create a location for the customer.
 * Jobtread rejects duplicate addresses on the same account, so we search
 * existing locations first and reuse one if the address already exists.
 */
async function upsertLocation(
  grantKey: string,
  accountId: string,
  address: string,
  name: string,
): Promise<string> {
  // Step 1: Search existing locations on this account
  try {
    const searchResult = await pave(
      grantKey,
      {
        account: {
          $: { id: accountId },
          locations: {
            nodes: {
              id: {},
              address: {},
            },
          },
        },
      },
      "searchLocations",
    );

    const nodes = (searchResult as any)?.account?.locations?.nodes ?? [];
    // Normalize addresses for comparison (uppercase, trim)
    const normalizedInput = address.trim().toUpperCase();
    const existing = nodes.find(
      (n: any) => n?.address && n.address.trim().toUpperCase() === normalizedInput,
    );
    if (existing?.id) {
      console.log(`[Jobtread] Reusing existing location: ${existing.id} (${existing.address})`);
      return String(existing.id);
    }
  } catch (err) {
    console.warn(
      "[Jobtread] Location search failed, attempting to create:",
      err instanceof Error ? err.message : err,
    );
  }

  // Step 2: Create new location
  const result = await pave(
    grantKey,
    {
      createLocation: {
        $: {
          accountId,
          name,
          address,
        },
        createdLocation: {
          id: {},
        },
      },
    },
    "createLocation",
  );

  const locId = (result as any)?.createLocation?.createdLocation?.id;
  if (!locId) throw new Error("Jobtread: failed to create location");
  console.log(`[Jobtread] Created new location: ${locId}`);
  return String(locId);
}

/**
 * Create a job (project), return its ID.
 * NOTE: organizationId is NOT passed — it is inferred from the grant key.
 */
/** Truncate a string to maxLen characters, breaking at a word boundary if possible */
function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  const cut = str.slice(0, maxLen);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > maxLen * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd();
}

async function createJob(
  grantKey: string,
  locationId: string,
  name: string,
): Promise<string> {
  const result = await pave(
    grantKey,
    {
      createJob: {
        $: {
          locationId,
          // Jobtread enforces a 30-character limit on job names
          name: truncate(name, 30),
          // NOTE: description intentionally omitted — scope of work goes into
          // the proposal document body and budget cost item descriptions, NOT
          // the job dashboard description field.
        },
        createdJob: {
          id: {},
        },
      },
    },
    "createJob",
  );

  const jobId = (result as any)?.createJob?.createdJob?.id;
  if (!jobId) throw new Error("Jobtread: failed to create job");
  return String(jobId);
}

/**
 * Set a custom field value on a job.
 * Used to tag calculator-created jobs with source = "calculator"
 * so Jobtread Workflows can filter on them for auto-invoicing.
 */
async function setJobCustomField(
  grantKey: string,
  jobId: string,
  customFieldId: string,
  value: string,
): Promise<void> {
  if (!customFieldId) return; // Skip if not configured
  try {
    await pave(
      grantKey,
      {
        updateJob: {
          $: {
            id: jobId,
            customFieldValues: {
              [customFieldId]: value,
            },
          },
        },
      },
      "setJobCustomField",
    );
    console.log(`[Jobtread] Set custom field ${customFieldId} = "${value}" on job ${jobId}`);
  } catch (err) {
    // Non-fatal: log but don't fail the entire project creation
    console.warn(`[Jobtread] Failed to set custom field on job ${jobId}:`, err);
  }
}

export interface BudgetServiceItem {
  /** Display name of the service */
  name: string;
  /** Price in dollars (what the customer pays — becomes unitPrice) */
  amount: number;
  /** Optional detail (e.g. "3 renderings") */
  detail?: string;
  /** Scope of work text for this service — goes into the cost item description */
  scopeOfWork?: string;
}

/**
 * Add budget cost items per service, linked to the proposal document.
 * If services array is empty, falls back to a single lump-sum line.
 * Uses createCostItem (one per service).
 * createBudgetItem does NOT exist in the Jobtread Pave API.
 *
 * IMPORTANT API CONSTRAINT (validated against live API):
 *   `costGroupId` and `documentId` are MUTUALLY EXCLUSIVE on `createCostItem`.
 *   When both are provided, `documentId` is silently ignored and the item
 *   will NOT appear in the proposal.
 *
 * Strategy: We prioritize linking items to the proposal (documentId) over
 * visual grouping (costGroupId). Items will appear in the budget tab regardless
 * (just under the default/uncategorized section) AND in the proposal.
 */
async function addBudgetLineItem(
  grantKey: string,
  jobId: string,
  _groupName: string,
  fallbackItemName: string,
  totalAmount: number,
  services?: BudgetServiceItem[],
  documentId?: string,
): Promise<string> {
  // NOTE: We intentionally do NOT create a costGroup when documentId is provided,
  // because costGroupId and documentId are mutually exclusive on createCostItem.
  // The cost group would prevent items from being linked to the proposal.

  // Determine which items to create
  const itemsToCreate: BudgetServiceItem[] =
    services && services.length > 0
      ? services
      : [{ name: fallbackItemName, amount: totalAmount }];

  // Create one cost item per service (sequential to avoid rate limits)
  let firstItemId: string | undefined;
  for (const svc of itemsToCreate) {
    const itemName = svc.detail ? `${svc.name} (${svc.detail})` : svc.name;
    // unitPrice = what the customer pays; unitCost = 65% of unitPrice (35% gross margin)
    const unitPrice = Math.round(svc.amount * 100) / 100;
    const unitCost = Math.round(svc.amount * 0.65 * 100) / 100;
    const itemResult = await pave(
      grantKey,
      {
        createCostItem: {
          $: {
            jobId,
            costCodeId: DEFAULT_COST_CODE_ID,
            costTypeId: DEFAULT_COST_TYPE_ID,
            name: truncate(itemName, 100),
            quantity: 1,
            unitPrice,
            unitCost,
            ...(svc.scopeOfWork ? { description: svc.scopeOfWork } : {}),
            // Link cost item to the proposal document.
            // CRITICAL: documentId is mutually exclusive with costGroupId.
            // If costGroupId is also provided, documentId is silently ignored.
            ...(documentId ? { documentId } : {}),
          },
          createdCostItem: {
            id: {},
          },
        },
      },
      "createCostItem",
    );
    const itemId = (itemResult as any)?.createCostItem?.createdCostItem?.id;
    if (!itemId) throw new Error(`Jobtread: failed to create cost item "${itemName}"`);
    if (!firstItemId) firstItemId = String(itemId);
  }

  return firstItemId!;
}

/**
 * Create a proposal document sent to the client's email.
 * Uses the "Design Package" document template (must exist in the org).
 * Full amount is due at signing (100% payment schedule).
 */
async function createProposal(
  grantKey: string,
  jobId: string,
  accountId: string,
  customerEmail: string,
  customerName: string,
  fromName: string,
  locationAddress: string,
  locationName: string,
  totalAmount: number,
  scopeOfWork: string,
  contractText?: string,
  opts?: {
    salesRepEmail?: string;
    salesRepPhone?: string;
    companyAddress?: string;
    customerPhone?: string;
    customerAddress?: string;
  },
): Promise<string> {
  // Due date: 30 days from today
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 30);
  const dueDateStr = dueDate.toISOString().split("T")[0]; // YYYY-MM-DD

  // Build "Prepared By" fromName: include phone since API has no fromPhone field
  // Format: "Company Name\nRep Name\nPhone\nEmail" — Jobtread renders newlines
  const fromNameParts: string[] = [fromName];
  if (opts?.salesRepPhone) fromNameParts.push(opts.salesRepPhone);
  const composedFromName = fromNameParts.join("\n");

  // Build "Prepared For" toName: include phone since API has no toPhone field
  const toNameParts: string[] = [customerName];
  if (opts?.customerPhone) toNameParts.push(opts.customerPhone);
  const composedToName = toNameParts.join("\n");

  // Build description: scope of work + payment schedule + contract terms
  const descParts: string[] = [];
  if (scopeOfWork) descParts.push(scopeOfWork);
  // Payment schedule: full amount due on approval
  descParts.push(
    "\n\n" +
    "------------------------------------------------------------------------\n" +
    "PAYMENT SCHEDULE\n" +
    "------------------------------------------------------------------------\n" +
    `Full payment of $${totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} is due upon approval of this Design Package proposal.`
  );
  if (contractText) {
    descParts.push(
      "\n\n" +
      "------------------------------------------------------------------------\n" +
      "DESIGN PACKAGE CONTRACT TERMS\n" +
      "------------------------------------------------------------------------\n" +
      contractText
    );
  }

  const result = await pave(
    grantKey,
    {
      createDocument: {
        $: {
          jobId,
          accountId,
          name: "Design Package",
          type: "customerOrder",
          // "Prepared For" — homeowner info
          toName: composedToName,
          toEmailAddress: customerEmail,
          ...(opts?.customerAddress ? { toAddress: opts.customerAddress } : {}),
          // "Prepared By" — sales rep / company info
          fromName: composedFromName,
          ...(opts?.salesRepEmail ? { fromEmailAddress: opts.salesRepEmail } : {}),
          ...(opts?.companyAddress ? { fromAddress: opts.companyAddress } : {}),
          taxRate: 0,
          requireSignature: true,
          jobLocationAddress: locationAddress,
          jobLocationName: locationName,
          dueDate: dueDateStr,
          ...(descParts.length > 0 ? { description: descParts.join("") } : {}),
        },
        createdDocument: {
          id: {},
        },
      },
    },
    "createDocument",
  );

  const docId = (result as any)?.createDocument?.createdDocument?.id;
  if (!docId) throw new Error("Jobtread: failed to create proposal document");
  return String(docId);
}

/**
 * Add a recipient to a document so Jobtread sends the proposal email to them.
 * The assignee object requires { name, emailAddress } — NOT a contact ID.
 * Must be called BEFORE sendDocument (status → pending) so the recipient
 * receives the email notification.
 */
async function addDocumentRecipient(
  grantKey: string,
  documentId: string,
  name: string,
  emailAddress: string,
): Promise<void> {
  try {
    const result = await pave(
      grantKey,
      {
        createDocumentRecipient: {
          $: {
            documentId,
            assignee: { name, emailAddress },
          },
          createdDocumentRecipient: {
            id: {},
          },
        },
      },
      "addDocumentRecipient",
    );
    const recipientId = (result as any)?.createDocumentRecipient?.createdDocumentRecipient?.id;
    console.log(`[Jobtread] Added document recipient: ${recipientId} (${name} <${emailAddress}>)`);
  } catch (err) {
    // Non-fatal: log warning but don't fail the whole workflow
    console.warn(
      "[Jobtread] Failed to add document recipient (non-fatal):",
      err instanceof Error ? err.message : err,
    );
  }
}

/**
 * Send a document to the client by updating its status from "draft" to "pending".
 * Jobtread automatically sends the proposal email when status changes to "pending".
 *
 * Valid statuses: "draft", "pending", "approved", "denied"
 */
async function sendDocument(
  grantKey: string,
  documentId: string,
): Promise<void> {
  await pave(
    grantKey,
    {
      updateDocument: {
        $: { id: documentId, status: "pending" },
      },
    },
    "sendDocument",
  );
  console.log(`[Jobtread] Document ${documentId} sent to client (status → pending)`);
}

/**
 * Full workflow:
 *  1. Upsert customer (search accounts by name → find, or create new)
 *  2. Create location
 *  3. Create job (organizationId inferred from grant key)
 *  4. Create proposal document (draft) — must exist BEFORE cost items
 *  5. Create cost group + cost items WITH documentId (links them to the proposal)
 *  6. Send the proposal to the client (status → pending)
 *
 * IMPORTANT: Cost items must be created AFTER the document because:
 *  - `documentId` can ONLY be set at creation time on `createCostItem`
 *  - `updateCostItem` does NOT accept `documentId`
 *  - Without `documentId`, cost items appear in the budget tab but NOT in the proposal
 */
export async function createJobtreadProject(
  input: JobtreadProjectInput,
): Promise<JobtreadProjectResult> {
  const { grantKey, orgId } = input;

  try {
    // 1. Customer
    const accountId = await upsertCustomer(grantKey, orgId, input.customerName);

    // 2. Location
    const address =
      [input.customerAddress, input.customerCity].filter(Boolean).join(", ") ||
      "Address not provided";
    const locationName = `${input.customerName} — Project Site`;
    const locationId = await upsertLocation(grantKey, accountId, address, locationName);

    // 3. Job — name must be ≤ 30 chars; use a short fixed prefix
    // NOTE: scopeOfWork is NOT passed to createJob — it goes into the proposal
    // document description and each budget cost item description instead.
    const jobName = truncate(input.budgetLineItemName || input.projectDescription, 30);
    const jobId = await createJob(
      grantKey,
      locationId,
      jobName,
    );

    // 3b. Tag the job with source = "calculator" for workflow filtering
    const sourceFieldId = process.env.JOBTREAD_SOURCE_CUSTOM_FIELD_ID;
    if (sourceFieldId) {
      await setJobCustomField(grantKey, jobId, sourceFieldId, "calculator");
    }

    // 4. Create proposal document FIRST (as draft) — we need its ID for cost items
    const documentId = await createProposal(
      grantKey,
      jobId,
      accountId,
      input.customerEmail,
      input.customerName,
      input.fromName || "Design Your Price",
      address,
      locationName,
      input.totalAmount,
      input.scopeOfWork,
      input.contractText, // per-project-type contract terms appended as footer
      {
        salesRepEmail: input.salesRepEmail,
        salesRepPhone: input.salesRepPhone,
        companyAddress: input.companyAddress,
        customerPhone: input.customerPhone,
        customerAddress: address,
      },
    );

    // 5. Budget line items — create cost items WITH documentId to link them to the proposal
    // costGroupName = project type label (e.g. "Addition", "Bathroom Remodel")
    // budgetLineItemName = fallback single item name if no services provided
    const costGroupName = input.costGroupName || input.budgetLineItemName || input.projectDescription;
    const fallbackItemName = input.budgetLineItemName || input.projectDescription;
    await addBudgetLineItem(
      grantKey,
      jobId,
      costGroupName,      // cost group name = project type label
      fallbackItemName,   // fallback single item name if no services provided
      input.totalAmount,
      input.services,     // individual service line items
      documentId,         // link cost items to the proposal document
    );

    // 6. Add the homeowner as a document recipient so they receive the proposal email
    if (input.customerEmail && input.customerName) {
      await addDocumentRecipient(grantKey, documentId, input.customerName, input.customerEmail);
    }

    // 7. Send the proposal to the client (draft → pending)
    await sendDocument(grantKey, documentId);

    console.log(`[Jobtread] Project created and proposal sent: jobId=${jobId}, documentId=${documentId}`);
    return { success: true, jobId, documentId };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[Jobtread] createJobtreadProject error:", message);
    return { success: false, error: message };
  }
}

/** Lightweight connectivity check — returns the current grant's user info */
export async function jobtreadPing(
  grantKey: string,
): Promise<{ ok: boolean; userId?: string; error?: string }> {
  try {
    const result = await pave(grantKey, {
      currentGrant: {
        user: {
          id: {},
          name: {},
        },
      },
    });
    const userId = (result as any)?.currentGrant?.user?.id;
    return { ok: !!userId, userId: userId ? String(userId) : undefined };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
