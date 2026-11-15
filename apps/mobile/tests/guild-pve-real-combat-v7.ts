/**
 * Guild PvE V7: 1,944 deterministic phase-local REAL engine fights.
 * Current co-op loadout resolver, all 9 classes, T1-T4 source equipment,
 * 3 bosses x 3 phases x 3 stances x 2 seeds. Synthetic fixtures only.
 *
 * No rewards, guild data reads, production routing or database writes.
 */
import {assert} from './test-assert';
import {CLASSES} from '../src/content/classes';
import {regionalCombatFixture,REGIONAL_COMBAT_FIXTURES,type RegionalCombatFixtureDef} from '../src/core/regional-combat-fixtures';
import {deriveOnlineCoopLoadout} from '../../../backend/online/coop-loadout';
import {verifyPartyEventEquippedCopyOwnershipV4} from '../../../backend/online/party-event-loadout-v4';
import {deriveRole} from '../../../backend/src/server/coop/role-readiness';
import {combatantFromVerifiedSnapshot} from '../../../backend/src/server/combat/snapshot-adapter';
import type {CombatantDefinition} from '../../../backend/src/server/combat/types';
import {
 GUILD_PVE_V7_BOSSES,GUILD_PVE_V7_PHASES,
 makeGuildPveReferenceV7,verifyGuildPveReferenceV7,
 draftBrokenForgeGuardianV7,previewBrokenForgeAttemptV7,
 type GuildPveTierV7,type GuildPveStanceV7,type GuildPvePreviewV7,
} from '../../../backend/src/server/combat/guild-pve-broken-forge-v7';

type TierDef={tier:GuildPveTierV7;def:RegionalCombatFixtureDef};
const get=(id:string)=>REGIONAL_COMBAT_FIXTURES.find(r=>r.regionId===id)!;
const TIERS:TierDef[]=[
 {tier:'T1',def:{...get('GREENFIELDS'),tier:'T1',level:8}},
 {tier:'T2',def:{...get('IRONWOOD'),tier:'T2',level:15}},
 {tier:'T3',def:{...get('SUNSCAR'),tier:'T3',level:29}},
 {tier:'T4',def:{...get('SUNSCAR'),tier:'T4',level:40}},
];
const STANCES:GuildPveStanceV7[]=['Assault','Guard','Rally'];
const sum=(a:number[])=>a.reduce((p,n)=>p+n,0);
const mean=(a:number[])=>sum(a)/a.length;
const round=(a:number)=>Number(a.toFixed(2));
const expectThrow=(fn:()=>unknown,needle:string)=>{
 let threw=false;try{fn();}catch(e){threw=String(e).includes(needle);}
 assert.ok(threw,'expected '+needle);
};
const actors=new Map<string,CombatantDefinition>();
let verifiedSnapshots=0;
for(const {tier,def} of TIERS)for(const cls of CLASSES){
 const state=regionalCombatFixture(def,'prepared',cls.id);
 state.character={...state.character!,id:'GXV7_'+tier+'_'+cls.id};
 verifyPartyEventEquippedCopyOwnershipV4(state);
 const loadout=deriveOnlineCoopLoadout('GXV7_SYNTH_OWNER_'+tier+'_'+cls.id,state,1);
 assert.equal(loadout.legalEquipment,true);
 assert.ok(Number.isFinite(loadout.combatPower));
 assert.equal(loadout.characterId,'GXV7_'+tier+'_'+cls.id);
 const actor=combatantFromVerifiedSnapshot({
  ...loadout.stats,role:deriveRole(cls.id),
  level:loadout.combatScalingLevel??loadout.characterLevel,
 },loadout.abilities);
 assert.equal(actor.role,cls.role.toLowerCase());
 assert.ok(actor.stats.attackPower>0&&actor.stats.maxHp>0);
 actors.set(tier+':'+cls.id,actor);verifiedSnapshots++;
}
assert.equal(verifiedSnapshots,36);

const references=new Map<GuildPveTierV7,ReturnType<typeof makeGuildPveReferenceV7>>();
for(const {tier} of TIERS){
 const cohort=CLASSES.map(c=>actors.get(tier+':'+c.id)!);
 references.set(tier,makeGuildPveReferenceV7(tier,{
  attack:mean(cohort.map(x=>x.stats.attackPower)),
  defense:mean(cohort.map(x=>x.stats.defense)),
  maxHp:mean(cohort.map(x=>x.stats.maxHp)),
 }));
}
const t2=references.get('T2')!;
verifyGuildPveReferenceV7(t2);
expectThrow(()=>verifyGuildPveReferenceV7({...t2,attack:t2.attack*1.3}),'reference_tampered');
expectThrow(()=>makeGuildPveReferenceV7('T2',{attack:0,defense:1,maxHp:1}),'invalid_reference');
expectThrow(()=>draftBrokenForgeGuardianV7({
 boss:'seer',phase:'iron_skin',difficulty:'Scout',reference:t2,
}),'invalid_boss_or_phase');
const player=actors.get('T2:IRONWARDEN')!;
const replayInput={
 player,boss:'gatekeeper' as const,phase:'iron_skin' as const,
 difficulty:'Scout' as const,reference:t2,stance:'Assault' as const,
 seed:'GXV7_DETERMINISM_1',
};
assert.deepEqual(previewBrokenForgeAttemptV7(replayInput),previewBrokenForgeAttemptV7(replayInput),
 'replaying the same frozen preview must be deterministic');
