import {GATHERING_TOOLS} from '../src/content/gathering-tools';
import {GATHERING} from '../src/content/skills';
import {createCharacter,newGame,craftRecipe,startGathering,previewActivityReward,equipGatheringTool,unequipGatheringTool,depositToBank,withdrawFromBank,moveGatheringToolCopy,sellGatheringToolCopy} from '../src/core/game';
import {equippedGatheringToolRoll,gatheringToolEffects,gatheringToolTimeMultiplier,gatheringToolSkillXpMultiplier,reservedGatheringTool} from '../src/core/gathering-tools';
import {mintGatheringTool,validateGatheringToolRoll,gatheringToolBaseMultiplier,gatheringToolBonusLabel,gatheringToolBonusRange,GATHERING_TOOL_XP_RANGE_BPS_BY_TIER} from '../src/core/gathering-tool-rolls';
import {auditCraftedGearOwnership} from '../src/core/crafted-gear-ownership';
import {equipmentCopyDisposalDecision} from '../src/core/equipment-disposal-guidance';
import {gatheringToolContribution,gatheringToolTotalBreakdown,gatheringToolPercent} from '../src/core/gathering-tool-presentation';
import {totalXpAtLevel} from '../src/core/progression';
import {bulkTransferSelected} from '../src/core/inventory-bulk';
import {validateGameCommand} from '../src/core/game-commands';
import {normalizeSave} from '../src/core/save-normalization';
import {itemInspectModel} from '../src/core/item-inspect';
import {startEquipmentCraft,claimForgeJob,cancelEquipmentCraft,timedEquipmentRecipe} from '../src/core/equipment-crafting-queue';
import type {CraftedGatheringTool} from '../src/core/gathering-tool-rolls';
import type {GameState} from '../src/core/types';
function assert(condition:unknown,message:string):asserts condition{if(!condition)throw new Error(message)}

const repeat=mintGatheringTool('GREENWOOD_HATCHET','CHAR_ONE','receipt',100);
assert(JSON.stringify(repeat)===JSON.stringify(mintGatheringTool('GREENWOOD_HATCHET','CHAR_ONE','receipt',100)),'Trusted mint must be deterministic');
assert(repeat.quality>=0&&repeat.quality<=100,'Quality must be between 0 and 100');
assert(['speed','rarity','xp'].includes(repeat.bonus.stat),'Exactly one permitted bonus stat');
assert(repeat.bonus.basisPoints%10===0,'Bonus uses tenth-percent precision');
const repeatRange=gatheringToolBonusRange(repeat.itemId,repeat.bonus.stat)!;
assert(repeat.bonus.basisPoints>=repeatRange[0]&&repeat.bonus.basisPoints<=repeatRange[1],'Affix must be within its permitted tool-tier range');
const newMints=Array.from({length:120},(_,index)=>mintGatheringTool('GREENWOOD_HATCHET','CHAR_ONE',`xp-coverage-${index}`,100));
assert(newMints.some(row=>row.bonus.stat==='xp'),'New crafted tools can roll their own Skill XP');
assert(newMints.some(row=>row.bonus.stat==='speed')&&newMints.some(row=>row.bonus.stat==='rarity'),'Existing tool affixes remain in the roll pool');
assert(newMints.every(row=>validateGatheringToolRoll(row,row.itemId)),'All new rolls validate');
assert(!validateGatheringToolRoll({...repeat,bonus:{stat:'xp',basisPoints:410}},repeat.itemId),'Tier 1 XP exceeds its +4% max');
assert(!validateGatheringToolRoll({...repeat,bonus:{stat:'xp',basisPoints:190}},repeat.itemId),'Tier 1 XP cannot roll below +2%');
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
assert(gatheringToolSkillXpMultiplier(state,'woodcutting')===1,'Legacy tools receive no invented XP roll');

