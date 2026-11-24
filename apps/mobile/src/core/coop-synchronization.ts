export interface CoopSynchronizationBonusView{
 statKey:string;
 label:string;
 value:string;
}
export interface CoopSynchronizationLinkView{
 id:string;
 name:string;
 classNames:[string,string];
 bonuses:CoopSynchronizationBonusView[];
}
export interface CoopSynchronizationView{
 activeCount:number;
 scalePercent:number;
 links:CoopSynchronizationLinkView[];
 partyWide:boolean;
 personalCpDelta:0;
 requiresProgression:false;
 canGateEntry:false;
 canFilterRecruitment:false;
 visibleOnRecruitmentBoard:false;
 canRankCandidates:false;
}

/** Presentation contract only. Never derive queue eligibility from this view. */
export function assertCoopSynchronizationPresentation(view:CoopSynchronizationView):CoopSynchronizationView{
 if(!view||!Number.isInteger(view.activeCount)||view.activeCount<0||view.activeCount>6||
  !Number.isFinite(view.scalePercent)||view.scalePercent<0||view.scalePercent>100||
  view.personalCpDelta!==0||view.requiresProgression!==false||
  view.canGateEntry!==false||view.canFilterRecruitment!==false||
  view.visibleOnRecruitmentBoard!==false||view.canRankCandidates!==false||
  !Array.isArray(view.links)||view.links.length!==view.activeCount)
  throw new Error('invalid_coop_synchronization_view');
 return view;
}
