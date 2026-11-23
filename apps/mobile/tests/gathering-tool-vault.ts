import {createCharacter,newGame,equipGatheringTool,saveGatheringToolReserve,activateGatheringToolReserve,withdrawGatheringToolReserve,unequipGatheringTool} from '../src/core/game';
import {reservedGatheringTool,equippedGatheringTools,equippedGatheringToolRoll,gatheringToolSkillXpMultiplier} from '../src/core/gathering-tools';
import {mintGatheringTool,validateGatheringToolRoll} from '../src/core/gathering-tool-rolls';
import {validateGameCommand,executeGameCommand} from '../src/core/game-commands';
import {auditCraftedGearOwnership} from '../src/core/crafted-gear-ownership';
import {deleteAccountCharacter,characterDeleteConfirmation} from '../src/core/account-actions';
import {normalizeSave} from '../src/core/save-normalization';
import {totalXpAtLevel} from '../src/core/progression';
import type {GameState} from '../src/core/types';

function ok(condition:unknown,message:string):asserts condition{if(!condition)throw new Error(message)}
function rejects(action:()=>unknown,reason:string){
 let rejected=false;
 try{action();}catch{rejected=true;}
 ok(rejected,reason);
}
const toolId='GREENWOOD_HATCHET';
let state=createCharacter(newGame(0),'IRONWARDEN','Vault Tester');
const first={...mintGatheringTool(toolId,state.character!.id,'tool-vault-A',101),rarity:'rare' as const,quality:74,bonus:{stat:'speed' as const,basisPoints:500}};
const second={...mintGatheringTool(toolId,state.character!.id,'tool-vault-B',102),rarity:'epic' as const,quality:86,bonus:{stat:'xp' as const,basisPoints:350}};
const third={...mintGatheringTool(toolId,state.character!.id,'tool-vault-C',103),rarity:'rare' as const,quality:64,bonus:{stat:'rarity' as const,basisPoints:320}};
ok([first,second,third].every(row=>validateGatheringToolRoll(row,toolId)),'Fixture must use independently validated crafted receipts');
state={...state,character:{...state.character!,level:46},
 skills:state.skills.map(skill=>skill.skillId==='woodcutting'?{...skill,level:46,xp:totalXpAtLevel(46)}:skill),
 account:{...state.account,craftedGatheringToolInstances:[first,second,third]},
 inventory:{...state.inventory,stacks:[first,second,third].map(row=>({itemId:toolId,quantity:1,instanceId:row.id}))}};
