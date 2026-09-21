import {strict as assert} from 'node:assert';
import type {CombatantDefinition} from '../types';
import type {RegionalCombatReservationV1,RegionalCombatStoredResultV1,RegionalCombatStoreV1} from '../regional-combat-runtime-v1';
import {buildRegionalCombatEnemyV1,regionalCombatCatalogEntryV1,resolveRegionalCombatV1,startRegionalCombatV1} from '../regional-combat-runtime-v1';

class MemoryStore implements RegionalCombatStoreV1{
  reservations=new Map<string,RegionalCombatReservationV1>();
  results=new Map<string,RegionalCombatStoredResultV1>();
  async reserve(input:RegionalCombatReservationV1){if(this.reservations.has(input.receiptId))throw new Error('duplicate_receipt');this.reservations.set(input.receiptId,structuredClone(input));return structuredClone(input);}
  async load(receiptId:string){const row=this.reservations.get(receiptId);if(!row)throw new Error('regional_receipt_not_found');return structuredClone(row);}
  async readResult(receiptId:string){const row=this.results.get(receiptId);return row?structuredClone(row):undefined;}
  async commitResult(input:RegionalCombatStoredResultV1){const prior=this.results.get(input.receiptId);if(prior)return {duplicate:true,result:structuredClone(prior)};this.results.set(input.receiptId,structuredClone(input));return {duplicate:false,result:structuredClone(input)};}
}

const scorpion=regionalCombatCatalogEntryV1('REGCOM_SUN_007_ELITE')!;
const elite=buildRegionalCombatEnemyV1(scorpion);
assert.ok(elite.tags?.includes('elite'));
assert.equal(elite.id,'SUNMON_005');
const tyrant=buildRegionalCombatEnemyV1(regionalCombatCatalogEntryV1('REGCOM_SUN_010_BOSS')!);
assert.equal(tyrant.boss,true);
assert.ok((tyrant.phases??[]).length>=2);

const store=new MemoryStore(),rewardCalls:Record<string,unknown>[]=[];
const strongSnapshot={
 characterId:'char-1',classId:'TEST_DAMAGE',displayName:'Regional Tester',role:'damage' as const,level:45,
 maxHp:9000,attackPower:9000,healingPower:200,defense:5000,accuracy:2000,evasion:500,critChance:.2,haste:.2,
 effectGems:[{familyId:'effect_predator',copies:3,resonance:3 as const,totalValue:.10}],
};
const playerAbility:CombatantDefinition['abilities'][number]={id:'REGIONAL_TEST_STRIKE',name:'Regional Test Strike',cooldownMs:300,castTimeMs:0,target:'current_target',priority:100,effects:[{kind:'damage',coeff:5,damageType:'physical'}]};
let idCounter=0;
const deps={
 store,
 authorizer:{
  async assertEncounterUnlocked(){},
  async loadVerifiedPlayer(){return {snapshot:strongSnapshot,abilities:[playerAbility]};},
 },
 rewards:{
  async rpc<T>(name:string,args:Record<string,unknown>):Promise<T>{rewardCalls.push({name,...args});return {eligible:true,sourceId:String(args.p_source_id),gemItemId:'gem:effect_predator:g2',duplicate:false} as T;},
 },
 randomId:()=>('receipt-'+(++idCounter)+'-regional'),
 randomSeed:()=>('seed-'+idCounter),
 nowMs:()=>Date.UTC(2026,8,21,20,0,0),
};

async function main(){
 const reserved=await startRegionalCombatV1(deps,{accountId:'account-1',characterId:'char-1',encounterId:'REGCOM_SUN_007_ELITE',requestId:'regional-start-001'});
 assert.equal(reserved.zoneId,'ZONE_007');
 assert.equal(reserved.requestId,'regional-start-001');
 assert.ok(/^[a-f0-9]{64}$/.test(reserved.requestHash));
 assert.ok(reserved.player.effectGems?.some(row=>row.familyId==='effect_predator'),'Verified Effect Gems must be frozen into regional combat snapshot');

 const resolved=await resolveRegionalCombatV1(deps,{accountId:'account-1',receiptId:reserved.receiptId});
 assert.equal(resolved.result.victory,true);
 assert.equal(resolved.duplicate,false);
 assert.equal(rewardCalls.length,1);
 assert.equal(rewardCalls[0].name,'settle_regional_gem_source_server_v1');
 assert.equal(rewardCalls[0].p_source_id,'ZONE_007');
 assert.equal(rewardCalls[0].p_receipt_key,'regional:'+reserved.receiptId);

 const replay=await resolveRegionalCombatV1(deps,{accountId:'account-1',receiptId:reserved.receiptId});
 assert.equal(replay.duplicate,true);
 assert.equal(rewardCalls.length,2,'Retry may call reward RPC, whose receipt key is independently idempotent');
 assert.equal(rewardCalls[1].p_receipt_key,rewardCalls[0].p_receipt_key);

 let ownerBlocked=false;
 try{await resolveRegionalCombatV1(deps,{accountId:'attacker',receiptId:reserved.receiptId});}catch(error){ownerBlocked=error instanceof Error&&error.message==='regional_combat_owner_mismatch';}
 assert.ok(ownerBlocked,'Regional combat receipts must be account-owned');

 console.log('PASS: authoritative regional combat receipt, simulation and gem settlement handoff');
}
void main().catch(error=>{console.error(error);process.exitCode=1;});
