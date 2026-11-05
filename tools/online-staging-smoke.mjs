import {readFileSync} from 'node:fs';
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

// Pin smoke writes to the configured staging project: confirmation alone is not enough.
const stagingConfig=JSON.parse(readFileSync(new URL('../apps/mobile/eas.json',import.meta.url),'utf8')).build.staging.env;
const configuredUrl=new URL(process.env.ONLINE_SMOKE_SUPABASE_URL);
const expectedStagingUrl=new URL(stagingConfig.EXPO_PUBLIC_SUPABASE_URL);
if(configuredUrl.origin!==expectedStagingUrl.origin||configuredUrl.pathname.replace(/\\/g,'/').replace(/\\/+$/,'')!==''){
  throw new Error('Refusing live smoke: ONLINE_SMOKE_SUPABASE_URL must match the configured staging project origin.');
}
const base=configuredUrl.origin;
const anonKey=process.env.ONLINE_SMOKE_SUPABASE_ANON_KEY;
const appConfig=JSON.parse(readFileSync(new URL('../apps/mobile/app.json',import.meta.url),'utf8'));
const appVersion=(process.env.ONLINE_SMOKE_APP_VERSION??appConfig.expo.version).trim();
if(!/^\\d+\\.\\d+\\.\\d+$/.test(appVersion))throw new Error('Invalid Android version for staging smoke.');
const headers={apikey:anonKey,'Content-Type':'application/json'};
const response=await fetch(`${base}/auth/v1/token?grant_type=password`,{method:'POST',headers,body:JSON.stringify({email:process.env.ONLINE_SMOKE_EMAIL,password:process.env.ONLINE_SMOKE_PASSWORD})});
const session=await response.json();
if(!response.ok||typeof session.access_token!=='string'||typeof session.user?.id!=='string')throw new Error(`Staging authentication failed: ${session.error_description??session.message??response.status}`);

const gameplayHeaders={...headers,Authorization:`Bearer ${session.access_token}`,'x-app-version':appVersion,'x-app-platform':'android'};
async function edge(endpoint,method,body){
  const result=await fetch(`${base}/functions/v1/${endpoint}`,{method,headers:gameplayHeaders,body:body?JSON.stringify(body):undefined});
  let payload;
  try{payload=await result.json();}catch{throw new Error(`Staging ${endpoint} ${method} returned a non-JSON response (${result.status}).`);}
  if(!result.ok)throw new Error(`Staging ${endpoint} ${method} failed (${result.status}): ${payload.error??payload.message??'unknown error'}`);
  return payload;
}
const gameplay=(method,body)=>edge('gameplay',method,body);

const before=await gameplay('GET');
if(before.accountId!==session.user.id||!before.state||!Number.isSafeInteger(before.version))throw new Error('Gameplay read returned an invalid account-scoped snapshot.');
if(before.state.activity)throw new Error('Dedicated smoke account must be idle before the settings idempotency check.');
if(!before.state.character)throw new Error('Dedicated staging smoke account needs a character for co-op entry verification.');
const request={requestId:`staging-smoke-${Date.now()}-${Math.random().toString(36).slice(2,10)}`,expectedVersion:before.version,command:{type:'settings',args:{settings:before.state.settings}}};
const committed=await gameplay('POST',request);
const retried=await gameplay('POST',request);
if(committed.accountId!==session.user.id||committed.version!==before.version+1)throw new Error('No-op settings write did not commit exactly one version.');
if(retried.version!==committed.version||JSON.stringify(retried)!==JSON.stringify(committed))throw new Error('Repeated gameplay receipt was not idempotent.');
const entry=await edge('coop/entry','GET');
if(!Number.isSafeInteger(entry.gameVersion)||!Number.isFinite(entry.serverNow)||!Array.isArray(entry.dungeons)||!Array.isArray(entry.loadouts))throw new Error('Co-op entry returned an invalid authenticated dungeon projection.');
console.log(JSON.stringify({status:'PASS',accountId:session.user.id,initialVersion:before.version,committedVersion:committed.version,checks:['authenticated_read','authoritative_write','idempotent_retry','authenticated_coop_entry','android_version_headers','staging_origin_guard']}));
