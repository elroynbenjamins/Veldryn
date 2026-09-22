import {GATHERING_TOOLS} from '../src/content/gathering-tools';
import {GATHERING,RECIPES} from '../src/content/skills';
import {createCharacter,equipGatheringTool,GATHER_TIME_SCALE,newGame,previewActivityReward,startGathering} from '../src/core/game';
import {gatheringPacing} from '../src/core/gathering-tools';
import {activityCycleSeconds} from '../src/core/dashboard';

function ok(condition:unknown,message:string){if(!condition)throw new Error(message)}

let state=createCharacter(newGame(0),'IRONWARDEN','Tool Tester','female');
const oathstone=GATHERING.find(entry=>entry.id==='OATHSTONE_SEAM')!;
ok(GATHERING_TOOLS.length===12,'Expected four tool tiers for three gathering skills');
ok(RECIPES.filter(entry=>entry.output.itemId.endsWith('PICKAXE')||entry.output.itemId.endsWith('HATCHET')||entry.output.itemId.endsWith('ROD')).length===12,'Every gathering tool must be craftable');
ok(oathstone.difficultyMultiplier===1.5&&oathstone.recommendedToolTier===3,'Late gathering should retain a meaningful but not punitive 1.5x difficulty gate');
ok(Math.abs(gatheringPacing(state,oathstone).timeMultiplier-1.725)<.001,'Late gathering without a tool should combine the 1.5x node difficulty and 15% no-tool inefficiency');

state={...state,currentRegionId:'OLD_MINES',character:{...state.character!,level:16},skills:state.skills.map(skill=>skill.skillId==='mining'?{...skill,level:16}:skill),inventory:{...state.inventory,stacks:[...state.inventory.stacks,{itemId:'OATHSTONE_PICKAXE',quantity:1}]}};
state=equipGatheringTool(state,'OATHSTONE_PICKAXE');
ok(state.character?.equippedToolIds?.mining==='OATHSTONE_PICKAXE','Crafted pickaxe should equip in the mining tool slot');
ok(!state.inventory.stacks.some(stack=>stack.itemId==='OATHSTONE_PICKAXE'),'Equipped tool should leave carried Inventory');
ok(Math.abs(gatheringPacing(state,oathstone).timeMultiplier-.75)<.001,'Recommended tier-3 tool should make a late node feel faster than its raw difficulty gate');

state=startGathering(state,'OATHSTONE_SEAM',0);
ok(Math.abs(activityCycleSeconds(state)-oathstone.seconds*GATHER_TIME_SCALE*.75)<.001,'Dashboard cycle must use the same fast recommended-tool pacing as reward settlement');
const reward=previewActivityReward(state,Math.ceil(oathstone.seconds*GATHER_TIME_SCALE*.75)*1000);
ok(reward.kills>=1,'A recommended tool should complete the normalized late-resource cycle');
console.log('Gathering tool progression tests passed.');
