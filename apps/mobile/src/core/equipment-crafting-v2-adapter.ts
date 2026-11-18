import type {GameState} from './types';
import type {EquipmentV2SourceStrategy} from './equipment-crafting-v2-economy';
import type {EquipmentV2RecipePreviewInput} from './equipment-crafting-v2-screen';
import {equipmentV2Set} from '../content/equipment-v2-catalog';
import {EQUIPMENT_V2_ALL_CRAFTABLE_PIECES,equipmentV2CraftablePiece,equipmentV2RecipesForItem} from '../content/equipment-v2-recipes';
import {equipmentCraftQueueModel} from './equipment-crafting-queue';

/** INTERNAL model adapter — no mutation, no market requests and no live route.
 * Reads the real inventory, Bank and profession levels but never edits them.
 */
export interface EquipmentV2PreviewRoute extends EquipmentV2RecipePreviewInput {
 key:string;methodName:string;recipeId:string;profession:'smithing'|'tailoring';recommended?:boolean;
 setBonuses?:readonly {pieces:number;description:string}[];
}
function ownedFromState(state:GameState,itemId:string){
 return [...state.inventory.stacks,...state.bank.stacks].reduce(
  (amount,row)=>amount+(row.itemId===itemId&&row.instanceId===undefined?row.quantity:0),0);
}
export function equipmentV2PreviewRoutesForItem(
 state:GameState,itemId:string,strategy:EquipmentV2SourceStrategy='gather',nowMs=Date.now(),
):readonly EquipmentV2PreviewRoute[]{
 const piece=equipmentV2CraftablePiece(itemId);
 if(!piece)return [];
 const queue=equipmentCraftQueueModel(state,nowMs);
 const canEnqueue=queue.freeSlots>0||queue.freeWaiting>0;
 const variants=equipmentV2RecipesForItem(itemId).map(recipe=>{
  const professionLevel=state.skills.find(s=>s.skillId===recipe.profession)?.level??0;
  return {
   key:recipe.id,recipeId:recipe.id,methodName:recipe.route==='foundation'?'Foundation':'Alternate',
   craftSeconds:recipe.seconds,
   setBonuses:piece.setId?equipmentV2Set(piece.setId)?.bonuses.map(b=>({pieces:b.pieces,description:'+'+b.percent+'% '+b.affix})):undefined,
   profession:recipe.profession,name:piece.name,tier:piece.tier,slot:piece.slot,
   profile:piece.profile,setPiece:Boolean(piece.setId),
   hands:'hands' in piece?piece.hands:undefined,
   equipClass:'classRestriction' in piece?piece.classRestriction:undefined,
   ingredients:recipe.inputs.map(input=>({
    itemId:input.itemId,required:input.quantity,owned:ownedFromState(state,input.itemId),kind:input.kind,
   })),
   strategy,marketReleased:false,characterLevel:state.character?.level??0,
   professionLevel,goldAvailable:state.character?.gold??0,queueHasCapacity:canEnqueue,
   processingGold:0,
  };
 });
 const recommendation=variants.slice().sort((a,b)=>{
  const missingA=a.ingredients.filter(i=>i.owned<i.required);
  const missingB=b.ingredients.filter(i=>i.owned<i.required);
  return missingA.length-missingB.length
   ||missingA.reduce((n,i)=>n+i.required-i.owned,0)-missingB.reduce((n,i)=>n+i.required-i.owned,0);
 })[0]?.key;
 return variants.map(v=>({...v,recommended:v.key===recommendation}));
}
export function equipmentV2HiddenCatalogueSummary(){
 return {count:EQUIPMENT_V2_ALL_CRAFTABLE_PIECES.length,
  t1:EQUIPMENT_V2_ALL_CRAFTABLE_PIECES.filter(p=>p.tier===1).length,
  t2:EQUIPMENT_V2_ALL_CRAFTABLE_PIECES.filter(p=>p.tier===2).length,
  t3:EQUIPMENT_V2_ALL_CRAFTABLE_PIECES.filter(p=>p.tier===3).length,
  t4:EQUIPMENT_V2_ALL_CRAFTABLE_PIECES.filter(p=>p.tier===4).length,
 };
}
