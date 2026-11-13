/**
 * V19 private Auth adapter using the SAME server-side Supabase Auth user
 * lookup pattern already used by Veldryn's coop-edge.ts.
 *
 * This exports a factory only. Nothing mounts or calls this in production.
 * Never trust JWT user_metadata or decode account ownership from a token.
 */
export const WORLD_BOSS_V19_AUTH_LIVE=false as const;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function createWorldBossSupabaseAuthenticatorV19(config:{
 supabaseUrl:string;publicApiKey:string;
 fetchUser?:typeof fetch;
}):(token:string)=>Promise<string|null>{
 const {supabaseUrl,publicApiKey}=config;
 let url:URL;
 try{url=new URL('/auth/v1/user',supabaseUrl);}catch{
  throw Error('world_boss_v19_invalid_auth_configuration');
 }
 if(!['https:','http:'].includes(url.protocol)||
  url.username||url.password||!url.hostname||!publicApiKey||
  typeof publicApiKey!=='string')
  throw Error('world_boss_v19_invalid_auth_configuration');
 const invoke=config.fetchUser??fetch;
 return async token=>{
  if(typeof token!=='string'||token.length<8||token.length>8192)return null;
  const response=await invoke(url.toString(),{
   method:'GET',
   headers:{apikey:publicApiKey,Authorization:'Bearer '+token},
   redirect:'error',
  });
  if(!response.ok)return null;
  const row:unknown=await response.json();
  if(!row||typeof row!=='object'||Array.isArray(row))return null;
  const id=(row as {id?:unknown}).id;
  return typeof id==='string'&&UUID.test(id)?id:null;
 };
}
