-- BNC Motors website: where the four forms store their entries.
-- Run this ONCE in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
-- It is safe to run again: nothing is dropped and nothing is overwritten.
--
-- What it makes:
--   1. table  public.bnc_form_entries : one row per entry (booking, fleet, careers, dealer)
--   2. bucket bnc-resumes (private)   : the résumé files from the careers form, 5 MB each, PDF or Word
-- The website uses the project's PUBLISHABLE key. With these rules it can only ADD rows and files.
-- It cannot read, change or delete anything. Your team reads the entries in the dashboard (Table Editor).

create table if not exists public.bnc_form_entries (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  form        text not null check (form in ('booking', 'fleet', 'careers', 'dealer')),
  name        text check (char_length(name)   <= 200),
  mobile      text check (char_length(mobile) <= 40),
  email       text check (char_length(email)  <= 200),
  city        text check (char_length(city)   <= 120),
  answers     jsonb not null default '{}'::jsonb check (pg_column_size(answers) < 20000),   -- every answer of the form
  file_path   text check (char_length(file_path) <= 300),   -- careers: where the résumé sits in the bucket
  file_name   text check (char_length(file_name) <= 200),
  page        text check (char_length(page) <= 200),
  status      text not null default 'new'                   -- for the team: new / contacted / closed
);

comment on table public.bnc_form_entries is 'Entries from the BNC Motors website forms. The website may insert only.';
create index if not exists bnc_form_entries_form_time on public.bnc_form_entries (form, created_at desc);

alter table public.bnc_form_entries enable row level security;

drop policy if exists "website can add entries" on public.bnc_form_entries;
create policy "website can add entries" on public.bnc_form_entries
  for insert to anon
  with check (status = 'new');
-- No select / update / delete policy for the website: it can add, never read.

revoke all on public.bnc_form_entries from anon;
grant insert on public.bnc_form_entries to anon;

-- The résumé files: a private bucket, 5 MB a file, PDF or Word only.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('bnc-resumes', 'bnc-resumes', false, 5242880,
        array['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
on conflict (id) do nothing;

drop policy if exists "website can add bnc resumes" on storage.objects;
create policy "website can add bnc resumes" on storage.objects
  for insert to anon
  with check (bucket_id = 'bnc-resumes');

-- To read the entries: Dashboard -> Table Editor -> bnc_form_entries (filter the "form" column).
-- To open a résumé:    Dashboard -> Storage -> bnc-resumes -> the path in "file_path".
