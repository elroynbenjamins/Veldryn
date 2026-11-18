-- Non-destructive compatibility backfill for older profiles which never explicitly
-- selected a showcase character. Preserve their account-wide showcase in the
-- current active character rather than exposing an empty set after migration.
insert into public.character_profile_showcases_v1(
 character_id,account_id,favorite_skill_id,favorite_companion_id,
 achievement_showcase_ids,collection_showcase,record_showcase_ids,mastery_showcase_action_ids)
select c.id,e.account_id,e.favorite_skill_id,e.favorite_companion_id,
 coalesce(e.achievement_showcase_ids,'{}'::text[]),
 coalesce(e.collection_showcase,'[]'::jsonb),
 coalesce(e.record_showcase_ids,'{}'::text[]),
 coalesce(e.mastery_showcase_action_ids,'{}'::text[])
from public.player_profile_extensions e
join public.player_profiles p on p.account_id=e.account_id
join public.characters c on c.id=coalesce(e.selected_character_id,p.active_character_id)
 and c.account_id=e.account_id
where e.selected_character_id is null
on conflict(character_id) do nothing;
