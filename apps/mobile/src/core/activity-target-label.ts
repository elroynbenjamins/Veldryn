import {MONSTERS} from '../content/monsters';
import {GATHERING,RECIPES} from '../content/skills';
import {HERB_NODES} from '../content/herbalism';
import {FAITH_TIERS} from '../content/faith';
import {EXPLORATION_ROUTES} from '../content/exploration';
import type {ActivityKind} from './types';

/** Player-facing names for persisted activity target IDs. Never render IDs directly in UI. */
export function activityTargetLabel(activity: {kind:ActivityKind|'gathering';targetId:string}):string {
 const {kind,targetId}=activity;
 let label:string|undefined;
 switch(kind){
  case 'combat':label=MONSTERS.find(row=>row.id===targetId)?.name;break;
  case 'mining':
  case 'woodcutting':
  case 'fishing':
  case 'herbalism':
  case 'gathering':label=[...GATHERING,...HERB_NODES].find(row=>row.id===targetId)?.name;break;
  case 'alchemy':
  case 'processing':label=RECIPES.find(row=>row.id===targetId)?.name;break;
  case 'faith':label=FAITH_TIERS.find(row=>row.id===targetId)?.name;break;
  case 'exploration':label=EXPLORATION_ROUTES.find(row=>row.id===targetId)?.name;break;
  case 'training':label=targetId==='class_drills'?'Class drills':undefined;break;
 }
 // Old saves or newly introduced content can have an unknown ID. Keep it readable.
 return label??(targetId.replace(/[_-]+/g,' ').replace(/\s+/g,' ').trim().toLowerCase().replace(/(^|\s)\S/g,part=>part.toUpperCase())||'Activity');
}
