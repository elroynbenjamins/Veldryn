import {versionedFetch as fetch} from './versioned-fetch';
import {guildConstructionBenefits,GUILD_SHOP_ITEM_QUALITY,GUILD_SHOP_QUALITY_TIER,type GuildShopQuality} from '../content/guild-construction-benefits';
import {supabase,supabasePublicEndpoint,supabasePublicKey} from './supabase';

export type GuildTokenShopCategory='pet'|'companion'|'border'|'profile_icon'|'emote_set';
export type GuildTokenShopStatus='owned'|'guild_level_locked'|'guild_shop_quality_locked'|'insufficient_tokens'|'eligible';
export interface GuildTokenShopCard{
 id:string;title:string;category:GuildTokenShopCategory;requiredGuildLevel:number;
 price:number;status:GuildTokenShopStatus;progressToPrice:number;released:boolean;quality?:GuildShopQuality;
}
export interface GuildConstructionTemplate{
 id:string;guildLevel:number;gold:number;materials:Array<{materialKey:string;amount:number}>;unlockId:string;enabled:boolean;
}
export interface GuildConstructionProgress{
 templateId:string;completed:boolean;resources:Record<string,number>;
}
export interface GuildTokenEventBonus{
 eventId:string;milestonePercent:number;tokens:number;claimed:boolean;
}
export type GuildWeeklyRewardKind='attendance'|'project'|'boss';
export interface GuildTokenWeeklyReward{
 kind:GuildWeeklyRewardKind;tokens:number;eligible:boolean;claimed:boolean;
}
export interface GuildBankSnapshot{
 balances:Array<{resourceId:string;amount:number}>;
 activity:Array<{kind:'deposit'|'construction';resourceId:string;amount:number;templateId?:string|null;mine:boolean;createdAt:string}>;
}
export interface GuildTokenShopSnapshot{
 guildLevel:number;balance:number;earnedThisWeek:number;weeklyCap:number;cards:GuildTokenShopCard[];treasuryBonusBps?:number;
 unavailableSections?:string[];
 claimedDailyKinds:Array<"attendance"|"contribution">;
 constructionTemplates:GuildConstructionTemplate[];construction:GuildConstructionProgress[];
 bank:GuildBankSnapshot|null;
 eventBonuses:GuildTokenEventBonus[];weeklyRewards:GuildTokenWeeklyReward[];
}
const categories=new Set<string>(['pet','companion','border','profile_icon','emote_set']);
const statuses=new Set<string>(['owned','guild_level_locked','insufficient_tokens','eligible']);

