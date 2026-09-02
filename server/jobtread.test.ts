/**
 * Jobtread API helper tests
 *
 * Section 1: Credential smoke tests (require real env vars)
 * Section 2: Unit tests for the validated Jobtread Pave API implementation
 *
 * Key API facts validated against the live API:
 *  - Customer lookup is by account name (email search not supported)
 *  - createAccount: organizationId, name, type — NO email field
 *  - createContact: accountId, name — NO email field (email not on contacts)
 *  - createJob: locationId, name — NO organizationId (inferred from grant), NO description (scope goes to document/cost items)
 *  - createBudgetItem does NOT exist — use createCostGroup + createCostItem
 *  - createCostItem requires costCodeId and costTypeId; accepts documentId to link to a proposal
 *  - createDocument: name must match an org template (e.g. "Design Package")
 *  - updateDocument: accepts status ("draft"|"pending"|"approved"|"denied") to send proposals
 *
 * Workflow order (validated against live API):
 *  1. Upsert customer account
 *  2. Create location
 *  3. Create job
 *  4. Create document (proposal, as draft)
 *  5. Create cost group + cost items WITH documentId (links them to proposal)
 *  6. Send document (updateDocument status → "pending")
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { jobtreadPing } from "./jobtread";

// ─── Section 1: Credential smoke tests ────────────────────────────────────────

describe("Jobtread API credentials", () => {
  it("JOBTREAD_GRANT_KEY env var is set", () => {
    const key = process.env.JOBTREAD_GRANT_KEY;
    expect(key, "JOBTREAD_GRANT_KEY must be set in environment").toBeTruthy();
    expect(key!.length, "JOBTREAD_GRANT_KEY must be non-empty").toBeGreaterThan(0);
  });

  it("JOBTREAD_ORG_ID env var is set and is a valid Jobtread ID (not a placeholder)", () => {
    const orgId = process.env.JOBTREAD_ORG_ID;
    expect(orgId, "JOBTREAD_ORG_ID must be set in environment").toBeTruthy();
    expect(orgId!.length, "JOBTREAD_ORG_ID must be non-empty").toBeGreaterThan(0);
    expect(
      /^[A-Za-z0-9]{8,}$/.test(orgId!),
      `JOBTREAD_ORG_ID "${orgId}" looks like a placeholder, not a real Jobtread ID (expected alphanumeric, e.g. "22Na3vQB6sqD")`,
    ).toBe(true);
  });

  it("can ping the Jobtread API with the configured grant key", async () => {
    const key = process.env.JOBTREAD_GRANT_KEY;
    if (!key) {
      console.warn("Skipping Jobtread ping — JOBTREAD_GRANT_KEY not set");
      return;
    }
    const result = await jobtreadPing(key);
    expect(result.ok, `Jobtread ping failed: ${result.error}`).toBe(true);
    expect(result.userId).toBeTruthy();
  }, 15_000);
});

// ─── Section 2: Unit tests for the validated Jobtread implementation ──────────

const MOCK_GRANT_KEY = "test-grant-key";
const MOCK_ORG_ID = "org-123";

// Helper to build a minimal Pave success response
function paveOk(data: Record<string, unknown>) {
  return {
    ok: true,
    json: async () => data,
    text: async () => JSON.stringify(data),
  } as unknown as Response;
}

/**
 * Standard mock sequence for a single-service project (new customer):
 *  1. accounts search → empty
 *  2. createAccount
 *  3. searchLocations → empty
 *  4. createLocation
 *  5. createJob
 *  6. createDocument (proposal, draft)
 *  7. createCostItem (with documentId, no costGroupId)
 *  8. updateDocument (send → pending)
 *
 * NOTE: costGroupId is NOT used because it is mutually exclusive with documentId.
 * When both are provided, documentId is silently ignored by the Jobtread API.
 */
function standardMocks(fetchSpy: ReturnType<typeof vi.spyOn>, opts?: { existingAccount?: boolean }) {
  if (opts?.existingAccount) {
    fetchSpy
      .mockResolvedValueOnce(
        paveOk({ organization: { accounts: { nodes: [{ id: "account-existing", name: "Jane Doe" }] } } }),
      );
  } else {
    fetchSpy
      .mockResolvedValueOnce(paveOk({ organization: { accounts: { nodes: [] } } }))
      .mockResolvedValueOnce(paveOk({ createAccount: { createdAccount: { id: "acct-1" } } }));
  }
  fetchSpy
    .mockResolvedValueOnce(paveOk({ account: { locations: { nodes: [] } } }))
    .mockResolvedValueOnce(paveOk({ createLocation: { createdLocation: { id: "loc-1" } } }))
    .mockResolvedValueOnce(paveOk({ createJob: { createdJob: { id: "job-1" } } }))
    .mockResolvedValueOnce(paveOk({ updateJob: {} })) // setJobCustomField (Source = calculator)
    .mockResolvedValueOnce(paveOk({ createDocument: { createdDocument: { id: "doc-1" } } }))
    .mockResolvedValueOnce(paveOk({ createCostItem: { createdCostItem: { id: "item-1" } } }))
    .mockResolvedValueOnce(paveOk({ createDocumentRecipient: { createdDocumentRecipient: { id: "rec-1" } } })) // addDocumentRecipient
    .mockResolvedValueOnce(paveOk({ updateDocument: {} })); // sendDocument
}

