-- Guild Skill Rank Costs v2: exact server-authoritative repricing.
-- Ensure the Gold sink from 20261106091500 on environments that have not
-- deployed the weekly Guild Bank update yet: 5k / 15k / 30k by rank.
-- Existing owned ranks and their purchase receipts remain unchanged.
-- Guild Bank donation caps derive from these released, next-rank rows.
BEGIN;
-- Live production may predate the weekly Guild Bank Gold migration.
-- Upsert only MISSING Gold rows. Preserve existing prices and receipts.
INSERT INTO public.guild_skill_rank_costs_v1(skill_id,rank,resource_id,amount)
SELECT s.skill_id,r.rank,'gold',
 CASE r.rank WHEN 1 THEN 5000 WHEN 2 THEN 15000 WHEN 3 THEN 30000 END
FROM public.guild_skill_catalogue_v1 s
CROSS JOIN generate_series(1,3) AS r(rank)
ON CONFLICT(skill_id,rank,resource_id) DO NOTHING;
DO $guild_skill_cost_guard$
BEGIN
 IF (SELECT count(*) FROM public.guild_skill_catalogue_v1)<>9
    OR EXISTS (SELECT 1 FROM public.guild_skill_catalogue_v1 WHERE max_rank<>3)
 THEN RAISE EXCEPTION 'unexpected_guild_skill_catalogue_for_repricing'; END IF;
 IF (SELECT count(*) FROM public.guild_skill_rank_costs_v1
      WHERE resource_id='gold' AND rank BETWEEN 1 AND 3
      AND amount=CASE rank WHEN 1 THEN 5000 WHEN 2 THEN 15000 WHEN 3 THEN 30000 END)<>27
 THEN RAISE EXCEPTION 'guild_skill_gold_costs_must_exist_before_repricing'; END IF;
