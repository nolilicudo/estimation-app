/**
 * Probe: test if createDocument accepts publicNotes, privateNotes, terms, footer, notes fields
 */
import "dotenv/config";

const GRANT_KEY = process.env.JOBTREAD_GRANT_KEY;
const API = "https://api.jobtread.com/pave";

async function pave(query) {
  const res = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, grantKey: GRANT_KEY }),
  });
  return res.json();
}

// Use existing job from live test
const JOB_ID = "22PXLDsCqXnT";
const ACCT_ID = "22PXLDs2h6ac";

console.log("Testing createDocument with extra fields (publicNotes, privateNotes, terms, footer, notes)...");

const result = await pave({
  createDocument: {
    $: {
      jobId: JOB_ID,
      accountId: ACCT_ID,
      name: "Design Package",
      type: "customerOrder",
      toName: "Test Footer Customer",
      toEmailAddress: "test@stonedecks.com",
      fromName: "Stone Decks",
      taxRate: 0,
      requireSignature: true,
      description: "Scope of work goes here",
      publicNotes: "PUBLIC NOTES — contract terms go here",
      privateNotes: "PRIVATE NOTES",
      terms: "TERMS — contract text",
      footer: "FOOTER — contract text",
      notes: "NOTES — contract text",
      jobLocationAddress: "123 Test Lane, Lindon",
      jobLocationName: "Test Site",
      dueDate: "2026-06-15",
    },
    createdDocument: { id: {} },
  },
});

console.log("Result:", JSON.stringify(result, null, 2));

// If created, also query the document to see which fields were stored
if (result?.createDocument?.createdDocument?.id) {
  const docId = result.createDocument.createdDocument.id;
  console.log("\nQuerying created document for stored fields...");
  const docResult = await pave({
    document: {
      $: { id: docId },
      id: {},
      name: {},
      description: {},
      publicNotes: {},
      privateNotes: {},
      terms: {},
      footer: {},
      notes: {},
      status: {},
    },
  });
  console.log("Document fields:", JSON.stringify(docResult, null, 2));
}
