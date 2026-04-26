alter table public.expert_section_comments
  add column if not exists is_phase_2_reviewed boolean not null default false;
