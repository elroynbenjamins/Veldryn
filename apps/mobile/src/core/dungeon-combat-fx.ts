import type {ClassId} from './types';
import type {CoopCombatReplayCueView} from './coop-presentation';

export type DungeonCombatFxAccent='gold'|'cyan'|'danger'|'violet'|'success';
export type DungeonCombatActorMotion='none'|'brace'|'lunge'|'smash'|'projectile'|'dash'|'cast'|'pulse';
export type DungeonCombatTargetMotion='none'|'shake'|'pulse'|'brace';

export interface DungeonCombatClassFxProfile{
  classId:ClassId;
  damageLabel:string;
  damageGlyph:string;
  damageAccent:DungeonCombatFxAccent;
  damageMotion:DungeonCombatActorMotion;
  actorTravelPx:number;
  effectTravelPx:number;
  targetShakePx:number;
  durationMs:number;
}

export interface DungeonCombatCueFx{
  label:string;
  glyph:string;
  accent:DungeonCombatFxAccent;
  actorMotion:DungeonCombatActorMotion;
  targetMotion:DungeonCombatTargetMotion;
  actorTravelPx:number;
  effectTravelPx:number;
  targetShakePx:number;
  durationMs:number;
}

export const DUNGEON_COMBAT_CLASS_FX:Readonly<Record<ClassId,DungeonCombatClassFxProfile>>=Object.freeze({
  IRONWARDEN:{classId:'IRONWARDEN',damageLabel:'STEEL ARC',damageGlyph:'/',damageAccent:'gold',damageMotion:'lunge',actorTravelPx:8,effectTravelPx:34,targetShakePx:3,durationMs:250},
  BASTION:{classId:'BASTION',damageLabel:'HAMMER IMPACT',damageGlyph:'◆',damageAccent:'gold',damageMotion:'smash',actorTravelPx:5,effectTravelPx:20,targetShakePx:5,durationMs:340},
  DREADGUARD:{classId:'DREADGUARD',damageLabel:'CHAIN IMPACT',damageGlyph:'◉',damageAccent:'danger',damageMotion:'smash',actorTravelPx:7,effectTravelPx:30,targetShakePx:5,durationMs:320},
  WAYFINDER:{classId:'WAYFINDER',damageLabel:'ARROW SHOT',damageGlyph:'›',damageAccent:'cyan',damageMotion:'projectile',actorTravelPx:2,effectTravelPx:72,targetShakePx:2,durationMs:300},
  RAVAGER:{classId:'RAVAGER',damageLabel:'BREAKER SWING',damageGlyph:'✦',damageAccent:'danger',damageMotion:'smash',actorTravelPx:10,effectTravelPx:30,targetShakePx:6,durationMs:330},
  HEXWEAVER:{classId:'HEXWEAVER',damageLabel:'HEX BOLT',damageGlyph:'◇',damageAccent:'violet',damageMotion:'projectile',actorTravelPx:3,effectTravelPx:66,targetShakePx:3,durationMs:330},
  KNIFE_DANCER:{classId:'KNIFE_DANCER',damageLabel:'BLADE DASH',damageGlyph:'×',damageAccent:'cyan',damageMotion:'dash',actorTravelPx:15,effectTravelPx:24,targetShakePx:4,durationMs:210},
  DAWNKEEPER:{classId:'DAWNKEEPER',damageLabel:'DAWN STRIKE',damageGlyph:'✚',damageAccent:'success',damageMotion:'pulse',actorTravelPx:3,effectTravelPx:28,targetShakePx:2,durationMs:300},
  STONECALLER:{classId:'STONECALLER',damageLabel:'STONE PULSE',damageGlyph:'⬡',damageAccent:'gold',damageMotion:'cast',actorTravelPx:2,effectTravelPx:36,targetShakePx:4,durationMs:350},
});

const DEFAULT_DAMAGE: DungeonCombatCueFx={label:'IMPACT',glyph:'◆',accent:'cyan',actorMotion:'lunge',targetMotion:'shake',actorTravelPx:7,effectTravelPx:32,targetShakePx:3,durationMs:280};

export function dungeonCombatClassFx(classId:string|undefined):DungeonCombatClassFxProfile|undefined{
  if(!classId)return undefined;
  return DUNGEON_COMBAT_CLASS_FX[classId.toUpperCase() as ClassId];
}

