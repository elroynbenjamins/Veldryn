/**
 * Opt-in chat translation. Authenticated callers provide only a message UUID and
 * target language. PostgREST applies the caller's existing chat RLS policies
 * before any text is sent to DeepL. No text or translations are persisted.
 *
 * Runtime secrets: DEEPL_API_KEY (required); DEEPL_API_TIER=pro for paid API.
 * Keep platform JWT verification enabled. Both regular and anonymous (guest)
 * Supabase Auth users have signed session JWTs.
 */
const allowedTargets:Record<string,string>={
 en:'EN-US',de:'DE',es:'ES',nl:'NL',it:'IT',fr:'FR',ru:'RU',tr:'TR',
};
const headers={
 'Access-Control-Allow-Origin':'*',
 'Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info',
 'Access-Control-Allow-Methods':'POST,OPTIONS',
 'Cache-Control':'no-store',
 'Content-Type':'application/json; charset=utf-8',
};
function reply(status:number,payload:Record<string,unknown>){
 return new Response(JSON.stringify(payload),{status,headers});
}

Deno.serve(async(request:Request)=>{
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(request.method!=='POST')return reply(405,{error:'method_not_allowed'});
 const authorization=request.headers.get('Authorization');
 if(!authorization?.startsWith('Bearer '))return reply(401,{error:'unauthorized'});
 const url=Deno.env.get('SUPABASE_URL'),anon=Deno.env.get('SUPABASE_ANON_KEY');
 if(!url||!anon)return reply(503,{error:'unavailable'});
 let payload:unknown;
 try{payload=await request.json();}catch{return reply(400,{error:'invalid_request'});}
 if(!payload||typeof payload!=='object'||Array.isArray(payload))return reply(400,{error:'invalid_request'});
 const fields=payload as Record<string,unknown>;
 const messageId=fields.messageId,target=fields.targetLanguage;
 if(typeof messageId!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(messageId)
  ||typeof target!=='string'||!Object.hasOwn(allowedTargets,target))return reply(400,{error:'invalid_request'});
 const authHeaders={apikey:anon,Authorization:authorization,Accept:'application/json'};
 try{
  // RLS checks channel visibility (World, Guild, Party, including Live dungeon).
  // Never use the service role for this query.
  const query=new URL(url+'/rest/v1/chat_messages');
  query.searchParams.set('select','body');
  query.searchParams.set('id','eq.'+messageId);
  query.searchParams.set('limit','1');
  const found=await fetch(query,{headers:authHeaders,signal:AbortSignal.timeout(7000)});
  if(!found.ok)return reply(found.status===401?401:503,{error:'unavailable'});
  const rows=await found.json() as Array<{body?:unknown}>;
  const body=Array.isArray(rows)&&rows.length===1?rows[0].body:null;
  if(typeof body!=='string'||!body.trim())return reply(404,{error:'not_found'});
  if(body.length>300)return reply(413,{error:'message_too_long'});
  const apiKey=Deno.env.get('DEEPL_API_KEY');
  if(!apiKey)return reply(503,{error:'translation_not_configured'});
  // Postgres quota is atomic per authenticated account: 60/day, 3s cooldown.
  // Count only requests whose message passed the current user's RLS.
  const claim=await fetch(url+'/rest/v1/rpc/claim_chat_translation_v1',{
   method:'POST',headers:{...authHeaders,'Content-Type':'application/json'},body:'{}',
   signal:AbortSignal.timeout(7000),
  });
  if(!claim.ok)return reply(503,{error:'quota_unavailable'});
  if(await claim.json()!==true)return reply(429,{error:'translation_limit',retryAfterSeconds:3});
  // Keep Veldryn's :emote_tokens: intact instead of passing them through ML translation.
  const segments=body.split(/(:[a-z0-9_]+:)/gi);
  const textIndexes:number[]=[],texts:string[]=[];
  segments.forEach((segment,index)=>{
   if(!/^:[a-z0-9_]+:$/i.test(segment)&&/[\p{L}]/u.test(segment)){
    textIndexes.push(index);texts.push(segment);
   }
  });
  if(!texts.length)return reply(200,{text:body,sourceLanguage:null});
  // DeepL now offers Developer/Growth subscriptions on the standard endpoint.
  // Legacy Free keys conventionally end in :fx; tier can be overridden explicitly.
  const tier=Deno.env.get('DEEPL_API_TIER');
  const free=tier==='free'||(tier!=='pro'&&apiKey.endsWith(':fx'));
  const apiUrl=free?'https://api-free.deepl.com/v2/translate':'https://api.deepl.com/v2/translate';
  const translated=await fetch(apiUrl,{
   method:'POST',
   headers:{Authorization:'DeepL-Auth-Key '+apiKey,'Content-Type':'application/json'},
   body:JSON.stringify({text:texts,target_lang:allowedTargets[target]}),
   signal:AbortSignal.timeout(9000),
  });
  if(!translated.ok)return reply(translated.status===429?429:503,{error:'translation_unavailable'});
  const result=await translated.json() as {translations?:Array<{text?:unknown;detected_source_language?:unknown}>};
  const responses=result.translations;
  if(!Array.isArray(responses)||responses.length!==texts.length||responses.some(item=>typeof item.text!=='string')){
   return reply(503,{error:'translation_unavailable'});
  }
  textIndexes.forEach((index,i)=>{segments[index]=responses[i].text as string;});
  const detected=responses.find(item=>typeof item.detected_source_language==='string')?.detected_source_language;
  return reply(200,{text:segments.join(''),sourceLanguage:typeof detected==='string'?detected:null});
 }catch{
  return reply(503,{error:'translation_unavailable'});
 }
});
