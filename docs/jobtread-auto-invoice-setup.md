# Jobtread Auto-Invoice Setup Guide

This guide walks you through setting up automatic invoice creation in Jobtread after a Design Package proposal is signed through the calculator app.

## Overview

When a customer signs a Design Package proposal that was created through this calculator app, Jobtread will automatically create and send an invoice for the full payment amount. This only applies to proposals created through the calculator — other proposals in your Jobtread account are unaffected.

## Prerequisites

- Jobtread account with Workflows enabled
- An existing **Invoice template** in Jobtread
- Admin access to Jobtread Settings

---

## Step 1: Create the "Source" Custom Field on Jobs

1. Go to **Settings → Custom Fields** in Jobtread
2. Scroll to the **Jobs** section
3. Click **New Custom Field**
4. Configure:
   - **Type:** Picklist
   - **Name:** `Source`
   - **Options:** Add `calculator` as a picklist option
   - **Required:** No
   - **Default:** Leave blank (no default)
5. Save the custom field

## Step 2: Get the Custom Field ID

1. After creating the custom field, you need its internal ID
2. The easiest way: Go to any Job → look at the "Source" field → inspect the URL or use the Jobtread API:

```
POST https://api.jobtread.com/pave
{
  "query": {
    "$": { "grantKey": "YOUR_GRANT_KEY" },
    "organization": {
      "$": { "id": "YOUR_ORG_ID" },
      "customFields": {
        "$": { "where": [["name"], "=", "Source"] },
        "nodes": { "id": {}, "name": {} }
      }
    }
  }
}
```

3. Copy the `id` value from the response (it will look like `22Na3vXXXXXX`)

## Step 3: Add the Custom Field ID to the Calculator App

1. In the calculator app's **Settings → Secrets** panel (Management UI), add:
   - **Key:** `JOBTREAD_SOURCE_CUSTOM_FIELD_ID`
   - **Value:** The custom field ID from Step 2

2. Once configured, every Design Package proposal created through the calculator will automatically tag the job with `Source = calculator`

## Step 4: Create the Jobtread Workflow

1. Go to **Settings → Workflows** in Jobtread
2. Click **New Workflow** (or use a template if available)
3. Configure the workflow:

### Trigger
- **Event:** Document status changed
- **Status:** `approved` (this fires when the customer signs)

### Filter (Conditions)
- **Document type** = `customerOrder` (proposal)
- **Document name** = `Design Package`
- **Job custom field "Source"** = `calculator`

### Action
- **Action type:** Create Document
- **Document type:** `customerInvoice`
- **Template:** Select your existing invoice template
- **Amount:** Same as the approved proposal total
- **Auto-send:** Yes (set status to "pending" to email the invoice)

4. Save and activate the workflow

---

## How It Works

```
Customer signs proposal → Jobtread marks document as "approved"
                        → Workflow triggers
                        → Checks: Is it a "Design Package" from "calculator" source?
                        → Yes → Creates invoice from template
                        → Sends invoice to customer email
```

## Verification

1. Create a test proposal through the calculator app
2. Check the job in Jobtread — the "Source" field should show "calculator"
3. Approve/sign the proposal manually (or have a test customer sign it)
4. Verify that the invoice is automatically created on the same job

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Source field not populated | Check that `JOBTREAD_SOURCE_CUSTOM_FIELD_ID` is set correctly in app secrets |
| Workflow not triggering | Verify the workflow is active and filters match exactly |
| Invoice not created | Check Jobtread Workflows log for errors; verify invoice template exists |
| Wrong amount on invoice | Ensure the workflow is configured to pull the total from the proposal |

## Notes

- This automation only affects proposals created through the calculator app (tagged with `Source = calculator`)
- Proposals created manually in Jobtread or through other integrations will NOT trigger this workflow
- The workflow respects Jobtread's 10-workflow limit per organization
- If you need to disable auto-invoicing temporarily, deactivate the workflow in Settings → Workflows