// A validated gtool: marker in Inventory must not block disposal of unrelated,
// exact-copy forged gear. Unknown or duplicated tool IDs must still fail closed.
const coexistTool=mintGatheringTool('REEDLINE_ROD',state.character!.id,'TOOL_CUSTODY_REGRESSION',12345);
const coexistGearId='gear:tool-custody-regression';
const coexistState={
 ...state,
 account:{...state.account,craftedGatheringToolInstances:[coexistTool],
  craftedGearInstances:[{id:coexistGearId,itemId:'T1P_069',ownerCharacterId:state.character!.id,
   rarity:'common',quality:50,locked:false,acquireSource:'craft',sourceReceiptKey:'GEAR_CUSTODY_REGRESSION',
   createdAtMs:12345,enhancement:{rank:0,failures:0,gemIds:[]}}]},
 inventory:{...state.inventory,stacks:[{itemId:coexistTool.itemId,quantity:1,instanceId:coexistTool.id}]},
 character:{...state.character!,equipmentPouch:{capacity:20,stacks:[{itemId:'T1P_069',quantity:1,instanceId:coexistGearId}]}}
} as GameState;
assert(auditCraftedGearOwnership(coexistState).problems.length===0,'Valid gathering tool copies must not trigger equipment identity conflict');
assert(auditCraftedGearOwnership(coexistState).linked.some(row=>row.instanceId===coexistGearId),'Exact forged gear must still be located');
assert(equipmentCopyDisposalDecision(coexistState,coexistGearId,'salvage').allowed,'New unlocked crafted gear should be salvageable with tools in Inventory');
const toolMismatch={...coexistState,inventory:{...coexistState.inventory,stacks:[{itemId:'IRONWOOD_ROD',quantity:1,instanceId:coexistTool.id}]}} as GameState;
assert(auditCraftedGearOwnership(toolMismatch).problems.some(problem=>problem.includes('Gathering tool item mismatch')),'Mismatched tool item must remain protected');
const forgedTool={...coexistState,inventory:{...coexistState.inventory,stacks:[{itemId:coexistTool.itemId,quantity:1,instanceId:'gtool:unknown'}]}} as GameState;
assert(auditCraftedGearOwnership(forgedTool).problems.some(problem=>problem.includes('Unrecognized crafted instance')),'Unknown tool marker must still fail closed');
const doubleTool={...coexistState,inventory:{...coexistState.inventory,stacks:[{itemId:coexistTool.itemId,quantity:1,instanceId:coexistTool.id},{itemId:coexistTool.itemId,quantity:1,instanceId:coexistTool.id}]}} as GameState;
assert(auditCraftedGearOwnership(doubleTool).problems.some(problem=>problem.includes('Duplicate gathering tool copy')),'Duplicated tool markers must still fail closed');

const tools=GATHERING_TOOLS.filter(t=>t.skillId==='woodcutting');
const speedCopies:CraftedGatheringTool[]=tools.map((tool,index)=>({
 ...repeat,id:'gtool:test:speed:'+index,itemId:tool.id,rarity:'uncommon',quality:50,bonus:{stat:'speed',basisPoints:800},
}));
const speeds:GameState={...state,account:{...state.account,craftedGatheringToolInstances:speedCopies},
 character:{...state.character!,equippedToolInstanceIdsByTier:{woodcutting:{1:speedCopies[0].id,2:speedCopies[1].id,3:speedCopies[2].id,4:speedCopies[3].id}}}};
