import assert from 'node:assert/strict';
import {withReleaseGate,releasePolicyLoader} from '../release-gate';
async function main(){
 let calls=0,fail=false;
 const row={platform:'android',latest_version:'1.0.0',minimum_version:'0.1.0',force_after:null as string|null,maintenance_mode:false};
 const gate=withReleaseGate(async()=>{calls++;return new Response('ok');},async()=>{if(fail)throw new Error('offline');return [row];},()=>1000);
 const request=(version?:string,platform?:string,method='POST')=>new Request('https://test.invalid/gameplay?view=guild-shop&action=purchase',{method,headers:{authorization:'Bearer valid',...(version?{'x-app-version':version}:{}),...(platform?{'x-app-platform':platform}:{})}});
 assert.equal((await gate(request())).status,200,'legacy compatibility before activation');
 row.minimum_version='1.0.0';
 for(const version of [undefined,'0.9.5','garbage']){const before=calls;const response=await gate(request(version));assert.equal(response.status,426);assert.equal(calls,before,'no gameplay or purchase execution on rejection');assert.equal((await response.json()).policy.minimum_version,'1.0.0');}
 assert.equal((await gate(request('1.0.0','android'))).status,200);
 assert.equal((await gate(request('1.1.0','android'))).status,200);
 assert.equal((await gate(request('1.0.0','other'))).status,503,'missing platform policy fails closed');
 row.minimum_version='0.1.0';row.force_after=new Date(1001).toISOString();
 assert.equal((await gate(request('0.9.5'))).status,200);
 row.force_after=new Date(1000).toISOString();assert.equal((await gate(request('0.9.5'))).status,426,'force date boundary');
 row.maintenance_mode=true;assert.equal((await gate(request('1.0.0'))).status,503);
 fail=true;const before=calls;assert.equal((await gate(request('1.0.0'))).status,503);assert.equal(calls,before);
 assert.equal((await gate(new Request('https://test.invalid'))).status,401);
 const preflight=await gate(request(undefined,undefined,'OPTIONS'));assert.equal(preflight.status,204);assert.match(preflight.headers.get('Access-Control-Allow-Headers')!,/x-app-version/);
 const originalFetch=globalThis.fetch;
 try{
  globalThis.fetch=async(input,init)=>{assert.equal(String(input),'https://test.invalid/rest/v1/app_release_policy?select=*');assert.equal(new Headers(init?.headers).get('apikey'),'public-read-key');assert.equal(new Headers(init?.headers).get('authorization'),null,'public policy read must not use service-role authorization');return new Response(JSON.stringify([row]));};
  assert.equal((await releasePolicyLoader('https://test.invalid','public-read-key')()).length,1);
  globalThis.fetch=async()=>new Response('{}',{status:403});await assert.rejects(releasePolicyLoader('https://test.invalid','public-read-key'));
  // One loader instance shares overlapping reads only; later requests must
  // observe new maintenance/minimum policy, and failed reads must be retried.
  let fetches=0,resolveRead!:(response:Response)=>void;
  globalThis.fetch=async()=>{fetches++;return new Promise<Response>(resolve=>{resolveRead=resolve;});};
  const loader=releasePolicyLoader('https://test.invalid','public-read-key');
  const first=loader(),second=loader();
  assert.equal(first,second,'overlapping policy reads share one promise');
  assert.equal(fetches,1);
  resolveRead(new Response(JSON.stringify([{...row,maintenance_mode:false}])));
  assert.equal((await first)[0].maintenance_mode,false);
  const next=loader();
  assert.equal(fetches,2,'no completed-result cache');
  resolveRead(new Response(JSON.stringify([{...row,maintenance_mode:true}])));
  assert.equal((await next)[0].maintenance_mode,true);
  const failed=loader(),joined=loader();
  assert.equal(failed,joined);
  resolveRead(new Response('{}',{status:503}));
  await assert.rejects(failed);
  await assert.rejects(joined);
  const recovered=loader();
  assert.equal(fetches,4,'failed read must not poison future checks');
  resolveRead(new Response(JSON.stringify([row])));
  await recovered;
 }finally{globalThis.fetch=originalFetch;}
 console.log('release gate: legacy rollout, minimum, schedule, maintenance, fail-closed, preflight passed');
}
void main();
