import type {GameState} from './types';
import type {EquipmentV2SourceStrategy} from './equipment-crafting-v2-economy';
import type {EquipmentV2RecipePreviewInput} from './equipment-crafting-v2-screen';
import {EQUIPMENT_V2_PIECES,equipmentV2Piece} from '../content/equipment-v2-catalog';
import {equipmentV2RecipesForItem} from '../content/equipment-v2-recipes';
import {equipmentCraftQueueModel} from './equipment-crafting-queue';

/** INTERNAL model adapter — no mutation, no market requests and no live route.
 * Reads the real inventory, Bank and profession levels but never edits them.
 */
export interface EquipmentV2PreviewRoute extends EquipmentV2RecipePreviewInput {
 key:string;methodName:string;recipeId:string;profession:'smithing'|'tailoring';
}
function ownedFromState(state:GameState,itemId:string){
 return [...state.inventory.stacks,...state.bank.stacks].reduce(
  (amount,row)=>amount+(row.itemId===itemId&&row.instanceId===undefined?row.quantity:0),0);
}
export function equipmentV2PreviewRoutesForItem(
 state:GameState,itemId:string,strategy:EquipmentV2SourceStrategy='gather',nowMs=Date.now(),
):readonly EquipmentV2PreviewRoute[]{
 const piece=equipmentV2Piece(itemId);
 if(!piece)return [];
 const queue=equipmentCraftQueueModel(state,nowMs);
 const canEnqueue=queue.freeSlots>0||queue.freeWaiting>0;
 return equipmentV2RecipesForItem(itemId).map(recipe=>{
  const professionLevel=state.skills.find(s=>s.skillId===recipe.profession)?.level??0;
  return {
   key:recipe.id,recipeId:recipe.id,methodName:recipe.route==='foundation'?'Foundation':'Alternate',
   profession:recipe.profession,name:piece.name,tier:piece.tier,slot:piece.slot,
   profile:piece.profile,setPiece:Boolean(piece.setId),
   ingredients:recipe.inputs.map(input=>({
    itemId:input.itemId,required:input.quantity,owned:ownedFromState(state,input.itemId),kind:input.kind,
   })),
   strategy,marketReleased:false,characterLevel:state.character?.level??0,
   professionLevel,goldAvailable:state.character?.gold??0,queueHasCapacity:canEnqueue,
   processingGold:0,
  };
 });
}
export function equipmentV2HiddenCatalogueSummary(){
 return {count:EQUIPMENT_V2_PIECES.length,
  t1:EQUIPMENT_V2_PIECES.filter(p=>p.tier===1).length,
  t2:EQUIPMENT_V2_PIECES.filter(p=>p.tier===2).length,
  t3:EQUIPMENT_V2_PIECES.filter(p=>p.tier===3).length,
  t4:EQUIPMENT_V2_PIECES.filter(p=>p.tier===4).length,
 };
}
