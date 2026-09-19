import {buildCraftPlanV31,validatePlannerCatalogV31} from './equipment-crafting-plan-v31';
import {queueProgressV31,nextRunnableStepV31} from './equipment-craft-queue-v31';
function assert(x:boolean,m:string){if(!x)throw new Error(m)}
assert(validatePlannerCatalogV31(),'catalog');
const richSkills={SKL_008:100,SKL_012:100,SKL_014:100,SKL_015:100,SKL_016:100};
const empty=buildCraftPlanV31('T7P_1301',{characterLevel:70,skills:richSkills,inventory:{}});
assert(empty.blockers.some(b=>b.kind==='raw_resource'||b.kind==='registration'),'raw blocker');
assert(empty.blockers.some(b=>b.kind==='combat_material'),'combat blocker');
assert(empty.blockers.some(b=>b.kind==='dungeon_token'),'dungeon blocker');
assert(empty.steps.some(s=>s.kind==='component'),'component steps');
assert(!empty.steps.some(s=>s.kind==='process'&&s.status==='ready'),'no processing without raw mats');
assert(empty.steps.every(s=>s.kind!=='final'||s.status==='blocked'),'final blocked');
const lowSkill=buildCraftPlanV31('T1P_006',{characterLevel:5,skills:{SKL_008:1,SKL_012:2,SKL_014:1,SKL_015:1},inventory:{}});
assert(lowSkill.blockers.some(b=>b.kind==='skill'),'skill blocker');
const q={id:'q',characterId:'c',pieceId:'x',createdAt:'x',state:'planned' as const,blockerKeys:[],steps:[{id:'a',kind:'process' as const,label:'a',inventoryKey:'a',quantity:1,skillId:'x',skillLevel:1,seconds:1,dependsOn:[],status:'ready' as const,position:0,state:'done' as const},{id:'b',kind:'component' as const,label:'b',inventoryKey:'b',quantity:1,skillId:'x',skillLevel:1,seconds:1,dependsOn:['a'],status:'ready' as const,position:1,state:'pending' as const}]};
assert(nextRunnableStepV31(q)?.id==='b','dependency queue');
assert(queueProgressV31(q).ratio===.5,'progress');
