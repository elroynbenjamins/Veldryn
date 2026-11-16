import test from 'node:test';
import assert from 'node:assert/strict';

const messageId='12345678-1234-4234-8234-123456789abc';
const api='https://staging.supabase.co';
const bearer='Bearer synthetic-staging-user-jwt';
let handler;
let providerConfigured=true;
let mode='success';
let body='¡Hola :wave: amigos!';
let calls=[];

// The production handler executes unchanged. Only Deno runtime, PostgREST and
// the DeepL HTTP boundary are mocked; this test uses no real player data.
globalThis.Deno={
 env:{get(name){
  if(name==='SUPABASE_URL')return api;
  if(name==='SUPABASE_ANON_KEY')return 'publishable-test-key';
  if(name==='DEEPL_API_KEY')return providerConfigured?'synthetic:fx':undefined;
  return undefined;
 }},
 serve(fn){handler=fn;},
};
globalThis.fetch=async(input,init={})=>{
 const url=String(input);
 calls.push({url,init});
 if(url.startsWith(api+'/rest/v1/chat_messages')){
  if(mode==='denied')return Response.json([]);
  if(mode==='auth_failed')return Response.json({error:'jwt_invalid'},{status:401});
  if(mode==='missing')return Response.json([]);
  return Response.json([{body}]);
 }
 if(url.startsWith(api+'/rest/v1/rpc/claim_chat_translation_v1')){
  if(mode==='quota')return Response.json(false);
  if(mode==='quota_broken')return Response.json({error:'unavailable'},{status:503});
  return Response.json(true);
 }
 if(url.includes('deepl.com/v2/translate')){
  if(mode==='provider_error')return Response.json({message:'failure'},{status:500});
  if(mode==='provider_timeout')throw new Error('provider down');
  const inputText=JSON.parse(init.body).text;
  const translated=inputText.map((value)=>({
   text:value.includes('Hola')?'Hello ':value.includes('amigos')?' friends!':value,
   detected_source_language:'ES',
  }));
  return Response.json({translations:translated});
 }
 throw new Error('Unexpected external fetch: '+url);
};

await import(new URL('../supabase/functions/translate-chat-message/index.ts',import.meta.url).href);
assert.equal(typeof handler,'function','real edge handler registered via Deno.serve');
const reset=(nextMode='success')=>{mode=nextMode;body='¡Hola :wave: amigos!';calls=[];providerConfigured=true;};
const invoke=(payload={messageId,targetLanguage:'en'},withAuth=true)=>{
 const headers={'Content-Type':'application/json'};
 if(withAuth)headers.Authorization=bearer;
 return handler(new Request('https://staging.supabase.co/functions/v1/translate-chat-message',{
  method:'POST',headers,body:JSON.stringify(payload),
 }));
};
const upstream=()=>calls.filter(call=>call.url.includes('deepl.com'));
const reads=()=>calls.filter(call=>call.url.startsWith(api+'/rest/v1/chat_messages'));
const claims=()=>calls.filter(call=>call.url.includes('/rpc/claim_chat_translation'));

test('manual translation never accepts unauthenticated requests',async()=>{
 reset();
 const response=await invoke(undefined,false);
 assert.equal(response.status,401);
 assert.equal(calls.length,0);
});
test('reject malformed message IDs, targets, and methods before any fetch',async()=>{
 reset();
 for(const request of [{messageId:'not-a-uuid',targetLanguage:'en'},{messageId,targetLanguage:'xx'},{messageId,targetLanguage:12}]){
  assert.equal((await invoke(request)).status,400);
 }
 assert.equal(calls.length,0);
 const r=await handler(new Request('https://staging.supabase.co/functions/v1/translate-chat-message',{method:'GET'}));
 assert.equal(r.status,405);
});
test('a JWT-scoped RLS read denies inaccessible messages and prevents any external processing',async()=>{
 reset('denied');
 const response=await invoke();
 assert.equal(response.status,404);
 assert.equal(reads().length,1);
 assert.equal(claims().length,0);
 assert.equal(upstream().length,0);
 assert.equal(reads()[0].init.headers.Authorization,bearer);
 assert.equal(reads()[0].init.headers.apikey,'publishable-test-key');
});
test('expired auth and unconfigured provider fail closed',async()=>{
 reset('auth_failed');
 assert.equal((await invoke()).status,401);
 assert.equal(upstream().length,0);
 reset();
 providerConfigured=false;
 assert.equal((await invoke()).status,503);
 assert.equal(claims().length,0);
});
test('the atomic quota is consulted before paying a provider',async()=>{
 reset('quota');
 const response=await invoke();
 assert.equal(response.status,429);
 assert.equal(upstream().length,0);
 assert.equal(claims().length,1);
 reset('quota_broken');
 assert.equal((await invoke()).status,503);
 assert.equal(upstream().length,0);
});
test('authorized translation preserves Veldryn emote tokens and never stores translation',async()=>{
 reset();
 const response=await invoke({messageId,targetLanguage:'en',body:'attacker supplied text must be ignored'});
 assert.equal(response.status,200);
 const data=await response.json();
 assert.equal(data.text,'Hello :wave: friends!');
 assert.equal(data.sourceLanguage,'ES');
 assert.equal(response.headers.get('cache-control'),'no-store');
 assert.equal(reads().length,1);
 assert.equal(claims().length,1);
 assert.equal(upstream().length,1);
 assert.match(upstream()[0].init.headers.Authorization,/^DeepL-Auth-Key /);
 const sent=JSON.parse(upstream()[0].init.body);
 assert.equal(sent.target_lang,'EN-US');
 assert.equal(sent.text.length,2);
 assert.ok(!sent.text.join('').includes('attacker supplied'));
 assert.ok(!sent.text.join('').includes(':wave:'));
 assert.equal(calls.filter(c=>c.init.method==='PATCH'||c.init.method==='PUT').length,0);
});
test('provider error or outage never returns a false translation success',async()=>{
 reset('provider_error');
 assert.equal((await invoke()).status,503);
 reset('provider_timeout');
 assert.equal((await invoke()).status,503);
});
