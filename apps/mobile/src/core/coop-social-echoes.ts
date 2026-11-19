/** Candidates are server-filtered: only opt-in, nonblocked, currently shared
 * friend/guild Echoes. The client sends profile IDs, never stats or roles. */
export type SocialEchoRelationship='friend'|'guild'|'both';
export interface SocialEchoCandidate{
 profileId:string;
 characterId:string;
 accountId:string;
 name:string;
 classId:string;
 role:'tank'|'damage'|'support';
 level:number;
 combatPower:number;
 relationship:SocialEchoRelationship;
}
export function validateSocialEchoCandidates(value:unknown):SocialEchoCandidate[]{
 if(!Array.isArray(value)||value.length>128)throw new Error('invalid_social_echo_candidates');
 const ids=new Set<string>(),result:SocialEchoCandidate[]=[];
 for(const raw of value){
  if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new Error('invalid_social_echo_candidates');
  const c=raw as Record<string,unknown>;
  if(typeof c.profileId!=='string'||!/^[0-9a-f-]{36}$/i.test(c.profileId)||ids.has(c.profileId)
   ||typeof c.characterId!=='string'||typeof c.accountId!=='string'
   ||typeof c.name!=='string'||c.name.length<1||c.name.length>80
   ||typeof c.classId!=='string'||!['tank','damage','support'].includes(String(c.role))
   ||!Number.isSafeInteger(c.level)||Number(c.level)<1||Number(c.level)>100
   ||!Number.isFinite(c.combatPower)||Number(c.combatPower)<0
   ||!['friend','guild','both'].includes(String(c.relationship)))throw new Error('invalid_social_echo_candidates');
  ids.add(c.profileId);result.push(c as unknown as SocialEchoCandidate);
 }
 return result;
}
export function validateSelectedSocialEchoIds(ids:readonly string[],candidates:readonly SocialEchoCandidate[],hostClassId:string,hostRole:string):void{
 if(ids.length>3||new Set(ids).size!==ids.length)throw new Error('invalid_echo_selection');
 const selected=ids.map(id=>candidates.find(row=>row.profileId===id));
 if(selected.some(row=>!row))throw new Error('social_echo_unavailable');
 const seenAccounts=new Set<string>(),seenRoles:Record<string,number>={tank:hostRole==='tank'?1:0,damage:hostRole==='damage'?1:0,support:hostRole==='support'?1:0};
 const damageClasses=new Set(hostRole==='damage'?[hostClassId.toUpperCase()]:[]);
 for(const row of selected){
  if(!row)throw new Error('social_echo_unavailable');
  if(seenAccounts.has(row.accountId))throw new Error('duplicate_coop_account');
  seenAccounts.add(row.accountId);
  seenRoles[row.role]=(seenRoles[row.role]??0)+1;
  if(seenRoles.tank>1||seenRoles.damage>2||seenRoles.support>1)throw new Error('invalid_echo_role_composition');
  if(row.role==='damage'){
   const classId=row.classId.toUpperCase();
   if(damageClasses.has(classId))throw new Error('duplicate_damage_class');
   damageClasses.add(classId);
  }
 }
}
