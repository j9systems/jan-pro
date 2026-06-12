-- DocsAutomator e-signature integration
-- Schema is managed via the Supabase dashboard; this file is the canonical
-- record of what must be run there (SQL editor) for this feature.
-- Project: czavgpxhzhidwhsxukom (Sales Bid Generator)

-- ─── 1) documents: one row per generated document (contract, bid sheet) ──────

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes(id) on delete cascade,
  type text not null check (type in ('contract', 'bid_sheet')),
  automation_id text not null,
  docsautomator_doc_id text,
  pdf_url text,
  google_doc_url text,
  signing_session_id text,
  signer1_name text,
  signer1_email text,
  signer1_link text,
  signer1_signed_at timestamptz,
  signer2_name text,
  signer2_email text,
  signer2_link text,
  signer2_signed_at timestamptz,
  status text not null default 'pending_review'
    check (status in ('pending_review', 'sent', 'partially_signed', 'signed', 'voided')),
  signed_pdf_url text,
  signed_pdf_storage_path text,
  created_by uuid references auth.users(id),
  sent_at timestamptz,
  signed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index documents_quote_id_idx on public.documents(quote_id);
create index documents_signing_session_idx on public.documents(signing_session_id);

alter table public.documents enable row level security;

create policy "Users can read documents of accessible quotes"
  on public.documents for select
  using (owns_quote(quote_id) or is_manager_or_admin());

create policy "Users can create documents on accessible quotes"
  on public.documents for insert
  with check (owns_quote(quote_id) or is_manager_or_admin());

create policy "Users can update documents on accessible quotes"
  on public.documents for update
  using (owns_quote(quote_id) or is_manager_or_admin());

-- The DocsAutomator webhook route writes with the service role key (bypasses RLS).

-- ─── 2) quotes: service start date + sent_for_signature status ───────────────

alter table public.quotes add column service_start_date date;

-- quotes.status is plain text (no CHECK constraint as of 2026-06-12), but the
-- SECURITY DEFINER functions are the real gatekeepers. Verify both accept the
-- new value:
--   * update_quote_status(qid uuid, new_status text) — if it validates against
--     an allowlist, add 'sent_for_signature'.
--   * save_quote(quote_data jsonb) — add service_start_date to the upsert
--     column list:  service_start_date = (quote_data->>'service_start_date')::date
-- Run in the dashboard SQL editor:
--   select pg_get_functiondef(oid) from pg_proc where proname in ('update_quote_status', 'save_quote');
-- and update the function bodies accordingly.

-- ─── 3) Private storage bucket for executed contracts ────────────────────────

insert into storage.buckets (id, name, public)
values ('contracts', 'contracts', false);

-- No public storage policies: uploads happen via the service role (webhook),
-- reads via short-lived signed URLs created by authenticated app code.
create policy "Users can read contracts of accessible quotes"
  on storage.objects for select
  using (
    bucket_id = 'contracts'
    and owns_quote(((string_to_array(name, '/'))[1])::uuid)
  );
