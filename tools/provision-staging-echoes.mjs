// Creates or refreshes one dungeon-neutral staging Echo for each launch class.
// Never point this at production: the project identity is deliberately pinned.
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {randomBytes,randomUUID} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {root,backend,project as production} from './online-context.mjs';

const target=JSON.parse(fs.readFileSync(path.join(root,'tools/staging-project.json'),'utf8'));
if(target.id===production||target.id!=='iqfmmpvwanvvmxcftfxw'||target.name!=='Veldryn Staging 20260924')throw new Error('Refusing non-staging project');
const cli=args=>execFileSync(process.execPath,['node_modules/supabase/dist/supabase.js',...args],{cwd:backend,windowsHide:true,encoding:'utf8',stdio:['ignore','pipe','pipe']});
const keys=JSON.parse(cli(['projects','api-keys','--project-ref',target.id,'--output','json']));
const service=keys.find(row=>row.name==='service_role')?.api_key;
if(!service)throw new Error('Staging service key unavailable');
const base=`https://${target.id}.supabase.co`;
async function api(url,body,method='POST'){
 const response=await fetch(base+url,{method,headers:{apikey:service,Authorization:'Bearer '+service,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
 const data=await response.json();if(!response.ok)throw new Error(data.message??data.msg??data.error_description??'request_failed');return data;
}
const rpc=(name,args)=>api('/rest/v1/rpc/'+name,args);
const require=createRequire(path.join(backend,'package.json'));
const build=path.join(backend,'.online-all-expeditions-build');
const {createCharacter,newGame}=require(path.join(build,'apps/mobile/src/core/game.js'));
const {noviceItemId,noviceSetFor}=require(path.join(build,'apps/mobile/src/content/novice-sets.js'));
const {deriveOnlineCoopLoadout,onlineCoopLoadoutHash,assessOnlineCoopLoadout}=require(path.join(build,'backend/online/coop-loadout.js'));
const registryPath=path.join(root,'docs/implementation/online-verification/staging-echoes.json');
const refreshing=process.argv.includes('--refresh');
const definitions=[
 ['IRONWARDEN','Aegis'],['BASTION','Bulwark'],['DREADGUARD','Chain'],['DAWNKEEPER','Dawn'],['STONECALLER','Stone'],
 ['WAYFINDER','Trail'],['RAVAGER','Rift'],['HEXWEAVER','Rune'],['KNIFE_DANCER','Twinstep'],
];
const created=[];
async function publish(accountId,state,revision,requestId){
 const record=deriveOnlineCoopLoadout(accountId,state,revision);
 await rpc('publish_online_coop_loadout_server_v1',{p_account_id:accountId,p_game_version:revision,p_record:record,p_snapshot_hash:onlineCoopLoadoutHash(record),p_readiness:assessOnlineCoopLoadout(record).readiness,p_share_echo:false,p_request_id:`${requestId}-unpublish`});
 return rpc('publish_online_coop_loadout_server_v1',{p_account_id:accountId,p_game_version:revision,p_record:record,p_snapshot_hash:onlineCoopLoadoutHash(record),p_readiness:assessOnlineCoopLoadout(record).readiness,p_share_echo:true,p_request_id:requestId});
}
try{
 if(refreshing){
  if(!fs.existsSync(registryPath))throw new Error('staging_echo_registry_missing');
  const registry=JSON.parse(fs.readFileSync(registryPath,'utf8'));
  if(registry.project!==target.id||!Array.isArray(registry.echoes)||registry.echoes.length!==definitions.length)throw new Error('invalid_staging_echo_registry');
  for(const row of registry.echoes){
   const states=await api(`/rest/v1/online_game_states?account_id=eq.${row.accountId}&select=state,revision` ,undefined,'GET');
   if(states.length!==1)throw new Error(`staging_echo_state_missing:${row.classId}`);
   const state=states[0].state,revision=Number(states[0].revision);
   const published=await publish(row.accountId,state,revision,`staging-echo-refresh-${row.classId.toLowerCase()}-${randomUUID()}`);
   row.echoProfileId=published.echoProfileId;row.level=state.character?.level;console.log(`PASS ${row.classId} Echo refreshed`);
  }
  registry.refreshedAt=new Date().toISOString();
  fs.writeFileSync(registryPath,JSON.stringify(registry,null,2)+'\n');
  console.log(`PASS ${registry.echoes.length} staging Echo profiles refreshed for the next 24 hours`);
  process.exit(0);
 }
 for(const [classId,label] of definitions){
  const email=`staging-echo-${classId.toLowerCase()}-${randomUUID()}@example.invalid`;
  const account=await api('/auth/v1/admin/users',{email,password:randomBytes(24).toString('hex'),email_confirm:true});created.push({accountId:account.id});
  const state=createCharacter(newGame(Date.now()),classId,`Echo ${label}`);state.character.id=randomUUID();state.character.level=100;
  state.character.equipment=Object.fromEntries(noviceSetFor(classId).slots.map(slot=>[slot,noviceItemId(classId,slot)]));
  await rpc('load_online_game_server_v1',{p_account_id:account.id});
  await rpc('commit_online_game_server_v1',{p_account_id:account.id,p_expected_version:0,p_expected_gold:null,p_request_id:'staging-echo-create-01',p_request_hash:'e'.repeat(64),p_response:{state,version:1,accountId:account.id,serverNow:Date.now()},p_contributions:[]});
  const published=await publish(account.id,state,1,`staging-echo-publish-${classId.toLowerCase()}-${randomUUID()}`);
  Object.assign(created.at(-1),{classId,characterId:state.character.id,echoProfileId:published.echoProfileId,level:state.character.level});
  console.log(`PASS ${classId} Echo published`);
 }
 const registry={project:target.id,createdAt:new Date().toISOString(),echoes:created};
 fs.writeFileSync(registryPath,JSON.stringify(registry,null,2)+'\n');
 console.log(`PASS ${created.length} staging Echo profiles ready for every dungeon`);
}catch(error){
 for(const row of created)try{await api('/auth/v1/admin/users/'+row.accountId,undefined,'DELETE')}catch{}
 throw error;
}
