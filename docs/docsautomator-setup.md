# DocsAutomator Setup — Remaining Manual Steps

The app code, database schema, and the Google Doc contract template are done.
These are the steps that require access to the DocsAutomator dashboard and
Vercel project settings.

**Contract template (already created):**
https://docs.google.com/document/d/1PV4R0DO4TN-CLvynx23YBmuQct7Ukchh39gmXz5aagQ/edit
Owned by carter@j9systems.com. Review the styling/branding — the placeholder
vocabulary matches `buildContractPayload()` in `src/lib/docsautomator.ts`
exactly, so edit wording freely but keep `{{placeholder}}` names unchanged.

## 1. Create the automation in DocsAutomator (~2 min)

1. DocsAutomator dashboard → New Automation.
2. Title: **JanPro Services Agreement + SOW** · Data source: **API**.
3. Template: paste the Google Doc link above (share the doc with the
   DocsAutomator service account if prompted).
4. Copy the **automation ID** — it goes in Vercel as
   `DOCSAUTOMATOR_AUTOMATION_ID_CONTRACT`.

## 2. Vercel env vars (jan-pro project → Settings → Environment Variables)

| Key | Value |
|---|---|
| `DOCSAUTOMATOR_API_KEY` | (already added) |
| `DOCSAUTOMATOR_AUTOMATION_ID_CONTRACT` | from step 1 |
| `DOCSAUTOMATOR_WEBHOOK_SECRET` | generate any long random string (e.g. `openssl rand -hex 24`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase dashboard → project `czavgpxhzhidwhsxukom` → Settings → API → `service_role` |
| `NEXT_PUBLIC_APP_URL` | the production URL, e.g. `https://jan-pro.vercel.app` (no trailing slash) |
| `SIGNED_CONTRACT_NOTIFY_EMAIL` | optional — regional office address to cc on signed-contract notifications |

Redeploy after adding (env vars only apply to new deployments).

## 3. Register the signing webhook in DocsAutomator

In the automation's eSign/webhook settings, set the completion webhook to:

```
https://<NEXT_PUBLIC_APP_URL>/api/webhooks/docsautomator?secret=<DOCSAUTOMATOR_WEBHOOK_SECRET>
```

The route also accepts the secret via an `x-webhook-secret` header if
DocsAutomator supports custom headers instead.

## 4. API discovery check (one curl, before first real use)

The eSign response/webhook field names are normalized defensively in
`src/lib/docsautomator.ts` (`normalizeCreateDocumentResponse`) but were not
publicly documented. Verify once against the live automation:

```bash
curl -s -X POST https://api.docsautomator.co/createDocument \
  -H "Authorization: Bearer $DOCSAUTOMATOR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "docId": "<AUTOMATION_ID>",
    "data": {
      "company_name": "Test Co",
      "contact_name": "Test Person",
      "contact_email": "test@example.com",
      "monthly_price": "$1,500.00",
      "service_frequency": "3x per week"
    }
  }' | jq .
```

Check the response for: the PDF URL field, the signing-session ID field, and
the per-signer signing link fields. If the names differ from the candidates in
`normalizeCreateDocumentResponse()` (`pdfUrl`, `signingSessionId`,
`signerLinks[].link`, …), update that one function. Same for how signers are
passed (the request currently sends `signers: [{name, email, order}]` and
`senderEmail`) — confirm with DocsAutomator support (Rupert) if the test shows
otherwise.

## 5. End-to-end test (DocsAutomator test mode = free)

1. Open a quote in the app → Review step → **Generate Contract**.
2. Confirm the preview PDF fills: region operating entity, pricing, SOW rows.
3. **Sign Now** → sign as the client, then the rep link.
4. Verify: quote flips to **Signed**, the signed PDF appears under
   Contract & Signature, the PDF exists in the Supabase `contracts` storage
   bucket, and the notification email arrives.

## Known gaps (intentional, v1)

- `{{cleaning_time}}` and `{{region_office_address}}` render blank — the app
  doesn't capture cleaning time, and per-region notice addresses aren't in the
  `regions` table yet. The rep sees both in the mandatory preview.
- Per-rep sender (Scale plan): the request passes `senderEmail` = the rep's
  email; confirm with Rupert that the API selects the connected sender this
  way. Each rep's Gmail must be connected once in DocsAutomator
  (Settings → Senders → Sign in with Google).
