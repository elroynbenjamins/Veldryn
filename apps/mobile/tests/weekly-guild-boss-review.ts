import {assert} from './test-assert';
import {CLASSES} from '../src/content/classes';
import {regionalCombatFixture,REGIONAL_COMBAT_FIXTURES} from '../src/core/regional-combat-fixtures';
import {deriveOnlineCoopLoadout} from '../../../backend/online/coop-loadout';
import {verifyPartyEventEquippedCopyOwnershipV4} from '../../../backend/online/party-event-loadout-v4';
import {deriveRole} from '../../../backend/src/server/coop/role-readiness';
import {combatantFromVerifiedSnapshot} from '../../../backend/src/server/combat/snapshot-adapter';
import {previewWeeklyGuildCombat,weeklyGuildBossProfile,WEEKLY_GUILD_BOSSES,WEEKLY_GUILD_ENGINE_RELEASED,WEEKLY_GUILD_ATTEMPT_MS} from '../../../backend/src/server/combat/weekly-guild-boss-review';
assert.equal(WEEKLY_GUILD_ENGINE_RELEASED,false);
const fixture=REGIONAL_COMBAT_FIXTURES.find(r=>r.regionId==='IRONWOOD')!;
const actors=CLASSES.map(cls=>{
 const state=regionalCombatFixture({...fixture,tier:'T2',level:15},'prepared',cls.id);
 state.character={...state.character!,id:'WG_REVIEW_'+cls.id};
 verifyPartyEventEquippedCopyOwnershipV4(state);
 const loadout=deriveOnlineCoopLoadout('WG_SYNTH_'+cls.id,state,1);
 assert.equal(loadout.legalEquipment,true);
 return combatantFromVerifiedSnapshot({...loadout.stats,role:deriveRole(cls.id),level:loadout.combatScalingLevel??loadout.characterLevel},loadout.abilities);
});
assert.equal(actors.length,9);
const mean=(a:number[])=>a.reduce((x,y)=>x+y,0)/a.length;
const reference={attack:mean(actors.map(a=>a.stats.attackPower)),defense:mean(actors.map(a=>a.stats.defense)),maxHp:mean(actors.map(a=>a.stats.maxHp))};
const input={boss:WEEKLY_GUILD_BOSSES[0],reference,player:actors[0],seed:'WG_replay_001'};
const before=JSON.stringify(actors[0]);
assert.deepEqual(previewWeeklyGuildCombat(input),previewWeeklyGuildCombat(input));
assert.equal(JSON.stringify(actors[0]),before);
let battles=0;
for(const boss of WEEKLY_GUILD_BOSSES){
 const profile=weeklyGuildBossProfile(boss,reference);
 const results=actors.flatMap(player=>[0,1].map(seed=>previewWeeklyGuildCombat({boss,reference,player,seed:'WG_'+player.classId+'_'+seed})));
 for(const r of results){
  assert.ok(r.durationMs<=WEEKLY_GUILD_ATTEMPT_MS&&r.durationMs>=0);
  assert.ok(r.actualBossHpRemoved>=0&&r.actualBossHpRemoved<=profile.stats.maxHp);
  for(const metric of [r.rawDamage,r.damageTaken,r.effectiveHealing,r.shieldAbsorbed,r.interrupts,r.cleanses])assert.ok(Number.isFinite(metric)&&metric>=0);
  assert.equal(r.rewardGranted,false);assert.equal(r.attemptConsumed,false);assert.equal(r.sharedHpWritten,false);assert.equal(r.contribution,null);
  assert.ok(r.events.every(e=>e.atMs>=0&&e.atMs<=WEEKLY_GUILD_ATTEMPT_MS));
 }
 assert.ok(results.some(r=>r.bossCastWarnings>0),'boss must use actual cast events');
 assert.ok(results.some(r=>r.actualBossHpRemoved>0),'boss must take actual HP damage');
 for(const role of ['tank','damage','support']){
  const group=results.filter(r=>r.role===role);
  assert.ok(group.length>0);
  console.log('WEEKLY_GUILD_REVIEW '+JSON.stringify({boss,role,runs:group.length,meanHpRemoved:mean(group.map(r=>r.actualBossHpRemoved)),meanHeal:mean(group.map(r=>r.effectiveHealing)),meanShieldAbsorbed:mean(group.map(r=>r.shieldAbsorbed)),meanSurvivalMs:mean(group.map(r=>r.durationMs)),cleanses:group.reduce((n,r)=>n+r.cleanses,0),interrupts:group.reduce((n,r)=>n+r.interrupts,0)}));
 }
 battles+=results.length;
}
assert.equal(battles,54);
let rejected=false;try{weeklyGuildBossProfile(WEEKLY_GUILD_BOSSES[0],{...reference,attack:0})}catch{rejected=true}assert.ok(rejected);
console.log('PASS 54 synthetic weekly guild shared-engine battles; no settlement');
