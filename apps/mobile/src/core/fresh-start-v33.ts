import {itemDef} from '../content/items';
import {EQUIPMENT_ITEMS_V33} from '../content/equipment-items-v33';
import {CharacterState,GameState,ItemStack} from './types';

/** IDs emitted by the v33 ten-slot catalog (P=primary, X=alternate path). */
export function isV33EquipmentPieceId(id:string):boolean{
  return /^T[1-9][PX]_\d{3}$/.test(id);
}
const knownV33PieceIds=new Set(EQUIPMENT_ITEMS_V33.map(item=>item.id));
export function isKnownV33EquipmentPieceId(id:string):boolean{return knownV33PieceIds.has(id);}
export function invalidV33EquipmentIds(input:GameState):string[]{
  const ids:string[]=[];
  const scan=(value:unknown)=>{if(typeof value==='string'&&isV33EquipmentPieceId(value)&&!isKnownV33EquipmentPieceId(value))ids.push(value);};
  const scanScope=(scope:any)=>{if(!scope)return;Object.values(scope.character?.equipment??{}).forEach(scan);[...(scope.inventory?.stacks??[]),...(scope.bank?.stacks??[]),...(scope.overflow?.stacks??[])].forEach((stack:any)=>scan(stack.itemId));};
  scanScope(input);(input.otherCharacters??[]).forEach(scanScope);
  return [...new Set(ids)];
}

/**
 * v33 deliberately starts equipment progression from a clean boundary. Keep
 * starter/novice gear, tools, materials and currencies, but discard older
 * catalog gear that carried an equipmentSetId. Unknown IDs are left alone so
 * this migration cannot destroy data owned by a newer client.
 */
export function isLegacyEquipmentSetItemId(id:string):boolean{
  try{
    const def=itemDef(id);
    return def.type==='gear' && !!def.equipmentSetId && !isV33EquipmentPieceId(id);
  }catch{
    return false;
  }
}

function cleanStacks(stacks:ItemStack[]):ItemStack[]{
  return stacks.filter(stack=>!isLegacyEquipmentSetItemId(stack.itemId));
}

function cleanCharacter(character:CharacterState):CharacterState{
  const equipment={...character.equipment};
  for(const [slot,id] of Object.entries(equipment)){
    if(typeof id==='string'&&isLegacyEquipmentSetItemId(id))delete equipment[slot as keyof typeof equipment];
  }
  const savedLoadouts=character.savedLoadouts?.map(loadout=>({
    ...loadout,
    equipment:Object.fromEntries(Object.entries(loadout.equipment).filter(([,id])=>typeof id!=='string'||!isLegacyEquipmentSetItemId(id))),
  }));
  const gearEnhancements=Object.fromEntries(Object.entries(character.gearEnhancements??{}).filter(([id])=>!isLegacyEquipmentSetItemId(id)));
  return {
    ...character,
    equipment,
    gearEnhancements,
    savedLoadouts,
    unlockedSkinIds:['starting'],
    selectedSkinId:'starting',
  };
}

function cleanScope(scope:{character:CharacterState;inventory:{stacks:ItemStack[]};bank?:{stacks:ItemStack[]};overflow:{stacks:ItemStack[]}}){
  scope.character=cleanCharacter(scope.character);
  scope.inventory={...scope.inventory,stacks:cleanStacks(scope.inventory.stacks)};
  if(scope.bank)scope.bank={...scope.bank,stacks:cleanStacks(scope.bank.stacks)};
  scope.overflow={...scope.overflow,stacks:cleanStacks(scope.overflow.stacks)};
}

export function applyFreshStartV33(input:GameState):GameState{
  const state:any={...input};
  if(state.character)cleanScope(state);
  if(Array.isArray(state.otherCharacters)){
    state.otherCharacters=state.otherCharacters.map((entry:any)=>{
      const copy={...entry};
      if(copy.character)cleanScope(copy);
      return copy;
    });
  }
  return state as GameState;
}
