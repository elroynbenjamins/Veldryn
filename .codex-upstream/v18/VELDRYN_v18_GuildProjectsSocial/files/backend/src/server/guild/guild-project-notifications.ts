export type GuildProjectNotificationKind='project_started'|'project_75_percent'|'project_completed'|'project_ending_24h'|'decree_vote_open'|'decree_activated'|'bulletin_updated';
export interface GuildProjectNotification {kind:GuildProjectNotificationKind;guildId:string;title:string;body:string;deepLink:string;dedupeKey:string;}
export function projectNotification(kind:GuildProjectNotificationKind,input:{guildId:string;projectId?:string;projectName?:string;decreeName?:string;cycleKey?:string}):GuildProjectNotification{
 const link=input.projectId?`veldryn://guild/projects/${input.projectId}`:'veldryn://guild';
 const name=input.projectName??'Guild Project';
 switch(kind){
  case 'project_started':return {kind,guildId:input.guildId,title:'Guild Project started',body:`${name} is now active.`,deepLink:link,dedupeKey:`guild:${input.guildId}:project:${input.projectId}:started`};
  case 'project_75_percent':return {kind,guildId:input.guildId,title:'Guild Project almost complete',body:`${name} has reached 75%.`,deepLink:link,dedupeKey:`guild:${input.guildId}:project:${input.projectId}:75`};
  case 'project_completed':return {kind,guildId:input.guildId,title:'Guild Project complete',body:`${name} is complete. Eligible members can claim rewards.`,deepLink:link,dedupeKey:`guild:${input.guildId}:project:${input.projectId}:complete`};
  case 'project_ending_24h':return {kind,guildId:input.guildId,title:'Guild Project ending soon',body:`${name} has less than 24 hours remaining.`,deepLink:link,dedupeKey:`guild:${input.guildId}:project:${input.projectId}:24h`};
  case 'decree_vote_open':return {kind,guildId:input.guildId,title:'Choose a Guild Decree',body:'Your completed weekly project unlocked a temporary Guild Decree choice.',deepLink:'veldryn://guild/decrees',dedupeKey:`guild:${input.guildId}:decree:${input.cycleKey}:open`};
  case 'decree_activated':return {kind,guildId:input.guildId,title:'Guild Decree active',body:`${input.decreeName??'A Guild Decree'} is now active.`,deepLink:'veldryn://guild/decrees',dedupeKey:`guild:${input.guildId}:decree:${input.decreeName}:active`};
  case 'bulletin_updated':return {kind,guildId:input.guildId,title:'Guild bulletin updated',body:'Your guild posted a new bulletin.',deepLink:'veldryn://guild',dedupeKey:`guild:${input.guildId}:bulletin:${input.cycleKey??''}`};
 }
}
