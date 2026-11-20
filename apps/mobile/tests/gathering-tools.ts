import {GATHERING_TOOLS,TOOL_BLUEPRINT_ITEMS,TOOL_RECIPES,TOOL_CRAFT_COST_MULTIPLIER_BY_TIER,roundDownToolBlueprintDropChance,increasedToolCraftXp} from '../src/content/gathering-tools';
import {GATHERING,RECIPES} from '../src/content/skills';
import {HERB_NODES} from '../src/content/herbalism';
import {craftRecipe,createCharacter,equipGatheringTool,unequipGatheringTool,GATHER_TIME_SCALE,newGame,previewActivityReward,startGathering} from '../src/core/game';
import {equippedGatheringTools,gatheringPacing,gatheringToolTimeMultiplier} from '../src/core/gathering-tools';
import {activityCycleSeconds} from '../src/core/dashboard';
import {executeGameCommand} from '../src/core/game-commands';
import {totalXpAtLevel} from '../src/core/progression';
import {MONSTERS} from '../src/content/monsters';

function ok(condition:unknown,message:string):asserts condition{if(!condition)throw new Error(message)}

let state=createCharacter(newGame(0),'IRONWARDEN','Tool Tester','female');
const oathstone=GATHERING.find(entry=>entry.id==='OATHSTONE_SEAM')!;
ok(GATHERING_TOOLS.length===12,'Expected four tool tiers for three gathering skills');
ok(TOOL_RECIPES.length===12&&TOOL_RECIPES.every(recipe=>recipe.skillId==='smithing'&&recipe.level===1),'All gathering tools must be craftable at Smithing level 1, regardless of tier');
ok(RECIPES.filter(entry=>entry.output.itemId.endsWith('PICKAXE')||entry.output.itemId.endsWith('HATCHET')||entry.output.itemId.endsWith('ROD')).length===12,'Every gathering tool must be craftable');
ok(TOOL_BLUEPRINT_ITEMS.length===9,'Tier 2-4 gathering tools should use permanent blueprints while Tier 1 stays directly craftable');
ok(roundDownToolBlueprintDropChance(.0121125)===.012&&roundDownToolBlueprintDropChance(.0092625)===.009&&roundDownToolBlueprintDropChance(.0057)===.0055&&roundDownToolBlueprintDropChance(.00285)===.0025,'Blueprint drop rates round down in 0.05-percentage-point steps');
ok(increasedToolCraftXp(105)===190&&increasedToolCraftXp(2300)===4040,'Tool XP calculation rounds up after +3 and +75%');

const balanceCases=[
  ['GREENWOOD_HATCHET',105,110,[24,12],undefined],
  ['REEDLINE_ROD',100,100,[20,10],undefined],
  ['COPPER_PICKAXE',110,120,[8,14],undefined],
  ['ASTER_IRON_PICKAXE',340,650,[16,26,3],.017],
  ['ASTER_IRON_HATCHET',330,620,[15,30,3],.016],
  ['IRONWOOD_ROD',320,600,[36,9,10],.015],
  ['OATHSTONE_PICKAXE',900,2400,[22,40,8],.013],
  ['OATHSTONE_HATCHET',880,2300,[20,46,7],.012],
  ['OATHSCALE_ROD',860,2200,[44,14,10],.010],
  ['FROSTIRON_PICKAXE',2400,8500,[32,12,10],.009],
  ['FROSTIRON_HATCHET',2350,8300,[30,10,4],.008],
  ['RIMEGLASS_ROD',2300,8100,[22,14,4],.008],
] as const;
for(const [id,previousXp,previousBaseGold,previousInputs,authoredBlueprintChance] of balanceCases){
 const tool=GATHERING_TOOLS.find(row=>row.id===id);
 ok(tool,id+' must remain a gatherable/craftable tool');
 const recipe=TOOL_RECIPES.find(row=>row.output.itemId===id);
 ok(recipe,id+' must have a crafting recipe');
 const expectedXp=Math.ceil((previousXp+3)*1.75/10)*10;
 ok(tool.recipe.xp===expectedXp&&recipe.xp===expectedXp&&increasedToolCraftXp(previousXp)===expectedXp,id+' should retain prior +3 XP then increase another 75% and round UP to 10');
 const tierScale=TOOL_CRAFT_COST_MULTIPLIER_BY_TIER[tool.tier];
 const previousChargedGold=Math.ceil(previousBaseGold*1.2);
 const expectedGold=Math.max(100,Math.round(previousChargedGold*tierScale/100)*100);
 ok(recipe.gold===expectedGold,id+' should scale Gold by tier, rounding to the nearest 100');
 ok(recipe.inputs.length===previousInputs.length&&recipe.inputs.every((input,i)=>previousInputs[i]!==undefined&&input.quantity===previousInputs[i]! *tierScale),id+' should scale every crafting input by tier');
 ok(recipe.seconds===tool.recipe.seconds,id+' must preserve tool crafting time');
 if(authoredBlueprintChance===undefined){
  ok(!tool.blueprint,id+' Tier 1 still has no blueprint');
 }else{
  ok(!!tool.blueprint&&Math.abs(tool.blueprint.dropChance-authoredBlueprintChance*.75*.5)<1e-12,id+' blueprint should retain the prior 25% reduction and apply another 50% reduction before final monster scaling');
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
  const expectedFinal=roundDownToolBlueprintDropChance(tools[i].blueprint!.dropChance*.95);
  ok(expectedFinal>=.0025&&expectedFinal<=.006,tools[i].name+' final drop rate must stay inside 0.25%-0.60%');
  ok(!!source&&source.drops.some(drop=>drop.itemId===tools[i].blueprint!.itemId&&Math.abs(drop.chance-expectedFinal)<1e-12),tools[i].name+' blueprint final drop rate must be rounded DOWN to the nearest 0.05 percentage point');
 }
}

