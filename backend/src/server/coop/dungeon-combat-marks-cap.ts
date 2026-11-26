/** Mirror of the authoritative SQL per-account/per-run combat-room cap.
 * Used only to describe already-resolved marks in a private run projection.
 * Wallet crediting still happens atomically in PostgreSQL. */
export const DUNGEON_COMBAT_MARKS_CAP=25;
export function availableDungeonCombatMarks(alreadyCredited:number,kind:string):number{
 if(!Number.isInteger(alreadyCredited)||alreadyCredited<0)throw new Error('invalid_combat_marks_balance');
 const roomAmount=kind==='battle'?3:kind==='elite'?5:0;
 return Math.min(roomAmount,Math.max(0,DUNGEON_COMBAT_MARKS_CAP-alreadyCredited));
}
export function projectedDungeonCombatMarks(visitedNodeKinds:readonly string[]):number{
 let credited=0;
 for(const kind of visitedNodeKinds)credited+=availableDungeonCombatMarks(credited,kind);
 return credited;
}
