/** Explicit, bounded initial endurance curve. Applied to enemy templates
 * AFTER regional/tier tuning and BEFORE server-authored combat resolution.
 * All snapshots and saved legacy runs without the feature marker are stable.
 * The first room has baseline difficulty; continued rooms compound steadily. */
export const DUNGEON_ENDURANCE_DIFFICULTY=Object.freeze({
 hpPerRoom:1.035,
 attackPerRoom:1.022,
 defensePerRoom:1.012,
 maxRoom:43,
} as const);
export interface DungeonDepthMultipliers {hp:number;attack:number;defense:number;}
export function dungeonDepthMultipliers(roomDepth:number,enabled:boolean):DungeonDepthMultipliers{
 if(!enabled)return{hp:1,attack:1,defense:1};
 if(!Number.isSafeInteger(roomDepth)||roomDepth<1||roomDepth>DUNGEON_ENDURANCE_DIFFICULTY.maxRoom)throw new Error('invalid_dungeon_depth');
 const steps=roomDepth-1;
 return {
  hp:Math.pow(DUNGEON_ENDURANCE_DIFFICULTY.hpPerRoom,steps),
  attack:Math.pow(DUNGEON_ENDURANCE_DIFFICULTY.attackPerRoom,steps),
  defense:Math.pow(DUNGEON_ENDURANCE_DIFFICULTY.defensePerRoom,steps),
 };
}

/** Boss durability grows separately from ordinary rooms. Versioned on new
 * runs so reconnects and already-created expeditions keep their frozen curve.
 * Preserve baseline checkpoint, attack pressure and the global combat limit.
 * Candidate coefficients require real-engine checkpoint calibration before release. */
export const DUNGEON_BOSS_ENDURANCE_VERSION=2 as const;
export function dungeonEncounterDepthMultipliers(roomDepth:number,enabled:boolean,isBoss:boolean,bossVersion?:typeof DUNGEON_BOSS_ENDURANCE_VERSION):DungeonDepthMultipliers{
 const original=dungeonDepthMultipliers(roomDepth,enabled);
 if(!enabled||!isBoss||bossVersion!==DUNGEON_BOSS_ENDURANCE_VERSION)return original;
 const steps=roomDepth-1;
 return {hp:Math.pow(1.022,steps),attack:original.attack,defense:Math.pow(1.006,steps)};
}
