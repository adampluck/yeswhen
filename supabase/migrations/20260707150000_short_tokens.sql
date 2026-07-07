-- Shorter, friendlier links: 12 chars of base62 ≈ 2^71 possibilities — still
-- far beyond online-guessable (the only attack surface is the rate-limited
-- API; there is no offline attack). Existing 22-char tokens keep working.

create or replace function yw_gen_token()
returns text
language plpgsql
volatile
set search_path = public, extensions
as $$
declare
  chars constant text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  bytes bytea := gen_random_bytes(12);
  result text := '';
  i int;
begin
  for i in 0..11 loop
    result := result || substr(chars, (get_byte(bytes, i) % 62) + 1, 1);
  end loop;
  return result;
end;
$$;