function validateSnapshot(value:unknown):GuildTokenShopSnapshot{
 if(!value||typeof value!=='object')throw new Error('Invalid Guild Token Shop response.');
 const o=value as Record<string,unknown>;
 if(!Number.isSafeInteger(o.guildLevel)||Number(o.guildLevel)<1
    ||!Number.isSafeInteger(o.balance)||Number(o.balance)<0
    ||!Number.isSafeInteger(o.earnedThisWeek)||Number(o.earnedThisWeek)<0
    ||![250,275,300].includes(Number(o.weeklyCap))||!Array.isArray(o.claimedDailyKinds)
    ||o.claimedDailyKinds.some(k=>k!=="attendance"&&k!=="contribution")||!Array.isArray(o.cards)
    ||!Array.isArray(o.constructionTemplates)||!Array.isArray(o.construction)
    ||!Array.isArray(o.eventBonuses)||!Array.isArray(o.weeklyRewards))throw new Error('Invalid Guild Token Shop response.');
 const cards:GuildTokenShopCard[]=o.cards.map((candidate:unknown)=>{
  if(!candidate||typeof candidate!=='object')throw new Error('Invalid Guild Shop reward.');
  const c=candidate as Record<string,unknown>;
  if(typeof c.id!=='string'||typeof c.title!=='string'
   ||!categories.has(String(c.category))||!statuses.has(String(c.status))
   ||!Number.isSafeInteger(c.price)||Number(c.price)<0
   ||!Number.isSafeInteger(c.requiredGuildLevel)||Number(c.requiredGuildLevel)<1
   ||typeof c.released!=='boolean'
   ||typeof c.progressToPrice!=='number'||!Number.isFinite(c.progressToPrice)
   ||c.progressToPrice<0||c.progressToPrice>1)throw new Error('Invalid Guild Shop reward.');
  return c as unknown as GuildTokenShopCard;
 });
 const constructionTemplates:GuildConstructionTemplate[]=o.constructionTemplates.map((value:unknown)=>{
  const template=value as GuildConstructionTemplate;
  if(!template||typeof template.id!=='string'||typeof template.unlockId!=='string'||typeof template.enabled!=='boolean'
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
 let bank:GuildBankSnapshot|null=null;
 if(o.bank!=null){
  const b=o.bank as GuildBankSnapshot;
  if(typeof b!=='object'||!Array.isArray(b.balances)||!Array.isArray(b.activity)
   ||b.balances.some(v=>typeof v.resourceId!=='string'||!Number.isSafeInteger(v.amount)||v.amount<0)
   ||b.activity.some(v=>!['deposit','construction'].includes(v.kind)||typeof v.resourceId!=='string'
    ||!Number.isSafeInteger(v.amount)||v.amount<1||typeof v.mine!=='boolean'||typeof v.createdAt!=='string'))
   throw new Error('Invalid Guild Bank snapshot.');
  bank=b;
 }
 const eventBonuses:GuildTokenEventBonus[]=o.eventBonuses.map((value:unknown)=>{
  if(!value||typeof value!=='object')throw new Error('Invalid event reward.');
  const reward=value as Record<string,unknown>;
  if(typeof reward.eventId!=='string'||!/^[A-Za-z0-9_-]{1,80}$/.test(reward.eventId)
   ||![25,50,75,100].includes(Number(reward.milestonePercent))
   ||!Number.isSafeInteger(reward.tokens)||Number(reward.tokens)<1||Number(reward.tokens)>400
   ||typeof reward.claimed!=='boolean')throw new Error('Invalid event reward.');
  return reward as unknown as GuildTokenEventBonus;
 });
 const weeklyRewards:GuildTokenWeeklyReward[]=o.weeklyRewards.map((value:unknown)=>{
  if(!value||typeof value!=='object')throw new Error('Invalid weekly Guild reward.');
  const reward=value as Record<string,unknown>;
  const expected={attendance:50,project:40,boss:30} as const;
  if(typeof reward.kind!=='string'||!(reward.kind in expected)
    ||reward.tokens!==expected[reward.kind as GuildWeeklyRewardKind]
    ||typeof reward.eligible!=='boolean'||typeof reward.claimed!=='boolean')
   throw new Error('Invalid weekly Guild reward.');
  return reward as unknown as GuildTokenWeeklyReward;
 });
 const completed=new Set(construction.filter(progress=>progress.completed).map(progress=>progress.templateId));
 const benefits=guildConstructionBenefits(completed);
 const tierEnabled=(required:number)=>constructionTemplates.some(t=>t.id===`construction_hall_${required+1}`&&t.enabled);
 const displayedCards=cards.map(card=>{
  const quality=GUILD_SHOP_ITEM_QUALITY[card.id]??'standard';
  const required=GUILD_SHOP_QUALITY_TIER[quality];
  const status=required>0&&card.status!=='owned'&&card.status!=='guild_level_locked'
   &&tierEnabled(required)&&GUILD_SHOP_QUALITY_TIER[benefits.shopQuality]<required
    ?'guild_shop_quality_locked' as const:card.status;
  return {...card,quality,status};
 });
 return {unavailableSections:Array.isArray(o.unavailableSections)?o.unavailableSections.filter((item):item is string=>typeof item==='string'):[],guildLevel:o.guildLevel as number,balance:o.balance as number,earnedThisWeek:o.earnedThisWeek as number,
  weeklyCap:Math.max(o.weeklyCap as number,benefits.guildTokenWeeklyCap),treasuryBonusBps:benefits.guildTokenBonusBps,
  cards:displayedCards,claimedDailyKinds:o.claimedDailyKinds as Array<"attendance"|"contribution">,constructionTemplates,construction,bank,eventBonuses,weeklyRewards};
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
  if(!Number.isSafeInteger(body?.credited)||body.credited<0||body.credited>12)
   throw new Error('The reward could not be verified. Please refresh.');
  return body.credited as number;
 }finally{clearTimeout(timeout);}
}

/** An account can own each reward once. If the HTTP response is lost, replay
 * the same SKU: SQL returns already_owned without charging a second time.
 */
export async function purchaseOnlineGuildTokenReward(itemId:string):Promise<'purchased'|'already_owned'>{
 if(!supabase||!supabasePublicEndpoint||!supabasePublicKey)throw new Error('Online services are unavailable.');
 const {data:{session},error}=await supabase.auth.getSession();
 if(error)throw error;
 if(!session)throw new Error('Sign in to purchase Guild rewards.');
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),20000);
 try{
  const response=await fetch(`${supabasePublicEndpoint}/functions/v1/gameplay?view=guild-shop&action=purchase`,{
   method:'POST',signal:controller.signal,
   headers:{Authorization:`Bearer ${session.access_token}`,apikey:supabasePublicKey,'Content-Type':'application/json'},
   body:JSON.stringify({itemId}),
  });
  const body=await response.json();
  if(!response.ok)throw new Error(typeof body?.error==='string'?body.error:'Unable to purchase Guild reward.');
  if(body?.status!=='purchased'&&body?.status!=='already_owned')
   throw new Error('Purchase status could not be verified. Refresh your Guild Shop.');
  return body.status as 'purchased'|'already_owned';
 }finally{clearTimeout(timeout);}
}

