import {createHash} from 'node:crypto';
import type {AbilityDefinition} from '../combat/types';
import type {VerifiedCombatSnapshot} from '../combat/snapshot-adapter';
import type {AuthoritativeLoadoutRecord} from '../coop/loadout-snapshots';
import {normalizeCombatInput,ROOTBOUND_ROLE_REFERENCES} from '../coop/normalization';
import {deriveRole} from '../coop/role-readiness';
import type {ArenaPosition,ArenaSquadSnapshot} from './arena';

export const ARENA_MIN_LEVEL=15;
export const ARENA_NORMALIZATION_VERSION='arena-normalization-v2';
export interface ArenaCharacterSelection{characterId:string;position:ArenaPosition;}
export interface ArenaLoadoutRepository{getActiveArenaLoadout(accountId:string,characterId:string):AuthoritativeLoadoutRecord|undefined;}
function canonical(value:unknown):string{if(Array.isArray(value))return`[${value.map(canonical).join(',')}]`;if(value&&typeof value==='object')return`{${Object.entries(value as Record<string,unknown>).sort(([a],[b])=>a.localeCompare(b)).map(([key,item])=>`${JSON.stringify(key)}:${canonical(item)}`).join(',')}}`;return JSON.stringify(value)}
function converge(value:number,reference:number,retention:number,minRatio=.85,maxRatio=1.15){const next=reference+(value-reference)*retention;return Math.max(reference*minRatio,Math.min(reference*maxRatio,next));}
function freezeFighter(accountId:string,selection:ArenaCharacterSelection,repository:ArenaLoadoutRepository){
  const record=repository.getActiveArenaLoadout(accountId,selection.characterId);
  if(!record||record.accountId!==accountId||record.characterId!==selection.characterId)throw new Error('arena_character_not_owned');
  if(record.characterLevel<ARENA_MIN_LEVEL)throw new Error('arena_character_below_min_level');
  if(!record.legalEquipment)throw new Error('arena_illegal_equipment');
  const role=deriveRole(record.classId),source:VerifiedCombatSnapshot={...record.stats,role,classId:record.classId,characterId:record.characterId,level:record.characterLevel};
  const normalized=normalizeCombatInput(source,record.abilities,Math.min(100,record.characterLevel),ROOTBOUND_ROLE_REFERENCES[role]);
  if(!Number.isFinite(normalized.snapshot.maxHp)||!Number.isFinite(normalized.snapshot.attackPower)||!Number.isFinite(normalized.snapshot.defense)||!Number.isFinite(normalized.snapshot.healingPower))throw new Error('arena_invalid_loadout_stats');
  const reference=ROOTBOUND_ROLE_REFERENCES[role],scale=normalized.snapshot.level/reference.level;
  const snapshot={...normalized.snapshot,maxHp:converge(normalized.snapshot.maxHp,reference.maxHp*scale,.35),attackPower:converge(normalized.snapshot.attackPower,reference.attackPower*scale,.30),healingPower:converge(normalized.snapshot.healingPower,reference.healingPower*scale,.30),defense:converge(normalized.snapshot.defense,reference.defense*scale,.35),accuracy:converge(normalized.snapshot.accuracy,reference.accuracy*scale,.5,.9,1.1),evasion:converge(normalized.snapshot.evasion,reference.evasion*scale,.5,.9,1.1)};
  const normalizedPower=Math.max(1,Math.round(snapshot.maxHp*.08+snapshot.attackPower*1.7+snapshot.healingPower*.9+snapshot.defense*.9+snapshot.accuracy*.15+snapshot.evasion*.15));
  return {characterId:record.characterId,classId:record.classId,displayName:record.stats.displayName,position:selection.position,role,normalizedPower,stats:snapshot,abilities:structuredClone(normalized.abilities as AbilityDefinition[])};
}
export function freezeArenaSquad(input:{accountId:string;squadVersion:number;formationVersion:number;rating:number;selections:readonly ArenaCharacterSelection[];repository:ArenaLoadoutRepository;}):ArenaSquadSnapshot{
  if(input.selections.length!==3)throw new Error('arena_requires_exactly_3_characters');
  if(new Set(input.selections.map(x=>x.characterId)).size!==3)throw new Error('arena_duplicate_character');
  if(new Set(input.selections.map(x=>x.position)).size!==3)throw new Error('arena_requires_front_middle_back');
  const fighters=input.selections.map(selection=>freezeFighter(input.accountId,selection,input.repository));
  const bare={accountId:input.accountId,squadVersion:input.squadVersion,formationVersion:input.formationVersion,fighters,rating:Math.max(0,Math.round(input.rating))};
  const snapshotHash=Buffer.from(createHash('sha256').update(canonical({...bare,normalizationVersion:ARENA_NORMALIZATION_VERSION})).digest()).toString('hex');
  return {...bare,snapshotHash};
}
export function arenaPowerBand(snapshot:ArenaSquadSnapshot){if(snapshot.fighters.length!==3||snapshot.fighters.some(fighter=>!Number.isFinite(fighter.normalizedPower)||fighter.normalizedPower<=0))throw new Error('arena_invalid_power_band');return Math.max(1,Math.round(snapshot.fighters.reduce((sum,fighter)=>sum+fighter.normalizedPower,0)/snapshot.fighters.length/500));}
