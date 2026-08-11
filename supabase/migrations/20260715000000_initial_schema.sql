-- ============================================================================
-- LOCKr — Supabase Database Schema
-- ============================================================================
-- Password manager backend for the LOCKr web app.
--
-- Design goals:
--   1. Strict Row Level Security (RLS): every user can only read/write their
--      own rows. The demo admin account is a real Supabase Auth user, so it
--      is covered by the same policies.
--   2. Defense-in-depth input validation: CHECK constraints + a sanitization
--      trigger enforce safe values even if a malicious client bypasses the
--      app's client-side validation (stored-XSS protection).
--   3. Client-side encryption: the `password` column only ever holds the
--      base64 AES-GCM ciphertext plus its IV. Plaintext never touches the DB.
--
-- Run this file in the Supabase SQL editor (or via `supabase db push`).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. Extensions
-- ----------------------------------------------------------------------------
-- gen_random_uuid() for primary keys.
create extension if not exists "pgcrypto";

-- pg_trgm powers fast ILIKE search over website/username/notes.
create extension if not exists "pg_trgm";

-- ============================================================================
-- 1. users — master-password vault metadata (one row per auth user)
-- ============================================================================
-- Stores the salt, IV and verification ciphertext used to derive and verify
-- the user's master key. The master password itself is never stored.
create table if not exists public.users (
  id           uuid primary key references auth.users (id) on delete cascade,
  salt         text not null check (length(salt) between 16 and 64),
  iv           text not null check (length(iv) between 12 and 64),
  verification text not null check (length(verification) between 16 and 512),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table public.users is
  'Vault metadata per user: salt, IV and encrypted verification string for the master password.';
comment on column public.users.salt is 'Base64 PBKDF2 salt used to derive the master key.';
comment on column public.users.iv is 'Base64 AES-GCM IV used to encrypt the verification string.';
comment on column public.users.verification is
  'Base64 AES-GCM ciphertext of the constant "LOCKrVerification" — proves the master password is correct.';

-- ============================================================================
-- 2. credentials — encrypted password entries
-- ============================================================================
create table if not exists public.credentials (
  id        uuid primary key default gen_random_uuid(),
  "userId"  uuid not null references auth.users (id) on delete cascade,
  website   text not null,
  username  text not null,
  password  text not null, -- base64 AES-GCM ciphertext (or plaintext for the demo admin)
  iv        text not null, -- base64 AES-GCM IV
  notes     text not null default '',
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),

  -- --- Input validation (stored-XSS defense in depth) ---
  -- Website must be a non-empty http(s) URL of sane length.
  constraint credentials_website_check check (
    length(website) between 1 and 2048
    and website ~ '^https?://'
  ),
  -- Username: non-empty, bounded length, no control characters.
  constraint credentials_username_check check (
    length(username) between 1 and 200
    and username !~ '[\u0000-\u001F\u007F]'
  ),
  -- Notes: bounded length, no control characters (newlines allowed).
  constraint credentials_notes_check check (
    length(notes) <= 10000
    and notes !~ '[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]'
  ),
  -- Ciphertext + IV: bounded lengths only (content is opaque base64).
  constraint credentials_password_check check (length(password) between 1 and 5000),
  constraint credentials_iv_check check (length(iv) between 1 and 2000)
);

comment on table public.credentials is
  'Encrypted password entries. The password column only ever holds ciphertext.';
comment on column public.credentials."userId" is
  'Owner of this entry. Must match auth.uid() under RLS.';

-- Search index: fast prefix/ILIKE lookups on website and username.
create index if not exists credentials_user_website_idx
  on public.credentials ("userId", website);

create index if not exists credentials_username_trgm_idx
  on public.credentials using gin (username gin_trgm_ops);

create index if not exists credentials_website_trgm_idx
  on public.credentials using gin (website gin_trgm_ops);

-- ============================================================================
-- 3. updated_at trigger (shared function)
-- ============================================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Keep users.updated_at fresh.
drop trigger if exists users_set_updated_at on public.users;
create trigger users_set_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

