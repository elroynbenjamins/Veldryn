import {equipCraftedGearInstance} from './crafted-gear-ownership';
import {effectiveStats,equipItem,equipItemFromEquipmentPouch} from './game';
import type {GameCommand} from './game-commands';
import type {GameState} from './types';

/**
 * Display-only projection for an in-progress weapon swap during an idle hunt.
 *
 * The network command is still sent unchanged and remains server-authoritative:
 * the server settles all elapsed combat with the OLD loadout before equipping.
 * Never persist this projection, increment the snapshot version or apply rewards.
 * Invalid/ambiguous commands simply skip the projection and let the server
 * produce the normal validation error.
 */
export function previewCombatEquipmentCommand(state:GameState,command:GameCommand):GameState|null{
 if(state.activity?.kind!=='combat'||!state.character)return null;
 try{
  if(command.type==='gear_equip'){
   const id=command.args?.instanceId;
   if(typeof id!=='string')return null;
   const next=equipCraftedGearInstance(state,id);
   // Swapping weapons cannot heal a hunter by rebuilding Max HP.
   return {...next,character:{...next.character!,currentHp:Math.min(state.character.currentHp,effectiveStats(next).hp)}};
  }
  if(command.type==='equip'){
   const id=command.args?.id;
   return typeof id==='string'?equipItem(state,id):null;
  }
  if(command.type==='equipment_pouch_equip'){
   const id=command.args?.itemId;
   return typeof id==='string'?equipItemFromEquipmentPouch(state,id):null;
  }
 }catch{
  // The server is the only source of truth for an invalid or stale selection.
 }
 return null;
}
