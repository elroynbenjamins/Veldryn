import {versionedFetch as fetch} from './versioned-fetch';
import {supabase,supabasePublicEndpoint,supabasePublicKey} from './supabase';

export interface GuildSkillNode{
 id:string;name:string;branch:string;perTier:number;
 maxRank:number;rank:number;released:boolean;
 costs:Array<{rank:number;resourceId:string;amount:number}>;
}
export interface GuildSkillsSnapshot{
 guildId:string;guildLevel:number;role:string;canUpgrade:boolean;
 totalSkillPoints:number;spentSkillPoints:number;skillPoints:number;
 nodes:GuildSkillNode[];bank:Array<{resourceId:string;amount:number}>;
}
export interface GuildSkillUpgradeResult{
 alreadyProcessed:boolean;skillId:string;rank:number;
 costs:Array<{resourceId:string;amount:number}>;
}

function num(value:unknown):number{return typeof value==='number'&&Number.isFinite(value)?value:0;}

function validateSnapshot(value:unknown):GuildSkillsSnapshot{
 if(!value||typeof value!=='object')throw new Error('Invalid Guild Skills response.');
 const o=value as Record<string,unknown>;
 if(!Array.isArray(o.nodes)||!Array.isArray(o.bank)
  ||!Number.isSafeInteger(o.totalSkillPoints)||!Number.isSafeInteger(o.spentSkillPoints)
  ||!Number.isSafeInteger(o.skillPoints)||typeof o.guildLevel!=='number')
  throw new Error('Invalid Guild Skills response.');
 const nodes:GuildSkillNode[]=o.nodes.map(raw=>{
  if(!raw||typeof raw!=='object')throw new Error('Invalid Guild Skill node.');
  const n=raw as Record<string,unknown>;
  if(typeof n.id!=='string'||typeof n.name!=='string'||typeof n.branch!=='string'
   ||!Array.isArray(n.costs)||typeof n.released!=='boolean')
   throw new Error('Invalid Guild Skill node.');
  return {
   id:n.id,name:n.name,branch:n.branch,perTier:num(n.perTier),
   maxRank:Math.max(0,Math.floor(num(n.maxRank))),rank:Math.max(0,Math.floor(num(n.rank))),
   released:n.released===true,
   costs:(n.costs as unknown[]).map(c=>{const r=c as Record<string,unknown>;return {rank:Math.max(0,Math.floor(num(r.rank))),resourceId:String(r.resourceId??''),amount:Math.max(0,Math.floor(num(r.amount)))};}),
  };
 });
 const bank=(o.bank as unknown[]).map(b=>{const r=b as Record<string,unknown>;return {resourceId:String(r.resourceId??''),amount:Math.max(0,Math.floor(num(r.amount)))};});
 return {
  guildId:String(o.guildId??''),guildLevel:num(o.guildLevel),role:String(o.role??'member'),
  canUpgrade:o.canUpgrade===true,totalSkillPoints:o.totalSkillPoints as number,spentSkillPoints:o.spentSkillPoints as number,
  skillPoints:o.skillPoints as number,nodes,bank,
 };
}

/** Read the authoritative Guild Skill Tree snapshot. Returns null when the
 * player is not in a guild (server 403). No ranks or balances are trusted
 * from the device; everything comes from the server-verified snapshot. */
export async function loadOnlineGuildSkills():Promise<GuildSkillsSnapshot|null>{
 if(!supabase||!supabasePublicEndpoint||!supabasePublicKey)throw new Error('Online services are unavailable.');
 const {data:{session},error:authError}=await supabase.auth.getSession();
 if(authError)throw authError;
 if(!session)throw new Error('Sign in to view Guild Skills.');
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),15000);
 try{
  const response=await fetch(`${supabasePublicEndpoint}/functions/v1/gameplay?view=guild-skills`,{
   method:'GET',signal:controller.signal,
   headers:{Authorization:`Bearer ${session.access_token}`,apikey:supabasePublicKey},
  });
  if(response.status===403)return null;
  const value=await response.json();
  if(!response.ok)throw new Error(typeof value?.error==='string'?value.error:'Guild Skills unavailable.');
  return validateSnapshot(value);
 }finally{clearTimeout(timeout);}
}

/** Submit an authoritative Guild Skill rank upgrade. The account is taken from
 * the verified token server-side; only {skillId,requestKey} is sent. Re-sending
 * the same requestKey is safe (server returns alreadyProcessed). */
export async function upgradeOnlineGuildSkill(skillId:string,requestKey:string):Promise<GuildSkillUpgradeResult>{
 if(!supabase||!supabasePublicEndpoint||!supabasePublicKey)throw new Error('Online services are unavailable.');
 const {data:{session},error}=await supabase.auth.getSession();
 if(error)throw error;
 if(!session)throw new Error('Sign in to upgrade Guild Skills.');
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),15000);
 try{
  const response=await fetch(`${supabasePublicEndpoint}/functions/v1/gameplay?view=guild-skills&action=upgrade`,{
   method:'POST',signal:controller.signal,
   headers:{Authorization:`Bearer ${session.access_token}`,apikey:supabasePublicKey,'Content-Type':'application/json'},
   body:JSON.stringify({skillId,requestKey}),
  });
  const value=await response.json();
  if(!response.ok)throw new Error(typeof value?.error==='string'?value.error:'Guild Skill upgrade failed.');
  return value as GuildSkillUpgradeResult;
 }finally{clearTimeout(timeout);}
}
