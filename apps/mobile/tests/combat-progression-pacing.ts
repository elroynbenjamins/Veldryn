import {assert} from './test-assert';
import {characterCombatXpScale} from '../src/core/combat-progression-pacing';
import {characterTotalXpAtLevel} from '../src/core/progression';
import {REGIONAL_COMBAT_FIXTURES,regionalCombatFixture} from '../src/core/regional-combat-fixtures';
import {activeCombatRuntimeProjection,claimActivity,combatSustainProjection,effectiveStats,previewActivityReward,startCombat} from '../src/core/game';
import {combatBaselineProjection} from '../src/core/balance-projection';
import {activityRate} from '../src/core/dashboard';
import {MONSTERS} from '../src/content/monsters';
import {CLASSES} from '../src/content/classes';
import {characterPermanentMultipliers} from '../src/core/permanent-boosts';
import {environmentEffectForActivity} from '../src/core/world-weather';
import {huntMomentumBonus} from '../src/core/hunt-goals';
import {championBonus} from '../src/core/hunt-champions';
import {itemDef} from '../src/content/items';

assert.equal(characterCombatXpScale(1),1,'starter onboarding retains its XP');
assert.equal(characterCombatXpScale(3),1);
assert.equal(characterCombatXpScale(4),.85);
assert.equal(characterCombatXpScale(7),.75);
assert.equal(characterCombatXpScale(10),.6);
assert.equal(characterCombatXpScale(100),.6);
assert.equal(characterCombatXpScale(25,true),1,'boss payouts are separate from ordinary-hunt pacing');
assert.equal(characterTotalXpAtLevel(17),300792,'existing XP thresholds must not move or demote players');
assert.equal(itemDef('COOKED_MEADOW_PERCH').heal,24,'food healing stays intact');
assert.equal(itemDef('ROASTED_ROOTSTREAM_TROUT').heal,40);

const T=1_000_000,H=3_600_000,monster=MONSTERS.find(row=>row.id==='ANCIENT_TREANT')!;
const rows=[];
for(const cls of CLASSES){
 let state=regionalCombatFixture(REGIONAL_COMBAT_FIXTURES.find(row=>row.regionId==='IRONWOOD')!,'prepared',cls.id);
 state={...state,character:{...state.character!,level:17,xp:characterTotalXpAtLevel(17),equippedCombatCompanionId:undefined},inventory:{...state.inventory,stacks:[{itemId:'ROASTED_ROOTSTREAM_TROUT',quantity:200}]}};
 state.character!.currentHp=effectiveStats(state).hp;
 state=startCombat(state,monster.id,T);
 const reward=previewActivityReward(state,T+4*H),pace=activeCombatRuntimeProjection(state)!,effect=environmentEffectForActivity(state.activity!).effect,multiplier=characterPermanentMultipliers(state).characterXpMultiplier;
 const unpacedXp=monster.xp*effect.xpMultiplier*multiplier;
 const oldXpForSameKills=Math.floor(reward.kills*unpacedXp)+huntMomentumBonus(unpacedXp,0,reward.kills)+championBonus(Math.floor(unpacedXp),0,reward.championEncounters?.count??0).xp;
 assert.ok(reward.xp/oldXpForSameKills>.58&&reward.xp/oldXpForSameKills<.62,cls.id+' ordinary combat should award about 60% of prior character XP for equal kills');
 assert.ok((reward.foodConsumed??0)>=12,cls.id+' four-hour unattended hunts must make a meaningful dent in cooked food');
 assert.ok((reward.foodConsumed??0)<50,cls.id+' food demand must remain practical for an offline session');
 assert.ok(pace.xpPerHour>0&&activityRate(state).xpPerHour>0);
 assert.ok(Math.abs(pace.xpPerHour/pace.killsPerHour-unpacedXp*.6)<1e-6,'live combat ETA uses the same pace as settlement');
 const settled=claimActivity(state,T+4*H);
 assert.ok(settled.state.character!.level>=17,'balance changes preserve earned levels');
 assert.equal(settled.state.inventory.stacks.find(row=>row.itemId==='ROASTED_ROOTSTREAM_TROUT')!.quantity,200-(settled.reward.foodConsumed??0));
 rows.push({classId:cls.id,foodPerHour:Number(combatSustainProjection(state,monster.id)!.foodPerHour.toFixed(2)),foodUsed4h:reward.foodConsumed,xp4h:reward.xp,priorXpSameKills:oldXpForSameKills});
}
const baseline=combatBaselineProjection(monster);
assert.ok(Math.abs(baseline.xpPerHour/baseline.killsPerHour-monster.xp*.6)<1e-6,'base target estimates include the character-XP pace');
console.log(JSON.stringify({status:'PASS',rows},null,2));
