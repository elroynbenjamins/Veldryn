export interface EnhancementSnapshot {itemId:string;rank:number;failures:number;gemIds:readonly string[];}
/** Messages derive from committed transitions, never from clicking an action. */
export function enhancementFeedback(before:EnhancementSnapshot,after:EnhancementSnapshot):{message:string;tone:'success'|'info'}|null{
 if(before.itemId!==after.itemId)return null;
 if(after.rank>before.rank)return {message:`Equipment upgraded to +${after.rank}.`,tone:'success'};
 if(after.failures>before.failures)return {message:'Tempering attempt complete. Rank unchanged.',tone:'info'};
 if(before.gemIds.join('|')!==after.gemIds.join('|'))return {message:'Gem sockets updated.',tone:'success'};
 return null;
}
export function newlyConfirmedIds(before:readonly string[],after:readonly string[]):string[]{
 const previous=new Set(before);return [...new Set(after)].filter(id=>!previous.has(id));
}
