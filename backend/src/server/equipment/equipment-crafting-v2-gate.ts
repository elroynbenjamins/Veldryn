/** Server-side counterpart to the hidden Equipment/Crafting 2.0 client gate.
 * Route mounting, authoritative RNG and receipt migration are NOT implemented.
 * Every future V2 write endpoint must call this check after authentication.
 */
export const EQUIPMENT_CRAFTING_V2_SERVER_RELEASED=false;
export function assertEquipmentCraftingV2Released(){
 if(!EQUIPMENT_CRAFTING_V2_SERVER_RELEASED)throw new Error('equipment_crafting_v2_not_released');
}
