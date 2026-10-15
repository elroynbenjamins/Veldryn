/**
 * Live staging smoke for the authoritative gameplay Edge Function.
 *
 * This intentionally requires a dedicated test account and an explicit opt-in:
 * it performs one no-op settings write, then repeats the exact receipt to prove
 * that the deployed idempotency path is live. Never point it at a player account.
 */
const required=['ONLINE_SMOKE_SUPABASE_URL','ONLINE_SMOKE_SUPABASE_ANON_KEY','ONLINE_SMOKE_EMAIL','ONLINE_SMOKE_PASSWORD'];
const missing=required.filter(key=>!process.env[key]);
if(process.env.ONLINE_SMOKE_CONFIRM!=='I_UNDERSTAND_STAGING_WRITES'){
  throw new Error('Refusing live smoke write. Set ONLINE_SMOKE_CONFIRM=I_UNDERSTAND_STAGING_WRITES for a dedicated staging account.');
}
if(missing.length)throw new Error(`Missing staging smoke configuration: ${missing.join(', ')}`);

const base=process.env.ONLINE_SMOKE_SUPABASE_URL.replace(/\/$/,'');
const anonKey=process.env.ONLINE_SMOKE_SUPABASE_ANON_KEY;
const headers={apikey:anonKey,'Content-Type':'application/json'};
const response=await fetch(`${base}/auth/v1/token?grant_type=password`,{method:'POST',headers,body:JSON.stringify({email:process.env.ONLINE_SMOKE_EMAIL,password:process.env.ONLINE_SMOKE_PASSWORD})});
const session=await response.json();
if(!response.ok||typeof session.access_token!=='string'||typeof session.user?.id!=='string')throw new Error(`Staging authentication failed: ${session.error_description??session.message??response.status}`);

const gameplayHeaders={...headers,Authorization:`Bearer ${session.access_token}`};
async function gameplay(method,body){
  const result=await fetch(`${base}/functions/v1/gameplay`,{method,headers:gameplayHeaders,body:body?JSON.stringify(body):undefined});
  const payload=await result.json();
  if(!result.ok)throw new Error(`Gameplay ${method} failed (${result.status}): ${payload.error??payload.message??'unknown error'}`);
  return payload;
}

const before=await gameplay('GET');
if(before.accountId!==session.user.id||!before.state||!Number.isSafeInteger(before.version))throw new Error('Gameplay read returned an invalid account-scoped snapshot.');
if(before.state.activity)throw new Error('Dedicated smoke account must be idle before the settings idempotency check.');
const request={requestId:`staging-smoke-${Date.now()}-${Math.random().toString(36).slice(2,10)}`,expectedVersion:before.version,command:{type:'settings',args:{settings:before.state.settings}}};
const committed=await gameplay('POST',request);
const retried=await gameplay('POST',request);
if(committed.accountId!==session.user.id||committed.version!==before.version+1)throw new Error('No-op settings write did not commit exactly one version.');
if(retried.version!==committed.version||JSON.stringify(retried)!==JSON.stringify(committed))throw new Error('Repeated gameplay receipt was not idempotent.');
console.log(JSON.stringify({status:'PASS',accountId:session.user.id,initialVersion:before.version,committedVersion:committed.version,checks:['authenticated_read','authoritative_write','idempotent_retry']}));