/** Event milestone reward amounts are exclusively determined by the server.
 * This call only supplies the identifier of an already-claimed event milestone.
 */
export async function claimOnlineGuildEventBonus(eventId:string,milestonePercent:number):Promise<number>{
 if(!supabase||!supabasePublicEndpoint||!supabasePublicKey)throw new Error('Online services are unavailable.');
 const {data:{session},error}=await supabase.auth.getSession();
 if(error)throw error;
 if(!session)throw new Error('Sign in to claim Guild event rewards.');
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),15000);
 try{
  const response=await fetch(`${supabasePublicEndpoint}/functions/v1/gameplay?view=guild-shop&action=event-claim`,{
   method:'POST',signal:controller.signal,
   headers:{Authorization:`Bearer ${session.access_token}`,apikey:supabasePublicKey,'Content-Type':'application/json'},
   body:JSON.stringify({eventId,milestonePercent}),
  });
  const value=await response.json();
  if(!response.ok)throw new Error(
   typeof value?.error==='string'?value.error:'Unable to claim Guild event bonus.');
  if(!Number.isSafeInteger(value?.credited)||value.credited<0||value.credited>400)
   throw new Error('Event reward result could not be verified.');
  return value.credited as number;
 }finally{clearTimeout(timeout);}
}

/** The backend validates a qualifying goal against recorded Guild activity,
 * determines the amount, and observes the shared 250 normal weekly cap.
 */
export async function claimOnlineGuildWeeklyTokens(kind:GuildWeeklyRewardKind):Promise<number>{
 if(!supabase||!supabasePublicEndpoint||!supabasePublicKey)throw new Error('Online services are unavailable.');
 const {data:{session},error}=await supabase.auth.getSession();
 if(error)throw error;
 if(!session)throw new Error('Sign in to claim weekly Guild Tokens.');
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),15000);
 try{
  const response=await fetch(`${supabasePublicEndpoint}/functions/v1/gameplay?view=guild-shop&action=weekly-claim`,{
   method:'POST',signal:controller.signal,
   headers:{Authorization:`Bearer ${session.access_token}`,apikey:supabasePublicKey,'Content-Type':'application/json'},
   body:JSON.stringify({kind}),
  });
  const value=await response.json();
  if(!response.ok)throw new Error(typeof value?.error==='string'?value.error:'Weekly Guild reward could not be claimed.');
  if(!Number.isSafeInteger(value?.credited)||value.credited<0||value.credited>60)
   throw new Error('The weekly reward result could not be verified.');
  return value.credited as number;
 }finally{clearTimeout(timeout);}
}
