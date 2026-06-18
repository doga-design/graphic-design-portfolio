-- dodoGPT chat logging table
-- Run this in Supabase SQL Editor once per project.

create extension if not exists pgcrypto;

create table if not exists public.chat_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  -- Anonymous client-side id for grouping a visitor's chat turns.
  session_id text not null,

  -- Optional privacy-preserving visitor metadata.
  ip_hash text,
  user_agent text,
  request_origin text,
  request_referer text,
  visitor_country text,
  visitor_region text,
  visitor_city text,

  -- The actual chat turn.
  user_message text not null,
  assistant_message text not null,
  messages jsonb not null default '[]'::jsonb,

  -- Public portfolio page context, when the user opened chat from a case study.
  page_context_type text,
  page_context_slug text,
  page_context_title text,
  page_context_path text
);

alter table public.chat_logs enable row level security;

-- No anon/auth policies on purpose.
-- Inserts should come only from the Vercel serverless function using SUPABASE_SERVICE_ROLE_KEY.

create index if not exists chat_logs_created_at_idx
  on public.chat_logs (created_at desc);

create index if not exists chat_logs_session_id_idx
  on public.chat_logs (session_id);

create index if not exists chat_logs_visitor_country_idx
  on public.chat_logs (visitor_country);

create index if not exists chat_logs_page_context_slug_idx
  on public.chat_logs (page_context_slug);

comment on table public.chat_logs is
  'Server-side dodoGPT chat transcripts. RLS enabled; no public client policies.';