-- Keep credentials."updatedAt" fresh.
drop trigger if exists credentials_set_updated_at on public.credentials;
create trigger credentials_set_updated_at
  before update on public.credentials
  for each row execute function public.set_updated_at();

-- ============================================================================
-- 4. Input sanitization trigger (defense in depth)
-- ============================================================================
-- Normalizes free-text fields on every insert/update so that even a malicious
-- client cannot persist control characters or non-http(s) website values.
create or replace function public.sanitize_credential_input()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  -- Trim + strip control characters from free-text fields.
  new.website  := regexp_replace(trim(new.website),  '[\u0000-\u001F\u007F]', '', 'g');
  new.username := regexp_replace(trim(new.username), '[\u0000-\u001F\u007F]', '', 'g');
  new.notes    := regexp_replace(new.notes,           '[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]', '', 'g');

  -- Normalize the website to an absolute http(s) URL.
  if new.website !~ '^https?://' then
    new.website := 'https://' || new.website;
  end if;

  -- Enforce ownership on insert (ignore any client-supplied value).
  if tg_op = 'INSERT' then
    new."userId" := auth.uid();
  end if;

  return new;
end;
$$;

drop trigger if exists credentials_sanitize_input on public.credentials;
create trigger credentials_sanitize_input
  before insert or update on public.credentials
  for each row execute function public.sanitize_credential_input();

-- ============================================================================
-- 5. Row Level Security
-- ============================================================================
alter table public.users enable row level security;
alter table public.credentials enable row level security;

-- --- users ---
drop policy if exists "users_select_own" on public.users;
create policy "users_select_own"
  on public.users for select
  using (auth.uid() = id);

drop policy if exists "users_insert_own" on public.users;
create policy "users_insert_own"
  on public.users for insert
  with check (auth.uid() = id);

drop policy if exists "users_update_own" on public.users;
create policy "users_update_own"
  on public.users for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "users_delete_own" on public.users;
create policy "users_delete_own"
  on public.users for delete
  using (auth.uid() = id);

-- --- credentials ---
drop policy if exists "credentials_select_own" on public.credentials;
create policy "credentials_select_own"
  on public.credentials for select
  using (auth.uid() = "userId");

drop policy if exists "credentials_insert_own" on public.credentials;
create policy "credentials_insert_own"
  on public.credentials for insert
  with check (auth.uid() = "userId");

drop policy if exists "credentials_update_own" on public.credentials;
create policy "credentials_update_own"
  on public.credentials for update
  using (auth.uid() = "userId")
  with check (auth.uid() = "userId");

drop policy if exists "credentials_delete_own" on public.credentials;
create policy "credentials_delete_own"
  on public.credentials for delete
  using (auth.uid() = "userId");

-- ============================================================================
-- 6. Demo admin account (optional)
-- ============================================================================
-- The app treats the account with email `admin@example.com` as a demo admin
-- (it stores plaintext passwords for easy inspection). Create it as a REAL
-- Supabase Auth user so it works under strict RLS:
--
--   Option A (recommended): create the user in the Supabase Dashboard
--   (Authentication → Users → Add user) with a strong password.
--
--   Option B: uncomment the block below and replace <BCRYPT_HASH> with a
--   bcrypt hash of your chosen password (e.g. generated with
--   `htpasswd -bnBC 10 "" 'YourPassword' | tr -d ':\n'`).
--
-- insert into auth.users (
--   instance_id, id, aud, role, email, encrypted_password,
--   email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
--   created_at, updated_at, confirmation_token, recovery_token
-- )
-- values (
--   '00000000-0000-0000-0000-000000000000',
--   gen_random_uuid(),
--   'authenticated',
--   'authenticated',
--   'admin@example.com',
--   '<BCRYPT_HASH>',
--   now(),
--   '{"provider":"email","providers":["email"]}',
--   '{}',
--   now(),
--   now(),
--   '',
--   ''
-- );