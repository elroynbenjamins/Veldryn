export const PROFESSION_MASTERY_MAX_RANK=50;
export interface ProfessionMasteryRecord{actionId:string;points:number;updatedAtMs:number}
export interface ProfessionMasteryView{actionId:string;points:number;rank:number;maxRank:number;nextRankPoints:number;xpBonusBps:number;yieldBonusBps:number;speedBonusBps:number;mastered:boolean}

export function masteryPointsForRank(rank:number){
  const r=Math.max(0,Math.min(PROFESSION_MASTERY_MAX_RANK,Math.floor(rank)));
  return 10*r*(r+1)/2;
}
export function professionMasteryRank(points:number){
  const p=Math.max(0,Math.floor(points));let lo=0,hi=PROFESSION_MASTERY_MAX_RANK;
  while(lo<hi){const mid=Math.ceil((lo+hi)/2);if(masteryPointsForRank(mid)<=p)lo=mid;else hi=mid-1;}
  return lo;
}
export function professionMasteryView(actionId:string,record?:ProfessionMasteryRecord):ProfessionMasteryView{
  const points=Math.max(0,Math.floor(record?.points??0)),rank=professionMasteryRank(points);
  return {actionId,points,rank,maxRank:PROFESSION_MASTERY_MAX_RANK,
    nextRankPoints:rank>=PROFESSION_MASTERY_MAX_RANK?masteryPointsForRank(PROFESSION_MASTERY_MAX_RANK):masteryPointsForRank(rank+1),
    xpBonusBps:rank>=10?200:0,
    yieldBonusBps:(rank>=20?200:0)+(rank>=40?300:0),
    speedBonusBps:(rank>=30?300:0)+(rank>=50?200:0),
    mastered:rank>=PROFESSION_MASTERY_MAX_RANK};
}
export function grantProfessionMastery(previous:ProfessionMasteryRecord|undefined,actionId:string,actions:number,nowMs:number):ProfessionMasteryRecord{
  if(!Number.isSafeInteger(actions)||actions<=0)throw new Error('invalid_mastery_actions');
  if(!Number.isFinite(nowMs)||nowMs<0)throw new Error('invalid_mastery_time');
  return {actionId,points:Math.min(masteryPointsForRank(PROFESSION_MASTERY_MAX_RANK),(previous?.points??0)+actions),updatedAtMs:nowMs};
}

