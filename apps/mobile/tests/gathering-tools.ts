import {GATHERING_TOOLS,TOOL_BLUEPRINT_ITEMS} from '../src/content/gathering-tools';
import {GATHERING,RECIPES} from '../src/content/skills';
import {HERB_NODES} from '../src/content/herbalism';
import {craftRecipe,createCharacter,equipGatheringTool,GATHER_TIME_SCALE,newGame,previewActivityReward,startGathering} from '../src/core/game';
import {gatheringPacing} from '../src/core/gathering-tools';
import {activityCycleSeconds} from '../src/core/dashboard';
import {executeGameCommand} from '../src/core/game-commands';
import {totalXpAtLevel} from '../src/core/progression';
import {MONSTERS} from '../src/content/monsters';

function ok(condition:unknown,message:string){if(!condition)throw new Error(message)}

let state=createCharacter(newGame(0),'IRONWARDEN','Tool Tester','female');
const oathstone=GATHERING.find(entry=>entry.id==='OATHSTONE_SEAM')!;
ok(GATHERING_TOOLS.length===12,'Expected four tool tiers for three gathering skills');
ok(RECIPES.filter(entry=>entry.output.itemId.endsWith('PICKAXE')||entry.output.itemId.endsWith('HATCHET')||entry.output.itemId.endsWith('ROD')).length===12,'Every gathering tool must be craftable');
ok(TOOL_BLUEPRINT_ITEMS.length===9,'Tier 2-4 gathering tools should use permanent blueprints while Tier 1 stays directly craftable');
for(const skillId of ['mining','woodcutting','fishing'] as const){
 const tools=GATHERING_TOOLS.filter(tool=>tool.skillId===skillId).sort((a,b)=>a.tier-b.tier);
 ok(tools[0].blueprint===undefined,skillId+' Tier 1 should not be RNG-gated');
 for(let i=1;i<tools.length;i++){
  ok(tools[i].unlockLevel>tools[i-1].unlockLevel,skillId+' tool skill requirements must rise by tier');
  ok(tools[i].requiredCharacterLevel>=tools[i-1].requiredCharacterLevel,skillId+' tool Level requirements must not regress');
  ok(!!tools[i].blueprint,skillId+' Tier '+tools[i].tier+' must have a blueprint');
  const source=MONSTERS.find(monster=>monster.id===tools[i].blueprint!.sourceMonsterId);
  ok(!!source&&source.drops.some(drop=>drop.itemId===tools[i].blueprint!.itemId&&drop.chance===tools[i].blueprint!.dropChance),tools[i].name+' blueprint source must be an authored monster drop');
 }
}

ok(oathstone.difficultyMultiplier===1.5&&oathstone.recommendedToolTier===3,'Late gathering should retain a meaningful but not punitive 1.5x difficulty gate');
const greenwood=GATHERING.find(entry=>entry.id==='GREENWOOD_TREE')!,ironwood=GATHERING.find(entry=>entry.id==='IRONWOOD_TREE')!,crownwood=GATHERING.find(entry=>entry.id==='CROWNWOOD_TREE')!;
ok(greenwood.xp===8,'Starter gathering XP should stay unchanged');
ok(ironwood.xp===23,'Tier-2 gathering should gain roughly 35% more XP per action');
ok(crownwood.xp===39,'Tier-3 gathering should gain roughly 45% more XP per action');
ok(oathstone.xp===42,'Tier-3 Mining XP should follow the same accelerated curve');

ok(Math.abs(gatheringPacing(state,oathstone).timeMultiplier-1.725)<.001,'Late gathering without a tool should combine the 1.5x node difficulty and 15% no-tool inefficiency');

state={...state,currentRegionId:'OLD_MINES',character:{...state.character!,level:20},skills:state.skills.map(skill=>skill.skillId==='mining'?{...skill,level:20}:skill),inventory:{...state.inventory,stacks:[...state.inventory.stacks,{itemId:'OATHSTONE_PICKAXE',quantity:1}]}};
state=equipGatheringTool(state,'OATHSTONE_PICKAXE');
ok(state.character?.equippedToolIds?.mining==='OATHSTONE_PICKAXE','Crafted pickaxe should equip in the mining tool slot');
ok(!state.inventory.stacks.some(stack=>stack.itemId==='OATHSTONE_PICKAXE'),'Equipped tool should leave carried Inventory');
ok(Math.abs(gatheringPacing(state,oathstone).timeMultiplier-.75)<.001,'Recommended tier-3 tool should make a late node feel faster than its raw difficulty gate');

