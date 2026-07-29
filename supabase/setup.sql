create table if not exists public.user_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_data enable row level security;

drop policy if exists "Users read their own fitness data" on public.user_data;
create policy "Users read their own fitness data"
on public.user_data for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users insert their own fitness data" on public.user_data;
create policy "Users insert their own fitness data"
on public.user_data for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users update their own fitness data" on public.user_data;
create policy "Users update their own fitness data"
on public.user_data for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users delete their own fitness data" on public.user_data;
create policy "Users delete their own fitness data"
on public.user_data for delete
to authenticated
using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.user_data to authenticated;
revoke all on public.user_data from anon;
