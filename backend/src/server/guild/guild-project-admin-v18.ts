export interface GuildProjectAdminCommandDefinition {
  commandKey:string; label:string; description:string; riskTier:'low'|'medium'|'high'|'critical'; requiresApproval:boolean;
  paramsSchema:{fields:unknown[]};
}

/** Registry rows for the schema-driven v17.3 Control Center. No custom admin page is required. */
export const GUILD_PROJECT_ADMIN_COMMANDS:readonly GuildProjectAdminCommandDefinition[]=[
  {commandKey:'guild.project.regenerate_board',label:'Regenerate Guild Project board',description:'Rebuild a corrupted current weekly candidate board from the deterministic server rotation.',riskTier:'low',requiresApproval:false,paramsSchema:{fields:[{name:'guildId',label:'Guild ID',type:'uuid',required:true},{name:'cycleKey',label:'Cycle key',type:'text',required:true}]}},
  {commandKey:'guild.project.cancel_stuck',label:'Cancel stuck Guild Project',description:'Safely cancel a stuck project and release its active slot. Does not refund already consumed development donations automatically.',riskTier:'high',requiresApproval:false,paramsSchema:{fields:[{name:'projectInstanceId',label:'Project instance',type:'uuid',required:true}]}},
  {commandKey:'guild.project.repair_progress',label:'Repair Guild Project progress',description:'Critical corruption-recovery control for exact project/category progress. Requires a support incident reference.',riskTier:'critical',requiresApproval:true,paramsSchema:{fields:[{name:'projectInstanceId',label:'Project instance',type:'uuid',required:true},{name:'completionPoints',label:'Completion points',type:'integer',required:true,min:0},{name:'combatPoints',label:'Combat points',type:'integer',required:true,min:0},{name:'skillingPoints',label:'Skilling points',type:'integer',required:true,min:0},{name:'incidentReference',label:'Incident reference',type:'text',required:true,minLength:3,maxLength:120}]}},
  {commandKey:'guild.project.force_finalize',label:'Force finalize Guild Project',description:'Re-evaluate and finalize a project through normal completion rules after a worker failure. Cannot bypass unmet requirements.',riskTier:'high',requiresApproval:false,paramsSchema:{fields:[{name:'projectInstanceId',label:'Project instance',type:'uuid',required:true}]}},
  {commandKey:'guild.decree.cancel',label:'Cancel active Guild Decree',description:'Emergency cancellation of a broken Guild Decree effect.',riskTier:'high',requiresApproval:false,paramsSchema:{fields:[{name:'guildId',label:'Guild ID',type:'uuid',required:true},{name:'decreeInstanceId',label:'Decree instance',type:'uuid',required:true}]}},
] as const;
