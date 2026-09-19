export function normalizeOwnedPetIds(...sources:unknown[]):string[]{
  const ids:string[]=[];
  for(const source of sources){
    if(!Array.isArray(source))continue;
    for(const value of source){
      if(typeof value!=='string')continue;
      const id=value.trim();
      if(id&&!ids.includes(id))ids.push(id);
    }
  }
  return ids;
}

/**
 * Keep a selected legacy/unknown pet if it is still owned. This makes save
 * migration non-destructive even when content packs are installed later.
 */
export function normalizeSelectedPetId(value:unknown,ownedIds:readonly string[]):string|undefined{
  if(typeof value!=='string')return undefined;
  const id=value.trim();
  return id&&ownedIds.includes(id)?id:undefined;
}
