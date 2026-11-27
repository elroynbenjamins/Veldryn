import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {STORY_REVIEW_RELEASED,validateStoryBook,resolveStoryObjective,resolveGatheringSources} from './story-journal-2-review.mjs';
const read = path => readFileSync(new URL('../'+path,import.meta.url),'utf8');
const book = JSON.parse(read('docs/2-0/story-asterfall-review-v1.json'));
assert.equal(STORY_REVIEW_RELEASED,false);
assert.equal(validateStoryBook(book),true);
assert.equal(book.quests.length,15);
assert.deepEqual(book.quests.map(q=>q.legacyQuestId).sort(),Array.from({length:15},(_,i)=>'QST_'+String(i+1).padStart(3,'0')));
const monsters = read('apps/mobile/src/content/monsters.ts'), quests = read('apps/mobile/src/content/quests.ts'), skills = read('apps/mobile/src/content/skills.ts'), routes = read('apps/mobile/src/content/exploration.ts');
const contains = (text,id) => text.includes("id:'"+id+"'");
for (const q of book.quests) {
  assert.ok(contains(quests,q.legacyQuestId),q.legacyQuestId);
  for (const o of q.objectives) {
    if (o.kind==='kill'||o.kind==='boss') assert.ok(contains(monsters,o.targetId),o.targetId);
    if (o.kind==='map') assert.ok(contains(routes,o.targetId),o.targetId);
  }
}
for (const z of book.zones) {
  assert.ok(contains(routes,z.routeId),z.routeId);
  for (const target of z.gatheringExamples) assert.ok(contains(skills,target),target);
}
for (const p of book.optionalPaths) assert.ok(skills.includes("itemId:'"+p.resourceId+"'"),p.resourceId);
const q=book.quests[0],o=q.objectives[0],world=book.zones.map(z=>({zoneId:z.zoneId,regionId:'ASTERFALL',released:true}));
const catalog={world,enemies:[{id:o.targetId,zoneId:'GREENFIELDS',released:true}],routes:[],gathering:[]};
assert.equal(resolveStoryObjective(q,o,catalog).zoneId,'GREENFIELDS');
catalog.enemies[0].zoneId='OLD_MINES';
assert.equal(resolveStoryObjective(q,o,catalog).zoneId,'OLD_MINES');
assert.equal(resolveStoryObjective(q,o,catalog).authorizesAccess,false);
catalog.world.push({zoneId:'SUNSCAR',regionId:'SUNSCAR',areaId:'ZONE_006',released:true});
catalog.enemies[0]={id:o.targetId,zoneId:'SUNSCAR',areaId:'ZONE_006',released:true};
assert.equal(resolveStoryObjective(q,o,catalog).reason,'regional_story_review_required');
catalog.enemies[0].released=false;
assert.equal(resolveStoryObjective(q,o,catalog).status,'unavailable');
catalog.enemies=[{id:o.targetId,zoneId:'GREENFIELDS',released:true,boss:true}];
assert.equal(resolveStoryObjective(q,o,catalog).status,'unavailable');
const scout=book.quests.find(q=>q.legacyQuestId==='QST_003');
assert.equal(scout.objectives[0].targetId,'SCOUT_IRONWOOD');
catalog.routes=[{id:'SCOUT_IRONWOOD',zoneId:'IRONWOOD',released:true}];
assert.deepEqual(resolveStoryObjective(scout,scout.objectives[0],catalog),{status:'destination',screen:'Skills',skillId:'exploration',section:'Routes',routeId:'SCOUT_IRONWOOD',regionId:'ASTERFALL',zoneId:'IRONWOOD',authorizesAccess:false});
assert.equal(resolveStoryObjective(scout,scout.objectives[0],{...catalog,routes:[]}).status,'unavailable');
catalog.gathering=[{id:'COPPER_VEIN',itemId:'COPPER_ORE',skillId:'mining',zoneId:'OLD_MINES',released:true},{id:'GREENFIELDS_COPPER_OUTCROP',itemId:'COPPER_ORE',skillId:'mining',zoneId:'GREENFIELDS',released:true},{id:'future',itemId:'COPPER_ORE',skillId:'mining',zoneId:'ASHLANDS',released:false}];
assert.equal(resolveGatheringSources(book.optionalPaths[0],catalog).length,2);
assert.ok(resolveGatheringSources(book.optionalPaths[0],catalog).every(x=>!x.authorizesAccess));
const cycle=structuredClone(book);cycle.quests[0].prerequisites=[cycle.quests.at(-1).id];
assert.throws(()=>validateStoryBook(cycle),/quest_cycle/);
const duplicate=structuredClone(book);duplicate.quests[1].legacyQuestId=duplicate.quests[0].legacyQuestId;
assert.throws(()=>validateStoryBook(duplicate),/duplicate/);
const exposed=structuredClone(book);exposed.quests[0].released=true;
assert.throws(()=>validateStoryBook(exposed),/invalid_quest_scope/);
console.log('Asterfall content IDs, hidden scope, prerequisites and dynamic destinations: PASS');
