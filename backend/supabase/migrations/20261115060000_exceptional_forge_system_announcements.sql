begin;

-- Only the trusted online gameplay receipt can publish a craft announcement.
-- This is deliberately not an authenticated/client-callable RPC. The receipt and
-- world feed insert commit atomically, so retries cannot duplicate a message.
create or replace function public.publish_exceptional_forge_crafts_v1()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_result jsonb;
  v_rarity text;
  v_quality text;
  v_instance_id text;
  v_item_name text;
  v_character_name text;
begin
  if new.action <> 'online_game_v1'
     or jsonb_typeof(new.response #> '{result,forgeResults}') is distinct from 'array'
  then
    return new;
  end if;

  for v_result in
    select value from jsonb_array_elements(new.response #> '{result,forgeResults}') as craft(value)
  loop
    v_rarity := v_result ->> 'rarity';
    -- Rare and lower are intentionally excluded to avoid flooding System chat.
    if v_rarity is null or v_rarity not in ('epic', 'legendary', 'mythic')
       or coalesce(v_result ->> 'autoSold', '') = 'incoming'
    then
      continue;
    end if;

    v_quality := v_result ->> 'quality';
    v_instance_id := v_result ->> 'instanceId';
    v_item_name := left(btrim(coalesce(v_result ->> 'itemName', '')), 80);
    v_character_name := left(btrim(coalesce(v_result ->> 'crafterName', '')), 32);

    if v_quality is null or v_quality !~ '^(100|[1-9]?[0-9])$'
       or nullif(v_instance_id, '') is null
       or nullif(v_item_name, '') is null
       or nullif(v_character_name, '') is null
    then
      continue;
    end if;

    -- The actual item instance must exist in the authoritative settled state.
    -- In particular, this prevents announcing craft results auto-sold on arrival
    -- or unclaimed/blocked jobs and ensures the rarity + quality belong together.
    if not exists (
      select 1
      from jsonb_array_elements(
        case when jsonb_typeof(new.response #> '{result,state,account,craftedGearInstances}') = 'array'
          then new.response #> '{result,state,account,craftedGearInstances}'
          else '[]'::jsonb end
      ) as owned(value)
      where owned.value ->> 'id' = v_instance_id
        and owned.value ->> 'itemId' = v_result ->> 'itemId'
        and owned.value ->> 'rarity' = v_rarity
        and owned.value ->> 'quality' = v_quality
        and owned.value ->> 'acquireSource' = 'craft'
    ) then
      continue;
    end if;

    insert into public.world_milestone_feed (
      feed_id, account_id, kind, display_name, subject_id, subject_name,
      detail, occurred_at, expires_at
    ) values (
      'forge:' || v_instance_id, new.account_id, 'forge_' || v_rarity,
      v_character_name, v_result ->> 'itemId', v_item_name,
      'Q' || v_quality || '/100', now(), now() + interval '14 days'
    )
    on conflict (feed_id) do nothing;
  end loop;
  return new;
end;
$$;

revoke all on function public.publish_exceptional_forge_crafts_v1() from public, anon, authenticated;

drop trigger if exists publish_exceptional_forge_crafts_receipt_v1
  on public.server_action_receipts;
create trigger publish_exceptional_forge_crafts_receipt_v1
after insert on public.server_action_receipts
for each row execute function public.publish_exceptional_forge_crafts_v1();

commit;