describe("Jobtread createJobtreadProject — validated API implementation", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("searches organization.accounts (not contacts) by customer name", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    standardMocks(fetchSpy, { existingAccount: true });

    const { createJobtreadProject } = await import("./jobtread");

    const result = await createJobtreadProject({
      grantKey: MOCK_GRANT_KEY,
      orgId: MOCK_ORG_ID,
      customerName: "Jane Doe",
      customerEmail: "jane@example.com",
      projectDescription: "Test Project",
      totalAmount: 1000,
      scopeOfWork: "Test scope",
    });

    expect(result.success).toBe(true);

    // The first fetch call must query organization.accounts — NOT organization.contacts
    const firstCallBody = JSON.parse((fetchSpy.mock.calls[0][1] as RequestInit).body as string);
    const queryRoot = firstCallBody.query;
    expect(queryRoot.organization).toBeDefined();
    expect(queryRoot.organization.accounts).toBeDefined();
    expect(queryRoot.organization.contacts).toBeUndefined();
  });

  it("returns existing account ID without creating a new account when found by name", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    standardMocks(fetchSpy, { existingAccount: true });

    const { createJobtreadProject } = await import("./jobtread");

    await createJobtreadProject({
      grantKey: MOCK_GRANT_KEY,
      orgId: MOCK_ORG_ID,
      customerName: "Jane Doe",
      customerEmail: "jane@example.com",
      projectDescription: "Test Project",
      totalAmount: 1000,
      scopeOfWork: "Test scope",
    });

    // With existing account: 9 calls (no createAccount, no createCostGroup)
    // accountSearch + searchLocations + createLocation + createJob + updateJob(customField) + createDocument + createCostItem + addDocumentRecipient + updateDocument
    expect(fetchSpy).toHaveBeenCalledTimes(9);
    const callBodies = fetchSpy.mock.calls.map((c) =>
      JSON.parse((c[1] as RequestInit).body as string),
    );
    const hasCreateAccount = callBodies.some((b) => b.query?.createAccount !== undefined);
    expect(hasCreateAccount).toBe(false);
  });

  it("creates account WITHOUT email field when customer not found", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    standardMocks(fetchSpy);

    const { createJobtreadProject } = await import("./jobtread");

    const result = await createJobtreadProject({
      grantKey: MOCK_GRANT_KEY,
      orgId: MOCK_ORG_ID,
      customerName: "New Customer",
      customerEmail: "new@example.com",
      customerPhone: "555-9999",
      projectDescription: "New Project",
      totalAmount: 2000,
      scopeOfWork: "New scope",
    });

    expect(result.success).toBe(true);

    const callBodies = fetchSpy.mock.calls.map((c) =>
      JSON.parse((c[1] as RequestInit).body as string),
    );

    // createAccount must NOT include email field
    const createAccountCall = callBodies.find((b) => b.query?.createAccount !== undefined);
    expect(createAccountCall).toBeDefined();
    expect(createAccountCall!.query.createAccount.$?.email).toBeUndefined();
    expect(createAccountCall!.query.createAccount.$?.emailAddress).toBeUndefined();
  });

  it("uses createCostItem with documentId (no costGroupId) instead of createBudgetItem", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    standardMocks(fetchSpy);

    const { createJobtreadProject } = await import("./jobtread");

    await createJobtreadProject({
      grantKey: MOCK_GRANT_KEY,
      orgId: MOCK_ORG_ID,
      customerName: "Test",
      customerEmail: "test@example.com",
      projectDescription: "Design Package — Addition — Bathroom (500 sq ft)",
      budgetLineItemName: "Dreams to Reality Design Package",
      totalAmount: 3500,
      scopeOfWork: "• 3D Renderings\n• Floor Plan",
    });

    const callBodies = fetchSpy.mock.calls.map((c) =>
      JSON.parse((c[1] as RequestInit).body as string),
    );

    // createBudgetItem must NOT be called
    const hasBudgetItem = callBodies.some((b) => b.query?.createBudgetItem !== undefined);
    expect(hasBudgetItem).toBe(false);

    // costGroupId is NOT used (mutually exclusive with documentId)
    const costGroupCall = callBodies.find((b) => b.query?.createCostGroup !== undefined);
    expect(costGroupCall).toBeUndefined();

    // createCostItem must include costCodeId, costTypeId, and documentId (no costGroupId)
    const costItemCall = callBodies.find((b) => b.query?.createCostItem !== undefined);
    expect(costItemCall).toBeDefined();
    expect(costItemCall!.query.createCostItem.$?.costCodeId).toBeTruthy();
    expect(costItemCall!.query.createCostItem.$?.costTypeId).toBeTruthy();
    expect(costItemCall!.query.createCostItem.$?.documentId).toBe("doc-1");
    expect(costItemCall!.query.createCostItem.$?.costGroupId).toBeUndefined();
    expect(costItemCall!.query.createCostItem.$?.name).toBe("Dreams to Reality Design Package");
  });

  it("scope of work goes into createDocument description, NOT createJob description", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    standardMocks(fetchSpy);

    const { createJobtreadProject } = await import("./jobtread");

    await createJobtreadProject({
      grantKey: MOCK_GRANT_KEY,
      orgId: MOCK_ORG_ID,
      customerName: "Test",
      customerEmail: "test@example.com",
      projectDescription: "Design Package — Bathroom",
      totalAmount: 2500,
      scopeOfWork: "• 3D Renderings\n• Floor Plan\n• Material Selections",
    });

    const callBodies = fetchSpy.mock.calls.map((c) =>
      JSON.parse((c[1] as RequestInit).body as string),
    );

    // createJob must NOT have description (scope goes to document/cost items, not dashboard)
    const createJobCall = callBodies.find((b) => b.query?.createJob !== undefined);
    expect(createJobCall).toBeDefined();
    expect(createJobCall!.query.createJob.$?.description).toBeUndefined();

    // createDocument MUST have description containing the scope of work
    const createDocCall = callBodies.find((b) => b.query?.createDocument !== undefined);
    expect(createDocCall).toBeDefined();
    expect(createDocCall!.query.createDocument.$?.description).toBeTruthy();
    expect(createDocCall!.query.createDocument.$?.description).toContain("3D Renderings");
  });

  it("createJob does NOT pass organizationId (inferred from grant key)", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    standardMocks(fetchSpy);

    const { createJobtreadProject } = await import("./jobtread");

    await createJobtreadProject({
      grantKey: MOCK_GRANT_KEY,
      orgId: MOCK_ORG_ID,
      customerName: "Test",
      customerEmail: "test@example.com",
      projectDescription: "Feasibility Study — Bathroom",
      totalAmount: 1000,
      scopeOfWork: "Feasibility scope",
    });

    const callBodies = fetchSpy.mock.calls.map((c) =>
      JSON.parse((c[1] as RequestInit).body as string),
    );

    const createJobCall = callBodies.find((b) => b.query?.createJob !== undefined);
    expect(createJobCall).toBeDefined();
    // organizationId must NOT be in the createJob params
    expect(createJobCall!.query.createJob.$?.organizationId).toBeUndefined();
    // locationId must be present
    expect(createJobCall!.query.createJob.$?.locationId).toBeTruthy();
  });

  it("per-service scopeOfWork reaches createCostItem description in the budget tab", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    // Custom mock sequence for 2 services (no createCostGroup — mutually exclusive with documentId)
    fetchSpy
      .mockResolvedValueOnce(paveOk({ organization: { accounts: { nodes: [] } } }))
      .mockResolvedValueOnce(paveOk({ createAccount: { createdAccount: { id: "acct-1" } } }))
      .mockResolvedValueOnce(paveOk({ account: { locations: { nodes: [] } } }))
      .mockResolvedValueOnce(paveOk({ createLocation: { createdLocation: { id: "loc-1" } } }))
      .mockResolvedValueOnce(paveOk({ createJob: { createdJob: { id: "job-1" } } }))
      .mockResolvedValueOnce(paveOk({ updateJob: {} })) // setJobCustomField (Source = calculator)
      .mockResolvedValueOnce(paveOk({ createDocument: { createdDocument: { id: "doc-1" } } }))
      // Two cost items (one per service)
      .mockResolvedValueOnce(paveOk({ createCostItem: { createdCostItem: { id: "item-1" } } }))
      .mockResolvedValueOnce(paveOk({ createCostItem: { createdCostItem: { id: "item-2" } } }))
      .mockResolvedValueOnce(paveOk({ createDocumentRecipient: { createdDocumentRecipient: { id: "rec-1" } } })) // addDocumentRecipient
      .mockResolvedValueOnce(paveOk({ updateDocument: {} })); // sendDocument

    const { createJobtreadProject } = await import("./jobtread");

    await createJobtreadProject({
      grantKey: MOCK_GRANT_KEY,
      orgId: MOCK_ORG_ID,
      customerName: "Test",
      customerEmail: "test@example.com",
      projectDescription: "Design Package — Addition",
      totalAmount: 5000,
      scopeOfWork: "Full project scope",
      services: [
        {
          name: "3D Renderings",
          amount: 3000,
          scopeOfWork: "Service: 3D Renderings\nProject: Addition\nPrice: $3,000",
        },
        {
          name: "Floor Plan",
          amount: 2000,
          scopeOfWork: "Service: Floor Plan\nProject: Addition\nPrice: $2,000",
        },
      ],
    });

    const callBodies = fetchSpy.mock.calls.map((c) =>
      JSON.parse((c[1] as RequestInit).body as string),
    );

    // Both createCostItem calls must have description set from per-service scopeOfWork
    const costItemCalls = callBodies.filter((b) => b.query?.createCostItem !== undefined);
    expect(costItemCalls).toHaveLength(2);

    const firstItem = costItemCalls[0].query.createCostItem.$;
    expect(firstItem.name).toContain("3D Renderings");
    expect(firstItem.description).toBeTruthy();
    expect(firstItem.description).toContain("3D Renderings");

    const secondItem = costItemCalls[1].query.createCostItem.$;
    expect(secondItem.name).toContain("Floor Plan");
    expect(secondItem.description).toBeTruthy();
    expect(secondItem.description).toContain("Floor Plan");

    // unitPrice and unitCost (65%) must be correct
    expect(firstItem.unitPrice).toBe(3000);
    expect(firstItem.unitCost).toBe(1950); // 3000 * 0.65
    expect(secondItem.unitPrice).toBe(2000);
    expect(secondItem.unitCost).toBe(1300); // 2000 * 0.65
  });

  it("cost items are linked to the proposal via documentId", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    standardMocks(fetchSpy);

    const { createJobtreadProject } = await import("./jobtread");

    await createJobtreadProject({
      grantKey: MOCK_GRANT_KEY,
      orgId: MOCK_ORG_ID,
      customerName: "Test",
      customerEmail: "test@example.com",
      projectDescription: "Design Package",
      totalAmount: 2000,
      scopeOfWork: "Scope text",
    });

    const callBodies = fetchSpy.mock.calls.map((c) =>
      JSON.parse((c[1] as RequestInit).body as string),
    );

    // createCostItem must include documentId matching the created document
    const costItemCall = callBodies.find((b) => b.query?.createCostItem !== undefined);
    expect(costItemCall).toBeDefined();
    expect(costItemCall!.query.createCostItem.$?.documentId).toBe("doc-1");
  });

  it("proposal is sent to client via updateDocument status → pending", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    standardMocks(fetchSpy);

    const { createJobtreadProject } = await import("./jobtread");

    await createJobtreadProject({
      grantKey: MOCK_GRANT_KEY,
      orgId: MOCK_ORG_ID,
      customerName: "Test",
      customerEmail: "test@example.com",
      projectDescription: "Design Package",
      totalAmount: 2000,
      scopeOfWork: "Scope text",
    });

    const callBodies = fetchSpy.mock.calls.map((c) =>
      JSON.parse((c[1] as RequestInit).body as string),
    );

    // The last call must be updateDocument with status = "pending"
    const updateDocCall = callBodies.find((b) => b.query?.updateDocument !== undefined);
    expect(updateDocCall).toBeDefined();
    expect(updateDocCall!.query.updateDocument.$?.id).toBe("doc-1");
    expect(updateDocCall!.query.updateDocument.$?.status).toBe("pending");
  });

  it("document is created BEFORE cost items (correct order for documentId linking)", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    standardMocks(fetchSpy);

    const { createJobtreadProject } = await import("./jobtread");

    await createJobtreadProject({
      grantKey: MOCK_GRANT_KEY,
      orgId: MOCK_ORG_ID,
      customerName: "Test",
      customerEmail: "test@example.com",
      projectDescription: "Design Package",
      totalAmount: 2000,
      scopeOfWork: "Scope text",
    });

    const callBodies = fetchSpy.mock.calls.map((c) =>
      JSON.parse((c[1] as RequestInit).body as string),
    );

    // Find indices of createDocument and createCostItem
    const docIndex = callBodies.findIndex((b) => b.query?.createDocument !== undefined);
    const costItemIndex = callBodies.findIndex((b) => b.query?.createCostItem !== undefined);
    const updateDocIndex = callBodies.findIndex((b) => b.query?.updateDocument !== undefined);

    // Document must be created BEFORE cost items
    expect(docIndex).toBeLessThan(costItemIndex);
    // updateDocument (send) must be AFTER cost items
    expect(updateDocIndex).toBeGreaterThan(costItemIndex);
  });
});
