import type { GuildProjectDefinition, GuildProjectDonationRequirement } from './guild-projects';

export interface GuildProjectDonationProgress {
  resourceKind:'gold'|'item';
  resourceId:string;
  targetAmount:number;
  contributedAmount:number;
}
export interface GuildProjectDonorProgress { accountId:string; normalizedProjectShare:number; }

export interface GuildProjectDonationRepository {
  /** Implementation must use the same transaction for inventory/Gold debit + project progress + receipt. */
  donateAtomically(input:{projectInstanceId:string;accountId:string;resourceKind:'gold'|'item';resourceId:string;amount:number;idempotencyKey:string}):Promise<{debited:number;newContributedAmount:number;duplicate:boolean}>;
}

export function developmentDonationGoals(definition:GuildProjectDefinition):GuildProjectDonationProgress[]{
  if(definition.kind!=='development')throw new Error('not_development_project');
  return (definition.donationRequirements??[]).map((row)=>({resourceKind:row.resourceKind,resourceId:row.resourceId,targetAmount:row.quantity,contributedAmount:0}));
}
export function donationRemaining(goal:GuildProjectDonationProgress):number{return Math.max(0,Math.floor(goal.targetAmount)-Math.max(0,Math.floor(goal.contributedAmount)));}
export function developmentMeaningfulDonorThreshold():number{return 0.03;}
export function minimumDevelopmentDonors(activeMemberSnapshot:number):number{return Math.max(1,Math.min(3,Math.ceil(Math.max(1,activeMemberSnapshot)*0.15)));}
export function developmentProjectComplete(goals:readonly GuildProjectDonationProgress[],donors:readonly GuildProjectDonorProgress[]=[],activeMemberSnapshot=1):boolean{
  const resourcesComplete=goals.length>0&&goals.every((goal)=>donationRemaining(goal)===0);
  if(!resourcesComplete)return false;
  const required=minimumDevelopmentDonors(activeMemberSnapshot);
  const meaningful=donors.filter((d)=>d.normalizedProjectShare>=developmentMeaningfulDonorThreshold()).length;
  return meaningful>=required;
}
export function normalizedDonationShare(input:{amount:number;goalTarget:number;goalCount:number}):number{
  if(input.amount<=0||input.goalTarget<=0||input.goalCount<=0)return 0;
  return Math.min(1/input.goalCount,(input.amount/input.goalTarget)/input.goalCount);
}
export function validateDonationAgainstDefinition(definition:GuildProjectDefinition,resourceKind:'gold'|'item',resourceId:string,amount:number):GuildProjectDonationRequirement{
  if(definition.kind!=='development')throw new Error('project_does_not_accept_direct_donations');
  if(!Number.isInteger(amount)||amount<=0)throw new Error('invalid_donation_amount');
  const requirement=(definition.donationRequirements??[]).find((row)=>row.resourceKind===resourceKind&&row.resourceId===resourceId);
  if(!requirement)throw new Error('resource_not_required_by_project');
  return requirement;
}
