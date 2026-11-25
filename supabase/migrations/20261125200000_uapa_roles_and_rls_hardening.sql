begin;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'VISITANTE'
    check (role in ('SUPERADMIN', 'ADMINISTRADOR', 'PARTICIPANTE', 'VISITANTE')),
  participant_id uuid references public.portfolio_participants(id) on delete set null,
  full_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_participant_role_check
    check (role <> 'PARTICIPANTE' or participant_id is not null)
);

create table if not exists public.institutions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text not null default '',
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.programs (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete restrict,
  code text not null,
  name text not null,
  description text not null default '',
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (institution_id, code)
);

create table if not exists public.curriculum_terms (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete restrict,
  term_number smallint not null check (term_number > 0),
  academic_year text not null default '',
  name text not null,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (program_id, academic_year, term_number)
);

alter table public.portfolio_participants
  add column if not exists program_id uuid references public.programs(id) on delete set null;
alter table public.portfolio_courses
  add column if not exists curriculum_term_id uuid references public.curriculum_terms(id) on delete set null;

create unique index if not exists profiles_participant_id_unique
  on public.profiles(participant_id) where participant_id is not null;
create index if not exists profiles_role_idx on public.profiles(role);
create unique index if not exists portfolio_participants_user_id_unique
  on public.portfolio_participants(user_id) where user_id is not null;
create index if not exists portfolio_experiences_owner_status_idx
  on public.portfolio_experiences(participant_id, status, updated_at desc);
create index if not exists portfolio_evidence_status_idx
  on public.portfolio_evidence(status, created_at desc);
create index if not exists portfolio_reflections_owner_status_idx
  on public.portfolio_reflections(participant_id, status, updated_at desc);
create index if not exists portfolio_admin_audit_actor_created_idx
  on public.portfolio_admin_audit_log(actor_id, created_at desc);

create or replace function public.set_portfolio_profile_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
before update on public.profiles
for each row execute function public.set_portfolio_profile_updated_at();

create or replace function public.is_portfolio_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.role in ('SUPERADMIN', 'ADMINISTRADOR')
  );
$$;

create or replace function public.is_portfolio_superadmin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'SUPERADMIN'
  );
$$;

insert into public.profiles (id, role)
select a.user_id, 'ADMINISTRADOR'
from public.portfolio_admins a
on conflict (id) do nothing;

insert into public.profiles (id, role, participant_id)
select p.user_id, 'PARTICIPANTE', p.id
from public.portfolio_participants p
where p.user_id is not null
on conflict (id) do update
set participant_id = excluded.participant_id
where public.profiles.role = 'PARTICIPANTE';

do $$
begin
  if (select count(*) from public.portfolio_admins) = 1
     and not exists (select 1 from public.profiles where role = 'SUPERADMIN') then
    update public.profiles
    set role = 'SUPERADMIN'
    where id = (select user_id from public.portfolio_admins limit 1);
  end if;
end;
$$;

create or replace function public.sync_portfolio_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  matched_participant_id uuid;
  matched_count integer := 0;
  assigned_role text := 'VISITANTE';
