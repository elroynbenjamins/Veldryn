/**
 * Server-owned, read-only compatibility view of the existing V33 gear pouch.
 *
 * Keep this identical to the legacy `equipmentPouchForCharacter` read contract
 * until the authoritative online-account adapter replaces legacy GameState.
 * Never import mobile inventory, entitlement or UI modules into a 2.0 writer.
 * This does not grant storage slots, unlock equipment, or write live saves.
 */
export const V2_LEGACY_POUCH_CAPACITIES=[30,40,50,60,75,100] as const;
export interface V2LegacyPouchStack {
 itemId:string;
 quantity:number;
 instanceId?:string;
}
export interface V2LegacyPouchSnapshot{
 capacity:number;
 stacks:V2LegacyPouchStack[];
}
export interface V2LegacyPouchOwner{
 equipmentPouch?:{
  capacity:number;
  stacks:V2LegacyPouchStack[];
 };
}
export function v2ServerLegacyPouchSnapshot(
 owner:V2LegacyPouchOwner|null|undefined,
):V2LegacyPouchSnapshot{
 const raw=owner?.equipmentPouch;
 const capacity=raw&&V2_LEGACY_POUCH_CAPACITIES.includes(
  raw.capacity as (typeof V2_LEGACY_POUCH_CAPACITIES)[number],
 )?raw.capacity:V2_LEGACY_POUCH_CAPACITIES[0];
 return {
  capacity,
  stacks:Array.isArray(raw?.stacks)?raw.stacks.map(row=>({...row})):[],
 };
}
