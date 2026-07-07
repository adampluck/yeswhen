-- yeswhen — schema + API.
-- Run this once in the Supabase SQL editor (or via `supabase db push`).
--
-- Security model: RLS is enabled on every table with NO policies, so the
-- public anon key cannot read or write tables directly. All access goes
-- through the SECURITY DEFINER functions below, each of which requires an
-- unguessable ~130-bit token. Nothing can list or enumerate yw_events.

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists yw_events (
  id uuid primary key default gen_random_uuid(),
  admin_token text unique not null,
  share_token text unique not null,
  title text not null,
  dates date[] not null,
  created_at timestamptz not null default now()
);

create table if not exists yw_participants (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references yw_events(id) on delete cascade,
  edit_token text unique not null,
  name text not null,
  dates date[] not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists yw_participants_event_idx on yw_participants (event_id);

alter table yw_events enable row level security;
alter table yw_participants enable row level security;
revoke all on yw_events from anon, authenticated;
revoke all on yw_participants from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Token generator: 22 chars of base62 ≈ 130 bits of entropy
-- ---------------------------------------------------------------------------

create or replace function yw_gen_token()
returns text
language plpgsql
volatile
set search_path = public, extensions
as $$
declare
  chars constant text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  bytes bytea := gen_random_bytes(22);
  result text := '';
  i int;
begin
  for i in 0..21 loop
    result := result || substr(chars, (get_byte(bytes, i) % 62) + 1, 1);
  end loop;
  return result;
end;
$$;

revoke execute on function yw_gen_token() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------

create or replace function yw_create_event(p_title text, p_dates date[])
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_title text := left(btrim(coalesce(p_title, '')), 200);
  v_dates date[];
  v_admin text := yw_gen_token();
  v_share text := yw_gen_token();
begin
  select array_agg(distinct d order by d) into v_dates
  from unnest(p_dates) as d
  where d is not null;

  if v_title = '' then
    raise exception 'A title is required';
  end if;
  if v_dates is null or array_length(v_dates, 1) < 1 then
    raise exception 'Pick at least one date';
  end if;
  if array_length(v_dates, 1) > 100 then
    raise exception 'Too many dates (max 100)';
  end if;

  insert into yw_events (admin_token, share_token, title, dates)
  values (v_admin, v_share, v_title, v_dates);

  return jsonb_build_object('admin_token', v_admin, 'share_token', v_share);
end;
$$;

create or replace function yw_get_event(p_share_token text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'title', e.title,
    'dates', to_jsonb(e.dates),
    'participants', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object('id', p.id, 'name', p.name, 'dates', to_jsonb(p.dates))
          order by p.created_at
        )
        from yw_participants p
        where p.event_id = e.id
      ),
      '[]'::jsonb
    )
  )
  from yw_events e
  where e.share_token = p_share_token;
$$;

create or replace function yw_get_event_admin(p_admin_token text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'title', e.title,
    'dates', to_jsonb(e.dates),
    'share_token', e.share_token,
    'participants', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object('id', p.id, 'name', p.name, 'dates', to_jsonb(p.dates))
          order by p.created_at
        )
        from yw_participants p
        where p.event_id = e.id
      ),
      '[]'::jsonb
    )
  )
  from yw_events e
  where e.admin_token = p_admin_token;
$$;

create or replace function yw_update_event(p_admin_token text, p_title text, p_dates date[])
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event yw_events%rowtype;
  v_title text := left(btrim(coalesce(p_title, '')), 200);
  v_dates date[];
begin
  select * into v_event from yw_events where admin_token = p_admin_token;
  if not found then
    raise exception 'Not found';
  end if;

  select array_agg(distinct d order by d) into v_dates
  from unnest(p_dates) as d
  where d is not null;

  if v_title = '' then
    raise exception 'A title is required';
  end if;
  if v_dates is null or array_length(v_dates, 1) < 1 then
    raise exception 'Pick at least one date';
  end if;
  if array_length(v_dates, 1) > 100 then
    raise exception 'Too many dates (max 100)';
  end if;

  update yw_events set title = v_title, dates = v_dates where id = v_event.id;

  -- Drop participant votes for dates that are no longer candidates.
  update yw_participants p
  set dates = coalesce(
        (select array_agg(d order by d) from unnest(p.dates) d where d = any (v_dates)),
        '{}'
      ),
      updated_at = now()
  where p.event_id = v_event.id;

  return true;
end;
$$;

create or replace function yw_delete_response(p_admin_token text, p_participant_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from yw_participants p
  using yw_events e
  where p.id = p_participant_id
    and e.id = p.event_id
    and e.admin_token = p_admin_token;
  if not found then
    raise exception 'Not found';
  end if;
  return true;
end;
$$;

create or replace function yw_add_response(p_share_token text, p_name text, p_dates date[])
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event yw_events%rowtype;
  v_name text := left(btrim(coalesce(p_name, '')), 50);
  v_dates date[];
  v_edit text := yw_gen_token();
  v_id uuid;
begin
  select * into v_event from yw_events where share_token = p_share_token;
  if not found then
    raise exception 'Not found';
  end if;
  if v_name = '' then
    raise exception 'A name is required';
  end if;
  if (select count(*) from yw_participants where event_id = v_event.id) >= 200 then
    raise exception 'This event is full';
  end if;

  -- Keep only dates that are actually candidates; empty is allowed
  -- ("none of these work for me" is a valid answer).
  select coalesce(array_agg(distinct d order by d), '{}') into v_dates
  from unnest(p_dates) as d
  where d = any (v_event.dates);

  insert into yw_participants (event_id, edit_token, name, dates)
  values (v_event.id, v_edit, v_name, v_dates)
  returning id into v_id;

  return jsonb_build_object('edit_token', v_edit, 'id', v_id);
end;
$$;

create or replace function yw_update_response(p_edit_token text, p_name text, p_dates date[])
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_participant yw_participants%rowtype;
  v_event yw_events%rowtype;
  v_name text := left(btrim(coalesce(p_name, '')), 50);
  v_dates date[];
begin
  select * into v_participant from yw_participants where edit_token = p_edit_token;
  if not found then
    raise exception 'Not found';
  end if;
  if v_name = '' then
    raise exception 'A name is required';
  end if;

  select * into v_event from yw_events where id = v_participant.event_id;

  select coalesce(array_agg(distinct d order by d), '{}') into v_dates
  from unnest(p_dates) as d
  where d = any (v_event.dates);

  update yw_participants
  set name = v_name, dates = v_dates, updated_at = now()
  where id = v_participant.id;

  return true;
end;
$$;

-- No-op used by the weekly keep-alive workflow so the free-tier project
-- never pauses for inactivity.
create or replace function yw_ping()
returns text
language sql
stable
as $$
  select 'ok'
$$;
