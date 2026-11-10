import {COOP_ROUTE_CONTENT} from '../expeditions/content/coop-route-content';
import {EXPEDITIONS} from '../expeditions/content/launch-content';
import {EXPEDITION_ENCOUNTERS} from '../combat/content/expedition-encounters';
import {dungeonCompanionCounterOptions,type DungeonCompanionCounterId} from './dungeon-companion-counters';

/** Possible encounters are never guaranteed to appear in a randomized route.
 * The room resolver still performs the final counter check server-side. */
export function possibleDungeonCompanionCounters(dungeonId:string):DungeonCompanionCounterId[]{
 const route=COOP_ROUTE_CONTENT[dungeonId],dungeon=EXPEDITIONS[dungeonId];
 if(!route||!dungeon)return [];
 const result=new Set<DungeonCompanionCounterId>();
 for(const id of [...route.battle,...route.elite,dungeon.bossId]){
  const encounter=EXPEDITION_ENCOUNTERS[id]?.();
  if(!encounter)continue;
  for(const counter of dungeonCompanionCounterOptions(encounter))result.add(counter);
 }
 return [...result];
}
