/** Private index, never a live CP threshold or reward/queue policy.
 * Gear uses already-scaled flat stats; rarity and quality are not multiplied again.
 * Role-neutral source-budget valuation, not a prediction of win probability.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {compactClassProfiles,compactFullStats} from './compact-class-stat-review.test.mjs';
import {choose,sum} from './compact-forge-budget-review.test.mjs';
const ref=73*2*1.08;
const finite=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0;
export function cpIndex(level,gear,weights={level:40,gear:60}){
 if(!Number.isInteger(level)||level<1||level>100||!gear||
  !['attack','defense','hp','healingPower'].every(k=>finite(gear[k]))||
  !finite(weights.level)||!finite(weights.gear)||weights.level+weights.gear!==100)throw Error('invalid candidate CP input');
 const gearPoints=gear.attack+gear.defense+gear.hp/4+gear.healingPower;
 const progression=weights.level*level/25, equipment=weights.gear*gearPoints/ref;
 return {index:progression+equipment,progression,equipment,gearPoints,
  scope:'PRIVATE_CORE_BUDGET_INDEX_ONLY',unpriced:['affixes','stat_gems','effect_gems','sets','skill_build','companions'],
  cpApproved:false,releaseEnabled:false};
}
test('candidate index is monotonic, role-neutral at equal budget and never double-scales gear',()=>{
 const empty={attack:0,defense:0,hp:0,healingPower:0};
 assert.equal(cpIndex(25,empty).index,40);
 for(const gear of [{...empty,attack:ref},{...empty,defense:ref},{...empty,hp:ref*4},{...empty,healingPower:ref}])
  assert.equal(cpIndex(25,gear).index,100);
 for(const n of [0,101,NaN])assert.throws(()=>cpIndex(n,empty));
 assert.throws(()=>cpIndex(25,{...empty,attack:-1}));
 assert.throws(()=>cpIndex(25,empty,{level:40,gear:70}));
 let cases=0;
 const weights=[{level:30,gear:70},{level:40,gear:60},{level:50,gear:50}];
 for(const p of compactClassProfiles)for(const [tier,level] of [[1,10],[2,25],[3,40],[4,60]])
 for(const w of weights){
  const items=choose(p,tier),rarities=['common','uncommon','rare','epic','legendary','mythic'];
  let last=-1;
  for(const rarity of rarities){
   let lastQuality=-1;
   for(const q of [0,50,100]){
    const g=sum(items,rarity,q,true),a=cpIndex(level,g,w),b=cpIndex(level+1,g,w);
    assert.ok(a.index>lastQuality&&b.index>a.index);
    assert.ok(a.equipment>0&&a.progression>0);
    assert.equal(a.cpApproved,false);assert.equal(a.releaseEnabled,false);
    lastQuality=a.index;cases++;
   }
   const middle=cpIndex(level,sum(items,rarity,50,true),w).index;
   assert.ok(middle>last);last=middle;
  }
 }
 assert.equal(cases,1944);
 console.log('COMPACT_CP_BUDGET_REVIEW',JSON.stringify({cases,weights,anchor:{level:25,tier:2,commonQ50:100},cpApproved:false}));
});
test('compact TS fixture shares every class/level stat with approved review anchors',()=>{
 const src=readFileSync(new URL('../../backend/src/server/combat/v2/__tests__/compact-unified-calibration-fixture.ts',import.meta.url),'utf8');
 const raw=src.match(/const compactRows = (\{[^\n]+\}) as const;/);
 assert.ok(raw);
 const rows=JSON.parse(raw[1]);
 for(const p of compactClassProfiles)for(const level of [1,25,50,75,100]){
  const r=rows[p.id],v=(start,end)=>level<=25?start+(end-start)*(level-1)/24:end+(end-start)*(level-25)/25;
  const [hp,ap,def]=r.start.map((n,i)=>v(n,r.level25[i]));
  const [hs,he,accuracy,evasion,critChance,haste]=r.secondary;
  assert.deepEqual({maxHp:hp,attackPower:ap,defense:def,healingPower:v(hs,he),accuracy,evasion,critChance,critMultiplier:1.5,haste},compactFullStats(p.id,level));
 }
});
