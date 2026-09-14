// Applies every repository migration, in order, only to the explicitly created disposable project.
import fs from 'node:fs';
import path from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {createHash} from 'node:crypto';
import {backend,root,project as production} from './online-context.mjs';
const exec=promisify(execFile);
const target=JSON.parse(fs.readFileSync(path.join(root,'tools/.codex-tmp/fresh-project.json'),'utf8'));
if(target.deletedAt||target.id===production||!/^Veldryn Migration Validation 2026091[23]$/.test(target.name)||!/^[a-z]{20}$/.test(target.id))throw new Error('Refusing an unverified database target');
const reportFile=path.join(root,'docs/implementation/online-verification/fresh-migrations.json');
const report={checkedAt:new Date().toISOString(),testProject:target.id,productionProjectUnchanged:production,migrations:[],checks:[],status:'RUNNING'};
const resume=process.argv.includes('--resume-diagnosis');
const previous=resume?JSON.parse(fs.readFileSync(reportFile,'utf8')):null;
if(previous&&previous.testProject!==target.id)throw new Error('Mismatched diagnostic target');
function save(){fs.writeFileSync(reportFile,JSON.stringify(report,null,2)+'\n');}
async function query(file){return exec(process.execPath,['node_modules/supabase/dist/supabase.js','db','query','--linked','--project-ref',target.id,'--file',file,'--output','json'],{cwd:backend,windowsHide:true,maxBuffer:16*1024*1024});}
const guard=path.join(root,'tools/.codex-tmp/fresh-empty-guard.sql');
fs.writeFileSync(guard,"do $$ begin if to_regclass('public.characters') is not null or to_regclass('public.online_game_states') is not null then raise exception 'Test database is not fresh'; end if; end $$;");
try{
 if(process.argv.includes('--reset-test-schema')){
  // Only this script's named disposable project can reach this path. Never --linked alone.
  const reset=path.join(root,'tools/.codex-tmp/fresh-reset.sql');
  fs.writeFileSync(reset,"begin; drop schema public cascade; create schema public authorization postgres; grant usage on schema public to anon,authenticated,service_role; grant all on schema public to postgres,service_role; alter default privileges for role postgres in schema public grant all on tables to anon,authenticated,service_role; alter default privileges for role postgres in schema public grant all on sequences to anon,authenticated,service_role; alter default privileges for role postgres in schema public grant all on functions to anon,authenticated,service_role; commit;");
  await query(reset);report.checks.push({check:'reset disposable application schema only; managed Auth/Storage retained',status:'PASS'});
 }
 if(!resume){await query(guard);report.checks.push({check:'empty application schema before first migration',status:'PASS'});}else report.checks.push({check:'diagnostic resume; full fresh rerun still required',status:'NOT_A_FRESH_RUN'});save();
 const folder=path.join(backend,'supabase/migrations');
 for(const file of fs.readdirSync(folder).filter(name=>name.endsWith('.sql')).sort()){
   const full=path.join(folder,file),sha256=createHash('sha256').update(fs.readFileSync(full)).digest('hex');
   if(previous?.migrations.some(row=>row.file===file&&row.sha256===sha256&&row.status==='PASS')){report.migrations.push({file,sha256,status:'PASS'});continue;}
   try{await query(full);report.migrations.push({file,sha256,status:'PASS'});console.log('PASS '+file);save();}
   catch(error){report.migrations.push({file,sha256,status:'FAIL',error:String(error.stderr??error.message).slice(0,4000)});throw error;}
 }
 for(const file of ['party_v16.sql','party_v16_safety.sql','online_gameplay.sql','online_coop_loadouts.sql','online_qmode_runtime.sql','online_live_queue.sql','online_live_ready.sql']){
   try{await query(path.join(backend,'supabase/tests',file));report.checks.push({check:file,status:'PASS'});console.log('PASS '+file);save();}
   catch(error){report.checks.push({check:file,status:'FAIL',error:String(error.stderr??error.message).slice(0,4000)});throw error;}
 }
 report.status=resume?'PASS_DIAGNOSTIC_RESUME':'PASS';
}catch(error){report.status='FAIL';console.error(String(error.stderr??error.message).slice(0,4000));process.exitCode=1;}
finally{save();}
