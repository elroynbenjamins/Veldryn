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
