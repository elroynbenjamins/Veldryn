import {areTicketsCompatible,validateLoadoutRole,validateStrictComposition,type LiveDungeonRole,type LiveLoadoutQualification} from './live-dungeon-policy';
export interface QueueCandidate extends LiveLoadoutQualification {ticketId:string;queuedAtMs:number;}
export interface MatchSelection {selected:QueueCandidate[];reason?:string;}

function oldestFirst(a:QueueCandidate,b:QueueCandidate){return a.queuedAtMs-b.queuedAtMs||a.ticketId.localeCompare(b.ticketId);}
export function selectLiveDungeonMatch(candidates:readonly QueueCandidate[],nowMs:number):MatchSelection{
  const valid=candidates.filter(c=>validateLoadoutRole(c).valid).sort(oldestFirst);
  const tanks=valid.filter(x=>x.role==='tank'),supports=valid.filter(x=>x.role==='support'),damage=valid.filter(x=>x.role==='damage');
  for(const tank of tanks)for(const support of supports){
    if(tank.accountId===support.accountId)continue;
    const ds=damage.filter(d=>d.accountId!==tank.accountId&&d.accountId!==support.accountId);
    for(let i=0;i<ds.length;i++)for(let j=i+1;j<ds.length;j++){
      const group=[tank,ds[i],ds[j],support];
      if(new Set(group.map(x=>x.accountId)).size!==4)continue;
      if(!validateStrictComposition(group.map(x=>x.role as LiveDungeonRole)).valid)continue;
      let compatible=true;
      for(let a=0;a<group.length;a++)for(let b=a+1;b<group.length;b++){
        const aw=Math.max(0,(nowMs-group[a].queuedAtMs)/1000),bw=Math.max(0,(nowMs-group[b].queuedAtMs)/1000);
        if(!areTicketsCompatible(group[a],group[b],aw,bw)){compatible=false;break;}
      }
      if(compatible)return {selected:group};
    }
  }
  return {selected:[],reason:'no_compatible_1t2d1s_group'};
}

export function selectReplacement(input:{role:LiveDungeonRole;contentId:string;existingAccountIds:readonly string[];candidates:readonly QueueCandidate[];nowMs:number;referencePower:number;referenceCombatLevel:number}):QueueCandidate|undefined{
  const synthetic:LiveLoadoutQualification={accountId:'__reference__',characterId:'__reference__',classId:'reference',role:input.role,combatLevel:Math.max(1,input.referenceCombatLevel),powerIndex:input.referencePower,tankScore:1,supportScore:1,loadoutVersion:1,contentId:input.contentId};
  return input.candidates.filter(c=>c.role===input.role&&c.contentId===input.contentId&&!input.existingAccountIds.includes(c.accountId)&&validateLoadoutRole(c).valid)
   .sort(oldestFirst).find(c=>areTicketsCompatible(c,synthetic,Math.max(0,(input.nowMs-c.queuedAtMs)/1000),120));
}
