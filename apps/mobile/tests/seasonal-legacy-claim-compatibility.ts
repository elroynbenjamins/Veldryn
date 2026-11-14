import {createCharacter,newGame,claimSeasonalContract} from '../src/core/game';
import {seasonalQuestBoard} from '../src/core/seasonal-quests';
import {legacySeasonalObjectiveComplete,hasFrozenLegacySeasonalGrant,snapshotEarnedLegacySeasonalClaims,LEGACY_SEASONAL_CLAIM_CUTOFF_MS} from '../src/core/legacy-seasonal-claim';
import {executeGameCommand} from '../src/core/game-commands';
import {ensurePersonalSeasonalState} from '../src/core/personal-seasonal-state';

function assert(value:unknown,message:string){if(!value)throw new Error(message);}
const now=Date.UTC(2026,10,14,7,20);
const first=createCharacter(newGame(0),'STONECALLER','LegacySupport');
const state={...first,skills:first.skills.map(skill=>({...skill,xp:10000}))};
const id='DAILY_2026-11-14_1';
const modern=seasonalQuestBoard(state,'daily',new Date(now)).find(row=>row.id===id);
assert(modern,'Modern board should offer the same positional ID');
assert(modern!.progress<modern!.required,'This test must reproduce an uncompleted modern objective');
assert(legacySeasonalObjectiveComplete(state,'daily',id,now),'Old Support gathering objective should be complete from lifetime skill XP');
assert(!legacySeasonalObjectiveComplete(state,'daily','DAILY_2026-11-14_2',now),'Invalid slots are not claimable');
assert(!legacySeasonalObjectiveComplete(state,'daily',id,LEGACY_SEASONAL_CLAIM_CUTOFF_MS),'Legacy eligibility expires');

let rejected=false;
try{executeGameCommand(state,{type:'seasonal',args:{period:'daily',id}},now);}catch(e){rejected=e instanceof Error&&e.message==='Complete the contract before claiming its cache.';}
assert(rejected,'Modern account without old claim history must not bypass verified objective via lifetime XP');

const established={...state,account:{...state.account,
 seasonalContractClaimIds:['DAILY_2026-11-13_0'],
 seasonalContractProgress:{daily:{key:'2026-11-14',counts:{gathering:12}}}
}};
const snapshot=snapshotEarnedLegacySeasonalClaims(established,now);
assert(hasFrozenLegacySeasonalGrant(snapshot,id,now),'Historic claims plus same-period verified gathering must freeze old readiness');
assert(!hasFrozenLegacySeasonalGrant(established,id,now),'Raw legacy state cannot authorize claim until server freezes its entitlement');
const claimed=executeGameCommand(established,{type:'seasonal',args:{period:'daily',id}},now).state;
assert(claimed.character!.personalSeasonal?.claimIds.includes(id),'Frozen server migration claim must settle per character');
assert(claimed.account.seasonalContractClaimIds?.includes(id),'Compatible account projection must reflect the claim');
assert(claimed.character!.gold===state.character!.gold+modern!.rewardGold,'Only server-approved modern reward gold is granted');
assert(claimed.account.legacySeasonalGrantSnapshot?.ownerCharacterId===claimed.character?.id,'Snapshot is bound to active character');
let duplicateRejected=false;
try{executeGameCommand(claimed,{type:'seasonal',args:{period:'daily',id}},now);}catch(e){duplicateRejected=e instanceof Error&&e.message==='This contract reward was already claimed.';}
assert(duplicateRejected,'Legacy compatibility must not allow duplicate rewards');

const noVerifiedActivity={...established,account:{...established.account,seasonalContractProgress:{daily:{key:'2026-11-14',counts:{combat:1}}}}};
assert(!hasFrozenLegacySeasonalGrant(snapshotEarnedLegacySeasonalClaims(noVerifiedActivity,now),id,now),'Unrelated verified actions cannot justify a legacy gathering reward');
const modernState=ensurePersonalSeasonalState(established);
assert(!hasFrozenLegacySeasonalGrant(snapshotEarnedLegacySeasonalClaims(modernState,now),id,now),'Already upgraded modern state cannot re-mint old entitlements');
assert(!hasFrozenLegacySeasonalGrant(snapshot,id,LEGACY_SEASONAL_CLAIM_CUTOFF_MS),'Bounded old entitlements expire');
assert(!hasFrozenLegacySeasonalGrant(snapshot,'DAILY_2026-11-13_1',now),'A forged or expired quest ID is never in the frozen grant list');

console.log('PASS: legacy quest claims require server-owned migration snapshot, verified action evidence, correct owner, cutoff and duplicate receipts');
