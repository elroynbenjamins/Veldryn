import {V33_EQUIPMENT_RECIPES} from '../src/content/equipment-recipes-v33';
import {createCharacter,newGame} from '../src/core/game';
import {draftCraftedGearInstance} from '../src/core/crafted-gear-instances';
import {executeGameCommand,validateGameCommand} from '../src/core/game-commands';
import {bulkSelectionSummary,inventoryBulkSelectionId} from '../src/core/inventory-bulk';
import {applyBulkInventoryProtection} from '../src/core/inventory-protection-bulk';
import type {GameState,ItemStack} from '../src/core/types';

function check(condition:unknown,message:string){if(!condition)throw new Error(message)}
function rejects(action:()=>unknown,message:string){let failed=false;try{action()}catch{failed=true}check(failed,message)}
const gearId=V33_EQUIPMENT_RECIPES.find(row=>row.classId==='BASTION'&&row.v33EquipmentTier==='T1')!.output.itemId;
const character=createCharacter(newGame(0),'BASTION','Protection Tester');
const first=draftCraftedGearInstance({itemId:gearId,ownerCharacterId:character.character!.id,jobId:'bulk-protection-a',createdAtMs:50,roll:.02});
const second=draftCraftedGearInstance({itemId:gearId,ownerCharacterId:character.character!.id,jobId:'bulk-protection-b',createdAtMs:51,roll:.03});
const firstStack:ItemStack={itemId:gearId,quantity:1,instanceId:first.id};
const secondStack:ItemStack={itemId:gearId,quantity:1,instanceId:second.id};
const ore:ItemStack={itemId:'COPPER_ORE',quantity:40};
const original:GameState={
  ...character,inventory:{...character.inventory,stacks:[firstStack,ore]},
  bank:{...character.bank,stacks:[secondStack]},
  account:{...character.account,craftedGearInstances:[first,second]},
};
const firstId=inventoryBulkSelectionId(firstStack),secondId=inventoryBulkSelectionId(secondStack);
const locked=executeGameCommand(original,{type:'inventory_preference_bulk',args:{kind:'lock',enabled:true,ids:[firstId,'COPPER_ORE']}},60).state;
check(locked.account.craftedGearInstances?.find(row=>row.id===first.id)?.locked===true,'First exact Forge copy locked');
check(locked.account.craftedGearInstances?.find(row=>row.id===second.id)?.locked!==true,'Other copy must stay unlocked');
check(locked.settings.lockedItemIds?.includes('COPPER_ORE'),'Materials use item-level locks');
check(!original.settings.lockedItemIds?.includes('COPPER_ORE'),'Original save must not mutate');
check(!bulkSelectionSummary(locked,[firstId],'inventory').sellableStackCount,'Locked exact copy cannot be sold');
const favorited=executeGameCommand(locked,{type:'inventory_preference_bulk',args:{kind:'favorite',enabled:true,ids:[firstId,secondId]}},70).state;
check(favorited.settings.favoriteItemIds?.filter(id=>id===gearId).length===1,'Multiple copies share the existing item-type favorite');
check(!bulkSelectionSummary(favorited,[secondId],'bank').sellableStackCount,'Favorites protect bank copies from disposal');
const unstarred=applyBulkInventoryProtection(favorited,[secondId],'favorite',false);
check(!unstarred.settings.favoriteItemIds?.includes(gearId),'Removing a favorite clears the item-type marker');
const unlocked=applyBulkInventoryProtection(unstarred,[firstId,'COPPER_ORE'],'lock',false);
check(unlocked.account.craftedGearInstances?.find(row=>row.id===first.id)?.locked===false,'First exact copy unlocked');
check(!unlocked.settings.lockedItemIds?.includes('COPPER_ORE'),'Material lock removed');
check(bulkSelectionSummary(unlocked,[firstId],'inventory').sellableStackCount===1,'Unlocked first Forge copy can be sold');
const legacyLocked={...original,settings:{...original.settings,lockedItemIds:[gearId]}};
const legacyUnlocked=applyBulkInventoryProtection(legacyLocked,[firstId],'lock',false);
check(!legacyUnlocked.settings.lockedItemIds?.includes(gearId),'Unlocking selected Forge copy clears older item-wide lock');
rejects(()=>applyBulkInventoryProtection(original,['copy:missing'],'lock',true),'Missing exact copy must be rejected');
rejects(()=>applyBulkInventoryProtection(original,['COPPER_ORE','copy:missing'],'favorite',true),'Mixed invalid selections must be atomic');
rejects(()=>applyBulkInventoryProtection(original,[],'favorite',true),'Empty selection rejected');
rejects(()=>applyBulkInventoryProtection(original,Array.from({length:101},()=>firstId),'favorite',true),'100-stack limit enforced');
rejects(()=>validateGameCommand({type:'inventory_preference_bulk',args:{ids:[firstId],kind:'seen',enabled:true}}),'Only lock and favorite commands allowed');
rejects(()=>validateGameCommand({type:'inventory_preference_bulk',args:{ids:[firstId],kind:'lock',enabled:'true'}}),'Enabled must be boolean');
console.log('PASS: atomic selection-based inventory protection, forged-copy identity, item-wide favorites, disposal safety and strict validation');
