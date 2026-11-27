import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateStoryBook,resolveStoryObjective} from './story-journal-2-review.mjs';
import {projectStoryReview} from './story-journal-2-evidence-review.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const book=JSON.parse(read('docs/2-0/story-sunscar-review-v1.json')),guide=JSON.parse(read('docs/2-0/story-asterfall-onboarding-review-v1.json')),asterfall=JSON.parse(read('docs/2-0/story-asterfall-review-v1.json'));
assert.equal(validateStoryBook(book),true);
assert.equal(book.quests.length,15);
assert.equal(book.finale.bindingStatus,'pending_authoritative_solo_boss_id');
assert.equal(book.quests.some(q=>q.id===book.finale.id),false);
const monsters=read('apps/mobile/src/content/monsters.ts'),routes=read('apps/mobile/src/content/exploration.ts'),areas=read('apps/mobile/src/content/regional-areas.ts');
for(const z of book.zones){assert.ok(areas.includes("id:'"+z.zoneId+"'"));assert.ok(routes.includes("id:'"+z.routeId+"'"));}
for(const q of book.quests)for(const o of q.objectives)assert.ok((o.kind==='map'?routes:monsters).includes("id:'"+o.targetId+"'"),o.targetId);
assert.equal(guide.steps.length,10);
assert.equal(guide.policy.maxVisibleTips,1);
for(const s of guide.steps){assert.ok(s.body.split(/\s+/).length<=guide.policy.maxBodyWords);assert.ok(s.optional&&!s.released);assert.ok(asterfall.quests.some(q=>q.legacyQuestId===s.legacyQuestId));}
assert.deepEqual(guide.steps.slice(0,3).map(s=>s.system),['combat','collection','gathering']);
const identity={accountId:'a',characterId:'c'},snap={...identity,sequence:1,level:26,equippedCount:2,actualAccountMaps:[],retainedCharacterRoutes:[],soloBossVictories:[],claimedLegacyIds:[],claimedStoryIds:[],activationSequences:{},events:[]};
assert.equal(projectStoryReview(book,snap,identity).reason,'regional_entry_not_verified');
snap.bookAccess={SUNSCAR:{...identity,previousFinale:book.entryRequirement.previousFinale,previousFinaleClaimed:true,characterAccess:false}};
assert.equal(projectStoryReview(book,snap,identity).status,'unavailable');
snap.bookAccess.SUNSCAR.characterAccess=true;
assert.equal(projectStoryReview(book,snap,identity).quests[0].status,'available');
const first=book.quests[0];
assert.equal(resolveStoryObjective(first,first.objectives[0],{world:[{zoneId:'SUNSCAR',regionId:'SUNSCAR',areaId:'ZONE_006',released:true}],routes:[{id:'SCOUT_SUNSCAR',zoneId:'SUNSCAR',areaId:'ZONE_006',released:true}]}).areaId,'ZONE_006');
console.log('Sunscar content, regional entry, pending finale and concise onboarding contract: PASS');

const frost=JSON.parse(read('docs/2-0/story-frostmarch-review-v1.json'));
const sunSide=JSON.parse(read('docs/2-0/story-sunscar-side-review-v1.json'));
const frostSide=JSON.parse(read('docs/2-0/story-frostmarch-side-review-v1.json'));
const skills=read('apps/mobile/src/content/skills.ts');
// Pinned review route identities from #1723; three new Frostmarch routes are not live yet.
const frostRouteIds=['SCOUT_FROSTMARCH','SCOUT2_FROST_WHITEPINE','SCOUT2_FROST_SHIVERLAKE','SCOUT2_FROST_WYRMSPINE'];
assert.equal(validateStoryBook(frost),true);
assert.equal(frost.quests.length,15);
assert.deepEqual(frost.zones.map(z=>z.routeId),frostRouteIds);
assert.deepEqual(frost.equipmentBands.map(b=>b.tier),[5]);
assert.equal(frost.entryRequirement.previousFinale,book.finale.id);
assert.equal(frost.finale.bindingStatus,'pending_authoritative_solo_boss_id');
for(const z of frost.zones)assert.ok(areas.includes("id:'"+z.zoneId+"'"));
for(const q of frost.quests)for(const o of q.objectives)assert.ok(o.kind==='map'?frostRouteIds.includes(o.targetId):monsters.includes("id:'"+o.targetId+"'"),o.targetId);
for(const [regional,side] of [[book,sunSide],[frost,frostSide]]){
 assert.equal(side.quests.length,9);assert.equal(side.lore.length,4);
 assert.equal(new Set(side.quests.map(q=>q.id)).size,9);
 assert.deepEqual(side.lore.map(l=>l.routeId),regional.zones.map(z=>z.routeId));
 for(const q of side.quests){
  assert.ok(regional.zones.some(z=>z.zoneId===q.narrativeZoneId));
  assert.equal(q.prerequisites.length,0);assert.equal(q.released,false);
  const o=q.objective;
  assert.ok((o.kind==='gather'?skills:monsters).includes((o.kind==='gather'?"itemId:'":"id:'")+o.targetId+"'"),o.targetId);
 }
}
assert.equal(projectStoryReview(frost,snap,identity).reason,'regional_entry_not_verified');
snap.bookAccess.FROSTMARCH={...identity,previousFinale:frost.entryRequirement.previousFinale,previousFinaleClaimed:true,characterAccess:true};
const fp=projectStoryReview(frost,snap,identity);
assert.equal(fp.quests[0].status,'available');
assert.equal(fp.finale.status,'unavailable');
assert.equal(fp.finale.authorizesReward,false);
assert.equal(projectStoryReview(book,snap,identity).finale.status,'unavailable');
console.log('Frostmarch T5 scope, 18 regional side quests, map IDs and pending finales: PASS');
