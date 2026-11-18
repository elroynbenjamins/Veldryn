/**
 * Canonical player-facing names for Veldryn's rotating World Bosses.
 *
 * IDs such as `sunscar` and `frostmarch` are stable historical protocol
 * identities, not display names. They MUST NOT be renamed in saves, replays,
 * boss receipts, or Supabase records.
 *
 * Proper-noun boss and region names are identical across supported locales;
 * all surrounding explanatory UI copy must be localized before release.
 */
export const WORLD_BOSS_PRESENTATION={
 hollowroot:{name:'Hollowroot',region:'Asterfall',motif:'THE ROOTBOUND ANCIENT'},
 sunscar:{name:'Solbrand',region:'Sunscar',motif:'THE SUN-FORGED TITAN'},
 frostmarch:{name:'Rimewarden',region:'Frostmarch',motif:'THE WHITEOUT SENTINEL'},
} as const;
export type WorldBossPresentationId=keyof typeof WORLD_BOSS_PRESENTATION;

/** Unknown or untrusted identity must not be displayed as a real event. */
export function worldBossPresentationFor(
 id:unknown,
):typeof WORLD_BOSS_PRESENTATION[WorldBossPresentationId]|null{
 if(typeof id!=='string'||
  !Object.prototype.hasOwnProperty.call(WORLD_BOSS_PRESENTATION,id))
  return null;
 return WORLD_BOSS_PRESENTATION[id as WorldBossPresentationId];
}
