import {GATHERING_TOOLS} from '../src/content/gathering-tools';
import {createCharacter,newGame,craftRecipe,equipGatheringTool,unequipGatheringTool,depositToBank,withdrawFromBank} from '../src/core/game';
import {equippedGatheringToolRoll,gatheringToolEffects,gatheringToolTimeMultiplier} from '../src/core/gathering-tools';
import {mintGatheringTool,validateGatheringToolRoll,gatheringToolBaseMultiplier,gatheringToolBonusLabel} from '../src/core/gathering-tool-rolls';
import {totalXpAtLevel} from '../src/core/progression';
import type {CraftedGatheringTool} from '../src/core/gathering-tool-rolls';
import type {GameState} from '../src/core/types';
function assert(condition:unknown,message:string):asserts condition{if(!condition)throw new Error(message)}

const repeat=mintGatheringTool('GREENWOOD_HATCHET','CHAR_ONE','receipt',100);
assert(JSON.stringify(repeat)===JSON.stringify(mintGatheringTool('GREENWOOD_HATCHET','CHAR_ONE','receipt',100)),'Trusted mint must be deterministic');
assert(repeat.quality>=0&&repeat.quality<=100,'Quality must be between 0 and 100');
assert(repeat.bonus.stat==='speed'||repeat.bonus.stat==='rarity','Exactly one permitted bonus stat');
assert(repeat.bonus.basisPoints%10===0,'Bonus uses tenth-percent precision');
assert(repeat.bonus.basisPoints>=(repeat.bonus.stat==='speed'?200:200)&&repeat.bonus.basisPoints<=(repeat.bonus.stat==='speed'?800:500),'Same fixed range for all rarities');
assert(!validateGatheringToolRoll({...repeat,bonus:{stat:'speed',basisPoints:900}},repeat.itemId),'Forged invalid roll must be rejected');
assert(gatheringToolBaseMultiplier({...repeat,rarity:'uncommon',quality:50})===1,'Uncommon Q50 remains neutral base');
assert(gatheringToolBaseMultiplier({...repeat,rarity:'uncommon',quality:0})===.9,'Q0 adjusts base by -10%');
assert(gatheringToolBaseMultiplier({...repeat,rarity:'uncommon',quality:100})===1.1,'Q100 adjusts base by +10%');

let state=createCharacter(newGame(0),'IRONWARDEN','Tool Affix Tester');
state={...state,character:{...state.character!,level:46,gold:100000},skills:state.skills.map(sk=>sk.skillId==='woodcutting'?{...sk,level:46,xp:totalXpAtLevel(46)}:sk),
 inventory:{...state.inventory,stacks:GATHERING_TOOLS.filter(t=>t.skillId==='woodcutting').map(t=>({itemId:t.id,quantity:1}))}};
for(const tool of GATHERING_TOOLS.filter(t=>t.skillId==='woodcutting'))state=equipGatheringTool(state,tool.id,100);
assert(Math.abs(gatheringToolTimeMultiplier(state,'woodcutting')-.4)<1e-9,'Legacy four tiers preserve 60% reduction');
assert(Math.abs(gatheringToolEffects(state,'woodcutting').rarityChanceMultiplier-1)<1e-9,'Legacy tools receive no fabricated affix');

const tools=GATHERING_TOOLS.filter(t=>t.skillId==='woodcutting');
const speedCopies:CraftedGatheringTool[]=tools.map((tool,index)=>({
 ...repeat,id:'gtool:test:speed:'+index,itemId:tool.id,rarity:'uncommon',quality:50,bonus:{stat:'speed',basisPoints:800},
}));
const speeds:GameState={...state,account:{...state.account,craftedGatheringToolInstances:speedCopies},
 character:{...state.character!,equippedToolInstanceIdsByTier:{woodcutting:{1:speedCopies[0].id,2:speedCopies[1].id,3:speedCopies[2].id,4:speedCopies[3].id}}}};
