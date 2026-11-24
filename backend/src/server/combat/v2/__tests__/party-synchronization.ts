import {strict as assert} from 'node:assert';
import {CLASS_ROLES_V2,type ClassIdV2} from '../build-contract';
import {listPartySynchronizationsV2,planPartySynchronizationV2,type SyncModeV2} from '../party-synchronization';
const classes=Object.keys(CLASS_ROLES_V2) as ClassIdV2[];
const roster=(...ids:ClassIdV2[])=>ids.map((classId,i)=>({characterId:'qa_'+i,classId}));
const catalog=listPartySynchronizationsV2();
assert.equal(catalog.length,18);
assert.equal(new Set(catalog.map(p=>p.id)).size,18);
assert.equal(new Set(catalog.map(p=>[...p.classes].sort().join(':'))).size,18);
for(const c of classes)assert.equal(catalog.filter(p=>p.classes.includes(c)).length,4,c);
const radiant=planPartySynchronizationV2('dungeon',roster('BASTION','DAWNKEEPER'));
assert.equal(radiant.active[0].id,'radiant_covenant');
assert.deepEqual(radiant.totalsBps,{healing_received_pct:500,shield_strength_pct:400,damage_reduction_pct:300});
const umbral=planPartySynchronizationV2('dungeon',roster('DREADGUARD','HEXWEAVER'));
assert.deepEqual(umbral.totalsBps,{dot_strength_pct:500,lifesteal_strength_pct:400,damage_vs_debuffed_pct:300});
const duplicated=planPartySynchronizationV2('party_event',roster('BASTION','DAWNKEEPER','BASTION','DAWNKEEPER'));
assert.equal(duplicated.active.length,1);
assert.deepEqual(duplicated.totalsBps,radiant.totalsBps);
assert.equal(duplicated.recipientIds.length,4);
for(const mode of ['dungeon','party_contract','party_event','guild_pve'] as const){
 assert.deepEqual(planPartySynchronizationV2(mode,roster('BASTION','DAWNKEEPER')).totalsBps,radiant.totalsBps);
}
for(const mode of ['solo','individual_world_boss'] as const){
 assert.equal(planPartySynchronizationV2(mode,roster('BASTION')).active.length,0);
 assert.throws(()=>planPartySynchronizationV2(mode,roster('BASTION','DAWNKEEPER')),/invalid_solo_roster/);
}
assert.deepEqual(planPartySynchronizationV2('party_event',roster('BASTION','DREADGUARD')).totalsBps,{});
assert.throws(()=>planPartySynchronizationV2('bogus' as SyncModeV2,[]),/invalid_scope/);
assert.throws(()=>planPartySynchronizationV2('dungeon',roster('BASTION','BASTION','BASTION','BASTION','BASTION')),/invalid_scope/);
assert.throws(()=>planPartySynchronizationV2('dungeon',[{characterId:'same',classId:'BASTION'},{characterId:'same',classId:'DAWNKEEPER'}]),/invalid_participant/);
assert.throws(()=>planPartySynchronizationV2('dungeon',[{characterId:'x',classId:'toString' as ClassIdV2}]),/invalid_participant/);
assert.throws(()=>planPartySynchronizationV2('dungeon',[{characterId:'',classId:'BASTION'}]),/invalid_participant/);
const expectedScales=[0,100,100,80,65,55,50];
const tanks=classes.filter(c=>CLASS_ROLES_V2[c]==='tank');
const dps=classes.filter(c=>CLASS_ROLES_V2[c]==='damage');
const supports=classes.filter(c=>CLASS_ROLES_V2[c]==='support');
let dungeonCount=0,flexCount=0;const histogram:Record<number,number>={};
function check(ids:ClassIdV2[]){
 const input=roster(...ids),original=JSON.stringify(input);
 const plan=planPartySynchronizationV2('party_event',input);
 assert.equal(plan.releaseEnabled,false);
 assert.equal(plan.canAuthorizeCombat,false);
 assert.equal(plan.scalePercent,expectedScales[plan.active.length]);
 assert.deepEqual(plan,planPartySynchronizationV2('party_event',[...input].reverse()));
 assert.equal(JSON.stringify(input),original);
 assert.equal(plan.recipientIds.length,plan.active.length?input.length:0);
 for(const p of plan.active)for(const [stat,bps] of p.bonuses){
  const base=catalog.find(c=>c.id===p.id)!.bonuses.find(([k])=>k===stat)![1];
  assert.equal(bps,Math.floor(base*plan.scalePercent/100));
 }
 for(const [stat,bps] of Object.entries(plan.totalsBps))
  assert.ok(Number.isInteger(bps)&&bps>=0&&bps<=(stat==='crit_chance_pp'?400:stat==='damage_reduction_pct'?600:1000));
 return plan;
}
for(const t of tanks)for(const s of supports)for(let i=0;i<dps.length;i++)for(let j=i+1;j<dps.length;j++){
 const p=check([t,dps[i],dps[j],s]);dungeonCount++;
 histogram[p.active.length]=(histogram[p.active.length]??0)+1;
}
for(let i=0;i<classes.length;i++)for(let j=i;j<classes.length;j++)for(let k=j;k<classes.length;k++)for(let l=k;l<classes.length;l++){
 check([classes[i],classes[j],classes[k],classes[l]]);flexCount++;
}
assert.equal(dungeonCount,36);
assert.equal(flexCount,495);
const three=planPartySynchronizationV2('dungeon',roster('IRONWARDEN','WAYFINDER','HEXWEAVER','STONECALLER'));
assert.equal(three.active.length,3);
assert.equal(three.scalePercent,80);
assert.equal(three.totalsBps.accuracy_pct,560);
console.log(JSON.stringify({dungeonCount,flexCount,histogram,authority:'review-only'}));
