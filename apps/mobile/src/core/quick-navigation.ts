export const QUICK_NAV_DESTINATIONS=[
  'Home','Character','Skills','World','Inventory','More','Guild','Dungeon','Quests','Companions','Friends','Settings','Social','Party','Empty',
] as const;
/** Account is retained as a legacy save value; new shortcut choices use More. */
export type QuickNavDestination=typeof QUICK_NAV_DESTINATIONS[number]|'Account'|'Events';
export const DEFAULT_QUICK_NAV_DESTINATIONS:QuickNavDestination[]=['Guild','Dungeon','Character','Quests','Empty'];
const allowed=new Set<string>(QUICK_NAV_DESTINATIONS);
export function normalizeQuickNavDestinations(value:unknown):QuickNavDestination[]{
 if(!Array.isArray(value))return [...DEFAULT_QUICK_NAV_DESTINATIONS];
 const cleaned=value.map(v=>{if(v==='Account')return 'More';return typeof v==='string'&&allowed.has(v)?v:'Empty'}) as QuickNavDestination[];
 const unique=cleaned.filter((destination,index)=>destination==='Empty'||cleaned.indexOf(destination)===index);
 while(unique.length<5)unique.push('Empty');
 return unique.slice(0,5);
}
