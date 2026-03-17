-- Resumease Phase 1 schema for Supabase (PostgreSQL)
-- Run in Supabase SQL editor.

-- NOTE:
-- We intentionally do not run CREATE EXTENSION here because some environments
-- execute scripts in read-only transactions and reject extension DDL.
-- Supabase projects normally have pgcrypto available by default.

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null,
  avatar_url text,
  role text not null default 'student' check (role in ('student', 'recruiter', 'admin')),
  is_active boolean not null default true,
  onboarding_completed boolean not null default false,
  onboarding_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_login_at timestamptz
);

create table if not exists public.resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  filename text not null,
  file_size integer,
  file_path text,
  parsed_text text,
  extracted_links jsonb not null default '{}'::jsonb,
  skills jsonb not null default '[]'::jsonb,
  sections jsonb not null default '{}'::jsonb,
  link_analysis jsonb not null default '{}'::jsonb,
  parser_version text not null default 'v1',
  screening_summary jsonb not null default '{}'::jsonb,
  status text not null default 'pending',
  uploaded_at timestamptz not null default now()
);

create table if not exists public.github_analysis (
  username text primary key,
  data jsonb not null default '{}'::jsonb,
  analyzed_at timestamptz not null default now()
);

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  recruiter_id uuid not null references public.profiles(user_id) on delete cascade,
  title text not null,
  company text not null,
  description text not null,
  required_skills jsonb not null default '[]'::jsonb,
  location text,
  experience_years integer,
  status text not null default 'active',
  posted_at timestamptz not null default now()
);

create table if not exists public.ats_scores (
  id uuid primary key default gen_random_uuid(),
  resume_id uuid not null references public.resumes(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  overall_score numeric(5,2) not null default 0,
  breakdown jsonb not null default '{}'::jsonb,
  feedback jsonb not null default '{}'::jsonb,
  suggestions jsonb not null default '[]'::jsonb,
  matched_skills jsonb not null default '[]'::jsonb,
  missing_skills jsonb not null default '[]'::jsonb,
  llm_provider text,
  model_name text,
  tokens_used integer not null default 0,
  estimated_cost numeric(12,6) not null default 0,
  fallback_reason text,
  created_at timestamptz not null default now()
);

create index if not exists idx_resumes_user_id on public.resumes(user_id);
create index if not exists idx_jobs_recruiter_id on public.jobs(recruiter_id);
create index if not exists idx_ats_scores_job_id on public.ats_scores(job_id);
create index if not exists idx_ats_scores_resume_job on public.ats_scores(resume_id, job_id);
create index if not exists idx_github_analysis_analyzed_at on public.github_analysis(analyzed_at);

alter table public.profiles enable row level security;
alter table public.resumes enable row level security;
alter table public.jobs enable row level security;
alter table public.ats_scores enable row level security;

-- Minimal starter RLS policies. Tighten further for production.
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='profiles' and policyname='profiles_self_select'
  ) then
    create policy profiles_self_select on public.profiles
      for select using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='profiles' and policyname='profiles_self_update'
  ) then
    create policy profiles_self_update on public.profiles
      for update using (auth.uid() = user_id);
  end if;
end $$;
