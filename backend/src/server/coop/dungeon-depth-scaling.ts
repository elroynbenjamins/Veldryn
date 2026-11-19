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
