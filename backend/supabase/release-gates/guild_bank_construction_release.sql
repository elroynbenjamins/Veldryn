-- RELEASE MIGRATION: apply only after the Guild Bank-aware AAB is available,
-- minimum supported Android version is enforced, the updated gameplay Edge
-- function is deployed, and the bank deposit/allocation SQL tests pass.
-- Construction starts with two existing, asset-backed cosmetics. The third
-- project remains gated until a usable Fellowship Statue asset is ready.
do $$
begin
 if to_regclass('public.guild_bank_balances') is null
    or to_regclass('public.guild_bank_ledger') is null
    or to_regclass('public.guild_construction_cosmetic_releases') is null
 then raise exception 'guild_bank_release_dependencies_missing';end if;
 if not has_function_privilege('service_role','public.guild_bank_deposit_server_v1(uuid,text,integer,text)','EXECUTE')
    or not has_function_privilege('service_role','public.guild_bank_allocate_server_v1(uuid,text,text,integer,text)','EXECUTE')
 then raise exception 'guild_bank_release_rpcs_unavailable';end if;
end $$;
update public.guild_construction_templates set enabled=true
 where template_id in ('stormwatch_banner','verdant_guild_frame');
update public.guild_construction_cosmetic_releases set released=true
 where unlock_id in ('guild_banner_stormwatch','guild_frame_verdant');
-- Explicitly keep the statue unavailable until its art and previews ship.
update public.guild_construction_templates set enabled=false
 where template_id='fellowship_statue';
update public.guild_construction_cosmetic_releases set released=false
 where unlock_id='guild_decoration_fellowship_statue';
