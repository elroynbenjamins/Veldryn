import {buildCraftPlanV31,CraftPlanBlockerV31,CraftPlannerStateV31} from './equipment-crafting-plan-v31';

export interface RequirementRowV31 {key:string;label:string;owned:number;required:number;state:'ready'|'missing'|'blocked';source?:string;cta?:'Gather'|'Train'|'Hunt'|'Dungeon'|'Unlock';}
export interface CraftingDetailV31 {pieceId:string;title:string;targetTimeLabel:string;queueTimeLabel:string;canCraftNow:boolean;canQueuePrerequisites:boolean;requirements:readonly RequirementRowV31[];pve:readonly string[];primaryCta:'Craft'|'Craft prerequisites'|'View blockers';blockerCount:number;}

function blockerCta(b:CraftPlanBlockerV31):RequirementRowV31['cta']{switch(b.action){case 'gather':return 'Gather';case 'train_skill':return 'Train';case 'hunt':return 'Hunt';case 'run_content':return 'Dungeon';case 'unlock_recipe':return 'Unlock';default:return undefined;}}
export function craftingDetailV31(pieceId:string,state:CraftPlannerStateV31):CraftingDetailV31{
  const p=buildCraftPlanV31(pieceId,state);const requirements:RequirementRowV31[]=p.blockers.map(b=>({key:b.key,label:b.label,owned:0,required:b.missing,state:'missing',source:b.source,cta:blockerCta(b)}));
  return {pieceId,title:p.itemName,targetTimeLabel:p.targetHours<1?`${Math.round(p.targetHours*60)}m target`:`~${p.targetHours.toFixed(1)}h target`,queueTimeLabel:p.estimatedQueueMinutes?`~${p.estimatedQueueMinutes}m queued crafting`:'No craftable prerequisites ready',canCraftNow:p.canFinishNow,canQueuePrerequisites:p.canQueueNow,requirements,pve:p.pveSummary,primaryCta:p.canFinishNow?'Craft':p.canQueueNow?'Craft prerequisites':'View blockers',blockerCount:p.blockers.length};
}
