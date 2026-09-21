import {createCharacter,newGame} from '../core/game';
import type {BodyPresentation,ClassId,GameState} from '../core/types';
import {debugPrepareFullQaSandbox} from './debug-tools';
import {MAX_CLASS_SKILL_XP} from '../core/class-skills';
import {classSkillsFor} from '../content/class-skills';

export const ADMIN_QA_CLASSES:ClassId[]=['IRONWARDEN','BASTION','DREADGUARD','DAWNKEEPER','WAYFINDER','RAVAGER','HEXWEAVER','KNIFE_DANCER','STONECALLER'];

function freshQaCharacter(classId:ClassId,bodyPresentation:BodyPresentation,nowMs:number){
  return createCharacter(newGame(nowMs),classId,'Veldryn Admin',bodyPresentation);
}

/**
 * Thin UI-facing wrapper around the canonical debug QA sandbox.
 * A class switch intentionally rebuilds the local QA save so each class starts
 * from the same deterministic full-access baseline.
 */
export function buildAdminQaState(current:GameState|undefined|null,classId:ClassId='IRONWARDEN',nowMs=Date.now()):GameState{
  const bodyPresentation=current?.character?.bodyPresentation??'male';
  const base=current?.character?.classId===classId&&(current.character.profileTitle==='QA Administrator'||current.character.name==='Veldryn Admin')
    ?current
    :freshQaCharacter(classId,bodyPresentation,nowMs);
  const prepared=debugPrepareFullQaSandbox(base);
  if(!prepared.character)return prepared;
  return {...prepared,character:{...prepared.character,classSkills:classSkillsFor(classId).map(skill=>({skillId:skill.id,xp:MAX_CLASS_SKILL_XP,level:100}))}};
}

export function refillAdminQaResources(state:GameState):GameState{
  return debugPrepareFullQaSandbox(state);
}

export function isAdminQaState(state:GameState|undefined|null):boolean{
  return state?.character?.profileTitle==='QA Administrator'||state?.character?.name==='Veldryn Admin';
}
