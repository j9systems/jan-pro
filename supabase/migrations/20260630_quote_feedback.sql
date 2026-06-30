-- Quote Builder feedback fixes (Jodie, 2026-06-30)
-- Schema is managed via the Supabase dashboard; this file is the canonical
-- record of these schema changes.
-- Project: czavgpxhzhidwhsxukom (Sales Bid Generator)

-- ─── quotes: capture the site ZIP / postal code ──────────────────────────────
-- Jodie's feedback #1: the address section was not asking for the ZIP code.

alter table public.quotes add column postal_code text;

-- save_quote(quote_data jsonb) must be updated (SECURITY DEFINER body) to
-- persist the new column — three additions, mirroring the service_start_date
-- change in 20260612_docsautomator.sql:
--   * insert column list:    postal_code,
--   * insert values:         quote_data->>'postal_code',
--   * on conflict update:    postal_code = EXCLUDED.postal_code,
