-- Generated with the pinned Supabase CLI; staging rehearsal required before production.
-- Requires coordinated gameplay Edge deployment. Never run against production
-- merely to preview. Account state is the authoritative source; the old fields
-- are compatibility mirrors for existing public-profile and coop projections.
begin;
-- Serialize with gameplay commits during this short backfill. The application
-- must be in a maintenance/release window to avoid stale pending receipts.
lock table public.online_game_states in share row exclusive mode;
with first_hero as (
 select distinct on (account_id) account_id,id,class_id
 from public.characters
 order by account_id,created_at asc nulls last,id
), seed as (
 select g.account_id,g.revision,g.state,
  coalesce(nullif(g.state#>>'{account,profileIconId}',''),
   case when g.state#>>'{character,id}'=h.id::text
    then nullif(g.state#>>'{character,profileIconId}','')
    else (select nullif(x#>>'{character,profileIconId}','')
      from jsonb_array_elements(coalesce(g.state->'otherCharacters','[]'::jsonb)) x
      where x#>>'{character,id}'=h.id::text limit 1)
   end,'class:'||h.class_id) icon
 from public.online_game_states g join first_hero h using(account_id)
 where jsonb_typeof(g.state->'character')='object'
), transformed as (
 select account_id,revision,
  jsonb_set(
    jsonb_set(
      jsonb_set(state,'{account}',coalesce(state->'account','{}'::jsonb)||jsonb_build_object('profileIconId',icon)),
      '{character,profileIconId}',to_jsonb(icon),true),
    '{otherCharacters}',coalesce((select jsonb_agg(jsonb_set(x,'{character,profileIconId}',to_jsonb(icon),true) order by ord)
      from jsonb_array_elements(coalesce(state->'otherCharacters','[]'::jsonb)) with ordinality as r(x,ord)), '[]'::jsonb),true) as next_state
 from seed where icon is not null and length(icon) between 1 and 80
)
update public.online_game_states g
set state=t.next_state,revision=g.revision+1,updated_at=statement_timestamp()
from transformed t
where g.account_id=t.account_id and g.revision=t.revision and g.state is distinct from t.next_state;
-- No changes to ownership, other cosmetics, account identity, auth, or RLS.
commit;
