alter table public.expert_section_comments
  add column if not exists display_order integer;

with ordered_comments as (
  select
    id,
    row_number() over (
      partition by consultation_id, section_id
      order by created_at asc, id asc
    ) as next_display_order
  from public.expert_section_comments
  where display_order is null
)
update public.expert_section_comments as comments
set display_order = ordered_comments.next_display_order
from ordered_comments
where comments.id = ordered_comments.id;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'expert_section_comments_display_order_positive'
  ) then
    alter table public.expert_section_comments
      add constraint expert_section_comments_display_order_positive
      check (display_order is null or display_order > 0);
  end if;
end
$$;

create index if not exists expert_section_comments_section_display_order_idx
  on public.expert_section_comments (
    consultation_id,
    section_id,
    is_active,
    display_order,
    created_at
  );
