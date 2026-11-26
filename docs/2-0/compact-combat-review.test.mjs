/** Isolated real-engine compact unit sensitivity.
 * Uses launchPlayer authored legacy ability kits, not compiled 2.0 specs,
 * verified Forge receipts, or V2 enemy authority. No gameplay imports.
 * Run after backend build: node --test docs/2-0/compact-combat-review.test.mjs
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {compactClassProfiles,compactFullStats} from './compact-class-stat-review.test.mjs';
import {choose,sum} from './compact-forge-budget-review.test.mjs';
const require=createRequire(import.meta.url);
const {simulateCombat}=require('../../backend/dist/server/combat/engine.js');
const {launchPlayer}=require('../../backend/dist/server/combat/content/launch-combat.js');
const {defenseMitigation,damageAfterMitigation,healAmount,shieldAmount}=require('../../backend/dist/server/combat/calculations.js');
const names={BASTION:'Bastion',IRONWARDEN:'Ironwarden',DREADGUARD:'Dreadguard',RAVAGER:'Ravager',KNIFE_DANCER:'Knife Dancer',HEXWEAVER:'Hexweaver',WAYFINDER:'Wayfinder',DAWNKEEPER:'Dawnkeeper',STONECALLER:'Stonecaller'};
const bands=[{level:25,tier:2},{level:40,tier:3},{level:60,tier:4}];
const parties=[
 ['BASTION','RAVAGER','HEXWEAVER','DAWNKEEPER'],
 ['BASTION','KNIFE_DANCER','WAYFINDER','STONECALLER'],
 ['IRONWARDEN','RAVAGER','WAYFINDER','DAWNKEEPER'],
 ['IRONWARDEN','HEXWEAVER','KNIFE_DANCER','STONECALLER'],
 ['DREADGUARD','RAVAGER','KNIFE_DANCER','DAWNKEEPER'],
 ['DREADGUARD','HEXWEAVER','WAYFINDER','STONECALLER'],
];
const rosters=[...compactClassProfiles.map(p=>[p.id]),...parties];
const pressure=[{id:'moderate',attack:.24},{id:'heavy',attack:.38}];
const arms=[{id:'unchanged',constant:()=>1200},{id:'low',constant:l=>(30+2*l)*.75},{id:'middle',constant:l=>30+2*l},{id:'high',constant:l=>(30+2*l)*1.5}];
const clone=x=>structuredClone(x);
function actor(id,band){
 const p=compactClassProfiles.find(p=>p.id===id);
 const s=compactFullStats(id,band.level),g=sum(choose(p,band.tier),'common',50,true);
 const a=launchPlayer(names[id],band.level);
 return {...a,stats:{...s,maxHp:s.maxHp+g.hp,attackPower:s.attackPower+g.attack,defense:s.defense+g.defense,healingPower:s.healingPower+g.healingPower}};
}
function enemy(band,size,p){
 // Fixed per level and roster size, NEVER scaled to the selected build.
 // Synthetic pressure boss, not final authored regional enemy balance.
 return {id:'QA_COMPACT_PRESSURE',name:'Compact pressure fixture',team:'enemies',role:'enemy',boss:true,level:band.level,
  stats:{maxHp:band.tier*300*size,attackPower:(70+band.level*4)*p.attack,defense:10+band.tier*15,healingPower:0,accuracy:800,evasion:140,critChance:.05,critMultiplier:1.5,haste:0},
  basicAttackMs:2400,basicAttackCoeff:.8,abilities:[
   {id:'QA_STRIKE',name:'Pressure strike',cooldownMs:9000,castTimeMs:1000,priority:90,target:'current_target',interruptible:true,effects:[{kind:'damage',coeff:1.25}]},
   {id:'QA_WAVE',name:'Pressure wave',cooldownMs:14000,castTimeMs:1300,priority:80,target:'all_enemies',interruptible:true,effects:[{kind:'damage',coeff:.45}]},
  ],phases:[{id:'QA_PHASE',hpPct:.5,target:'self',effects:[{kind:'shield',flat:Math.round(band.tier*300*size*.04)}]}]};
}
function metrics(r){
 const ids=new Set(r.players.map(p=>p.definition.id));
 const sumPlayer=key=>r.players.reduce((n,p)=>n+p[key],0);
 const total=(kind)=>r.events.filter(e=>e.type===kind&&ids.has(e.actorId)).reduce((n,e)=>n+(e.amount??0),0);
 return {victory:Number(r.victory),duration:r.durationMs,alive:r.players.filter(p=>p.alive).length,
  hp:r.players.reduce((n,p)=>n+p.hp/p.definition.stats.maxHp,0)/r.players.length,
  enemyHp:r.enemies[0].hp/r.enemies[0].definition.stats.maxHp,
  damage:sumPlayer('damageDone'),healing:sumPlayer('healingDone'),taken:sumPlayer('damageTaken'),
  shield:total('shield'),interrupts:sumPlayer('interrupts'),
  downs:r.events.filter(e=>e.type==='down'&&ids.has(e.targetId??e.actorId)).length};
}
function verify(r){
 assert.ok(r.durationMs>=0&&r.durationMs<=60000);
 for(const p of [...r.players,...r.enemies]){
  assert.ok(Number.isFinite(p.hp)&&p.hp>=0&&p.hp<=p.definition.stats.maxHp+1e-8);
  assert.ok(Number.isFinite(p.shield)&&p.shield>=0);
  for(const k of ['damageDone','healingDone','damageTaken'])assert.ok(Number.isFinite(p[k])&&p[k]>=0);
 }
 for(const e of r.events)if(e.amount!==undefined)assert.ok(Number.isFinite(e.amount));
}
test('real mitigation formula: compact defense must use compact constant, not legacy 1200',()=>{
 for(const b of bands){
  const k=arms[2].constant(b.level);
  const a=compactClassProfiles.map(p=>actor(p.id,b));
  for(const tank of a.filter(x=>x.role==='tank'))for(const d of a.filter(x=>x.role==='damage')){
   assert.ok(defenseMitigation(tank.stats.defense,k)>defenseMitigation(d.stats.defense,k));
  }
  assert.ok(defenseMitigation(a[0].stats.defense,k)>defenseMitigation(a[0].stats.defense,1200));
  assert.ok(defenseMitigation(a[0].stats.defense,k)<=.75);
 }
 const k=80;
 assert.ok(Math.abs(defenseMitigation(124.45,k)-124.45/(124.45+k))<1e-9);
 assert.equal(healAmount(48.42,1.25),48.42*1.25);
 assert.equal(shieldAmount(41.42,1.1),41.42*1.1);
 // A uniform 20x unit change preserves mitigation but not the absolute damage floor.
 assert.equal(defenseMitigation(100,80),defenseMitigation(2000,1600));
 assert.equal(damageAfterMitigation(.1,1,0,1),1);
 assert.ok(damageAfterMitigation(2,1,0,1)/20<1);
});
test('720 real-engine sensitivity encounters: three tiers, nine solo classes, six parties, two pressures and seeds',()=>{
 const rows=[];
 for(const band of bands)for(const ids of rosters)for(const p of pressure)for(const seedIndex of [0,1]){
  const players=ids.map(id=>actor(id,band));
  const enemies=[enemy(band,ids.length,p)];
  const seed=['QA_COMPACT',band.level,ids.join('_'),p.id,seedIndex].join(':');
  const frozen=JSON.stringify({players,enemies});
  for(const arm of arms){
   const input={seed,players:clone(players),enemies:clone(enemies),maxDurationMs:60000,mitigationConstant:arm.constant(band.level),accuracyScale:1400};
   const snapshot=JSON.stringify(input);
   const result=simulateCombat(input);
   verify(result);
   assert.equal(JSON.stringify(input),snapshot);
   // Replay one seed per pressure/tier/roster/arm; full result including trace.
   if(seedIndex===0)assert.deepEqual(simulateCombat(clone(input)),result);
   rows.push({level:band.level,roster:ids.join('/'),size:ids.length,pressure:p.id,seedIndex,arm:arm.id,...metrics(result)});
  }
  assert.equal(JSON.stringify({players,enemies}),frozen);
 }
 assert.equal(rows.length,720);
 for(const arm of arms){
  for(const size of [1,4]){
   const group=rows.filter(r=>r.arm===arm.id&&r.size===size);
   const mean=k=>group.reduce((n,r)=>n+r[k],0)/group.length;
   console.log('COMPACT_ENGINE_SUMMARY',JSON.stringify({arm:arm.id,size,cases:group.length,victories:group.reduce((n,r)=>n+r.victory,0),meanHp:mean('hp'),meanDamage:mean('damage'),meanTaken:mean('taken'),meanHealing:mean('healing'),meanShield:mean('shield'),meanDuration:mean('duration'),downs:group.reduce((n,r)=>n+r.downs,0)}));
  }
 }
 // This is a sensitivity report, not a balance acceptance gate.
});
test('historical launch kits: actual engine matched scale diagnostic, not equivalence claim',()=>{
 for(const id of Object.keys(names)){
  const original=launchPlayer(names[id],25);
  const foe=enemy(bands[0],1,pressure[0]);
  const large={seed:'QA_HISTORIC:'+id,players:[original],enemies:[{...foe,stats:{...foe.stats,maxHp:foe.stats.maxHp*20,attackPower:foe.stats.attackPower*20,defense:foe.stats.defense*20},phases:foe.phases.map(p=>({...p,effects:p.effects.map(e=>({...e,flat:e.flat*20}))}))}],maxDurationMs:60000,mitigationConstant:1200,accuracyScale:1400};
  const small=clone(large);
  small.mitigationConstant=60;
  for(const a of [...small.players,...small.enemies]){
   for(const k of ['maxHp','attackPower','healingPower','defense'])a.stats[k]/=20;
   for(const p of a.phases??[])for(const e of p.effects)if(e.flat!==undefined)e.flat/=20;
   for(const ab of a.abilities)for(const e of ab.effects)if(e.flat!==undefined)e.flat/=20;
  }
  const a=simulateCombat(clone(large)),b=simulateCombat(clone(small));
  verify(a);verify(b);
  console.log('COMPACT_UNIT_PROBE',JSON.stringify({id,large:metrics(a),scaled:metrics(b)}));
 }
});
