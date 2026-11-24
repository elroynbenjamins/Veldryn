export type CoopSynchronizationValueKind='percent'|'percentage_points';
export interface CoopSynchronizationBonusView{
 statKey:string;
 label:string;
 bps:number;
 valueKind:CoopSynchronizationValueKind;
}
export interface CoopSynchronizationLinkView{
 id:string;
 name:string;
 classNames:[string,string];
 bonuses:CoopSynchronizationBonusView[];
}
export interface CoopSynchronizationCapView{
 statKey:string;
 label:string;
 rawBps:number;
 effectiveBps:number;
 valueKind:CoopSynchronizationValueKind;
}
export interface CoopSynchronizationView{
 activeCount:number;
 scalePercent:number;
 links:CoopSynchronizationLinkView[];
 cappedStats:CoopSynchronizationCapView[];
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
  !Array.isArray(view.links)||view.links.length!==view.activeCount||
  !Array.isArray(view.cappedStats))
  throw new Error('invalid_coop_synchronization_view');
 return view;
}


export function formatCoopSynchronizationValue(
 bps:number,kind:CoopSynchronizationValueKind,
):string{
 if(!Number.isFinite(bps))throw new Error('invalid_coop_synchronization_value');
 const amount=bps/100;
 const text=Number.isInteger(amount)?String(amount):amount.toFixed(2).replace(/0+$/,'').replace(/\.$/,'');
 return '+'+text+(kind==='percentage_points'?' pp':'%');
}
