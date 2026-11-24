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
 partyWide:true;
 personalCpDelta:0;
 requiresProgression:false;
 canGateEntry:false;
 canFilterRecruitment:false;
 visibleOnRecruitmentBoard:false;
 canRankCandidates:false;
}

const validKind=(kind:unknown):kind is CoopSynchronizationValueKind=>
 kind==='percent'||kind==='percentage_points';
const validBps=(value:unknown):value is number=>
 typeof value==='number'&&Number.isSafeInteger(value)&&value>0;
const nonempty=(value:unknown):value is string=>typeof value==='string'&&!!value.trim();
function invalid():never{throw new Error('invalid_coop_synchronization_view');}

/** Pure presentation aggregation. Combined caps replace raw totals exactly once. */
export function coopSynchronizationEffectiveTotals(view:CoopSynchronizationView):CoopSynchronizationBonusView[]{
 const totals=new Map<string,CoopSynchronizationBonusView>();
 for(const link of view.links)for(const bonus of link.bonuses){
  const current=totals.get(bonus.statKey);
  if(current&&(current.valueKind!==bonus.valueKind||current.label!==bonus.label))invalid();
  totals.set(bonus.statKey,{...bonus,bps:(current?.bps??0)+bonus.bps});
 }
 for(const cap of view.cappedStats){
  const current=totals.get(cap.statKey);
  if(!current||current.bps!==cap.rawBps||current.valueKind!==cap.valueKind||
     current.label!==cap.label||!validBps(cap.effectiveBps)||cap.effectiveBps>=cap.rawBps)invalid();
  totals.set(cap.statKey,{...current,bps:cap.effectiveBps});
 }
 return [...totals.values()];
}

/** Presentation contract only. Never derive queue eligibility from this view. */
export function prepareCoopSynchronizationPresentation(view:CoopSynchronizationView):{
 view:CoopSynchronizationView;totals:CoopSynchronizationBonusView[];
}{

 if(!view||!Number.isInteger(view.activeCount)||view.activeCount<0||view.activeCount>6||
  !Number.isInteger(view.scalePercent)||view.scalePercent<0||view.scalePercent>100||
  (view.activeCount===0)!==(view.scalePercent===0)||view.partyWide!==true||
  view.personalCpDelta!==0||view.requiresProgression!==false||
  view.canGateEntry!==false||view.canFilterRecruitment!==false||
  view.visibleOnRecruitmentBoard!==false||view.canRankCandidates!==false||
  !Array.isArray(view.links)||view.links.length!==view.activeCount||
  !Array.isArray(view.cappedStats))
  invalid();
 const ids=new Set<string>(),capIds=new Set<string>();
 for(const link of view.links){
  if(!link||!nonempty(link.id)||ids.has(link.id)||!nonempty(link.name)||
    !Array.isArray(link.classNames)||link.classNames.length!==2||
    !link.classNames.every(nonempty)||link.classNames[0]===link.classNames[1]||
    !Array.isArray(link.bonuses)||!link.bonuses.length)invalid();
  ids.add(link.id);
  const stats=new Set<string>();
  for(const bonus of link.bonuses){
   if(!bonus||!nonempty(bonus.statKey)||stats.has(bonus.statKey)||
    !nonempty(bonus.label)||!validBps(bonus.bps)||!validKind(bonus.valueKind))invalid();
   stats.add(bonus.statKey);
  }
 }
 for(const cap of view.cappedStats){
  if(!cap||!nonempty(cap.statKey)||capIds.has(cap.statKey)||!nonempty(cap.label)||
   !validBps(cap.rawBps)||!validBps(cap.effectiveBps)||!validKind(cap.valueKind))invalid();
  capIds.add(cap.statKey);
 }
 return {view,totals:coopSynchronizationEffectiveTotals(view)};
}
export function assertCoopSynchronizationPresentation(view:CoopSynchronizationView):CoopSynchronizationView{
 return prepareCoopSynchronizationPresentation(view).view;
}


export function formatCoopSynchronizationValue(
 bps:number,kind:CoopSynchronizationValueKind,
):string{
 if(!Number.isSafeInteger(bps)||bps<0||!validKind(kind))throw new Error('invalid_coop_synchronization_value');
 const amount=bps/100;
 const text=Number.isInteger(amount)?String(amount):amount.toFixed(2).replace(/0+$/,'').replace(/\.$/,'');
 return '+'+text+(kind==='percentage_points'?' pp':'%');
}
