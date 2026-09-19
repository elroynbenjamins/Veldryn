export const QUICK_NAV_DESTINATIONS=[
  'Home','Character','Skills','World','Inventory','Account','More','Guild','Dungeon','Quests','Companions','Events','Friends','Settings','Social','Party','Empty',
] as const;
export type QuickNavDestination=typeof QUICK_NAV_DESTINATIONS[number];
export const DEFAULT_QUICK_NAV_DESTINATIONS:QuickNavDestination[]=['Guild','Dungeon','Character','Quests','Empty'];
const allowed=new Set<string>(QUICK_NAV_DESTINATIONS);
export function normalizeQuickNavDestinations(value:unknown):QuickNavDestination[]{
 if(!Array.isArray(value))return [...DEFAULT_QUICK_NAV_DESTINATIONS];
 const cleaned=value.map(v=>typeof v==='string'&&allowed.has(v)?v:'Empty') as QuickNavDestination[];
 while(cleaned.length<5)cleaned.push('Empty');
 return cleaned.slice(0,5);
}
