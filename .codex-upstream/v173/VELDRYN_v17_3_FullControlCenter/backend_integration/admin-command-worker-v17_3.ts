export type AdminCommandRisk = 'low'|'medium'|'high'|'critical';
export type AdminCommandStatus = 'approved'|'processing'|'succeeded'|'failed'|'cancelled'|'pending_approval';

export interface AdminCommandRow {
  id:string;
  command_key:string;
  target_account_id:string|null;
  target_character_id:string|null;
  target_ref:string|null;
  parameters_json:Record<string,unknown>;
  reason:string;
  risk_tier:AdminCommandRisk;
  status:AdminCommandStatus;
  idempotency_key:string;
  attempts:number;
  reversible:boolean;
}

export interface CommandReversal { commandKey:string; parameters:Record<string,unknown>; }
export interface AdminCommandResult { summary:string; detail?:Record<string,unknown>; reversal?:CommandReversal; }
export interface AdminCommandContext { idempotencyKey:string; commandId:string; auditReason:string; }
export type AdminCommandHandler = (command:AdminCommandRow, context:AdminCommandContext)=>Promise<AdminCommandResult>;

export interface AdminCommandStore {
  claim(limit:number):Promise<AdminCommandRow[]>;
  succeeded(id:string,result:AdminCommandResult):Promise<void>;
  retry(id:string,error:string,availableAt:string):Promise<void>;
  failed(id:string,error:string):Promise<void>;
  heartbeat(component:string,result:Record<string,unknown>):Promise<void>;
  heartbeatError(component:string,error:string):Promise<void>;
}

export interface AdminCommandWorkerOptions { batchSize?:number; maxAttempts?:number; baseRetrySeconds?:number; }

export class AdminCommandWorker {
  constructor(private readonly store:AdminCommandStore, private readonly handlers:Record<string,AdminCommandHandler>, private readonly options:AdminCommandWorkerOptions={}) {}

  async tick(now=new Date()):Promise<{claimed:number;succeeded:number;retried:number;failed:number;unknown:number}> {
    const batchSize=Math.max(1,Math.min(this.options.batchSize??10,50));
    const maxAttempts=Math.max(1,Math.min(this.options.maxAttempts??5,10));
    const baseRetry=Math.max(5,this.options.baseRetrySeconds??30);
    const result={claimed:0,succeeded:0,retried:0,failed:0,unknown:0};
    try {
      const rows=await this.store.claim(batchSize); result.claimed=rows.length;
      for(const row of rows){
        const handler=this.handlers[row.command_key];
        if(!handler){ await this.store.failed(row.id,`admin_handler_missing:${row.command_key}`); result.unknown++; continue; }
        try {
          const output=await handler(row,{idempotencyKey:`admin-command:${row.idempotency_key}`,commandId:row.id,auditReason:row.reason});
          await this.store.succeeded(row.id,output); result.succeeded++;
        } catch(error){
          const message=error instanceof Error?error.message:String(error);
          if(row.attempts<maxAttempts && isRetryableAdminError(message)){
            const delay=baseRetry*Math.pow(2,Math.max(0,row.attempts-1));
            await this.store.retry(row.id,message,new Date(now.getTime()+delay*1000).toISOString()); result.retried++;
          } else { await this.store.failed(row.id,message); result.failed++; }
        }
      }
      await this.store.heartbeat('admin_command_worker',result); return result;
    } catch(error){ const message=error instanceof Error?error.message:String(error); await this.store.heartbeatError('admin_command_worker',message); throw error; }
  }
}

export function isRetryableAdminError(message:string):boolean {
  const hard=['invalid_','not_found','insufficient_','duplicate_','already_','prohibited_','not_owned','name_taken','receipt_already_settled'];
  return !hard.some(prefix=>message.startsWith(prefix));
}
