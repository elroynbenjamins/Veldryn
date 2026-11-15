/**
 * V24: no live combat rule, rewards, database, player snapshots, or balance
 * approval. Actual online equipment/companion-derived synthetic GameStates.
 */
import {assert} from './test-assert';
import {regionalCombatFixture,REGIONAL_COMBAT_FIXTURES} from
 '../src/core/regional-combat-fixtures';
import type {ClassId,GameState} from '../src/core/types';
import {resolveRealWorldBossSnapshotV12} from
 '../../../backend/online/world-boss-loadout-v12';
import {freezeWorldBossAccountRosterV22,simulateWorldBossAccountRaidV22,
 worldBossAccountDamageV22} from
 '../../../backend/src/server/combat/world-boss-account-raid-v22';
import {makeWorldBossWarCampSnapshotV11} from
 '../../../backend/src/server/combat/world-boss-war-camp-v11';
import {makeWorldBossEncounterProfileV13} from
 '../../../backend/src/server/combat/world-boss-encounter-profile-v13';
import {auditWorldBossAccountReplayV24,WORLD_BOSS_V24_BALANCE_LIVE} from
 '../../../backend/src/server/combat/world-boss-account-balance-v24';

const EVENT='30000000-0000-4000-8000-000000000024';
const ACCOUNT='10000000-0000-4000-8000-000000000024';
const NOW=Date.UTC(2026,10,21,12);
const POLICY={version:'wb24-synthetic-not-approved',
 bounds:[2500,5000,10000,20000] as [number,number,number,number]};
