export const QUICK_NAV_DESTINATIONS=[
  'Home','Character','World','Inventory','More','Quests','Skills','Events','Friends','Guild','Settings',
] as const;

export type QuickNavDestination=typeof QUICK_NAV_DESTINATIONS[number];

export const DEFAULT_QUICK_NAV_DESTINATIONS:QuickNavDestination[]=['Quests','Skills','Events','Guild','Settings'];

const allowed=new Set<string>(QUICK_NAV_DESTINATIONS);

/** Keeps older or malformed saves from producing an incomplete shortcut menu. */
export function normalizeQuickNavDestinations(value:unknown):QuickNavDestination[]{
  if(!Array.isArray(value))return [...DEFAULT_QUICK_NAV_DESTINATIONS];
  const unique=[...new Set(value.filter((entry):entry is QuickNavDestination=>typeof entry==='string'&&allowed.has(entry)))];
  return unique.length===5?unique:[...DEFAULT_QUICK_NAV_DESTINATIONS];
}
