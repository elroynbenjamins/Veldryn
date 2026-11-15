/**
 * World Boss V25 isolated authoring contract: 126/90+ deterministic, source-
 * derived 14-round probes. No private DB, public API, rewards or real players.
 */
import {assert} from './test-assert';
import {regionalCombatFixture,REGIONAL_COMBAT_FIXTURES} from
 '../src/core/regional-combat-fixtures';
import type {ClassId,GameState} from '../src/core/types';
import {resolveRealWorldBossSnapshotV12} from
 '../../../backend/online/world-boss-loadout-v12';
import {freezeWorldBossAccountRosterV22,
 worldBossAccountDamageV22} from
 '../../../backend/src/server/combat/world-boss-account-raid-v22';
import {simulateWorldBossRounds,WORLD_BOSS_ROUND_SCRIPTS,
 validateWorldBossScripts} from
 '../../../backend/src/server/combat/world-boss-round-prototype';
import {simulateWorldBossAuthoredAccountEncounterV25,
 WORLD_BOSS_V25_AUTHORED_ENCOUNTERS_LIVE,
 WORLD_BOSS_V25_ENGINE_VERSION} from
 '../../../backend/src/server/combat/world-boss-account-encounter-v25';
import {makeWorldBossEncounterProfileV13} from
 '../../../backend/src/server/combat/world-boss-encounter-profile-v13';
import {makeWorldBossWarCampSnapshotV11} from
 '../../../backend/src/server/combat/world-boss-war-camp-v11';
import {launchPlayer} from
 '../../../backend/src/server/combat/content/launch-combat';

const EVENT='30000000-0000-4000-8000-000000000025';
const ACCOUNT='10000000-0000-4000-8000-000000000025';
const NOW=Date.UTC(2026,10,21,12);
const POLICY={version:'wb25-fixture-not-approved',
 bounds:[2500,5000,10000,20000] as [number,number,number,number]};
