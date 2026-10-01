import assert from 'node:assert/strict';
import {DiscordAnnouncementService} from './discord-announcement-service';
import {discordConfigFromEnv} from './discord-rest-client';
import type {DiscordMessageClient,DiscordMessagePayload} from './discord-types';

class FakeClient implements DiscordMessageClient{messages:{channelId:string;payload:DiscordMessagePayload}[]=[];async send(channelId:string,payload:DiscordMessagePayload){this.messages.push({channelId,payload});return {id:`message-${this.messages.length}`,channelId};}}

async function main(){
 const client=new FakeClient();
 const service=new DiscordAnnouncementService(client,{botToken:'token',defaultChannelId:'general',eventChannelId:'events',releaseChannelId:'releases'});
 const first=await service.eventStarted({eventId:'harvestwake-2026',name:'Harvestwake',summary:'The Harvestwake event is now live.',startsAt:'2026-10-01T12:00:00Z',endsAt:'2026-10-31T23:59:59Z',details:['Earn Candy from event activities.'],mentionRoleId:'123'});
 assert.equal(first.skipped,false);
 assert.equal(client.messages[0].channelId,'events');
 assert.equal(client.messages[0].payload.allowed_mentions.parse.length,0);
 assert.deepEqual(client.messages[0].payload.allowed_mentions.roles,['123']);
 assert.match(client.messages[0].payload.embeds[0].fields?.[0].value??'',/<t:/);
 const duplicate=await service.eventStarted({eventId:'harvestwake-2026',name:'Harvestwake',summary:'duplicate',startsAt:'2026-10-01T12:00:00Z'});
 assert.equal(duplicate.skipped,true);
 const patch=await service.patchNotice({releaseId:'mobile-0.1.0-v9',version:'0.1.0',summary:'Co-op and event improvements are now available.',details:['Improved event start popup.'],url:'https://veldryn.example/patches/0.1.0'});
 assert.equal(patch.channelId,'releases');
 assert.throws(()=>discordConfigFromEnv({DISCORD_BOT_TOKEN:'x'}),/DISCORD_ANNOUNCEMENTS_CHANNEL_ID_required/);
 console.log('PASS discord announcement service');
}
void main();
