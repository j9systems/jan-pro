# DocsAutomator Setup — Status & Pre-Test Checklist

## Architecture (final)

Mode: **DocsAutomator "Send via Email"** — creating the document emails the
client the signing invitation immediately (from the rep's connected Gmail).
So in the app, **"Generate Contract" = Generate & Send**: it creates the doc,
DA emails the client, the document is marked `sent`, and the quote moves to
`sent_for_signature`. The app also surfaces the client's signing link for
**"Sign Now"** on the iPad (in-the-moment on-site signing). When all parties
sign, DA's webhook flips the quote to `signed` and the executed PDF is
archived in Supabase storage.

**Signers (Client = Signer 1):**
- Signer 1 = **client** → `{{esign.signature_1}}` / `{{esign.date_1}}` (CLIENT block)
- Signer 2 = **Jan-Pro rep** → `{{esign.signature_2}}` / `{{esign.date_2}}` (Jan-Pro block)
- Signing order **Sequential**: client signs first, rep countersigns.

## Done (automated)

- **Template** (carter@j9systems.com): https://docs.google.com/document/d/1PV4R0DO4TN-CLvynx23YBmuQct7Ukchh39gmXz5aagQ/edit
  Signature blocks set to Client = Signer 1, Rep = Signer 2. All
  `{{placeholders}}` match `buildContractPayload()` in `src/lib/docsautomator.ts`
  (including `{{billing_email}}`).
- **Automation**: "JanPro Services Agreement + SOW", ID `6a2c6694586cbf435ca83f63`,
  API data source, template attached, doc name
  `{{company_name}} — JAN-PRO Services Agreement`.
- **Vercel env** (prod + preview): `DOCSAUTOMATOR_API_KEY`,
  `DOCSAUTOMATOR_AUTOMATION_ID_CONTRACT`, `DOCSAUTOMATOR_WEBHOOK_SECRET`,
  `NEXT_PUBLIC_APP_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
- **Webhook** wired in the automation:
  `https://jan-pro.vercel.app/api/webhooks/docsautomator?secret=<DOCSAUTOMATOR_WEBHOOK_SECRET>`
- **App**: Send-via-Email flow (generate = sent), no in-app SMTP send button,
  "Sign Now (this device)" opens the client's link, rep countersign link shown.
- **DB**: documents table, contracts bucket, service_start_date, save_quote — applied.

## Remaining — one DA-UI step (the API can't set signer mappings)

In the automation → **Actions → E-Signing**, set the signer emails to match
the template (Client = Signer 1):
- **Signer 1**: Email `{{contact_email}}`, Name `{{contact_name}}`
- **Signer 2**: Email `{{rep_email}}`, Name `{{rep_name}}`
- **Signing Order**: Sequential (in order)
- **Signing Link Delivery**: Send via Email
- Each rep connects their @jpfrandev.com Gmail (Settings → connected accounts)
  and "send from acting member" is on, so invites come from the rep.

## Pre-flight checklist

1. **SMTP env vars missing in Vercel** (`SMTP_HOST/PORT/USER/PASS/FROM`). Needed
   for the "contract signed" notification + the existing bid-sheet email. Without
   them the signed PDF still archives and status still flips — you just get no
   notification email.
2. **Vercel deployment protection** is on ("all except custom domains"). DA's
   webhook POST may hit a 401/SSO bounce → contract signs but never flips to
   "Signed" in the app. Add a **Protection Bypass for Automation**
   (Project → Settings → Deployment Protection).
3. **Numbered lists**: confirm the Services Agreement sections A/B/C render
   1,2,3… (not 1,1,1…) in the generated PDF; renumber in the Doc if needed.
4. **SOW table** fills from each area's frozen checklist. On the test quote,
   confirm the Statement of Work table populates; if blank, the areas have no
   frozen checklist snapshot and we switch `line_items_sow` to the live tasks.
5. **First real generation**: confirm (a) signing links return in the API
   response, (b) the webhook flips status to Signed. If links are missing, grab
   the server log line — one-function fix in `normalizeCreateDocumentResponse`.
6. **Go-live**: integration is on `claude/zen-bohr-7w890v` (preview). Production
   tracks `main`. Test on the preview URL, then merge to `main` to ship.

## E2E test (DocsAutomator test mode = free)

1. Preview URL → open a quote → Review → **Generate & Send**.
2. Preview PDF fills region entity, pricing, SOW + special-service rows,
   billing email.
3. **Sign Now (this device)** → client signs; then the rep countersign link.
4. Verify: quote → Signed, signed PDF under Contract & Signature + in the
   `contracts` bucket, notification email (once SMTP is set).

## Known v1 gaps (intentional)

- `{{cleaning_time}}` and `{{region_office_address}}` render blank (not captured
  in the app / regions table yet) — visible in the preview.
