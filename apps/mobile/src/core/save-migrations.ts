import {GameState} from './types';
import {normalizeSave} from './save-normalization';

export const SAVE_SCHEMA_VERSION:GameState['version']=6;
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
  return normalizeSave(v4Compatible);
}
