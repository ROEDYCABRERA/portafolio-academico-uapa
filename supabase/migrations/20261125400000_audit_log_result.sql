begin;

alter table public.portfolio_admin_audit_log
  add column if not exists result text not null default 'success'
  check (result in ('success', 'failure'));

create index if not exists portfolio_admin_audit_created_idx
  on public.portfolio_admin_audit_log(created_at desc);

commit;
