import assert from 'node:assert/strict';
import {possibleDungeonCompanionCounters} from '../dungeon-companion-preview';
import {dungeonCompanionCounterOptions,dungeonCompanionOpportunity,type DungeonCompanionCounterId} from '../dungeon-companion-counters';
import {COOP_ROUTE_CONTENT} from '../../expeditions/content/coop-route-content';
import {EXPEDITIONS} from '../../expeditions/content/launch-content';
import {dungeonBossVariantsFor} from '../../expeditions/content/dungeon-boss-rotation';
import {EXPEDITION_ENCOUNTERS} from '../../combat/content/expedition-encounters';

assert.deepEqual(possibleDungeonCompanionCounters('UNRELEASED_UNKNOWN'),[]);
for(const dungeonId of ['EXP_001','EXP_003','EXP_004','EXP_005','EXP_006']){
 const possible=possibleDungeonCompanionCounters(dungeonId);
 const route=COOP_ROUTE_CONTENT[dungeonId],bossId=EXPEDITIONS[dungeonId].bossId;
 assert.ok(possible.length>0,`${dungeonId}: at least one combat counter must appear in the authored route`);
 assert.equal(new Set(possible).size,possible.length,`${dungeonId}: no duplicate counter hints`);
 const variants=dungeonBossVariantsFor(dungeonId);
 const encounters=[...route.battle,...route.elite,...(variants.length?variants.map(boss=>boss.bossId):[bossId])].map(id=>EXPEDITION_ENCOUNTERS[id]?.()).filter((x):x is NonNullable<typeof x>=>Boolean(x));
 for(const id of possible){
  assert.ok(encounters.some(enemies=>dungeonCompanionCounterOptions(enemies).includes(id)),`${dungeonId}: hint ${id} must be supported by an actual encounter`);
 }
 assert.deepEqual(possibleDungeonCompanionCounters(dungeonId),possible,'Preview ordering must be stable for cached entry and loadout');
}
const potential:readonly DungeonCompanionCounterId[]=['armor_break','spellbreak','bulwark','recovery','swarm_hunt','finisher'];
assert.equal(dungeonCompanionOpportunity('UNIT_005',potential),'spellbreak');
assert.equal(dungeonCompanionOpportunity('UNIT_015',potential),'bulwark');
assert.equal(dungeonCompanionOpportunity('UNIT_021',potential),'armor_break');
assert.equal(dungeonCompanionOpportunity('UNIT_001',potential),undefined,'No unsupported bonus for generic damage companion');
assert.equal(dungeonCompanionOpportunity('UNIT_005',['armor_break']),undefined,'Cannot recommend an absent matchup');
console.log('Dungeon companion possible-counter previews OK');
