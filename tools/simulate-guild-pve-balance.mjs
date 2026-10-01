/** Deterministic sensitivity study, not player telemetry. Runs the real combat preview against repository fixtures. */
import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),app=path.join(root,'apps/mobile');
const build=spawnSync(process.execPath,[path.join(app,'node_modules/typescript/lib/tsc.js'),'-p','tsconfig.core.json','--outDir','.core-build'],{cwd:app,stdio:'inherit'});if(build.status!==0)process.exit(build.status??1);
const require=createRequire(import.meta.url),core=path.join(app,'.core-build/apps/mobile/src');
const {regionalCombatFixture,REGIONAL_COMBAT_FIXTURES}=require(path.join(core,'core/regional-combat-fixtures.js'));
const {startCombat,previewActivityReward,effectiveStats}=require(path.join(core,'core/game.js'));
// This script intentionally models the original v1 migration for historical comparison.
const sql=readFileSync(path.join(root,'backend/supabase/migrations/20261001055514_guild_pve_encounters_v1.sql'),'utf8');
if(!sql.includes('default 500000')||!sql.includes('*1000*v_fraction'))throw Error('Guild balance changed; update simulation constants.');
const now=Date.UTC(2026,9,5),defs=[{regionId:'IRONWOOD',regionName:'Ironwood Forest',monsterId:'THORNLING',level:10,tier:'T2',foodId:'ROASTED_ROOTSTREAM_TROUT'},...REGIONAL_COMBAT_FIXTURES.filter(x=>[25,40,66,88].includes(x.level))];
const minutes=[5,15,60,240,480],profiles=[];
for(const def of defs)for(const cls of ['IRONWARDEN','WAYFINDER','DAWNKEEPER'])for(const prep of ['prepared','underprepared']){
 const state=regionalCombatFixture(def,prep,cls);state.character.level=Math.max(10,state.character.level);state.character.id=`sim-${def.level}-${cls}-${prep}`;state.character.currentHp=effectiveStats(state).hp;state.inventory.stacks=[{itemId:def.foodId,quantity:2000}];
 const hunt=startCombat(state,def.monsterId,now);
 const count=mins=>previewActivityReward(hunt,now+Math.round(mins*60000)).kills;
 let low=0,high=480;const reachable=count(high)>=50;
 if(reachable)for(let i=0;i<17;i++){const mid=(low+high)/2;if(count(mid)>=50)high=mid;else low=mid;}
 const empty=structuredClone(hunt);empty.inventory.stacks=[];
 profiles.push({level:state.character.level,nominalLevel:def.level,classId:cls,preparation:prep,monster:def.monsterId,kills:Object.fromEntries(minutes.map(m=>[m,count(m)])),capMinutes:reachable?+high.toFixed(2):null,noFoodKills:previewActivityReward(empty,now+3600000).kills});
}
// Separate low-level farming check at every progression band.
const farm=defs.map(def=>{const s=regionalCombatFixture(def,'prepared','IRONWARDEN');s.currentRegionId='GREENFIELDS';s.unlockedMonsterIds.push('MOSS_RAT');s.character.currentHp=effectiveStats(s).hp;s.inventory.stacks=[{itemId:s.character.equippedFoodId,quantity:2000}];const h=startCombat(s,'MOSS_RAT',now);let l=0,r=480;for(let i=0;i<17;i++){const m=(l+r)/2;if(previewActivityReward(h,now+m*60000).kills>=50)r=m;else l=m;}return {level:def.level,capMinutes:+r.toFixed(2)};});
let seed=19471;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
const scenarios=[
 {name:'Small dedicated',guildLevel:1,size:5,levels:[10],active:1,days:1,minutes:240},
 {name:'Growing dedicated',guildLevel:1,size:8,levels:[25],active:1,days:1,minutes:240},
 {name:'Ten reliable members',guildLevel:1,size:10,levels:[10,25],active:1,days:1,minutes:60},
 {name:'Full new guild, casual',guildLevel:1,size:12,levels:[10],active:.8,days:.45,minutes:15},
 {name:'Full new guild, daily',guildLevel:1,size:12,levels:[10],active:1,days:1,minutes:60},
 {name:'Growing guild, mixed',guildLevel:4,size:16,levels:[10,25,40],active:.7,days:.55,minutes:60},
 {name:'Mature guild, mostly inactive',guildLevel:10,size:20,levels:[40,66,88],active:.4,days:.4,minutes:60},
 {name:'Mature guild, casual',guildLevel:10,size:20,levels:[25,40,66],active:.65,days:.45,minutes:15},
 {name:'Mature guild, very light play',guildLevel:10,size:20,levels:[25,40,66],active:.8,days:.45,minutes:5},
 {name:'Mature guild, active',guildLevel:10,size:20,levels:[40,66,88],active:.9,days:.85,minutes:240},
 {name:'Full new guild, underprepared',guildLevel:1,size:12,levels:[10],active:1,days:1,minutes:60,preparation:'underprepared'},
 {name:'Endgame guild, daily',guildLevel:10,size:20,levels:[88],active:1,days:1,minutes:60},
];
const iterations=3000,results=[];
const quantile=(arr,p)=>arr.length?[...arr].sort((a,b)=>a-b)[Math.floor((arr.length-1)*p)]:null;
for(const days of [7,14])for(const spec of scenarios){
 const progress=[],finish=[],eligible=[],potential=[],reach=[0,0,0];let firstDay=0;
 const pool=profiles.filter(p=>spec.levels.includes(p.nominalLevel)&&p.preparation===(spec.preparation??'prepared'));
 for(let trial=0;trial<iterations;trial++){
  const events=[],own=Array(spec.size).fill(0),potentialSet=new Set();
  for(let member=0;member<spec.size;member++){
   const profile=pool[Math.floor(rand()*pool.length)];if(rand()>spec.active)continue;
   for(let day=0;day<days;day++)if(rand()<spec.days){const kills=profile.kills[spec.minutes];if(kills>0)potentialSet.add(member);events.push({at:day+rand(),member,kills});}
  }
  events.sort((a,b)=>a.at-b.at);let total=0,finished=null;
  for(const e of events){const credit=Math.max(0,Math.min(e.kills*1000,50000-own[e.member],500000-total));own[e.member]+=credit;total+=credit;if(total===500000&&finished===null)finished=e.at;}
  const pct=total/5000;progress.push(pct);eligible.push(own.filter(d=>d>=1000).length);potential.push(potentialSet.size);[25,50,100].forEach((v,i)=>{if(pct>=v)reach[i]++});if(finished!==null){finish.push(finished);if(finished<1)firstDay++;}
 }
 const avg=a=>a.reduce((x,y)=>x+y,0)/a.length,round=x=>x===null?null:+x.toFixed(2);
 results.push({...spec,encounterDays:days,trials:iterations,medianProgress:quantile(progress,.5),p10Progress:quantile(progress,.1),p90Progress:quantile(progress,.9),clearPercent:round(reach[2]/iterations*100),dayOneClearPercent:round(firstDay/iterations*100),medianClearDay:round(quantile(finish,.5)===null?null:quantile(finish,.5)+1),milestone25Percent:round(reach[0]/iterations*100),milestone50Percent:round(reach[1]/iterations*100),meanEligible:round(avg(eligible)),meanPotential:round(avg(potential))});
}
const out=path.join(root,'artifacts/guild-pve-balance');mkdirSync(out,{recursive:true});
const report={seed:19471,iterations,totalTrials:results.length*iterations,assumptions:['Synthetic participation assumptions, not observed player behavior.','Real combat preview; three classes; fixed level/gear, no companions or permanent boosts; neutral opening wholly inside encounter.','Characters use repository QA fixture gear, not sampled player inventories; underprepared characters are clamped to guild eligibility level 10.',
'Prepared fixture gear/food from repository; 2,000 food and full HP per session. Gathering, crafting, food acquisition and recovery time excluded.','A member participates for the encounter with probability active, then collects one combat session on each day with probability days. Independent members/days; claims distributed uniformly within each day.','Session durations are combat runtime (including offline), not screen time. Fixed target and duration per scenario.','Guild level only determines plausible capacity; current guild PvE formula has no guild-level multiplier.','14-day event uses the same lifetime allowance and HP as weekly.','Simulation mirrors integer contribution/cap rules; SQL implementation covered separately by tools/test-guild-pve-db.mjs.'],profiles,farm,results};
writeFileSync(path.join(out,'results.json'),JSON.stringify(report,null,2));
const table=(heads,rows)=>'<table><thead><tr>'+heads.map(h=>'<th>'+h+'</th>').join('')+'</tr></thead><tbody>'+rows.map(r=>'<tr>'+r.map(c=>'<td>'+c+'</td>').join('')+'</tr>').join('')+'</tbody></table>';
const html='<!doctype html><html><meta charset="utf-8"><title>Guild PvE balance simulation</title><style>body{font:16px system-ui;background:#10151e;color:#e4eaf2;max-width:1200px;margin:32px auto;padding:20px}h1,h2{color:#e6be77}table{border-collapse:collapse;width:100%;font-size:14px;margin:20px 0}td,th{padding:10px;border-bottom:1px solid #354253;text-align:left}th{color:#e6be77}li{margin:8px 0}.wrap{overflow:auto}</style><h1>Guild PvE: initial balance simulation</h1><p>72,000 simulated guild encounters; 30 real combat fixtures. Seed 19471. Synthetic sensitivity study, not a forecast.</p><h2>Assessment</h2><p>The initial formula is not balanced: fewer than ten members cannot win; active full guilds clear too early; cheap kills outperform progression targets; members collecting after defeat cannot qualify for rewards.</p><p>Recommended next balance pass: freeze a size-based difficulty bracket at encounter opening, normalize contributions for combat effort/difficulty, target several days of ordinary play, and preserve a way for eligible members to qualify after defeat. These changes are proposals, not applied gameplay rules.</p><h2>Weekly encounters</h2><div class="wrap">'+table(['Guild scenario','Level / members','Combat per active day','Clear chance','Day-one clear','Median progress','Median clear day*','Eligible / participants'],results.filter(r=>r.encounterDays===7).map(r=>[r.name,r.guildLevel+' / '+r.size,r.minutes+' min',r.clearPercent+'%',r.dayOneClearPercent+'%',r.medianProgress+'%',r.medianClearDay??'—',r.meanEligible+' / '+r.meanPotential]))+'</div><h2>14-day event comparison</h2>'+table(['Scenario','Weekly clear','14-day event clear'],results.filter(r=>r.encounterDays===7).map(r=>[r.name,r.clearPercent+'%',results.find(e=>e.encounterDays===14&&e.name===r.name).clearPercent+'%']))+'<h2>Time to reach 50-kill personal cap</h2>'+table(['Player level','Class','Preparation','Target','Minutes to cap','Kills in 15 min','No-food kills in 1h'],profiles.map(p=>[p.level,p.classId,p.preparation,p.monster,p.capMinutes??'Not within 8h',p.kills[15],p.noFoodKills]))+'<h2>Low-level farming sensitivity</h2>'+table(['Player level','Moss Rat: minutes to cap'],farm.map(p=>[p.level,p.capMinutes]))+'<h2>Method and limitations</h2><ul>'+report.assumptions.map(x=>'<li>'+x+'</li>').join('')+'</ul><p>*Among successful encounters only; day 1 begins at reset. Higher progress does not imply all members qualified before the boss died.</p></html>';
writeFileSync(path.join(out,'report.html'),html);
console.log(JSON.stringify({profiles,farm,weekly:results.filter(r=>r.encounterDays===7),events:results.filter(r=>r.encounterDays===14).map(r=>({name:r.name,clear:r.clearPercent})),totalTrials:report.totalTrials},null,2));
