begin;
create table public.portfolio_academic_reflections (
  id uuid primary key default gen_random_uuid(),
  section_key text not null check (section_key in ('course', 'final_summary', 'final_pedagogy', 'final_ethics', 'final_individual')),
  course_id uuid references public.portfolio_courses(id) on delete restrict,
  participant_id uuid references public.portfolio_participants(id) on delete restrict,
  author_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  title text not null default '',
  content text not null default '',
  learning_acquired text not null default '',
  practical_application text not null default '',
  difficulties text not null default '',
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint academic_reflection_section_scope check (
    (section_key = 'course' and course_id is not null and participant_id is not null)
    or (section_key = 'final_individual' and course_id is null and participant_id is not null)
    or (section_key in ('final_summary', 'final_pedagogy', 'final_ethics') and course_id is null and participant_id is null)
  )
);
create unique index portfolio_academic_reflections_course_owner_unique
  on public.portfolio_academic_reflections(course_id, participant_id)
  where section_key = 'course';
create unique index portfolio_academic_reflections_final_owner_unique
  on public.portfolio_academic_reflections(participant_id)
  where section_key = 'final_individual';
create unique index portfolio_academic_reflections_final_group_unique
  on public.portfolio_academic_reflections(section_key)
  where section_key in ('final_summary', 'final_pedagogy', 'final_ethics');
create index portfolio_academic_reflections_public_idx
  on public.portfolio_academic_reflections(section_key, status, updated_at desc);
create index portfolio_academic_reflections_course_idx
  on public.portfolio_academic_reflections(course_id, updated_at desc)
  where section_key = 'course';

create or replace function public.set_portfolio_academic_reflection_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
create trigger portfolio_academic_reflections_updated_at
before update on public.portfolio_academic_reflections
for each row execute function public.set_portfolio_academic_reflection_updated_at();

alter table public.portfolio_academic_reflections enable row level security;
revoke all on public.portfolio_academic_reflections from anon, authenticated;
grant select on public.portfolio_academic_reflections to anon, authenticated;
grant insert, update, delete on public.portfolio_academic_reflections to authenticated;
create policy academic_reflections_read on public.portfolio_academic_reflections
for select to anon, authenticated
using (status = 'published' or public.is_portfolio_admin() or author_id = (select auth.uid()));
create policy academic_reflections_insert on public.portfolio_academic_reflections
for insert to authenticated
with check (
  author_id = (select auth.uid())
  and (
    (section_key in ('course', 'final_individual') and public.is_portfolio_participant(participant_id))
    or (section_key in ('final_summary', 'final_pedagogy', 'final_ethics') and public.is_portfolio_admin())
  )
);
create policy academic_reflections_update on public.portfolio_academic_reflections
for update to authenticated
using (
  public.is_portfolio_admin()
  or (author_id = (select auth.uid()) and section_key in ('course', 'final_individual') and public.is_portfolio_participant(participant_id))
)
with check (
  public.is_portfolio_admin()
  or (author_id = (select auth.uid()) and section_key in ('course', 'final_individual') and public.is_portfolio_participant(participant_id))
);
create policy academic_reflections_delete on public.portfolio_academic_reflections
for delete to authenticated
using (
  public.is_portfolio_admin()
  or (author_id = (select auth.uid()) and section_key in ('course', 'final_individual') and public.is_portfolio_participant(participant_id))
);
commit;
