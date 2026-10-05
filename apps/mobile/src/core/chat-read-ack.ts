/** Only confirmed read cursors are deduplicated. No private history is persisted. */
export class ChatReadAcknowledgement{
 private acknowledgedId:string|undefined;
 private desiredId:string|undefined;
 private active=false;
 private inFlight=false;
 private retryTimer:ReturnType<typeof setTimeout>|undefined;

 constructor(private readonly acknowledge:(messageId:string)=>void|Promise<void>,private readonly retryMs=15000){}

 /** Hiding or backgrounding pauses retries; showing the log retries once. */
 setActive=(active:boolean)=>{
  const resumed=active&&!this.active;
  this.active=active;
  if(!active){if(this.retryTimer!==undefined)clearTimeout(this.retryTimer);this.retryTimer=undefined;}
  else if(resumed)this.flush();
 };

 caughtUp=(messageId:string)=>{
  if(!this.active||!messageId)return;
  this.desiredId=messageId;
  this.flush();
 };

 private flush=()=>{
  if(!this.active||this.inFlight||this.retryTimer!==undefined||!this.desiredId||this.desiredId===this.acknowledgedId)return;
  const messageId=this.desiredId;
  this.inFlight=true;
  void (async()=>{
   let failed=false;
   try{
    await this.acknowledge(messageId);
    this.acknowledgedId=messageId;
   }catch{failed=true;}
   finally{
    this.inFlight=false;
    if(!this.active||this.desiredId===this.acknowledgedId)return;
    if(failed)this.retryTimer=setTimeout(()=>{this.retryTimer=undefined;this.flush();},this.retryMs);
    else this.flush();
   }
  })();
 };
}
