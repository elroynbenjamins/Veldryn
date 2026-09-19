import {EQUIPMENT_SETS_V33,EQUIPMENT_PIECES_V33,validateCatalogV33} from '../equipment/equipment-catalog-v33';

/** v33 override for the historical v21 deferred-equipment note. */
export const FROSTMARCH_EQUIPMENT_POLICY_V33={
  equipmentSetsAuthored:true,
  regionalWeaponsAuthored:true,
  regionalArmorAuthored:true,
  slotCount:10,
  thresholds:[2,4,6,8,10] as const,
  skinCompletionPieces:10,
  catalogSetCount:EQUIPMENT_SETS_V33.length,
  catalogPieceCount:EQUIPMENT_PIECES_V33.length,
  visualPolicy:'fresh-generation-male-female-only',
} as const;

export function validateFrostmarchEquipmentPolicyV33():string[]{
  const errors=validateCatalogV33();
  if(FROSTMARCH_EQUIPMENT_POLICY_V33.catalogSetCount!==243)errors.push('set_count');
  if(FROSTMARCH_EQUIPMENT_POLICY_V33.catalogPieceCount!==2430)errors.push('piece_count');
  return errors;
}
