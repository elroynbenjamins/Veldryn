import {createCharacter,newGame,claimSeasonalContract} from '../src/core/game';
import {seasonalQuestBoard} from '../src/core/seasonal-quests';
import {legacySeasonalObjectiveComplete,LEGACY_SEASONAL_CLAIM_CUTOFF_MS} from '../src/core/legacy-seasonal-claim';
import {executeGameCommand} from '../src/core/game-commands';

function assert(value:unknown,message:string){if(!value)throw new Error(message);}
const now=Date.UTC(2026,10,14,7,20);
const first=createCharacter(newGame(0),'STONECALLER','LegacySupport');
const state={...first,skills:first.skills.map(skill=>({...skill,xp:10000}))};
const id='DAILY_2026-11-14_1';
const modern=seasonalQuestBoard(state,'daily',new Date(now)).find(row=>row.id===id);
assert(modern,'Modern board should offer the same positional ID');
assert(modern!.progress<modern!.required,'This test must reproduce an uncompleted current objective');
assert(legacySeasonalObjectiveComplete(state,'daily',id,now),'Old Support gathering objective should be complete from earned skill XP');
assert(!legacySeasonalObjectiveComplete(state,'daily','DAILY_2026-11-14_2',now),'Invalid slot is not claimable');
assert(!legacySeasonalObjectiveComplete(state,'daily',id,LEGACY_SEASONAL_CLAIM_CUTOFF_MS),'Legacy eligibility expires');
assert(!legacySeasonalObjectiveComplete(state,'daily','DAILY_2026-11-13_1',now+86400000),'Expired-looking legacy IDs must not imply current board claims');
let modernRejected=false;
try{claimSeasonalContract(state,'daily',id,now);}catch(e){modernRejected=e instanceof Error&&e.message==='Complete the contract before claiming its cache.';}
assert(modernRejected,'A modern client must not bypass current verified action progress');
const claimed=executeGameCommand(state,{type:'seasonal',args:{period:'daily',id}},now,{legacySeasonalClient:true}).state;
assert(claimed.account.seasonalContractClaimIds?.includes(id),'The compatible server claim must persist its receipt');
assert(claimed.character!.gold===state.character!.gold+modern!.rewardGold,'Only current server reward gold is granted');
let duplicateRejected=false;
try{executeGameCommand(claimed,{type:'seasonal',args:{period:'daily',id}},now,{legacySeasonalClient:true});}catch(e){duplicateRejected=e instanceof Error&&e.message==='This contract reward was already claimed.';}
assert(duplicateRejected,'Legacy compatibility must not allow duplicate rewards');
let modernCommandRejected=false;
try{executeGameCommand(state,{type:'seasonal',args:{period:'daily',id}},now,{legacySeasonalClient:false});}catch{modernCommandRejected=true;}
assert(modernCommandRejected,'Explicit v2 requests must use verified activity validation');
console.log('PASS: legacy seasonal cache compatibility, cutoff, duplicate protection, modern validation');
