/**
 * Persistent, account-scoped cache for the Community Roadmap read projection.
 * One successful read per viewer per two hours, including across screen reopens
 * and app restarts. Votes are mutations: update the cached projection from the
 * authoritative vote response, without an extra snapshot request.
 */
export const COMMUNITY_ROADMAP_CACHE_TTL_MS=2*60*60*1000;

export interface RoadmapCacheStorage {
  getItem(key:string):Promise<string|null>;
  setItem(key:string,value:string):Promise<void>;
}

export interface RoadmapCachedResult<T>{
  value:T;
  updatedAtMs:number;
  stale:boolean;
  fromCache:boolean;
}

interface CacheEntry<T>{value:T;updatedAtMs:number;}
interface StoredEntry{updatedAtMs:unknown;value:unknown;}

export class CommunityRoadmapReadCache<T>{
  private readonly memory=new Map<string,CacheEntry<T>>();
  private readonly inFlight=new Map<string,Promise<RoadmapCachedResult<T>>>();
  private readonly generations=new Map<string,number>();
  private readonly writes=new Map<string,Promise<void>>();

  constructor(
    private readonly storage:RoadmapCacheStorage,
    private readonly parse:(raw:unknown)=>T,
    private readonly prefix:string,
    private readonly now:()=>number=Date.now,
  ){}

  private storageKey(scope:string){return this.prefix+':'+scope;}
  private validTimestamp(value:unknown){
    const now=this.now();
    return typeof value==='number'&&Number.isSafeInteger(value)
      &&value>=0&&value<=now;
  }
  private isFresh(entry:CacheEntry<T>){
    return this.validTimestamp(entry.updatedAtMs)
      &&this.now()-entry.updatedAtMs<COMMUNITY_ROADMAP_CACHE_TTL_MS;
  }
  private result(entry:CacheEntry<T>,fromCache:boolean):RoadmapCachedResult<T>{
    return {value:entry.value,updatedAtMs:entry.updatedAtMs,
      stale:!this.isFresh(entry),fromCache};
  }
  private async loadStored(key:string):Promise<CacheEntry<T>|undefined>{
    try{
      const raw=await this.storage.getItem(key);
      if(!raw)return;
      const row:StoredEntry=JSON.parse(raw);
      if(!row||!this.validTimestamp(row.updatedAtMs))return;
      return {updatedAtMs:row.updatedAtMs as number,value:this.parse(row.value)};
    }catch{
      // A corrupt or inaccessible local cache is never trusted.
      return;
    }
  }
  private async persist(key:string,entry:CacheEntry<T>){
    const previous=this.writes.get(key)??Promise.resolve();
    const current=previous.catch(()=>{}).then(()=>
      this.storage.setItem(key,JSON.stringify(entry))).catch(()=>{});
    this.writes.set(key,current);
    await current;
    if(this.writes.get(key)===current)this.writes.delete(key);
  }
  async record(scope:string,value:T):Promise<void>{
    const key=this.storageKey(scope);
    this.generations.set(key,(this.generations.get(key)??0)+1);
    const entry={value,updatedAtMs:this.now()};
    this.memory.set(key,entry);
    await this.persist(key,entry);
  }
  read(scope:string,fetch:()=>Promise<T>):Promise<RoadmapCachedResult<T>>{
    const key=this.storageKey(scope),current=this.memory.get(key);
    if(current&&this.isFresh(current))return Promise.resolve(this.result(current,true));
    const existing=this.inFlight.get(key);
    if(existing)return existing;
    const generation=this.generations.get(key)??0;
    const pending=(async()=>{
      let previous=current;
      if(!previous){
        previous=await this.loadStored(key);
        if(previous&&(this.generations.get(key)??0)===generation){
          this.memory.set(key,previous);
          if(this.isFresh(previous))return this.result(previous,true);
        }
      }
      // Another operation (e.g. a vote) can finish while storage is reading.
      if((this.generations.get(key)??0)!==generation){
        const latest=this.memory.get(key);
        if(latest)return this.result(latest,true);
      }
      try{
        const value=await fetch();
        if((this.generations.get(key)??0)!==generation){
          const latest=this.memory.get(key);
          if(latest)return this.result(latest,true);
          // Invalidation without a replacement must not repopulate the cache.
          return {value,updatedAtMs:this.now(),stale:false,fromCache:false};
        }
        const entry={value,updatedAtMs:this.now()};
        this.memory.set(key,entry);
        await this.persist(key,entry);
        return this.result(entry,false);
      }catch(error){
        const latest=this.memory.get(key);
        if(latest)return this.result(latest,true);
        if(previous)return this.result(previous,true);
        throw error;
      }
    })();
    this.inFlight.set(key,pending);
    void pending.finally(()=>{if(this.inFlight.get(key)===pending)this.inFlight.delete(key);}).catch(()=>{});
    return pending;
  }
}
