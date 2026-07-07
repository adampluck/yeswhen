-- Organiser can delete their event; participants cascade.

create or replace function yw_delete_event(p_admin_token text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from yw_events where admin_token = p_admin_token;
  if not found then
    raise exception 'Not found';
  end if;
  return true;
end;
$$;
