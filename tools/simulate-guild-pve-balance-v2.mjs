/** Run after compiling apps/mobile/tsconfig.core.json into .core-build. Synthetic activity, real combat previews. */
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),require=createRequire(import.meta.url),core=path.join(root,'apps/mobile/.core-build/apps/mobile/src');
const {regionalCombatFixture,REGIONAL_COMBAT_FIXTURES}=require(path.join(core,'core/regional-combat-fixtures.js'));
const {startCombat,previewActivityReward,effectiveStats}=require(path.join(core,'core/game.js'));
const {guildPveBalance,GUILD_PVE_DAMAGE_PER_MINUTE}=require(path.join(core,'core/guild-pve-encounters.js'));
const baseline=JSON.parse(readFileSync(path.join(root,'artifacts/guild-pve-balance/results.json'),'utf8'));
const defs=[{regionId:'IRONWOOD',regionName:'Ironwood Forest',monsterId:'THORNLING',level:10,tier:'T2',foodId:'ROASTED_ROOTSTREAM_TROUT'},...REGIONAL_COMBAT_FIXTURES.filter(x=>[25,40,66,88].includes(x.level))],at=Date.UTC(2026,9,5),profiles=[];
for(const def of defs)for(const cls of ['IRONWARDEN','WAYFINDER','DAWNKEEPER'])for(const prep of ['prepared','underprepared']){
 const s=regionalCombatFixture(def,prep,cls);s.character.level=Math.max(10,s.character.level);s.character.id=`sim-${def.level}-${cls}-${prep}`;s.character.currentHp=effectiveStats(s).hp;s.inventory.stacks=[{itemId:def.foodId,quantity:2000}];const h=startCombat(s,def.monsterId,at);
 const sessions={};for(const minutes of [5,15,60,240]){const r=previewActivityReward(h,at+minutes*60000);if(!r.combatEffort)throw Error('Rebuild the core before running this simulation');sessions[minutes]={kills:r.kills,points:Math.floor((r.combatEffort.endsAtMs-r.combatEffort.startsAtMs)/60000*GUILD_PVE_DAMAGE_PER_MINUTE)};}
 profiles.push({level:def.level,cls,prep,sessions});
}
let seed=19471;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const median=a=>a.length?[...a].sort((x,y)=>x-y)[Math.floor(a.length/2)]:null,average=a=>a.reduce((x,y)=>x+y,0)/a.length,round=n=>n===null?null:+n.toFixed(2),runs=3000,results=[];
for(const days of [7,14])for(const spec of baseline.results.filter(r=>r.encounterDays===7)){
 const pool=profiles.filter(p=>spec.levels.includes(p.level)&&p.prep===(spec.preparation??'prepared')),balance=guildPveBalance(spec.size,days);
 const variants=[{hp:500000,cap:50000,daily:Infinity},{hp:balance.maxHp,cap:balance.personalCap,daily:6000}];
 const totals=variants.map(()=>({progress:[],finish:[],eligible:[],day1:0,clear:0,milestone25:0,milestone50:0}));
 for(let trial=0;trial<runs;trial++){
  const events=[];
  for(let member=0;member<spec.size;member++){const profile=pool[Math.floor(random()*pool.length)];if(random()>spec.active)continue;for(let day=0;day<days;day++)if(random()<spec.days)events.push({member,day,time:day+random(),...profile.sessions[spec.minutes]});}
  events.sort((x,y)=>x.time-y.time);
  variants.forEach((v,version)=>{const own=Array(spec.size).fill(0);let total=0,finish=null;
   for(const e of events){const amount=Math.max(0,Math.min(version===0?e.kills*1000:e.points,v.daily,v.cap-own[e.member],version===0?v.hp-total:Infinity));own[e.member]+=amount;total=Math.min(v.hp,total+amount);if(total===v.hp&&finish===null)finish=e.time;}
   const r=totals[version];r.progress.push(total/v.hp*100);r.eligible.push(own.filter(x=>x>=1000).length);if(total>=v.hp*.25)r.milestone25++;if(total>=v.hp*.5)r.milestone50++;if(finish!==null){r.clear++;r.finish.push(finish);if(finish<1)r.day1++;}
  });
 }
 results.push({scenario:spec.name,guildLevel:spec.guildLevel,size:spec.size,playerLevels:spec.levels,activeFraction:spec.active,dayProbability:spec.days,combatMinutes:spec.minutes,days,balance,variants:totals.map((r,i)=>({version:i+1,clearPercent:round(r.clear/runs*100),dayOnePercent:round(r.day1/runs*100),medianProgress:round(median(r.progress)),medianFinishDay:round(median(r.finish)===null?null:1+median(r.finish)),meanEligible:round(average(r.eligible)),milestone25Percent:round(r.milestone25/runs*100),milestone50Percent:round(r.milestone50/runs*100)}))});
}
const out=path.join(root,'artifacts/guild-pve-balance-v2');mkdirSync(out,{recursive:true});
writeFileSync(path.join(out,'results.json'),JSON.stringify({seed:19471,runs,totalGuildSchedules:results.length*runs,modelComparisons:results.length*runs*2,assumptions:baseline.assumptions.filter(x=>!x.startsWith('14-day')),profiles,results},null,2));
const rows=results.filter(r=>r.days===7).map(r=>'<tr><td>'+r.scenario+'</td><td>'+r.size+'</td><td>'+r.variants[0].clearPercent+'%</td><td>'+r.variants[1].clearPercent+'%</td><td>'+r.variants[1].medianProgress+'%</td><td>'+(r.variants[1].medianFinishDay??'—')+'</td><td>'+r.variants[1].meanEligible+'</td></tr>').join('');
writeFileSync(path.join(out,'report.html'),`<!doctype html><html><meta charset="utf-8"><title>Guild PvE revised balance</title><style>body{max-width:1100px;margin:30px auto;padding:20px;background:#10151e;color:#e4eaf2;font:16px system-ui}h1,h2,th{color:#e6be77}table{border-collapse:collapse;width:100%;font-size:14px}td,th{padding:12px;border-bottom:1px solid #354253;text-align:left}li{margin:8px 0}</style><h1>Guild PvE revised balance</h1><p>72,000 guild schedules, comparing old and revised rules on the same sessions (144,000 model evaluations). Synthetic sensitivity study, not observed player behavior.</p><h2>Weekly results</h2><table><tr><th>Scenario</th><th>Members</th><th>Old clear rate</th><th>New clear rate</th><th>New median progress</th><th>New clear day*</th><th>Eligible members</th></tr>${rows}</table><p>*Among successful encounters only. Day 1 begins at reset. Offline time counts as combat runtime.</p><h2>Implemented rules</h2><ul><li>Fixed roster bracket: 5, 8, 12, 16 or 20; 15,000 HP per bracket member for a weekly encounter.</li><li>200 contribution per minute of actual combat; time after injury is excluded.</li><li>6,000 contribution per earned UTC day; 30,000 per week-long encounter. Longer event totals scale with duration.</li><li>Starting roster members may qualify after defeat; earlier earned offline time can be collected during the claim window.</li><li>Light-combat guilds primarily earn partial milestones. The 3–5 day target applies to active guilds, not every activity profile.</li></ul><h2>Model assumptions</h2><ul>${baseline.assumptions.filter(x=>!x.startsWith('14-day')).map(x=>'<li>'+x+'</li>').join('')}</ul></html>`);
console.table(results.filter(r=>r.days===7).map(r=>({scenario:r.scenario,old:r.variants[0].clearPercent,new:r.variants[1].clearPercent,progress:r.variants[1].medianProgress,day:r.variants[1].medianFinishDay,eligible:r.variants[1].meanEligible})));