const xpCopies:CraftedGatheringTool[]=tools.map((tool,index)=>({
 ...speedCopies[index],bonus:{stat:'xp',basisPoints:GATHERING_TOOL_XP_RANGE_BPS_BY_TIER[tool.tier][1]},
}));
const xpTools:GameState={...speeds,account:{...speeds.account,craftedGatheringToolInstances:xpCopies}};
assert(xpCopies.every(copy=>validateGatheringToolRoll(copy,copy.itemId)),'XP rolls validate per tool tier');
assert(Math.abs(gatheringToolSkillXpMultiplier(xpTools,'woodcutting')-1.23)<1e-9,'All four distinct tool-tier XP bonuses stack additively for woodcutting');
assert(gatheringToolSkillXpMultiplier(xpTools,'mining')===1&&gatheringToolSkillXpMultiplier(xpTools,'fishing')===1,'Tool XP never transfers to another skill');
assert(gatheringToolBonusLabel(xpCopies[3])==='+8.0% Woodcutting XP','Tool XP label names only its skill');
assert(gatheringToolContribution(tools[3],xpCopies[3]).skillXpRollPercent===8,'Tool XP displayed separately from tier speed');
const woodcuttingNode=GATHERING.find(node=>node.skillId==='woodcutting'&&node.zoneId==='GREENFIELDS')!;
assert(!!woodcuttingNode,'Need an accessible starting-region woodcutting node for real XP reward test');
const withoutXp=startGathering(state,woodcuttingNode.id,1000);
const withXp=startGathering(xpTools,woodcuttingNode.id,1000);
const baseReward=previewActivityReward(withoutXp,1000+60*60*1000);
const boostedReward=previewActivityReward(withXp,1000+60*60*1000);
assert(baseReward.xp>0&&boostedReward.xp>baseReward.xp,'Tool XP roll must increase actual woodcutting preview and offline-equivalent rewards');
assert(Math.abs(gatheringToolTotalBreakdown(gatheringToolEffects(xpTools,'woodcutting')).skillXpRelativePercent-23)<1e-9,'Stacked tool XP matches the actual skill multiplier');
const expected=.4*.92**4;
assert(Math.abs(gatheringToolTimeMultiplier(speeds,'woodcutting')-expected)<1e-9,'Four max speed rolls stack multiplicatively on remaining duration');
assert(gatheringToolTimeMultiplier(speeds,'woodcutting')<.4,'Gathering speed must exceed original 60% reduction');
assert(Math.abs(gatheringToolEffects(speeds,'woodcutting').rarityChanceMultiplier-1)<1e-9,'Speed rolls must never become rare finds');
assert(gatheringToolBonusLabel(speedCopies[0])==='+8.0% Gathering Speed','Speed stat should be clear');
const legacyContribution=gatheringToolContribution(tools[0]);
const rolledContribution=gatheringToolContribution(tools[0],speedCopies[0]);
assert(Math.abs(legacyContribution.basePercent-10)<1e-9&&Math.abs(legacyContribution.adjustedBasePercent-10)<1e-9&&legacyContribution.legacy,'Uncommon Q50 legacy tier has unchanged contribution');
assert(Math.abs(rolledContribution.adjustedBasePercent-10)<1e-9&&rolledContribution.speedRollPercent===8,'Individual speed rolls are not additive tier percentage points');
const rarityQualityContribution=gatheringToolContribution(tools[0],{...speedCopies[0],rarity:'epic',quality:87});
assert(Math.abs(rarityQualityContribution.adjustedBasePercent-(10*1.04*1.074))<1e-9,'Tier contribution must multiply rarity and quality');
assert(gatheringToolPercent(rarityQualityContribution.adjustedBasePercent)==='11.2','Rounded adjusted tier contribution should be readable');
// Screenshot regression: Rare Q14 Aster-Iron hatchet has +14.2% tier speed
// and a separate +4.5% rare-find roll. The roll must never inflate tier speed.
const asterHatchet=GATHERING_TOOLS.find(row=>row.id==='ASTER_IRON_HATCHET')!;
const screenshotCopy:CraftedGatheringTool={
 ...repeat,id:'gtool:inspect-regression',itemId:asterHatchet.id,
 rarity:'rare',quality:14,bonus:{stat:'rarity',basisPoints:450},
};
const screenshotContribution=gatheringToolContribution(asterHatchet,screenshotCopy);
assert(gatheringToolPercent(screenshotContribution.adjustedBasePercent)==='14.2','Rare Q14 tier gathering speed is +14.2%');
assert(screenshotContribution.rarityRollPercent===4.5&&screenshotContribution.speedRollPercent===0,'Rare find roll stays separate from gathering speed');
assert(gatheringToolBonusLabel(screenshotCopy)==='+4.5% Gathering Rarity Chance','Rolled bonus remains readable independently');

