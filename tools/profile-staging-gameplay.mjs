import {randomUUID} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const CONFIRM='I_CONFIRM_ISOLATED_STAGING_LOAD_TEST';
// Verified against the Veldryn production project; defense-in-depth beyond operator-supplied refs.
const KNOWN_PRODUCTION_REF='nyjwigipamnvpdvpauuv';
const finiteInt=(value,min,max)=>Number.isSafeInteger(value)&&value>=min&&value<=max;
const percentile=(values,fraction)=>{
 const sorted=[...values].sort((a,b)=>a-b);
 return Number((sorted[Math.max(0,Math.ceil(sorted.length*fraction)-1)]??0).toFixed(1));
};

export function validateStagingProfileConfig(env){
 if(env.STAGING_PROFILE_CONFIRM!==CONFIRM)throw Error('Staging load test requires an explicit write confirmation.');
 const expected=env.STAGING_PROFILE_PROJECT_REF,production=env.STAGING_PROFILE_PRODUCTION_REF;
 if(!/^[a-z0-9]{20}$/.test(expected??'')||!/^[a-z0-9]{20}$/.test(production??'')||expected===production||expected===KNOWN_PRODUCTION_REF)
  throw Error('Provide distinct staging and production project refs to prevent production load.');
 let url;
 try{url=new URL(env.STAGING_PROFILE_URL);}catch{throw Error('Invalid staging URL.');}
 if(url.protocol!=='https:'||url.username||url.password||url.port||url.search||url.hash||url.pathname!=='/'||url.hostname!==expected+'.supabase.co')
  throw Error('Staging URL must exactly match the confirmed isolated Supabase project ref.');
 if(env.STAGING_PROFILE_CONFIRM_REF!==expected)throw Error('Confirm the staging project ref independently before sending traffic.');
 let accounts;
 try{accounts=JSON.parse(env.STAGING_PROFILE_ACCOUNTS_JSON);}catch{throw Error('Missing/invalid JSON array of dedicated staging test accounts.');}
 const suffix=env.STAGING_PROFILE_TEST_EMAIL_MARKER;
 if(typeof suffix!=='string'||!/^\\+[a-z0-9._-]{3,20}$/i.test(suffix))throw Error('Specify a dedicated plus-address test email marker such as +perf.');
 if(!Array.isArray(accounts)||accounts.length<2||accounts.length>4)throw Error('Use 2–4 dedicated staging test accounts only.');
 for(const account of accounts){
  if(typeof account?.email!=='string'||!account.email.toLowerCase().includes(suffix.toLowerCase())||typeof account.password!=='string'||!account.password)
   throw Error('Every account must contain credentials and the explicit test email marker.');
 }
 if(new Set(accounts.map(x=>x.email.toLowerCase())).size!==accounts.length)throw Error('All test accounts must be distinct.');
 const rounds=env.STAGING_PROFILE_ROUNDS===undefined?1:Number(env.STAGING_PROFILE_ROUNDS);
 if(!finiteInt(rounds,1,2))throw Error('Staging rounds are limited to 1 or 2.');
 return {url:url.origin,accounts,rounds};
}

