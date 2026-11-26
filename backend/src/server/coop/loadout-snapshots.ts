import {sha256} from '@noble/hashes/sha256';
import {bytesToHex} from '@noble/hashes/utils';
import type { AbilityDefinition } from '../combat/types';
import type { VerifiedCombatSnapshot } from '../combat/snapshot-adapter';
import type { CapabilityTag, RoleReadinessResult } from './role-readiness';
import { deriveRole, evaluateRoleReadiness } from './role-readiness';
import { normalizeCombatInput, ROOTBOUND_ROLE_REFERENCES, type NormalizedCombatInput } from './normalization';
import { validateCoopRoster, validateUniqueDamageClasses } from './invariants';
import { dungeonPowerIndex } from './dungeon-power';

export interface AuthoritativeLoadoutRecord {
  accountId: string;
  characterId: string;
  classId: string;
  loadoutId: string;
  revision: number;
  characterLevel: number;
  /** Internal pre-rebase power calibration; unlocks always use the visible characterLevel. */
  combatScalingLevel?: number;
  /** Trusted server-derived character-sheet Combat Power. */
  combatPower?:number;
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
  /** Canonical score used for co-op matching; calculated from server data only. */
  dungeonPower?: number;
  combatPower?:number;
  characterLevel?:number;
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

/** Portable SHA-256 of the unchanged canonical string. Encode UTF-8 exactly
 * as Node did, including replacement of isolated surrogate code units.
 * Do not require Node crypto or a global TextEncoder on Hermes. */
export function frozenLoadoutDigest(canonicalText:string):string {
  const bytes:number[]=[];
  for(const ch of canonicalText){
    let cp=ch.codePointAt(0)!;
    if(cp>=0xd800&&cp<=0xdfff)cp=0xfffd;
    if(cp<0x80)bytes.push(cp);
    else if(cp<0x800)bytes.push(0xc0|(cp>>6),0x80|(cp&63));
    else if(cp<0x10000)bytes.push(0xe0|(cp>>12),0x80|((cp>>6)&63),0x80|(cp&63));
    else bytes.push(0xf0|(cp>>18),0x80|((cp>>12)&63),0x80|((cp>>6)&63),0x80|(cp&63));
  }
  return bytesToHex(sha256(new Uint8Array(bytes)));
}

export function resolveAndFreezeLoadout(input: {
  accountId: string; characterId: string; loadoutId: string; expectedRevision: number;
  minLevel: number; minCombatPower?:number; syncLevel: number; repository: LoadoutRepository;
}): FrozenLoadoutSnapshot {
  const record = input.repository.getOwnedLoadout(input.accountId, input.characterId, input.loadoutId);
  if (!record || record.accountId !== input.accountId || record.characterId !== input.characterId) throw new Error('loadout_not_owned');
  if (record.revision !== input.expectedRevision) throw new Error('invalid_loadout_revision');
  if (record.characterLevel < input.minLevel) throw new Error('character_below_min_level');
  if(input.minCombatPower!==undefined&&(!Number.isFinite(record.combatPower)||record.combatPower!<input.minCombatPower))throw new Error('dungeon_power_requirement');
  if (!record.dungeonUnlocked) throw new Error('dungeon_locked');
  if (!record.legalEquipment) throw new Error('illegal_equipment');
  const role = deriveRole(record.classId);
  const source: VerifiedCombatSnapshot = { ...record.stats, role, classId: record.classId, characterId: record.characterId, level: record.combatScalingLevel ?? record.characterLevel };
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
  const frozen = { accountId: record.accountId, characterId: record.characterId, classId: record.classId, loadoutId: record.loadoutId, revision: record.revision, normalized, readiness,
    dungeonPower: dungeonPowerIndex({ normalized, companion: record.stats.combatCompanion }),
    ...(Number.isFinite(record.combatPower)?{combatPower:record.combatPower}:{}),characterLevel:record.characterLevel };
  return { ...frozen, snapshotHash: frozenLoadoutDigest(canonical(frozen)) };
}

/** Final commitment boundary. Every selection is reread from the authoritative
 * repository; client-provided roles and stats are deliberately not accepted. */
export function freezeCoopRosterAtCommit(input:{
  selections:readonly CoopLoadoutSelection[];
  minLevel:number;
  minCombatPower?:number;
  syncLevel:number;
  repository:LoadoutRepository;
}):FrozenLoadoutSnapshot[]{
  if(input.selections.length!==4)throw new Error('coop_requires_four_members');
  if(new Set(input.selections.map(row=>row.accountId)).size!==4)throw new Error('duplicate_coop_account');
  if(new Set(input.selections.map(row=>row.characterId)).size!==4)throw new Error('duplicate_coop_character');
  const frozen=input.selections.map(selection=>{
    const snapshot=resolveAndFreezeLoadout({...selection,minLevel:input.minLevel,minCombatPower:input.minCombatPower,syncLevel:input.syncLevel,repository:input.repository});
    if(selection.queuedSnapshotHash&&selection.queuedSnapshotHash!==snapshot.snapshotHash)throw new Error('loadout_changed_since_queue');
    return snapshot;
  });
  validateCoopRoster(frozen.map(snapshot=>({accountId:snapshot.accountId,characterId:snapshot.characterId,role:snapshot.readiness.role})));
  validateUniqueDamageClasses(frozen.map(snapshot=>({role:snapshot.readiness.role,classId:snapshot.classId})));
  return structuredClone(frozen);
}
