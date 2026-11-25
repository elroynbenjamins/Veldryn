/** Account collection read model. Actual completed maps only, never inferred travel. */
import {SCOUT_ROUTES} from './exploration-scouting-review';
import type {AccountExploration} from './exploration-account-review';
export const DISCOVERY_REWARDS_RELEASED=false as const;
const groups=[
 {id:'asterfall',name:'Asterfall',zones:['GREENFIELDS','SILVERBROOK','IRONWOOD','OLD_MINES','KINGS_ROAD'],title:'Asterfall Trailblazer'},
 {id:'sunscar',name:'Sunscar',zones:['SUNSCAR'],title:'Sunscar Cartographer'},
 {id:'frostmarch',name:'Frostmarch',zones:['FROSTMARCH'],title:'Frostmarch Pathfinder'},
] as const;
export function explorationDiscoveryCollection(account:Pick<AccountExploration,'creditedDiscoveryIds'>,claimedIds:readonly string[]=[]){
 const actual=new Set(account.creditedDiscoveryIds),claimed=new Set(claimedIds);
 const regions=groups.map(g=>{
  const routes=SCOUT_ROUTES.filter(r=>r.released&&(g.zones as readonly string[]).includes(r.zoneId));
  const count=routes.filter(r=>actual.has(r.legacyId)).length;
  const milestoneId='scouting2:collection:'+g.id+':v1';
  return {id:g.id,name:g.name,count,total:routes.length,title:g.title,milestoneId,complete:count===routes.length,claimed:claimed.has(milestoneId),eligible:count===routes.length&&!claimed.has(milestoneId)};
 });
 const count=regions.reduce((s,r)=>s+r.count,0),total=regions.reduce((s,r)=>s+r.total,0);
 const realmId='scouting2:collection:realm:v1';
 return {regions,count,total,realm:{milestoneId:realmId,title:'Cartographer of the Known Realm',complete:count===total,claimed:claimed.has(realmId),eligible:count===total&&!claimed.has(realmId)},rewardsGranted:false as const,released:DISCOVERY_REWARDS_RELEASED};
}
