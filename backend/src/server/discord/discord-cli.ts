import {DiscordAnnouncementService} from './discord-announcement-service';
import {discordConfigFromEnv,DiscordRestClient} from './discord-rest-client';

function args(argv:string[]){
  const result:Record<string,string>={};
  for(let i=0;i<argv.length;i+=1){
    const key=argv[i];
    if(!key.startsWith('--'))continue;
    result[key.slice(2)]=argv[i+1]?.startsWith('--')||argv[i+1]===undefined?'true':argv[++i];
  }
  return result;
}

function required(values:Record<string,string>,key:string){if(!values[key]?.trim())throw new Error(`--${key}_required`);return values[key];}
function details(values:Record<string,string>){return values.details?.split('|').map(value=>value.trim()).filter(Boolean);}

async function main(){
  const command=process.argv[2];
  const values=args(process.argv.slice(3));
  const config=discordConfigFromEnv();
  const service=new DiscordAnnouncementService(new DiscordRestClient(config.botToken,config.apiBaseUrl),config);
  if(command==='event-start')return service.eventStarted({eventId:required(values,'id'),name:required(values,'name'),summary:required(values,'summary'),startsAt:required(values,'starts'),endsAt:values.ends,details:details(values),url:values.url,mentionRoleId:values.role});
  if(command==='event-end')return service.eventEnded({eventId:required(values,'id'),name:required(values,'name'),summary:required(values,'summary'),endsAt:required(values,'ends'),details:details(values),url:values.url});
  if(command==='patch')return service.patchNotice({releaseId:required(values,'id'),version:required(values,'version'),summary:required(values,'summary'),details:details(values),url:values.url});
  if(command==='maintenance')return service.maintenance({maintenanceId:required(values,'id'),title:required(values,'title'),summary:required(values,'summary'),startsAt:values.starts,endsAt:values.ends,details:details(values),url:values.url,mentionRoleId:values.role});
  if(command==='content')return service.newContent({contentId:required(values,'id'),name:required(values,'name'),summary:required(values,'summary'),details:details(values),url:values.url,startsAt:values.starts});
  throw new Error('command_required:event-start|event-end|patch|maintenance|content');
}

void main().then(result=>{if(result)console.log(JSON.stringify(result));}).catch(error=>{console.error(error instanceof Error?error.message:String(error));process.exitCode=1;});
