// Real two-session races against the linked development DB. Fixtures use unique random IDs
// and are removed in finally; no existing account or Party is selected for mutation.
import fs from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const scratch=path.join(root,'tools/.codex-tmp');fs.mkdirSync(scratch,{recursive:true});
const schema='v16_race_'+randomUUID().replaceAll('-','');
const users=Array.from({length:6},()=>randomUUID()),characters=Array.from({length:6},()=>randomUUID());
const list=values=>values.map(value=>`'${value}'`).join(',');
const logs=[];let queryIndex=0;
async function query(label,sql,allowFailure=false){
 const file=path.join(scratch,`${schema}-${queryIndex++}.sql`);fs.writeFileSync(file,sql);
 const output=await new Promise((resolve,reject)=>{
  const child=spawn(process.execPath,['node_modules/supabase/dist/supabase.js','db','query','--linked','--file',file],{cwd:path.join(root,'backend'),windowsHide:true});let stdout='',stderr='';
  child.stdout.on('data',data=>stdout+=data);child.stderr.on('data',data=>stderr+=data);child.on('error',reject);child.on('close',code=>resolve({code,stdout,stderr}));
 });
 logs.push({label,...output});if(output.code!==0&&!allowFailure)throw new Error(`${label}: ${output.stdout} ${output.stderr}`);return output;
}
const auth=index=>`select set_config('request.jwt.claim.sub','${users[index]}',true); set local role authenticated;`;
const assertSql=(condition,message)=>`do $$ begin if not (${condition}) then raise exception '${message}'; end if;end $$;`;
const report=path.join(root,'docs/implementation/v16-verification/concurrency.json');
let failure;
try{
 await query('setup',`begin; create schema ${schema};create table ${schema}.state(party uuid,second_party uuid,contract uuid,reward uuid);
 insert into auth.users(id,email) values ${users.map(id=>`('${id}','${schema}-${id}@example.invalid')`).join(',')};
 insert into public.characters(id,account_id,name,class_id) values ${characters.map((id,i)=>`('${id}','${users[i]}','V16 Race ${i}','WAYFINDER')`).join(',')};
 select set_config('request.jwt.claim.sub','${users[0]}',true);
 insert into ${schema}.state(party) select public.create_persistent_party_v16('${characters[0]}','damage','mixed','${schema}-create');
 ${[1,2].map(i=>`select set_config('request.jwt.claim.sub','${users[i]}',true);select public.join_persistent_party_v16((select party from ${schema}.state),'${characters[i]}','damage','${schema}-join-${i}');`).join('\n')}
 grant usage on schema ${schema} to authenticated;grant select on ${schema}.state to authenticated;
 commit;`);
 const joins=await Promise.all([3,4].map(i=>query(`concurrent join ${i}`,`begin;${auth(i)}select public.join_persistent_party_v16((select party from ${schema}.state),'${characters[i]}','damage','${schema}-join-${i}');commit;`,true)));
 if(joins.filter(result=>result.code===0).length!==1||!joins.some(result=>(result.stdout+result.stderr).includes('party_full')))throw new Error('Concurrent join must admit exactly one candidate and reject the fifth.');
 console.log('PASS concurrent capacity (one admitted, fifth rejected)');
 await Promise.all([1,2].map(i=>query(`concurrent create replay ${i}`,`begin;${auth(5)}select public.create_persistent_party_v16('${characters[5]}','support','mixed','${schema}-same-create');commit;`)));
 await query('create replay assertion',`begin;${assertSql(`select count(*)=1 from public.parties where leader_account_id='${users[5]}'`,'duplicate Party creation')}
 update ${schema}.state set second_party=(select id from public.parties where leader_account_id='${users[5]}');
 select public.ensure_party_contracts_v16((select party from ${schema}.state));update ${schema}.state set contract=(select id from public.party_contract_instances_v16 where party_id=(select party from ${schema}.state) and definition_id='party_weekly_combat_v1');commit;`);
 console.log('PASS concurrent create replay');
 await Promise.all([1,2].map(i=>query(`concurrent contribution ${i}`,`begin;select public.record_party_contract_contribution_v16((select contract from ${schema}.state),'${users[0]}','standard_hunts',10,'${schema}-same-event');commit;`)));
 await query('contribution assertion and completion',`begin;${assertSql(`select units=10 and normalized_points=55 from public.party_contract_progress_v16 where instance_id=(select contract from ${schema}.state) and objective_id='standard_hunts'`,'double-counted concurrent contribution')}
 do $$ declare o record;begin for o in select * from public.party_contract_objectives_v16 where definition_id='party_weekly_combat_v1' loop perform public.record_party_contract_contribution_v16((select contract from ${schema}.state),'${users[0]}',o.objective_id,99999,'${schema}-finish-'||o.objective_id);end loop;end $$;
 update ${schema}.state set reward=(select id from public.party_contract_reward_entitlements_v16 where instance_id=(select contract from ${schema}.state) and account_id='${users[0]}');commit;`);
 console.log('PASS concurrent contribution replay');
 await Promise.all([1,2].map(i=>query(`concurrent reward ${i}`,`begin;${auth(0)}select public.claim_party_contract_reward_v16((select reward from ${schema}.state),'${characters[0]}');commit;`)));
 await query('reward assertion',assertSql(`select gold=100 from public.character_wallets where character_id='${characters[0]}'`,'double-paid concurrent reward'));
 console.log('PASS concurrent reward claim');
 const posts=await Promise.all([1,2].map(i=>query(`concurrent advert ${i}`,`begin;${auth(5)}select public.publish_recruitment_post_v16(p_post_type=>'party_recruiting',p_title=>'${schema}',p_party_id=>(select second_party from ${schema}.state),p_open_spots=>3);commit;`,true)));
 if(posts.filter(result=>result.code===0).length!==1||!posts.some(result=>(result.stdout+result.stderr).includes('recruitment_refresh_cooldown')))throw new Error('Concurrent adverts must share cooldown.');
 console.log('PASS concurrent recruitment cooldown');
}catch(error){failure=String(error);throw error;}
finally{
 try{
 await query('cleanup',`begin;
 delete from public.character_wallets where character_id in (${list(characters)});
 delete from public.parties where leader_account_id in (${list(users)});
 delete from public.characters where id in (${list(characters)});
 delete from auth.users where id in (${list(users)});
 drop schema if exists ${schema} cascade;
 commit;`);
 console.log('PASS isolated fixture cleanup');
 }catch(error){failure=[failure,String(error)].filter(Boolean).join('; ');throw error;}
 finally{fs.mkdirSync(path.dirname(report),{recursive:true});fs.writeFileSync(report,JSON.stringify({status:failure?'FAIL':'PASS',runAt:new Date().toISOString(),...(failure?{error:failure}:{}),logs},null,2)+'\n');}
}
