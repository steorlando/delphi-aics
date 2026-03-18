create table if not exists public.expert_section_comments (
  id uuid primary key default gen_random_uuid(),
  consultation_id uuid not null references public.consultations(id) on delete cascade,
  section_id uuid not null references public.document_sections(id) on delete cascade,
  expert_profile_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body_text text,
  priority text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint expert_section_comments_title_not_blank check (btrim(title) <> ''),
  constraint expert_section_comments_priority_check check (priority in ('low', 'medium', 'high'))
);

create index if not exists expert_section_comments_consultation_idx
  on public.expert_section_comments (consultation_id);

create index if not exists expert_section_comments_section_idx
  on public.expert_section_comments (section_id);

create index if not exists expert_section_comments_expert_idx
  on public.expert_section_comments (expert_profile_id, created_at desc);

alter table public.expert_section_comments enable row level security;
