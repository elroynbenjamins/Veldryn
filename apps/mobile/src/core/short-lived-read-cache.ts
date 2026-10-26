/**
 * Memory-only read cache for already-authorized online UI projections.
 *
 * Callers MUST use a viewer/tenant scoped key and MUST keep mutation/access
 * checks server-authoritative. Nothing here persists data across app restarts.
 * Entries expire from the time a fetch finishes, never when it starts.
 */
export class ShortLivedReadCache<T> {
 private readonly entries=new Map<string,{value?:T;expiresAt:number;pending?:Promise<T>}>();
 constructor(private readonly ttlMs:number,private readonly maxEntries=24){}
 async read(key:string,fetch:()=>Promise<T>,force=false):Promise<T>{
  const now=Date.now(),previous=this.entries.get(key);
  if(!force&&previous?.pending)return previous.pending;
  if(!force&&previous&&previous.expiresAt>now&&'value'in previous){
   this.entries.delete(key);this.entries.set(key,previous);
   return previous.value as T;
  }
  // Force replaces even a pending request; the older response cannot replace it.
  const entry:{value?:T;expiresAt:number;pending?:Promise<T>}={expiresAt:0};
  this.entries.delete(key);this.entries.set(key,entry);
  const pending=(async()=>{
   try{
    const next=await fetch();
    if(this.entries.get(key)===entry){
     entry.value=next;entry.expiresAt=Date.now()+this.ttlMs;entry.pending=undefined;
    }
    return next;
   }catch(error){
    if(this.entries.get(key)===entry)this.entries.delete(key);
    throw error;
   }
  })();
  entry.pending=pending;
  this.trim();
  return pending;
 }
 invalidate(key:string){this.entries.delete(key);}
 clear(){this.entries.clear();}
 private trim(){
  while(this.entries.size>this.maxEntries)this.entries.delete(this.entries.keys().next().value!);
 }
}