END $guild_skill_cost_guard$;
-- Explicit amounts, not multiplication of stored rows: safe to replay without doubling twice.
INSERT INTO public.guild_skill_rank_costs_v1(skill_id,rank,resource_id,amount)
VALUES
 ('professions_gathering',1,'MOSS_FIBER',600),
 ('professions_gathering',1,'GREENWOOD_LOG',300),
 ('professions_gathering',1,'DEWLEAF',160),
 ('professions_gathering',1,'COPPER_ORE',120),
 ('professions_gathering',2,'IRONWOOD_LOG',700),
 ('professions_gathering',2,'ASTER_IRON_INGOT',80),
 ('professions_gathering',2,'RIVER_MINT',210),
 ('professions_gathering',2,'ASTER_IRON_ORE',140),
 ('professions_gathering',3,'IRONWOOD_LOG',1400),
 ('professions_gathering',3,'ASTER_IRON_INGOT',220),
 ('professions_gathering',3,'IRONBLOOM',260),
 ('professions_gathering',3,'OATHSTONE_ORE',160),
 ('professions_crafting',1,'MOSS_FIBER',800),
 ('professions_crafting',1,'GREENWOOD_LOG',400),
 ('professions_crafting',1,'DEWLEAF',200),
 ('professions_crafting',1,'COPPER_ORE',150),
 ('professions_crafting',2,'IRONWOOD_LOG',800),
 ('professions_crafting',2,'ASTER_IRON_INGOT',120),
 ('professions_crafting',2,'RIVER_MINT',250),
 ('professions_crafting',2,'ASTER_IRON_ORE',180),
 ('professions_crafting',3,'IRONWOOD_LOG',1600),
 ('professions_crafting',3,'ASTER_IRON_INGOT',300),
 ('professions_crafting',3,'IRONBLOOM',320),
 ('professions_crafting',3,'OATHSTONE_ORE',220),
 ('professions_mastery',1,'MOSS_FIBER',1000),
 ('professions_mastery',1,'GREENWOOD_LOG',500),
 ('professions_mastery',1,'DEWLEAF',240),
 ('professions_mastery',1,'COPPER_ORE',180),
 ('professions_mastery',2,'IRONWOOD_LOG',1000),
 ('professions_mastery',2,'ASTER_IRON_INGOT',160),
 ('professions_mastery',2,'RIVER_MINT',300),
 ('professions_mastery',2,'ASTER_IRON_ORE',210),
 ('professions_mastery',3,'IRONWOOD_LOG',1800),
 ('professions_mastery',3,'ASTER_IRON_INGOT',360),
 ('professions_mastery',3,'IRONBLOOM',380),
 ('professions_mastery',3,'OATHSTONE_ORE',260),
 ('fellowship_membership',1,'MOSS_FIBER',1000),
 ('fellowship_membership',1,'GREENWOOD_LOG',500),
 ('fellowship_membership',1,'DEWLEAF',240),
 ('fellowship_membership',1,'COPPER_ORE',180),
 ('fellowship_membership',2,'IRONWOOD_LOG',1200),
 ('fellowship_membership',2,'ASTER_IRON_INGOT',160),
 ('fellowship_membership',2,'RIVER_MINT',300),
 ('fellowship_membership',2,'ASTER_IRON_ORE',220),
 ('fellowship_membership',3,'IRONWOOD_LOG',2200),
 ('fellowship_membership',3,'ASTER_IRON_INGOT',360),
 ('fellowship_membership',3,'IRONBLOOM',400),
 ('fellowship_membership',3,'OATHSTONE_ORE',260),
 ('fellowship_quests',1,'MOSS_FIBER',1000),
 ('fellowship_quests',1,'GREENWOOD_LOG',500),
 ('fellowship_quests',1,'DEWLEAF',220),
 ('fellowship_quests',1,'COPPER_ORE',180),
 ('fellowship_quests',2,'IRONWOOD_LOG',1000),
 ('fellowship_quests',2,'ASTER_IRON_INGOT',160),
 ('fellowship_quests',2,'RIVER_MINT',280),
 ('fellowship_quests',2,'ASTER_IRON_ORE',210),
 ('fellowship_quests',3,'IRONWOOD_LOG',1800),
 ('fellowship_quests',3,'ASTER_IRON_INGOT',360),
 ('fellowship_quests',3,'IRONBLOOM',380),
 ('fellowship_quests',3,'OATHSTONE_ORE',250),
 ('fellowship_projects',1,'MOSS_FIBER',1200),
 ('fellowship_projects',1,'GREENWOOD_LOG',600),
 ('fellowship_projects',1,'DEWLEAF',260),
 ('fellowship_projects',1,'COPPER_ORE',200),
 ('fellowship_projects',2,'IRONWOOD_LOG',1400),
 ('fellowship_projects',2,'ASTER_IRON_INGOT',200),
 ('fellowship_projects',2,'RIVER_MINT',340),
 ('fellowship_projects',2,'ASTER_IRON_ORE',260),
 ('fellowship_projects',3,'IRONWOOD_LOG',2400),
 ('fellowship_projects',3,'ASTER_IRON_INGOT',450),
 ('fellowship_projects',3,'IRONBLOOM',440),
 ('fellowship_projects',3,'OATHSTONE_ORE',300),
 ('vanguard_boss',1,'IRONWOOD_LOG',800),
 ('vanguard_boss',1,'ASTER_IRON_INGOT',200),
 ('vanguard_boss',1,'RIVER_MINT',260),
 ('vanguard_boss',1,'ASTER_IRON_ORE',180),
 ('vanguard_boss',2,'ASTER_IRON_INGOT',450),
 ('vanguard_boss',2,'OATHGLASS_SHARD',80),
 ('vanguard_boss',2,'IRONBLOOM',340),
 ('vanguard_boss',2,'OATHSTONE_ORE',160),
 ('vanguard_boss',3,'OATHSTONE_INGOT',240),
 ('vanguard_boss',3,'OATHGLASS_SHARD',160),
 ('vanguard_boss',3,'CAVELICHEN',440),
 ('vanguard_boss',3,'OATHSTONE_ORE',200),
 ('vanguard_defence',1,'IRONWOOD_LOG',900),
 ('vanguard_defence',1,'ASTER_IRON_INGOT',220),
 ('vanguard_defence',1,'RIVER_MINT',280),
 ('vanguard_defence',1,'ASTER_IRON_ORE',200),
 ('vanguard_defence',2,'ASTER_IRON_INGOT',500),
 ('vanguard_defence',2,'OATHGLASS_SHARD',100),
 ('vanguard_defence',2,'IRONBLOOM',360),
 ('vanguard_defence',2,'OATHSTONE_ORE',180),
 ('vanguard_defence',3,'OATHSTONE_INGOT',280),
 ('vanguard_defence',3,'OATHGLASS_SHARD',180),
 ('vanguard_defence',3,'CAVELICHEN',480),
 ('vanguard_defence',3,'OATHSTONE_ORE',220),
 ('vanguard_support',1,'IRONWOOD_LOG',1000),
 ('vanguard_support',1,'ASTER_IRON_INGOT',240),
 ('vanguard_support',1,'RIVER_MINT',300),
 ('vanguard_support',1,'ASTER_IRON_ORE',220),
 ('vanguard_support',2,'ASTER_IRON_INGOT',550),
 ('vanguard_support',2,'OATHGLASS_SHARD',120),
 ('vanguard_support',2,'IRONBLOOM',400),
 ('vanguard_support',2,'OATHSTONE_ORE',200),
 ('vanguard_support',3,'OATHSTONE_INGOT',320),
 ('vanguard_support',3,'OATHGLASS_SHARD',200),
 ('vanguard_support',3,'CAVELICHEN',520),
 ('vanguard_support',3,'OATHSTONE_ORE',240)
ON CONFLICT(skill_id,rank,resource_id) DO UPDATE SET amount=excluded.amount;
DO $guild_skill_cost_verify$
BEGIN
 IF EXISTS(
   SELECT 1 FROM public.guild_skill_catalogue_v1 s
   CROSS JOIN generate_series(1,3) AS tier(rank)
   LEFT JOIN public.guild_skill_rank_costs_v1 c
     ON c.skill_id=s.skill_id AND c.rank=tier.rank
   GROUP BY s.skill_id,tier.rank
   HAVING count(c.resource_id)<>5
 ) THEN RAISE EXCEPTION 'guild_skill_cost_v2_requires_two_base_two_gathered_plus_gold'; END IF;
 IF EXISTS(
   SELECT 1 FROM public.guild_skill_rank_costs_v1
   WHERE amount<=0 OR amount>1000000
 ) THEN RAISE EXCEPTION 'guild_skill_invalid_resource_cost'; END IF;
END $guild_skill_cost_verify$;
COMMIT;
