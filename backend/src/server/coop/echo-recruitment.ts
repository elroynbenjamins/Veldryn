import type { CoopRole } from '../../shared/coop-types';
import { deterministicShuffle } from '../expeditions/rng';
import type { FrozenLoadoutSnapshot } from './loadout-snapshots';
import { COOP_ROGUELITE_CONFIG } from './config';

export interface PublishedEcho {
  profileId:string;
  sourceAccountId:string;
  optedIn:boolean;
  publishedAtMs:number;
  contentVersion:string;
  blockedAccountIds:string[];
  snapshot:FrozenLoadoutSnapshot;
}

function missingRoles(controllerRole:CoopRole):CoopRole[]{
 const roles:CoopRole[]=['tank','damage','damage','support'];
 const index=roles.indexOf(controllerRole); if(index<0)throw new Error('invalid_controller_role');
 roles.splice(index,1); return roles;
}

export function recruitEligibleEchoes(input:{
 serverSecret:string; requestId:string; controllerAccountId:string; controllerRole:CoopRole; controllerClassId:string;
 contentVersion:string; nowMs:number; profiles:readonly PublishedEcho[];
}):ReadonlyArray<PublishedEcho>{
 const eligible=input.profiles.filter(profile=>
  profile.optedIn
  && profile.sourceAccountId!==input.controllerAccountId
  && profile.contentVersion===input.contentVersion
  && profile.publishedAtMs+COOP_ROGUELITE_CONFIG.echoFreshnessMs>input.nowMs
  && !profile.blockedAccountIds.includes(input.controllerAccountId)
  && profile.snapshot.readiness.ready
 );
 const selected:PublishedEcho[]=[]; const usedAccounts=new Set<string>([input.controllerAccountId]); const usedCharacters=new Set<string>();
 const usedDamageClasses=new Set<string>(input.controllerRole==='damage'?[input.controllerClassId.trim().toUpperCase()]:[]);
 for(const role of missingRoles(input.controllerRole)){
  const candidates=deterministicShuffle(input.serverSecret,eligible.filter(profile=>profile.snapshot.readiness.role===role&&!usedAccounts.has(profile.sourceAccountId)&&!usedCharacters.has(profile.snapshot.characterId)&&(role!=='damage'||!usedDamageClasses.has(profile.snapshot.classId.trim().toUpperCase()))),'echo-recruit-v2',input.requestId,input.contentVersion,role,selected.length);
  const chosen=candidates[0]; if(!chosen)throw new Error(`echo_pool_unavailable:${role}`);
  selected.push(chosen); usedAccounts.add(chosen.sourceAccountId); usedCharacters.add(chosen.snapshot.characterId);
  if(role==='damage')usedDamageClasses.add(chosen.snapshot.classId.trim().toUpperCase());
 }
 return Object.freeze(selected.map(profile=>Object.freeze(structuredClone(profile))));
}

/** Prefer eligible real Echoes; fill only missing roles with server-generated NPC kits. */
export interface QModeAlly {kind:'echo'|'npc';snapshot:FrozenLoadoutSnapshot;echo?:PublishedEcho}
export function recruitQModeAllies(input:Parameters<typeof recruitEligibleEchoes>[0]&{npcSnapshots:readonly FrozenLoadoutSnapshot[]}):ReadonlyArray<QModeAlly>{
 const eligible=input.profiles.filter(echo=>echo.optedIn&&echo.sourceAccountId!==input.controllerAccountId
  &&echo.contentVersion===input.contentVersion&&echo.publishedAtMs+COOP_ROGUELITE_CONFIG.echoFreshnessMs>input.nowMs
  &&!echo.blockedAccountIds.includes(input.controllerAccountId)&&echo.snapshot.readiness.ready);
 const team:QModeAlly[]=[],accounts=new Set([input.controllerAccountId]),characters=new Set<string>();
 const usedDamage=new Set(input.controllerRole==='damage'?[input.controllerClassId.trim().toUpperCase()]:[]);
 for(const role of missingRoles(input.controllerRole)){
  const legal=(snapshot:FrozenLoadoutSnapshot)=>snapshot.readiness.ready&&snapshot.readiness.role===role
   &&!accounts.has(snapshot.accountId)&&!characters.has(snapshot.characterId)
   &&(role!=='damage'||!usedDamage.has(snapshot.classId.trim().toUpperCase()));
  const echo=deterministicShuffle(input.serverSecret,eligible.filter(row=>legal(row.snapshot)),
   'echo-recruit-v2',input.requestId,input.contentVersion,role,team.length)[0];
  const npc=echo?undefined:deterministicShuffle(input.serverSecret,input.npcSnapshots.filter(legal),
   'npc-recruit-v1',input.requestId,input.contentVersion,role,team.length)[0];
  if(!echo&&!npc)throw new Error(`echo_pool_unavailable:${role}`);
  const member:QModeAlly=echo?{kind:'echo',snapshot:echo.snapshot,echo}:{kind:'npc',snapshot:npc!};
  team.push(member);accounts.add(member.snapshot.accountId);characters.add(member.snapshot.characterId);
  if(role==='damage')usedDamage.add(member.snapshot.classId.trim().toUpperCase());
 }
 return Object.freeze(team.map(row=>Object.freeze(structuredClone(row))));
}