begin
  if new.email_confirmed_at is not null and new.email is not null then
    select count(*), (array_agg(p.id order by p.code))[1]
    into matched_count, matched_participant_id
    from public.portfolio_participants p
    where lower(btrim(p.email)) = lower(btrim(new.email))
      and (p.user_id is null or p.user_id = new.id);

    if matched_count = 1 and matched_participant_id is not null then
      update public.portfolio_participants
      set user_id = new.id
      where id = matched_participant_id
        and (user_id is null or user_id = new.id);
    else
      matched_participant_id := null;
    end if;

    if exists (
      select 1 from public.portfolio_admin_allowlist a
      where lower(btrim(a.email)) = lower(btrim(new.email))
    ) then
      assigned_role := 'ADMINISTRADOR';
      insert into public.portfolio_admins (user_id, email)
      values (new.id, lower(btrim(new.email)))
      on conflict (user_id) do update set email = excluded.email;
    elsif exists (
      select 1 from public.profiles p
      where p.id = new.id and p.role in ('SUPERADMIN', 'ADMINISTRADOR')
    ) then
      select p.role into assigned_role from public.profiles p where p.id = new.id;
    elsif matched_participant_id is not null then
      assigned_role := 'PARTICIPANTE';
    end if;
  end if;

  insert into public.profiles (id, role, participant_id, full_name)
  values (
    new.id,
    assigned_role,
    case when assigned_role = 'PARTICIPANTE' then matched_participant_id else null end,
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do update set
    role = case
      when public.profiles.role = 'SUPERADMIN' then 'SUPERADMIN'
      when assigned_role = 'ADMINISTRADOR' then 'ADMINISTRADOR'
      when public.profiles.role = 'ADMINISTRADOR' then 'ADMINISTRADOR'
      else assigned_role
    end,
    participant_id = coalesce(
      case when assigned_role = 'PARTICIPANTE' then matched_participant_id end,
      public.profiles.participant_id
    ),
    updated_at = now();

  return new;
end;
$$;

revoke all on function public.sync_portfolio_auth_user() from public, anon, authenticated;
drop trigger if exists portfolio_auth_user_created on auth.users;
drop trigger if exists portfolio_auth_user_confirmed_or_changed on auth.users;
create trigger portfolio_auth_user_created
after insert on auth.users
for each row execute function public.sync_portfolio_auth_user();
create trigger portfolio_auth_user_confirmed_or_changed
after update on auth.users
for each row execute function public.sync_portfolio_auth_user();

create or replace function public.is_portfolio_participant_storage_path(file_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.portfolio_participants p
    where p.user_id = (select auth.uid())
      and split_part(file_name, '/', 1) = p.id::text
  );
$$;
revoke all on function public.is_portfolio_participant_storage_path(text) from public;
grant execute on function public.is_portfolio_participant_storage_path(text) to anon, authenticated;

create or replace function public.link_portfolio_participant_account(
  target_participant_id uuid,
  account_email text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_user_id uuid;
  target_email text := lower(btrim(account_email));
begin
  if not public.is_portfolio_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;

  select u.id into target_user_id
  from auth.users u
  join public.portfolio_participants p on p.id = target_participant_id
  where lower(btrim(u.email)) = target_email
    and u.email_confirmed_at is not null
    and lower(btrim(p.email)) = target_email
    and (p.user_id is null or p.user_id = u.id)
  limit 1;

  if target_user_id is null then
    raise exception 'A confirmed account matching the participant email was not found';
  end if;

  update public.portfolio_participants
  set user_id = target_user_id
  where id = target_participant_id
    and (user_id is null or user_id = target_user_id);

  insert into public.profiles (id, role, participant_id)
  values (target_user_id, 'PARTICIPANTE', target_participant_id)
  on conflict (id) do update set
    participant_id = excluded.participant_id,
    role = case when public.profiles.role in ('SUPERADMIN', 'ADMINISTRADOR')
      then public.profiles.role else 'PARTICIPANTE' end,
    updated_at = now();

  return target_user_id;
end;
$$;

create or replace function public.set_portfolio_user_role(
  target_user_id uuid,
  target_role text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_portfolio_superadmin() then
    raise exception 'Superadmin access required' using errcode = '42501';
  end if;
  if target_role not in ('SUPERADMIN', 'ADMINISTRADOR', 'PARTICIPANTE', 'VISITANTE') then
    raise exception 'Unsupported portfolio role';
  end if;
  if not exists (select 1 from auth.users u where u.id = target_user_id) then
    raise exception 'Account not found';
  end if;
  if target_role = 'PARTICIPANTE'
     and not exists (select 1 from public.portfolio_participants p where p.user_id = target_user_id) then
    raise exception 'Link a participant profile before assigning the participant role';
  end if;

  insert into public.profiles (id, role, participant_id)
  values (
    target_user_id,
    target_role,
    (select p.id from public.portfolio_participants p where p.user_id = target_user_id limit 1)
  )
  on conflict (id) do update set
    role = excluded.role,
    participant_id = coalesce(excluded.participant_id, public.profiles.participant_id),
    updated_at = now();

  if target_role in ('SUPERADMIN', 'ADMINISTRADOR') then
    insert into public.portfolio_admins (user_id, email)
    select u.id, lower(u.email) from auth.users u where u.id = target_user_id
    on conflict (user_id) do update set email = excluded.email;
  else
    delete from public.portfolio_admins where user_id = target_user_id;
  end if;
end;
$$;

revoke all on function public.link_portfolio_participant_account(uuid, text) from public, anon;
revoke all on function public.set_portfolio_user_role(uuid, text) from public, anon, authenticated;
grant execute on function public.link_portfolio_participant_account(uuid, text) to authenticated;
grant execute on function public.set_portfolio_user_role(uuid, text) to authenticated;

create or replace function public.guard_portfolio_participant_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is not null and not public.is_portfolio_admin() then
    if new.id is distinct from old.id
      or new.code is distinct from old.code
      or new.enrollment is distinct from old.enrollment
      or new.email is distinct from old.email
      or new.participation_status is distinct from old.participation_status
      or new.program_id is distinct from old.program_id
      or new.joined_at is distinct from old.joined_at
      or new.user_id is distinct from old.user_id
      or new.created_at is distinct from old.created_at then
      raise exception 'Participants may only edit their authorized profile fields' using errcode = '42501';
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists portfolio_participants_guard_profile on public.portfolio_participants;
create trigger portfolio_participants_guard_profile
before update on public.portfolio_participants
for each row execute function public.guard_portfolio_participant_profile();

create or replace function public.link_confirmed_account_to_participant()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  matched_user_id uuid;
  matches integer;
begin
  if new.email is null or new.email = '' then return new; end if;
  select count(*), (array_agg(u.id order by u.created_at))[1]
  into matches, matched_user_id
  from auth.users u
  where u.email_confirmed_at is not null
    and lower(btrim(u.email)) = lower(btrim(new.email));

  if matches = 1 and (new.user_id is null or new.user_id = matched_user_id) then
    update public.portfolio_participants set user_id = matched_user_id where id = new.id;
    insert into public.profiles (id, role, participant_id)
    values (matched_user_id, 'PARTICIPANTE', new.id)
    on conflict (id) do update set
      participant_id = excluded.participant_id,
      role = case when public.profiles.role in ('SUPERADMIN', 'ADMINISTRADOR')
        then public.profiles.role else 'PARTICIPANTE' end,
      updated_at = now();
  end if;
  return new;
end;
$$;

revoke all on function public.link_confirmed_account_to_participant() from public, anon, authenticated;
drop trigger if exists portfolio_participant_email_link on public.portfolio_participants;
drop trigger if exists portfolio_participant_created_link on public.portfolio_participants;
create trigger portfolio_participant_created_link
after insert on public.portfolio_participants
for each row execute function public.link_confirmed_account_to_participant();
create trigger portfolio_participant_email_link
after update of email on public.portfolio_participants
for each row execute function public.link_confirmed_account_to_participant();

alter table public.institutions enable row level security;
alter table public.programs enable row level security;
alter table public.curriculum_terms enable row level security;
grant select on public.institutions, public.programs, public.curriculum_terms to anon, authenticated;
grant insert, update, delete on public.institutions, public.programs, public.curriculum_terms to authenticated;

create policy institutions_public_read on public.institutions
for select to anon, authenticated using (status = 'published' or public.is_portfolio_admin());
create policy institutions_admin_manage on public.institutions
for all to authenticated using (public.is_portfolio_admin()) with check (public.is_portfolio_admin());
create policy programs_public_read on public.programs
for select to anon, authenticated using (status = 'published' or public.is_portfolio_admin());
create policy programs_admin_manage on public.programs
for all to authenticated using (public.is_portfolio_admin()) with check (public.is_portfolio_admin());
create policy curriculum_terms_public_read on public.curriculum_terms
for select to anon, authenticated using (status = 'published' or public.is_portfolio_admin());
create policy curriculum_terms_admin_manage on public.curriculum_terms
for all to authenticated using (public.is_portfolio_admin()) with check (public.is_portfolio_admin());

 drop trigger if exists institutions_updated_at on public.institutions;
create trigger institutions_updated_at before update on public.institutions
for each row execute function public.set_portfolio_profile_updated_at();
drop trigger if exists programs_updated_at on public.programs;
create trigger programs_updated_at before update on public.programs
for each row execute function public.set_portfolio_profile_updated_at();
drop trigger if exists curriculum_terms_updated_at on public.curriculum_terms;
create trigger curriculum_terms_updated_at before update on public.curriculum_terms
for each row execute function public.set_portfolio_profile_updated_at();

alter table public.profiles enable row level security;
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (full_name) on public.profiles to authenticated;
drop policy if exists profiles_select_own_or_admin on public.profiles;
create policy profiles_select_own_or_admin on public.profiles
for select to authenticated
using (id = (select auth.uid()) or public.is_portfolio_admin());
drop policy if exists profiles_update_own_name on public.profiles;
create policy profiles_update_own_name on public.profiles
for update to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

revoke all on public.portfolio_participants from anon;
grant select (id, code, full_name, professional_area, photo_path, bio, participation_status, joined_at)
  on public.portfolio_participants to anon;
grant select on public.portfolio_participants to authenticated;
grant update on public.portfolio_participants to authenticated;
drop policy if exists participants_owner_update on public.portfolio_participants;
create policy participants_owner_update on public.portfolio_participants
for update to authenticated
using (public.is_portfolio_participant(id))
with check (public.is_portfolio_participant(id));

-- Only the superadmin may manage the account allowlist or grant administrator roles.
drop policy if exists admins_manage_admin on public.portfolio_admins;
drop policy if exists admin_allowlist_admin on public.portfolio_admin_allowlist;
create policy admins_manage_superadmin on public.portfolio_admins
for all to authenticated
using (public.is_portfolio_superadmin())
with check (public.is_portfolio_superadmin());
create policy admin_allowlist_superadmin on public.portfolio_admin_allowlist
for all to authenticated
using (public.is_portfolio_superadmin())
with check (public.is_portfolio_superadmin());

-- The public portfolio may read only the published curriculum settings.
drop policy if exists settings_public_read on public.portfolio_settings;
create policy settings_public_read on public.portfolio_settings
for select to anon, authenticated
using (key = 'curriculum' or public.is_portfolio_admin());

-- Private objects remain private. Published evidence may be signed for public display;
-- participant uploads are scoped to a UUID folder matching their linked profile.
do $$
declare
  p record;
begin
  for p in
    select policyname from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname ilike 'portfolio%'
  loop
    execute format('drop policy %I on storage.objects', p.policyname);
  end loop;
end;
$$;

create policy portfolio_objects_read_authorized on storage.objects
for select to anon, authenticated
using (
  bucket_id in ('portfolio-evidence', 'portfolio-evidence-files', 'portfolio-participants', 'portfolio-courses', 'portfolio-photos')
  and (
    public.is_portfolio_admin()
    or (bucket_id = 'portfolio-evidence' and public.is_portfolio_participant_storage_path(name))
    or exists (
      select 1 from public.portfolio_evidence e
      where e.storage_path = name and e.status = 'published'
    )
  )
);

create policy portfolio_objects_insert_authorized on storage.objects
for insert to authenticated
with check (
  public.is_portfolio_admin()
  or (bucket_id = 'portfolio-evidence' and public.is_portfolio_participant_storage_path(name))
);

create policy portfolio_objects_update_authorized on storage.objects
for update to authenticated
using (
  public.is_portfolio_admin()
  or (bucket_id = 'portfolio-evidence' and public.is_portfolio_participant_storage_path(name))
)
with check (
  public.is_portfolio_admin()
  or (bucket_id = 'portfolio-evidence' and public.is_portfolio_participant_storage_path(name))
);

create policy portfolio_objects_delete_authorized on storage.objects
for delete to authenticated
using (
  public.is_portfolio_admin()
  or (bucket_id = 'portfolio-evidence' and public.is_portfolio_participant_storage_path(name))
);

commit;
