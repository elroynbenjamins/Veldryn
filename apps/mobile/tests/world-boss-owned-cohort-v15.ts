/** World Boss V15: synthetic, server-owned GameState audit only. No accounts queried. */
import {assert} from './test-assert';
import {CLASSES} from '../src/content/classes';
import {regionalCombatFixture,REGIONAL_COMBAT_FIXTURES} from '../src/core/regional-combat-fixtures';
import type {ClassId,GameState,GearSlot} from '../src/core/types';
import {
 auditWorldBossOwnedCohortV15,
 type WorldBossCohortSelectionV15,type WorldBossServerOwnedCohortSourceV15,
} from '../../../backend/online/world-boss-owned-cohort-v15';

const NOW=1794564000000;
const REFS=[
 REGIONAL_COMBAT_FIXTURES.find(x=>x.regionId==='GREENFIELDS')!,
 REGIONAL_COMBAT_FIXTURES.find(x=>x.regionId==='IRONWOOD')!,
 REGIONAL_COMBAT_FIXTURES.find(x=>x.regionId==='SUNSCAR')!,
 REGIONAL_COMBAT_FIXTURES.find(x=>x.regionId==='SUNSCAR')!,
];
const LEVELS=[8,15,29,40] as const;
const TIERS=['T1','T2','T3','T4'] as const;
const selections:WorldBossCohortSelectionV15[]=[];
const states=new Map<string,GameState>();
for(let i=0;i<120;i++){
 const classId=CLASSES[i%CLASSES.length].id as ClassId;
 const band=Math.floor(i/CLASSES.length)%4;
 const accountId='WB15_ACCT_'+String(i).padStart(3,'0');
 const characterId='WB15_CHAR_'+String(i).padStart(3,'0');
 const state=regionalCombatFixture(
  {...REFS[band],level:LEVELS[band],tier:TIERS[band]},'prepared',classId,
 );
 state.character={...state.character!,id:characterId};
 selections.push({accountId,characterId,expectedRevision:2});
 states.set(accountId,state);
}
let loads=0;
function source(overrides?:Partial<WorldBossServerOwnedCohortSourceV15>):
 WorldBossServerOwnedCohortSourceV15{
 return {
  nowUtcMs:()=>NOW,
  async listEligibleOwnedCharacters(){return selections;},
  async loadOwnedCharacterState({accountId,characterId}){
   loads++;
   const state=states.get(accountId);
   assert.ok(state,'trusted selection exists in source');
   assert.equal(state.character?.id,characterId);
   return {ownerAccountId:accountId,gameVersion:2,updatedAtUtcMs:NOW-60000,serverState:state};
  },
  ...overrides,
 };
}
async function reject(fn:()=>Promise<unknown>,contains:string){
 let error='';
 try{await fn();}catch(e){error=String(e);}
 assert.ok(error.includes(contains),'expected '+contains+' received '+error);
}
async function main(){
 const audited=await auditWorldBossOwnedCohortV15({
  eventId:'WB_V15_SYNTHETIC',source:source(),
 });
 assert.equal(audited.verifiedCount,120);
 assert.equal(audited.report.samplesReviewed,120);
 assert.equal(audited.report.cohorts.length,5);
 assert.equal(audited.report.approved,false);
 assert.equal(audited.persisted,false);
 assert.equal(audited.live,false);
 assert.ok(loads>=120);
 assert.equal(JSON.stringify(audited).includes('WB15_ACCT_'),false,
  'no individual account IDs may leave the review interface');
 const duplicated=[...selections];
 duplicated[1]={...duplicated[1],accountId:duplicated[0].accountId};
 await reject(()=>auditWorldBossOwnedCohortV15({
  eventId:'WB_V15_SYNTHETIC',source:source({
   listEligibleOwnedCharacters:async()=>duplicated,
  }),
 }), 'invalid_or_duplicate_server_selection');
 await reject(()=>auditWorldBossOwnedCohortV15({
  eventId:'WB_V15_SYNTHETIC',source:source({
   listEligibleOwnedCharacters:async()=>selections.slice(0,99),
  }),
 }), 'invalid_population_size');
 await reject(()=>auditWorldBossOwnedCohortV15({
  eventId:'WB_V15_SYNTHETIC',source:source({
   loadOwnedCharacterState:async ({accountId})=>({
    ownerAccountId:'WB15_FOREIGN_OWNER',gameVersion:2,updatedAtUtcMs:NOW-60000,serverState:states.get(accountId)!,
   }),
  }),
 }), 'owner_character_or_revision_mismatch');
 await reject(()=>auditWorldBossOwnedCohortV15({
  eventId:'WB_V15_SYNTHETIC',source:source({
   loadOwnedCharacterState:async ({accountId})=>({
    ownerAccountId:accountId,gameVersion:3,updatedAtUtcMs:NOW-60000,serverState:states.get(accountId)!,
   }),
  }),
 }), 'owner_character_or_revision_mismatch');
 const unsafe=structuredClone(states.get(selections[0].accountId)!);
 const slot=Object.entries(unsafe.character!.equipment).find(([,id])=>Boolean(id))![0] as GearSlot;
 unsafe.character!.equipmentInstanceIds={
  ...unsafe.character!.equipmentInstanceIds,[slot]:'NOT_OWNED_COPY',
 };
 await reject(()=>auditWorldBossOwnedCohortV15({
  eventId:'WB_V15_SYNTHETIC',source:source({
   loadOwnedCharacterState:async ({accountId})=>({
    ownerAccountId:accountId,gameVersion:2,updatedAtUtcMs:NOW-60000,
    serverState:accountId===selections[0].accountId?unsafe:states.get(accountId)!,
   }),
  }),
 }), 'equipment_copy_not_owned');
 await reject(()=>auditWorldBossOwnedCohortV15({
  eventId:'WB_V15_SYNTHETIC',source:source({
   loadOwnedCharacterState:async ({accountId})=>({
    ownerAccountId:accountId,gameVersion:2,
    updatedAtUtcMs:NOW-8*86400000,serverState:states.get(accountId)!,
   }),
  }),
 }), 'owner_character_or_revision_mismatch');
 await reject(()=>auditWorldBossOwnedCohortV15({
  eventId:'WB_V15_SYNTHETIC',source:source({
   loadOwnedCharacterState:async ({accountId})=>({
    ownerAccountId:accountId,gameVersion:2,
    updatedAtUtcMs:NOW+1,serverState:states.get(accountId)!,
   }),
  }),
 }), 'owner_character_or_revision_mismatch');
 await reject(()=>auditWorldBossOwnedCohortV15({
  eventId:'WB_V15_SYNTHETIC',source:source({nowUtcMs:()=>-1}),
 }), 'invalid_service_clock');
 console.log('WB_V15_OWNED_COHORT='+JSON.stringify({
  syntheticVerifiedAccounts:audited.verifiedCount,
  anonymousBrackets:audited.report.cohorts.length,
  approved:false,accountsReturned:false,
  ownerForgeryRevisionReplayForgedCopyRejected:true,
  liveDbReads:0,writes:0,live:false,
 }));
}
void main().catch(error=>{console.error(error);throw error;});
