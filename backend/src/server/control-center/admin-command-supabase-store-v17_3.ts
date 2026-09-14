import type { AdminCommandResult, AdminCommandRow, AdminCommandStore } from './admin-command-worker-v17_3';

interface QueryResult<T>{ data:T|null; error:{message:string}|null; }
interface SupabaseTable<T=Record<string,unknown>>{
  update(values:Record<string,unknown>):SupabaseTable<T>;
  insert(values:Record<string,unknown>|Record<string,unknown>[]):Promise<QueryResult<T[]>>;
  eq(column:string,value:unknown):SupabaseTable<T>;
  select(columns?:string):SupabaseTable<T>;
  single():Promise<QueryResult<T>>;
  then<TResult1 = QueryResult<T[]>, TResult2 = never>(onfulfilled?: ((value: QueryResult<T[]>) => TResult1 | PromiseLike<TResult1>) | null, onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null): Promise<TResult1 | TResult2>;
}
export interface SupabaseAdminLike{
  rpc<T=unknown>(fn:string,args?:Record<string,unknown>):Promise<QueryResult<T>>;
  from<T=Record<string,unknown>>(table:string):SupabaseTable<T>;
}

const fail=(error:{message:string}|null)=>{if(error)throw new Error(error.message);};
export class SupabaseAdminCommandStore implements AdminCommandStore{
  constructor(private readonly db:SupabaseAdminLike){}
  async claim(limit:number):Promise<AdminCommandRow[]>{
    const r=await this.db.rpc<AdminCommandRow[]>('claim_ops_admin_commands',{p_limit:limit}); fail(r.error); const rows=r.data??[];
    if(rows.length){ await this.db.from('ops_admin_command_events').insert(rows.map(row=>({command_id:row.id,event_type:'processing',detail_json:{attempt:row.attempts}}))); }
    return rows;
  }
  async succeeded(id:string,result:AdminCommandResult):Promise<void>{
    const now=new Date().toISOString(); const q=await this.db.from('ops_admin_commands').update({status:'succeeded',result_json:result,error_text:null,completed_at:now,locked_at:null,updated_at:now}).eq('id',id).select('*').single(); fail(q.error);
    const e=await this.db.from('ops_admin_command_events').insert({command_id:id,event_type:'succeeded',detail_json:{summary:result.summary,reversal:result.reversal??null}}); fail(e.error);
  }
  async retry(id:string,error:string,availableAt:string):Promise<void>{
    const now=new Date().toISOString(); const q=await this.db.from('ops_admin_commands').update({status:'approved',error_text:error,available_at:availableAt,locked_at:null,updated_at:now}).eq('id',id).select('*').single(); fail(q.error);
    const e=await this.db.from('ops_admin_command_events').insert({command_id:id,event_type:'retry_scheduled',detail_json:{error,availableAt}}); fail(e.error);
  }
  async failed(id:string,error:string):Promise<void>{
    const now=new Date().toISOString(); const q=await this.db.from('ops_admin_commands').update({status:'failed',error_text:error,completed_at:now,locked_at:null,updated_at:now}).eq('id',id).select('*').single(); fail(q.error);
    const e=await this.db.from('ops_admin_command_events').insert({command_id:id,event_type:'failed',detail_json:{error}}); fail(e.error);
  }
  async heartbeat(component:string,result:Record<string,unknown>):Promise<void>{
    const now=new Date().toISOString();
    const q=await this.db.from('liveops_runtime_health').update({last_started_at:now,last_completed_at:now,last_ok_at:now,last_error:null,last_result_json:result,updated_at:now}).eq('component',component).select('*').single();
    if(q.error){ const i=await this.db.from('liveops_runtime_health').insert({component,last_started_at:now,last_completed_at:now,last_ok_at:now,last_result_json:result,updated_at:now}); fail(i.error); }
  }
  async heartbeatError(component:string,error:string):Promise<void>{
    const now=new Date().toISOString();
    const q=await this.db.from('liveops_runtime_health').update({last_completed_at:now,last_error_at:now,last_error:error,updated_at:now}).eq('component',component).select('*').single();
    if(q.error){ const i=await this.db.from('liveops_runtime_health').insert({component,last_completed_at:now,last_error_at:now,last_error:error,updated_at:now}); fail(i.error); }
  }
}