// Snapshot every final rate so faster combat cannot silently inflate blueprint supply.
const expectedFinalRates:Readonly<Record<string,number>>={
 BP_ASTER_IRON_PICKAXE:.006,
 BP_ASTER_IRON_HATCHET:.0055,
 BP_IRONWOOD_ROD:.005,
 BP_OATHSTONE_PICKAXE:.0045,
 BP_OATHSTONE_HATCHET:.004,
 BP_OATHSCALE_ROD:.0035,
 BP_FROSTIRON_PICKAXE:.003,
 BP_FROSTIRON_HATCHET:.0025,
 BP_RIMEGLASS_ROD:.0025,
};
ok(Object.keys(expectedFinalRates).length===TOOL_BLUEPRINT_ITEMS.length,'Snapshot must cover exactly the nine tool blueprints');
for(const tool of GATHERING_TOOLS.filter(tool=>!!tool.blueprint)){
 const source=MONSTERS.find(monster=>monster.id===tool.blueprint!.sourceMonsterId);
 const rate=source?.drops.find(drop=>drop.itemId===tool.blueprint!.itemId)?.chance;
 ok(rate!==undefined&&Math.abs(rate-expectedFinalRates[tool.blueprint!.itemId])<1e-12,tool.name+' must retain its halved 0.05%-precision probability');
}

