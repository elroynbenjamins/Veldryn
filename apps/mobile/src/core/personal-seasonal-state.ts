import type {CharacterState,GameState} from './types';
import type {SeasonalActivity,SeasonalPeriod,SeasonalProgress} from './seasonal-quests';

const periods:SeasonalPeriod[]=['daily','weekly','monthly'];
export const SEASONAL_ACTIVITY_TAGS:readonly SeasonalActivity[]=['combat','gathering','crafting','exploration','faith','boss','cooking','alchemy','smithing','tailoring','enchanting','event'];
const activityTags=SEASONAL_ACTIVITY_TAGS;

export function normalizeSeasonalProgress(raw:unknown):SeasonalProgress{
 const result:SeasonalProgress={};
 if(!raw||typeof raw!=='object')return result;
 for(const period of periods){
  const row=(raw as Record<string,any>)[period];
  if(!row||typeof row.key!=='string'||row.key.length>32)continue;
  const counts:Partial<Record<SeasonalActivity,number>>={};
  for(const tag of activityTags){const value=row.counts?.[tag];if(typeof value==='number'&&Number.isFinite(value)&&value>=0)counts[tag]=Math.min(Number.MAX_SAFE_INTEGER,Math.floor(value));}
  const tags=Array.isArray(row.tags)&&row.tags.length===(period==='daily'?2:period==='weekly'?3:4)&&row.tags.every((tag:unknown)=>typeof tag==='string'&&activityTags.includes(tag as SeasonalActivity))&&new Set(row.tags).size===row.tags.length?row.tags as SeasonalActivity[]:undefined;
  result[period]={key:row.key,counts,...(tags?{tags:[...tags]}:{})};
 }
 return result;
}

/** Personal daily, weekly and monthly quests. Party/Guild/World Boss receipts
 * remain in the shared account and are intentionally not modified here. */
export interface PersonalSeasonalState{
 progress:SeasonalProgress;
 claimIds:string[];
 rewardChoices:Record<string,string>;
}
export function normalizePersonalSeasonalState(raw:unknown):PersonalSeasonalState{
 const row=raw&&typeof raw==='object'?raw as Record<string,unknown>:{};
 const claimIds=Array.isArray(row.claimIds)
  ?[...new Set(row.claimIds.filter((id):id is string=>typeof id==='string'&&/^(DAILY|WEEKLY|MONTHLY)_.{1,48}_[0-9]+$/.test(id)))].slice(-120)
  :[];
 const choices=row.rewardChoices&&typeof row.rewardChoices==='object'&&!Array.isArray(row.rewardChoices)
  ?Object.fromEntries(Object.entries(row.rewardChoices).filter(([id,choice])=>claimIds.includes(id)&&typeof choice==='string'&&choice.length<=100))
  :{};
 return {progress:normalizeSeasonalProgress(row.progress),claimIds,rewardChoices:choices};
}
/** Server-owned claim receipts for each period and character. Old IDs are
 * retained across roster deletion; personal objectives themselves remain
 * character-specific. */
export function normalizePersonalSeasonalClaimLedger(raw:unknown):Record<string,string[]>{
 if(!raw||typeof raw!=='object'||Array.isArray(raw))return {};
 return Object.fromEntries(Object.entries(raw).filter(([id,characters])=>/^(DAILY|WEEKLY|MONTHLY)_.{1,48}_[0-9]+$/.test(id)&&Array.isArray(characters)).slice(-240).map(([id,characters])=>[id,[...new Set((characters as unknown[]).filter((value):value is string=>typeof value==='string'&&value.length>0&&value.length<=100))].slice(0,5)]));
}
/** Backward-compatible account projection. Only the active character's
 * personal quest data appears in the legacy account fields. */
export function personalSeasonalAccountView(account:GameState['account'],character:CharacterState|null):GameState['account']{
 const data=normalizePersonalSeasonalState(character?.personalSeasonal);
 return {...account,seasonalContractProgress:data.progress,seasonalContractClaimIds:data.claimIds,seasonalContractRewardChoices:data.rewardChoices};
}
/** One-time migration: old saves only had shared account quest fields. Assign
 * those receipts and progress to the active character, never every alt.
 * After this, character.personalSeasonal is the source of truth. */
export function ensurePersonalSeasonalState(state:GameState):GameState{
 if(!state.character)return state;
 const source=state.character.personalSeasonal??{
  progress:state.account.seasonalContractProgress,
  claimIds:state.account.seasonalContractClaimIds,
  rewardChoices:state.account.seasonalContractRewardChoices,
 };
 const personalSeasonal=normalizePersonalSeasonalState(source);
 const character={...state.character,personalSeasonal};
 const ledger=state.account.personalSeasonalClaimLedger
  ?normalizePersonalSeasonalClaimLedger(state.account.personalSeasonalClaimLedger)
  :Object.fromEntries(personalSeasonal.claimIds.map(id=>[id,[character.id]]));
 return {...state,character,account:{...personalSeasonalAccountView(state.account,character),personalSeasonalClaimLedger:ledger}};
}
/** Persist an earned action or confirmed claim on the active character and
 * update only that character's legacy read projection. */
export function updatePersonalSeasonalState(state:GameState,changes:Partial<PersonalSeasonalState>):GameState{
 const ready=ensurePersonalSeasonalState(state);
 if(!ready.character)return ready;
 const character={...ready.character,personalSeasonal:normalizePersonalSeasonalState({...ready.character.personalSeasonal,...changes})};
 return {...ready,character,account:personalSeasonalAccountView(ready.account,character)};
}
