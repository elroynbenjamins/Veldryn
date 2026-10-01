export type ChallengeStatus={claimed:boolean;ready:boolean};
export function challengeBoard<T extends ChallengeStatus>(cards:readonly T[]){
 const rank=(card:T)=>card.claimed?2:card.ready?0:1;
 return {cards:[...cards].sort((a,b)=>rank(a)-rank(b)),claimableCount:cards.filter(card=>card.ready&&!card.claimed).length};
}
