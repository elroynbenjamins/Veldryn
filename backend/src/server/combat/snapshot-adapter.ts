import type { CombatantDefinition, CombatRole } from './types';
import { COMBAT_LIMITS } from '../expeditions/constants';
import type {OwnedCompanionSnapshot} from '../companions/domain';
import {applyCharacterCompanionAssist} from '../companions/character-assist';

export interface VerifiedCombatSnapshot {
  combatCompanion?:OwnedCompanionSnapshot;
  characterId: string;
  classId: string;
  displayName?: string;
  role: Exclude<CombatRole,'enemy'>;
  level: number;
  maxHp: number;
  attackPower: number;
  healingPower: number;
  defense: number;
  accuracy: number;
  evasion: number;
  critChance: number;
  haste: number;
}

/** Converts a server-built/snapshotted character into engine state.
 * Never call with arbitrary client JSON. The snapshot must have been verified
 * against inventory/equipment/content tables during run creation.
 */
export function combatantFromVerifiedSnapshot(s: VerifiedCombatSnapshot, abilities: CombatantDefinition['abilities']): CombatantDefinition {
  if(!Number.isInteger(s.level)||s.level<1||s.level>100) throw new Error('invalid_snapshot_level');
  if([s.maxHp,s.attackPower,s.healingPower,s.defense,s.accuracy,s.evasion,s.critChance,s.haste].some(value=>!Number.isFinite(value))||s.maxHp<=0||[s.attackPower,s.healingPower,s.defense,s.accuracy,s.evasion].some(value=>value<0)) throw new Error('invalid_snapshot_stats');
  return applyCharacterCompanionAssist({
    id:s.characterId,classId:s.classId,name:s.displayName||s.classId,team:'players',role:s.role,level:s.level,
    stats:{maxHp:s.maxHp,attackPower:s.attackPower,healingPower:s.healingPower,defense:s.defense,accuracy:s.accuracy,evasion:s.evasion,critChance:Math.max(0,Math.min(COMBAT_LIMITS.critChanceCap,s.critChance)),critMultiplier:COMBAT_LIMITS.defaultCritMultiplier,haste:Math.max(-.25,Math.min(.75,s.haste))},
    basicAttackMs:2400,basicAttackCoeff:.70,abilities,
  },s.combatCompanion);
}