state=startGathering(state,'OATHSTONE_SEAM',0);
ok(Math.abs(activityCycleSeconds(state)-oathstone.seconds*GATHER_TIME_SCALE*.75)<.001,'Dashboard cycle must use the same fast recommended-tool pacing as reward settlement');
const reward=previewActivityReward(state,Math.ceil(oathstone.seconds*GATHER_TIME_SCALE*.75)*1000);
ok(reward.kills>=1,'A recommended tool should complete the normalized late-resource cycle');
let blueprintCraft=createCharacter(newGame(0),'IRONWARDEN','Blueprint Smith');
blueprintCraft={...blueprintCraft,character:{...blueprintCraft.character!,level:10,gold:100000},skills:blueprintCraft.skills.map(skill=>skill.skillId==='woodcutting'?{...skill,level:10,xp:totalXpAtLevel(10)}:skill.skillId==='smithing'?{...skill,level:12,xp:totalXpAtLevel(12)}:skill),inventory:{...blueprintCraft.inventory,stacks:[{itemId:'BP_ASTER_IRON_HATCHET',quantity:1},{itemId:'ASTER_IRON_INGOT',quantity:15},{itemId:'IRONWOOD_LOG',quantity:30},{itemId:'REINFORCED_FITTING',quantity:3}]}};
const noBlueprint={...blueprintCraft,inventory:{...blueprintCraft.inventory,stacks:blueprintCraft.inventory.stacks.filter(stack=>stack.itemId!=='BP_ASTER_IRON_HATCHET')}};
let blueprintBlocked=false;try{craftRecipe(noBlueprint,'CRAFT_ASTER_IRON_HATCHET')}catch(error){blueprintBlocked=error instanceof Error&&error.message.includes('Blueprint')}
ok(blueprintBlocked,'Tier 2 tool craft must require its blueprint before the recipe is learned');
blueprintCraft=craftRecipe(blueprintCraft,'CRAFT_ASTER_IRON_HATCHET');
ok(blueprintCraft.account.unlockedKnowledgeIds?.includes('tool_recipe:ASTER_IRON_HATCHET'),'First successful tool craft permanently learns its blueprint');
ok(!blueprintCraft.inventory.stacks.some(stack=>stack.itemId==='BP_ASTER_IRON_HATCHET'),'Learning the tool recipe consumes the blueprint item once');
ok(blueprintCraft.inventory.stacks.some(stack=>stack.itemId==='ASTER_IRON_HATCHET'),'Blueprint craft produces the actual gathering tool');
blueprintCraft=equipGatheringTool(blueprintCraft,'ASTER_IRON_HATCHET');
blueprintCraft={...blueprintCraft,inventory:{...blueprintCraft.inventory,stacks:[...blueprintCraft.inventory.stacks,{itemId:'ASTER_IRON_INGOT',quantity:15},{itemId:'IRONWOOD_LOG',quantity:30},{itemId:'REINFORCED_FITTING',quantity:3}]}};
blueprintCraft=craftRecipe(blueprintCraft,'CRAFT_ASTER_IRON_HATCHET');
ok(blueprintCraft.inventory.stacks.some(stack=>stack.itemId==='ASTER_IRON_HATCHET'),'A learned blueprint allows replacement tools without another blueprint drop');

const dewleaf=HERB_NODES.find(row=>row.id==='DEWLEAF_PATCH')!;
let herb=createCharacter(newGame(0),'IRONWARDEN','Method Tester','female');
herb={...herb,currentRegionId:'GREENFIELDS',skills:herb.skills.map(skill=>skill.skillId==='herbalism'?{...skill,level:70,xp:totalXpAtLevel(70)}:skill)};
const balanced=startGathering(herb,dewleaf.id,0),balancedCycle=activityCycleSeconds(balanced);
const quickState=executeGameCommand(herb,{type:'herbalism_method',args:{method:'quick'}},0).state,quick=startGathering(quickState,dewleaf.id,0);
ok(activityCycleSeconds(quick)<balancedCycle,'Quick Harvest must shorten the displayed and settled Herbalism cycle');
const changedWhileActive=executeGameCommand(quick,{type:'herbalism_method',args:{method:'careful'}},1).state;
ok(changedWhileActive.character?.herbalismMethodId==='careful','Changing Herbalism preference mid-session should update the next-session method');
ok(changedWhileActive.activity?.herbalismMethodId==='quick','Active Herbalism session must keep its snapshotted method after preference changes');
let lockedMethodBlocked=false;try{executeGameCommand(createCharacter(newGame(0),'IRONWARDEN','Low Herbalist'),{type:'herbalism_method',args:{method:'careful'}},0)}catch{lockedMethodBlocked=true}
ok(lockedMethodBlocked,'Careful Harvest must remain level-gated');

console.log('Gathering tool progression tests passed.');
