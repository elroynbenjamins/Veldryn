import {equipmentLoadoutGuidesFor} from '../content/loadouts';
import {itemDef} from '../content/items';
import {effectiveStats,regionalReadiness} from './game';
import type {GameState,GearSlot} from './types';
import {enhancedGearStats,gearEnhancement,gemSocketCapacity} from './equipment-enhancement';

export const EQUIPMENT_SLOT_ORDER:GearSlot[]=['helmet','amulet','chest','ring','gloves','weapon','legs','offhand','boots','cape'];
export const EQUIPMENT_SLOT_LABELS:Record<GearSlot,string>={helmet:'Helmet',amulet:'Amulet',chest:'Chest',ring:'Ring',gloves:'Gloves',weapon:'Weapon',legs:'Legs',offhand:'Off-hand',boots:'Boots',cape:'Cape'};

export function equipmentScreenModel(state:GameState){
  if(!state.character)throw new Error('Equipment requires a character');
  const stats=effectiveStats(state),readiness=regionalReadiness(state);
  const slots=EQUIPMENT_SLOT_ORDER.map(slot=>{const itemId=state.character!.equipment[slot],enhancement=itemId?gearEnhancement(state,itemId):undefined;return {slot,label:EQUIPMENT_SLOT_LABELS[slot],itemId,item:itemId?itemDef(itemId):undefined,enhancement,enhancedStats:itemId?enhancedGearStats(state,itemId):undefined,socketCapacity:itemId?gemSocketCapacity(itemId):0};});
  return {slots,equippedCount:slots.filter(slot=>slot.item).length,stats:{maxHp:stats.hp,currentHp:state.character.currentHp,attack:stats.attack,defense:stats.defense,power:stats.power,readiness:readiness.total},loadouts:equipmentLoadoutGuidesFor(state.character.classId)};
}
