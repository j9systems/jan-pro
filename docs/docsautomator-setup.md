# DocsAutomator Setup — Status & Remaining Steps

## Done (automated, 2026-06-12)

- **Contract template Google Doc** (owned by carter@j9systems.com):
  https://docs.google.com/document/d/1PV4R0DO4TN-CLvynx23YBmuQct7Ukchh39gmXz5aagQ/edit
  Placeholder vocabulary matches `buildContractPayload()` in
  `src/lib/docsautomator.ts` exactly — edit wording freely, keep
  `{{placeholder}}` names unchanged.
- **DocsAutomator automation created**: "JanPro Services Agreement + SOW",
  ID `6a2c6694586cbf435ca83f63`, data source API, template attached,
  document name `{{company_name}} — JAN-PRO Services Agreement`,
  PDF expiration: never.
- **Vercel env vars set** (production + preview): `DOCSAUTOMATOR_API_KEY`
  (added by Carter), `DOCSAUTOMATOR_AUTOMATION_ID_CONTRACT`,
  `DOCSAUTOMATOR_WEBHOOK_SECRET`, `NEXT_PUBLIC_APP_URL`
  (https://jan-pro.vercel.app), `SUPABASE_SERVICE_ROLE_KEY`.
- Database migration applied (documents table, contracts bucket,
  service_start_date, save_quote update).

## Remaining (DocsAutomator dashboard — API doesn't expose these)

Open the "JanPro Services Agreement + SOW" automation in the DocsAutomator
dashboard:

1. **Enable eSign** (`esignature.enabled`). Settings observed via API:
   delivery method email, signing order parallel, signing links expire in
   30 days, up to 3 reminders every 3 days (enable reminders if desired).
2. **Sender**: connect rep Gmail accounts (Settings → connected accounts,
   Google OAuth) and turn on "send from acting member" / select the Gmail
   account so signature emails come from @jpfrandev.com instead of
   docsautomator. (Scale plan feature — confirm with Rupert how the API
   selects the sender per request; the app currently passes
   `senderEmail` = the rep's email.)
3. **Webhook**: enable `notifyWebhook` / `sendSignedPdfToWebhook` and set the
   webhook URL to:
   `https://jan-pro.vercel.app/api/webhooks/docsautomator?secret=<DOCSAUTOMATOR_WEBHOOK_SECRET value from Vercel>`

## Other gaps to close before rollout

- **SMTP env vars are missing in Vercel** (`SMTP_HOST/PORT/USER/PASS/FROM`).
  Bid-sheet emails, the send-for-signature fallback email, and
  signed-contract notifications all need them.
- **Vercel deployment protection** is "all except custom domains" — if
  DocsAutomator's webhook POST gets a 401/SSO redirect, add a Protection
  Bypass for Automation (Project → Settings → Deployment Protection) or
  disable protection for production.
- **Production deploy**: production tracks `main`; the integration lives on
  `claude/zen-bohr-7w890v` (preview alias
  https://jan-pro-git-claude-zen-bohr-7w890v-j9-systems.vercel.app).
  Merge to main when ready to go live.
- `SIGNED_CONTRACT_NOTIFY_EMAIL` (optional regional-office cc) not set.

## E2E test (DocsAutomator test mode = free)

1. On the preview URL, open a quote → Review → **Generate Contract**.
2. Verify the preview PDF fills region entity, pricing, SOW rows; the first
   live response also confirms the eSign response field names — if the
   signing links don't appear in the app, check the server logs for the raw
   response and adjust `normalizeCreateDocumentResponse()` in
   `src/lib/docsautomator.ts` (one-function fix).
3. **Sign Now** → sign as client, then rep link.
4. Verify: quote flips to Signed, signed PDF appears under Contract &
   Signature and in the Supabase `contracts` bucket, notification email
   arrives (once SMTP is configured).

## Known v1 gaps (intentional)

- `{{cleaning_time}}` and `{{region_office_address}}` render blank — not
  captured in the app/regions table yet; visible in the mandatory preview.
