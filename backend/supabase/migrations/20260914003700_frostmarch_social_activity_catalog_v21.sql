-- VELDRYN v21 — expose contribution-eligible Frostmarch activities to the
-- existing server-authoritative party/social settlement pipeline.

insert into public.party_activity_weights_v16(kind,content_id,metric,units_per_action,social_activity_kind,social_expected_seconds,social_challenge,social_region_id,social_tags)
values
 ('gathering','FRACT_001','FRACT_001',1,'gathering',540,'routine','frostmarch',array['frostmarch','mining','frostiron']),
 ('gathering','FRACT_002','FRACT_002',1,'gathering',600,'challenging','frostmarch',array['frostmarch','woodcutting','rime_resin']),
 ('fishing','FRACT_003','FRACT_003',1,'fishing',660,'challenging','frostmarch',array['frostmarch','fishing','bellfin']),
 ('gathering','FRACT_004','FRACT_004',1,'gathering',720,'hard','frostmarch',array['frostmarch','mixed','choir']),
 ('combat','FRACT_005','FRACT_005',1,'combat',720,'hard','frostmarch',array['frostmarch','combat','wyrmspine'])
on conflict(kind,content_id) do update set metric=excluded.metric,social_activity_kind=excluded.social_activity_kind,social_expected_seconds=excluded.social_expected_seconds,social_challenge=excluded.social_challenge,social_region_id=excluded.social_region_id,social_tags=excluded.social_tags;
