# DocsAutomator Setup — Status & Test Checklist

## Architecture (final)

Mode: **DocsAutomator "Send via Email"**. Generating the contract creates the
document in DocsAutomator, which emails the client the signing invitation from
the rep's connected Gmail. The app marks the document `sent` and the quote
`sent_for_signature` at generation time. There is **no in-app "Sign Now" link**
— DocsAutomator does not return signing links in this mode (confirmed via the
signing-sessions API). On-site, the client signs from the emailed link. When all
parties sign, DocsAutomator's webhook flips the quote to `signed` and the
executed PDF is archived in the Supabase `contracts` bucket.

Signers (Client = Signer 1): client `{{esign.signature_1}}`, rep
`{{esign.signature_2}}`; signing order sequential (client first, rep
countersigns). Verified live: the signing session lists Signer 1 = client,
Signer 2 = rep.

## Done

- Contract template + automation (`6a2c6694586cbf435ca83f63`), API data source,
  Client = Signer 1.
- Vercel env: `DOCSAUTOMATOR_API_KEY`, `DOCSAUTOMATOR_AUTOMATION_ID_CONTRACT`,
  `DOCSAUTOMATOR_WEBHOOK_SECRET`, `NEXT_PUBLIC_APP_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
- **Vercel automation protection-bypass secret generated**:
  `sz4KXMATEtEGn1Jevgb8OP3JvRf0G7Qb` (scope: automation-bypass).
- App: contract panel reflects Send-via-Email (Generate & Send + preview, no
  Sign Now); native in-app signature flow removed (`/quotes/[id]/sign` deleted,
  Present page routes to the contract flow).
- Bid sheet simplified per JanPro: general info, floor-type totals, SUTM,
  frequency, total only — no rate/time calculations, no per-area breakdown.
- Contract SOW now emits a per-area fallback row when an area has no frozen
  checklist, so all areas always appear.

## Remaining manual steps

1. **DocsAutomator webhook URL** — append the protection bypass so Vercel
   doesn't block the POST. For testing on the preview deployment use:
   `https://jan-pro-git-claude-zen-bohr-7w890v-j9-systems.vercel.app/api/webhooks/docsautomator?secret=<DOCSAUTOMATOR_WEBHOOK_SECRET>&x-vercel-protection-bypass=sz4KXMATEtEGn1Jevgb8OP3JvRf0G7Qb`
   For production (after merge to main):
   `https://jan-pro.vercel.app/api/webhooks/docsautomator?secret=<DOCSAUTOMATOR_WEBHOOK_SECRET>&x-vercel-protection-bypass=sz4KXMATEtEGn1Jevgb8OP3JvRf0G7Qb`
2. **SMTP env vars** in Vercel (`SMTP_HOST/PORT/USER/PASS/FROM`) — needed for the
   "contract signed" notification email and the bid-sheet email. Not required
   for the signing email itself (DocsAutomator sends that).
3. **Merge `claude/zen-bohr-7w890v` → main** to ship to production
   (`jan-pro.vercel.app`), which currently runs the pre-integration `main`.

## Test checklist (DocsAutomator test mode = free)

1. On the preview URL, open a quote → Review → **Generate & Send**.
2. Preview PDF fills region entity, pricing, billing email, and the **SOW table
   now lists every area** (summary row per area; task-level rows if the area's
   cleaning schedule was configured).
3. Client receives the signing email from the rep's connected Gmail and signs;
   rep countersigns.
4. Confirm the webhook flips the quote to **Signed**, the executed PDF appears
   under Contract & Signature and in the `contracts` bucket. If status doesn't
   flip, it's a webhook identifier-matching issue — check the run and align the
   stored `signing_session_id` / `docsautomator_doc_id` with the webhook payload.

## Known v1 gaps (intentional)

- `{{cleaning_time}}` and `{{region_office_address}}` render blank (not captured
  in the app / regions table yet) — visible in the preview.
- SOW fallback rows are area-level ("Standard {type} cleaning per scope"); open
  "Modify Cleaning Schedule" on an area to get task-level detail in the contract.
