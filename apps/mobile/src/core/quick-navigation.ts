export const QUICK_NAV_DESTINATIONS=[
  'Guild','Quests','ResourceCodex','Party','Activity','Forge','Dungeon','Companions','Pets','Collections','Friends','Social','Events','Settings',
] as const;
type SelectableQuickNavDestination=typeof QUICK_NAV_DESTINATIONS[number];
/** Permanent navigation and Empty remain valid internal/legacy route values, not shortcut choices. */
export type QuickNavDestination=SelectableQuickNavDestination|'Home'|'Character'|'Skills'|'World'|'Inventory'|'More'|'Account'|'Empty';
export const DEFAULT_QUICK_NAV_DESTINATIONS:QuickNavDestination[]=['Guild','Quests','ResourceCodex','Party','Activity'];
const LEGACY_DEFAULT=['Quests','Dungeon','Companions','Guild','Settings'];
const allowed=new Set<string>(QUICK_NAV_DESTINATIONS);
export function normalizeQuickNavDestinations(value:unknown):QuickNavDestination[]{
 if(!Array.isArray(value)||value.length===LEGACY_DEFAULT.length&&value.every((entry,index)=>entry===LEGACY_DEFAULT[index]))return [...DEFAULT_QUICK_NAV_DESTINATIONS];
 // Keep valid custom choices in their original slots; fill invalid or duplicate slots
 // with unused recommended destinations, then unused available destinations.
 const used=new Set<QuickNavDestination>();
 const slots=Array.from({length:5},(_,index)=>{
   const entry=value[index];
   if(typeof entry!=='string'||!allowed.has(entry)||used.has(entry as QuickNavDestination))return undefined;
   const destination=entry as QuickNavDestination;
   used.add(destination);
   return destination;
 });
 return slots.map(destination=>{
   if(destination)return destination;
   const next=[...DEFAULT_QUICK_NAV_DESTINATIONS,...QUICK_NAV_DESTINATIONS].find(candidate=>!used.has(candidate))!;
   used.add(next);
   return next;
 });
}
