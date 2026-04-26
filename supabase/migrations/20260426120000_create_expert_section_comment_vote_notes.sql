create table if not exists public.expert_section_comment_vote_notes (
  id uuid primary key default gen_random_uuid(),
  consultation_id uuid not null references public.consultations(id) on delete cascade,
  comment_id uuid not null references public.expert_section_comments(id) on delete cascade,
  author_profile_id uuid not null references public.profiles(id) on delete restrict,
  body_text text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint expert_section_comment_vote_notes_body_check
    check (length(btrim(body_text)) > 0 and char_length(body_text) <= 2500),
  constraint expert_section_comment_vote_notes_unique unique (comment_id, author_profile_id)
);

create index if not exists expert_section_comment_vote_notes_consultation_idx
  on public.expert_section_comment_vote_notes (consultation_id);

create index if not exists expert_section_comment_vote_notes_comment_idx
  on public.expert_section_comment_vote_notes (comment_id);

drop trigger if exists trg_expert_section_comment_vote_notes_updated_at
  on public.expert_section_comment_vote_notes;

create trigger trg_expert_section_comment_vote_notes_updated_at
before update on public.expert_section_comment_vote_notes
for each row execute function public.set_updated_at();
