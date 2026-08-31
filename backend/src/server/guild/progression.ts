export interface GuildSkill{id:string;maxRank:number;costPerRank:number[]}
export function spentPoints(ranks:Record<string,number>,skills:GuildSkill[]):number{return skills.reduce((s,x)=>s+(x.costPerRank.slice(0,ranks[x.id]||0).reduce((a,b)=>a+b,0)),0)}
export function canAllocate(ranks:Record<string,number>,skill:GuildSkill,newRank:number,budget=100,all:GuildSkill[]=[skill]){
 if(newRank<0||newRank>skill.maxRank)return false; const next={...ranks,[skill.id]:newRank}; return spentPoints(next,all)<=budget;
}
export function contributionXp(type:'gold'|'materials'|'boss'|'guild_task',amount:number){const rates={gold:0.02,materials:1,boss:0.1,guild_task:1};return Math.floor(amount*rates[type]);}
export function bossAttemptAllowed(existing:number,max=3){return existing<max;}
