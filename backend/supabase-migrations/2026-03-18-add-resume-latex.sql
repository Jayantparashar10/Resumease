-- Adds LaTeX source persistence for resume editing/generation.

alter table public.resumes
  add column if not exists latex_source text,
  add column if not exists latex_updated_at timestamptz;
