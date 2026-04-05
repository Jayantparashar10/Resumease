-- Adds portfolio cache table

create table if not exists public.portfolio_analysis (
  url text primary key,
  data jsonb not null default '{}'::jsonb,
  analyzed_at timestamptz not null default now()
);

create index if not exists idx_portfolio_analysis_analyzed_at
  on public.portfolio_analysis(analyzed_at);