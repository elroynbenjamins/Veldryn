import {QUESTS} from '../content/quests';
import {GameState} from './types';
import {CLASSES} from '../content/classes';
import {normalizeCustomization} from './customization';

export function normalizeSave(input:any):GameState{
  if(!input || ![4,5].includes(input.version)) throw new Error('Unsupported VELDRYN save version');
  const existing=new Map<string,any>((input.quests||[]).map((q:any)=>[q.questId,q]));
  let priorClaimed=true;
  const quests=QUESTS.map((def,index)=>{
    const old=existing.get(def.id);
    if(old){priorClaimed=old.status==='claimed';return old;}
    const status=index===0?'active':priorClaimed?'active':'locked';
    priorClaimed=false;
    return {questId:def.id,status,progress:0};
  });
  const classDef=input.character?CLASSES.find(c=>c.id===input.character.classId):undefined;
  const character=input.character?{
    ...input.character,
    bodyPresentation:input.character.bodyPresentation==='female'?'female':'male',
    customization:normalizeCustomization(input.character.customization),
    craftedNoviceItemIds:Array.isArray(input.character.craftedNoviceItemIds)?[...new Set(input.character.craftedNoviceItemIds.filter((id:unknown)=>typeof id==='string'))]:[],
    currentHp:Math.max(1,Number(input.character.currentHp ?? input.character.hp ?? classDef?.hp ?? 100)),
    equippedFoodId:input.character.equippedFoodId
  }:null;
  return {
    ...input,
    version:5,
    character,
    inventory:{stacks:Array.isArray(input.inventory?.stacks)?input.inventory.stacks:[],capacity:Number(input.inventory?.capacity ?? 30)},
    bank:{stacks:Array.isArray(input.bank?.stacks)?input.bank.stacks:[],capacity:Number(input.bank?.capacity ?? 120)},
    overflow:{stacks:Array.isArray(input.overflow?.stacks)?input.overflow.stacks:[],expiresAtMs:input.overflow?.expiresAtMs ?? null},
    quests,
    unlockedMonsterIds:Array.isArray(input.unlockedMonsterIds)?input.unlockedMonsterIds:['MOSS_RAT'],
    defeatedBossIds:Array.isArray(input.defeatedBossIds)?input.defeatedBossIds:[],
    settings:{
      numberMode:input.settings?.numberMode||'abbreviated',
      reduceMotion:!!input.settings?.reduceMotion,
      textScale:input.settings?.textScale||1,
      autoEatThresholdPct:Number(input.settings?.autoEatThresholdPct ?? 40),
      stopCombatWhenOutOfFood:input.settings?.stopCombatWhenOutOfFood!==false,
    }
  } as GameState;
}