const originalInventory=state.inventory.stacks.length;
state=equipGatheringTool(state,toolId,100,first.id);
ok(state.inventory.stacks.length===originalInventory-1,'Equipping first copy removes its inventory stack');
ok(state.character?.equippedToolInstanceIdsByTier?.woodcutting?.[1]===first.id,'Existing equipped slots are the permanent active slot');
ok(!reservedGatheringTool(state,'woodcutting',1),'Old saves start with no invented reserve');
state=saveGatheringToolReserve(state,toolId,second.id,101);
ok(state.inventory.stacks.length===originalInventory-2,'Saving a reserve removes it from normal Inventory capacity');
ok(reservedGatheringTool(state,'woodcutting',1)?.instanceId===second.id,'Reserve remembers exact physical receipt');
ok(equippedGatheringToolRoll(state,'woodcutting',1)?.id===first.id,'Saving reserve must not activate its bonus');
ok(gatheringToolSkillXpMultiplier(state,'woodcutting')===1,'Inactive XP affix must not earn XP');
ok(gatheringToolSkillXpMultiplier(state,'mining')===1,'Tools cannot grant another profession XP');
rejects(()=>saveGatheringToolReserve(state,toolId,third.id,102),'A third copy cannot enter a full two-copy tier');
ok(state.inventory.stacks.some(row=>row.instanceId===third.id),'Rejected third save must stay in Inventory');
const fullInventory:GameState={...state,inventory:{...state.inventory,capacity:1}};
ok(activateGatheringToolReserve(fullInventory,'woodcutting',1,102).inventory.stacks.length===1,'A full Inventory must not block swapping saved copies');
rejects(()=>withdrawGatheringToolReserve(fullInventory,'woodcutting',1),'Withdrawing a reserve into a full Inventory must reject without loss');
ok(fullInventory.character?.savedToolInstanceIdsByTier?.woodcutting?.[1]===second.id,'Rejected full-inventory withdrawal must leave the reserve untouched');
const swapBefore=state.inventory.stacks.length;
state=activateGatheringToolReserve(state,'woodcutting',1,103);
ok(state.inventory.stacks.length===swapBefore,'Activating saved copy must not require free Inventory slots');
ok(equippedGatheringToolRoll(state,'woodcutting',1)?.id===second.id,'Saved copy becomes active');
ok(reservedGatheringTool(state,'woodcutting',1)?.instanceId===first.id,'Previous active physical copy becomes reserve');
ok(Math.abs(gatheringToolSkillXpMultiplier(state,'woodcutting')-1.035)<1e-9,'Only active XP roll applies');
state=activateGatheringToolReserve(state,'woodcutting',1,104);
ok(equippedGatheringToolRoll(state,'woodcutting',1)?.id===first.id,'Swap is reversible');
ok(gatheringToolSkillXpMultiplier(state,'woodcutting')===1,'Reactivated speed copy removes XP bonus');
const roundTrip=normalizeSave(state) as GameState;
ok(roundTrip.character?.savedToolInstanceIdsByTier?.woodcutting?.[1]===second.id,'Save normalization must preserve reserved receipt');
ok(roundTrip.character?.equippedToolInstanceIdsByTier?.woodcutting?.[1]===first.id,'Save normalization must preserve active receipt');
ok(validateGameCommand({type:'tool_vault_activate',args:{skillId:'woodcutting',tier:1}}).type==='tool_vault_activate','Activation must be accepted by game command validator');
rejects(()=>validateGameCommand({type:'tool_vault_activate',args:{skillId:'woodcutting',tier:1,instanceId:'unverified'}}),'Command allowlist must reject extra owner or receipt hints');
rejects(()=>executeGameCommand(state,{type:'tool_vault_activate',args:{skillId:'herbalism',tier:1}},105),'Reserve command must reject unsupported skills');
state=executeGameCommand(state,{type:'tool_vault_activate',args:{skillId:'woodcutting',tier:1}},105).state;
ok(equippedGatheringToolRoll(state,'woodcutting',1)?.id===second.id,'Authoritative command activates correct reserve');
state=executeGameCommand(state,{type:'tool_vault_withdraw',args:{skillId:'woodcutting',tier:1}},106).state;
ok(!reservedGatheringTool(state,'woodcutting',1),'Withdrawal must clear saved slot');
ok(state.inventory.stacks.some(row=>row.instanceId===first.id),'Withdrawing returns original physical receipt to Inventory');
ok(equippedGatheringToolRoll(state,'woodcutting',1)?.id===second.id,'Withdrawing inactive reserve preserves active roll');
state=saveGatheringToolReserve(state,toolId,first.id,107);
state=unequipGatheringTool(state,'woodcutting',108,toolId);
ok(equippedGatheringToolRoll(state,'woodcutting',1)?.id===first.id,'Unequipping active promotes reserve');
ok(!reservedGatheringTool(state,'woodcutting',1),'Promoted reserve does not remain duplicated in storage');
ok(state.inventory.stacks.some(row=>row.instanceId===second.id),'Removed active copy returns to Inventory');
ok(new Set(state.inventory.stacks.filter(row=>!!row.instanceId).map(row=>row.instanceId)).size===state.inventory.stacks.filter(row=>!!row.instanceId).length,'No physical receipt may duplicate in Inventory');
const reserveSaved=saveGatheringToolReserve(state,toolId,second.id,110);
const auditBefore=auditCraftedGearOwnership(reserveSaved);
ok(!auditBefore.problems.some(problem=>problem.includes('Duplicate gathering tool copy')),'Active and reserve IDs are distinct for the custody audit');
const duplicatedReceipt:GameState={...reserveSaved,inventory:{...reserveSaved.inventory,stacks:[...reserveSaved.inventory.stacks,{itemId:toolId,quantity:1,instanceId:first.id}]}};
ok(auditCraftedGearOwnership(duplicatedReceipt).problems.some(problem=>problem.includes('Duplicate gathering tool copy')),'Custody audit must detect a vaulted copy forged into Inventory');
const deleted=deleteAccountCharacter(reserveSaved,reserveSaved.character!.id,characterDeleteConfirmation(reserveSaved.character!.name),112);
const recovered=[...deleted.bank.stacks,...deleted.overflow.stacks];
ok(recovered.some(row=>row.instanceId===first.id)&&recovered.some(row=>row.instanceId===second.id),'Deleting the character must recover both vaulted physical receipts');
ok(recovered.some(row=>row.instanceId===third.id),'Deleting the character must also preserve unsaved Inventory copies');
const legacy=createCharacter(newGame(0),'IRONWARDEN','Vault Legacy');
const old:GameState={...legacy,character:{...legacy.character!,level:46,equippedToolIds:{woodcutting:toolId}},
 skills:legacy.skills.map(skill=>skill.skillId==='woodcutting'?{...skill,level:46,xp:totalXpAtLevel(46)}:skill),
 inventory:{...legacy.inventory,stacks:[{itemId:toolId,quantity:1}]}};
// A save with the single old best-tool pointer must retain its original
// tier when a different new tier is equipped.
const previousHighTool='ASTER_IRON_HATCHET';
const migrated:GameState={...old,character:{...old.character!,equippedToolIds:{woodcutting:previousHighTool}}};
const modernAdded=equipGatheringTool(migrated,toolId,100);
ok(equippedGatheringTools(modernAdded,'woodcutting').length===2,'Legacy equipped tier is retained when another tier is added');
ok(equippedGatheringTools(modernAdded,'woodcutting').some(tool=>tool.id===previousHighTool),'Modern tier migration cannot silently discard the legacy tool');
const savedLegacy=saveGatheringToolReserve(old,toolId,undefined,100);
ok(equippedGatheringTools(savedLegacy,'woodcutting').length===1,'Legacy pointer still contributes exactly once');
ok(reservedGatheringTool(savedLegacy,'woodcutting',1)?.tool.id===toolId,'Pre-affix copy can be saved without inventing a rolled receipt');
ok(savedLegacy.inventory.stacks.every(stack=>stack.itemId!==toolId),'Legacy saved tool is outside Inventory');
const activatedLegacy=activateGatheringToolReserve(savedLegacy,'woodcutting',1,101);
ok(equippedGatheringTools(activatedLegacy,'woodcutting').length===1,'Legacy swap does not duplicate tier speed');
ok(gatheringToolSkillXpMultiplier(activatedLegacy,'woodcutting')===1,'Legacy reserve cannot create XP roll');
console.log('PASS gathering tool vault: storage, migration, copy switching, command validation, and skill XP isolation');
