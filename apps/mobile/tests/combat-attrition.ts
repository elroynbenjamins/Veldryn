import {assert} from './test-assert';
import {claimActivity,combatSustainProjection,effectiveStats,previewActivityReward} from '../src/core/game';
import {REGIONAL_COMBAT_FIXTURES,regionalCombatFixture} from '../src/core/regional-combat-fixtures';
import {equipCombatCompanion,unlockCombatCompanion} from '../src/core/combat-companions';
import {itemDef} from '../src/content/items';
import {CLASSES} from '../src/content/classes';
const T=Date.UTC(2026,9,1,12),H=3600000;
function fixture(index=0){
 const r=REGIONAL_COMBAT_FIXTURES[index],s=regionalCombatFixture(r,'prepared');
 s.activity={kind:'combat' as const,targetId:r.monsterId,combatTacticId:'balanced' as const,startedAtMs:T,lastClaimAtMs:T};
 s.character!.currentHp=effectiveStats(s).hp;s.inventory.stacks=[];return s;
}
for(const region of REGIONAL_COMBAT_FIXTURES)for(const cls of CLASSES)for(const prep of ['prepared','optimized'] as const){
 const s=regionalCombatFixture(region,prep,cls.id);
 for(const id of Object.values(s.character!.equipment))if(id)assert.ok((itemDef(id).requiredLevel??1)<=s.character!.level,'balance fixtures must equip legal items');
 assert.ok(Object.values(s.character!.equipment).filter(Boolean).length>=10,'fixtures must not silently lose high-tier equipment');
}
const s=fixture(),short=previewActivityReward(s,T+H/4),long=previewActivityReward(s,T+8*H);
assert.ok(short.endHp!<s.character!.currentHp&&!short.stoppedReason,'starter monsters should gradually injure a prepared player');
assert.ok(long.stoppedReason&&long.endHp===1,'unfed hunt must stop at injury');
const settled=claimActivity(s,T+H/4);
assert.ok(settled.state.character!.currentHp<s.character!.currentHp,'claiming must preserve lost HP');
assert.ok(settled.state.character!.level>=s.character!.level,'fixture XP must match its level');
assert.equal(claimActivity(settled.state,T+H/4).state.character!.currentHp,settled.state.character!.currentHp,'retry must not heal');
const stocked=fixture();stocked.inventory.stacks=[{itemId:REGIONAL_COMBAT_FIXTURES[0].foodId,quantity:100}];
assert.ok(!previewActivityReward(stocked,T+8*H).stoppedReason,'food should sustain prepared hunts');
stocked.inventory.stacks[0].quantity=1;
const depleted=previewActivityReward(stocked,T+8*H);
assert.equal(depleted.foodConsumed,1);assert.ok(depleted.stoppedReason,'running out of food must eventually stop combat');
let healer=equipCombatCompanion(unlockCombatCompanion(fixture(),'UNIT_003',T),'UNIT_003');
assert.ok(combatSustainProjection(healer,REGIONAL_COMBAT_FIXTURES[0].monsterId)!.netHpLossPerHour<combatSustainProjection(s,REGIONAL_COMBAT_FIXTURES[0].monsterId)!.netHpLossPerHour,'healer reduces attrition');
// High-level farming still drains an unhealed player; restorative support can offset easy fights.
const over=fixture(7);over.activity!.targetId=REGIONAL_COMBAT_FIXTURES[0].monsterId;
const p=combatSustainProjection(over,over.activity!.targetId)!;
assert.ok(p.estimatedUnfedHours<=12.500001&&p.netHpLossPerHour>=effectiveStats(over).hp*.08-1e-7);
assert.ok(previewActivityReward(over,T+H).endHp!<over.character!.currentHp);
let frequent=structuredClone(over);
for(let hour=1;hour<=24&&frequent.activity;hour++){
 const priorHp=frequent.character!.currentHp;
 frequent=claimActivity(JSON.parse(JSON.stringify(frequent)),T+hour*H).state;
 assert.ok(frequent.character!.currentHp<=priorHp,'hourly claims and save reloads must not grant free healing');
}
assert.ok(!frequent.activity,'overgeared unhealed players must eventually stop across claims');
healer=equipCombatCompanion(unlockCombatCompanion(over,'UNIT_003',T),'UNIT_003');
healer.account.combatCompanionProgress!['UNIT_003']={...healer.account.combatCompanionProgress!['UNIT_003'],level:60,ascensionTier:3,bondLevel:10,bondXp:100000,bondTraitUnlocked:true};
healer.character!.currentHp=effectiveStats(healer).hp;
const sustained=combatSustainProjection(healer,healer.activity!.targetId)!;
assert.equal(sustained.foodPerHour,0,'strong healer can sustain weak monsters without negative food forecasts');
const healed=previewActivityReward(healer,T+8*H);
assert.ok(!healed.stoppedReason&&healed.endHp!<=effectiveStats(healer).hp,'healing must never exceed max HP');
healer.character!.currentHp=.01;
assert.ok(previewActivityReward(healer,T+H).stoppedReason,'healer cannot rescue a lethal incoming hit');
console.log('PASS gradual attrition, legal gear fixtures, claim persistence, food depletion, healer sustain and lethal hits');
