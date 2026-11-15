-- V11 CI FAKE ROSTER ONLY. Not Supabase or live game data.
BEGIN;
INSERT INTO guild_exp_v11_qa.runs(cycle_id,guild_id,start_at,end_at,difficulty)
SELECT 'GX11_CYCLE',guild,'2026-11-16 00:00+00'::timestamptz,
 '2026-11-30 00:00+00'::timestamptz,'Scout'
FROM unnest(ARRAY['GX11_MAIN','GX11_RACE','GX11_GUILD_B','GX11_ORDERS',
 'GX11_PRESSURE']) guild;

WITH roster(guild_id,account_id) AS (
 VALUES
 ('GX11_MAIN','GX11_A'),('GX11_MAIN','GX11_B'),
 ('GX11_MAIN','GX11_C'),('GX11_MAIN','GX11_D'),('GX11_MAIN','GX11_T'),
 ('GX11_RACE','GX11_E'),('GX11_RACE','GX11_F'),
 ('GX11_GUILD_B','GX11_A'),('GX11_GUILD_B','GX11_T'),
 ('GX11_ORDERS','GX11_G'),
 ('GX11_PRESSURE','GX11_H'),('GX11_PRESSURE','GX11_I'),
 ('GX11_PRESSURE','GX11_J'),('GX11_PRESSURE','GX11_K'),
 ('GX11_PRESSURE','GX11_L'),('GX11_PRESSURE','GX11_M'),
 ('GX11_PRESSURE','GX11_N'),('GX11_PRESSURE','GX11_O'),
 ('GX11_PRESSURE','GX11_P'),('GX11_PRESSURE','GX11_Q'),
 ('GX11_PRESSURE','GX11_R'),('GX11_PRESSURE','GX11_S')
)
INSERT INTO guild_exp_v11_qa.roster(cycle_id,guild_id,account_id)
SELECT 'GX11_CYCLE',guild_id,account_id FROM roster;

WITH definitions(node_id,kind,required,dep_all,dep_any,hp) AS (
 VALUES
 ('C1-01','start',true,ARRAY[]::text[],ARRAY[]::text[],0::numeric),
 ('C1-02','explore',false,ARRAY['C1-01'],ARRAY[]::text[],0),
 ('C1-03','supplies',false,ARRAY['C1-01'],ARRAY[]::text[],0),
 ('C1-04','combat',true,ARRAY['C1-01'],ARRAY[]::text[],100),
 ('C1-05','explore',false,ARRAY[]::text[],ARRAY['C1-02','C1-04'],0),
 ('C1-06','guardian',true,ARRAY['C1-04'],ARRAY[]::text[],90),
 ('C2-01','combat',true,ARRAY['C1-06'],ARRAY[]::text[],50),
 ('C2-02','explore',false,ARRAY['C2-01'],ARRAY[]::text[],0),
 ('C2-03','explore',false,ARRAY['C2-01'],ARRAY[]::text[],0),
 ('C2-04','vote',false,ARRAY['C2-01'],ARRAY[]::text[],0),
 ('C2-05','combat',true,ARRAY['C2-01'],ARRAY[]::text[],50),
 ('C2-06','guardian',true,ARRAY['C2-05'],ARRAY[]::text[],90),
 ('C3-01','combat',true,ARRAY['C2-06'],ARRAY[]::text[],50),
 ('C3-02','dual',false,ARRAY['C3-01'],ARRAY[]::text[],0),
 ('C3-03','supplies',false,ARRAY['C3-01'],ARRAY[]::text[],0),
 ('C3-04','explore',false,ARRAY['C3-01'],ARRAY[]::text[],0),
 ('C3-05','elite',false,ARRAY['C3-01'],ARRAY[]::text[],50),
 ('C3-06','final',true,ARRAY['C3-01','C1-06','C2-06'],ARRAY[]::text[],150)
)
INSERT INTO guild_exp_v11_qa.nodes(
 cycle_id,guild_id,node_id,kind,required,dep_all,dep_any,hp,max_hp,
 phase_index,cleared
)
SELECT 'GX11_CYCLE',r.guild_id,d.node_id,d.kind,d.required,d.dep_all,d.dep_any,
 CASE WHEN r.guild_id='GX11_RACE' AND d.node_id='C1-04' THEN 1
      WHEN r.guild_id='GX11_PRESSURE' AND d.node_id='C1-04' THEN 50000
      WHEN r.guild_id='GX11_MAIN' AND d.node_id='C1-04' THEN 50000
      ELSE d.hp END,
 CASE WHEN r.guild_id='GX11_RACE' AND d.node_id='C1-04' THEN 1
      WHEN r.guild_id='GX11_PRESSURE' AND d.node_id='C1-04' THEN 50000
      WHEN r.guild_id='GX11_MAIN' AND d.node_id='C1-04' THEN 50000
      ELSE d.hp END,
 CASE WHEN d.kind IN('guardian','final') THEN 1 ELSE 0 END,
 d.kind='start'
FROM guild_exp_v11_qa.runs r CROSS JOIN definitions d;
COMMIT;
