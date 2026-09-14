import {GameState} from './types';
import {normalizeSave} from './save-normalization';

export const SAVE_SCHEMA_VERSION:GameState['version']=11;
type AnySave=Record<string,unknown>&{version?:number};

export function migrateSave(input:unknown):GameState{
  if(!input||typeof input!=='object')throw new Error('Invalid VELDRYN save');
  const raw=input as AnySave;
  const version=typeof raw.version==='number'?raw.version:1;
  if(version>SAVE_SCHEMA_VERSION)throw new Error(`Save version ${version} is newer than supported version ${SAVE_SCHEMA_VERSION}`);

  // Early prototypes predate explicit migrations but already used the same
  // character/inventory/activity primitives. Promote them to the v4 boundary,
  // then let the canonical v5 normalizer add health, storage and settings.
  const v4Compatible=version<4?{
    ...raw,
    version:4,
    createdAtMs:typeof raw.createdAtMs==='number'?raw.createdAtMs:Date.now(),
    character:raw.character??null,
    inventory:raw.inventory??{stacks:[],capacity:60},
    activity:raw.activity??null,
    quests:Array.isArray(raw.quests)?raw.quests:[],
    unlockedMonsterIds:Array.isArray(raw.unlockedMonsterIds)?raw.unlockedMonsterIds:['MOSS_RAT'],
    defeatedBossIds:Array.isArray(raw.defeatedBossIds)?raw.defeatedBossIds:[],
    skills:Array.isArray(raw.skills)?raw.skills:[],
    settings:raw.settings??{},
  }:raw;
  const normalized=normalizeSave(v4Compatible);
  // The additive companion pass has its own wire boundary. Legacy v6 saves
  // remain v6 unless they actually carry roster or timed Faith/Alchemy state.
  // This keeps old transfer backups stable while making new data explicit.
  const activity=raw.activity as any;
  const character=raw.character as any;
  const hasV11State=Array.isArray(raw.otherCharacters)
    || activity?.kind==='faith'
    || activity?.kind==='alchemy'
    || !!character?.faith?.selectedBlessingId
    || Number((raw.skills as any[])?.find((skill:any)=>skill?.skillId==='alchemy')?.xp)>0
    || Number((raw.rewardRemainders as any)?.['xp:alchemy'])>0
    || !!raw.account && (!!(raw.account as any).collectionPreferences || !!(raw.account as any).guideState)
    || Array.isArray((raw.character as any)?.savedLoadouts);
  return hasV11State?{...normalized,version:11}:normalized;
}
