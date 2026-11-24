import {strict as assert} from 'node:assert';
import {modifier,threatenedAlly,memoizeCombatQuery} from '../../combat-state-query';
import type {CombatantState} from '../../types';

// Prior implementation, deliberately retained only as a reference for parity.
function referenceThreat(allies:CombatantState[],enemies:CombatantState[]){
 const liveAllies=new Map(allies.filter(a=>a.alive).map(a=>[a.definition.id,a]));
 return enemies.filter(e=>e.alive).flatMap(enemy=>{
  if(!enemy.casting)return[];
  const ability=enemy.definition.abilities.find(a=>a.id===enemy.casting!.abilityId);
  if(!ability||ability.target==='all_enemies'||ability.target==='all_allies'||ability.target==='self')return[];
  const target=liveAllies.get(enemy.casting.targetId);if(!target)return[];
  if(!ability.effects.some(e=>e.kind==='damage'||e.kind==='dot'))return[];
  return [{enemy,target,completesAt:enemy.casting.completesAt}];
 }).sort((a,b)=>a.completesAt-b.completesAt||Number(Boolean(b.enemy.definition.boss))-Number(Boolean(a.enemy.definition.boss))||a.enemy.definition.id.localeCompare(b.enemy.definition.id))[0]?.target;
}
// These are read-only query fixtures, not valid persisted combat actors.
const fixture=(data:unknown)=>data as CombatantState;
let seed=20261124;
const rnd=(k:number)=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return (seed>>>8)%k;};
for(let i=0;i<1000;i++){
 const now=rnd(5);
 const state=fixture({modifiers:Array.from({length:rnd(20)},()=>({tag:['x','y'][rnd(2)],expiresAt:rnd(10),value:(rnd(200)-100)/17}))});
 for(const tag of ['x','y','z'])
  assert.equal(modifier(state,tag,now),state.modifiers.filter(m=>m.tag===tag&&m.expiresAt>now).reduce((s,m)=>s+m.value,0));
 const allies=Array.from({length:4},(_,j)=>fixture({alive:rnd(4)!==0,definition:{id:'a'+j}}));
 const foes=Array.from({length:rnd(12)},()=>fixture({
  alive:rnd(4)!==0,definition:{id:'e'+rnd(5),boss:rnd(2)===1,
   abilities:[{id:'cast',target:['current_target','all_enemies','self','random_enemy'][rnd(4)],
    effects:[{kind:['damage','dot','heal'][rnd(3)]}]}]},
  casting:rnd(4)?{abilityId:rnd(5)?'cast':'missing',targetId:'a'+rnd(5),completesAt:rnd(4)}:undefined,
 }));
 assert.equal(threatenedAlly(allies,foes),referenceThreat(allies,foes));
}
let calls=0;
const make=()=>memoizeCombatQuery((k:number)=>{calls++;return k===1?undefined:k===2?false:k;});
const first=make();
for(let i=0;i<20;i++){assert.equal(first(1),undefined);assert.equal(first(2),false);assert.equal(first(3),3);}
assert.equal(calls,3,'60 requests, three computations including undefined and false');
const nextActor=make();
assert.equal(nextActor(1),undefined);
assert.equal(calls,4,'A later actor must use a fresh decision scope');
console.log('PASS: 4000 query parity checks and decision-scope memoization');
