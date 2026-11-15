/**
 * Hidden World Boss V24 regional 14-round account raid tests.
 * Five real V12-verified GameStates, no private Supabase or live event.
 */
import {assert} from './test-assert';
import {
 regionalCombatFixture,REGIONAL_COMBAT_FIXTURES,
} from '../src/core/regional-combat-fixtures';
import type {GameState,ClassId} from '../src/core/types';
import {resolveRealWorldBossSnapshotV12} from '../../../backend/online/world-boss-loadout-v12';
import {
 freezeWorldBossAccountRosterV22,
} from '../../../backend/src/server/combat/world-boss-account-raid-v22';
import {
 WORLD_BOSS_ROUND_SCRIPTS,validateWorldBossScripts,simulateWorldBossRounds,
 type WorldBossId,type WorldBossPhase,
} from '../../../backend/src/server/combat/world-boss-round-prototype';
import {
 simulateWorldBossAccountRaidV24,worldBossAccountPressureV24,
 WORLD_BOSS_V24_AUTHORED_ACCOUNT_RAID_LIVE,WORLD_BOSS_V24_ENGINE_VERSION,
 WORLD_BOSS_V24_MAX_ROUNDS,
} from '../../../backend/src/server/combat/world-boss-account-script-v24';
import {makeWorldBossEncounterProfileV13} from '../../../backend/src/server/combat/world-boss-encounter-profile-v13';
import {makeWorldBossWarCampSnapshotV11} from '../../../backend/src/server/combat/world-boss-war-camp-v11';

const EVENT='30000000-0000-4000-8000-000000000024';
const ACCOUNT='10000000-0000-4000-8000-000000000024';
const OTHER='10000000-0000-4000-8000-000000000025';
const NOW=Date.UTC(2026,10,21,8,3);
const classes:ClassId[]=['IRONWARDEN','DAWNKEEPER','WAYFINDER','RAVAGER','HEXWEAVER'];
const ids=classes.map((_,i)=>'20000000-0000-4000-8000-'+String(i+24).padStart(12,'0'));
const T2=REGIONAL_COMBAT_FIXTURES.find(x=>x.regionId==='IRONWOOD')!;
const phases:WorldBossPhase[]=['armored','exposed','enraged'];
const bosses:WorldBossId[]=['hollowroot','sunscar','frostmarch'];
const policy={version:'wb24-fixture-private',bounds:[2500,5000,10000,20000] as
 [number,number,number,number]};