const classes:ClassId[]=[
 'IRONWARDEN','BASTION','DREADGUARD','DAWNKEEPER','STONECALLER',
 'WAYFINDER','RAVAGER','HEXWEAVER','KNIFE_DANCER',
];
const combos=[
 {name:'mixed-t2',level:25,tier:'T2',preparation:'prepared' as const,
  classes:['IRONWARDEN','DAWNKEEPER','WAYFINDER','RAVAGER','HEXWEAVER'] as ClassId[],
  attack:1000,defense:700},
 {name:'mixed-t4',level:40,tier:'T4',preparation:'prepared' as const,
  classes:['STONECALLER','BASTION','KNIFE_DANCER','DREADGUARD','WAYFINDER'] as ClassId[],
  attack:1850,defense:1200},
];
type Verified=Awaited<ReturnType<typeof resolveRealWorldBossSnapshotV12>>;
async function verifiedCohort(combo:typeof combos[number]):Promise<Verified[]>{
 const states=new Map<string,GameState>();
 for(let i=0;i<combo.classes.length;i++){
  const id='20000000-0000-4000-8000-'+String(i+1).padStart(12,'0');
  const def=REGIONAL_COMBAT_FIXTURES.find(x=>
   x.regionId===(combo.tier==='T2'?'IRONWOOD':'SUNSCAR'))!;
  const state=regionalCombatFixture({...def,level:combo.level,tier:combo.tier},
   combo.preparation,combo.classes[i]);
  state.character={...state.character!,id};
  states.set(id,state);
 }
 return Promise.all([...states.keys()].map(characterId=>
  resolveRealWorldBossSnapshotV12({
   reader:{
    principalAccountId:ACCOUNT,
    async loadCharacterState({accountId,characterId:id}){
     assert.equal(accountId,ACCOUNT);
     assert.equal(id,characterId);
     return {ownerAccountId:accountId,serverState:structuredClone(states.get(id)!),
      gameVersion:2};
    },
   },characterId,expectedGameVersion:2,nowUtcMs:NOW,
   minimumCharacterLevel:1,policy:POLICY,
  })));
}
const reject=(action:()=>unknown,part:string)=>{
 let error='';try{action();}catch(e){error=String(e);}
 assert.ok(error.includes(part),'Expected '+part+', got '+error);
};
async function main(){
 assert.equal(WORLD_BOSS_V24_BALANCE_LIVE,false);
 assert.deepEqual([...new Set(combos.flatMap(c=>c.classes))].sort(),[...classes].sort());
 const bosses=['hollowroot','sunscar','frostmarch'] as const;
 const phases=['armored','exposed','enraged'] as const;
 let simulated=0,withHealing=0,withInterrupts=0,
  fiveSoloLowerStrongest=0;
 const sizeSummaries:Record<number,{samples:number;maxBoost:number;minBoost:number}>=
  Object.fromEntries([1,2,3,4,5].map(n=>[n,{
   samples:0,maxBoost:0,minBoost:Infinity,
  }]));
 for(const combo of combos){
  const verified=await verifiedCohort(combo);
  assert.equal(verified.length,5);
  const warCamp=makeWorldBossWarCampSnapshotV11({
   eventId:EVENT,revision:1,levels:{
    fortifications:combo.tier==='T2'?0:1,
    fieldProvisions:combo.tier==='T2'?0:1,
    siegecraft:combo.tier==='T2'?0:1,
   },
  });
  for(const boss of bosses){
   for(const phase of phases){
    const profile=makeWorldBossEncounterProfileV13({
     eventId:EVENT,boss,phase,gearBand:combo.tier==='T2'?2:4,
     configVersion:'v24-synthetic-test-not-production',
     attack:combo.attack,defense:combo.defense,guardMax:8000,
    });
    let strongestSolo=0;
    for(let size=1;size<=5;size++){
     const roster=freezeWorldBossAccountRosterV22({
      accountId:ACCOUNT,atUtcMs:NOW,verified:verified.slice(0,size),
     });
     const raid=simulateWorldBossAccountRaidV22({
      eventId:EVENT,requestId:'WB24_'+combo.name+'_'+boss+'_'+phase+'_'+size,
      roster,boss,phase,warCamp,encounter:profile,order:'steady_assault',
      serverSeed:'WB24_PRIVATE_SIMULATION_NONCE_123456789',
     });
     const evidence=auditWorldBossAccountReplayV24(raid);
     assert.equal(evidence.status,'test_only_not_approved');
     assert.equal(evidence.creditedRewards,false);
     assert.equal(evidence.persisted,false);
     assert.equal(evidence.accountSize,size);
     assert.equal(evidence.characters.length,size);
     assert.equal(evidence.proposedWorldHpDamage,
      worldBossAccountDamageV22(raid.characterLedger));
     assert.ok(evidence.proposedWorldHpDamage<=evidence.rawPartyDamage);
     assert.ok(evidence.secondaryBonusFraction<=.28+1e-8);
     assert.ok(evidence.secondaryBonusFraction>=0);
     assert.ok(evidence.survivors<=size);
     assert.equal(evidence.protectedRoleAttribution,'not_available_do_not_score');
     for(const row of evidence.characters){
      assert.ok(row.provisionalWeightedDamage<=row.rawDamage);
      assert.ok(row.effectiveHealing>=0&&row.interruptions>=0);
      assert.ok(row.damageTaken>=0);
     }
     if(size===1){
      assert.equal(evidence.secondaryBonusFraction,0);
      strongestSolo=evidence.strongestDamage;
     }
     if(size===5&&evidence.strongestDamage<strongestSolo)
      fiveSoloLowerStrongest++;
     if(evidence.effectiveHealing>0)withHealing++;
     if(evidence.interrupts>0)withInterrupts++;
     const bucket=sizeSummaries[size];
     bucket.samples++;
     bucket.maxBoost=Math.max(bucket.maxBoost,evidence.secondaryBonusFraction);
     bucket.minBoost=Math.min(bucket.minBoost,evidence.secondaryBonusFraction);
     simulated++;
     if(simulated===1){
      const same=auditWorldBossAccountReplayV24(raid);
      assert.deepEqual(evidence,same);
      reject(()=>auditWorldBossAccountReplayV24({
       ...raid,proposedWorldHpDamage:raid.proposedWorldHpDamage+1,
      }), 'world_damage_mismatch');
      reject(()=>auditWorldBossAccountReplayV24({
       ...raid,characterLedger:raid.characterLedger.map((r,i)=>
        i? r:{...r,rawHealing:r.rawHealing+5000}),
      }), 'unverified_character_ledger');
      reject(()=>auditWorldBossAccountReplayV24({
       ...raid,characterLedger:[...raid.characterLedger,raid.characterLedger[0]],
      }), 'invalid_replay');
     }
    }
   }
  }
 }
 assert.equal(simulated,2*3*3*5);
 assert.equal(sizeSummaries[1].maxBoost,0);
 assert.equal(sizeSummaries[1].minBoost,0);
 for(const size of [2,3,4,5])assert.equal(sizeSummaries[size].samples,18);
 // Provisional formula is intentionally evaluated without approving a
 // fairness target: solo-vs-five damage outcomes may be worse under AoE.
 console.log('WORLD_BOSS_V24_ACCOUNT_BALANCE_EVIDENCE='+JSON.stringify({
  simulatedBattles:simulated,equipmentBands:['T2','T4'],classes:classes.length,
  bosses:bosses.length,phases:phases.length,sizes:[1,2,3,4,5],
  sizeSummaries,withHealing,withInterrupts,fiveSoloLowerStrongest,
  mitigationUnattributed:true,approved:false,live:false,
  playerSaveReads:0,rewardsCredited:0,
 }));
}
void main().catch(e=>{console.error(e);throw e;});
