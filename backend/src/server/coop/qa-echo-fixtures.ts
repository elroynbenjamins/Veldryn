import {createHash} from 'node:crypto';
import {launchPlayer} from '../combat/content/launch-combat';
import type {FrozenLoadoutSnapshot} from './loadout-snapshots';
import type {PublishedEcho} from './echo-recruitment';
import {deriveRole,type ClassId} from './role-readiness';

export const QA_ECHO_CONTENT_VERSION='qa-echo-fixture-v1';

export interface QaEchoDefinition{
  classId:ClassId;
  launchClassName:string;
  label:string;
}

export const QA_ECHO_DEFINITIONS:readonly QaEchoDefinition[]=Object.freeze([
  {classId:'IRONWARDEN',launchClassName:'Ironwarden',label:'QA Ironwarden'},
  {classId:'BASTION',launchClassName:'Bastion',label:'QA Bastion'},
  {classId:'DREADGUARD',launchClassName:'Dreadguard',label:'QA Dreadguard'},
  {classId:'WAYFINDER',launchClassName:'Wayfinder',label:'QA Wayfinder'},
  {classId:'RAVAGER',launchClassName:'Ravager',label:'QA Ravager'},
  {classId:'HEXWEAVER',launchClassName:'Hexweaver',label:'QA Hexweaver'},
  {classId:'KNIFE_DANCER',launchClassName:'Knife Dancer',label:'QA Knife Dancer'},
  {classId:'DAWNKEEPER',launchClassName:'Dawnkeeper',label:'QA Dawnkeeper'},
  {classId:'STONECALLER',launchClassName:'Stonecaller',label:'QA Stonecaller'},
]);

function fixtureHash(value:unknown){
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

export function createQaFrozenLoadout(input:{
  accountId:string;
  characterId?:string;
  classId:ClassId;
  level?:number;
}):FrozenLoadoutSnapshot{
  const definition=QA_ECHO_DEFINITIONS.find(row=>row.classId===input.classId);
  if(!definition)throw new Error(`qa_unknown_class:${input.classId}`);
  const level=input.level??100;
  if(!Number.isInteger(level)||level<1||level>100)throw new Error('qa_invalid_level');
  const player=launchPlayer(definition.launchClassName,level),role=deriveRole(input.classId);
  const characterId=input.characterId??`qa-char-${input.classId.toLowerCase()}`;
  const snapshot={
    characterId,classId:input.classId,displayName:definition.label,bodyPresentation:'male' as const,role,level,
    maxHp:player.stats.maxHp,attackPower:player.stats.attackPower,healingPower:player.stats.healingPower,
    defense:player.stats.defense,accuracy:player.stats.accuracy,evasion:player.stats.evasion,
    critChance:player.stats.critChance,haste:player.stats.haste,
  };
  const frozenBase={
    accountId:input.accountId,characterId,classId:input.classId,
    loadoutId:`qa-loadout-${input.classId.toLowerCase()}`,revision:1,
    normalized:{
      snapshot,abilities:structuredClone(player.abilities),effectiveLevel:level,
      normalizationVersion:QA_ECHO_CONTENT_VERSION,
      before:{level,maxHp:snapshot.maxHp,attackPower:snapshot.attackPower,healingPower:snapshot.healingPower,defense:snapshot.defense},
    },
    readiness:{ready:true,role,normalizedScore:1,failures:[]},
  };
  return {...frozenBase,snapshotHash:fixtureHash(frozenBase)};
}

/** Test/dev Echo pool with one independent source account per class. Production
 * online play still uses verified 24-hour published Echo profiles from Supabase. */
export function createQaEchoPool(input:{
  nowMs:number;
  contentVersion?:string;
  level?:number;
}):PublishedEcho[]{
  const contentVersion=input.contentVersion??QA_ECHO_CONTENT_VERSION;
  return QA_ECHO_DEFINITIONS.map((definition,index)=>{
    const sourceAccountId=`qa-echo-account-${String(index+1).padStart(2,'0')}`;
    return {
      profileId:`qa-echo-profile-${definition.classId.toLowerCase()}`,
      sourceAccountId,optedIn:true,publishedAtMs:input.nowMs,contentVersion,blockedAccountIds:[],
      snapshot:createQaFrozenLoadout({accountId:sourceAccountId,classId:definition.classId,level:input.level??100}),
    };
  });
}
