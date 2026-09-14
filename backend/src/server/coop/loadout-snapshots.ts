import { createHash } from 'node:crypto';
import type { AbilityDefinition } from '../combat/types';
import type { VerifiedCombatSnapshot } from '../combat/snapshot-adapter';
import type { CapabilityTag, RoleReadinessResult } from './role-readiness';
import { deriveRole, evaluateRoleReadiness } from './role-readiness';
import { normalizeCombatInput, ROOTBOUND_ROLE_REFERENCES, type NormalizedCombatInput } from './normalization';
import { validateCoopRoster } from './invariants';

export interface AuthoritativeLoadoutRecord {
  accountId: string;
  characterId: string;
  classId: string;
  loadoutId: string;
  revision: number;
  characterLevel: number;
  dungeonUnlocked: boolean;
  legalEquipment: boolean;
  stats: Omit<VerifiedCombatSnapshot, 'role'>;
  abilities: AbilityDefinition[];
  capabilities: CapabilityTag[];
}

export interface LoadoutRepository {
  getOwnedLoadout(accountId: string, characterId: string, loadoutId: string): AuthoritativeLoadoutRecord | undefined;
}

export interface FrozenLoadoutSnapshot {
  accountId: string;
  characterId: string;
  classId: string;
  loadoutId: string;
  revision: number;
  normalized: NormalizedCombatInput;
  readiness: RoleReadinessResult;
  snapshotHash: string;
}

export interface CoopLoadoutSelection {
  accountId:string;
  characterId:string;
  loadoutId:string;
  expectedRevision:number;
  queuedSnapshotHash?:string;
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.entries(value as Record<string, unknown>).sort(([a],[b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(',')}}`;
  return JSON.stringify(value);
}

export function resolveAndFreezeLoadout(input: {
  accountId: string; characterId: string; loadoutId: string; expectedRevision: number;
  minLevel: number; syncLevel: number; repository: LoadoutRepository;
}): FrozenLoadoutSnapshot {
  const record = input.repository.getOwnedLoadout(input.accountId, input.characterId, input.loadoutId);
  if (!record || record.accountId !== input.accountId || record.characterId !== input.characterId) throw new Error('loadout_not_owned');
  if (record.revision !== input.expectedRevision) throw new Error('invalid_loadout_revision');
  if (record.characterLevel < input.minLevel) throw new Error('character_below_min_level');
  if (!record.dungeonUnlocked) throw new Error('dungeon_locked');
  if (!record.legalEquipment) throw new Error('illegal_equipment');
  const role = deriveRole(record.classId);
  const source: VerifiedCombatSnapshot = { ...record.stats, role, classId: record.classId, characterId: record.characterId, level: record.characterLevel };
  const normalized = normalizeCombatInput(source, record.abilities, input.syncLevel, ROOTBOUND_ROLE_REFERENCES[role]);
  const reference = ROOTBOUND_ROLE_REFERENCES[role];
  // Compare against the same effective-level reference used by normalization.
  // Otherwise an undergeared level-45 character passes against level-25 budgets.
  const referenceScale = normalized.effectiveLevel / reference.level;
  const primary = (role === 'tank' ? normalized.snapshot.defense / reference.defense
    : role === 'support' ? Math.max(normalized.snapshot.healingPower / reference.healingPower, normalized.snapshot.defense / reference.defense)
    : normalized.snapshot.attackPower / reference.attackPower) / referenceScale;
  const readiness = evaluateRoleReadiness(record.classId, primary, record.capabilities);
  if (!readiness.ready) throw new Error(`role_not_ready:${readiness.failures.join(',')}`);
  const frozen = { accountId: record.accountId, characterId: record.characterId, classId: record.classId, loadoutId: record.loadoutId, revision: record.revision, normalized, readiness };
  return { ...frozen, snapshotHash: createHash('sha256').update(canonical(frozen)).digest().toString('hex') };
}

/** Final commitment boundary. Every selection is reread from the authoritative
 * repository; client-provided roles and stats are deliberately not accepted. */
export function freezeCoopRosterAtCommit(input:{
  selections:readonly CoopLoadoutSelection[];
  minLevel:number;
  syncLevel:number;
  repository:LoadoutRepository;
}):FrozenLoadoutSnapshot[]{
  if(input.selections.length!==4)throw new Error('coop_requires_four_members');
  if(new Set(input.selections.map(row=>row.accountId)).size!==4)throw new Error('duplicate_coop_account');
  if(new Set(input.selections.map(row=>row.characterId)).size!==4)throw new Error('duplicate_coop_character');
  const frozen=input.selections.map(selection=>{
    const snapshot=resolveAndFreezeLoadout({...selection,minLevel:input.minLevel,syncLevel:input.syncLevel,repository:input.repository});
    if(selection.queuedSnapshotHash&&selection.queuedSnapshotHash!==snapshot.snapshotHash)throw new Error('loadout_changed_since_queue');
    return snapshot;
  });
  validateCoopRoster(frozen.map(snapshot=>({accountId:snapshot.accountId,characterId:snapshot.characterId,role:snapshot.readiness.role})));
  return structuredClone(frozen);
}
