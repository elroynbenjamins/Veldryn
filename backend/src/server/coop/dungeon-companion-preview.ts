import {COOP_ROUTE_CONTENT} from '../expeditions/content/coop-route-content';
import {EXPEDITIONS} from '../expeditions/content/launch-content';
import {dungeonBossVariantsFor} from '../expeditions/content/dungeon-boss-rotation';
  const encounter=EXPEDITION_ENCOUNTERS[id]?.();
  if(!encounter)continue;
  for(const counter of dungeonCompanionCounterOptions(encounter))result.add(counter);
 }
 return [...result];
}
