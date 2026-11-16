/**
 * Guild PvE V7: validate authored V5 Broken Forge cue metadata, read-only.
 * No combat, db, rewards, or file writes.
 * Run: node tools/guild-pve-v7-content-verify.mjs
 */
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const file=resolve(root,'docs/roadmap/spreadsheets/guild-pve-broken-forge-encounter-cues-v5.csv');
const rows=readFileSync(file,'utf8').trim().split(/\r?\n/);
const parse=line=>{
 const matches=[...line.matchAll(/"((?:[^"]|"")*)"(?:,|$)/g)];
 const values=matches.map(m=>m[1].replaceAll('""','"'));
 assert(values.length>0&&matches.map(m=>m[0]).join('')===line,'malformed quoted CSV row');
 return values;
};
const headers=parse(rows.shift()??'');
const required=['boss','phase_id','phase_roman','hp_band_percent','cue_order','cue_id','display_text_en','kind','suggested_counter'];
for(const h of required)assert(headers.includes(h),'missing required header '+h);
const get=(row,key)=>row[headers.indexOf(key)];
const entries=rows.map(parse);
assert.equal(entries.length,36,'expected exactly 36 authored cue rows');
const phases={
 gatekeeper:[['iron_skin','100-60'],['gate_collapse','60-20'],['open_gate','20-0']],
 seer:[['ash_veil','100-65'],['curse_web','65-30'],['emberfall','30-0']],
 warden:[['armoured','100-70'],['overload','70-30'],['exposed_core','30-0']],
};
const used=new Set();
let warningCount=0,resolveCount=0;
for(const [boss,defs] of Object.entries(phases))for(const [phase,range] of defs){
 const group=entries.filter(r=>get(r,'boss')===boss&&get(r,'phase_id')===phase);
 assert.equal(group.length,4,boss+'/'+phase+' must have four cues');
 assert.deepEqual(group.map(r=>Number(get(r,'cue_order'))),[1,2,3,4],boss+'/'+phase+' cue orders');
 assert(group.every(r=>get(r,'hp_band_percent')===range),boss+'/'+phase+' HP band mismatch');
 assert(group.some(r=>get(r,'kind')==='warning'),'missing readable warning '+boss+'/'+phase);
 for(const row of group){
  const id=get(row,'cue_id');
  const key=boss+':'+phase+':'+id;
  assert(!used.has(key),'duplicate cue '+key);used.add(key);
  assert(get(row,'display_text_en').length>=10,'missing text '+key);
  assert(['assault','guard','rally'].includes(get(row,'suggested_counter')),'invalid counter '+key);
  assert(['setup','warning','resolve','opportunity','recovery'].includes(get(row,'kind')),'invalid cue kind '+key);
  if(get(row,'kind')==='warning')warningCount++;
  if(get(row,'kind')==='resolve'){
   resolveCount++;
   assert(group.some(prev=>Number(get(prev,'cue_order'))<Number(get(row,'cue_order'))&&get(prev,'kind')==='warning'),
    'resolve without prior visible warning '+key);
  }
 }
}
assert.equal(used.size,36);
console.log(JSON.stringify({testOnly:true,cues:entries.length,phases:9,bosses:3,warnings:warningCount,resolves:resolveCount,valid:true}));
