import type {GameRepository} from './repository';
import type {GameState,RewardBundle} from './types';
import type {GameCommand,GameCommandResult} from './game-commands';
export interface OnlineSnapshot {accountId:string;state:GameState;version:number;serverNow:number;reward?:RewardBundle;activity?:GameState['activity'];message?:string;won?:boolean;storyBossBattle?:GameCommandResult['storyBossBattle'];upgrade?:GameCommandResult['upgrade'];forgeResults?:GameCommandResult['forgeResults']}
/** Local command context for presentation, including a retry loaded from storage.
 * It is never sent to the server, persisted in a save, or added to a receipt.
 */
export interface ExecutedOnlineCommand extends OnlineSnapshot {executedCommand:GameCommand;recovered?:ExecutedOnlineCommand}
export interface PendingGameCommand {requestId:string;expectedVersion:number;command:GameCommand}
export interface OnlineTransport {read():Promise<OnlineSnapshot>;send(command:PendingGameCommand):Promise<OnlineSnapshot>}
export interface PendingStore {read():Promise<PendingGameCommand|null>;write(value:PendingGameCommand|null):Promise<void>}
export class OnlineCommandError extends Error{constructor(message:string,readonly definitive=false){super(message);}}
export class OnlineGameRepository implements GameRepository{
 snapshot:OnlineSnapshot|null=null;private queue:Promise<unknown>=Promise.resolve();
 constructor(readonly accountId:string,private readonly transport:OnlineTransport,private readonly pending:PendingStore,private readonly key:()=>string){}
 private accept(value:OnlineSnapshot){
  if(value.accountId!==this.accountId)throw new Error('account_mismatch');
  // A foreground read can finish after a newer command or another read.
  if(this.snapshot&&(value.version<this.snapshot.version||(value.version===this.snapshot.version&&value.serverNow<this.snapshot.serverNow)))return this.snapshot;
  this.snapshot=value;return value;
 }
 async refresh(){return this.accept(await this.transport.read());}
 async load(){return (await this.refresh()).state;}
 async save(_state:GameState):Promise<void>{throw new Error('Online saves require a gameplay command.');}
 async reset():Promise<void>{throw new Error('Online characters cannot be reset from a local save action.');}
 async hasPending(){return Boolean(await this.pending.read());}
 async execute(command?:GameCommand):Promise<ExecutedOnlineCommand>{
  const next=this.queue.then(()=>this.executeQueued(command));
  this.queue=next.then(()=>undefined,()=>undefined);
  return next;
 }
 private async executeQueued(command?:GameCommand):Promise<ExecutedOnlineCommand>{
  // A timed-out response is not proof that the gameplay command failed.
  // Replay the durable request ID first, so server receipts stay idempotent.
  const previous=await this.pending.read();
  let recovered:ExecutedOnlineCommand|undefined;
  if(previous){
   recovered=await this.sendPending(previous);
   // Repeating a command while its acknowledgement is uncertain means
   // "recover that command", not "perform the purchase/sale/claim twice".
   // Match the full validated payload, not merely its command type.
   if(!command||JSON.stringify(command)===JSON.stringify(previous.command)||
    (command.type==='claim'&&previous.command.type==='claim'))return recovered;
  }
  if(!command)throw new Error('No pending action.');
  if(!this.snapshot)await this.refresh();
  const request={requestId:this.key(),expectedVersion:this.snapshot!.version,command};
  await this.pending.write(request);
  const completed=await this.sendPending(request);
  return recovered?{...completed,recovered}:completed;
 }

 private async sendPending(request:PendingGameCommand):Promise<ExecutedOnlineCommand>{
   try{const result=await this.transport.send(request);if(result.accountId!==this.accountId)throw new Error('account_mismatch');await this.pending.write(null);
    const confirmed=this.snapshot&&result.version<this.snapshot.version?await this.refresh():this.accept(result);
    // A recovered receipt can be older than a foreground snapshot. Keep its
    // original reward and command result for presentation, but not its stale state.
    return {...confirmed,reward:result.reward,activity:result.activity,message:result.message,
     won:result.won,storyBossBattle:result.storyBossBattle,upgrade:result.upgrade,
     forgeResults:result.forgeResults,executedCommand:request.command};
   }catch(error){if(error instanceof OnlineCommandError&&error.definitive){await this.pending.write(null);await this.refresh();}throw error;}
  }
}
