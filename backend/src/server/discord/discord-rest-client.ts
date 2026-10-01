import type {DiscordMessageClient,DiscordMessagePayload} from './discord-types';

export class DiscordRestClient implements DiscordMessageClient{
  private readonly baseUrl:string;
  constructor(private readonly token:string,baseUrl='https://discord.com/api/v10'){
    this.baseUrl=baseUrl.replace(/\/$/,'');
  }

  async send(channelId:string,payload:DiscordMessagePayload):Promise<{id:string;channelId:string}>{
    if(!channelId)throw new Error('discord_channel_id_required');
    const response=await fetch(`${this.baseUrl}/channels/${encodeURIComponent(channelId)}/messages`,{
      method:'POST',
      headers:{Authorization:`Bot ${this.token}`,'Content-Type':'application/json'},
      body:JSON.stringify(payload),
    });
    if(!response.ok){
      const body=await response.text();
      throw new Error(`discord_send_failed:${response.status}:${body.slice(0,500)}`);
    }
    const result=await response.json() as {id?:string;channel_id?:string};
    if(!result.id)throw new Error('discord_send_missing_message_id');
    return {id:result.id,channelId:result.channel_id??channelId};
  }
}

export function discordConfigFromEnv(env:Record<string,string|undefined>=process.env){
  const botToken=env.DISCORD_BOT_TOKEN?.trim()??'';
  const defaultChannelId=env.DISCORD_ANNOUNCEMENTS_CHANNEL_ID?.trim()??'';
  if(!botToken)throw new Error('DISCORD_BOT_TOKEN_required');
  if(!defaultChannelId)throw new Error('DISCORD_ANNOUNCEMENTS_CHANNEL_ID_required');
  return {
    botToken,
    defaultChannelId,
    eventChannelId:env.DISCORD_EVENT_CHANNEL_ID?.trim()||undefined,
    releaseChannelId:env.DISCORD_RELEASE_CHANNEL_ID?.trim()||undefined,
    maintenanceChannelId:env.DISCORD_MAINTENANCE_CHANNEL_ID?.trim()||undefined,
    contentChannelId:env.DISCORD_CONTENT_CHANNEL_ID?.trim()||undefined,
    apiBaseUrl:env.DISCORD_API_BASE_URL?.trim()||undefined,
    dryRun:env.DISCORD_DRY_RUN==='true',
  };
}
