begin;

alter table public.portfolio_participants
  add column if not exists publication_status text not null default 'published';
alter table public.portfolio_courses
  add column if not exists publication_status text not null default 'published';
alter table public.portfolio_settings
  add column if not exists publication_status text not null default 'published';
alter table public.portfolio_evidence
  add column if not exists updated_at timestamptz not null default now();

alter table public.portfolio_participants
  drop constraint if exists portfolio_participants_publication_status_check,
  add constraint portfolio_participants_publication_status_check
    check (publication_status in ('draft', 'review', 'published'));
alter table public.portfolio_courses
  drop constraint if exists portfolio_courses_publication_status_check,
  add constraint portfolio_courses_publication_status_check
    check (publication_status in ('draft', 'review', 'published'));
alter table public.portfolio_settings
  drop constraint if exists portfolio_settings_publication_status_check,
  add constraint portfolio_settings_publication_status_check
    check (publication_status in ('draft', 'review', 'published'));

alter table public.portfolio_academic_reflections
  drop constraint if exists portfolio_academic_reflections_status_check,
  add constraint portfolio_academic_reflections_status_check
    check (status in ('draft', 'review', 'published'));

create index if not exists portfolio_participants_publication_idx
  on public.portfolio_participants(publication_status, participation_status);
create index if not exists portfolio_courses_publication_idx
  on public.portfolio_courses(publication_status, trimester, course_number);
create index if not exists portfolio_settings_publication_idx
  on public.portfolio_settings(key, publication_status);
create index if not exists portfolio_evidence_updated_at_idx
  on public.portfolio_evidence(updated_at desc);

create or replace function public.set_portfolio_content_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

 drop trigger if exists portfolio_participants_content_updated_at on public.portfolio_participants;
create trigger portfolio_participants_content_updated_at
before update on public.portfolio_participants
for each row execute function public.set_portfolio_content_updated_at();
drop trigger if exists portfolio_courses_content_updated_at on public.portfolio_courses;
create trigger portfolio_courses_content_updated_at
before update on public.portfolio_courses
for each row execute function public.set_portfolio_content_updated_at();
drop trigger if exists portfolio_experiences_content_updated_at on public.portfolio_experiences;
create trigger portfolio_experiences_content_updated_at
before update on public.portfolio_experiences
for each row execute function public.set_portfolio_content_updated_at();
drop trigger if exists portfolio_evidence_content_updated_at on public.portfolio_evidence;
create trigger portfolio_evidence_content_updated_at
before update on public.portfolio_evidence
for each row execute function public.set_portfolio_content_updated_at();
drop trigger if exists portfolio_reflections_content_updated_at on public.portfolio_reflections;
create trigger portfolio_reflections_content_updated_at
before update on public.portfolio_reflections
for each row execute function public.set_portfolio_content_updated_at();
drop trigger if exists portfolio_academic_reflections_content_updated_at on public.portfolio_academic_reflections;
create trigger portfolio_academic_reflections_content_updated_at
before update on public.portfolio_academic_reflections
for each row execute function public.set_portfolio_content_updated_at();
drop trigger if exists portfolio_settings_content_updated_at on public.portfolio_settings;
create trigger portfolio_settings_content_updated_at
before update on public.portfolio_settings
for each row execute function public.set_portfolio_content_updated_at();

-- Public visibility is enforced here as well as in the client queries.
drop policy if exists participants_public_read on public.portfolio_participants;
create policy participants_public_read on public.portfolio_participants
for select to anon, authenticated
using (
  public.is_portfolio_admin()
  or public.is_portfolio_participant(id)
  or (publication_status = 'published' and participation_status <> 'paused')
);

grant select (publication_status, updated_at) on public.portfolio_participants to anon, authenticated;

drop policy if exists courses_public_read on public.portfolio_courses;
create policy courses_public_read on public.portfolio_courses
for select to anon, authenticated
using (publication_status = 'published' or public.is_portfolio_admin());

drop policy if exists settings_public_read on public.portfolio_settings;
create policy settings_public_read on public.portfolio_settings
for select to anon, authenticated
using (
  public.is_portfolio_admin()
  or (key = 'curriculum' and publication_status = 'published')
  or (key = 'institution' and publication_status = 'published')
);

grant select (publication_status, updated_at) on public.portfolio_settings to anon, authenticated;

commit;