const totals=gatheringToolTotalBreakdown(gatheringToolEffects(speeds,'woodcutting'));
assert(Math.abs(totals.rawTierPercent-60)<1e-9,'Displayed combined tier bonuses must preserve real additive baseline');
assert(Math.abs(totals.effectivePercent-(1-expected)*100)<1e-9,'Displayed combined speed must match gameplay multiplier');
assert(Math.abs(totals.speedRollGainPoints-(totals.effectivePercent-60))<1e-9,'Displayed roll gain must be percentage-point difference, not raw 32%');
assert(!totals.capped,'Default 4 speed rolls do not hit 80% cap');
const cappedTotals=gatheringToolTotalBreakdown({...gatheringToolEffects(speeds,'woodcutting'),baseReduction:.90,effectiveReduction:.80});
assert(cappedTotals.capped&&cappedTotals.effectivePercent===80&&cappedTotals.speedRollGainPoints===0,'At cap do not show invented extra speed gains');


const rareCopies:CraftedGatheringTool[]=speedCopies.map(copy=>({...copy,bonus:{stat:'rarity' as const,basisPoints:500}}));
const rarities:GameState={...speeds,account:{...speeds.account,craftedGatheringToolInstances:rareCopies}};
assert(Math.abs(gatheringToolTimeMultiplier(rarities,'woodcutting')-.4)<1e-9,'Rarity rolls must not affect gathering speed');
assert(Math.abs(gatheringToolEffects(rarities,'woodcutting').rarityChanceMultiplier-1.20)<1e-9,'Four +5% rolls yield +20% relative rare chance');
assert(gatheringToolBonusLabel(rareCopies[0])==='+5.0% Gathering Rarity Chance','Rarity stat should be clear');
const ultra:GameState={...speeds,account:{...speeds.account,craftedGatheringToolInstances:speedCopies.map(copy=>({...copy,rarity:'mythic',quality:100}))}};
assert(gatheringToolTimeMultiplier(ultra,'woodcutting')>=.2-1e-9&&gatheringToolTimeMultiplier(ultra,'woodcutting')<.4,'Maximum Mythic Q100 rolls must improve speed without exceeding 80% cap');

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
const toolInspect=itemInspectModel(crafted,'GREENWOOD_HATCHET',second.id);
assert(toolInspect.selectedQuality===second.quality&&toolInspect.rarityId===second.rarity,'Tapping rolled tool resolves its receipt without treating it as equipment');
assert(toolInspect.effectLines.some(line=>line.includes(gatheringToolBonusLabel(second))),'Exact tool inspector displays actual bonus');
assert(toolInspect.inventoryQuantity===2,'Tool inspector counts multiple rolled physical copies rather than first stack only');

crafted=equipGatheringTool(crafted,'GREENWOOD_HATCHET',2000,first.id);
assert(equippedGatheringToolRoll(crafted,'woodcutting',1)?.id===first.id,'Selected physical copy must equip');
crafted=equipGatheringTool(crafted,'GREENWOOD_HATCHET',3000,second.id);
assert(equippedGatheringToolRoll(crafted,'woodcutting',1)?.id===second.id,'Replacing tool must select the correct distinct copy');
assert(reservedGatheringTool(crafted,'woodcutting',1)?.instanceId===first.id,'Replaced active copy moves into the free tool reserve, keeping Inventory capacity free');
assert(!crafted.inventory.stacks.some(row=>row.instanceId===first.id),'Saved reserve must not occupy an Inventory stack');
crafted=unequipGatheringTool(crafted,'woodcutting',4000,'GREENWOOD_HATCHET');
assert(crafted.inventory.stacks.some(row=>row.instanceId===second.id),'Unequipping an active tool returns that precise copy to Inventory');
assert(equippedGatheringToolRoll(crafted,'woodcutting',1)?.id===first.id,'Unequipping active should promote its reserve instead of discarding it');
crafted=unequipGatheringTool(crafted,'woodcutting',4100,'GREENWOOD_HATCHET');
assert(crafted.inventory.stacks.some(row=>row.instanceId===first.id),'Unequipping promoted reserve recovers the second exact copy');
crafted=depositToBank(crafted,'GREENWOOD_HATCHET',2);
assert([first.id,second.id].every(id=>crafted.bank.stacks.some(s=>s.instanceId===id)),'Bank deposit retains both rolled copies');
crafted=withdrawFromBank(crafted,'GREENWOOD_HATCHET',2);
assert([first.id,second.id].every(id=>crafted.inventory.stacks.some(s=>s.instanceId===id)),'Bank withdrawal retains both rolled copies');
crafted=moveGatheringToolCopy(crafted,first.id,'bank');
assert(crafted.bank.stacks.some(row=>row.instanceId===first.id)&&crafted.inventory.stacks.some(row=>row.instanceId===second.id),'Exact transfer moves selected copy only');
const bankInspect=itemInspectModel(crafted,'GREENWOOD_HATCHET',first.id,'bank');
assert(bankInspect.selectedQuality===first.quality&&bankInspect.bankQuantity===1,'Bank tool inspector retains exact receipt and quantity');

