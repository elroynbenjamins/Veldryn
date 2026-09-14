export interface PendingCoopCommand {path:string;body:Record<string,unknown>;}
export class CoopRequestError extends Error{constructor(message:string,readonly definitive=false){super(message);}}
export interface CoopCommandStore {read():Promise<PendingCoopCommand|null>;write(value:PendingCoopCommand|null):Promise<void>;}
/** One durable uncertain mutation per account. Retrying uses its original key
 * and selection even after navigation, restart or a network timeout. */
export class CoopCommandJournal{
 private running=false;
 constructor(private store:CoopCommandStore,private send:(command:PendingCoopCommand)=>Promise<unknown>){}
 async execute(command?:PendingCoopCommand):Promise<unknown>{
  if(this.running)throw new Error('A co-op action is already being saved.');this.running=true;
  try{
   const pending=await this.store.read();
   if(pending&&command)throw new Error('Retry the pending co-op action before starting another one.');
   const next=pending??command;if(!next)throw new Error('No pending co-op action.');
   if(!pending)await this.store.write(next);
   try{const result=await this.send(next);await this.store.write(null);return result;}catch(error){if(error instanceof CoopRequestError&&error.definitive)await this.store.write(null);throw error;}
  }finally{this.running=false;}
 }
 async pending(){return Boolean(await this.store.read());}
}
