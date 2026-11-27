/** Disposable V103 end-to-end physical chest transaction. No live database. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {PGlite} from '@electric-sql/pglite';
const require=createRequire(import.meta.url);
const build='../../apps/mobile/.core-build/backend/src/server/';
const {createWorldBossChestOpeningV103}=require(build+'loot/world-boss-chest-opening-v103.js');
const {moveWorldBossGatheringCopyV107}=require(build+'loot/world-boss-gathering-moves-v107.js');
const {deriveChestSettlementRollsV69}=require(build+'loot/chest-reward-settlement-v69.js');
const {worldBossChestLootTableV96}=require(build+'combat/world-boss-chest-policy-v96.js');
const schema=name=>{
 const s=readFileSync(new URL('../../docs/roadmap/party-events/hidden-migrations/'+name,import.meta.url),'utf8');
 return s.slice(s.indexOf('BEGIN;')+6,s.lastIndexOf('COMMIT;'));
};
const account='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222';
const character='33333333-3333-4333-8333-333333333333';
const secret=new Uint8Array(32).fill(13);
const table=worldBossChestLootTableV96('hollowroot','donations_goal');
function findSource(kind,hit){
 for(let i=1000;i<2000;i++){
  const key='world-boss:'+i.toString(16).padStart(8,'0')+'-4444-4444-8444-444444444444:'+account+':'+kind;
  if((deriveChestSettlementRollsV69(table,key,secret)[0].hitRoll<1000)===hit)return key;
 }
 throw Error('fixture entropy search failed');
}
const hit=findSource('donations_goal',true),miss=findSource('three_attempts',false),failure=findSource('community_damage_goal',true);
const db=await PGlite.create();
try{
 await db.exec(
  'CREATE SCHEMA auth;CREATE SCHEMA private;'+
  'CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;'+
  'CREATE TABLE auth.users(id uuid PRIMARY KEY);'+
  'CREATE TABLE public.characters(id uuid PRIMARY KEY,'+
  'account_id uuid NOT NULL REFERENCES auth.users(id));'+
  'CREATE TABLE public.online_game_states('+
  'account_id uuid PRIMARY KEY REFERENCES auth.users(id),'+
  'character_id uuid NOT NULL REFERENCES public.characters(id),'+
  'state jsonb NOT NULL,revision integer NOT NULL DEFAULT 1,'+
  'updated_at timestamptz NOT NULL DEFAULT now());'+
  'CREATE TABLE public.character_wallets('+
  'character_id uuid PRIMARY KEY REFERENCES public.characters(id),'+
  'gold bigint NOT NULL CHECK(gold >= 0),updated_at timestamptz NOT NULL DEFAULT now());'+
  'CREATE TABLE private.reward_inbox_v1('+
  'id uuid PRIMARY KEY DEFAULT gen_random_uuid(),'+
  'account_id uuid NOT NULL REFERENCES auth.users(id),'+
  'source_key text NOT NULL,source_kind text NOT NULL '+
  "CHECK(source_kind IN('party','guild','dungeon','gift')),"+
  'source_id uuid NOT NULL,title text NOT NULL,body text NOT NULL,'+
  "attachments jsonb NOT NULL DEFAULT '[]',"+
  'created_at timestamptz NOT NULL DEFAULT now(),'+
  'claimed_at timestamptz,UNIQUE(account_id,source_key));'
 );
 await db.query('INSERT INTO auth.users VALUES($1),($2)',[account,other]);
 await db.query('INSERT INTO public.characters VALUES($1,$2)',[character,account]);
 const baseline={
  character:{id:character,gold:100,equipment:{},equipmentInstanceIds:{}},account:{companionEssence:3},
  inventory:{capacity:4,stacks:[
   {itemId:'GEM_DUST',quantity:4}]},
  bank:{capacity:2,stacks:[{itemId:'TEMPERING_DUST',quantity:2}]},
  overflow:{stacks:[],expiresAtMs:null},
 };
 await db.query('INSERT INTO public.online_game_states '+
  '(account_id,character_id,state) VALUES($1,$2,$3::jsonb)',
  [account,character,JSON.stringify(baseline)]);
 await db.query('INSERT INTO public.character_wallets VALUES($1,100)',[character]);

 for(const name of ['20261119104500_universal_chest_ledger_v70.sql','20261127133000_world_boss_gathering_mint_v102_review_only.sql','20261127134000_world_boss_reward_v103_review_only.sql'])await db.exec(schema(name));
 await db.exec('CREATE TABLE private.qa_earned_source(source_key text PRIMARY KEY,account_id uuid NOT NULL);');
 for(const key of [hit,miss,failure])await db.query('INSERT INTO private.qa_earned_source VALUES($1,$2)',[key,account]);
 const verifyLockedSource=async(tx,owner,key)=>(await tx.query('SELECT source_key FROM private.qa_earned_source WHERE source_key=$1 AND account_id=$2::uuid FOR UPDATE',[key,owner])).rows.length===1;
 const ports={
  verifyLockedSource,
  assertSourceWriteOpen:async(tx,owner,key)=>{if(!await verifyLockedSource(tx,owner,key))throw Error('fixture_unearned');},
  readCanonicalSource:async(tx,owner,key)=>({sourceKey:key,accountId:owner,earned:await verifyLockedSource(tx,owner,key),proofVersion:'qa-earned-v103',recipientCharacterId:null,equipmentDeliveryMode:'account_unclaimed',lootTable:table}),
  isOwnedCharacter:async(tx,owner,id)=>(await tx.query('SELECT id FROM public.characters WHERE id=$1::uuid AND account_id=$2::uuid',[id,owner])).rows.length===1,
 };
 const pool={connect:async()=>({query:(sql,p)=>db.query(sql,p),release(){}})};
 const open=createWorldBossChestOpeningV103(pool,ports,{chestSecret:secret,mintSecret:secret,entropyVersion:'qa-v1'},true);
 const run=sourceKey=>open({authenticatedAccountId:account,sourceKey});
 const state=async()=>(await db.query('SELECT state,revision FROM public.online_game_states WHERE account_id=$1',[account])).rows[0];
 const gold=async()=>Number((await db.query('SELECT gold::text AS gold FROM public.character_wallets WHERE character_id=$1',[character])).rows[0].gold);
 const counts=async key=>{
  const result=[];
  for(const name of ['chest_reward_receipts_v70','world_boss_chest_resource_grants_v103','world_boss_gathering_mints_v102','chest_reward_grant_legs_v70','reward_inbox_v1'])
   result.push((await db.query('SELECT count(*)::int AS n FROM private.'+name+' WHERE source_key=$1',[key])).rows[0].n);
  return result;
 };
 const first=await run(hit);
 assert.equal(first.replayed,false);assert.equal(first.receipt.drops.length,1);
 assert.deepEqual(await counts(hit),[1,5,1,7,1]);
 assert.equal(await gold(),550);
 assert.equal((await state()).state.account.companionEssence,9);
 assert.equal((await state()).state.inventory.stacks.find(x=>x.itemId==='IRONWOOD_LOG').quantity,8);
 assert.equal((await run(hit)).replayed,true);assert.equal(await gold(),550);
 const second=await run(miss);assert.equal(second.receipt.drops.length,0);
 assert.deepEqual(await counts(miss),[1,5,0,6,1]);assert.equal(await gold(),1000);
 // Fail after mint and all five physical rewards: actual DB trigger rejects Inbox.
 const before=await state();
 await db.exec("CREATE FUNCTION private.qa_fail_inbox() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'QA_INBOX_FAILURE'; END $$; CREATE TRIGGER qa_fail_inbox BEFORE INSERT ON private.reward_inbox_v1 FOR EACH ROW EXECUTE FUNCTION private.qa_fail_inbox();");
 await assert.rejects(()=>run(failure),/QA_INBOX_FAILURE/);
 assert.deepEqual(await state(),before);assert.equal(await gold(),1000);
 assert.deepEqual(await counts(failure),[0,0,0,0,0]);
 await db.exec('DROP TRIGGER qa_fail_inbox ON private.reward_inbox_v1;');
 const recovered=await run(failure);
 assert.equal(recovered.receipt.drops.length,1);
 assert.deepEqual(await counts(failure),[1,5,1,7,1]);assert.equal(await gold(),1450);
 // Real V107 move journal and state/custody transaction, using the
 // actual V103-created mint. The reservation/fence are disposable fixtures.
 await db.exec(schema('20261127140000_world_boss_gathering_moves_v107_review_only.sql'));
 await db.exec("CREATE FUNCTION private.world_boss_v57_assert_write_open(uuid) RETURNS void LANGUAGE plpgsql AS $$ BEGIN IF NOT EXISTS(SELECT 1 FROM auth.users WHERE id=$1) THEN RAISE EXCEPTION 'QA_FENCE'; END IF; END $$;");
 const moveMint=(await db.query('SELECT id::text AS id,slot,roll,roll_digest FROM private.world_boss_gathering_mints_v102 WHERE source_key=$1',[hit])).rows[0];
 const instanceId=moveMint.id;
 const readCustody=async()=>(await db.query('SELECT location,holder_character_id::text AS holder,revision::text AS revision FROM private.world_boss_gathering_custody_v102 WHERE instance_id=$1',[instanceId])).rows[0];
 const move=async(input,commit=true)=>{
  await db.exec('BEGIN ISOLATION LEVEL READ COMMITTED');
  try{const result=await moveWorldBossGatheringCopyV107({query:(sql,p)=>db.query(sql,p),release(){}},input,true);await db.exec(commit?'COMMIT':'ROLLBACK');return result;}
  catch(error){await db.exec('ROLLBACK');throw error;}
 };
 const request=async(kind,requestId)=>({accountId:account,characterId:character,expectedRevision:(await state()).revision,intent:{kind,instanceId,requestId},assertMoveAllowed:async()=>true});
 const initial=await state();
 const firstMove=await request('claim_to_bank','qa-claim');
 const abandoned=await move(firstMove,false);
 assert.equal(abandoned.receipt.to,'bank');
 assert.deepEqual(await state(),initial);assert.equal((await readCustody()).location,'unclaimed');
 const claimed=await move(firstMove);
 assert.equal(claimed.replayed,false);assert.equal((await readCustody()).location,'bank');
 assert.equal((await state()).state.bank.stacks.filter(x=>x.instanceId===instanceId).length,1);
 assert.equal((await move(firstMove)).replayed,true);
 await assert.rejects(()=>move({...firstMove,intent:{...firstMove.intent,kind:'withdraw_bank'}}),/request_conflict/);
 await assert.rejects(()=>move({...firstMove,intent:{...firstMove.intent,requestId:'qa-stale'}}),/stale_state/);
 const withdraw=await request('withdraw_bank','qa-withdraw');
 await assert.rejects(()=>move({...withdraw,assertMoveAllowed:async()=>false}),/move_not_allowed/);
 await move(withdraw);
 assert.equal((await readCustody()).location,'inventory');
 const equip=await request('equip','qa-equip');
 await move(equip);
 assert.equal((await readCustody()).location,'equipped');
 assert.equal((await state()).state.character.equipmentInstanceIds[moveMint.slot],instanceId);
 await move(await request('unequip','qa-unequip'));
 assert.equal((await readCustody()).location,'inventory');
 // Fail after custody CAS but before state write; rollback both.
 const beforeMoveFailure=await state(),beforeCustodyFailure=await readCustody();
 await db.exec("CREATE FUNCTION private.qa_fail_move() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'QA_MOVE_FAILURE'; END $$; CREATE TRIGGER qa_fail_move BEFORE UPDATE ON public.online_game_states FOR EACH ROW EXECUTE FUNCTION private.qa_fail_move();");
 const deposit=await request('deposit_bank','qa-deposit');
 await assert.rejects(()=>move(deposit),/QA_MOVE_FAILURE/);
 assert.deepEqual(await state(),beforeMoveFailure);assert.deepEqual(await readCustody(),beforeCustodyFailure);
 await db.exec('DROP TRIGGER qa_fail_move ON public.online_game_states;');
 await move(deposit);
 assert.equal((await readCustody()).location,'bank');
 assert.equal((await move(firstMove)).replayed,true);
 assert.equal((await readCustody()).location,'bank');
 assert.equal((await db.query('SELECT count(*)::int AS n FROM private.world_boss_gathering_moves_v107')).rows[0].n,5);
 assert.equal((await db.query('SELECT roll_digest FROM private.world_boss_gathering_mints_v102 WHERE id=$1',[instanceId])).rows[0].roll_digest,moveMint.roll_digest);
 await assert.rejects(()=>db.exec("UPDATE private.world_boss_gathering_moves_v107 SET request_digest=repeat('a',64)"),/IMMUTABLE/);
 console.log('WB_GATHERING_MOVES_V107_PG: real chest mint to bank/inventory/equip/unequip/bank, CAS, rollback after custody write, historical request replay and immutable journal');
 // A replay cannot mint missing custody or pay again.
 const mint=(await db.query('SELECT id FROM private.world_boss_gathering_mints_v102 WHERE source_key=$1',[hit])).rows[0];
 await db.query('DELETE FROM private.world_boss_gathering_custody_v102 WHERE instance_id=$1',[mint.id]);
 await assert.rejects(()=>run(hit),/missing_or_invalid_custody/);
 assert.equal(await gold(),1450);
 console.log('WB_CHEST_OPENING_V103_PG: actual V69/V70 orchestration, real wallet/material/Inbox fixture, hit/miss, lost ACK, post-mint rollback and missing-custody replay rejection');
}finally{await db.close();}
