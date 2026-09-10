import { COOP_ROLE_REQUIREMENT, type CoopMemberIdentity, type CoopRole } from '../../shared/coop-types';
import { COOP_ROGUELITE_CONFIG } from './config';

export function roleCounts(roles: readonly CoopRole[]): Record<CoopRole, number> {
  const counts: Record<CoopRole, number> = { tank: 0, damage: 0, support: 0 };
  for (const role of roles) counts[role] += 1;
  return counts;
}

export function hasExactCoopRoles(roles: readonly CoopRole[]): boolean {
  if (roles.length !== 4) return false;
  const counts = roleCounts(roles);
  return (Object.keys(COOP_ROLE_REQUIREMENT) as CoopRole[])
    .every(role => counts[role] === COOP_ROLE_REQUIREMENT[role]);
}

export function validateCoopRoster(members: readonly CoopMemberIdentity[]): void {
  if (members.length !== 4) throw new Error('coop_requires_four_members');
  if (new Set(members.map(member => member.accountId)).size !== 4) throw new Error('duplicate_coop_account');
  if (new Set(members.map(member => member.characterId)).size !== 4) throw new Error('duplicate_coop_character');
  if (!hasExactCoopRoles(members.map(member => member.role))) throw new Error('invalid_coop_role_composition');
}

export function validatePreBossNodeCount(count: number): void {
  if (!Number.isInteger(count)
    || count < COOP_ROGUELITE_CONFIG.preBossNodeMin
    || count > COOP_ROGUELITE_CONFIG.preBossNodeMax) {
    throw new Error('invalid_coop_route_length');
  }
}
