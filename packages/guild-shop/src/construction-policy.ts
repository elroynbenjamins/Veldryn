import { GUILD_CONSTRUCTION_TEMPLATES } from "./catalogue";
export type ConstructionDecision =
 | {ok:true; templateId:string; resourceId:string; amount:number}
 | {ok:false; reason:"unknown_project"|"guild_level_locked"|"project_completed"|"invalid_resource"|"invalid_amount"|"exceeds_remaining"};
/** UI/preflight validation only. Server must re-check against locked database rows. */
export function validateConstructionDonation(input:{
 templateId:unknown; guildLevel:number; completed:boolean;
 resourceId:unknown; amount:unknown; alreadyContributed:number;
}):ConstructionDecision {
 const project=GUILD_CONSTRUCTION_TEMPLATES.find(x=>x.id===input.templateId);
 if(!project)return {ok:false,reason:"unknown_project"};
 if(input.guildLevel<project.guildLevel)return {ok:false,reason:"guild_level_locked"};
 if(input.completed)return {ok:false,reason:"project_completed"};
 if(typeof input.resourceId!=="string")return {ok:false,reason:"invalid_resource"};
 const required=input.resourceId==="gold"?project.gold:
  project.materials.find(x=>x.materialKey===input.resourceId)?.amount;
 if(required===undefined)return {ok:false,reason:"invalid_resource"};
 if(!Number.isSafeInteger(input.amount)||typeof input.amount!=="number"||input.amount<=0)
  return {ok:false,reason:"invalid_amount"};
 if(!Number.isSafeInteger(input.alreadyContributed)||input.alreadyContributed<0)
  return {ok:false,reason:"invalid_amount"};
 if(input.amount>required-input.alreadyContributed)
  return {ok:false,reason:"exceeds_remaining"};
 return {ok:true,templateId:project.id,resourceId:input.resourceId,amount:input.amount};
}
