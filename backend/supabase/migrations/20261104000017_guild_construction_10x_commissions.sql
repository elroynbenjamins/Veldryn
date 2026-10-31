-- Draft 10x Guild Construction commissions. 17 new templates, all disabled.
-- Keep separate from the automatic Hall v44 project-progress facilities.
-- No donor/RPC permission or reward entitlement release in this migration.
-- Only War Room III requires the future guild level cap expansion.
insert into public.guild_construction_templates(template_id,required_guild_level,unlock_id,enabled)
values
 ('construction_hall_1',1,'guild_construction_hall_1',false),
 ('construction_forge_1',2,'guild_construction_forge_1',false),
 ('construction_library_1',2,'guild_construction_library_1',false),
 ('construction_treasury_1',3,'guild_construction_treasury_1',false),
 ('construction_hall_2',3,'guild_construction_hall_2',false),
 ('construction_war_room_1',3,'guild_construction_war_room_1',false),
 ('construction_expedition_1',4,'guild_construction_expedition_1',false),
 ('construction_forge_2',5,'guild_construction_forge_2',false),
 ('construction_library_2',5,'guild_construction_library_2',false),
 ('construction_treasury_2',7,'guild_construction_treasury_2',false),
 ('construction_hall_3',6,'guild_construction_hall_3',false),
 ('construction_war_room_2',7,'guild_construction_war_room_2',false),
 ('construction_expedition_2',8,'guild_construction_expedition_2',false),
 ('construction_forge_3',10,'guild_construction_forge_3',false),
 ('construction_library_3',10,'guild_construction_library_3',false),
 ('construction_hall_4',10,'guild_construction_hall_4',false),
 ('construction_war_room_3',15,'guild_construction_war_room_3',false)
on conflict(template_id) do nothing;

insert into public.guild_construction_requirements(template_id,resource_id,required_amount)
values
 ('construction_hall_1','GUILD_REINFORCED_TIMBER',120),
 ('construction_hall_1','GUILD_BANNERWEAVE',100),
 ('construction_forge_1','GUILD_REINFORCED_TIMBER',180),
 ('construction_forge_1','GUILD_BANNERWEAVE',80),
 ('construction_library_1','GUILD_REINFORCED_TIMBER',80),
 ('construction_library_1','GUILD_BANNERWEAVE',200),
 ('construction_treasury_1','GUILD_REINFORCED_TIMBER',160),
 ('construction_treasury_1','GUILD_HERALDIC_DYE',120),
 ('construction_hall_2','GUILD_MASONS_KEYSTONE',300),
 ('construction_hall_2','GUILD_HERALDIC_DYE',240),
 ('construction_war_room_1','GUILD_MASONS_KEYSTONE',200),
 ('construction_war_room_1','GUILD_BANNERWEAVE',180),
 ('construction_expedition_1','GUILD_MASONS_KEYSTONE',240),
 ('construction_expedition_1','GUILD_HERALDIC_DYE',240),
 ('construction_forge_2','GUILD_FORGED_RIVETS',300),
 ('construction_forge_2','GUILD_SEAL_WAX',160),
 ('construction_library_2','GUILD_FORGED_RIVETS',160),
 ('construction_library_2','GUILD_SEAL_WAX',300),
 ('construction_treasury_2','GUILD_FORGED_RIVETS',240),
 ('construction_treasury_2','GUILD_SEAL_WAX',200),
 ('construction_hall_3','GUILD_FORGED_RIVETS',400),
 ('construction_hall_3','GUILD_SEAL_WAX',320),
 ('construction_war_room_2','GUILD_FORGED_RIVETS',300),
 ('construction_war_room_2','GUILD_SEAL_WAX',250),
 ('construction_expedition_2','GUILD_FORGED_RIVETS',250),
 ('construction_expedition_2','GUILD_SEAL_WAX',240),
 ('construction_forge_3','GUILD_FORTIFICATION_HINGES',300),
 ('construction_forge_3','GUILD_BEACON_OIL',240),
 ('construction_library_3','GUILD_FORTIFICATION_HINGES',200),
 ('construction_library_3','GUILD_BEACON_OIL',300),
 ('construction_hall_4','GUILD_FORTIFICATION_HINGES',400),
 ('construction_hall_4','GUILD_BEACON_OIL',350),
 ('construction_war_room_3','GUILD_FORTIFICATION_HINGES',320),
 ('construction_war_room_3','GUILD_BEACON_OIL',300)
on conflict(template_id,resource_id) do nothing;

-- Explicitly exclude new templates from donation until each capability ships.
update public.guild_construction_templates set enabled=false
where template_id in ('construction_hall_1','construction_forge_1','construction_library_1','construction_treasury_1','construction_hall_2','construction_war_room_1','construction_expedition_1','construction_forge_2','construction_library_2','construction_treasury_2','construction_hall_3','construction_war_room_2','construction_expedition_2','construction_forge_3','construction_library_3','construction_hall_4','construction_war_room_3');
