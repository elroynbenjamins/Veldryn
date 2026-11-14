-- Transactional regression for private character change coupons and atomic credit use.
-- Apply after character identity change migrations; no lasting data is written.
BEGIN;
DO $test$
DECLARE
 v_a uuid:=gen_random_uuid();
 v_b uuid:=gen_random_uuid();
 v_id uuid:=gen_random_uuid();
 v_other uuid:=gen_random_uuid();
 v_state jsonb;
 v_changed jsonb;
 v_c jsonb;
 v_credit uuid;
 v_class_credit uuid;
 v_denied uuid;
 v_result jsonb;
 v_replay jsonb;
 v_code text:='VEL-REN-ABCDEFGHIJKLMN';
 v_code_hash text;
 v_claim jsonb;
BEGIN
 IF has_function_privilege('authenticated',
   'public.issue_character_change_credit_server_v1(uuid,text,text,text)','EXECUTE')
 OR has_function_privilege('authenticated',
   'public.commit_character_change_server_v1(uuid,uuid,bigint,text,text,uuid,jsonb)','EXECUTE')
 OR has_function_privilege('authenticated',
   'public.read_character_change_receipt_server_v1(uuid,text)','EXECUTE')
 THEN RAISE EXCEPTION 'authenticated user can mint or spend server credits'; END IF;

 INSERT INTO auth.users(id,email) VALUES
  (v_a,'identity-a-'||v_a||'@example.invalid'),
  (v_b,'identity-b-'||v_b||'@example.invalid');
 INSERT INTO public.characters(id,account_id,name,class_id,level,xp,gold,base_stats,equipment)
 VALUES (v_id,v_a,'Identity Hero','DAWNKEEPER',14,317589,5554,
   '{"hp":118,"attack":14,"defense":13,"currentHp":118}'::jsonb,
   '{"weapon":"NOVICE_DAWNKEEPER_WEAPON"}'::jsonb),
  (v_other,v_b,'Taken Name','IRONWARDEN',1,0,0,'{}'::jsonb,'{}'::jsonb);
 INSERT INTO public.player_profiles(account_id,display_name,active_character_id)
 VALUES(v_a,'Identity Hero',v_id);

 v_state:=jsonb_build_object(
  'version',11,'createdAtMs',1000,
  'character',jsonb_build_object(
    'id',v_id,'name','Identity Hero','classId','DAWNKEEPER',
    'level',14,'xp',317589,'gold',5554,
    'hp',118,'currentHp',118,'attack',14,'defense',13,
    'profileIconId','class:DAWNKEEPER',
    'equipment',jsonb_build_object('weapon','NOVICE_DAWNKEEPER_WEAPON'),
    'equipmentInstanceIds','{}'::jsonb,
    'classSkills',jsonb_build_array(
      jsonb_build_object('skillId','restoration','xp',180516,'level',14),
      jsonb_build_object('skillId','sanctity','xp',180516,'level',14)),
    'classSkillRemainders',jsonb_build_object('restoration',0.5,'sanctity',0.25)),
  'account',jsonb_build_object('craftedGearInstances','[]'::jsonb),
  'inventory',jsonb_build_object('stacks',jsonb_build_array(
    jsonb_build_object('itemId','HOLY_WATER','quantity',33)),'capacity',30),
  'bank',jsonb_build_object('stacks',jsonb_build_array(
    jsonb_build_object('itemId','COPPER_ORE','quantity',45)),'capacity',100),
  'skills',jsonb_build_array(jsonb_build_object('skillId','smithing','level',8,'xp',8000)),
  'activity','null'::jsonb,'quests','[]'::jsonb,'otherCharacters','[]'::jsonb
 );
 INSERT INTO public.online_game_states(account_id,character_id,revision,state)
 VALUES(v_a,v_id,1,v_state);
 INSERT INTO private.character_change_credits_v1(account_id,change_kind,source_kind,source_ref)
 VALUES(v_a,'rename','admin','IDENTITY-SQL-TEST-RENAME')
 RETURNING id INTO v_credit;

 v_changed:=jsonb_set(v_state,'{character,name}',to_jsonb('Identity Renamed'::text));
 v_result:=public.commit_character_change_server_v1(
   v_a,v_id,1,'identity-rename-001',repeat('a',64),v_credit,v_changed);
 IF v_result->>'version'<>'2'
   OR (SELECT name FROM public.characters WHERE id=v_id)<>'Identity Renamed'
   OR (SELECT display_name FROM public.player_profiles WHERE account_id=v_a)<>'Identity Renamed'
   OR (SELECT consumed_at FROM private.character_change_credits_v1 WHERE id=v_credit) IS NULL
 THEN RAISE EXCEPTION 'rename did not commit atomically'; END IF;
 v_replay:=public.commit_character_change_server_v1(
   v_a,v_id,1,'identity-rename-001',repeat('a',64),v_credit,v_changed);
 IF v_result IS DISTINCT FROM v_replay THEN RAISE EXCEPTION 'rename replay changed response'; END IF;
 BEGIN
  PERFORM public.commit_character_change_server_v1(
   v_a,v_id,1,'identity-rename-001',repeat('b',64),v_credit,v_changed);
  RAISE EXCEPTION 'accepted idempotency mutation';
 EXCEPTION WHEN raise_exception THEN
  IF SQLERRM<>'idempotency_key_conflict' THEN RAISE; END IF;
 END;

 -- The new class has the same two skill XP totals and keeps all progression.
 v_c:=v_changed->'character';
 v_c:=(v_c-'equippedCombatCompanionId')||jsonb_build_object(
   'classId','KNIFE_DANCER','hp',106,'currentHp',106,'attack',22,'defense',10,
   'equipment','{}'::jsonb,'equipmentInstanceIds','{}'::jsonb,
   'profileIconId','class:KNIFE_DANCER',
   'classSkills',jsonb_build_array(
      jsonb_build_object('skillId','blade_rhythm','xp',180516,'level',14),
      jsonb_build_object('skillId','precision','xp',180516,'level',14)),
   'classSkillRemainders',jsonb_build_object('blade_rhythm',0.5,'precision',0.25));
 v_changed:=v_changed||jsonb_build_object('character',v_c);
 INSERT INTO private.character_change_credits_v1(account_id,change_kind,source_kind,source_ref)
 VALUES(v_a,'class','admin','IDENTITY-SQL-TEST-CLASS')
 RETURNING id INTO v_class_credit;
 v_result:=public.commit_character_change_server_v1(
   v_a,v_id,2,'identity-class-001',repeat('c',64),v_class_credit,v_changed);
 IF v_result->>'version'<>'3'
   OR v_result->>'removedEquipment'<>'1'
   OR (SELECT class_id FROM public.characters WHERE id=v_id)<>'KNIFE_DANCER'
   OR (SELECT equipment FROM public.characters WHERE id=v_id)<>'{}'::jsonb
   OR (SELECT state#>>'{character,classSkills,0,xp}' FROM public.online_game_states WHERE account_id=v_a)<>'180516'
   OR (SELECT state#>>'{character,profileIconId}' FROM public.online_game_states WHERE account_id=v_a)<>'class:KNIFE_DANCER'
   OR (SELECT state#>>'{bank,stacks,0,quantity}' FROM public.online_game_states WHERE account_id=v_a)<>'45'
   OR (SELECT state#>>'{skills,0,xp}' FROM public.online_game_states WHERE account_id=v_a)<>'8000'
 THEN RAISE EXCEPTION 'class change lost progression or retained equipped gear'; END IF;

 -- A credit owned by another account cannot be consumed.
 INSERT INTO private.character_change_credits_v1(account_id,change_kind,source_kind,source_ref)
 VALUES(v_b,'rename','admin','IDENTITY-SQL-TEST-OTHER')
 RETURNING id INTO v_denied;
 BEGIN
  PERFORM public.commit_character_change_server_v1(
   v_a,v_id,3,'identity-forged-001',repeat('d',64),v_denied,
   jsonb_set(v_changed,'{character,name}',to_jsonb('Forged Name'::text)));
  RAISE EXCEPTION 'accepted cross-account credit';
 EXCEPTION WHEN raise_exception THEN
  IF SQLERRM<>'change_credit_unavailable' THEN RAISE; END IF;
 END;

 -- A new name may not collide with any existing character, even on another account.
 INSERT INTO private.character_change_credits_v1(account_id,change_kind,source_kind,source_ref)
 VALUES(v_a,'rename','admin','IDENTITY-SQL-TEST-TAKEN')
 RETURNING id INTO v_credit;
 BEGIN
  PERFORM public.commit_character_change_server_v1(
   v_a,v_id,3,'identity-taken-001',repeat('e',64),v_credit,
   jsonb_set(v_changed,'{character,name}',to_jsonb('Taken Name'::text)));
  RAISE EXCEPTION 'accepted taken name';
 EXCEPTION WHEN raise_exception THEN
  IF SQLERRM<>'name_already_taken' THEN RAISE; END IF;
 END;
 IF (SELECT consumed_at FROM private.character_change_credits_v1 WHERE id=v_credit) IS NOT NULL
 THEN RAISE EXCEPTION 'failed rename consumed credit'; END IF;

 -- A single code issues one credit to this account and cannot be redeemed again.
 v_code_hash:=encode(sha256(convert_to(v_code,'UTF8')),'hex');
 INSERT INTO private.character_change_coupons_v1(
  code_hash,change_kind,starts_at,expires_at,max_total_claims)
 VALUES(v_code_hash,'rename',now()-interval '1 day',now()+interval '1 day',10);
 PERFORM set_config('request.jwt.claim.sub',v_a::text,true);
 PERFORM set_config('request.jwt.claim.role','authenticated',true);
 v_claim:=public.redeem_character_change_coupon_v1(v_code);
 IF v_claim->>'grant'<>'rename_credit'
 THEN RAISE EXCEPTION 'coupon did not grant rename credit'; END IF;
 BEGIN
  PERFORM public.redeem_character_change_coupon_v1(v_code);
  RAISE EXCEPTION 'double coupon claim accepted';
 EXCEPTION WHEN raise_exception THEN
  IF SQLERRM<>'REDEEM_LIMIT_REACHED' THEN RAISE; END IF;
 END;
 IF (SELECT count(*) FROM private.character_change_coupon_claims_v1
     WHERE account_id=v_a AND code_hash=v_code_hash)<>1
 THEN RAISE EXCEPTION 'duplicate coupon claim'; END IF;
END $test$;
SELECT 'PASS: identity changes, RLS ACL, replay, credit isolation, name collisions and coupon single-claim' AS result;
ROLLBACK;