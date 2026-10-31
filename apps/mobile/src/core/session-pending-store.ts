/**
 * Session-local pending command cache. Android storage remains authoritative
 * across app/process restarts. Reads in one authenticated repository instance
 * are coalesced, but successful writes still reach durable storage first.
 *
 * Never share this instance across accounts or login sessions.
 */
export interface DurablePendingStore<T>{
 read():Promise<T|null>;
 write(value:T|null):Promise<void>;
}
export class SessionPendingStore<T> implements DurablePendingStore<T>{
 private cached:{value:T|null}|undefined;
 private reading:Promise<T|null>|null=null;
 private writes:Promise<void>=Promise.resolve();
 private queuedWrites=0;
 constructor(private readonly durable:DurablePendingStore<T>){}

 async read():Promise<T|null>{
  // Pending mutations must finish before a read can use cached state.
  // A failed durable write invalidates the cache; then a new read rechecks storage.
  if(this.queuedWrites)await this.writes;
  if(this.cached)return this.cached.value;
  if(this.reading)return this.reading;
  const task=Promise.resolve().then(()=>this.durable.read()).then(value=>{
   this.cached={value};
   return value;
  });
  this.reading=task;
  try{return await task;}finally{if(this.reading===task)this.reading=null;}
 }
 async write(value:T|null):Promise<void>{
  this.queuedWrites++;
  // Writes are ordered, even if the caller accidentally overlaps them.
  const operation=this.writes.then(async()=>{
   if(this.reading)await this.reading;
   try{
    await this.durable.write(value);
    this.cached={value};
   }catch(error){
    this.cached=undefined;
    throw error;
   }
  });
  this.writes=operation.then(()=>undefined,()=>undefined);
  try{await operation;}finally{this.queuedWrites--;}
 }
}
