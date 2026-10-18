-- Long-term optional construction paths. Resource values reference existing
-- Guild Bank item IDs. All projects remain unreleased until their artwork and
-- guild-appearance entitlement adapters are complete.
insert into public.guild_construction_templates(template_id,required_guild_level,unlock_id) values
 ('verdant_guild_frame',9,'guild_frame_verdant'),
 ('fellowship_statue',14,'guild_decoration_fellowship_statue')
on conflict(template_id) do nothing;
insert into public.guild_construction_requirements(template_id,resource_id,required_amount) values
 ('verdant_guild_frame','gold',520000),
 ('verdant_guild_frame','GREENWOOD_LOG',18000),
 ('verdant_guild_frame','ASTER_IRON_INGOT',8000),
 ('verdant_guild_frame','MOSS_FIBER',4000),
 ('fellowship_statue','gold',900000),
 ('fellowship_statue','IRONWOOD_LOG',22000),
 ('fellowship_statue','ASTER_IRON_INGOT',12000),
 ('fellowship_statue','OATHGLASS_SHARD',4000)
on conflict(template_id,resource_id) do nothing;
