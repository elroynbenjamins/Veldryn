import {GATHERING_TOOLS,TOOL_BLUEPRINT_ITEMS,TOOL_RECIPES} from '../src/content/gathering-tools';
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
ok(TOOL_RECIPES.length===12&&TOOL_RECIPES.every(recipe=>recipe.skillId==='smithing'&&recipe.level===1),'All gathering tools must be craftable at Smithing level 1, regardless of tier');
ok(RECIPES.filter(entry=>entry.output.itemId.endsWith('PICKAXE')||entry.output.itemId.endsWith('HATCHET')||entry.output.itemId.endsWith('ROD')).length===12,'Every gathering tool must be craftable');
ok(TOOL_BLUEPRINT_ITEMS.length===9,'Tier 2-4 gathering tools should use permanent blueprints while Tier 1 stays directly craftable');

const balanceCases=[
  ['GREENWOOD_HATCHET',105,110,[24,12],undefined],
  ['REEDLINE_ROD',100,100,[20,10],undefined],
  ['COPPER_PICKAXE',110,120,[8,14],undefined],
  ['ASTER_IRON_PICKAXE',340,650,[16,26,3],.05],
  ['ASTER_IRON_HATCHET',330,620,[15,30,3],.05],
  ['IRONWOOD_ROD',320,600,[36,9,10],.05],
  ['OATHSTONE_PICKAXE',900,2400,[22,40,8],.02],
  ['OATHSTONE_HATCHET',880,2300,[20,46,7],.02],
  ['OATHSCALE_ROD',860,2200,[44,14,10],.02],
  ['FROSTIRON_PICKAXE',2400,8500,[32,12,10],.01],
  ['FROSTIRON_HATCHET',2350,8300,[30,10,4],.01],
  ['RIMEGLASS_ROD',2300,8100,[22,14,4],.01],
] as const;
for(const [id,previousXp,previousBaseGold,previousInputs,previousBlueprintChance] of balanceCases){
 const tool=GATHERING_TOOLS.find(row=>row.id===id);
 ok(tool,id+' must remain a gatherable/craftable tool');
 const recipe=TOOL_RECIPES.find(row=>row.output.itemId===id);
 ok(recipe,id+' must have a crafting recipe');
 ok(tool.recipe.xp===previousXp+3&&recipe.xp===previousXp+3,id+' should give exactly 3 more Smithing XP');
 const previousChargedGold=Math.ceil(previousBaseGold*1.2);
 ok(recipe.gold===previousChargedGold*2,id+' should charge exactly twice its previous crafting Gold cost');
 ok(recipe.inputs.length===previousInputs.length&&recipe.inputs.every((input,i)=>input.quantity===previousInputs[i]*2),id+' should consume twice each crafting material');
 ok(recipe.seconds===tool.recipe.seconds,id+' must preserve tool crafting time');
 if(previousBlueprintChance===undefined){
  ok(!tool.blueprint,id+' Tier 1 still has no blueprint');
 }else{
  ok(!!tool.blueprint&&Math.abs(tool.blueprint.dropChance-previousBlueprintChance*.75)<1e-12,id+' blueprint should be 25% rarer than before');
 }
}

for(const skillId of ['mining','woodcutting','fishing'] as const){
 const tools=GATHERING_TOOLS.filter(tool=>tool.skillId===skillId).sort((a,b)=>a.tier-b.tier);
 ok(tools[0].blueprint===undefined,skillId+' Tier 1 should not be RNG-gated');
 for(let i=1;i<tools.length;i++){
  ok(tools[i].unlockLevel>tools[i-1].unlockLevel,skillId+' tool skill requirements must rise by tier');
  ok(tools[i].requiredCharacterLevel>=tools[i-1].requiredCharacterLevel,skillId+' tool Level requirements must not regress');
  ok(!!tools[i].blueprint,skillId+' Tier '+tools[i].tier+' must have a blueprint');
  const source=MONSTERS.find(monster=>monster.id===tools[i].blueprint!.sourceMonsterId);
  ok(!!source&&source.drops.some(drop=>drop.itemId===tools[i].blueprint!.itemId&&Math.abs(drop.chance-tools[i].blueprint!.dropChance*.95)<1e-12),tools[i].name+' blueprint source must be an authored monster drop');
 }
}