/** No automatic retries: on timeout a server-side write may still have committed. */
export async function profileStagingGameplay(config,{fetchImpl=fetch,uuid=randomUUID}={}){
 const methods={auth:[],read:[],write:[],receipt:[]};
 const request=async(url,method,headers,body,kind)=>{
  const started=performance.now();
  const response=await fetchImpl(url,{
   method,headers,body:body===undefined?undefined:JSON.stringify(body),
   signal:AbortSignal.timeout(8000),
  });
  methods[kind].push(performance.now()-started);
  const data=await response.json();
  return {status:response.status,data};
 };
 const sessions=await Promise.all(config.accounts.map(async account=>{
  const headers={'Content-Type':'application/json',apikey:config.anonKey};
  const token=await request(config.url+'/auth/v1/token?grant_type=password','POST',headers,
   {email:account.email,password:account.password},'auth');
  if(token.status!==200||typeof token.data?.access_token!=='string'||typeof token.data?.user?.id!=='string')
   throw Error('Dedicated staging authentication failed (no test writes attempted).');
  return {id:token.data.user.id,headers:{...headers,Authorization:'Bearer '+token.data.access_token}};
 }));
 if(new Set(sessions.map(x=>x.id)).size!==sessions.length)throw Error('Test accounts resolved to the same owner; refusing writes.');
 const endpoint=config.url+'/functions/v1/gameplay';
 const get=async session=>{
  const value=await request(endpoint,'GET',session.headers,undefined,'read');
  if(value.status!==200||value.data?.accountId!==session.id||!finiteInt(value.data.version,0,Number.MAX_SAFE_INTEGER))
   throw Error('Staging gameplay read failed account/version checks.');
  return value.data;
 };
 const before=await Promise.all(sessions.map(get));
 for(const snapshot of before){
  if(!snapshot.state?.character||snapshot.state.activity||!snapshot.state.settings)
   throw Error('Every staging fixture must have an idle test character with settings.');
 }
 const gold=state=>JSON.stringify([state.character?.gold??null,state.bank?.gold??null]);
 const expectedGold=before.map(snapshot=>gold(snapshot.state));
 let wins=0,conflicts=0,replays=0;
 for(let round=0;round<config.rounds;round++){
  const states=round===0?before:await Promise.all(sessions.map(get));
  await Promise.all(sessions.map(async(session,i)=>{
   const state=states[i];
   if(gold(state.state)!==expectedGold[i])throw Error('Staging test wallet changed before a round; refusing further requests.');
   const commands=Array.from({length:2},()=>({
    requestId:'perf-'+uuid().replaceAll('-',''),
    expectedVersion:state.version,
    command:{type:'settings',args:{settings:state.state.settings}},
   }));
   const results=await Promise.all(commands.map(command=>request(endpoint,'POST',session.headers,command,'write')));
   const success=results.filter(value=>value.status===200);
   const stale=results.filter(value=>value.status===409&&value.data?.error==='stale_state');
   if(success.length!==1||stale.length!==1)throw Error('Competing staging writes did not yield one commit and one fenced stale version.');
   const index=results.findIndex(value=>value.status===200);
   if(success[0].data?.accountId!==session.id||success[0].data.version!==state.version+1)
    throw Error('Staging commit returned an incorrect account or version.');
   wins++;conflicts++;
   const replay=await request(endpoint,'POST',session.headers,commands[index],'receipt');
   if(replay.status!==200||replay.data?.accountId!==session.id||replay.data.version!==success[0].data.version)
    throw Error('Committed receipt did not replay exactly once.');
   replays++;
   const after=await get(session);
   if(after.version!==state.version+1||gold(after.state)!==expectedGold[i])
    throw Error('A no-op staging settings write changed a wallet or unexpected version.');
  }));
 }
 const stats=Object.fromEntries(Object.entries(methods).map(([name,values])=>[name,{calls:values.length,p50Ms:percentile(values,.5),p95Ms:percentile(values,.95)}]));
 return {status:'PASS',environment:'isolated_staging',testAccounts:sessions.length,rounds:config.rounds,
  competedSettingsWrites:wins+conflicts,committed:wins,staleConflicts:conflicts,receiptReplays:replays,
  timings:stats,note:'Observed Edge + remote DB + network latency for dedicated test accounts; not production throughput.'};
}
async function main(){
 const config=validateStagingProfileConfig(process.env);
 const anonKey=process.env.STAGING_PROFILE_ANON_KEY;
 if(typeof anonKey!=='string'||anonKey.length<15)throw Error('A staging publishable/anon key is required (never use a service-role key).');
 const result=await profileStagingGameplay({...config,anonKey});
 console.log(JSON.stringify(result,null,2));
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1])){
 main().catch(error=>{console.error('Staging profile aborted: '+error.message);process.exitCode=1;});
}
