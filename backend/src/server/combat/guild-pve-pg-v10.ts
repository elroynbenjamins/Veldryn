/**
 * VELDRYN GUILD PVE V10 — DISABLED PostgreSQL STATE-ROW ADAPTER.
 *
 * SQL BEGIN / SELECT FOR UPDATE / UPDATE / COMMIT for V9's transaction port.
 * End-to-end test uses filesystem PGlite. It demonstrates persistence after
 * closing/reopening that embedded DB, NOT production multi-worker behavior,
 * actual Supabase migration, authenticated routes or reward settlement.
 *
 * One QA JSONB row per namespace is intentionally not the production schema.
 */
import type {
 GuildPveV9AtomicPort,GuildPveV9StoreState,
} from './guild-pve-transaction-v9';

export const GUILD_PVE_V10_LIVE=false as const;
const QA_TABLE='guild_pve_v10_qa.guild_state';
const EMPTY:GuildPveV9StoreState={
 guildRuns:{},cycleBindings:{},receipts:{},
};

/** Standard SQL adapter contract. The supplied pool owns credentials,
 * connection limits and failure timeouts; never expose it to clients.
 */
export interface GuildPveV10SqlConnection {
 query<T extends Record<string,unknown>=Record<string,unknown>>(
  sql:string,parameters?:readonly unknown[]
 ):Promise<{rows:T[]}>;
 release():void|Promise<void>;
}
export interface GuildPveV10SqlPool {
 connect():Promise<GuildPveV10SqlConnection>;
}
type Row={payload:GuildPveV9StoreState|string;revision:string|number};
const isRec=(x:unknown):x is Record<string,unknown>=>
 x!==null&&typeof x==='object'&&!Array.isArray(x);
function inspectPayload(v:unknown):GuildPveV9StoreState {
 const parsed=typeof v==='string'?JSON.parse(v) as unknown:v;
 if(!isRec(parsed)||!isRec(parsed.guildRuns)||
  !isRec(parsed.cycleBindings)||!isRec(parsed.receipts))
  throw Error('guild_pve_v10_invalid_db_state');
 return parsed as unknown as GuildPveV9StoreState;
}
function dbErrorCode(e:unknown):string {
 if(!e||typeof e!=='object')return'';
 const code=(e as {code?:unknown}).code;
 return typeof code==='string'?code:'';
}
const retryable=(e:unknown)=>['40001','40P01'].includes(dbErrorCode(e));

export class GuildPveV10SqlAtomicPort implements GuildPveV9AtomicPort{
 constructor(private readonly pool:GuildPveV10SqlPool,
  private readonly namespace='broken-forge-v10-test',
  private readonly retryLimit=4){
  if(!/^[a-z][a-z0-9-]{0,63}$/.test(namespace)||
   !Number.isInteger(retryLimit)||retryLimit<1||retryLimit>10)
   throw Error('guild_pve_v10_invalid_adapter_options');
 }
 /** Only in an isolated test database, after TEST-ONLY DDL is applied. */
 async seedEmptyState():Promise<void>{
  const client=await this.pool.connect();
  try {
   await client.query(
    'INSERT INTO '+QA_TABLE+'(scope,payload,revision)'+
    ' VALUES($1,$2::jsonb,0) ON CONFLICT(scope) DO NOTHING',
    [this.namespace,JSON.stringify(EMPTY)]
   );
  }finally{await client.release();}
 }
 async transaction<T>(action:(state:GuildPveV9StoreState)=>Promise<T>):Promise<T>{
  for(let attempt=1;attempt<=this.retryLimit;attempt++){
   const c=await this.pool.connect();
   let began=false,committed=false;
   try {
    await c.query('BEGIN ISOLATION LEVEL SERIALIZABLE');
    began=true;
    const result=await c.query<Row&Record<string,unknown>>(
     'SELECT payload, revision FROM '+QA_TABLE+
      ' WHERE scope=$1 FOR UPDATE',
     [this.namespace]
    );
    if(result.rows.length!==1)throw Error('guild_pve_v10_state_not_seeded');
    const original=inspectPayload(result.rows[0].payload);
    const clone=structuredClone(original);
    // The callback does its deterministic simulation and ledger decision
    // under the transaction, without any irreversible external effects.
    const value=await action(clone);
    const updated=await c.query<{revision:number} & Record<string,unknown>>(
     'UPDATE '+QA_TABLE+' SET payload=$1::jsonb, revision=revision+1'+
      ' WHERE scope=$2 RETURNING revision',
     [JSON.stringify(clone),this.namespace]
    );
    if(updated.rows.length!==1)
     throw Error('guild_pve_v10_state_update_failed');
    await c.query('COMMIT');
    committed=true;
    return structuredClone(value);
   }catch(e){
    if(began&&!committed){
     try{await c.query('ROLLBACK')}catch{ /* preserve original SQL failure */ }
    }
    if(retryable(e)&&attempt<this.retryLimit)continue;
    throw e;
   }finally{
    await c.release();
   }
  }
  throw Error('guild_pve_v10_retry_exhausted');
 }
 /** Test diagnostics only. Does not leak data to a live client. */
 async inspect():Promise<{revision:number;payload:GuildPveV9StoreState}>{
  const c=await this.pool.connect();
  try{
   const r=await c.query<Row&Record<string,unknown>>(
    'SELECT payload,revision FROM '+QA_TABLE+' WHERE scope=$1',[this.namespace]);
   if(r.rows.length!==1)throw Error('guild_pve_v10_state_not_seeded');
   return {
    revision:Number(r.rows[0].revision),
    payload:structuredClone(inspectPayload(r.rows[0].payload)),
   };
  }finally{await c.release();}
 }
}
