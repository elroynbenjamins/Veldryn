/** Deterministic review simulation, using canonical XP and actual receipt policy.
 * No production economy changes. Times represent continuously available assignment
 * time; cadence gaps are modeled explicitly, not real user forecasts. */
import {levelFromXp,totalXpAtLevel} from './progression';
import {SCOUT_ROUTES,reserveScout,scoutClaimPreview,scoutingAvailability,type ScoutState,type ScoutAuthority,type ScoutReceipt,type ScoutTrainingMinutes} from './exploration-scouting-review';
export const SCOUT_BALANCE_RELEASED=false as const;
export function simulateScoutingProgress(input:{authority:ScoutAuthority;companionIds:readonly string[];repeat:'practice'|'survey';claimCadenceMs:number;xpMultiplier:number;targetLevel:number;trainingMinutes?:ScoutTrainingMinutes}){
 if(!Number.isSafeInteger(input.claimCadenceMs)||input.claimCadenceMs<1000||!Number.isFinite(input.xpMultiplier)||input.xpMultiplier<=0||input.xpMultiplier>1||!Number.isInteger(input.targetLevel)||input.targetLevel<2||input.targetLevel>100)throw Error('invalid_simulation');
 let state:ScoutState={accountId:'sim',characterId:'simchar',explorationLevel:1,explorationXp:0,discoveredRouteIds:[],visitedZoneIds:['GREENFIELDS']};
 let now=0,assignments=0,activeMs=0;
 const levels:Record<number,number>={1:0};
 while(state.explorationLevel<input.targetLevel){
  const route=SCOUT_ROUTES.find(r=>r.released&&scoutingAvailability(state,r,'route')==='available');
  const kind=route?'route':input.repeat;
  const repeat=SCOUT_ROUTES.filter(r=>r.released&&scoutingAvailability(state,r,kind)==='available').sort((a,b)=>b.xp/b.seconds-a.xp/a.seconds)[0];
  const selected=route??repeat;if(!selected)throw Error('progression_deadlock');
  const r:ScoutReceipt=reserveScout({state,authority:input.authority,receipts:[],routeId:selected.id,kind,companionIds:input.companionIds,requestId:'simulation_'+String(++assignments),now,trainingMinutes:kind==='route'?undefined:input.trainingMinutes});
  const wait=r.endsAt-now;activeMs+=wait;now+=Math.ceil(wait/input.claimCadenceMs)*input.claimCadenceMs;
  const result=scoutClaimPreview(r,state,now);
  const xp=state.explorationXp+Math.max(1,Math.floor(result.explorationXp*(kind==='route'?1:input.xpMultiplier)));
  const level=levelFromXp(xp);
  for(let l=state.explorationLevel+1;l<=level;l++)levels[l]=now;
  state={...state,explorationXp:xp,explorationLevel:level,discoveredRouteIds:result.discoveredRouteIds};
  if(assignments>250000)throw Error('simulation_limit');
 }
 return {hours:now/3600000,activeHours:activeMs/3600000,assignments,level:state.explorationLevel,xp:state.explorationXp,targetXp:totalXpAtLevel(input.targetLevel),discovered:state.discoveredRouteIds.length,levels};
}
