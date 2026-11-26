/** REVIEW-ONLY. Run with: node --test tools/frostfall-winter-hearth-2026-rules.test.mjs */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  WINTER_HEARTH_LOG_IDS, WINTER_HEARTH_GOALS, WINTER_HEARTH_LIGHT_ID,
  WINTER_HEARTH_LIGHT_RECIPE, WINTER_HEARTH_LIGHT_RECIPES, WINTER_HEARTH_MILESTONES,
  winterHearthWeekStartUtc, winterHearthActive, winterHearthTrackForItem,
  winterHearthMilestoneStatus, winterHearthDonationQuote, winterHearthCurrentBuffs,
} from './frostfall-winter-hearth-2026-rules.mjs';

const active = Date.parse('2026-12-15T12:00:00Z');
function quote(overrides = {}) {
  return winterHearthDonationQuote({
    nowMs: active, eventEnabled: true, projectEnabled: true, currentGuildMember: true,
    itemId: 'GREENWOOD_LOG', quantity: 1, guildProgress: { logs: 0, lights: 0 },
    accountWeekDonated: { logs: 0, lights: 0 }, ownedQuantity: 10000, ...overrides,
  });
}

test('accept only the six existing authored woodcutting item IDs and crafted lights', () => {
  assert.equal(WINTER_HEARTH_LOG_IDS.length, 6);
  for (const id of WINTER_HEARTH_LOG_IDS) assert.equal(winterHearthTrackForItem(id), 'logs');
  assert.equal(winterHearthTrackForItem(WINTER_HEARTH_LIGHT_ID), 'lights');
  for (const id of ['COPPER_ORE','FROSTIRON','FAKE_LOG','COPPER_INGOT','FROSTFALL_WISP_GLOW_2026'])
    assert.equal(winterHearthTrackForItem(id), null);
});
test('both professions craft the same five lights using existing resources', () => {
  assert.equal(WINTER_HEARTH_LIGHT_RECIPE.level, 4);
  assert.equal(WINTER_HEARTH_LIGHT_RECIPE.output.quantity, 5);
  for(const [skill,primary] of [['smithing','COPPER_ORE'],['tailoring','MOSS_FIBER']]) { const r=WINTER_HEARTH_LIGHT_RECIPES[skill]; assert.deepEqual(r.inputs,[{itemId:primary,quantity:8},{itemId:'DEWLEAF',quantity:4},{itemId:'WISP_DUST',quantity:1}]); assert.deepEqual(r.output,WINTER_HEARTH_LIGHT_RECIPE.output); assert.equal(r.level,4); assert.equal(r.gold,30); assert.equal(r.xp,35); }
  assert.equal(500 * WINTER_HEARTH_LIGHT_RECIPE.output.quantity, WINTER_HEARTH_GOALS.lights);
});
test('Monday 00:00 UTC resets account-wide weekly donation allowance', () => {
  assert.equal(winterHearthWeekStartUtc(Date.parse('2026-12-03T00:00:00Z')), '2026-11-30');
  assert.equal(winterHearthWeekStartUtc(Date.parse('2026-12-06T23:59:59Z')), '2026-11-30');
  assert.equal(winterHearthWeekStartUtc(Date.parse('2026-12-07T00:00:00Z')), '2026-12-07');
  assert.equal(winterHearthWeekStartUtc(Date.parse('2026-12-26T23:59:59Z')), '2026-12-21');
});
test('starts Dec 3, ends Dec 27 exactly; claim-only days cannot donate', () => {
  assert.equal(winterHearthActive(Date.parse('2026-12-02T23:59:59.999Z')), false);
  assert.equal(winterHearthActive(Date.parse('2026-12-03T00:00:00Z')), true);
  assert.equal(winterHearthActive(Date.parse('2026-12-26T23:59:59.999Z')), true);
  assert.equal(winterHearthActive(Date.parse('2026-12-27T00:00:00Z')), false);
  assert.equal(quote({ nowMs: Date.parse('2026-12-27T00:00:00Z') }).reason, 'event-disabled-or-closed');
  assert.equal(quote({ eventEnabled: false }).ok, false);
  assert.equal(quote({ projectEnabled: false }).ok, false);
});
test('both tracks independently required at each exact milestone', () => {
  for (const row of WINTER_HEARTH_MILESTONES) {
    const full = winterHearthMilestoneStatus({ logs: row.logs, lights: row.lights });
    assert.equal(full.reachedPercent, row.percent);
    assert.equal(winterHearthMilestoneStatus({ logs: row.logs - 1, lights: row.lights }).reachedPercent < row.percent, true);
    assert.equal(winterHearthMilestoneStatus({ logs: row.logs, lights: row.lights - 1 }).reachedPercent < row.percent, true);
  }
  assert.equal(winterHearthMilestoneStatus({ logs: 25000, lights: 0 }).reachedPercent, 0);
  assert.equal(winterHearthMilestoneStatus({ logs: 0, lights: 2500 }).reachedPercent, 0);
});
test('double milestone rewards pay total guild gold exactly 110k and buffs replace, never stack', () => {
  assert.deepEqual(WINTER_HEARTH_MILESTONES.map(x => x.guildGold), [10000,20000,30000,50000]);
  assert.deepEqual(WINTER_HEARTH_MILESTONES.map(x => x.gatheringSpeedBps), [400,400,400,1000]);
  assert.deepEqual(WINTER_HEARTH_MILESTONES.map(x => x.skillXpBps), [0,600,600,1000]);
  assert.deepEqual(WINTER_HEARTH_MILESTONES.map(x => x.combatXpBps), [0,0,600,1000]);
  const full = winterHearthMilestoneStatus({ logs: 25000, lights: 2500 });
  assert.equal(full.totalGuildGold, 110000);
  assert.deepEqual(full.buffs, { gatheringSpeedBps: 1000, skillXpBps: 1000, combatXpBps: 1000 });
  assert.equal(full.permanentColorEarned, true);
});
test('per-member cap independent for logs and lights; reject overcap, overgoal, missing inventory and nonmembers', () => {
  assert.equal(quote({quantity: 2500}).ok, true);
  assert.equal(quote({quantity: 2501}).reason, 'weekly-member-cap');
  assert.equal(quote({quantity: 1, accountWeekDonated:{ logs: 2500, lights: 0 }}).reason, 'weekly-member-cap');
  assert.equal(quote({itemId: WINTER_HEARTH_LIGHT_ID, quantity: 250}).ok, true);
  assert.equal(quote({itemId: WINTER_HEARTH_LIGHT_ID, quantity: 251}).reason, 'weekly-member-cap');
  assert.equal(quote({guildProgress: { logs:25000, lights:100 }, quantity:1}).reason, 'guild-track-full');
  assert.equal(quote({ownedQuantity: 0}).reason, 'insufficient-owned-items');
  assert.equal(quote({currentGuildMember:false}).reason, 'not-guild-member');
  assert.equal(quote({itemId:'FAKE_LOG'}).reason, 'invalid-donation-item');
  for (const quantity of [0,-1,1.25,NaN,Infinity,Number.MAX_SAFE_INTEGER+1])
    assert.equal(quote({quantity}).reason, 'invalid-quantity');
});
test('last log at full lighting unlocks 100% once without overcount', () => {
  const q = quote({ guildProgress: {logs:24999, lights:2500} });
  assert.equal(q.ok, true);
  assert.deepEqual(q.newlyReachedMilestones, [100]);
  assert.equal(q.newMilestoneTotalGuildGold, 50000);
  assert.equal(q.newPermanentColor, true);
  assert.equal(quote({ guildProgress:{logs:25000, lights:2500} }).ok, false);
});
test('no XP or speed buff outside event or after leaving guild', () => {
  const full = {logs:25000, lights:2500};
  assert.equal(winterHearthCurrentBuffs(full, active, true).combatXpBps, 1000);
  assert.equal(winterHearthCurrentBuffs(full, active, false).combatXpBps, 0);
  assert.equal(winterHearthCurrentBuffs(full, Date.parse('2026-12-27T00:00:00Z'), true).skillXpBps, 0);
});
test('at least three accounts needed to satisfy both fixed tracks in four UTC weeks', () => {
  const windows = 4;
  assert.equal(2 * windows * 2500 < WINTER_HEARTH_GOALS.logs, true);
  assert.equal(2 * windows * 250 < WINTER_HEARTH_GOALS.lights, true);
  assert.equal(3 * windows * 2500 >= WINTER_HEARTH_GOALS.logs, true);
  assert.equal(3 * windows * 250 >= WINTER_HEARTH_GOALS.lights, true);
});

