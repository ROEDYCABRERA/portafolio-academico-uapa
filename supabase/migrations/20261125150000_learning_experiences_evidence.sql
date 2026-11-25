begin;

alter table public.portfolio_experiences
  add column if not exists trimester integer,
  add column if not exists learning_outcomes text not null default '',
  add column if not exists activity_reflection text not null default '';

update public.portfolio_experiences e
set trimester = c.trimester
from public.portfolio_courses c
where e.course_id = c.id and e.trimester is null;

create table if not exists public.portfolio_experience_participants (
  experience_id uuid not null references public.portfolio_experiences(id) on delete cascade,
  participant_id uuid not null references public.portfolio_participants(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (experience_id, participant_id)
);

insert into public.portfolio_experience_participants (experience_id, participant_id)
select id, participant_id from public.portfolio_experiences
on conflict do nothing;

alter table public.portfolio_evidence
  alter column experience_id drop not null,
  add column if not exists course_id uuid references public.portfolio_courses(id) on delete cascade,
  add column if not exists evidence_type text not null default 'image',
  add column if not exists owner_code text not null default 'TEAM',
  add column if not exists external_url text,
  add column if not exists evidence_date date,
  add column if not exists notes text not null default '';

update public.portfolio_evidence e
set course_id = x.course_id
from public.portfolio_experiences x
where e.experience_id = x.id and e.course_id is null;

alter table public.portfolio_evidence
  add constraint portfolio_evidence_type_check
    check (evidence_type in ('image', 'pdf', 'presentation', 'video', 'link')),
  add constraint portfolio_evidence_owner_check
    check (owner_code in ('TEAM', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6')),
  add constraint portfolio_evidence_source_check
    check ((storage_path <> '' and external_url is null) or (storage_path = '' and external_url is not null));

alter table public.portfolio_experience_participants enable row level security;
grant select, insert, update, delete on public.portfolio_experience_participants to authenticated;
create policy experience_participants_admin_select on public.portfolio_experience_participants
  for select to authenticated using (public.is_portfolio_admin());
create policy experience_participants_admin_insert on public.portfolio_experience_participants
  for insert to authenticated with check (public.is_portfolio_admin());
create policy experience_participants_admin_update on public.portfolio_experience_participants
  for update to authenticated using (public.is_portfolio_admin()) with check (public.is_portfolio_admin());
create policy experience_participants_admin_delete on public.portfolio_experience_participants
  for delete to authenticated using (public.is_portfolio_admin());

create policy portfolio_evidence_admin_all on public.portfolio_evidence
  for all to authenticated
  using (public.is_portfolio_admin())
  with check (public.is_portfolio_admin());

grant select, insert, update, delete on public.portfolio_evidence to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('portfolio-participants', 'portfolio-participants', false, 10485760, array['image/jpeg','image/png','image/webp']),
  ('portfolio-courses', 'portfolio-courses', false, 20971520, array['application/pdf','application/vnd.openxmlformats-officedocument.presentationml.presentation']),
  ('portfolio-photos', 'portfolio-photos', false, 10485760, array['image/jpeg','image/png','image/webp']),
  ('portfolio-evidence-files', 'portfolio-evidence-files', false, 52428800, array['image/jpeg','image/png','image/webp','application/pdf','application/vnd.openxmlformats-officedocument.presentationml.presentation','video/mp4','video/webm']);

create policy portfolio_managed_files_select on storage.objects
  for select to authenticated
  using (bucket_id in ('portfolio-participants','portfolio-courses','portfolio-photos','portfolio-evidence-files') and public.is_portfolio_admin());
create policy portfolio_managed_files_insert on storage.objects
  for insert to authenticated
  with check (bucket_id in ('portfolio-participants','portfolio-courses','portfolio-photos','portfolio-evidence-files') and public.is_portfolio_admin());
create policy portfolio_managed_files_update on storage.objects
  for update to authenticated
  using (bucket_id in ('portfolio-participants','portfolio-courses','portfolio-photos','portfolio-evidence-files') and public.is_portfolio_admin())
  with check (bucket_id in ('portfolio-participants','portfolio-courses','portfolio-photos','portfolio-evidence-files') and public.is_portfolio_admin());
create policy portfolio_managed_files_delete on storage.objects
  for delete to authenticated
  using (bucket_id in ('portfolio-participants','portfolio-courses','portfolio-photos','portfolio-evidence-files') and public.is_portfolio_admin());

commit;
