import {supabase,supabasePublicEndpoint,supabasePublicKey} from './supabase';

export type GuildTokenShopCategory='pet'|'companion'|'border'|'profile_icon'|'emote_set';
export type GuildTokenShopStatus='owned'|'guild_level_locked'|'insufficient_tokens'|'eligible';
export interface GuildTokenShopCard{
 id:string;title:string;category:GuildTokenShopCategory;requiredGuildLevel:number;
 price:number;status:GuildTokenShopStatus;progressToPrice:number;
}
export interface GuildConstructionTemplate{
 id:string;guildLevel:number;gold:number;materials:Array<{materialKey:string;amount:number}>;unlockId:string;
}
export interface GuildConstructionProgress{
 templateId:string;completed:boolean;resources:Record<string,number>;
}
export interface GuildTokenShopSnapshot{
 guildLevel:number;balance:number;earnedThisWeek:number;weeklyCap:number;cards:GuildTokenShopCard[];
 claimedDailyKinds:Array<"attendance"|"contribution">;
 constructionTemplates:GuildConstructionTemplate[];construction:GuildConstructionProgress[];
}
const categories=new Set<string>(['pet','companion','border','profile_icon','emote_set']);
const statuses=new Set<string>(['owned','guild_level_locked','insufficient_tokens','eligible']);

function validateSnapshot(value:unknown):GuildTokenShopSnapshot{
 if(!value||typeof value!=='object')throw new Error('Invalid Guild Token Shop response.');
 const o=value as Record<string,unknown>;
 if(!Number.isSafeInteger(o.guildLevel)||Number(o.guildLevel)<1
    ||!Number.isSafeInteger(o.balance)||Number(o.balance)<0
    ||!Number.isSafeInteger(o.earnedThisWeek)||Number(o.earnedThisWeek)<0
    ||o.weeklyCap!==250||!Array.isArray(o.claimedDailyKinds)
    ||o.claimedDailyKinds.some(k=>k!=="attendance"&&k!=="contribution")||!Array.isArray(o.cards)
    ||!Array.isArray(o.constructionTemplates)||!Array.isArray(o.construction))throw new Error('Invalid Guild Token Shop response.');
 const cards:GuildTokenShopCard[]=o.cards.map((candidate:unknown)=>{
  if(!candidate||typeof candidate!=='object')throw new Error('Invalid Guild Shop reward.');
  const c=candidate as Record<string,unknown>;
  if(typeof c.id!=='string'||typeof c.title!=='string'
   ||!categories.has(String(c.category))||!statuses.has(String(c.status))
   ||!Number.isSafeInteger(c.price)||Number(c.price)<0
   ||!Number.isSafeInteger(c.requiredGuildLevel)||Number(c.requiredGuildLevel)<1
   ||typeof c.progressToPrice!=='number'||!Number.isFinite(c.progressToPrice)
   ||c.progressToPrice<0||c.progressToPrice>1)throw new Error('Invalid Guild Shop reward.');
  return c as unknown as GuildTokenShopCard;
 });
 const constructionTemplates:GuildConstructionTemplate[]=o.constructionTemplates.map((value:unknown)=>{
  const template=value as GuildConstructionTemplate;
  if(!template||typeof template.id!=='string'||typeof template.unlockId!=='string'
   ||!Number.isSafeInteger(template.guildLevel)||template.guildLevel<1
   ||!Number.isSafeInteger(template.gold)||template.gold<0||!Array.isArray(template.materials)
   ||template.materials.some(m=>typeof m.materialKey!=='string'||!Number.isSafeInteger(m.amount)||m.amount<=0))
   throw new Error('Invalid construction template.');
  return template;
 });
 const construction:GuildConstructionProgress[]=o.construction.map((value:unknown)=>{
  const progress=value as GuildConstructionProgress;
  if(!progress||typeof progress.templateId!=='string'||typeof progress.completed!=='boolean'
    ||!progress.resources||typeof progress.resources!=='object'
    ||Object.values(progress.resources).some(amount=>!Number.isSafeInteger(amount)||amount<0))
   throw new Error('Invalid construction progress.');
  return progress;
 });
 return {guildLevel:o.guildLevel as number,balance:o.balance as number,earnedThisWeek:o.earnedThisWeek as number,
  weeklyCap:o.weeklyCap as number,cards,claimedDailyKinds:o.claimedDailyKinds as Array<"attendance"|"contribution">,constructionTemplates,construction};
}

/** Guild Tokens are distinct from the existing Quartermaster's Guild Marks.
 * Read-only: no token balance or purchase authority is stored on-device.
 */
export async function loadOnlineGuildTokenShop():Promise<GuildTokenShopSnapshot|null>{
 if(!supabase||!supabasePublicEndpoint||!supabasePublicKey)throw new Error('Online services are unavailable.');
 const {data:{session},error:authError}=await supabase.auth.getSession();
 if(authError)throw authError;
 if(!session)throw new Error('Sign in to view the Guild Token Shop.');
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),15000);
 try{
  const response=await fetch(`${supabasePublicEndpoint}/functions/v1/gameplay?view=guild-shop`,{
   method:'GET',signal:controller.signal,
   headers:{Authorization:`Bearer ${session.access_token}`,apikey:supabasePublicKey},
  });
  if(response.status===403)return null;
  const value=await response.json();
  if(!response.ok)throw new Error(typeof value?.error==='string'?value.error:'Guild Token Shop unavailable.');
  return validateSnapshot(value);
 }finally{clearTimeout(timeout);}
}

/** Claim a standard daily reward from actual server-verified Guild Muster.
 * Calling twice is safe: the database uses a stable daily claim key.
 */
export async function claimOnlineGuildDailyTokens(kind:'attendance'|'contribution'):Promise<number>{
 if(!supabase||!supabasePublicEndpoint||!supabasePublicKey)throw new Error('Online services are unavailable.');
 const {data:{session},error}=await supabase.auth.getSession();
 if(error)throw error;
 if(!session)throw new Error('Please sign in again.');
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),15000);
 try{
  const response=await fetch(`${supabasePublicEndpoint}/functions/v1/gameplay?view=guild-shop`,{
   method:'POST',signal:controller.signal,
   headers:{Authorization:`Bearer ${session.access_token}`,apikey:supabasePublicKey,'Content-Type':'application/json'},
   body:JSON.stringify({kind}),
  });
  const body=await response.json();
  if(!response.ok){
   if(body?.error==='guild_daily_reward_not_earned')
    throw new Error(kind==='attendance'?'Check in with Guild Muster first.':'Contribute through verified Combat or Skilling first.');
   throw new Error(typeof body?.error==='string'?body.error:'Unable to claim Guild Tokens.');
  }
  if(!Number.isSafeInteger(body?.credited)||body.credited<0||body.credited>10)
   throw new Error('The reward could not be verified. Please refresh.');
  return body.credited as number;
 }finally{clearTimeout(timeout);}
}
