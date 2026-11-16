// Veldryn Guild PvE V6 — theoretical participation and supply feasibility.
// TEST ONLY: no game engine, database, live balance, rewards or releases.
// node tools/guild-pve-budget-v6.mjs --effort | --supply | --allocation
const S=[1,2,3,4,8,12,20], P=[.5,.65,.7,.75,.9], T=[["Scout",.58,.38,1],["Veteran",.68,.50,1.25],["Mythic",.78,.62,1.5]];
const K=[["assault_only",1],["balanced",.9],["defensive",.82]], G=[["underprepared",.8],["reference",1],["prepared",1.2]], Q=[4,6,8];
const N=[["C1-04",.09],["C1-06",.17],["C2-01",.10],["C2-05",.10],["C2-06",.18],["C3-01",.10],["C3-06",.26]];
const rnd=n=>Number(n.toFixed(3));
const csv=s=>'"'+String(s).replaceAll('"','""')+'"';
const print=(h,r)=>console.log([h,...r].map(a=>a.map(csv).join(",")).join("\n"));
function effort(){
 const r=[];for(const n of S)for(const p of P)for(const seals of Q)for(const [mix,mc] of K)for(const [gear,gc] of G)for(const [tier,v3,trial] of T){
  const low=Math.max(1,Math.floor(n*p)),hi=Math.min(n,Math.max(1,Math.ceil(n*p)));
  const measure=count=>{const total=count*seals,optional=Math.ceil(total*.1);return [total,optional,rnd((total-optional)*mc*gc)]};
  const [ln,lo,le]=measure(low),[hn,ho,he]=measure(hi);
  const v=Math.ceil(Math.max(4,n)*8*v3),t=Math.ceil(Math.max(4,n)*8*trial);
  r.push([n,p,tier,seals,mix,gear,low,hi,ln,lo,le,hn,ho,he,v,t,+(le>=v),+(he>=v),+(le>=t),+(he>=t)]);
 }return r;
}
function supply(){
 const r=[];for(const n of S)for(const [tier,,,mult] of T){
  const scale=Math.max(4,n),goal=40*scale*mult,per=60*mult,possible=per*n;
  r.push([n,tier,scale,goal,per,possible,rnd(100*Math.min(goal,possible)/goal),Math.ceil(goal*.5/per),Math.ceil(goal/per),+(possible>=goal*.5),+(possible>=goal)]);
 }return r;
}
function alloc(x){
 if(x<7)throw Error("budget below 7 required nodes");
 const rem=x-7,m=N.map(([name,weight],i)=>({i,n:Math.floor(rem*weight),fraction:rem*weight-Math.floor(rem*weight)}));
 const left=rem-m.reduce((s,v)=>s+v.n,0);
 for(const row of [...m].sort((a,b)=>b.fraction-a.fraction||a.i-b.i).slice(0,left))row.n++;
 const out=m.map(v=>v.n+1);
 if(out.reduce((a,b)=>a+b,0)!==x)throw Error("allocation not conserved");
 return out;
}
function allocation(){
 const r=[];for(const n of S)for(const [tier,v3,trial] of T){
  const v=Math.ceil(8*Math.max(4,n)*v3),t=Math.ceil(8*Math.max(4,n)*trial);
  r.push([n,tier,v,t,...alloc(v),...alloc(t)]);
 }return r;
}
const E=effort(),U=supply(),A=allocation();
if(E.length!==2835||U.length!==21||A.length!==21||Math.abs(N.reduce((s,r)=>s+r[1],0)-1)>1e-10)throw Error("invariants");
const mode=process.argv[2]||"--summary";
if(mode==="--effort")print(["roster","attendance_fraction","tier","seals_per_participant","stance_mix","gear_sensitivity","participants_floor","participants_ceil","nominal_seals_floor","optional_seals_floor","effective_effort_floor","nominal_seals_ceil","optional_seals_ceil","effective_effort_ceil","v3_effort_target","v6_trial_target","v3_floor_clear","v3_ceil_clear","v6_floor_clear","v6_ceil_clear"],E);
else if(mode==="--supply")print(["roster","tier","scaling_count","chapter_supply_points","per_account_chapter_cap","max_possible_points","max_completion_pct","needed_contributors_50pct","needed_contributors_100pct","50pct_reachable","100pct_reachable"],U);
else if(mode==="--allocation")print(["roster","tier","v3_effort_target","v6_trial_target",...N.map(x=>"v3_"+x[0]),...N.map(x=>"v6_"+x[0])],A);
else if(mode==="--summary")console.log(JSON.stringify({testOnly:true,realCombat:false,effortRows:E.length,supplyRows:U.length,allocationRows:A.length,scout20:E.find(r=>r[0]===20&&r[1]===.7&&r[2]==="Scout"&&r[3]===6&&r[4]==="balanced"&&r[5]==="reference"),supplySmall:U.filter(r=>r[0]<=3&&r[1]==="Scout")},null,2));
else throw Error("unknown mode "+mode);
