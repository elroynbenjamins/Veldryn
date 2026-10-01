import type {DiscordAnnouncement,DiscordAnnouncementConfig,DiscordEmbed,DiscordMessageClient,DiscordMessagePayload} from './discord-types';

const COLORS={event:0xD67B3E,patch:0x6D8CFF,maintenance:0xE7B84B,content:0x6BCB9A,ended:0x8B96A8} as const;

function formatWhen(value?:string){
  if(!value)return undefined;
  const date=new Date(value);
  return Number.isNaN(date.getTime())?value:`<t:${Math.floor(date.getTime()/1000)}:F> (<t:${Math.floor(date.getTime()/1000)}:R>)`;
}

function embedFor(announcement:DiscordAnnouncement):DiscordEmbed{
  const fields=(announcement.details??[]).slice(0,8).map((detail,index)=>({name:`Detail ${index+1}`,value:detail.slice(0,1024)}));
  if(announcement.startsAt)fields.unshift({name:'Starts',value:formatWhen(announcement.startsAt)!});
  if(announcement.endsAt)fields.push({name:'Ends',value:formatWhen(announcement.endsAt)!});
  const color=announcement.kind==='event_started'?COLORS.event:announcement.kind==='event_ended'?COLORS.ended:announcement.kind==='patch'?COLORS.patch:announcement.kind==='maintenance'?COLORS.maintenance:COLORS.content;
  return {title:announcement.title.slice(0,256),description:announcement.summary.slice(0,4096),color,fields:fields.length?fields:undefined,url:announcement.url,footer:{text:'VELDRYN · Official announcement'},timestamp:new Date().toISOString()};
}

function contentFor(announcement:DiscordAnnouncement){
  return announcement.mentionRoleId?`<@&${announcement.mentionRoleId}>`:undefined;
}

export class DiscordAnnouncementService{
  constructor(private readonly client:DiscordMessageClient,private readonly config:DiscordAnnouncementConfig,private readonly delivered=new Set<string>()){}

  async publish(announcement:DiscordAnnouncement,idempotencyKey:string){
    if(!idempotencyKey.trim())throw new Error('discord_idempotency_key_required');
    if(this.delivered.has(idempotencyKey))return {skipped:true as const,idempotencyKey};
    const channelId=this.channelFor(announcement.kind);
    const payload:DiscordMessagePayload={content:contentFor(announcement),embeds:[embedFor(announcement)],allowed_mentions:{parse:[]}};
    if(announcement.mentionRoleId)payload.allowed_mentions={parse:[],roles:[announcement.mentionRoleId]};
    if(this.config.dryRun){this.delivered.add(idempotencyKey);return {skipped:false as const,dryRun:true as const,idempotencyKey,payload,channelId};}
    const sent=await this.client.send(channelId,payload);
    this.delivered.add(idempotencyKey);
    return {skipped:false as const,dryRun:false as const,idempotencyKey,payload,channelId,messageId:sent.id};
  }

  eventStarted(input:{eventId:string;name:string;summary:string;startsAt:string;endsAt?:string;details?:string[];url?:string;mentionRoleId?:string}){return this.publish({kind:'event_started',title:`Event started: ${input.name}`,summary:input.summary,startsAt:input.startsAt,endsAt:input.endsAt,details:input.details,url:input.url,mentionRoleId:input.mentionRoleId},`event:${input.eventId}:started`);}
  eventEnded(input:{eventId:string;name:string;summary:string;endsAt:string;details?:string[];url?:string}){return this.publish({kind:'event_ended',title:`Event ended: ${input.name}`,summary:input.summary,endsAt:input.endsAt,details:input.details,url:input.url},`event:${input.eventId}:ended`);}
  patchNotice(input:{releaseId:string;version:string;summary:string;details?:string[];url?:string}){return this.publish({kind:'patch',title:`Patch ${input.version} is live`,summary:input.summary,details:input.details,url:input.url},`patch:${input.releaseId}`);}
  maintenance(input:{maintenanceId:string;title:string;summary:string;startsAt?:string;endsAt?:string;details?:string[];url?:string;mentionRoleId?:string}){return this.publish({kind:'maintenance',title:input.title,summary:input.summary,startsAt:input.startsAt,endsAt:input.endsAt,details:input.details,url:input.url,mentionRoleId:input.mentionRoleId},`maintenance:${input.maintenanceId}`);}
  newContent(input:{contentId:string;name:string;summary:string;details?:string[];url?:string;startsAt?:string}){return this.publish({kind:'new_content',title:`New content: ${input.name}`,summary:input.summary,startsAt:input.startsAt,details:input.details,url:input.url},`content:${input.contentId}`);}

  private channelFor(kind:DiscordAnnouncement['kind']){return kind==='event_started'||kind==='event_ended'?this.config.eventChannelId??this.config.defaultChannelId:kind==='patch'?this.config.releaseChannelId??this.config.defaultChannelId:kind==='maintenance'?this.config.maintenanceChannelId??this.config.defaultChannelId: this.config.contentChannelId??this.config.defaultChannelId;}
}