const expected=.4*.92**4;
assert(Math.abs(gatheringToolTimeMultiplier(speeds,'woodcutting')-expected)<1e-9,'Four max speed rolls stack multiplicatively on remaining duration');
assert(gatheringToolTimeMultiplier(speeds,'woodcutting')<.4,'Gathering speed must exceed original 60% reduction');
assert(Math.abs(gatheringToolEffects(speeds,'woodcutting').rarityChanceMultiplier-1)<1e-9,'Speed rolls must never become rare finds');
assert(gatheringToolBonusLabel(speedCopies[0])==='+8.0% Gathering Speed','Speed stat should be clear');

const rareCopies:CraftedGatheringTool[]=speedCopies.map(copy=>({...copy,bonus:{stat:'rarity' as const,basisPoints:500}}));
const rarities:GameState={...speeds,account:{...speeds.account,craftedGatheringToolInstances:rareCopies}};
assert(Math.abs(gatheringToolTimeMultiplier(rarities,'woodcutting')-.4)<1e-9,'Rarity rolls must not affect gathering speed');
assert(Math.abs(gatheringToolEffects(rarities,'woodcutting').rarityChanceMultiplier-1.20)<1e-9,'Four +5% rolls yield +20% relative rare chance');
assert(gatheringToolBonusLabel(rareCopies[0])==='+5.0% Gathering Rarity Chance','Rarity stat should be clear');
const ultra:GameState={...speeds,account:{...speeds.account,craftedGatheringToolInstances:speedCopies.map(copy=>({...copy,rarity:'mythic',quality:100}))}};
assert(Math.abs(gatheringToolTimeMultiplier(ultra,'woodcutting')-.2)<1e-9,'Cap total rolled reduction at 80%');

let crafted=createCharacter(newGame(0),'IRONWARDEN','Actual Craft');
crafted={...crafted,character:{...crafted.character!,level:16,gold:100000},skills:crafted.skills.map(sk=>sk.skillId==='woodcutting'?{...sk,level:3,xp:totalXpAtLevel(3)}:sk),
 inventory:{...crafted.inventory,stacks:[{itemId:'GREENWOOD_LOG',quantity:144},{itemId:'MOSS_FIBER',quantity:72}]}};
crafted=craftRecipe(crafted,'CRAFT_GREENWOOD_HATCHET',1000);
const first=crafted.account.craftedGatheringToolInstances?.[0];
assert(!!first&&!!validateGatheringToolRoll(first,'GREENWOOD_HATCHET'),'Smithing craft must create one valid tool copy');
assert(crafted.inventory.stacks.some(row=>row.itemId==='GREENWOOD_HATCHET'&&row.instanceId===first.id),'Inventory must keep the minted copy ID');
crafted=craftRecipe(crafted,'CRAFT_GREENWOOD_HATCHET',1000);
const second=crafted.account.craftedGatheringToolInstances?.[1];
assert(!!second&&first.id!==second.id,'Two crafting claims at the same timestamp must still produce distinct copies');
crafted=equipGatheringTool(crafted,'GREENWOOD_HATCHET',2000,first.id);
assert(equippedGatheringToolRoll(crafted,'woodcutting',1)?.id===first.id,'Selected physical copy must equip');
crafted=equipGatheringTool(crafted,'GREENWOOD_HATCHET',3000,second.id);
assert(equippedGatheringToolRoll(crafted,'woodcutting',1)?.id===second.id,'Replacing tool must select the correct distinct copy');
assert(crafted.inventory.stacks.some(row=>row.instanceId===first.id),'Replaced copy returns to Inventory intact');
crafted=unequipGatheringTool(crafted,'woodcutting',4000,'GREENWOOD_HATCHET');
assert(crafted.inventory.stacks.some(row=>row.instanceId===second.id),'Unequipped tool retains exact copy ID');
crafted=depositToBank(crafted,'GREENWOOD_HATCHET',2);
assert([first.id,second.id].every(id=>crafted.bank.stacks.some(s=>s.instanceId===id)),'Bank deposit retains both rolled copies');
crafted=withdrawFromBank(crafted,'GREENWOOD_HATCHET',2);
assert([first.id,second.id].every(id=>crafted.inventory.stacks.some(s=>s.instanceId===id)),'Bank withdrawal retains both rolled copies');
console.log('Gathering tool affixes: deterministic rolls, 80% cap, rarity, custody and legacy tests passed.');
