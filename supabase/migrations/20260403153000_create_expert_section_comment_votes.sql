create table if not exists public.expert_section_comment_votes (
  id uuid primary key default gen_random_uuid(),
  consultation_id uuid not null references public.consultations(id) on delete cascade,
  comment_id uuid not null references public.expert_section_comments(id) on delete cascade,
  voter_profile_id uuid not null references public.profiles(id) on delete restrict,
  score integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint expert_section_comment_votes_score_check check (score >= 0 and score <= 4),
  constraint expert_section_comment_votes_unique unique (comment_id, voter_profile_id)
);

create index if not exists expert_section_comment_votes_consultation_voter_idx
  on public.expert_section_comment_votes (consultation_id, voter_profile_id);

create index if not exists expert_section_comment_votes_comment_idx
  on public.expert_section_comment_votes (comment_id);

drop trigger if exists trg_expert_section_comment_votes_updated_at
  on public.expert_section_comment_votes;

create trigger trg_expert_section_comment_votes_updated_at
before update on public.expert_section_comment_votes
for each row execute function public.set_updated_at();
