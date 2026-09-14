import assert from 'node:assert/strict';
import {gameplayHandler,type GameplayServices,GameplayError} from '../gameplay';
import {createCharacter,newGame} from '../../../apps/mobile/src/core/game';
import {unlockCombatCompanion,equipCombatCompanion} from '../../../apps/mobile/src/core/combat-companions';
import {deriveOnlineCoopLoadout} from '../coop-loadout';
import {resolveAndFreezeLoadout} from '../../src/server/coop/loadout-snapshots';
import {combatantFromVerifiedSnapshot} from '../../src/server/combat/snapshot-adapter';
import type {GameState} from '../../../apps/mobile/src/core/types';
async function main(){
 let state=createCharacter(newGame(0),'IRONWARDEN','Companion Hero');state=unlockCombatCompanion(state,'UNIT_001',0);state.character!.gold=100000;state.account.companionEssence=10000;
 let version=1,commits=0,lost=false;const receipts=new Map<string,{response:unknown;requestHash:string}>();
 let serverNow=Date.UTC(2026,8,13);
 const services:GameplayServices={authenticate:async token=>token==='alice'?'alice':null,randomId:()=> 'character-a',randomRoll:()=>.5,rpc:async<T>(name:string,a:Record<string,unknown>):Promise<T>=>{
  assert.equal(a.p_account_id,'alice');
  if(name==='read_online_game_receipt_server_v1')return (receipts.get(a.p_request_id as string)??null) as T;
  if(name==='load_online_game_server_v1')return {state:structuredClone(state),version,serverNow,characterId:state.character!.id,walletGold:state.character!.gold,guildMember:false,communityProgress:{}} as T;
  if(name==='commit_online_game_server_v1'){if(a.p_expected_version!==version)throw new GameplayError('stale_state');const r=a.p_response as {state:GameState;version:number};state=r.state;version=r.version;commits++;receipts.set(a.p_request_id as string,{response:r,requestHash:a.p_request_hash as string});if(lost){lost=false;throw new Error('lost response');}return r as T;}
  throw new Error(name);
 }};
 const handle=gameplayHandler(services),request=(command:unknown,id:string,v=version)=>handle(new Request('https://example.invalid/gameplay',{method:'POST',headers:{Authorization:'Bearer alice'},body:JSON.stringify({command,requestId:id,expectedVersion:v})}));
 assert.equal((await request({type:'companion_equip',args:{id:'UNIT_001'}},'comp-equip-001')).status,200);
 const oldVersion=version,oldGold=state.character!.gold;lost=true;
 assert.equal((await request({type:'companion_level',args:{id:'UNIT_001'}},'comp-level-001')).status,503);
 const count=commits;assert.equal((await request({type:'companion_level',args:{id:'UNIT_001'}},'comp-level-001',oldVersion)).status,200);
 assert.equal(commits,count);assert.equal(state.account.combatCompanionProgress!.UNIT_001.level,2);assert.ok(state.character!.gold<oldGold);
 assert.equal((await request({type:'companion_level',args:{id:'UNIT_001',cost:0}},'comp-forged-001')).status,400);
 assert.equal((await request({type:'companion_trial_floor',args:{id:'fake',floor:1,victory:true}},'comp-forged-002')).status,400);
 assert.equal((await request({type:'companion_equip',args:{id:'UNIT_024'}},'comp-locked-001')).status,400);
 const record=deriveOnlineCoopLoadout('alice',state,version);assert.equal(record.stats.combatCompanion?.companionId,'UNIT_001');
 // Use calibrated stats to test the freeze boundary independently from gear readiness.
 record.characterLevel=25;record.stats={...record.stats,level:25,maxHp:5200,attackPower:420,healingPower:180,defense:1500,accuracy:680,evasion:180};
 const frozen=resolveAndFreezeLoadout({accountId:'alice',characterId:state.character!.id,loadoutId:'current',expectedRevision:version,minLevel:1,syncLevel:25,repository:{getOwnedLoadout:()=>record}});
 const level=frozen.normalized.snapshot.combatCompanion!.level;state.account.combatCompanionProgress!.UNIT_001.level=9;
 assert.equal(frozen.normalized.snapshot.combatCompanion!.level,level);
 const actor=combatantFromVerifiedSnapshot(frozen.normalized.snapshot,frozen.normalized.abilities);
 assert.equal(actor.role,'tank');assert.ok(actor.abilities.some(x=>x.tags?.includes('combat_companion')));assert.equal(actor.stats.attackPower,frozen.normalized.snapshot.attackPower,'assist does not rewrite character gear stats');
 const forged=structuredClone(state);forged.character!.equippedCombatCompanionId='UNIT_002';assert.throws(()=>deriveOnlineCoopLoadout('alice',forged,version));
 state.account.companionSanctuary!.expeditionPensLevel=1;
 const supplyVersion=version,supplyGold=state.character!.gold;lost=true;
 assert.equal((await request({type:'companion_supplies'},'comp-supply-001')).status,503);
 assert.equal((await request({type:'companion_supplies'},'comp-supply-001',supplyVersion)).status,200);
 assert.equal(state.character!.gold,supplyGold-250);assert.equal(state.account.companionMaterials!.SUPPLIES,5);
 assert.equal((await request({type:'companion_supplies',args:{gold:0}},'comp-supply-forged')).status,400);
 state.account.combatCompanionProgress!.UNIT_001.bondLevel=2;state.account.combatCompanionProgress!.UNIT_001.bondXp=90;
 assert.equal((await request({type:'companion_bond_reward',args:{id:'UNIT_001'}},'comp-bond-first')).status,200);
 assert.equal((await request({type:'companion_bond_reward',args:{id:'UNIT_001'}},'comp-bond-again')).status,400);
 assert.equal((await request({type:'companion_monthly',args:{id:'NO_PRESTIGE_15'}},'comp-monthly-locked')).status,400);
 assert.equal((await request({type:'class_focus',args:{focus:'primary'}},'class-focus-001')).status,200);
 assert.equal((await request({type:'class_training'},'class-training-001')).status,200);
 serverNow+=60000;const trainingVersion=version;lost=true;
 assert.equal((await request({type:'claim'},'class-claim-001')).status,503);
 assert.equal((await request({type:'claim'},'class-claim-001',trainingVersion)).status,200);
 assert.deepEqual(state.character!.classSkills!.map(s=>s.xp),[6,2]);
 assert.equal((await request({type:'class_focus',args:{focus:'primary',xp:999}},'class-forged-001')).status,400);
 console.log('PASS companion/class online authority, lost-response replay, forged costs/XP, frozen co-op assist');
}
void main().catch(e=>{console.error(e);process.exitCode=1;});
