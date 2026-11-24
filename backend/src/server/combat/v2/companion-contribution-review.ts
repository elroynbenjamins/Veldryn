/** Hidden companion contribution review, not a runtime activation or CP formula.
 * Reuse the current authored character-assist adapter without importing standalone
 * Trial combatants or conflating display rating with actual combat strength. */
import type {CombatantDefinition,CombatStats,AbilityDefinition} from '../types';
import {applyCharacterCompanionAssist} from '../../companions/character-assist';
import type {OwnedCompanionSnapshot} from '../../companions/domain';
import {companionTechnique} from '../../companions/content';
import {validateCompanionLoadout,validateProgressionSnapshot,type CharacterClassId} from '../../companions/policy';
import {CLASS_NAMES_V2} from './skill-catalog';
import {enemyV2SnapshotDigest} from './enemy-engine-authority';
export interface CompanionContributionSourceV2{
 readonly accountId:string;
 readonly characterId:string;
 readonly actorId:string;
 readonly revision:number;
 readonly selectedCompanionId:string|null;
 readonly ownedCompanionIds:readonly string[];
 readonly busyCompanionIds:readonly string[];
 readonly progress:OwnedCompanionSnapshot|null;
 readonly verifyPersisted:(digest:string,revision:number)=>boolean;
}
const fail=(reason:string):never=>{throw Error('combat_v2_companion_review_'+reason);};
const keys:readonly (keyof CombatStats)[]=['maxHp','attackPower','healingPower','defense','accuracy','evasion','critChance','critMultiplier','haste'];
export function reviewCompanionContributionV2(owner:CombatantDefinition,source:CompanionContributionSourceV2){
 if(!source||!source.accountId||!source.characterId||source.actorId!==owner.id||
  !Number.isSafeInteger(source.revision)||source.revision<1||typeof source.verifyPersisted!=='function'||
  !Array.isArray(source.ownedCompanionIds)||!Array.isArray(source.busyCompanionIds)||
  new Set(source.ownedCompanionIds).size!==source.ownedCompanionIds.length||
  new Set(source.busyCompanionIds).size!==source.busyCompanionIds.length||
  owner.team!=='players'||owner.combatV2?.version!==2||!owner.tags?.includes('combat-v2-affixes-applied')||
  owner.tags.some(t=>t.startsWith('companion:'))||
  owner.abilities.some(a=>a.tags?.includes('combat_companion')||a.id.endsWith(':assist')))
  fail('invalid_or_already_assisted_owner');
 const classId=(Object.keys(CLASS_NAMES_V2) as CharacterClassId[]).find(k=>k===owner.classId||CLASS_NAMES_V2[k]===owner.classId);
 if(!classId)throw Error('combat_v2_companion_review_unknown_class');
 const check=validateCompanionLoadout({classId,companionId:source.selectedCompanionId,
  ownedCompanionIds:source.ownedCompanionIds,busyCompanionIds:source.busyCompanionIds});
 if(!check.ok)fail(check.reason);
 const progress=source.progress;
 if((progress?.companionId??null)!==source.selectedCompanionId)fail('selection_progress_mismatch');
 if(progress){
  const safe=validateProgressionSnapshot(progress.companionId,progress);
  for(const k of ['level','xp','ascensionTier','bondLevel','bondXp'] as const){
   if(!Number.isSafeInteger(progress[k])||progress[k]!==safe[k])fail('invalid_progression');
  }
  if(typeof progress.bondTraitUnlocked!=='boolean')fail('invalid_bond_trait');
  if(progress.selectedTechniqueId&&companionTechnique(progress.selectedTechniqueId)?.companionId!==progress.companionId)
   fail('foreign_technique');
  // Derived runtime fields must be computed from independent account sources;
  // this review does not authorize mastery or housing entitlement.
  if(progress.masteryStatMultiplier!==undefined||progress.housingStatMultiplier!==undefined)
   fail('derived_account_bonus_unreconciled');
 }
 const digest=enemyV2SnapshotDigest({owner,accountId:source.accountId,characterId:source.characterId,
  actorId:source.actorId,revision:source.revision,selectedCompanionId:source.selectedCompanionId,
  ownedCompanionIds:[...source.ownedCompanionIds].sort(),busyCompanionIds:[...source.busyCompanionIds].sort(),progress});
 if(source.verifyPersisted(digest,source.revision)!==true)fail('unverified_snapshot');
 const projected=progress?applyCharacterCompanionAssist({...owner,classId},progress):owner;
 const delta=Object.fromEntries(keys.map(k=>[k,projected.stats[k]-owner.stats[k]])) as unknown as CombatStats;
 const assists:readonly AbilityDefinition[]=projected.abilities.slice(owner.abilities.length);
 if(assists.length!==(progress?1:0)||keys.some(k=>!Number.isFinite(delta[k])))
  fail('invalid_assist_projection');
 return {receiptDigest:digest,companionId:source.selectedCompanionId,permanentStatDelta:delta,
  activeAssists:assists,additionalCombatants:0 as const,canApplyStats:false as const,
  canExecuteAssists:false as const,canContributeCP:false as const,releaseEnabled:false as const};
}
