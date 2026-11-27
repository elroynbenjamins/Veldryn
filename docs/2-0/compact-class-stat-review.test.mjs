/**
 * Hidden 2.0 candidate only. Not a runtime profile, item conversion or CP policy.
 * User accepted compact numbers and natural level growth on 2026-11-26.
 * Level 25 anchors match the presented proposal exactly; all other anchors
 * are provisional. Run with node --test on this file.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

export const compactClassProfiles = Object.freeze([
  ['BASTION','tank',[136,12,16],[210,18,32]],
  ['IRONWARDEN','tank',[130,13,15],[200,20,29]],
  ['DREADGUARD','tank',[126,15,14],[190,25,25]],
  ['RAVAGER','damage',[108,19,8],[160,34,17]],
  ['KNIFE_DANCER','damage',[90,19,8],[130,33,12]],
  ['HEXWEAVER','damage',[92,18,9],[135,32,13]],
  ['WAYFINDER','damage',[94,18,9],[140,31,14]],
  ['DAWNKEEPER','support',[100,12,11],[155,19,19]],
  ['STONECALLER','support',[102,17,12],[170,23,22]],
].map(([id,role,start,level25])=>Object.freeze({
  id,role,start:Object.freeze(start),level25:Object.freeze(level25),
})));

export function compactCoreStats(classId, level) {
  if (!Number.isSafeInteger(level)||level<1||level>100) throw new RangeError('invalid review level');
  const p=compactClassProfiles.find(p=>p.id===classId);
  if (!p) throw new RangeError('invalid review class');
  // Integer anchors with deterministic fractional growth internally.
  // After level 25 use the agreed illustrative 25-level interval.
  const values=p.start.map((start,i)=>level<=25
    ?start+(p.level25[i]-start)*(level-1)/24
    :p.level25[i]+(p.level25[i]-start)*(level-25)/25);
  return {maxHp:values[0],attackPower:values[1],defense:values[2]};
}

test('all nine proposed level-25 anchors are preserved exactly',()=>{
  const expected=[
    [210,18,32],[200,20,29],[190,25,25],[160,34,17],
    [130,33,12],[135,32,13],[140,31,14],[155,19,19],[170,23,22],
  ];
  assert.equal(new Set(compactClassProfiles.map(p=>p.id)).size,9);
  for (const [i,p] of compactClassProfiles.entries())
    assert.deepEqual(Object.values(compactCoreStats(p.id,25)),expected[i]);
});
test('900 level/class profiles: positive finite monotonic stats and deterministic replay',()=>{
  for (const p of compactClassProfiles) {
    let last;
    for(let level=1;level<=100;level++){
      const stats=compactCoreStats(p.id,level);
      assert.deepEqual(stats,compactCoreStats(p.id,level));
      for(const key of Object.keys(stats)){
        assert.ok(Number.isFinite(stats[key])&&stats[key]>0);
        if(last)assert.ok(stats[key]>last[key],p.id+':'+level+':'+key);
      }
      last=stats;
    }
  }
});
test('natural tank HP/DEF and damage ATK lead at every level',()=>{
  for(let level=1;level<=100;level++){
    const rows=compactClassProfiles.map(p=>({...p,...compactCoreStats(p.id,level)}));
    for(const tank of rows.filter(r=>r.role==='tank'))
      for(const other of rows.filter(r=>r.role!=='tank')){
        assert.ok(tank.maxHp>other.maxHp);
        assert.ok(tank.defense>other.defense);
      }
    for(const damage of rows.filter(r=>r.role==='damage'))
      for(const other of rows.filter(r=>r.role!=='damage'))
        assert.ok(damage.attackPower>other.attackPower);
    const [b,i,d]=rows;
    assert.ok(b.defense>i.defense&&i.defense>d.defense);
    assert.ok(d.attackPower>i.attackPower&&i.attackPower>b.attackPower);
  }
});
test('illustrated Bastion/Ravager defense checkpoints and invalid inputs',()=>{
  for (const [level,bastion,ravager] of [[1,16,8],[25,32,17],[50,48,26],[75,64,35],[100,80,44]]){
    assert.equal(compactCoreStats('BASTION',level).defense,bastion);
    assert.equal(compactCoreStats('RAVAGER',level).defense,ravager);
  }
  for(const n of [0,101,1.5,NaN,Infinity])assert.throws(()=>compactCoreStats('BASTION',n),RangeError);
  assert.throws(()=>compactCoreStats('unknown',25),RangeError);
});

/** Separate rating units from compact flat stats. Ratings stay on the
 * historical engine scale until accuracyScale and affix bridges are audited.
 * All new healing values are provisional, not approved gameplay. */
const secondary = Object.freeze({
  BASTION:       [5,8,680,180,.05,.03],
  IRONWARDEN:    [6,10,680,180,.05,.03],
  DREADGUARD:    [8,13,680,180,.05,.03],
  RAVAGER:       [2,3,700,160,.12,.05],
  KNIFE_DANCER:  [2,3,800,330,.18,.14],
  HEXWEAVER:     [3,5,790,250,.13,.09],
  WAYFINDER:     [2,4,810,270,.15,.10],
  DAWNKEEPER:    [18,32,720,230,.07,.08],
  STONECALLER:   [14,25,690,190,.06,.04],
});
for(const row of Object.values(secondary))Object.freeze(row);
export function compactFullStats(classId,level){
  const core=compactCoreStats(classId,level);
  const [start,end,accuracy,evasion,critChance,haste]=secondary[classId];
  const healingPower=level<=25?start+(end-start)*(level-1)/24:
    end+(end-start)*(level-25)/25;
  return {...core,healingPower,accuracy,evasion,critChance,critMultiplier:1.5,haste};
}
test('complete nine-stat baseline, no implicit percent/rating conversion',()=>{
  for(const p of compactClassProfiles){
    let last=0;
    for(let level=1;level<=100;level++){
      const s=compactFullStats(p.id,level);
      assert.equal(Object.keys(s).length,9);
      assert.ok(Object.values(s).every(n=>Number.isFinite(n)&&n>=0));
      assert.ok(s.healingPower>last);
      assert.ok(s.critChance<=1&&s.critMultiplier>=1&&s.haste<=2);
      assert.deepEqual(s,compactFullStats(p.id,level));
      assert.deepEqual([s.maxHp,s.attackPower,s.defense],Object.values(compactCoreStats(p.id,level)));
      last=s.healingPower;
    }
  }
});
test('support healing advantage and individual class identity hold at all levels',()=>{
  for(let level=1;level<=100;level++){
    const rows=compactClassProfiles.map(p=>({...p,...compactFullStats(p.id,level)}));
    for(const support of rows.filter(r=>r.role==='support'))
      for(const other of rows.filter(r=>r.role!=='support'))
        assert.ok(support.healingPower>other.healingPower);
    const get=id=>rows.find(r=>r.id===id);
    assert.ok(get('DAWNKEEPER').healingPower>get('STONECALLER').healingPower);
    assert.ok(get('STONECALLER').defense>get('DAWNKEEPER').defense);
    assert.ok(get('DREADGUARD').healingPower>get('IRONWARDEN').healingPower);
    assert.ok(get('WAYFINDER').accuracy>get('KNIFE_DANCER').accuracy);
    assert.ok(get('KNIFE_DANCER').evasion>get('WAYFINDER').evasion);
    assert.ok(get('KNIFE_DANCER').critChance>get('WAYFINDER').critChance);
  }
  assert.equal(compactFullStats('DAWNKEEPER',25).healingPower,32);
  assert.equal(compactFullStats('STONECALLER',25).healingPower,25);
});
