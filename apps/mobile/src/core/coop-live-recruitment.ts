export type CoopLiveRole='tank'|'damage'|'support';

export interface CoopLiveRecruitmentPost{
  id:string;
  dungeonId:string;
  ownerName:string;
  role:CoopLiveRole;
  maxTier:number;
  note:string;
  createdAtMs:number;
  expiresAtMs:number;
  mine:boolean;
}

export const COOP_LFG_TTL_MS=30*60*1000;

export function activeCoopLiveRecruitment(posts:readonly CoopLiveRecruitmentPost[],nowMs:number){
  return posts.filter(post=>post.expiresAtMs>nowMs).sort((a,b)=>a.expiresAtMs-b.expiresAtMs||a.ownerName.localeCompare(b.ownerName));
}

export function coopLiveRecruitmentTime(post:CoopLiveRecruitmentPost,nowMs:number){
  const remaining=Math.max(0,post.expiresAtMs-nowMs),minutes=Math.max(1,Math.ceil(remaining/60000));
  return remaining<=0?'Expired':minutes<=1?'1m left':`${minutes}m left`;
}
