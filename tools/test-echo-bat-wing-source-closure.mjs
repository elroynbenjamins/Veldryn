// Apply the proposed closure only inside GitHub's disposable review job.
// The caller must explicitly opt in and prove this is a non-main PR checkout.
import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
if(process.env.GITHUB_ACTIONS!=='true'||process.env.GITHUB_EVENT_NAME!=='pull_request'||process.env.GITHUB_HEAD_REF!=='review/material-purpose-loot-cleanup-20261124'||process.argv[2]!=='--fixture-only')throw Error('Disposable retirement review checkout required');
const path='apps/mobile/src/content/monsters.ts',old=readFileSync(path,'utf8');
const token=",{itemId:'ECHO_BAT_WING',chance:.28,min:1,max:2}";
const count=old.split(token).length-1;
if(count!==1||!old.split('\n').find(line=>line.includes(token))?.includes("id:'ECHO_BAT'"))throw Error('Unexpected drop definition');
const next=old.replace(token,'');
if(next.includes("itemId:'ECHO_BAT_WING'"))throw Error('Additional issuance found');
writeFileSync(path,next);
const diff=execFileSync('git',['diff','--',path],{encoding:'utf8'});
console.log(diff);
console.log('PASS: removed exactly one wing drop entry in disposable checkout, preserving all other source bytes');
