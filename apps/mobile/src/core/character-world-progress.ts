import type {GameState} from './types';
import {QUESTS} from '../content/quests';
import {EXPLORATION_ROUTES} from '../content/exploration';

type CharacterSnapshot=NonNullable<GameState['otherCharacters']>[number];
type WorldProgress=Pick<GameState,'unlockedMonsterIds'|'exploredRouteIds'|'defeatedBossIds'>;
const COMPLETED=new Set(['complete','claimed']);

function hasCompletedQuest(entry:CharacterSnapshot,questId:string){
 return entry.quests.some(quest=>quest.questId===questId&&COMPLETED.has(quest.status));
}

/** Capture progression owned by a character, not the account. Account rewards and bank stay shared. */
export function snapshotCharacterWorldProgress(state:GameState):WorldProgress{
 return {
  unlockedMonsterIds:[...state.unlockedMonsterIds],
  exploredRouteIds:[...(state.exploredRouteIds??[])],
  defeatedBossIds:[...state.defeatedBossIds],
 };
}

/** Older roster entries did not save world flags. Recover only provable milestones, never
 * borrow a different character's flags (which would unlock their content on an alt). */
function legacyWorldProgress(entry:CharacterSnapshot):WorldProgress{
 const routes=new Set<string>();
 const region=entry.currentRegionId;
 if(hasCompletedQuest(entry,'QST_003')||['OLD_MINES','KINGS_ROAD','SUNSCAR','FROSTMARCH'].includes(region))routes.add('SCOUT_IRONWOOD');
 if(['KINGS_ROAD','SUNSCAR','FROSTMARCH'].includes(region)||['QST_012','QST_013','QST_014'].some(id=>hasCompletedQuest(entry,id)))routes.add('SCOUT_OLD_MINES');
 if(['SUNSCAR','FROSTMARCH'].includes(region))routes.add('SCOUT_KINGS_ROAD');
 if(region==='FROSTMARCH')routes.add('SCOUT_SUNSCAR');

 const defeatedBossIds=hasCompletedQuest(entry,'QST_014')?['FALLEN_KNIGHT']:[];
 const unlocked=new Set<string>(['MOSS_RAT']);
 for(const quest of QUESTS){
  if(quest.kind==='kills'&&quest.targetId&&hasCompletedQuest(entry,quest.id))unlocked.add(quest.targetId);
 }
 for(const route of EXPLORATION_ROUTES){
  if(routes.has(route.id)&&route.unlockMonsterId)unlocked.add(route.unlockMonsterId);
 }
 return {unlockedMonsterIds:[...unlocked],exploredRouteIds:[...routes],defeatedBossIds};
}

export function restoreCharacterWorldProgress(entry:CharacterSnapshot):WorldProgress{
 const legacy=legacyWorldProgress(entry);
 return {
  unlockedMonsterIds:Array.isArray(entry.unlockedMonsterIds)?[...entry.unlockedMonsterIds]:legacy.unlockedMonsterIds,
  exploredRouteIds:Array.isArray(entry.exploredRouteIds)?[...entry.exploredRouteIds]:legacy.exploredRouteIds,
  defeatedBossIds:Array.isArray(entry.defeatedBossIds)?[...entry.defeatedBossIds]:legacy.defeatedBossIds,
 };
}
