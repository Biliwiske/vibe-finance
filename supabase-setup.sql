create table if not exists public.finance_data (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.finance_data enable row level security;

drop policy if exists "Users can access their own finance data" on public.finance_data;
create policy "Users can access their own finance data"
  on public.finance_data
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update, delete on public.finance_data to authenticated;

create or replace function public.save_finance_data(
  p_data jsonb,
  p_updated_at timestamptz
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  affected_rows integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  insert into public.finance_data (user_id, data, updated_at)
  values (auth.uid(), p_data, p_updated_at)
  on conflict (user_id) do update
    set data = excluded.data,
        updated_at = excluded.updated_at
    where public.finance_data.updated_at < excluded.updated_at;

  get diagnostics affected_rows = row_count;
  return affected_rows = 1;
end
$$;

revoke all on function public.save_finance_data(jsonb, timestamptz) from public;
grant execute on function public.save_finance_data(jsonb, timestamptz) to authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'finance_data'
    )
  then
    execute 'alter publication supabase_realtime add table public.finance_data';
  end if;
end
$$;