ok(oathstone.difficultyMultiplier===1.5&&oathstone.recommendedToolTier===2,'Level-16 Mining should recommend the highest legally reachable tool tier rather than a locked Tier 3');
const greenwood=GATHERING.find(entry=>entry.id==='GREENWOOD_TREE')!,ironwood=GATHERING.find(entry=>entry.id==='IRONWOOD_TREE')!,crownwood=GATHERING.find(entry=>entry.id==='CROWNWOOD_TREE')!;
ok(greenwood.xp===8,'Starter gathering XP should stay unchanged');
ok(ironwood.xp===23,'Tier-2 gathering should gain roughly 35% more XP per action');
ok(crownwood.xp===39,'Tier-3 gathering should gain roughly 45% more XP per action');
ok(oathstone.xp===42,'Tier-3 Mining XP should follow the same accelerated curve');

ok(Math.abs(gatheringPacing(state,oathstone).timeMultiplier-1.725)<.001,'Late gathering without a tool should combine the 1.5x node difficulty and 15% no-tool inefficiency');

state={...state,currentRegionId:'OLD_MINES',exploredRouteIds:['SCOUT_IRONWOOD'],character:{...state.character!,level:20},skills:state.skills.map(skill=>skill.skillId==='mining'?{...skill,level:20}:skill),inventory:{...state.inventory,stacks:[...state.inventory.stacks,{itemId:'OATHSTONE_PICKAXE',quantity:1}]}};
state=equipGatheringTool(state,'OATHSTONE_PICKAXE');
ok(state.character?.equippedToolIds?.mining==='OATHSTONE_PICKAXE','Crafted pickaxe should equip in the mining tool slot');
ok(!state.inventory.stacks.some(stack=>stack.itemId==='OATHSTONE_PICKAXE'),'Equipped tool should leave carried Inventory');
ok(Math.abs(gatheringPacing(state,oathstone).timeMultiplier-.75)<.001,'A higher-tier pickaxe should make the Level-16 node substantially faster than its raw difficulty gate');

state=startGathering(state,'OATHSTONE_SEAM',0);
ok(Math.abs(activityCycleSeconds(state)-oathstone.seconds*GATHER_TIME_SCALE*.75)<.001,'Dashboard cycle must use the same fast recommended-tool pacing as reward settlement');
const reward=previewActivityReward(state,Math.ceil(oathstone.seconds*GATHER_TIME_SCALE*.75)*1000);
ok(reward.kills>=1,'A recommended tool should complete the normalized late-resource cycle');
let midSession=createCharacter(newGame(0),'IRONWARDEN','Tool Swap Tester','female');
midSession={...midSession,currentRegionId:'GREENFIELDS',character:{...midSession.character!,level:3},skills:midSession.skills.map(skill=>skill.skillId==='woodcutting'?{...skill,level:3,xp:totalXpAtLevel(3)}:skill),inventory:{...midSession.inventory,stacks:[...midSession.inventory.stacks,{itemId:'GREENWOOD_HATCHET',quantity:1}]}};
midSession=startGathering(midSession,'GREENWOOD_TREE',0);
midSession=equipGatheringTool(midSession,'GREENWOOD_HATCHET',20_000);
const continuedActivity=midSession.activity;
ok(continuedActivity?.targetId==='GREENWOOD_TREE'&&continuedActivity?.lastClaimAtMs===20_000,'Changing an active skill tool should keep the gathering activity running from a settled rate boundary');
ok((continuedActivity?.progressFraction??0)>0,'A mid-cycle tool swap should retain earned partial-cycle progress');
const afterSwap=previewActivityReward(midSession,40_000);
ok(afterSwap.kills>0,'The continued activity should use the newly equipped tool speed after the swap boundary');
let earlyTool=createCharacter(newGame(0),'IRONWARDEN','Early Tool Smith');
earlyTool={...earlyTool,character:{...earlyTool.character!,level:3,gold:1000},skills:earlyTool.skills.map(skill=>skill.skillId==='woodcutting'?{...skill,level:3,xp:totalXpAtLevel(3)}:skill),inventory:{...earlyTool.inventory,stacks:[{itemId:'GREENWOOD_LOG',quantity:48},{itemId:'MOSS_FIBER',quantity:24}]}};
earlyTool=craftRecipe(earlyTool,'CRAFT_GREENWOOD_HATCHET');
ok(earlyTool.inventory.stacks.some(stack=>stack.itemId==='GREENWOOD_HATCHET'),'Level-3 Greenwood Hatchet must be craftable from genuinely early Greenfields materials');

