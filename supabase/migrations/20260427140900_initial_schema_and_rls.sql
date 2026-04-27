-- =========================================================================
-- Vampire Maxxing — initial schema + RLS.
--
-- Five tables:
--   profiles       — public profile per auth.users row (auto-created via trigger).
--   player_state   — single-row-per-player cloud save (mirrors save.ts JSON blob).
--   gacha_pulls    — server-authoritative pull log (writes only from edge function).
--   daily_claims   — server-validated daily login (one row per player+date).
--   purchases      — server-validated Play Billing receipts (idempotent on order_id).
--
-- All tables enable RLS. Clients can only SELECT/UPDATE/INSERT their own
-- rows ((select auth.uid()) match). Pull/claim/purchase tables are
-- read-only for clients; inserts come from edge functions running with
-- service_role.
--
-- The (select auth.uid()) wrapper instead of bare auth.uid() lets PG
-- evaluate the function once per query instead of once per row — see
-- https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select
-- =========================================================================

-- ---------------------------------------------------------------------- --
-- profiles
-- ---------------------------------------------------------------------- --
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  'Public profile for each authenticated user. Row auto-created on first sign-in via auth.users trigger.';

alter table public.profiles enable row level security;

create policy profiles_self_select on public.profiles
  for select using ((select auth.uid()) = id);
create policy profiles_self_update on public.profiles
  for update using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- ---------------------------------------------------------------------- --
-- player_state — cloud save
-- ---------------------------------------------------------------------- --
create table public.player_state (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  version int not null,
  state_blob jsonb not null,
  server_seq bigint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.player_state is
  'Cloud save snapshot: one row per player. Mirrors save.ts SAVE_VERSION (currently 5). server_seq bumps on every update.';

alter table public.player_state enable row level security;

create policy player_state_self_select on public.player_state
  for select using ((select auth.uid()) = owner_id);
create policy player_state_self_insert on public.player_state
  for insert with check ((select auth.uid()) = owner_id);
create policy player_state_self_update on public.player_state
  for update using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);

-- ---------------------------------------------------------------------- --
-- gacha_pulls — server-authoritative pull log
-- ---------------------------------------------------------------------- --
create table public.gacha_pulls (
  id bigserial primary key,
  player_id uuid not null references auth.users(id) on delete cascade,
  banner_id text not null,
  pull_count smallint not null check (pull_count in (1, 10)),
  results jsonb not null,
  ichor_spent int not null check (ichor_spent >= 0),
  created_at timestamptz not null default now()
);

comment on table public.gacha_pulls is
  'Server-authoritative gacha pull log. Writes only from the gacha-pull edge function; clients only SELECT.';
comment on column public.gacha_pulls.results is
  'Array of PullResult objects: { thrallId, rarity, isCinder, gainedEssence, ... }';

create index gacha_pulls_player_created_at_idx
  on public.gacha_pulls(player_id, created_at desc);

alter table public.gacha_pulls enable row level security;

create policy gacha_pulls_self_select on public.gacha_pulls
  for select using ((select auth.uid()) = player_id);

-- ---------------------------------------------------------------------- --
-- daily_claims — server-validated daily login
-- ---------------------------------------------------------------------- --
create table public.daily_claims (
  id bigserial primary key,
  player_id uuid not null references auth.users(id) on delete cascade,
  claim_date date not null,
  day_index smallint not null check (day_index between 0 and 6),
  blood numeric not null check (blood >= 0),
  dread int not null check (dread >= 0),
  ichor int not null check (ichor >= 0),
  created_at timestamptz not null default now(),
  unique (player_id, claim_date)
);

comment on table public.daily_claims is
  'Server-validated daily login claims. Unique on (player, calendar date). Writes only from the daily-claim edge function.';

create index daily_claims_player_date_idx
  on public.daily_claims(player_id, claim_date desc);

alter table public.daily_claims enable row level security;

create policy daily_claims_self_select on public.daily_claims
  for select using ((select auth.uid()) = player_id);

-- ---------------------------------------------------------------------- --
-- purchases — server-validated Play Billing
-- ---------------------------------------------------------------------- --
create table public.purchases (
  id bigserial primary key,
  player_id uuid not null references auth.users(id) on delete cascade,
  sku text not null,
  order_id text not null,
  purchase_token text not null,
  price_eur numeric not null check (price_eur >= 0),
  ichor_credited int not null check (ichor_credited >= 0),
  was_first_time boolean not null default false,
  validated_at timestamptz,
  created_at timestamptz not null default now(),
  unique (order_id)
);

comment on table public.purchases is
  'Server-validated Play Billing purchases. Idempotent on order_id. Writes only from the validate-purchase edge function.';

create index purchases_player_created_at_idx
  on public.purchases(player_id, created_at desc);

alter table public.purchases enable row level security;

create policy purchases_self_select on public.purchases
  for select using ((select auth.uid()) = player_id);

-- ---------------------------------------------------------------------- --
-- triggers
-- ---------------------------------------------------------------------- --

-- Profile auto-create on first sign-in. Pulls display name from Google's
-- raw user metadata (full_name OR name OR null). EXECUTE revoked from
-- public/anon/authenticated so the function can't be invoked via RPC —
-- only the auth.users trigger context fires it.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name'
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Bump server_seq + updated_at on every player_state UPDATE so clients
-- can detect concurrent writes and the edge functions stay simple.
create or replace function public.bump_player_state_seq()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.server_seq := old.server_seq + 1;
  new.updated_at := now();
  return new;
end;
$$;

create trigger player_state_bump_seq
  before update on public.player_state
  for each row execute function public.bump_player_state_seq();

-- Generic updated_at trigger for profiles.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();
