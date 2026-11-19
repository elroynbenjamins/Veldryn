/**
 * Hidden V58: one buff tonic per World Boss account raid.
 *
 * The player names a tonic when reserving an attempt. The server verifies it
 * against its own authoritative GameStates for the party (never client JSON),
 * freezes the choice into the attempt packet and returns the exact stack the
 * reservation transaction must consume together with the attempt ordinal.
 * The tonic's effect is resolved again from the server catalog at settlement;
 * no multiplier ever travels in the packet.
 *
 * NOT live: no route, migration or inventory write is enabled by this module.
 */
import {DUNGEON_ROLE_TONIC_MODIFIERS} from '../src/server/coop/potion-modifiers';
import type {WorldBossOwnerStateV19} from './world-boss-private-pg-v19';

export const WORLD_BOSS_V58_TONIC_LIVE=false as const;
export type WorldBossTonicIdV58=keyof typeof DUNGEON_ROLE_TONIC_MODIFIERS;
export const WORLD_BOSS_V58_TONIC_IDS=Object.freeze(
 Object.keys(DUNGEON_ROLE_TONIC_MODIFIERS) as WorldBossTonicIdV58[]);

export function isWorldBossTonicIdV58(value:unknown):value is WorldBossTonicIdV58{
 return typeof value==='string'&&
  Object.prototype.hasOwnProperty.call(DUNGEON_ROLE_TONIC_MODIFIERS,value);
}

/** One consumed unit, bound to the exact server save revision it was read from. */
export interface WorldBossTonicConsumeV58{
 itemId:WorldBossTonicIdV58;
 characterId:string;
 location:'inventory'|'bank';
 quantity:1;
 expectedGameVersion:number;
}
export interface WorldBossFrozenTonicV58{
 schema:'world-boss-v58-frozen-tonic';
 itemId:WorldBossTonicIdV58;
 consume:WorldBossTonicConsumeV58;
}

function ownedQuantity(stacks:unknown,itemId:string):number{
 if(!Array.isArray(stacks))return 0;
 let total=0;
 for(const stack of stacks){
  if(stack&&typeof stack==='object'&&(stack as {itemId?:unknown}).itemId===itemId){
   const q=(stack as {quantity?:unknown}).quantity;
   if(typeof q==='number'&&Number.isSafeInteger(q)&&q>0)total+=q;
  }
 }
 return total;
}

/**
 * Prefer a party character's own Inventory (unambiguous ownership), in the
 * frozen roster order; fall back to the account Bank. Throws when no party
 * save holds the tonic, so an attempt can never start with an unpaid buff.
 */
export function freezeWorldBossTonicV58(input:{
 itemId:unknown;
 /** Server-owned saves of the exact frozen party, in roster order. */
 states:readonly WorldBossOwnerStateV19[];
}):WorldBossFrozenTonicV58{
 if(!isWorldBossTonicIdV58(input.itemId))throw Error('world_boss_v58_unknown_tonic');
 const itemId=input.itemId;
 if(!Array.isArray(input.states)||input.states.length<1)
  throw Error('world_boss_v58_party_required');
 const consume=(state:WorldBossOwnerStateV19,location:'inventory'|'bank'):WorldBossFrozenTonicV58=>({
  schema:'world-boss-v58-frozen-tonic',itemId,
  consume:{itemId,characterId:state.characterId,location,quantity:1,
   expectedGameVersion:state.gameVersion},
 });
 for(const state of input.states)
  if(ownedQuantity(state.serverState?.inventory?.stacks,itemId)>=1)return consume(state,'inventory');
 for(const state of input.states)
  if(ownedQuantity(state.serverState?.bank?.stacks,itemId)>=1)return consume(state,'bank');
 throw Error('world_boss_v58_tonic_not_owned');
}

/** Settlement-side check that a frozen packet entry is well-formed. */
export function verifyFrozenWorldBossTonicV58(value:unknown,partyIds:readonly string[]):WorldBossFrozenTonicV58|null{
 if(value===undefined||value===null)return null;
 const t=value as Partial<WorldBossFrozenTonicV58>;
 const c=t.consume as Partial<WorldBossTonicConsumeV58>|undefined;
 if(t.schema!=='world-boss-v58-frozen-tonic'||!isWorldBossTonicIdV58(t.itemId)||
  !c||c.itemId!==t.itemId||c.quantity!==1||
  (c.location!=='inventory'&&c.location!=='bank')||
  typeof c.characterId!=='string'||!partyIds.includes(c.characterId)||
  !Number.isSafeInteger(c.expectedGameVersion)||(c.expectedGameVersion??0)<1)
  throw Error('world_boss_v58_corrupt_frozen_tonic');
 return t as WorldBossFrozenTonicV58;
}
