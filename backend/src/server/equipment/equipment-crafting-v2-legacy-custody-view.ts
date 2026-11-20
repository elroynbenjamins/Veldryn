import type {V2LegacyPouchStack} from './equipment-crafting-v2-pouch-snapshot';

/** Minimum read-only slice of the existing V33 account needed for an EQ2
 * delivery preflight. This has NO imports from apps/mobile or UI/runtime.
 * Only an authenticated, server-loaded full account may populate this view.
 * Never use it as a client request or a writable state replacement.
 */
export type V2LegacyGearSlot='weapon'|'offhand'|'helmet'|'chest'|'legs'|
 'boots'|'gloves'|'cape'|'amulet'|'ring';
export interface V2LegacyInventory {
 capacity:number;
 stacks:V2LegacyPouchStack[];
}
export interface V2LegacyCharacter {
 id:string;
 equipmentInstanceIds?:Partial<Record<V2LegacyGearSlot,string>>;
 equipmentPouch?:V2LegacyInventory;
}
export interface V2LegacyAccountCustodyView{
 account:{craftedGearInstances?:readonly {id:string}[]};
 character:V2LegacyCharacter|null;
 otherCharacters?:readonly {
  character:V2LegacyCharacter;
  inventory:V2LegacyInventory;
  overflow:{stacks:V2LegacyPouchStack[]};
 }[];
 bank:V2LegacyInventory;
 inventory:V2LegacyInventory;
 overflow:{stacks:V2LegacyPouchStack[]};
}
