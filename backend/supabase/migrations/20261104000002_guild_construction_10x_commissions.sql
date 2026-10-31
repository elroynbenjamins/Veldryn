-- Draft 10x Guild Construction commissions. 17 new templates, all disabled.
-- Keep separate from the automatic Hall v44 project-progress facilities.
-- No donor/RPC permission or reward entitlement release in this migration.
-- Guild levels above the live level cap remain permanently locked until rollout.
insert into public.guild_construction_templates(template_id,required_guild_level,unlock_id,enabled)
values
 ('construction_hall_1',1,'guild_construction_hall_1',false),
 ('construction_forge_1',5,'guild_construction_forge_1',false),
 ('construction_library_1',5,'guild_construction_library_1',false),
 ('construction_treasury_1',8,'guild_construction_treasury_1',false),
 ('construction_hall_2',10,'guild_construction_hall_2',false),
 ('construction_war_room_1',10,'guild_construction_war_room_1',false),
 ('construction_expedition_1',12,'guild_construction_expedition_1',false),
 ('construction_forge_2',20,'guild_construction_forge_2',false),
 ('construction_library_2',20,'guild_construction_library_2',false),
 ('construction_treasury_2',25,'guild_construction_treasury_2',false),
 ('construction_hall_3',25,'guild_construction_hall_3',false),
 ('construction_war_room_2',30,'guild_construction_war_room_2',false),
 ('construction_expedition_2',30,'guild_construction_expedition_2',false),
 ('construction_forge_3',35,'guild_construction_forge_3',false),
 ('construction_library_3',35,'guild_construction_library_3',false),
 ('construction_hall_4',40,'guild_construction_hall_4',false),
 ('construction_war_room_3',45,'guild_construction_war_room_3',false)
on conflict(template_id) do nothing;

insert into public.guild_construction_requirements(template_id,resource_id,required_amount)
values
 ('construction_hall_1','GUILD_IRON_BRACKET',120),
 ('construction_hall_1','GUILD_PENNANT',100),
 ('construction_forge_1','GUILD_IRON_BRACKET',180),
 ('construction_forge_1','GUILD_PENNANT',80),
 ('construction_library_1','GUILD_IRON_BRACKET',80),
 ('construction_library_1','GUILD_PENNANT',200),
 ('construction_treasury_1','GUILD_IRON_BRACKET',160),
 ('construction_treasury_1','GUILD_RESINBOUND_CANVAS',120),
 ('construction_hall_2','GUILD_HEARTIRON_SUPPORT',300),
 ('construction_hall_2','GUILD_RESINBOUND_CANVAS',240),
 ('construction_war_room_1','GUILD_HEARTIRON_SUPPORT',200),
 ('construction_war_room_1','GUILD_PENNANT',180),
 ('construction_expedition_1','GUILD_HEARTIRON_SUPPORT',240),
 ('construction_expedition_1','GUILD_RESINBOUND_CANVAS',240),
 ('construction_forge_2','GUILD_OATHSILVER_FITTING',300),
 ('construction_forge_2','GUILD_ECHO_WOVEN_BANNER',160),
 ('construction_library_2','GUILD_OATHSILVER_FITTING',160),
 ('construction_library_2','GUILD_ECHO_WOVEN_BANNER',300),
 ('construction_treasury_2','GUILD_OATHSILVER_FITTING',240),
 ('construction_treasury_2','GUILD_ECHO_WOVEN_BANNER',200),
 ('construction_hall_3','GUILD_OATHSILVER_FITTING',400),
 ('construction_hall_3','GUILD_ECHO_WOVEN_BANNER',320),
 ('construction_war_room_2','GUILD_OATHSILVER_FITTING',300),
 ('construction_war_room_2','GUILD_ECHO_WOVEN_BANNER',250),
 ('construction_expedition_2','GUILD_OATHSILVER_FITTING',250),
 ('construction_expedition_2','GUILD_ECHO_WOVEN_BANNER',240),
 ('construction_forge_3','GUILD_FROSTIRON_FRAME',300),
 ('construction_forge_3','GUILD_WINTERVEIL_STANDARD',240),
 ('construction_library_3','GUILD_FROSTIRON_FRAME',200),
 ('construction_library_3','GUILD_WINTERVEIL_STANDARD',300),
 ('construction_hall_4','GUILD_FROSTIRON_FRAME',400),
 ('construction_hall_4','GUILD_WINTERVEIL_STANDARD',350),
 ('construction_war_room_3','GUILD_EMBERSTEEL_REINFORCEMENT',320),
 ('construction_war_room_3','GUILD_ASHEN_WAR_BANNER',300)
on conflict(template_id,resource_id) do nothing;

-- Explicitly exclude new templates from donation until each capability ships.
update public.guild_construction_templates set enabled=false
where template_id in ('construction_hall_1','construction_forge_1','construction_library_1','construction_treasury_1','construction_hall_2','construction_war_room_1','construction_expedition_1','construction_forge_2','construction_library_2','construction_treasury_2','construction_hall_3','construction_war_room_2','construction_expedition_2','construction_forge_3','construction_library_3','construction_hall_4','construction_war_room_3');
