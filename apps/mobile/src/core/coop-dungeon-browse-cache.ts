import type {CoopDungeonProjection} from './coop-dungeon-browsing';

/** Only browse projections belong on disk. Never persist dungeon runs, party
 * membership, verified loadouts, reward balances, or active event status. */
export interface CoopBrowseCatalog {dungeons:CoopDungeonProjection[];savedAtMs:number}
export interface CoopCatalogStore {getItem:(key:string)=>Promise<string|null>;setItem:(key:string,value:string)=>Promise<unknown>}
export const COOP_BROWSE_CATALOG_MAX_AGE_MS=24*60*60*1000;
const VERSION=1;
const MAX_CATALOG_DUNGEONS=100;
const MAX_MEMORY_ENTRIES=4;

function validCatalog(value:unknown):value is CoopBrowseCatalog{
 if(!value||typeof value!=='object')return false;
 const row=value as Partial<CoopBrowseCatalog>;
 return Number.isFinite(row.savedAtMs)&&typeof row.savedAtMs==='number'&&Array.isArray(row.dungeons)&&row.dungeons.length<=MAX_CATALOG_DUNGEONS&&row.dungeons.every(dungeon=>
   dungeon&&typeof dungeon.id==='string'&&dungeon.id.length>0&&
   typeof dungeon.name==='string'&&dungeon.name.length>0&&
   Number.isInteger(dungeon.minLevel)&&dungeon.minLevel>=1&&
   (dungeon.available===undefined||typeof dungeon.available==='boolean'));
}

/** Account + character scoped, bounded, versioned, cache-first catalog.
 * Entries are UI previews, NEVER authorization for starting a run. */
export class CoopDungeonBrowseCache{
 private readonly entries=new Map<string,CoopBrowseCatalog>();
 constructor(private readonly store:CoopCatalogStore,private readonly now:()=>number=Date.now){}
 private key(scope:string){return 'veldryn.coop.dungeon-catalog.v'+VERSION+'.'+encodeURIComponent(scope);}
 private validAge(value:CoopBrowseCatalog){const age=this.now()-value.savedAtMs;return age>=0&&age<COOP_BROWSE_CATALOG_MAX_AGE_MS;}
 peek(scope:string):CoopBrowseCatalog|undefined{
  const value=this.entries.get(scope);
  if(!value)return undefined;
  if(!this.validAge(value)){this.entries.delete(scope);return undefined;}
  this.entries.delete(scope);this.entries.set(scope,value);
  return value;
 }
 async read(scope:string):Promise<CoopBrowseCatalog|undefined>{
  const remembered=this.peek(scope);if(remembered)return remembered;
  try{
   const raw=await this.store.getItem(this.key(scope));
   if(!raw||raw.length>220000)return undefined;
   const decoded:unknown=JSON.parse(raw);
   if(!decoded||typeof decoded!=='object'||(decoded as {version?:number}).version!==VERSION)return undefined;
   if(!validCatalog(decoded)||!this.validAge(decoded))return undefined;
   // A faster server response may already have saved a newer catalog while
   // AsyncStorage was reading. Never restore older data over it.
   const newer=this.peek(scope);
   if(newer)return newer;
   this.remember(scope,decoded);
   return decoded;
  }catch{return undefined;}
 }
 remember(scope:string,value:CoopBrowseCatalog){
  if(!scope||!validCatalog(value)||!this.validAge(value))return;
  this.entries.delete(scope);this.entries.set(scope,value);
  while(this.entries.size>MAX_MEMORY_ENTRIES)this.entries.delete(this.entries.keys().next().value!);
 }
 async save(scope:string,dungeons:CoopDungeonProjection[]):Promise<void>{
  const entry:CoopBrowseCatalog={savedAtMs:this.now(),dungeons};
  if(!scope||!validCatalog(entry))return;
  this.remember(scope,entry);
  try{await this.store.setItem(this.key(scope),JSON.stringify({version:VERSION,...entry}));}
  catch{/* Storage failure cannot interrupt a working dungeon session. */}
 }
 clear(){this.entries.clear();}
}


// Mutation receipts cannot be served out of an old entry snapshot. A monotonic
// version lets the co-op client invalidate recent in-memory entry reads without
// importing the entry source (which itself uses the co-op client).
let entryMutationRevision=0;
export function noteCoopEntryMutation(){entryMutationRevision++;}
export function coopEntryMutationRevision(){return entryMutationRevision;}