// Keep blueprint hunts in distinct level bands, without multiple enemy sources for the same recipe.
const expectedBlueprintEncounters:Readonly<Record<string,{source:string;level:number}>>={
 BP_ASTER_IRON_HATCHET:{source:'THORNLING',level:10},
 BP_IRONWOOD_ROD:{source:'MIRE_HERON',level:12},
 BP_ASTER_IRON_PICKAXE:{source:'CAVE_SKITTER',level:16},
 BP_OATHSCALE_ROD:{source:'DROWNED_PILGRIM',level:22},
 BP_OATHSTONE_PICKAXE:{source:'FALLEN_SENTINEL',level:24},
 BP_OATHSTONE_HATCHET:{source:'OATHGLASS_REVENANT',level:25},
 BP_FROSTIRON_HATCHET:{source:'FROSTWOLF',level:51},
 BP_FROSTIRON_PICKAXE:{source:'BELLWRAITH',level:61},
 BP_RIMEGLASS_ROD:{source:'LAKEBOUND_SPECTER',level:68},
};
ok(Object.keys(expectedBlueprintEncounters).length===TOOL_BLUEPRINT_ITEMS.length,'Every blueprint must have one documented hunt');
for(const tool of GATHERING_TOOLS.filter(tool=>!!tool.blueprint)){
 const blueprint=tool.blueprint!,expected=expectedBlueprintEncounters[blueprint.itemId];
 const source=MONSTERS.find(monster=>monster.id===blueprint.sourceMonsterId);
 ok(!!expected&&!!source&&source.id===expected.source&&source.level===expected.level,tool.name+' must drop at its intended progression encounter');
 ok(!source.boss,tool.name+' must remain obtainable from repeatable normal encounters');
 ok(tool.tier<4?source.zone!=='Frostmarch':source.zone==='Frostmarch',tool.name+' blueprint source must match its chapter');
 const actualSources=MONSTERS.filter(monster=>monster.drops.some(drop=>drop.itemId===blueprint.itemId));
 ok(actualSources.length===1&&actualSources[0].id===source.id,tool.name+' blueprint must have exactly one correct monster source');
}
for(const skillId of ['mining','woodcutting','fishing'] as const){
 const hunt=GATHERING_TOOLS.filter(tool=>tool.skillId===skillId&&!!tool.blueprint).sort((a,b)=>a.tier-b.tier);
 const levels=hunt.map(tool=>MONSTERS.find(monster=>monster.id===tool.blueprint!.sourceMonsterId)!.level);
 ok(levels[1]-levels[0]>=6,skillId+' Tier 3 hunt must not immediately follow its Tier 2 drop');
 ok(levels[2]-levels[1]>=20,skillId+' Tier 4 must stay a later-region chase');
}
for(const [monsterId,blueprintId] of [
 ['ANCIENT_TREANT','BP_OATHSTONE_HATCHET'],
 ['RUNEBOUND_MINER','BP_OATHSTONE_PICKAXE'],
 ['CHOIR_HUNTER','BP_RIMEGLASS_ROD'],
] as const){
 ok(!MONSTERS.find(monster=>monster.id===monsterId)?.drops.some(drop=>drop.itemId===blueprintId),monsterId+' must no longer drop the migrated blueprint');
}

// An existing save containing a single equipped tool remains readable.
const legacyToolState={...state,character:{...state.character!,equippedToolIds:{mining:'OATHSTONE_PICKAXE'}}};
ok(equippedGatheringTools(legacyToolState,'mining').length===1&&Math.abs(gatheringToolTimeMultiplier(legacyToolState,'mining')-.85)<.001,'Legacy single-tool saves should still load without duplicate contributions');

// All twelve tools can coexist in independent per-skill, per-tier slots.
let collection=createCharacter(newGame(0),'IRONWARDEN','Tool Collection');
collection={...collection,character:{...collection.character!,level:46},skills:collection.skills.map(skill=>['mining','woodcutting','fishing'].includes(skill.skillId)?{...skill,level:46,xp:totalXpAtLevel(46)}:skill),inventory:{...collection.inventory,stacks:[...collection.inventory.stacks,...GATHERING_TOOLS.map(tool=>({itemId:tool.id,quantity:1}))]}};
for(const skillId of ['mining','woodcutting','fishing'] as const){
 ok(Math.abs(gatheringToolTimeMultiplier(collection,skillId)-1.15)<.001,'No '+skillId+' tool must preserve the 15% missing-tool slowdown');
 const ladder=GATHERING_TOOLS.filter(t=>t.skillId===skillId).sort((a,b)=>a.tier-b.tier);
 for(const [index,tool] of ladder.entries()){
  collection=equipGatheringTool(collection,tool.id,0);
  const expected=[.9,.75,.6,.4][index];
  ok(Math.abs(gatheringToolTimeMultiplier(collection,skillId)-expected)<.001,skillId+' should add one tool contribution at tier '+tool.tier);
  ok(equippedGatheringTools(collection,skillId).length===index+1,skillId+' should retain all previously-equipped tiers');
  const before=collection;
  collection=equipGatheringTool(collection,tool.id,0);
  ok(collection===before,'Re-equipping an equipped tier must not duplicate a bonus or a tool');
 }
 ok(!collection.inventory.stacks.some(row=>ladder.some(tool=>tool.id===row.itemId)),skillId+' equipped tools must be removed from Inventory');
}
ok(['mining','woodcutting','fishing'].every(skillId=>equippedGatheringTools(collection,skillId as 'mining'|'woodcutting'|'fishing').length===4),'All 12 independent tool slots should work simultaneously');
ok(['mining','woodcutting','fishing'].every(skillId=>Math.abs(gatheringToolTimeMultiplier(collection,skillId as 'mining'|'woodcutting'|'fishing')-.4)<.001),'All three gathering skills must cap at 60% time reduction with all tiers equipped');
collection=executeGameCommand(collection,{type:'unequip_tool',args:{id:'FROSTIRON_PICKAXE'}},0).state;
ok(equippedGatheringTools(collection,'mining').length===3&&Math.abs(gatheringToolTimeMultiplier(collection,'mining')-.6)<.001,'Unequipping Tier 4 removes its 20% contribution');
ok(collection.inventory.stacks.some(row=>row.itemId==='FROSTIRON_PICKAXE'),'Unequipped tool must return to Inventory');
collection=equipGatheringTool(collection,'FROSTIRON_PICKAXE',0);
ok(Math.abs(gatheringToolTimeMultiplier(collection,'mining')-.4)<.001,'Re-equipping restores the 60% cumulative maximum');
collection=unequipGatheringTool(collection,'mining',0,'ASTER_IRON_PICKAXE');
ok(equippedGatheringTools(collection,'mining').length===3&&Math.abs(gatheringToolTimeMultiplier(collection,'mining')-.55)<.001,'Unequipping Tier 2 retains the Tier 1, 3 and 4 contributions (45% total)');

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
ok(Math.abs(gatheringPacing(state,oathstone).timeMultiplier-1.275)<.001,'A higher-tier pickaxe should make the Level-16 node substantially faster than its raw difficulty gate');

