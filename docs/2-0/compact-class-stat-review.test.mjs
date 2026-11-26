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
  ['HEXWEAVER','damage',[92,15,9],[135,32,13]],
  ['WAYFINDER','damage',[94,18,9],[140,31,14]],
  ['DAWNKEEPER','support',[100,12,11],[155,19,19]],
  ['STONECALLER','support',[102,17,10],[170,23,22]],
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
