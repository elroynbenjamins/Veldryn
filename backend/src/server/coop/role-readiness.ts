import type { CoopRole } from '../../shared/coop-types';

export type ClassId = 'IRONWARDEN'|'BASTION'|'DREADGUARD'|'DAWNKEEPER'|'WAYFINDER'|'RAVAGER'|'HEXWEAVER'|'KNIFE_DANCER'|'STONECALLER';
export type CapabilityTag = 'threat'|'defense'|'restore'|'mitigate'|'utility'|'damage';

const CLASS_ROLES: Readonly<Record<ClassId, CoopRole>> = Object.freeze({
  IRONWARDEN: 'tank', BASTION: 'tank', DREADGUARD: 'tank',
  DAWNKEEPER: 'support', STONECALLER: 'support',
  WAYFINDER: 'damage', RAVAGER: 'damage', HEXWEAVER: 'damage', KNIFE_DANCER: 'damage',
});

export interface RoleReadinessResult {
  ready: boolean;
  role: CoopRole;
  normalizedScore: number;
  failures: string[];
}

export function deriveRole(classId: string): CoopRole {
  const role = CLASS_ROLES[classId.toUpperCase() as ClassId];
  if (!role) throw new Error(`unknown_class:${classId}`);
  return role;
}

export function evaluateRoleReadiness(
  classId: string,
  normalizedScore: number,
  capabilities: readonly CapabilityTag[],
  floor = 0.8,
): RoleReadinessResult {
  const role = deriveRole(classId);
  const available = new Set(capabilities);
  const failures: string[] = [];
  if (normalizedScore < floor) failures.push('below_role_readiness_floor');
  if (role === 'tank' && (!available.has('threat') || !available.has('defense'))) failures.push('missing_tank_capability');
  if (role === 'support' && !(available.has('restore') || (available.has('mitigate') && available.has('utility')))) failures.push('missing_support_capability');
  if (role === 'damage' && !available.has('damage')) failures.push('missing_damage_capability');
  return { ready: failures.length === 0, role, normalizedScore, failures };
}
