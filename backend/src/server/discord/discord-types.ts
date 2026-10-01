export type DiscordAnnouncementKind='event_started'|'event_ended'|'patch'|'maintenance'|'new_content';

export interface DiscordEmbedField{name:string;value:string;inline?:boolean;}
export interface DiscordEmbed{
  title:string;
  description:string;
  color:number;
  fields?:DiscordEmbedField[];
  url?:string;
  footer?:{text:string};
  timestamp?:string;
}

export interface DiscordMessagePayload{
  content?:string;
  embeds:DiscordEmbed[];
  allowed_mentions:{parse:string[];roles?:string[]};
}

export interface DiscordAnnouncement{
  kind:DiscordAnnouncementKind;
  title:string;
  summary:string;
  details?:string[];
  startsAt?:string;
  endsAt?:string;
  url?:string;
  mentionRoleId?:string;
}

export interface DiscordAnnouncementConfig{
  botToken:string;
  defaultChannelId:string;
  eventChannelId?:string;
  releaseChannelId?:string;
  maintenanceChannelId?:string;
  contentChannelId?:string;
  apiBaseUrl?:string;
  dryRun?:boolean;
}

export interface DiscordMessageClient{
  send(channelId:string,payload:DiscordMessagePayload):Promise<{id:string;channelId:string}>;
}
