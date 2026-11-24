/** Hidden account skill contract. No live roster thresholds, save writes or grants. */
import {levelFromXp} from './progression';
import {accountSkillLevel,unlockedCharacterSlots,accountCharacters,CHARACTER_SLOT_THRESHOLDS,MAX_NEW_ACCOUNT_CHARACTERS} from './account-roster';
import type {GameState} from './types';
import type {LegacyScoutingAccess} from './exploration-scouting-cutover-review';
import type {ScoutState} from './exploration-scouting-review';
export const ACCOUNT_EXPLORATION_RELEASED=false as const;
export const ACCOUNT_EXPLORATION_VERSION='account-exploration-v1' as const;
export type AccountExploration={version:typeof ACCOUNT_EXPLORATION_VERSION;accountId:string;xp:number;level:number;creditedDiscoveryIds:readonly string[];retainedSlots:number;sourceCharacterIds:readonly string[]};
const validXp=(xp:number)=>Number.isSafeInteger(xp)&&xp>=0;
export function migrateAccountExploration(accountId:string,legacy:readonly LegacyScoutingAccess[],state:GameState,existing?:AccountExploration):AccountExploration{
 if(!accountId)throw Error('account_required');
 if(existing){if(existing.accountId!==accountId||existing.version!==ACCOUNT_EXPLORATION_VERSION)throw Error('owner_mismatch');return existing;}
 const ids=new Set(accountCharacters(state).map(x=>x.character.id)),seen=new Set<string>();let xp=0;
 const discoveries=new Set<string>();
 for(const row of legacy){
  if(row.accountId!==accountId||!ids.has(row.characterId)||seen.has(row.characterId)||!validXp(row.explorationXp))throw Error('invalid_legacy_snapshot');
  seen.add(row.characterId);xp+=row.explorationXp;
  if(!validXp(xp))throw Error('invalid_xp');
  for(const id of row.completedRouteIds)discoveries.add(id);
 }
 if(seen.size!==ids.size)throw Error('incomplete_roster_snapshot');
 return {version:ACCOUNT_EXPLORATION_VERSION,accountId,xp,level:levelFromXp(xp),creditedDiscoveryIds:[...discoveries].sort(),retainedSlots:unlockedCharacterSlots(state),sourceCharacterIds:[...seen].sort()};
}
export function projectAccountExploration(state:ScoutState,account:AccountExploration):ScoutState{
 if(state.accountId!==account.accountId)throw Error('owner_mismatch');
 return {...state,explorationXp:account.xp,explorationLevel:account.level};
}
/** Exclude every character's Exploration row, not the shared level just once.
 * Preserve all previously earned slots; unrelated account skill perks unchanged. */
export function characterSlotSkillTotal2Review(state:GameState){
 return accountSkillLevel({...state,skills:state.skills.filter(s=>s.skillId!=='exploration'),otherCharacters:state.otherCharacters?.map(c=>({...c,skills:c.skills.filter(s=>s.skillId!=='exploration')}))});
}
export function unlockedCharacterSlots2Review(state:GameState,account:AccountExploration){
 const threshold=CHARACTER_SLOT_THRESHOLDS.filter(n=>n<=characterSlotSkillTotal2Review(state)).length;
 return Math.min(5,Math.max(accountCharacters(state).length,account.retainedSlots,Math.min(MAX_NEW_ACCOUNT_CHARACTERS,Math.max(1,threshold))));
}
export function creditAccountExploration(account:AccountExploration,xp:number,discoveryId?:string){
 if(!validXp(xp)||!validXp(account.xp+xp))throw Error('invalid_xp');
 const duplicate=!!discoveryId&&account.creditedDiscoveryIds.includes(discoveryId);
 const awarded=duplicate?0:xp,total=account.xp+awarded;
 return {awarded,account:{...account,xp:total,level:levelFromXp(total),creditedDiscoveryIds:discoveryId&&!duplicate?[...account.creditedDiscoveryIds,discoveryId].sort():account.creditedDiscoveryIds}};
}
