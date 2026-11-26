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
 * Preserve baseline checkpoint and attack pressure; deeper bosses have a
 * separate bounded simulation time budget.
 * Candidate coefficients require real-engine checkpoint calibration before release. */
export const DUNGEON_BOSS_ENDURANCE_VERSION=2 as const;
export function dungeonEncounterDepthMultipliers(roomDepth:number,enabled:boolean,isBoss:boolean,bossVersion?:typeof DUNGEON_BOSS_ENDURANCE_VERSION):DungeonDepthMultipliers{
 const original=dungeonDepthMultipliers(roomDepth,enabled);
 if(!enabled||!isBoss||bossVersion!==DUNGEON_BOSS_ENDURANCE_VERSION)return original;
 const steps=roomDepth-1;
 return {hp:Math.pow(1.022,steps),attack:original.attack,defense:Math.pow(1.006,steps)};
}

/** Authoritative combat time budget for Endurance boss checkpoints only.
 * Indexed by actual graph depth, not the shifted difficulty depth. Existing
 * runs and ordinary rooms retain the engine's default three-minute limit. */
const ENDURANCE_BOSS_LIMIT_MS:Readonly<Record<number,number>>=Object.freeze({8:180_000,15:210_000,22:240_000,29:280_000,36:320_000,43:360_000});
export function dungeonBossTimeLimitMs(nodeDepth:number,enabled:boolean,isBoss:boolean,bossVersion?:typeof DUNGEON_BOSS_ENDURANCE_VERSION):number|undefined{
 if(!enabled||!isBoss||bossVersion!==DUNGEON_BOSS_ENDURANCE_VERSION)return undefined;
 return ENDURANCE_BOSS_LIMIT_MS[nodeDepth];
}
