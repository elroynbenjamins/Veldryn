import {equipmentLoadoutGuidesFor} from '../content/loadouts';
import {itemDef} from '../content/items';
import {effectiveStats,regionalReadiness} from './game';
import type {GameState,GearSlot} from './types';
import {activeSocketedGemIds,enhancedGearStats,gearEnhancement,gemSocketCapacity} from './equipment-enhancement';

// V33 display order is authoritative. The local state keeps the historical
// `offhand` key, so only the presentation order changes here.
export const EQUIPMENT_SLOT_ORDER:GearSlot[]=['helmet','chest','gloves','legs','boots','weapon','offhand','cape','amulet','ring'];
export const EQUIPMENT_SLOT_LABELS:Record<GearSlot,string>={helmet:'Helmet',amulet:'Amulet',chest:'Chest',ring:'Ring',gloves:'Gloves',weapon:'Weapon',legs:'Legs',offhand:'Off-hand',boots:'Boots',cape:'Cape'};

export function equipmentScreenModel(state:GameState){
  if(!state.character)throw new Error('Equipment requires a character');
  const stats=effectiveStats(state),readiness=regionalReadiness(state);
  const slots=EQUIPMENT_SLOT_ORDER.map(slot=>{const itemId=state.character!.equipment[slot],enhancement=itemId?gearEnhancement(state,itemId):undefined;return {slot,label:EQUIPMENT_SLOT_LABELS[slot],itemId,item:itemId?itemDef(itemId):undefined,enhancement,enhancedStats:itemId?enhancedGearStats(state,itemId):undefined,socketed:itemId?activeSocketedGemIds(state,itemId).length:0,socketCapacity:itemId?gemSocketCapacity(itemId):0};});
  return {slots,equippedCount:slots.filter(slot=>slot.item).length,stats:{...stats,maxHp:stats.hp,currentHp:state.character.currentHp,readiness:readiness.total},loadouts:equipmentLoadoutGuidesFor(state.character.classId)};
}