const fail=(f:()=>unknown,part:string)=>{
 let message='';try{f()}catch(e){message=String(e)}
 assert.ok(message.includes(part),'expected '+part+' got '+message);
};
async function sourceRoster(){
 const states=new Map<string,GameState>();
 for(let i=0;i<5;i++){
  const state=regionalCombatFixture({...T2,level:25,tier:'T2'},'prepared',classes[i]);
  state.character={...state.character!,id:ids[i]};
  states.set(ids[i],state);
 }
 const verified=await Promise.all(ids.map(async characterId=>
  resolveRealWorldBossSnapshotV12({
   reader:{
    principalAccountId:ACCOUNT,
    async loadCharacterState({accountId,characterId:id}){
     assert.equal(accountId,ACCOUNT);assert.equal(id,characterId);
     return {ownerAccountId:ACCOUNT,serverState:structuredClone(states.get(id)!),
      gameVersion:3};
    },
   },characterId,expectedGameVersion:3,nowUtcMs:NOW,
   minimumCharacterLevel:1,policy,
  })
 ));
 return {roster:freezeWorldBossAccountRosterV22({
  accountId:ACCOUNT,atUtcMs:NOW,verified,
 }),verified};
}
async function main(){
 assert.equal(WORLD_BOSS_V24_AUTHORED_ACCOUNT_RAID_LIVE,false);
 assert.equal(WORLD_BOSS_V24_MAX_ROUNDS,14);
 assert.ok(WORLD_BOSS_V24_ENGINE_VERSION.includes('v24-scripted'));
 assert.equal(validateWorldBossScripts(),126,'3 bosses x 3 phases x 14 cues');
 assert.deepEqual([1,2,3,4,5].map(worldBossAccountPressureV24),
  [.7,.775,.85,.925,1]);
 fail(()=>worldBossAccountPressureV24(0),'invalid_raid_size');
 fail(()=>worldBossAccountPressureV24(6),'invalid_raid_size');
 const {roster,verified}=await sourceRoster();
 assert.equal(roster.characters.length,5);
 const camp=makeWorldBossWarCampSnapshotV11({
  eventId:EVENT,revision:7,
  levels:{fortifications:2,fieldProvisions:2,siegecraft:2},
 });
 const profiles=(boss:WorldBossId,phase:WorldBossPhase,attack=5)=>
  makeWorldBossEncounterProfileV13({
   eventId:EVENT,boss,phase,gearBand:2,
   configVersion:'wb24-offline-not-approved',attack,defense:240,guardMax:300,
  });
 const allResults:string[]=[];
 const rolesSeen=new Set<string>();
 for(const boss of bosses){
  for(const phase of phases){
   for(let count=1;count<=5;count++){
    const r=freezeWorldBossAccountRosterV22({
     accountId:ACCOUNT,atUtcMs:NOW,verified:verified.slice(0,count),
    });
    const args={
     eventId:EVENT,requestId:'WB24_ACCOUNT_RAID_001',
     roster:r,boss,phase,order:'break_armor' as const,
     serverSeed:'WB24_TRUSTED_TEST_SEED_123456789123456789',
     encounter:profiles(boss,phase),warCamp:camp,
    };
    const fight=simulateWorldBossAccountRaidV24(args);
    const repeat=simulateWorldBossAccountRaidV24(args);
    assert.deepEqual(fight,repeat,'offline replay must be deterministic');
    assert.equal(fight.rosterSize,count);
    assert.equal(fight.characterLedger.length,count);
    assert.equal(fight.roundEncounter.boss,boss);
    assert.equal(fight.roundEncounter.phase,phase);
    assert.equal(fight.roundEncounter.roundsCompleted,14,'low-pressure fixture must reach the full 14 rounds');
    assert.ok(fight.roundEncounter.events.some(x=>x.type==='telegraph'));
    assert.ok(fight.roundEncounter.events.some(x=>x.type==='battle_end'));
    assert.ok(fight.proposedWorldHpDamage<=fight.rawBossHpDamage);
    assert.ok(fight.proposedWorldHpDamage>=0);
    assert.ok(fight.localGuardDamage>=0);
    assert.equal(fight.persisted,false);
    assert.equal(fight.warCampDigest,camp.digest);
    assert.equal(fight.encounterDigest,args.encounter.digest);
    assert.equal(new Set(fight.characterLedger.map(x=>x.characterId)).size,count);
    for(const player of fight.characterLedger){
     assert.ok(player.guardDamage>=0&&player.effectiveHealing>=0);
     assert.ok(player.shieldConsumed>=0&&player.tankProtection>=0);
     rolesSeen.add(r.characters.find(c=>c.characterId===player.characterId)!.combatant.role);
    }
    // Every fight uses the REGION's original script cues, not generic V22
    // SWEEP/CAST. The first cue stays distinct across the three bosses.
    assert.equal(WORLD_BOSS_ROUND_SCRIPTS[boss][phase].length,14);
    const script=new Set(WORLD_BOSS_ROUND_SCRIPTS[boss][phase]);
    assert.ok(fight.roundEncounter.events.some(x=>
     (x.actorId==='HOLLOWROOT'||x.actorId==='SUNSCAR'||x.actorId==='FROSTMARCH')&&
     (script.has(x.abilityId)||x.abilityId==='BASIC')));
    allResults.push(boss+'/'+phase+'/'+count+'/'+fight.proposedWorldHpDamage);
   }
  }
 }
 assert.equal(allResults.length,45);
 assert.ok(rolesSeen.has('damage'));
 assert.ok(rolesSeen.has('tank'));
 assert.ok(rolesSeen.has('support'));

 // Explicitly exercise compositions that do NOT have the legacy Tank or
 // Support requirement, including a single Damage or Support character.
 const mixes:readonly {name:string;indices:readonly number[]}[]=[
  {name:'solo_damage',indices:[2]},
  {name:'solo_support',indices:[1]},
  {name:'no_tank_three_damage',indices:[2,3,4]},
  {name:'no_support_two',indices:[0,3]},
  {name:'support_and_damage',indices:[1,4]},
 ];
 for(const mix of mixes){
  const party=freezeWorldBossAccountRosterV22({
   accountId:ACCOUNT,atUtcMs:NOW,
   verified:mix.indices.map(i=>verified[i]),
  });
  const result=simulateWorldBossAccountRaidV24({
   eventId:EVENT,requestId:'WB24_'+mix.name.toUpperCase(),
   roster:party,boss:'sunscar',phase:'exposed',
   order:'steady_assault',
   serverSeed:'WB24_TRUSTED_MIXED_ROLE_SEED_123456789',
   encounter:profiles('sunscar','exposed'),warCamp:camp,
  });
  assert.equal(result.rosterSize,mix.indices.length);
  assert.equal(result.roundsCompleted,14);
  assert.ok(result.proposedWorldHpDamage>=0);
  assert.equal(result.characterLedger.length,mix.indices.length);
  assert.equal(new Set(result.characterLedger.map(x=>x.characterId)).size,
   mix.indices.length);
 }
 const zeroContribution=allResults.filter(x=>Number(x.split('/')[3])===0).length;

 // Legacy V6 stays restrictive; this relaxed mode needs explicit opt-in.
 fail(()=>simulateWorldBossRounds({
  seed:'WB24_TEST_SEED_LEGACY_REJECTION',
  boss:'hollowroot',phase:'armored',
  players:roster.characters.slice(0,1).map(x=>x.combatant),
  serverEncounterProfile:profiles('hollowroot','armored'),
 }), 'requires_four_players_and_seed');
 fail(()=>simulateWorldBossRounds({
  seed:'WB24_TEST_SEED_TOO_MANY',
  boss:'hollowroot',phase:'armored',accountRaidV24:true,
  players:Array.from({length:6},(_,i)=>({...roster.characters[0].combatant,id:'X'+i})),
  serverEncounterProfile:profiles('hollowroot','armored'),
 }), 'invalid_account_raid_size_or_seed');
 fail(()=>simulateWorldBossRounds({
  seed:'WB24_TEST_SEED_DUPLICATE',
  boss:'hollowroot',phase:'armored',accountRaidV24:true,
  players:[roster.characters[0].combatant,roster.characters[0].combatant],
  serverEncounterProfile:profiles('hollowroot','armored'),
 }), 'duplicate_account_character');

 const bad=freezeWorldBossAccountRosterV22({
  accountId:ACCOUNT,atUtcMs:NOW,verified:verified.slice(0,2),
 });
 const base={
  eventId:EVENT,requestId:'WB24_ACCOUNT_RAID_999',roster:bad,
  boss:'sunscar' as const,phase:'exposed' as const,order:'steady_assault' as const,
  encounter:profiles('sunscar','exposed'),
  warCamp:camp,serverSeed:'WB24_TRUSTED_TEST_SEED_123456789123456789',
 };
 const changed=structuredClone(bad);
 changed.characters[0].combatant.stats.attackPower*=100;
 fail(()=>simulateWorldBossAccountRaidV24({...base,roster:changed}),
  'frozen_roster_digest_mismatch');
 const replacedOwner=structuredClone(bad);
 replacedOwner.accountId=OTHER;
 fail(()=>simulateWorldBossAccountRaidV24({...base,roster:replacedOwner}),
  'frozen_roster_digest_mismatch');
 fail(()=>simulateWorldBossAccountRaidV24({
  ...base,encounter:profiles('hollowroot','exposed'),
 }), 'invalid_or_foreign_profile');
 fail(()=>simulateWorldBossAccountRaidV24({
  ...base,warCamp:{...camp,levels:{...camp.levels,siegecraft:0}},
 }), 'war_camp_digest_mismatch');
 const stress=simulateWorldBossAccountRaidV24({
  ...base,encounter:profiles('sunscar','exposed',2200),
 });
 assert.ok(stress.roundsCompleted>=1&&stress.roundsCompleted<=14);
 assert.ok(stress.characterLedger.every(x=>Number.isFinite(x.bossHpDamage)));
 console.log('WORLD_BOSS_V24_AUTHORED_ACCOUNT_RAID='+JSON.stringify({
  bosses:bosses.length,phases:phases.length,rosterSizes:[1,2,3,4,5],
  uniqueSimulations:allResults.length,extraMixes:mixes.length,
  zeroGlobalDamageFixtures:zeroContribution,authoredCues:126,
  includesRealTelegraphs:true,includesRealGuardianSupportDamage:true,
  deterministicFrozenReplay:true,
  oldFourRoleContractUnaffected:true,
  reservedSqlUnchanged:true,live:false,payouts:0,
 }));
}
void main().catch(e=>{console.error(e);throw e;});