let blueprintCraft=createCharacter(newGame(0),'IRONWARDEN','Blueprint Smith');
blueprintCraft={...blueprintCraft,character:{...blueprintCraft.character!,level:16,gold:100000},skills:blueprintCraft.skills.map(skill=>skill.skillId==='woodcutting'?{...skill,level:10,xp:totalXpAtLevel(10)}:skill),inventory:{...blueprintCraft.inventory,stacks:[{itemId:'BP_ASTER_IRON_HATCHET',quantity:1},{itemId:'ASTER_IRON_INGOT',quantity:30},{itemId:'IRONWOOD_LOG',quantity:60},{itemId:'REINFORCED_FITTING',quantity:6}]}};
ok(blueprintCraft.skills.find(skill=>skill.skillId==='smithing')?.level===1,'Blueprint crafting test must keep Smithing at starting level');
const noBlueprint={...blueprintCraft,inventory:{...blueprintCraft.inventory,stacks:blueprintCraft.inventory.stacks.filter(stack=>stack.itemId!=='BP_ASTER_IRON_HATCHET')}};
let blueprintBlocked=false;try{craftRecipe(noBlueprint,'CRAFT_ASTER_IRON_HATCHET')}catch(error){blueprintBlocked=error instanceof Error&&error.message.includes('Blueprint')}
ok(blueprintBlocked,'Tier 2 tool craft must require its blueprint before the recipe is learned');
let skillingBlocked=false;try{craftRecipe({...blueprintCraft,skills:blueprintCraft.skills.map(skill=>skill.skillId==='woodcutting'?{...skill,level:1,xp:0}:skill)},'CRAFT_ASTER_IRON_HATCHET')}catch(error){skillingBlocked=error instanceof Error&&error.message.includes('woodcutting level 10')}
ok(skillingBlocked,'Tool crafting must still enforce the matching gathering skill level');
blueprintCraft=craftRecipe(blueprintCraft,'CRAFT_ASTER_IRON_HATCHET');
ok(blueprintCraft.account.unlockedKnowledgeIds?.includes('tool_recipe:ASTER_IRON_HATCHET'),'First successful tool craft permanently learns its blueprint');
ok(!blueprintCraft.inventory.stacks.some(stack=>stack.itemId==='BP_ASTER_IRON_HATCHET'),'Learning the tool recipe consumes the blueprint item once');
ok(blueprintCraft.inventory.stacks.some(stack=>stack.itemId==='ASTER_IRON_HATCHET'),'Blueprint craft produces the actual gathering tool');
blueprintCraft=equipGatheringTool(blueprintCraft,'ASTER_IRON_HATCHET');
blueprintCraft={...blueprintCraft,inventory:{...blueprintCraft.inventory,stacks:[...blueprintCraft.inventory.stacks,{itemId:'ASTER_IRON_INGOT',quantity:30},{itemId:'IRONWOOD_LOG',quantity:60},{itemId:'REINFORCED_FITTING',quantity:6}]}};
blueprintCraft=craftRecipe(blueprintCraft,'CRAFT_ASTER_IRON_HATCHET');
ok(blueprintCraft.inventory.stacks.some(stack=>stack.itemId==='ASTER_IRON_HATCHET'),'A learned blueprint allows replacement tools without another blueprint drop');

let frostTool=createCharacter(newGame(0),'IRONWARDEN','Frost Tool Tester');
frostTool={...frostTool,character:{...frostTool.character!,level:46,gold:100000},skills:frostTool.skills.map(skill=>skill.skillId==='fishing'?{...skill,level:46,xp:totalXpAtLevel(46)}:skill),inventory:{...frostTool.inventory,stacks:[{itemId:'BP_RIMEGLASS_ROD',quantity:1},{itemId:'FROSTIRON',quantity:44},{itemId:'RIMEGLASS',quantity:28},{itemId:'CHOIR_BLOOM',quantity:8}]}};
frostTool=craftRecipe(frostTool,'CRAFT_RIMEGLASS_ROD');
ok(frostTool.inventory.stacks.some(stack=>stack.itemId==='RIMEGLASS_ROD'),'Tier 4 blueprint tool must also be craftable with Smithing at level 1');

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
