import { describe, it, expect } from "vitest";

/**
 * Validates that JOBTREAD_SOURCE_CUSTOM_FIELD_ID points to a real custom field
 * in the Jobtread organization.
 */
describe("Jobtread Source Custom Field", () => {
  const grantKey = process.env.JOBTREAD_GRANT_KEY;
  const orgId = process.env.JOBTREAD_ORG_ID;
  const sourceFieldId = process.env.JOBTREAD_SOURCE_CUSTOM_FIELD_ID;

  it("JOBTREAD_SOURCE_CUSTOM_FIELD_ID is set", () => {
    expect(sourceFieldId).toBeTruthy();
    expect(sourceFieldId!.length).toBeGreaterThan(5);
  });

  it("custom field exists in the Jobtread organization", async () => {
    if (!grantKey || !orgId || !sourceFieldId) {
      console.warn("Skipping: missing Jobtread credentials");
      return;
    }

    const body = JSON.stringify({
      query: {
        $: { grantKey },
        organization: {
          $: { id: orgId },
          customFields: {
            $: { where: [["id"], "=", sourceFieldId] },
            nodes: {
              id: {},
              name: {},
            },
          },
        },
      },
    });

    const res = await fetch("https://api.jobtread.com/pave", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });

    expect(res.ok).toBe(true);

    const json = (await res.json()) as any;
    const fields = json?.organization?.customFields?.nodes || [];

    expect(fields.length).toBeGreaterThanOrEqual(1);

    const sourceField = fields.find((f: any) => String(f.id) === sourceFieldId);
    expect(sourceField).toBeTruthy();
    expect(sourceField.name.toLowerCase()).toContain("source");

    console.log(`✅ Validated: Custom field "${sourceField.name}" (ID: ${sourceField.id})`);
  });
});
