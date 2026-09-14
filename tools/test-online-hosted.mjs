// Uses isolated admin-confirmed fixture accounts. No email is sent and no existing player is modified.
import {randomUUID} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {isDeepStrictEqual} from 'node:util';
import {api,projectKeys,root,project,backend} from './online-context.mjs';
const keys=projectKeys(),users=[],characters=[],parties=[],checks=[];
const label='Online '+randomUUID().slice(0,8).replace(/[0-9]/g,n=>String.fromCharCode(103+Number(n)));
function check(name,condition){checks.push({check:name,status:condition?'PASS':'FAIL'});console.log(`${condition?'PASS':'FAIL'} ${name}`);if(!condition)throw new Error(name);}
function sql(query){
 const file=path.join(root,'tools/.codex-tmp/online-hosted-'+randomUUID()+'.sql');fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,query);
 try{execFileSync(process.execPath,['node_modules/supabase/dist/supabase.js','db','query','--linked','--file',file],{cwd:backend,windowsHide:true,stdio:['ignore','pipe','pipe']});return true;}catch{return false;}finally{fs.unlinkSync(file);}
}
async function rpc(name,args,token=keys.service){return api('/rest/v1/rpc/'+name,token===keys.service?keys.service:keys.anon,{method:'POST',token,body:args});}
async function fixture(index){
 const email=`veldryn-online-${randomUUID()}@example.invalid`,password=randomUUID()+'aA1!';
 const created=await api('/auth/v1/admin/users',keys.service,{method:'POST',body:{email,password,email_confirm:true}});
 check(`create isolated confirmed account ${index}`,created.ok&&Boolean(created.data.id));users.push(created.data.id);
 const login=await api('/auth/v1/token?grant_type=password',keys.anon,{method:'POST',body:{email,password}});
 check(`real password session ${index}`,login.ok&&login.data.user.id===created.data.id);
 return {id:created.data.id,token:login.data.access_token,email,password};
}
const game=(user,body)=>api('/functions/v1/gameplay',keys.anon,{token:user.token,...(body?{method:'POST',body}:{})});
const request=(command,expectedVersion,requestId=randomUUID())=>({requestId,expectedVersion,command});
let failure;
try{
 check('reject forged session',(await game({token:'forged'})).status===401);
 const alice=await fixture(1),bob=await fixture(2);
 const empty=await game(alice);check('load empty server account',empty.ok&&empty.data.version===0&&!empty.data.state.character);
 const creation=request({type:'create',args:{name:label,classId:'IRONWARDEN'}},0);
 const made=await game(alice,creation);if(!made.ok)console.log(JSON.stringify({status:made.status,error:made.data.error}));check('persist real character',made.ok&&made.data.state.character.id&&made.data.version===1);characters.push(made.data.state.character.id);
 const replay=await game(alice,creation);check('creation replay returns same character',replay.ok&&replay.data.state.character.id===characters[0]&&replay.data.version===1);
 check('reject changed intent under same key',(await game(alice,{...creation,command:{type:'claim'}})).status===409);
 check('reject client time and reward injection',(await game(alice,request({type:'claim',args:{now:9999999999999,gold:999999}},1))).status===400);
 const other=await game(bob);check('another account cannot see progress',other.ok&&!other.data.state.character);
 const party=await rpc('create_persistent_party_v16',{p_leader_character_id:characters[0],p_role:'tank',p_focus:'mixed',p_idempotency_key:randomUUID()},alice.token);
 check('create persistent Party from server character',party.ok&&typeof party.data==='string');parties.push(party.data);
 const start=await game(alice,request({type:'start',args:{kind:'combat',id:'MOSS_RAT'}},1));check('start server activity',start.ok&&start.data.version===2);
 const direct=await api('/rest/v1/characters?id=eq.'+characters[0],keys.anon,{token:alice.token,method:'PATCH',body:{gold:999999,level:25}});
 check('direct client progression denied',direct.status===403);
 check('privileged state RPC denied',(await rpc('load_online_game_server_v1',{p_account_id:alice.id},alice.token)).status===403);
 // Actual wall time, never backdate a fixture state or submit client time.
 console.log('Waiting 35 seconds for real combat progress.');await new Promise(resolve=>setTimeout(resolve,35000));
 const claim=request({type:'claim'},2),claims=await Promise.all([game(alice,claim),game(alice,claim)]);
 if(claims.some(r=>!r.ok))console.log(claims.map(r=>({status:r.status,error:r.data.error})));
 check('concurrent identical claims replay once',claims.every(r=>r.ok&&r.data.version===3)&&isDeepStrictEqual(claims[0].data,claims[1].data));
 check('elapsed combat earns server XP',claims[0].data.reward.kills>0&&claims[0].data.state.character.xp>0);
 const progress=await api('/rest/v1/party_contract_member_progress_v16?account_id=eq.'+alice.id,keys.service);
 check('real gameplay advances Party Contracts',progress.ok&&progress.data.some(row=>row.normalized_points>0));
 check('exactly one receipt per successful intent',sql(`do $$ begin if (select count(*) from public.server_action_receipts where account_id='${alice.id}' and action='online_game_v1')<>3 then raise exception 'receipt count';end if;end $$;`));
 const races=await Promise.all([game(alice,request({type:'stop'},3)),game(alice,request({type:'stop'},3))]);
 check('different concurrent intents use compare-and-swap',races.filter(r=>r.ok).length===1&&races.some(r=>r.status===409));
 const loginAgain=await api('/auth/v1/token?grant_type=password',keys.anon,{method:'POST',body:{email:alice.email,password:alice.password}});
 const restored=await game({token:loginAgain.data.access_token});check('progress survives a new login',restored.ok&&restored.data.version===4&&restored.data.state.character.xp===claims[0].data.state.character.xp);
 const walletBefore=restored.data.state.character.gold;
 const walletCredit=await api('/rest/v1/character_wallets?character_id=eq.'+characters[0],keys.service,{method:'PATCH',body:{gold:walletBefore+100}});check('isolated fixture external reward credited',walletCredit.ok);
 const walletRead=await game(alice);check('external Contract wallet reward visible',walletRead.ok&&walletRead.data.state.character.gold===walletBefore+100);
 const saved=await game(alice,request({type:'claim'},4));check('next save preserves external reward',saved.ok&&saved.data.state.character.gold===walletBefore+100);
}catch(error){failure=error.message;console.error('Hosted check failed: '+failure);process.exitCode=1;}
finally{
 let cleaned=true;
 const ids=users.map(id=>`'${id}'`).join(',');
 if(users.length)cleaned=sql(`begin;delete from public.parties where leader_account_id in (${ids});delete from public.online_game_states where account_id in (${ids});delete from public.character_wallets where character_id in (select id from public.characters where account_id in (${ids}));delete from public.characters where account_id in (${ids});commit;`);
 for(const id of users){const r=await api('/auth/v1/admin/users/'+id,keys.service,{method:'DELETE'});cleaned=cleaned&&r.ok;}
 checks.push({check:'isolated fixture cleanup',status:cleaned?'PASS':'FAIL'});console.log(`${cleaned?'PASS':'FAIL'} isolated fixture cleanup`);if(!cleaned)process.exitCode=1;
 fs.mkdirSync(path.join(root,'docs/implementation/online-verification'),{recursive:true});
 fs.writeFileSync(path.join(root,'docs/implementation/online-verification/hosted-gameplay.json'),JSON.stringify({project,runAt:new Date().toISOString(),status:failure||!cleaned?'FAIL':'PASS',checks,...(failure?{error:failure}:{})},null,2)+'\n');
}
