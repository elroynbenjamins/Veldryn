import {createHash} from 'node:crypto';
export type ArenaDivision='Bronze'|'Silver'|'Gold'|'Platinum'|'Diamond'|'Mythic';
export interface ArenaFighterSnapshot{characterId:string;classId:string;position:'front'|'middle'|'back';normalizedPower:number;role:'tank'|'damage'|'support';}
export interface ArenaSquadSnapshot{accountId:string;squadVersion:number;fighters:ArenaFighterSnapshot[];rating:number;}
export interface ArenaRound{round:1|2|3;winnerCharacterId:string;loserCharacterId:string;score:number;}
export interface ArenaResult{winnerAccountId:string;rounds:ArenaRound[];scoreA:number;scoreB:number;digest:string;}
function pairScore(a:ArenaFighterSnapshot,b:ArenaFighterSnapshot){
 const role=(a.role==='tank'&&b.role==='damage'?1.04:a.role==='damage'&&b.role==='support'?1.04:a.role==='support'&&b.role==='tank'?1.04:1);
 const pos=a.position==='front'?1.02:a.position==='back'?0.99:1;
 return a.normalizedPower*role*pos;
}
export function resolveArena3v3(a:ArenaSquadSnapshot,b:ArenaSquadSnapshot,seed:string):ArenaResult{
 if(a.fighters.length!==3||b.fighters.length!==3)throw new Error('arena_requires_3v3');
 const rounds:ArenaRound[]=[]; let sa=0,sb=0;
 for(let i=0;i<3;i++){
  const fa=a.fighters[i],fb=b.fighters[i];
  const h=createHash('sha256').update(`${seed}:${i}:${fa.characterId}:${fb.characterId}`).digest();
  const varianceA=.97+(h[0]/255)*.06, varianceB=.97+(h[1]/255)*.06;
  const pa=pairScore(fa,fb)*varianceA,pb=pairScore(fb,fa)*varianceB;
  const aw=pa>=pb; if(aw)sa++;else sb++;
  rounds.push({round:(i+1) as 1|2|3,winnerCharacterId:aw?fa.characterId:fb.characterId,loserCharacterId:aw?fb.characterId:fa.characterId,score:Number((pa/pb).toFixed(4))});
 }
 if(sa===sb){ const ta=a.fighters.reduce((x,f)=>x+f.normalizedPower,0),tb=b.fighters.reduce((x,f)=>x+f.normalizedPower,0); if(ta>=tb)sa++;else sb++; }
 const winnerAccountId=sa>sb?a.accountId:b.accountId;
 const digest=createHash('sha256').update(JSON.stringify({seed,rounds,winnerAccountId})).digest().toString('hex');
 return{winnerAccountId,rounds,scoreA:sa,scoreB:sb,digest};
}
export function arenaDivision(rating:number):ArenaDivision{return rating>=2000?'Mythic':rating>=1750?'Diamond':rating>=1500?'Platinum':rating>=1250?'Gold':rating>=1000?'Silver':'Bronze';}
export function rankedBonusEligible(winsToday:number,winsWeek:number){return winsToday<5&&winsWeek<25;}