expectThrow(()=>previewBrokenForgeAttemptV7({...replayInput,seed:''}),'invalid_seed');
const stats=['bossHpRemoved','rawPlayerDamage','playerHpLost','effectiveHealing','shieldAbsorbed','reelEvents'] as const;
const allResults:GuildPvePreviewV7[]=[];
let total=0,nonzeroBossDamage=0,withCastWarning=0,withHeals=0,withCleanses=0,withShieldAbsorbed=0;
const summary=[] as Array<{
 tier:GuildPveTierV7;boss:string;phase:string;fights:number;
 positiveDamage:number;downed:number;meanBossHpRemoved:number;
 meanDamageTaken:number;meanEffectiveHeal:number;meanShieldAbsorbed:number;
 castWarningFights:number;realCleanseFights:number;
 assaultDamage:number;guardDamage:number;rallyDamage:number;
 classZeroDamageProfiles:number;
}>;
for(const {tier} of TIERS){
 const reference=references.get(tier)!;
 for(const boss of GUILD_PVE_V7_BOSSES)for(const phase of GUILD_PVE_V7_PHASES[boss]){
  const result:GuildPvePreviewV7[]=[];
  for(const cls of CLASSES)for(const stance of STANCES)for(let i=0;i<2;i++){
   const actor=actors.get(tier+':'+cls.id)!;
   const fight=previewBrokenForgeAttemptV7({
    player:actor,boss,phase,difficulty:'Scout',reference,stance,
    seed:'GXV7:'+tier+':'+boss+':'+phase+':'+cls.id+':'+stance+':'+i,
   });
   for(const key of stats)assert.ok(Number.isFinite(fight[key])&&fight[key]>=0,'invalid measured '+key);
   assert.equal(fight.classId,cls.id);
   assert.equal(fight.tier,tier);
   assert.equal(fight.rewardGranted,false);
   assert.equal(fight.sealSpent,false);
   assert.equal(fight.serverPersisted,false);
   assert.ok(fight.durationMs<=18000);
   assert.ok(fight.bossHpRemoved<=draftBrokenForgeGuardianV7({
    boss,phase,reference,difficulty:'Scout'}).stats.maxHp+0.01);
   if(fight.bossHpRemoved>0)nonzeroBossDamage++;
   if(fight.castWarnings>0)withCastWarning++;
   if(fight.effectiveHealing>0)withHeals++;
   if(fight.cleanseEvents>0)withCleanses++;
   if(fight.shieldAbsorbed>0)withShieldAbsorbed++;
   result.push(fight);allResults.push(fight);total++;
  }
  assert.equal(result.length,54);
  const byStance=(stance:GuildPveStanceV7)=>mean(result.filter(r=>r.stance===stance).map(r=>r.bossHpRemoved));
  summary.push({
   tier,boss,phase,fights:result.length,
   positiveDamage:result.filter(r=>r.bossHpRemoved>0).length,
   downed:result.filter(r=>!r.survived).length,
   meanBossHpRemoved:round(mean(result.map(r=>r.bossHpRemoved))),
   meanDamageTaken:round(mean(result.map(r=>r.playerHpLost))),
   meanEffectiveHeal:round(mean(result.map(r=>r.effectiveHealing))),
   meanShieldAbsorbed:round(mean(result.map(r=>r.shieldAbsorbed))),
   castWarningFights:result.filter(r=>r.castWarnings>0).length,
   realCleanseFights:result.filter(r=>r.cleanseEvents>0).length,
   assaultDamage:round(byStance('Assault')),
   guardDamage:round(byStance('Guard')),
   rallyDamage:round(byStance('Rally')),
   classZeroDamageProfiles:CLASSES.filter(c=>result.filter(r=>r.classId===c.id&&r.stance==='Assault')
    .every(r=>r.bossHpRemoved===0)).length,
  });
 }
}
assert.equal(total,1944);
assert.equal(summary.length,36);
assert.ok(nonzeroBossDamage>0);
assert.ok(withCastWarning>0);
console.log('GUILD_PVE_V7_METADATA='+JSON.stringify({
 source:'real Veldryn co-op class/gear/companion eligibility pipeline; synthetic fixtures',
 realEngine:true,actualPlayerAccounts:false,sourceDerivedLoadouts:verifiedSnapshots,
 guildHpPersistence:false,globalBossBalancing:false,
 phases:9,guardianBosses:3,tiers:4,stances:3,seedsPerProfile:2,classBreakdowns:108,
 battles:total,positiveDamageBattles:nonzeroBossDamage,
 withCastWarning,withHeals,withCleanses,withShieldAbsorbed,
 rewardGranted:0,serverStateWrites:0,liveFeatureEnabled:false,
}));
for(const row of summary)console.log('GUILD_PVE_V7_COHORT='+JSON.stringify(row));
for(const {tier} of TIERS)for(const cls of CLASSES)for(const stance of STANCES){
 const a=allResults.filter(x=>x.tier===tier&&x.classId===cls.id&&x.stance===stance);
 assert.equal(a.length,18,'per-class samples cover 3 bosses x 3 phases x 2 seeds');
 console.log('GUILD_PVE_V7_CLASS='+JSON.stringify({
  tier,classId:cls.id,role:cls.role,stance,fights:a.length,
  meanHpDamage:round(mean(a.map(x=>x.bossHpRemoved))),
  meanHpLost:round(mean(a.map(x=>x.playerHpLost))),
  meanHealing:round(mean(a.map(x=>x.effectiveHealing))),
  meanShieldAbsorbed:round(mean(a.map(x=>x.shieldAbsorbed))),
  downed:a.filter(x=>!x.survived).length,
  cleaned:a.filter(x=>x.cleanseEvents>0).length,
  warned:a.filter(x=>x.castWarnings>0).length,
 }));
}

