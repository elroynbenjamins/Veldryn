export type RareDiscoverySource='mining'|'fishing'|'woodcutting'|'combat'|'herbalism';
export interface RareDiscoveryReward{kind:'item_grant'|'key_item'|'lore_unlock'|'cosmetic_unlock';ref:string;label:string;quantity?:number;collectionKey?:string}
export interface RareDiscoveryCandidate{id:string;name:string;description:string;rarity:'uncommon'|'rare'|'epic';weight:number;unique:boolean;reward:RareDiscoveryReward}
export interface RareDiscoveryPool{id:string;name:string;enabled:boolean;sourceKind:RareDiscoverySource;activityIds?:string[];regionIds?:string[];opportunitySeconds:number;baseChanceBps:number;pityStartsAfterMisses:number;pityStepBps:number;maxChanceBps:number;candidates:RareDiscoveryCandidate[]}
export interface RareDiscoveryProgress{carrySeconds:number;misses:number;opportunities:number;finds:number;updatedAtMs:number}
export interface RareDiscoveryState{schemaVersion:46;accountId:string;revision:number;progressByCharacter:Record<string,Record<string,RareDiscoveryProgress>>;recentFinds:Array<{findId:string;candidateId:string;discoveryName:string;rarity:string;reward:RareDiscoveryReward;foundAtMs:number;firstTime:boolean}>}
export interface RareDiscoverySettlementEvent{eventId:string;accountId:string;characterId:string;sourceKind:RareDiscoverySource;activityId:string;regionId?:string;settlementKind:'idle'|'offline'|'online';elapsedSeconds:number;actions:number;settledAtMs:number}
export type RareDiscoveryRoll=(key:string)=>number;
export const MAX_RECENT_RARE_DISCOVERIES=50;
/** Current repository has no canonical V47 Geode Cache item ID, so all pools remain disabled until content binding supplies a real reward. */
export const RARE_DISCOVERY_POOLS_V46:RareDiscoveryPool[]=[
 {id:'mining_geode_authoring',name:'Mining Geodes',enabled:false,sourceKind:'mining',opportunitySeconds:1800,baseChanceBps:20,pityStartsAfterMisses:80,pityStepBps:5,maxChanceBps:200,candidates:[{id:'ancient_geode',name:'Ancient Geode',description:'A sealed geode uncovered among ordinary ore.',rarity:'rare',weight:100,unique:false,reward:{kind:'item_grant',ref:'PENDING_CANONICAL_GEODE',label:'Ancient Geode',quantity:1}}]}
];
export function newRareDiscoveryState(accountId:string):RareDiscoveryState{if(!accountId)throw new Error('account_required');return {schemaVersion:46,accountId,revision:0,progressByCharacter:{},recentFinds:[]}}
function progressFor(state:RareDiscoveryState,characterId:string,poolId:string,nowMs:number){const pools=state.progressByCharacter[characterId]??(state.progressByCharacter[characterId]={});return pools[poolId]??(pools[poolId]={carrySeconds:0,misses:0,opportunities:0,finds:0,updatedAtMs:nowMs})}
function chanceBps(pool:RareDiscoveryPool,misses:number){return Math.min(pool.maxChanceBps,pool.baseChanceBps+Math.max(0,misses-pool.pityStartsAfterMisses+1)*pool.pityStepBps)}
function choose(candidates:RareDiscoveryCandidate[],roll:number){const total=candidates.reduce((sum,row)=>sum+row.weight,0);let cursor=Math.floor(Math.max(0,Math.min(9999,roll))/10000*total);for(const row of candidates){if(cursor<row.weight)return row;cursor-=row.weight}return candidates[candidates.length-1]}
export function applyRareDiscoverySettlement(state:RareDiscoveryState,event:RareDiscoverySettlementEvent,ownedRewardRefs:Record<string,true>,roll:RareDiscoveryRoll,pools=RARE_DISCOVERY_POOLS_V46){
 if(state.accountId!==event.accountId)throw new Error('account_mismatch');if(event.elapsedSeconds<0||!Number.isSafeInteger(event.elapsedSeconds))throw new Error('invalid_elapsed_seconds');
 const owned=new Set(Object.keys(ownedRewardRefs).filter(key=>ownedRewardRefs[key])),finds:RareDiscoveryState['recentFinds']=[],grants:Array<{grantKey:string;reward:RareDiscoveryReward}>=[];
 for(const pool of pools.filter(p=>p.enabled&&p.sourceKind===event.sourceKind&&event.settlementKind!=='online'&&(!p.activityIds?.length||p.activityIds.includes(event.activityId))&&(!p.regionIds?.length||!!event.regionId&&p.regionIds.includes(event.regionId)))){
  const progress=progressFor(state,event.characterId,pool.id,event.settledAtMs),total=progress.carrySeconds+event.elapsedSeconds,opportunities=Math.floor(total/pool.opportunitySeconds);progress.carrySeconds=total%pool.opportunitySeconds;
  for(let i=0;i<opportunities;i++){progress.opportunities++;const eligible=pool.candidates.filter(candidate=>!candidate.unique||!owned.has(candidate.reward.ref));if(!eligible.length)continue;const hit=roll(`${event.eventId}:${pool.id}:${progress.opportunities}:chance`)<chanceBps(pool,progress.misses);if(!hit){progress.misses++;continue}const candidate=choose(eligible,roll(`${event.eventId}:${pool.id}:${progress.opportunities}:candidate`)),firstTime=!owned.has(candidate.reward.ref);if(candidate.unique)owned.add(candidate.reward.ref);progress.misses=0;progress.finds++;const findId=`rare-discovery:${event.accountId}:${event.eventId}:${pool.id}:${progress.opportunities}:${candidate.id}`,find={findId,candidateId:candidate.id,discoveryName:candidate.name,rarity:candidate.rarity,reward:candidate.reward,foundAtMs:event.settledAtMs,firstTime};finds.push(find);grants.push({grantKey:findId,reward:candidate.reward})}
  progress.updatedAtMs=event.settledAtMs;
 }
 if(finds.length)state.recentFinds=[...finds.slice().reverse(),...state.recentFinds].slice(0,MAX_RECENT_RARE_DISCOVERIES);
 return {eventId:event.eventId,finds,grants};
}
