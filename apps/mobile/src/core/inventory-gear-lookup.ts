import type {CraftedGearOwnershipAudit} from './crafted-gear-ownership';

/** Immutable render-only index. Preserve Array.find's first-match behavior on malformed duplicate IDs. */
export function indexInventoryGearCopies<T extends {id:string}>(copies:readonly T[]):ReadonlyMap<string,T>{
 const result=new Map<string,T>();
 for(const copy of copies)if(!result.has(copy.id))result.set(copy.id,copy);
 return result;
}

/** Render-only projection of an already verified ownership audit. Do not infer
 * physical identities from unmarked stacks or ignore any audit conflict. */
export function inventoryInspectedGearLocations(audit:CraftedGearOwnershipAudit,itemId:string|null,place:'inventory'|'bank',characterId:string|undefined){
 if(audit.problems.length||!itemId)return [];
 return audit.linked.filter(row=>row.itemId===itemId&&row.place===place&&(place==='bank'||row.holderCharacterId===characterId));
}
