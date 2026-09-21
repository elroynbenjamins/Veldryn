export interface EnhancementSnapshot {
 itemId:string;
 rank:number;
 failures:number;
 gemIds:readonly string[];
 statGemId?:string;
 effectGemId?:string;
}
export type EnhancementFeedbackKind='upgrade_success'|'upgrade_failure'|'sockets';
export interface EnhancementSocketChange{
 action:'socketed'|'replaced'|'extracted';
 socketKind:'stat'|'effect';
 previousGemId?:string;
 gemId?:string;
}
export interface EnhancementFeedbackResult{
 kind:EnhancementFeedbackKind;
 message:string;
 tone:'success'|'info'|'warning';
 previousRank:number;
 rank:number;
 previousFailures:number;
 failures:number;
 pityBeforePct:number;
 pityAfterPct:number;
 socketChange?:EnhancementSocketChange;
}
export function enhancementPityBonusPct(failures:number){return Math.min(10,Math.max(0,Math.floor(failures))*2);}
function socketChange(before:EnhancementSnapshot,after:EnhancementSnapshot):EnhancementSocketChange|undefined{
 const slots=[['stat',before.statGemId,after.statGemId],['effect',before.effectGemId,after.effectGemId]] as const;
 for(const [socketKind,previousGemId,gemId] of slots){
  if(previousGemId===gemId)continue;
  if(!previousGemId&&gemId)return {action:'socketed',socketKind,gemId};
  if(previousGemId&&!gemId)return {action:'extracted',socketKind,previousGemId};
  if(previousGemId&&gemId)return {action:'replaced',socketKind,previousGemId,gemId};
 }
 return undefined;
}
/** Feedback derives from committed transitions, never from clicking an action. */
export function enhancementFeedback(before:EnhancementSnapshot,after:EnhancementSnapshot):EnhancementFeedbackResult|null{
 if(before.itemId!==after.itemId)return null;
 const base={previousRank:before.rank,rank:after.rank,previousFailures:before.failures,failures:after.failures,pityBeforePct:enhancementPityBonusPct(before.failures),pityAfterPct:enhancementPityBonusPct(after.failures)};
 if(after.rank>before.rank)return {kind:'upgrade_success',message:`Equipment upgraded to +${after.rank}.`,tone:'success',...base};
 if(after.failures>before.failures)return {kind:'upgrade_failure',message:'Rank protected. Your next attempt has a higher success chance.',tone:'warning',...base};
 const changed=socketChange(before,after);
 if(changed){
  const slot=changed.socketKind==='stat'?'Stat Gem':'Effect Gem',message=changed.action==='socketed'?`${slot} socketed.`:changed.action==='replaced'?`${slot} replaced safely.`:`${slot} extracted safely.`;
  return {kind:'sockets',message,tone:'success',socketChange:changed,...base};
 }
 if(before.gemIds.join('|')!==after.gemIds.join('|'))return {kind:'sockets',message:'Gem sockets updated.',tone:'success',...base};
 return null;
}
export function newlyConfirmedIds(before:readonly string[],after:readonly string[]):string[]{
 const previous=new Set(before);return [...new Set(after)].filter(id=>!previous.has(id));
}
