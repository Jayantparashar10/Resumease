-- Safe patch for existing Supabase projects
-- Adds new resume analysis column and github cache table if they are missing.

alter table public.resumes
  add column if not exists link_analysis jsonb not null default '{}'::jsonb;

-- Safety update for old rows in case the column was added earlier as nullable.
update public.resumes
set link_analysis = '{}'::jsonb
where link_analysis is null;

create table if not exists public.github_analysis (
  username text primary key,
  data jsonb not null default '{}'::jsonb,
  analyzed_at timestamptz not null default now()
);

create table if not exists public.portfolio_analysis (
  url text primary key,
  data jsonb not null default '{}'::jsonb,
  analyzed_at timestamptz not null default now()
);

create index if not exists idx_github_analysis_analyzed_at
  on public.github_analysis(analyzed_at);

create index if not exists idx_portfolio_analysis_analyzed_at
  on public.portfolio_analysis(analyzed_at);
