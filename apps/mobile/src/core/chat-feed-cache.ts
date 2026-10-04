/** One authoritative history request per channel, shared by the dock and log. */
export interface ChatFeedSnapshot<T>{value:T;error:string;}

export class ChatFeedCache<T>{
 private snapshot:ChatFeedSnapshot<T>;
 private listeners=new Set<()=>void>();
 private inFlight:Promise<void>|null=null;
 private refreshAgain=false;
 private disposed=false;
 private localRevision=0;
 private loadedAt:number|null=null;

 constructor(private readonly read:()=>Promise<T>,initial:T,private readonly now:()=>number=Date.now){
  this.snapshot={value:initial,error:''};
 }

 getSnapshot=()=>this.snapshot;
 get hasSubscribers(){return this.listeners.size>0;}
 subscribe=(listener:()=>void)=>{this.listeners.add(listener);return()=>{this.listeners.delete(listener);};};
 private publish(next:ChatFeedSnapshot<T>){this.snapshot=next;for(const listener of this.listeners)listener();}
 setValue=(update:T|((previous:T)=>T))=>{
  if(this.disposed)return;
  const value=typeof update==='function'?(update as (previous:T)=>T)(this.snapshot.value):update;
  this.localRevision++;
  this.publish({...this.snapshot,value});
 };

 /** Invalidations during a read require one more read, never parallel requests. */
 refresh=(force=false,maxAgeMs=15000):Promise<void>=>{
  if(this.disposed)return Promise.resolve();
  if(this.inFlight){if(force)this.refreshAgain=true;return this.inFlight;}
  if(!force&&this.loadedAt!==null&&this.now()-this.loadedAt<maxAgeMs)return Promise.resolve();
  this.inFlight=(async()=>{
   do{
    this.refreshAgain=false;
    const localRevision=this.localRevision;
    try{
     const value=await this.read();
     if(this.disposed)return;
     // Blocking a player can filter the visible cache while an older read is
     // in flight. Re-read after the mutation instead of restoring those rows.
     if(localRevision!==this.localRevision){this.refreshAgain=true;continue;}
     this.loadedAt=this.now();
     this.publish({value,error:''});
    }catch(reason){
     if(this.disposed)return;
     // A temporary network error must not blank the conversation or turn an
     // acknowledged send into a failed send that the player sends again.
     const message=reason instanceof Error?reason.message:typeof (reason as {message?:unknown})?.message==='string'?String((reason as {message:string}).message):'Unable to load chat.';
     this.publish({...this.snapshot,error:message});
    }
   }while(this.refreshAgain&&!this.disposed);
  })().finally(()=>{this.inFlight=null;});
  return this.inFlight;
 };

 dispose(){this.disposed=true;this.refreshAgain=false;this.listeners.clear();}
}
