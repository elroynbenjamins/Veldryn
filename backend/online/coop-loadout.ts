import {createHash} from 'node:crypto';
import {CLASSES} from '../../apps/mobile/src/content/classes';
import {itemDef} from '../../apps/mobile/src/content/items';
import {noviceItemId,noviceSetFor} from '../../apps/mobile/src/content/novice-sets';
import {createCharacter,effectiveStats,newGame} from '../../apps/mobile/src/core/game';
import type {GameState,ClassId} from '../../apps/mobile/src/core/types';
import {launchPlayer} from '../src/server/combat/content/launch-combat';
import type {AuthoritativeLoadoutRecord} from '../src/server/coop/loadout-snapshots';
import {deriveRole,evaluateRoleReadiness,type CapabilityTag} from '../src/server/coop/role-readiness';
import {normalizeCombatInput,ROOTBOUND_ROLE_REFERENCES} from '../src/server/coop/normalization';
import {companionOwned,assertCompanionIdle} from '../../apps/mobile/src/core/companion-runtime';
import {validateCompanionLoadout} from '../src/server/companions/policy';

export const ONLINE_COOP_BALANCE_VERSION='online-coop-loadout-v1';
/** Converts the two existing stat units without changing solo gameplay. A complete,
 * unenhanced class novice outfit is the existing co-op kit's level-25 reference.
 * Actual equipped gear (including enhancements/gems) scales each matching stat.
 * This calibration state is never persisted or granted to an account. */
function referenceStats(classId:ClassId){
 const reference=createCharacter(newGame(0),classId,'Calibration');
 reference.character!.equipment=Object.fromEntries(noviceSetFor(classId).slots.map(slot=>[slot,noviceItemId(classId,slot)]));
 return effectiveStats(reference);
}

/** Only call with a state loaded from online_game_states by the trusted server.
 * HTTP callers supply a selection/revision, never this state or its stats. */
export function deriveOnlineCoopLoadout(accountId:string,state:GameState,version:number):AuthoritativeLoadoutRecord{
 const character=state.character;if(!character)throw new Error('character_required');
 if(!Number.isSafeInteger(version)||version<1)throw new Error('invalid_game_version');
 const definition=CLASSES.find(row=>row.id===character.classId);if(!definition)throw new Error('unknown_class');
 const role=deriveRole(character.classId);
 const kit=launchPlayer(definition.name,25),reference=referenceStats(character.classId),actual=effectiveStats(state),levelScale=character.level/25;
 const legalEquipment=Boolean(character.equipment.weapon)&&Object.entries(character.equipment).every(([slot,id])=>{
  if(!id)return true;const item=itemDef(id);return item.type==='gear'&&item.slot===slot&&(!item.classRestriction||item.classRestriction===character.classId);
 });
 const capabilities:CapabilityTag[]=role==='tank'?['threat','defense']:role==='support'?['restore','mitigate','utility']:['damage'];
 const companionId=character.equippedCombatCompanionId;
 const companionPolicy=validateCompanionLoadout({classId:character.classId,companionId,ownedCompanionIds:state.account.unlockedCombatCompanionIds??[]});
 if(!companionPolicy.ok)throw new Error(companionPolicy.reason);
 if(companionId)assertCompanionIdle(state,companionId);
 const combatCompanion=companionId?companionOwned(state)[companionId]:undefined;
 if(companionId&&!combatCompanion)throw new Error('missing_companion_progress');
 return {accountId,characterId:character.id,classId:character.classId,loadoutId:'current',revision:version,characterLevel:character.level,
  dungeonUnlocked:true,legalEquipment,capabilities,abilities:structuredClone(kit.abilities),stats:{
   characterId:character.id,classId:character.classId,displayName:character.name,bodyPresentation:character.bodyPresentation??'male',level:character.level,
   ...(combatCompanion?{combatCompanion:structuredClone(combatCompanion)}:{}),
   maxHp:kit.stats.maxHp*actual.hp/reference.hp*levelScale,
   attackPower:kit.stats.attackPower*actual.attack/reference.attack*levelScale,
   healingPower:kit.stats.healingPower*actual.attack/reference.attack*levelScale,
   defense:kit.stats.defense*actual.defense/reference.defense*levelScale,
   accuracy:kit.stats.accuracy*levelScale,evasion:kit.stats.evasion*levelScale,
   critChance:kit.stats.critChance,haste:kit.stats.haste,
  }};
}
export function onlineCoopLoadoutHash(record:AuthoritativeLoadoutRecord):string{
 const canonical=(value:unknown):string=>Array.isArray(value)?'['+value.map(canonical).join(',')+']':value!==null&&typeof value==='object'?'{'+Object.keys(value).sort().map(key=>JSON.stringify(key)+':'+canonical((value as Record<string,unknown>)[key])).join(',')+'}':JSON.stringify(value);
 // PostgreSQL jsonb reorders object keys. Publication hashes must survive that
 // round trip so the final commitment can revalidate the exact donor snapshot.
 return createHash('sha256').update(canonical({version:ONLINE_COOP_BALANCE_VERSION,record})).digest('hex');
}

/** Entry-screen diagnostics include ineligible equipment; queue commitment still
 * uses resolveAndFreezeLoadout and checks the selected dungeon and revision. */
export function assessOnlineCoopLoadout(record:AuthoritativeLoadoutRecord,syncLevel=25){
 const role=deriveRole(record.classId),reference=ROOTBOUND_ROLE_REFERENCES[role];
 const normalized=normalizeCombatInput({...record.stats,role},record.abilities,syncLevel,reference);
 const scale=normalized.effectiveLevel/reference.level;
 const primary=(role==='tank'?normalized.snapshot.defense/reference.defense:role==='support'?Math.max(normalized.snapshot.healingPower/reference.healingPower,normalized.snapshot.defense/reference.defense):normalized.snapshot.attackPower/reference.attackPower)/scale;
 const readiness=evaluateRoleReadiness(record.classId,primary,record.capabilities);
 if(!record.legalEquipment){readiness.ready=false;readiness.failures.push('illegal_equipment');}
 return {normalized,readiness};
}