const cohorts=[
 {name:'t2-mixed',level:25,tier:'T2',region:'IRONWOOD',
  classes:['IRONWARDEN','DAWNKEEPER','WAYFINDER','HEXWEAVER','RAVAGER'] as ClassId[],
  attack:640,defense:680,guardMax:3300},
 {name:'t4-mixed',level:40,tier:'T4',region:'SUNSCAR',
  classes:['BASTION','STONECALLER','KNIFE_DANCER','DREADGUARD','WAYFINDER'] as ClassId[],
  attack:1080,defense:1100,guardMax:5900},
] as const;
const bosses=['hollowroot','sunscar','frostmarch'] as const;
const phases=['armored','exposed','enraged'] as const;
const signature={
 hollowroot:{armored:'ROOT_SLAM',exposed:'SPOREBURST',enraged:'SPLINTERSTORM'},
 sunscar:{armored:'SANDBREAKER',exposed:'BURNING_TEMPEST',enraged:'SOLAR_COLLAPSE'},
 frostmarch:{armored:'ICE_SPEAR',exposed:'FREEZING_CHAINS',enraged:'WHITEOUT'},
} as const;
type Verified=Awaited<ReturnType<typeof resolveRealWorldBossSnapshotV12>>;
const reject=(f:()=>unknown,part:string)=>{
 let error='';try{f()}catch(e){error=String(e);}
 assert.ok(error.includes(part),'Expected '+part+' got '+error);
};
async function resolveCohort(cohort:typeof cohorts[number]):Promise<Verified[]>{
 const states=new Map<string,GameState>();
 const region=REGIONAL_COMBAT_FIXTURES.find(x=>x.regionId===cohort.region)!;
 for(let i=0;i<cohort.classes.length;i++){
  const id='20000000-0000-4000-8000-'+String(i+1).padStart(12,'0');
  const state=regionalCombatFixture({
   ...region,level:cohort.level,tier:cohort.tier,
  },'prepared',cohort.classes[i]);
  state.character={...state.character!,id};
  states.set(id,state);
 }
 return Promise.all([...states.keys()].map(characterId=>
  resolveRealWorldBossSnapshotV12({
   reader:{
    principalAccountId:ACCOUNT,
    async loadCharacterState({accountId,characterId:id}){
     assert.equal(accountId,ACCOUNT);assert.equal(id,characterId);
     return {ownerAccountId:ACCOUNT,serverState:structuredClone(states.get(id)!),
      gameVersion:2};
    },
   },characterId,expectedGameVersion:2,nowUtcMs:NOW,
   minimumCharacterLevel:1,policy:POLICY,
  })));
}
async function main(){
 assert.equal(WORLD_BOSS_V25_AUTHORED_ENCOUNTERS_LIVE,false);
 assert.equal(WORLD_BOSS_V25_ENGINE_VERSION,
  'world-boss-account-rounds-v25-prototype');
 assert.equal(validateWorldBossScripts(),126);
 // The old V6 Echo simulator must STILL reject non-four-person rosters;
 // only the explicitly new, disabled V25 adapter permits 1–5 members.
 reject(()=>simulateWorldBossRounds({
  boss:'hollowroot',phase:'armored',
  seed:'WB25_LEGACY_CONTRACT_SEED_123456789',
  players:[launchPlayer('Ironwarden',25)],
 }), 'requires_four_players');
 let fights=0,tactical=0,signatureObserved=0,statusEvents=0,
  protectionObserved=0,cleansesObserved=0,interruptsObserved=0,
  guardRefreshObserved=0,wipes=0;
 const sampleResults:Array<{
  cohort:string;boss:string;phase:string;size:number;
  rounds:number;hp:number;guard:number;worldHpPreview:number;
  healed:number;protection:number;shieldConsumed:number;
  soloWorldHpPreview:number;fiveVsSolo:number|null;
 }>=[];
 for(const cohort of cohorts){
  const verified=await resolveCohort(cohort);
  assert.equal(verified.length,5);
  const warCamp=makeWorldBossWarCampSnapshotV11({
   eventId:EVENT,revision:3,levels:{
    fortifications:cohort.tier==='T4'?1:0,
    fieldProvisions:cohort.tier==='T4'?1:0,
    siegecraft:cohort.tier==='T4'?1:0,
   },
  });
  for(const boss of bosses)for(const phase of phases){
   const encounter=makeWorldBossEncounterProfileV13({
    eventId:EVENT,configVersion:'wb25-synthetic-threat-not-approved',
    boss,phase,gearBand:cohort.tier==='T4'?4:2,
    attack:cohort.attack,defense:cohort.defense,
    guardMax:cohort.guardMax,
   });
   let soloWorldHpPreview=0;
   for(let size=1;size<=5;size++){
    const roster=freezeWorldBossAccountRosterV22({
     accountId:ACCOUNT,atUtcMs:NOW,verified:verified.slice(0,size),
    });
    const args={
     eventId:EVENT,requestId:'WB25_'+cohort.name+'_'+boss+'_'+phase+'_'+size,
     roster,order:'steady_assault' as const,boss,phase,
     serverSeed:'WB25_PRIVATE_SIMULATION_SEED_123456789',
     encounter,warCamp,
    };
    const result=simulateWorldBossAuthoredAccountEncounterV25(args);
    assert.equal(result.persisted,false);
    assert.equal(result.rewarded,false);
    assert.equal(result.roundsCompleted,result.result.roundsCompleted);
    assert.equal(result.characterLedger.length,size);
    assert.ok(result.roundsCompleted>=1&&result.roundsCompleted<=14);
    assert.ok(result.events.length>0);
    assert.ok(result.localGuardDamage>=0);
    assert.ok(result.rawBossHpDamage>=0);
    assert.ok(result.proposedWorldHpDamage>=0);
    assert.ok(result.proposedWorldHpDamage<=result.rawBossHpDamage+.01);
    assert.equal(result.proposedWorldHpDamage,
     worldBossAccountDamageV22(result.characterLedger.map(row=>({
      characterId:row.characterId,rawDamage:row.bossHpDamage,
     }))));
    assert.ok(result.events.every(e=>e.round>=1&&e.round<=result.roundsCompleted));
    assert.ok(result.events.some(e=>e.type==='battle_end'));
    const healed=result.characterLedger.reduce((sum,c)=>sum+c.effectiveHealing,0);
    const protection=result.characterLedger.reduce((sum,c)=>sum+c.tankProtection,0);
    const shieldConsumed=result.characterLedger.reduce((sum,c)=>sum+c.shieldConsumed,0);
    if(protection>0)protectionObserved++;
    if(result.characterLedger.some(c=>c.cleansePrevented>0))cleansesObserved++;
    if(result.characterLedger.some(c=>c.interrupts>0))interruptsObserved++;
    if(result.events.some(e=>e.type==='status_apply'||e.type==='status_tick'))statusEvents++;
    if(result.events.some(e=>e.type==='guard'&&e.detail==='local_only'))
     guardRefreshObserved++;
    if(!result.survived)wipes++;
    if(result.events.some(e=>e.type==='telegraph'&&
     e.abilityId===signature[boss][phase]))signatureObserved++;
    if(size===1)soloWorldHpPreview=result.proposedWorldHpDamage;
    if(size===5)sampleResults.push({
     cohort:cohort.name,boss,phase,size,
     rounds:result.roundsCompleted,hp:result.rawBossHpDamage,
     guard:result.localGuardDamage,
     worldHpPreview:result.proposedWorldHpDamage,
     healed,protection,shieldConsumed,soloWorldHpPreview,
     fiveVsSolo:soloWorldHpPreview>0?
      result.proposedWorldHpDamage/soloWorldHpPreview:null,
    });
    if(fights===0){
     const replayed=simulateWorldBossAuthoredAccountEncounterV25(args);
     assert.deepEqual(result,replayed,'same frozen input must replay exactly');
     const modified=structuredClone(roster);
     modified.characters[0].combatant.stats.attackPower*=100;
     reject(()=>simulateWorldBossAuthoredAccountEncounterV25({
      ...args,roster:modified,
     }), 'roster_digest_mismatch');
     reject(()=>simulateWorldBossAuthoredAccountEncounterV25({
      ...args,encounter:{...encounter,defense:encounter.defense+100},
     }), 'invalid_or_foreign_profile');
     reject(()=>simulateWorldBossAuthoredAccountEncounterV25({
      ...args,warCamp:{...warCamp,levels:{...warCamp.levels,siegecraft:2}},
     }), 'war_camp_digest_mismatch');
     reject(()=>simulateWorldBossAuthoredAccountEncounterV25({
      ...args,roster:{...roster,accountId:'other_account'},
     }), 'roster_digest_mismatch');
     reject(()=>simulateWorldBossAuthoredAccountEncounterV25({
      ...args,roster:{...roster,characters:[...roster.characters,
       ...roster.characters]},
     }), 'invalid_frozen_roster');
     reject(()=>simulateWorldBossAuthoredAccountEncounterV25({
      ...args,roster:{...roster,
       characters:[roster.characters[0],roster.characters[0]],
     }), 'invalid_verified_character');
    }
    fights++;
    if(size===5){
     for(const order of ['hold_line','break_armor'] as const){
      const ordered=simulateWorldBossAuthoredAccountEncounterV25({
       ...args,order,
      });
      assert.equal(ordered.order,order);
      assert.equal(ordered.characterLedger.length,5);
      assert.equal(ordered.rewarded,false);
      tactical++;
     }
    }
   }
  }
 }
 // Controlled low-threat authored-mechanic regression: full 14 rounds
 // guarantee that the unique channels and statuses actually execute rather
 // than merely appearing in narrative or skipped early-wipe telemetry.
 const owned=await resolveCohort(cohorts[0]);
 const full=freezeWorldBossAccountRosterV22({
  accountId:ACCOUNT,atUtcMs:NOW,verified:owned,
 });
 const lowCamp=makeWorldBossWarCampSnapshotV11({
  eventId:EVENT,revision:5,levels:{
   fortifications:0,fieldProvisions:0,siegecraft:0,
  },
 });
 let authoredStatuses=0,authoredSpikes=0;
 for(const boss of bosses)for(const phase of phases){
  const lowProfile=makeWorldBossEncounterProfileV13({
   eventId:EVENT,boss,phase,gearBand:2,
   configVersion:'wb25-mechanics-isolated-not-balanced',
   attack:35,defense:100,guardMax:1700,
  });
  const raid=simulateWorldBossAuthoredAccountEncounterV25({
   eventId:EVENT,requestId:'WB25_MECHANIC_'+boss+'_'+phase,
   roster:full,order:'steady_assault',boss,phase,
   serverSeed:'WB25_MECHANICS_SERVER_SEED_NONCE_123456789',
   encounter:lowProfile,warCamp:lowCamp,
  });
  assert.equal(raid.roundsCompleted,14);
  assert.ok(raid.events.some(e=>e.type==='telegraph'&&
   e.abilityId===signature[boss][phase]));
  const expectedActor=boss==='hollowroot'?'HOLLOWROOT':
   boss==='sunscar'?'SUNSCAR':'FROSTMARCH';
  assert.ok(raid.events.some(e=>e.type==='strike'&&
   e.actorId===expectedActor));
  authoredSpikes++;
  if(phase==='exposed'){
   const kind=boss==='hollowroot'?'VINES':
    boss==='sunscar'?'SCORCH_MARK':'FREEZING_CHAINS';
   assert.ok(raid.events.some(e=>e.type==='status_apply'&&e.abilityId===kind),
    boss+' must apply its unique status, not merely display a telegraph');
   authoredStatuses++;
  }
 }
 assert.equal(authoredStatuses,3);
 assert.equal(authoredSpikes,9);
 // Guard is LOCAL to one replay: reducing it alone must never be reported
 // as shared global boss HP, even with five active owned characters.
 const sealedProfile=makeWorldBossEncounterProfileV13({
  eventId:EVENT,boss:'hollowroot',phase:'armored',gearBand:2,
  configVersion:'wb25-local-guard-only-regression',
  attack:35,defense:100,guardMax:100000000,
 });
 const guardProof=simulateWorldBossAuthoredAccountEncounterV25({
  eventId:EVENT,requestId:'WB25_LOCAL_GUARD_IS_NOT_WORLD_HP',
  roster:full,order:'break_armor',boss:'hollowroot',phase:'armored',
  serverSeed:'WB25_GUARD_SEPARATION_NONCE_123456789',
  encounter:sealedProfile,warCamp:lowCamp,
 });
 assert.ok(guardProof.localGuardDamage>0);
 assert.equal(guardProof.rawBossHpDamage,0);
 assert.equal(guardProof.proposedWorldHpDamage,0);
 assert.equal(fights,90);
 assert.equal(tactical,36);
 assert.equal(sampleResults.length,18);
 assert.ok(sampleResults.every(x=>x.fiveVsSolo===null||
  Number.isFinite(x.fiveVsSolo)&&x.fiveVsSolo>=0));
 // A replay is a concrete event ledger, not a narrative proof of balance.
 // Unique telegraphs must appear for the three bosses across all phases.
 assert.ok(signatureObserved>=50,'boss telegraph signatures should be visible');
 console.log('WORLD_BOSS_V25_AUTHORED_ACCOUNT_ENCOUNTERS='+JSON.stringify({
  authoredCuePositions:126,encounters:fights,
  alternativeWarOrders:tactical,roleAndClassCount:9,
  accountSizes:[1,2,3,4,5],bosses:[...bosses],phases:[...phases],
  signatureObserved,statusEvents,authoredStatuses,authoredSpikes,
  localGuardOnlyProof:true,
  protectionObserved,cleansesObserved,
  interruptsObserved,guardRefreshObserved,wipes,sampleResults,
  noLiveRoutes:true,noSettlement:true,noSigils:true,live:false,
 }));
}
void main().catch(e=>{console.error(e);throw e;});
