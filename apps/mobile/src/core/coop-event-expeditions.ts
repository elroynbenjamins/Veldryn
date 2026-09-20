export type CoopEventExpeditionStatus='preview'|'available';

/** Presentation-only event content. `available` must only be supplied by an authoritative server response. */
export interface CoopEventExpeditionPreview{
  id:string;
  eventName:string;
  name:string;
  description:string;
  routeHighlights:string[];
  enemyNames:string[];
  finalBoss:string;
  status:CoopEventExpeditionStatus;
}

export function validateCoopEventExpeditionPreview(value:CoopEventExpeditionPreview):void{
  if(!value.id.trim()||!value.eventName.trim()||!value.name.trim()||!value.description.trim()||!value.finalBoss.trim())throw new Error('invalid_event_expedition_preview');
  if(value.status!=='preview'&&value.status!=='available')throw new Error('invalid_event_expedition_status');
  if(value.routeHighlights.length<3||new Set(value.routeHighlights.map(item=>item.trim().toLocaleLowerCase())).size!==value.routeHighlights.length||value.routeHighlights.some(item=>!item.trim()))throw new Error('invalid_event_route_highlights');
  if(value.enemyNames.length<3||new Set(value.enemyNames.map(item=>item.trim().toLocaleLowerCase())).size!==value.enemyNames.length||value.enemyNames.some(item=>!item.trim()))throw new Error('invalid_event_enemy_roster');
}