test('Frostfall cosmetic unlocks follow BOTH tracks and never replace previously earned cosmetics',()=>{
 const ids=(logs,lights)=>winterHearthMilestoneStatus({logs,lights}).earnedCosmeticIds;
 assert.deepEqual(ids(12500,1249),[]);
 assert.deepEqual(ids(12500,1250),['background_frostfall_winter_aurora_2026']);
 assert.deepEqual(ids(18750,1875),['background_frostfall_winter_aurora_2026','banner_frostfall_standard_2026']);
 assert.deepEqual(ids(25000,2500),['background_frostfall_winter_aurora_2026','banner_frostfall_standard_2026','border_frostfall_frozen_majesty_2026','name_frostfall_aurora_2026']);
 const q=quote({guildProgress:{logs:24999,lights:2500},quantity:1});
 assert.deepEqual(q.newCosmeticIds,['border_frostfall_frozen_majesty_2026','name_frostfall_aurora_2026']);
});
test('another annual event uses its own collection and rejects duplicate cosmetic IDs',async()=>{
 const {FROSTFALL_2026_GUILD_COSMETICS,guildEventCosmeticsAtMilestones}=await import('./guild-event-cosmetic-review.mjs');
 const future={id:'background_heartbond_2027',kind:'background',milestone:50,eventId:'heartbond_2027'};
 const catalog=[...FROSTFALL_2026_GUILD_COSMETICS,future];
 assert.deepEqual(guildEventCosmeticsAtMilestones(catalog,'heartbond_2027',[25,50,75,100]),[future.id]);
 assert.deepEqual(guildEventCosmeticsAtMilestones(catalog,'heartbond_2027',[25]),[]);
 assert.throws(()=>guildEventCosmeticsAtMilestones([...catalog,future],'heartbond_2027',[50]),TypeError);
});