export function dungeonCombatCueFx(cue:CoopCombatReplayCueView|undefined,actorClassId?:string):DungeonCombatCueFx|undefined{
  if(!cue)return undefined;
  if(cue.type==='action'){
    if(cue.outcome==='miss')return {label:'MISS',glyph:'○',accent:'cyan',actorMotion:'dash',targetMotion:'none',actorTravelPx:4,effectTravelPx:20,targetShakePx:0,durationMs:220};
    if(cue.actionKind==='heal')return {label:cue.gemProc?'GEM HEAL':'RESTORE',glyph:'+',accent:cue.gemProc?'violet':'success',actorMotion:'pulse',targetMotion:'pulse',actorTravelPx:0,effectTravelPx:18,targetShakePx:0,durationMs:320};
    if(cue.actionKind==='shield')return {label:cue.gemProc?'GEM BARRIER':'WARD',glyph:'▣',accent:cue.gemProc?'violet':'gold',actorMotion:'brace',targetMotion:'brace',actorTravelPx:0,effectTravelPx:12,targetShakePx:0,durationMs:320};
    if(cue.outcome==='critical')return {label:cue.gemProc?'GEM CRIT':'CRITICAL',glyph:'✦',accent:'gold',actorMotion:'smash',targetMotion:'shake',actorTravelPx:10,effectTravelPx:36,targetShakePx:6,durationMs:360};
    if(cue.absorbed&&cue.absorbed>0)return {label:'BARRIER HIT',glyph:'▣',accent:'gold',actorMotion:'lunge',targetMotion:'brace',actorTravelPx:6,effectTravelPx:24,targetShakePx:0,durationMs:300};
    if(cue.gemProc)return {label:'GEM PROC',glyph:'✧',accent:'violet',actorMotion:'pulse',targetMotion:'shake',actorTravelPx:0,effectTravelPx:24,targetShakePx:3,durationMs:330};
    const profile=dungeonCombatClassFx(actorClassId);
    return profile?{label:profile.damageLabel,glyph:profile.damageGlyph,accent:profile.damageAccent,actorMotion:profile.damageMotion,targetMotion:'shake',actorTravelPx:profile.actorTravelPx,effectTravelPx:profile.effectTravelPx,targetShakePx:profile.targetShakePx,durationMs:profile.durationMs}:DEFAULT_DAMAGE;
  }
  switch(cue.type){
    case 'assist': return {label:'COMPANION ASSIST',glyph:'◇',accent:'violet',actorMotion:'pulse',targetMotion:'pulse',actorTravelPx:0,effectTravelPx:24,targetShakePx:0,durationMs:380};
    case 'cast': return {label:'ENEMY CAST',glyph:'!',accent:'danger',actorMotion:'cast',targetMotion:'none',actorTravelPx:0,effectTravelPx:0,targetShakePx:0,durationMs:420};
    case 'phase': return {label:'PHASE SHIFT',glyph:'◆',accent:'violet',actorMotion:'cast',targetMotion:'none',actorTravelPx:0,effectTravelPx:0,targetShakePx:0,durationMs:460};
    case 'interrupt': return {label:'INTERRUPT',glyph:'×',accent:'cyan',actorMotion:'lunge',targetMotion:'shake',actorTravelPx:6,effectTravelPx:26,targetShakePx:5,durationMs:250};
    case 'down': return {label:'DOWN',glyph:'↓',accent:'danger',actorMotion:'none',targetMotion:'shake',actorTravelPx:0,effectTravelPx:0,targetShakePx:3,durationMs:260};
    case 'victory': return {label:'CLEAR',glyph:'✓',accent:'success',actorMotion:'pulse',targetMotion:'none',actorTravelPx:0,effectTravelPx:0,targetShakePx:0,durationMs:420};
    case 'wipe': return {label:'DEFEAT',glyph:'×',accent:'danger',actorMotion:'none',targetMotion:'none',actorTravelPx:0,effectTravelPx:0,targetShakePx:0,durationMs:420};
    case 'timeout': return {label:'TIME',glyph:'…',accent:'gold',actorMotion:'none',targetMotion:'none',actorTravelPx:0,effectTravelPx:0,targetShakePx:0,durationMs:420};
  }
}

export function dungeonCombatFxNeedsTravel(fx:DungeonCombatCueFx|undefined):boolean{
  return Boolean(fx&&fx.effectTravelPx>0&&(fx.actorMotion==='projectile'||fx.actorMotion==='dash'||fx.actorMotion==='lunge'||fx.actorMotion==='smash'));
}