state=startGathering(state,'OATHSTONE_SEAM',0);
ok(Math.abs(activityCycleSeconds(state)-oathstone.seconds*GATHER_TIME_SCALE*1.275)<.001,'Dashboard cycle must use the same fast recommended-tool pacing as reward settlement');
const reward=previewActivityReward(state,Math.ceil(oathstone.seconds*GATHER_TIME_SCALE*1.275)*1000);
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
earlyTool={...earlyTool,character:{...earlyTool.character!,level:3,gold:1000},skills:earlyTool.skills.map(skill=>skill.skillId==='woodcutting'?{...skill,level:3,xp:totalXpAtLevel(3)}:skill),inventory:{...earlyTool.inventory,stacks:[{itemId:'GREENWOOD_LOG',quantity:72},{itemId:'MOSS_FIBER',quantity:36}]}};
earlyTool=craftRecipe(earlyTool,'CRAFT_GREENWOOD_HATCHET');
ok(earlyTool.inventory.stacks.some(stack=>stack.itemId==='GREENWOOD_HATCHET'),'Level-3 Greenwood Hatchet must be craftable from genuinely early Greenfields materials');

let blueprintCraft=createCharacter(newGame(0),'IRONWARDEN','Blueprint Smith');
blueprintCraft={...blueprintCraft,character:{...blueprintCraft.character!,level:16,gold:100000},skills:blueprintCraft.skills.map(skill=>skill.skillId==='woodcutting'?{...skill,level:10,xp:totalXpAtLevel(10)}:skill),inventory:{...blueprintCraft.inventory,stacks:[{itemId:'BP_ASTER_IRON_HATCHET',quantity:1},{itemId:'ASTER_IRON_INGOT',quantity:75},{itemId:'IRONWOOD_LOG',quantity:150},{itemId:'REINFORCED_FITTING',quantity:15}]}};
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
blueprintCraft={...blueprintCraft,inventory:{...blueprintCraft.inventory,stacks:[...blueprintCraft.inventory.stacks,{itemId:'ASTER_IRON_INGOT',quantity:75},{itemId:'IRONWOOD_LOG',quantity:150},{itemId:'REINFORCED_FITTING',quantity:15}]}};
blueprintCraft=craftRecipe(blueprintCraft,'CRAFT_ASTER_IRON_HATCHET');
ok(blueprintCraft.inventory.stacks.some(stack=>stack.itemId==='ASTER_IRON_HATCHET'),'A learned blueprint allows replacement tools without another blueprint drop');

let frostTool=createCharacter(newGame(0),'IRONWARDEN','Frost Tool Tester');
frostTool={...frostTool,character:{...frostTool.character!,level:46,gold:100000},skills:frostTool.skills.map(skill=>skill.skillId==='fishing'?{...skill,level:46,xp:totalXpAtLevel(46)}:skill),inventory:{...frostTool.inventory,stacks:[{itemId:'BP_RIMEGLASS_ROD',quantity:1},{itemId:'FROSTIRON',quantity:198},{itemId:'RIMEGLASS',quantity:126},{itemId:'CHOIR_BLOOM',quantity:36}]}};
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
