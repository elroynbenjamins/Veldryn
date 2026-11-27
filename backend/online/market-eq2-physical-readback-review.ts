/**
 * Hidden source-shaped inspection, never a writer. Based on pinned Forge
 * V2LegacyAccountCustodyView and actual online GameState row conventions.
 * A service must independently authenticate and lock the complete account.
 * Caller-shaped rows and successful diagnostics do NOT establish authority.
 */
type Obj=Record<string,unknown>;
type Location='inventory'|'pouch'|'bank'|'equipped'|'overflow';
type Copy={location:Location;characterId:string|null;itemId:string|null};
const obj=(x:unknown):x is Obj=>!!x&&typeof x==='object'&&!Array.isArray(x)&&
 (Object.getPrototypeOf(x)===Object.prototype||Object.getPrototypeOf(x)===null);
const id=(x:unknown):x is string=>typeof x==='string'&&x.length>0&&x.length<=180&&
 !['__proto__','constructor','prototype'].includes(x);
const safe=(x:unknown):x is number=>typeof x==='number'&&Number.isSafeInteger(x)&&x>=0;
type Input={actorAccountId:string;expectedRevision:number;ownedCharacterIds:readonly string[];
 row:unknown;instanceId:string;itemId:string;expectedLocation:Location;
 expectedCharacterId:string|null;protectedInstanceIds:readonly string[]};
export type MarketPhysicalReadback={reason:string;physicalMatch:boolean;canCommit:false;marketAuthorized:false};
export function inspectMarketPhysicalReadback(input:Input):MarketPhysicalReadback{
 const result=(reason:string,physicalMatch=false):MarketPhysicalReadback=>({reason,physicalMatch,canCommit:false,marketAuthorized:false});
 try{
  if(!input||!id(input.actorAccountId)||!safe(input.expectedRevision)||!id(input.instanceId)||!id(input.itemId)||
   !Array.isArray(input.ownedCharacterIds)||!input.ownedCharacterIds.every(id)||
   new Set(input.ownedCharacterIds).size!==input.ownedCharacterIds.length||
   !Array.isArray(input.protectedInstanceIds)||!input.protectedInstanceIds.every(id)||
   !obj(input.row)||input.row.account_id!==input.actorAccountId||input.row.revision!==input.expectedRevision||
   !obj(input.row.state))return result('account_or_revision');
  const state=input.row.state;
  if((state.version!==6&&state.version!==11)||!obj(state.account)||!obj(state.character)||
     !id(state.character.id)||state.character.id!==input.row.character_id||
     !obj(state.settings)||!Array.isArray(state.settings.lockedItemIds)||!state.settings.lockedItemIds.every(id)||
     !Array.isArray(state.settings.favoriteItemIds)||!state.settings.favoriteItemIds.every(id))
    return result('incomplete_state');
  const copies:Copy[]=[];
  const scan=(container:unknown,location:Location,characterId:string|null)=>{
   if(!obj(container)||!Array.isArray(container.stacks))throw Error('missing_store');
   if(location!=='overflow'&&(!safe(container.capacity)||container.stacks.length>container.capacity))throw Error('invalid_capacity');
   for(const stack of container.stacks){
    if(!obj(stack)||!id(stack.itemId)||!safe(stack.quantity)||stack.quantity<1)throw Error('invalid_stack');
    if(stack.instanceId!==undefined&&!id(stack.instanceId))throw Error('invalid_instance');
    if(stack.instanceId===input.instanceId){
     if(stack.quantity!==1)throw Error('invalid_exact_quantity');
     copies.push({location,characterId,itemId:stack.itemId as string});
    }
   }
  };
  const owners=new Set<string>();
  const character=(c:unknown,inventory:unknown,overflow:unknown)=>{
   if(!obj(c)||!id(c.id)||owners.has(c.id))throw Error('invalid_character');
   owners.add(c.id);
   scan(inventory,'inventory',c.id);
   scan(overflow,'overflow',c.id);
   // Missing optional legacy pouch is ambiguous for an authoritative EQ2
   // inspection; require complete materialized state rather than assume empty.
   scan(c.equipmentPouch,'pouch',c.id);
   if(!obj(c.equipmentInstanceIds))throw Error('missing_equipped_map');
   for(const value of Object.values(c.equipmentInstanceIds)){
    if(value!==undefined&&!id(value))throw Error('invalid_equipped_id');
    if(value===input.instanceId)copies.push({location:'equipped',characterId:c.id,itemId:null});
   }
  };
  scan(state.bank,'bank',null);
  character(state.character,state.inventory,state.overflow);
  if(!Array.isArray(state.otherCharacters))return result('incomplete_roster');
  for(const entry of state.otherCharacters){
   if(!obj(entry))return result('invalid_character');
   character(entry.character,entry.inventory,entry.overflow);
  }
  if(owners.size!==input.ownedCharacterIds.length||input.ownedCharacterIds.some(c=>!owners.has(c)))return result('roster_mismatch');
  // craftedGearInstances is a legacy metadata registry, NOT another physical
  // location. Matching old registry ID is a collision, not a second mint.
  const legacy=state.account.craftedGearInstances;
  if(!Array.isArray(legacy)||legacy.some(x=>!obj(x)||!id(x.id)))return result('incomplete_legacy_registry');
  if(legacy.some(x=>x.id===input.instanceId))return result('legacy_instance_collision');
  if(copies.length!==1)return result('physical_copy_count');
  const copy=copies[0];
  if(copy.location!==input.expectedLocation||copy.characterId!==input.expectedCharacterId||
     (copy.itemId!==null&&copy.itemId!==input.itemId))return result('physical_location_mismatch');
  if(copy.location==='equipped'||copy.location==='overflow'||copy.location==='bank')return result('location_not_listable',true);
  const protectedIds=[...state.settings.lockedItemIds,...state.settings.favoriteItemIds,...input.protectedInstanceIds];
  if(protectedIds.includes(input.instanceId)||protectedIds.includes(input.itemId))return result('protected_copy',true);
  return result('physical_match_requires_original_mint_and_atomic_recheck',true);
 }catch(error){return result(error instanceof Error?error.message:'invalid_snapshot');}
}
