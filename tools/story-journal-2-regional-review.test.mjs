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