crafted=bulkTransferSelected(crafted,['copy:'+first.id],'bank');
assert(crafted.inventory.stacks.some(row=>row.instanceId===first.id),'Bulk transfer must preserve tool instance IDs');
assert(validateGameCommand({type:'equip_tool',args:{id:'GREENWOOD_HATCHET',instanceId:second.id}}).args?.instanceId===second.id,'Physical equip is accepted by strict game command schema');
const goldBefore=crafted.character!.gold;
crafted=sellGatheringToolCopy(crafted,first.id);
assert(!crafted.inventory.stacks.some(row=>row.instanceId===first.id)&&crafted.inventory.stacks.some(row=>row.instanceId===second.id),'Sell only exact selected copy');
assert(!crafted.account.craftedGatheringToolInstances?.some(row=>row.id===first.id)&&crafted.account.craftedGatheringToolInstances?.some(row=>row.id===second.id),'Sold copy metadata is purged, remaining copy persists');
assert(crafted.character!.gold>goldBefore,'Inventory sale credits Gold');
const reload=normalizeSave(JSON.parse(JSON.stringify(crafted)));
assert(reload.account.craftedGatheringToolInstances?.some(row=>row.id===second.id),'Save reload must preserve the last owned tool roll');
assert(reload.inventory.stacks.some(row=>row.instanceId===second.id),'Save reload must preserve its physical copy');
assert(reload.account.craftedGatheringToolInstances?.every(row=>validateGatheringToolRoll(row,row.itemId)),'Reloaded tool copies must remain valid');
const broken=JSON.parse(JSON.stringify(crafted));
broken.account.craftedGatheringToolInstances.push({...second,id:'invalid:copy',bonus:{stat:'speed',basisPoints:900}});
broken.account.craftedGatheringToolInstances.push({...second});
const cleaned=normalizeSave(broken);
assert(cleaned.account.craftedGatheringToolInstances?.length===1,'Save normalizer rejects invalid and duplicate copy metadata');
const legacyReload=normalizeSave(JSON.parse(JSON.stringify(state)));
assert(Math.abs(gatheringToolTimeMultiplier(legacyReload,'woodcutting')-.4)<1e-9,'Legacy four-tier 60% bonus remains stable across reload');


// Regression: tapping an exact crafted tool must use the tool receipt, not the
// distinct gear-record collection. Legacy untracked copies also remain safe.
const inspected=itemInspectModel(reload,'GREENWOOD_HATCHET',second.id);
assert(inspected.selectedQuality===second.quality&&inspected.rarityId===second.rarity,'Exact tool inspector resolves rarity/quality without throwing a gear-copy error');
assert(inspected.effectLines.some(line=>line.includes(gatheringToolBonusLabel(second))),'Tool inspector shows the actual rolled stat');
assert(itemInspectModel(state,'GREENWOOD_HATCHET').selectedQuality===undefined,'Legacy tool inspection remains neutral');

// Regression: tool forging is timed, makes no item on reservation and stores
// one verifiable physical receipt when the ready job is claimed.
const timedTool=GATHERING_TOOLS.find(row=>row.id==='GREENWOOD_HATCHET')!;
assert(!!timedEquipmentRecipe('CRAFT_GREENWOOD_HATCHET'),'Gathering tool recipes use the shared Forge queue');
let timed=createCharacter(newGame(0),'IRONWARDEN','Timed Tool Smith');
timed={...timed,character:{...timed.character!,level:20,gold:200000},
  skills:timed.skills.map(sk=>sk.skillId==='woodcutting'||sk.skillId==='smithing'?{...sk,level:20,xp:totalXpAtLevel(20)}:sk),
  inventory:{...timed.inventory,capacity:100,stacks:timedTool.recipe.inputs.map(input=>({itemId:input.itemId,quantity:input.quantity*3}))}};
