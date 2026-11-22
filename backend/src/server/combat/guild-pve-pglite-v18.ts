/**
 * V18 filesystem-PGlite persistence adapter — QA ONLY.
 * Single JSONB row intentionally serializes all guilds as a fixture.
 *
 * Demonstrates a real SQL transaction and durable V17 receipt, NOT
 * production normalized schema, multi-worker PostgreSQL, authenticated
 * Supabase reads, live rewards or a deployable migration.
 */
import type {
 GuildPveV18AtomicPort,GuildPveV18StoreState,
} from './guild-pve-settlement-v18';

export const GUILD_PVE_V18_PGLITE_LIVE=false as const;
const TABLE='guild_pve_v18_qa.atomic_state';
const empty:GuildPveV18StoreState={
 guild:{guildRuns:{},cycleBindings:{},receipts:{}},
 charges:{},receipts:{},
};
export interface GuildPveV18SqlConnection {
 query<T extends Record<string,unknown>=Record<string,unknown>>(
  sql:string,params?:readonly unknown[]
 ):Promise<{rows:T[]}>;
 release():void|Promise<void>;
}
export interface GuildPveV18SqlPool {
 connect():Promise<GuildPveV18SqlConnection>;
}
type Row={payload:GuildPveV18StoreState|string;revision:number|string};
const isObj=(v:unknown):v is Record<string,unknown>=>
 v!==null&&typeof v==='object'&&!Array.isArray(v);
function decode(value:unknown):GuildPveV18StoreState{
 const p=typeof value==='string'?JSON.parse(value) as unknown:value;
 if(!isObj(p)||!isObj(p.guild)||!isObj(p.guild.guildRuns)||
  !isObj(p.guild.cycleBindings)||!isObj(p.guild.receipts)||
  !isObj(p.charges)||!isObj(p.receipts))
  throw Error('guild_pve_v18_pglite_invalid_state');
 return p as unknown as GuildPveV18StoreState;
}
const retryable=(e:unknown)=>{
 const code=e&&typeof e==='object'?(e as {code?:unknown}).code:null;
 return code==='40001'||code==='40P01';
};
export class GuildPveV18PgliteAtomicPort implements GuildPveV18AtomicPort {
 constructor(private readonly pool:GuildPveV18SqlPool,
  private readonly scope='guild-pve-v18-qa',private readonly retryLimit=4){
  if(!/^[a-z][a-z0-9-]{0,63}$/.test(scope)||
   !Number.isSafeInteger(retryLimit)||retryLimit<1||retryLimit>10)
   throw Error('guild_pve_v18_pglite_invalid_options');
 }
 async seedInitialState(initial:GuildPveV18StoreState=empty){
  // The QA driver is responsible for creating this temp-only schema.
  const c=await this.pool.connect();
  try{
   await c.query('INSERT INTO '+TABLE+
    '(scope,payload,revision) VALUES($1,$2::jsonb,0) ON CONFLICT(scope) DO NOTHING',
    [this.scope,JSON.stringify(decode(initial))]);
  }finally{await c.release();}
 }
 async transaction<T>(job:(state:GuildPveV18StoreState)=>Promise<T>):Promise<T>{
  for(let attempt=1;attempt<=this.retryLimit;attempt++){
   const c=await this.pool.connect();
   let started=false,committed=false;
   try{
    await c.query('BEGIN ISOLATION LEVEL SERIALIZABLE');started=true;
    const response=await c.query<Row&Record<string,unknown>>(
     'SELECT payload,revision FROM '+TABLE+' WHERE scope=$1 FOR UPDATE',
     [this.scope]);
    if(response.rows.length!==1)throw Error('guild_pve_v18_pglite_unseeded');
    const original=decode(response.rows[0].payload);
    const updated=structuredClone(original);
    const output=await job(updated);
    if(JSON.stringify(original)!==JSON.stringify(updated)){
     const write=await c.query<{revision:number}&Record<string,unknown>>(
      'UPDATE '+TABLE+' SET payload=$1::jsonb,revision=revision+1'+
      ' WHERE scope=$2 RETURNING revision',
      [JSON.stringify(updated),this.scope]);
     if(write.rows.length!==1)throw Error('guild_pve_v18_pglite_update_failed');
    }
    await c.query('COMMIT');committed=true;
    return structuredClone(output);
   }catch(e){
    if(started&&!committed){
     try{await c.query('ROLLBACK')}catch{/* preserve original failure */}
    }
    if(retryable(e)&&attempt<this.retryLimit)continue;
    throw e;
   }finally{await c.release();}
  }
  throw Error('guild_pve_v18_pglite_retry_exhausted');
 }
 async inspect():Promise<{revision:number;state:GuildPveV18StoreState}>{
  const c=await this.pool.connect();
  try{
   const q=await c.query<Row&Record<string,unknown>>(
    'SELECT payload,revision FROM '+TABLE+' WHERE scope=$1',[this.scope]);
   if(q.rows.length!==1)throw Error('guild_pve_v18_pglite_unseeded');
   return {revision:Number(q.rows[0].revision),
    state:structuredClone(decode(q.rows[0].payload))};
  }finally{await c.release();}
 }
}
