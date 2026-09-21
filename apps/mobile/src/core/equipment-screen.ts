import {equipmentLoadoutGuidesFor} from '../content/loadouts';
import {itemDef} from '../content/items';
import {effectiveStats,regionalReadiness} from './game';
import type {GameState,GearSlot} from './types';
import {enhancedGearStats,gearEnhancement,gemSocketCapacity,gemSocketState} from './equipment-enhancement';
import {gearInstanceById,migrateToPerInstanceGear} from './gear-instances';

// V33 display order is authoritative. The local state keeps the historical
// `offhand` key, so only the presentation order changes here.
export const EQUIPMENT_SLOT_ORDER:GearSlot[]=['helmet','chest','gloves','legs','boots','weapon','offhand','cape','amulet','ring'];
export const EQUIPMENT_SLOT_LABELS:Record<GearSlot,string>={helmet:'Helmet',amulet:'Amulet',chest:'Chest',ring:'Ring',gloves:'Gloves',weapon:'Weapon',legs:'Legs',offhand:'Off-hand',boots:'Boots',cape:'Cape'};

export function equipmentScreenModel(state:GameState){
  if(!state.character)throw new Error('Equipment requires a character');
  const projected=migrateToPerInstanceGear(state),stats=effectiveStats(projected),readiness=regionalReadiness(projected);
  const slots=EQUIPMENT_SLOT_ORDER.map(slot=>{const itemId=projected.character!.equipment[slot],instanceId=projected.character!.equipmentInstanceIds?.[slot],instance=instanceId?gearInstanceById(projected,instanceId):undefined,enhancement=itemId?gearEnhancement(projected,itemId,instanceId):undefined,sockets=itemId?gemSocketState(projected,itemId,instanceId):undefined;return {slot,label:EQUIPMENT_SLOT_LABELS[slot],itemId,instanceId,instance,item:itemId?itemDef(itemId):undefined,rarity:instance?.rarity,enhancement,enhancedStats:itemId?enhancedGearStats(projected,itemId,instanceId):undefined,socketCapacity:itemId?gemSocketCapacity(itemId):0,statGemFilled:Boolean(sockets?.statGemId),effectGemFilled:Boolean(sockets?.effectGemId)};});
  return {slots,equippedCount:slots.filter(slot=>slot.item).length,stats:{...stats,maxHp:stats.hp,currentHp:projected.character!.currentHp,readiness:readiness.total},loadouts:equipmentLoadoutGuidesFor(projected.character!.classId)};
}