const firstQueue=startEquipmentCraft(timed,'CRAFT_GREENWOOD_HATCHET',10000);
assert(firstQueue.seconds>0&&firstQueue.job.completesAtMs>10000,'Tool job has a real timed Forge duration');
assert(!firstQueue.state.inventory.stacks.some(row=>row.itemId==='GREENWOOD_HATCHET'),'Tool does not appear when work begins');
const secondQueue=startEquipmentCraft(firstQueue.state,'CRAFT_GREENWOOD_HATCHET',10000);
assert(firstQueue.job.id!==secondQueue.job.id,'Same-time tool reservations receive unique job IDs');
// A timer is enforceable, not a cosmetic delay.
let earlyClaimBlocked=false;
try{claimForgeJob(secondQueue.state,firstQueue.job.id,10001,0.5);}catch(error){earlyClaimBlocked=error instanceof Error&&error.message.includes('still in progress');}
assert(earlyClaimBlocked,'Tool cannot be claimed until its real Forge timer completes');
const firstClaim=claimForgeJob(secondQueue.state,firstQueue.job.id,firstQueue.job.completesAtMs+1000,0.5);
assert(firstClaim.kind==='tool','Finished tool job is returned as a tool, never gear or gem');
if(firstClaim.kind==='tool'){
  assert(!!validateGatheringToolRoll(firstClaim.tool,'GREENWOOD_HATCHET'),'A claimed timed tool receives a valid deterministic roll');
  assert(firstClaim.state.inventory.stacks.some(row=>row.instanceId===firstClaim.tool.id),'Claim retains exact rolled physical item');
  const view=itemInspectModel(firstClaim.state,'GREENWOOD_HATCHET',firstClaim.tool.id);
  assert(view.selectedQuality===firstClaim.tool.quality,'Newly queued tool can be inspected without crashing');
  const moved=moveGatheringToolCopy(firstClaim.state,firstClaim.tool.id,'bank');
  const bankView=itemInspectModel(moved,'GREENWOOD_HATCHET',firstClaim.tool.id,'bank');
  assert(bankView.selectedQuality===firstClaim.tool.quality,'Exact claimed tool remains inspectable after transfer into shared Bank');
  assert(bankView.bankQuantity===1,'Tool copy counts include Bank custody');
  const transferredBack=moveGatheringToolCopy(moved,firstClaim.tool.id,'inventory');
  assert(transferredBack.inventory.stacks.some(row=>row.instanceId===firstClaim.tool.id),'Moving claimed tool back preserves receipt identity');
}

// Cancellation returns reserved crafting ingredients but does not silently
// create a tool, grant XP or refund the charged Gold (existing Forge policy).
const cancelState=createCharacter(newGame(0),'IRONWARDEN','Cancel Timed Tool');
const cancelReady={...cancelState,character:{...cancelState.character!,level:20,gold:100000},
 skills:cancelState.skills.map(sk=>sk.skillId==='woodcutting'?{...sk,level:20,xp:totalXpAtLevel(20)}:sk),
 inventory:{...cancelState.inventory,stacks:timedTool.recipe.inputs.map(input=>({itemId:input.itemId,quantity:input.quantity*2}))}};
const pending=startEquipmentCraft(cancelReady,'CRAFT_GREENWOOD_HATCHET',12000);
const cancelled=cancelEquipmentCraft(pending.state,pending.job.id,12001);
assert(cancelled.state.account.equipmentCraftingQueue?.length===0,'Cancelled tool job leaves the Forge queue');
assert(cancelled.state.character!.gold===pending.state.character!.gold,'Forge cancellation does not refund gold');
assert(!cancelled.state.inventory.stacks.some(row=>row.itemId==='GREENWOOD_HATCHET'),'Cancelled tool job creates no physical copy');
for(const input of timedTool.recipe.inputs)
  assert(cancelled.state.inventory.stacks.some(row=>row.itemId===input.itemId&&row.quantity===input.quantity*2),'Cancelling tool forging restores reserved ingredient '+input.itemId);


console.log('Gathering tool affixes: deterministic rolls, 80% cap, rarity, custody and legacy tests passed.');
