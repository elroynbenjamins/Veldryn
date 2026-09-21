export const LIVE_EVENT_VISUAL_KEYS=[
  'turning_of_the_age',
  'heartbond',
  'bloomwake',
  'suncrest',
  'starfall',
  'harvestwake',
  'veilbreak',
  'merchant_guild',
  'frostfall',
] as const;

export type LiveEventVisualKey=typeof LIVE_EVENT_VISUAL_KEYS[number];

export function isLiveEventVisualKey(value:unknown):value is LiveEventVisualKey{
  return typeof value==='string'&&(LIVE_EVENT_VISUAL_KEYS as readonly string[]).includes(value);
}
