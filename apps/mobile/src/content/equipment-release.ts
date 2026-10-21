/**
 * Presentation release gate for the V33 equipment catalog. The complete
 * catalog remains registered so existing saves can still be read safely, but
 * tiers without finished artwork cannot be crafted, selected, or surfaced.
 */
export const MAX_RELEASED_EQUIPMENT_TIER=4;

export function equipmentTierNumber(tier:string|undefined){
  return Number(String(tier??'').replace(/\D/g,''))||0;
}

export function isReleasedEquipmentTier(tier:string|undefined){
  const number=equipmentTierNumber(tier);
  return number>0&&number<=MAX_RELEASED_EQUIPMENT_TIER;
}

/** Non-V33 gear (starter and novice items) is always available. */
export function isReleasedEquipmentItemId(itemId:string){
  const match=/^T(\d+)[PX]_\d{3}$/.exec(itemId);
  return !match||Number(match[1])<=MAX_RELEASED_EQUIPMENT_TIER;
}
