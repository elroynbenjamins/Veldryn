/** V17 deterministic real-engine tactical effects and no-fabricated-cues QA. */
import {assert} from './test-assert';
import {CLASSES} from '../src/content/classes';
import {REGIONAL_COMBAT_FIXTURES,regionalCombatFixture} from '../src/core/regional-combat-fixtures';
import {GuildPveV12VerifiedActorLoader} from '../../../backend/online/guild-pve-verified-loader-v12';
import {GUILD_PVE_V7_PHASES,makeGuildPveReferenceV7,
 previewBrokenForgeAttemptV7,type GuildPvePhaseV7,type GuildPveBossV7}
 from '../../../backend/src/server/combat/guild-pve-broken-forge-v7';
import {
 previewGuildPveV17EffectfulAttempt,verifyGuildPveV17CueBindings,
 observedGuildPveV17Cues,type GuildPveV17ServerTactics,
} from '../../../backend/src/server/combat/guild-pve-effects-v17';
import {guildPveV13PhaseCues} from '../../../backend/src/server/combat/guild-pve-cues-v13';

const ACCOUNT='GX_V17_ACCOUNT',CHAR='GX_V17_CHAR',SEED='GX_V17_DETERMINISTIC';
const BASE=REGIONAL_COMBAT_FIXTURES.find(f=>f.regionId==='IRONWOOD')!;
const state=regionalCombatFixture({...BASE,tier:'T2',level:15},'prepared',CLASSES[0].id);
state.character={...state.character!,id:CHAR};
const reference=makeGuildPveReferenceV7('T2',{attack:1000,defense:650,maxHp:4500});
const empty:GuildPveV17ServerTactics={
 clearedNodes:{'C1-01':true},pressure:0,shrineChoice:null,
 protectionCharges:0,cleanseCharges:0,insightCharges:0,
};
const path={
 'C1-01':true,'C1-04':true,'C1-06':true,
 'C2-01':true,'C2-02':true,'C2-03':true,'C2-05':true,'C2-06':true,
 'C3-01':true,'C3-04':true,'C3-05':true,
};
const actorLoader=new GuildPveV12VerifiedActorLoader({
 async readOwnedState(){return{
  ownerAccountId:ACCOUNT,characterId:CHAR,revision:7,state,
 }}
});
async function main(){
 const actor=(await actorLoader.resolveOwnedActor(ACCOUNT,CHAR)).actor;
 const calc=(boss:GuildPveBossV7,phase:GuildPvePhaseV7,
  tactics:GuildPveV17ServerTactics=empty,stance:'Assault'|'Guard'|'Rally'='Assault',
 )=>previewGuildPveV17EffectfulAttempt({
  player:actor,boss,phase,difficulty:'Scout',reference,stance,
  seed:SEED,tactics,
 });
 assert.equal(verifyGuildPveV17CueBindings(),12);
 let tested=0;
 for(const boss of ['gatekeeper','seer','warden'] as const){
  for(const phase of GUILD_PVE_V7_PHASES[boss]){
   const first=calc(boss,phase),second=calc(boss,phase);
   assert.deepEqual(second,first);
   assert.equal(first.deterministicEvidenceHash.length,64);
   assert.equal(first.rewardMinted,false);
   assert.equal(first.serverPersisted,false);
   assert.equal(first.inventorySpent,false);
   assert.ok(first.bossHpRemoved>=0);
   const expected=new Set(guildPveV13PhaseCues({
    boss,phase,difficulty:'Scout',
   }).map(c=>c.id));
   const pending=new Set<string>();
   for(const cue of first.observedCues){
    assert.ok(expected.has(cue.id));
    if(cue.kind==='warning')pending.add(cue.abilityId);
    if(cue.kind==='resolve'){
     assert.ok(pending.has(cue.abilityId),'unwarned resolve');
     pending.delete(cue.abilityId);
    }
   }
   tested++;
  }
 }
 assert.equal(tested,9);
 // V17 does not drift from V7 when its modifiers are off.
 for(const phase of ['iron_skin','open_gate'] as const){
  const v7=previewBrokenForgeAttemptV7({
   player:actor,boss:'gatekeeper',phase,stance:'Assault',
   difficulty:'Scout',seed:SEED,reference,
  });
  const v17=calc('gatekeeper',phase);
  assert.equal(v7.bossHpRemoved,v17.bossHpRemoved);
  assert.equal(v7.rawPlayerDamage,v17.rawPlayerDamage);
  assert.equal(v7.effectiveHealing,v17.effectiveHealing);
  assert.equal(v7.playerHpLost,v17.playerHpLost);
 }
 const pressured=calc('warden','exposed_core',{
  ...empty,clearedNodes:path,pressure:100,
 });
 assert.ok(pressured.appliedTactics.includes('pressure_attack_risk'));
 assert.ok(pressured.appliedTactics.includes('gatekeeper_armour_proxy'));
 assert.ok(pressured.appliedTactics.includes('armoury_armour_proxy'));
 assert.ok(pressured.appliedTactics.includes('seer_affliction_cooldown'));
 assert.ok(pressured.appliedTactics.includes('stabilizer_detonation_reduction'));
 assert.ok(pressured.appliedTactics.includes('elite_exposed_window_proxy'));
 assert.ok(pressured.observedCues.every(c=>c.id.startsWith('warden.exposed_core.')));
 const protectedFight=calc('seer','curse_web',{
  ...empty,clearedNodes:path,protectionCharges:1,
 });
 assert.ok(protectedFight.appliedTactics.includes('rescue_protection_shield'));
 assert.equal(protectedFight.proposedChargeUses.protection,1);
 const shrineFight=calc('warden','exposed_core',{
  ...empty,clearedNodes:{...path,'C2-04':true},
  shrineChoice:'insight',insightCharges:1,
 });
 assert.ok(shrineFight.appliedTactics.includes('shrine_exposed_insight'));
 assert.equal(shrineFight.proposedChargeUses.insight,1);
 const noCharge=calc('warden','exposed_core',{
  ...empty,clearedNodes:{...path,'C2-04':true},
  shrineChoice:'insight',insightCharges:0,
 });
 assert.equal(noCharge.proposedChargeUses.insight,0);
 assert.ok(!noCharge.appliedTactics.includes('shrine_exposed_insight'));
 const cleanse=calc('seer','ash_veil',{
  ...empty,clearedNodes:{...path,'C2-04':true},shrineChoice:'cleansing',
  cleanseCharges:1,
 });
 assert.ok(cleanse.appliedTactics.includes('shrine_cleanse'));
 assert.ok([0,1].includes(cleanse.proposedChargeUses.cleanse));
 function rejection(run:()=>unknown,code:string){
  let thrown='';try{run()}catch(e){thrown=String(e)}
  assert.ok(thrown.includes(code),'Expected '+code+', got '+thrown);
 }
 rejection(()=>calc('seer','ash_veil',{
  ...empty,clearedNodes:{'C1-01':true,'C3-04':true},
 }), 'forged_objective_path');
 rejection(()=>calc('seer','ash_veil',{
  ...empty,shrineChoice:'warding',
 }), 'shrine_out_of_sync');
 rejection(()=>calc('seer','ash_veil',{
  ...empty,protectionCharges:1,
 }), 'orphan_protection_charge');
 rejection(()=>calc('seer','ash_veil',{
  ...empty,pressure:101,
 }), 'invalid_tactics');
 rejection(()=>calc('seer','ash_veil',{
  ...empty,clearedNodes:{...empty.clearedNodes,'BAD_NODE':true},
 }), 'unknown_or_invalid_node');
 rejection(()=>calc('seer','iron_skin' as GuildPvePhaseV7), 'invalid_encounter');
 rejection(()=>observedGuildPveV17Cues({
  boss:'seer',phase:'ash_veil',enemyId:'GX_seer_ash_veil',
  events:[{atMs:1,type:'cast_complete',actorId:'GX_seer_ash_veil',abilityId:'GX_SEER_ASH'}],
 }), 'resolve_without_cast');
 rejection(()=>observedGuildPveV17Cues({
  boss:'seer',phase:'ash_veil',enemyId:'GX_seer_ash_veil',
  events:[{atMs:1,type:'cast_start',actorId:'GX_seer_ash_veil',abilityId:'GX_SEER_ASH'},
   {atMs:1,type:'cast_start',actorId:'GX_seer_ash_veil',abilityId:'GX_SEER_ASH'}],
 }), 'duplicate_cast_start');
 console.log('V17: 9 phases, 12 grounded telegraph mappings, bounded tactics, real combat and no-payout QA passed');
}
main().catch(e=>{console.error(e);process.exitCode=1});
