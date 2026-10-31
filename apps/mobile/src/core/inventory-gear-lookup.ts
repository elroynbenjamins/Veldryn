/** Immutable render-only index. Preserve Array.find's first-match behavior on malformed duplicate IDs. */
export function indexInventoryGearCopies<T extends {id:string}>(copies:readonly T[]):ReadonlyMap<string,T>{
 const result=new Map<string,T>();
 for(const copy of copies)if(!result.has(copy.id))result.set(copy.id,copy);
 return result;
}
