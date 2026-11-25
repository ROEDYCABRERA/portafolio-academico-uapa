begin;

alter table public.portfolio_courses
  add column if not exists course_code text,
  add column if not exists credits numeric(5,2),
  add column if not exists hours_theoretical integer,
  add column if not exists hours_practical integer,
  add column if not exists hours_research_virtual integer,
  add column if not exists hours_independent integer;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'portfolio_courses_nonnegative_metrics'
      and conrelid = 'public.portfolio_courses'::regclass
  ) then
    alter table public.portfolio_courses
      add constraint portfolio_courses_nonnegative_metrics
      check (
        (credits is null or credits >= 0)
        and (hours_theoretical is null or hours_theoretical >= 0)
        and (hours_practical is null or hours_practical >= 0)
        and (hours_research_virtual is null or hours_research_virtual >= 0)
        and (hours_independent is null or hours_independent >= 0)
      );
  end if;
end
$$;

commit;
