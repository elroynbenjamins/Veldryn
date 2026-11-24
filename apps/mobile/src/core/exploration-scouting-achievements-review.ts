/** Account-scoped achievement projection only. No achievement DB writes. */
import type {AccountExploration} from './exploration-account-review';
import {explorationDiscoveryCollection} from './exploration-discovery-review';
import {EXPLORATION_2_ACHIEVEMENTS} from './exploration-scouting-content-review';

export const SCOUTING_2_ACHIEVEMENTS_RELEASED=false as const;
export type ScoutingAchievementFacts={reportsClaimed:number;claimedCollectionIds?:readonly string[]};

export function scoutingAchievementProgress(account:AccountExploration,facts:ScoutingAchievementFacts){
 if(!Number.isSafeInteger(facts.reportsClaimed)||facts.reportsClaimed<0)throw Error('invalid_report_count');
 const collection=explorationDiscoveryCollection(account,facts.claimedCollectionIds??[]);
 const region=(id:string)=>collection.regions.find(r=>r.id===id)!;
 const progress:Record<string,number>={
  exploration2_first_report:Math.min(1,facts.reportsClaimed),
  exploration2_asterfall_cartographer:region('asterfall').count,
  exploration2_sunscar_cartographer:region('sunscar').count,
  exploration2_frostmarch_cartographer:region('frostmarch').count,
  exploration2_known_realm:collection.regions.filter(r=>r.complete).length,
 };
 return EXPLORATION_2_ACHIEVEMENTS.map(def=>({...def,progress:Math.min(def.required,progress[def.id]??0),completed:(progress[def.id]??0)>=def.required,accountId:account.accountId}));
}

export function scoutingAchievementServerFacts(input:{accountId:string;account:AccountExploration;claimedReportIds:readonly string[]}){
 if(input.accountId!==input.account.accountId)throw Error('owner_mismatch');
 const reports=[...new Set(input.claimedReportIds.filter(id=>typeof id==='string'&&id.length>0))];
 return {reportsClaimed:reports.length};
}
