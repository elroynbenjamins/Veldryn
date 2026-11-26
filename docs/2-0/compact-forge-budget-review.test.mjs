/** Independent source-data budget audit, not the actual Forge runtime.
 * Reads canonical manifest literals directly, and fences the pinned formula
 * constants to fail rather than silently accepting a changed source policy.
 * No generated items, no runtime authorization, no CP weights. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {compactClassProfiles,compactFullStats} from './compact-class-stat-review.test.mjs';

const read=name=>readFileSync(new URL('../../backend/src/server/equipment/'+name,import.meta.url),'utf8');
const parts=[
  ['equipment-crafting-v2-manifest.ts','CORE'],
  ['equipment-crafting-v2-expansion-manifest.ts','EXPANSION'],
  ['equipment-crafting-v2-armament-manifest.ts','ARMAMENT'],
];
const pieces=parts.flatMap(([file,key])=>{
  const prefix='V2_SERVER_'+key+'_PIECES:readonly V2ServerPiece[]=';
  const src=read(file), start=src.indexOf(prefix);
  assert.ok(start>=0,'canonical manifest source missing');
  const end=src.indexOf(';',start);
  return JSON.parse(src.slice(start+prefix.length,end));
});
const instanceSource=read('equipment-crafting-v2-instances.ts');
const rollSource=read('equipment-crafting-v2-rolls.ts');
const slots=Object.freeze({helmet:6,chest:11,gloves:5.5,legs:8,boots:5.75,cape:6.25,weapon:9,offhand:10,amulet:6,ring:5.5});
const rarity=Object.freeze({common:1,uncommon:1.10,rare:1.25,epic:1.42,legendary:1.65,mythic:1.85});
const splits=Object.freeze({attack:[1,0,0],defense:[0,1,0],health:[0,0,1],attack_defense:[.6,.4,0],attack_health:[.6,0,.4],defense_health:[0,2/3,1/3]});
const round=x=>Math.round(x*100)/100;
const totalBudget=Object.values(slots).reduce((a,b)=>a+b,0);
function project(piece,r,q,healingWeapon=false){
  if(!Object.hasOwn(rarity,r)||!Number.isInteger(q)||q<0||q>100)throw Error('invalid review rarity or quality');
  const slotPoints=piece.slot==='weapon'&&piece.hands!=='one'?slots.weapon+slots.offhand:slots[piece.slot];
  const budget=slotPoints*piece.tier*1.08*rarity[r]*(.75+q*.005);
  if(healingWeapon&&piece.role==='support'&&piece.slot==='weapon'){
    if(!['attack_defense','attack_health'].includes(piece.profile))throw Error('support weapon profile changed');
    return {attack:round(budget*.6),defense:0,hp:0,healingPower:round(budget*.4)};
  }
  if(healingWeapon&&piece.role==='support'&&piece.slot==='offhand'){
    if(piece.profile!=='defense_health')throw Error('support offhand profile changed');
    return {attack:0,defense:round(budget*.6),hp:0,healingPower:round(budget*.4)};
  }
  const [a,d,h]=splits[piece.profile];
  return {attack:round(budget*a),defense:round(budget*d),hp:round(budget*h*4),healingPower:0};
}
const weight=s=>s.attack+s.defense+s.hp/4+s.healingPower;
export function choose(profile,tier,defenseOriented=false){
  const pool=pieces.filter(p=>p.tier===tier&&p.role===profile.role&&(!p.classRestriction||p.classRestriction===profile.id));
  const weapon=pool.find(p=>p.slot==='weapon'&&p.classRestriction===profile.id);
  assert.ok(weapon);
  return Object.keys(slots).flatMap(slot=>{
    if(slot==='offhand'&&weapon.hands!=='one')return [];
    const p=slot==='weapon'?weapon:pool.filter(p=>p.slot===slot).sort((a,b)=>(defenseOriented?project(b,'common',50).defense-project(a,'common',50).defense:0)||a.id.localeCompare(b.id))[0];
    assert.ok(p,profile.id+':'+tier+':'+slot);
    return [p];
  });
}
export function sum(items,r,q,healingWeapon=false){
  const out={attack:0,defense:0,hp:0,healingPower:0};
  for(const p of items)for(const [k,v] of Object.entries(project(p,r,q,healingWeapon)))out[k]+=v;
  return Object.fromEntries(Object.entries(out).map(([k,v])=>[k,round(v)]));
}

test('source policy matches the reviewed draft; T5 cannot masquerade as original Forge',()=>{
  const normalize=s=>s.replace(/\s/g,'');
  const source=normalize(instanceSource),rolls=normalize(rollSource);
  assert.ok(source.includes('constHP_PER_POINT=4;'));
  assert.ok(source.includes('constFACTOR=1.08;'));
  assert.ok(source.includes('constbudget=weaponPoints*piece.tier*FACTOR*baseMultiplier;'));
  assert.ok(source.includes('piece.slot===\'weapon\'&&piece.hands!==\'one\''));
  const slotSource=source.match(/V2_SERVER_SLOT_BUDGET:Readonly<Record<V2Slot,number>>=\{([^}]+)\}/);
  const raritySource=rolls.match(/V2_SERVER_RARITY_BASE_MULTIPLIER:Readonly<Record<V2Rarity,number>>=\{([^}]+)\}/);
  const parseMap=m=>Object.fromEntries(m[1].split(',').filter(Boolean).map(s=>{const [k,v]=s.split(':');return [k,Number(v)];}));
  assert.deepEqual(parseMap(slotSource),slots);
  assert.deepEqual(parseMap(raritySource),rarity);
  assert.ok(rolls.includes('constqualityMultiplier=.75+quality*.005;'));
  assert.equal(pieces.length,169);
  assert.equal(new Set(pieces.map(p=>p.id)).size,169);
  assert.deepEqual([1,2,3,4,5].map(t=>pieces.filter(p=>p.tier===t).length),[37,43,43,46,0]);
  assert.equal(totalBudget,73);
});
test('3,042 source piece / rarity / quality profiles retain budget and one/two stats',()=>{
  let checked=0;
  for(const p of pieces)for(const r of Object.keys(rarity))for(const q of [0,50,100]){
    const s=project(p,r,q), points=p.slot==='weapon'&&p.hands!=='one'?19:slots[p.slot];
    const expected=points*p.tier*1.08*rarity[r]*(.75+q*.005);
    assert.ok(Math.abs(weight(s)-expected)<.02);
    assert.ok(Object.values(s).filter(v=>v>0).length>=1&&Object.values(s).filter(v=>v>0).length<=2);
    assert.equal(s.healingPower,0);
    checked++;
  }
  assert.equal(checked,3042);
});
test('36 legal reference loadouts, 648 rarity/quality profiles, preserve combined hand budget',()=>{
  let checked=0,nine=0,ten=0;
  const levels=[2,25,26,40];
  for(const p of compactClassProfiles)for(const tier of [1,2,3,4]){
    const items=choose(p,tier);
    if(items.length===9)nine++;else if(items.length===10)ten++;else assert.fail('invalid coverage');
    assert.equal(new Set(items.map(i=>i.slot)).size,items.length);
    for(const r of Object.keys(rarity))for(const q of [0,50,100]){
      const old=sum(items,r,q),expected=73*tier*1.08*rarity[r]*(.75+q*.005);
      assert.ok(Math.abs(weight(old)-expected)<.1);
      const candidate=sum(items,r,q,true);
      assert.ok(Math.abs(weight(candidate)-weight(old))<.03);
      assert.equal(candidate.attack,old.attack);
      if(p.role==='support'){
        assert.ok(candidate.healingPower>0);
        const wp=items.find(i=>i.slot==='weapon');
        const single=project(wp,r,q,true);
        assert.equal(Object.values(single).filter(v=>v>0).length,2);
        const offhand=items.find(i=>i.slot==='offhand');
        if(offhand){
          const shield=project(offhand,r,q,true);
          assert.equal(Object.values(shield).filter(v=>v>0).length,2);
          assert.ok(shield.defense>0&&shield.healingPower>0);
        }
        assert.ok(candidate.defense<=old.defense&&candidate.hp<=old.hp);
      }else assert.deepEqual(candidate,old);
      const c=compactFullStats(p.id,levels[tier-1]);
      const coreWeight=c.attackPower+c.defense+c.maxHp/4;
      const gearShare=weight(old)/(weight(old)+coreWeight);
      assert.ok(gearShare>0&&gearShare<1);
      checked++;
    }
  }
  assert.equal(nine,20);assert.equal(ten,16);assert.equal(checked,648);
});
test('T2 common Q50 representative compact builds preserve natural defense and attack roles',()=>{
  const rows=compactClassProfiles.map(p=>{
    const gear=sum(choose(p,2),'common',50,true),base=compactFullStats(p.id,25);
    return {...p,hp:gear.hp+base.maxHp,defense:gear.defense+base.defense,
      attack:gear.attack+base.attackPower,healing:gear.healingPower+base.healingPower};
  });
  for(const t of rows.filter(r=>r.role==='tank'))for(const o of rows.filter(r=>r.role!=='tank')){
    assert.ok(t.defense>o.defense,t.id+':'+o.id);
  }
  for(const d of rows.filter(r=>r.role==='damage'))for(const o of rows.filter(r=>r.role!=='damage'))
    assert.ok(d.attack>o.attack,d.id+':'+o.id);
  for(const s of rows.filter(r=>r.role==='support'))for(const o of rows.filter(r=>r.role!=='support'))
    assert.ok(s.healing>o.healing,s.id+':'+o.id);
  assert.ok(rows.find(r=>r.id==='DAWNKEEPER').healing>rows.find(r=>r.id==='STONECALLER').healing);
  // HP is not a gear-role fence: the support may favor HP intentionally.
  console.log('T2 common Q50 compact role references',JSON.stringify(rows.map(({id,hp,defense,attack,healing})=>({id,hp:round(hp),defense:round(defense),attack:round(attack),healing:round(healing)}))));
});

test('equal support armament healing budget regardless of hand configuration',()=>{
  const dawn=compactClassProfiles.find(p=>p.id==='DAWNKEEPER');
  const stone=compactClassProfiles.find(p=>p.id==='STONECALLER');
  let checked=0;
  for(const tier of [1,2,3,4])for(const r of Object.keys(rarity))for(const q of [0,50,100]){
    const armaments=p=>choose(p,tier).filter(i=>['weapon','offhand'].includes(i.slot));
    const a=sum(armaments(dawn),r,q,true),b=sum(armaments(stone),r,q,true);
    assert.ok(Math.abs(a.healingPower-b.healingPower)<.021);
    assert.ok(Math.abs(a.healingPower-19*tier*1.08*rarity[r]*(.75+q*.005)*.4)<.02);
    for(const level of [1,25,50,75,100]){
      assert.ok(compactFullStats(dawn.id,level).healingPower+a.healingPower>
        compactFullStats(stone.id,level).healingPower+b.healingPower);
    }
    checked++;
  }
  assert.equal(checked,72);
});

test('role-oriented tank reference retains defensive lead through all three tested tiers',()=>{
  for(const [tier,level] of [[2,25],[3,40],[4,60]]){
    const rows=compactClassProfiles.map(p=>{
      const c=compactFullStats(p.id,level),g=sum(choose(p,tier,p.role==='tank'),'common',50,true);
      return {...p,defense:c.defense+g.defense};
    });
    for(const t of rows.filter(r=>r.role==='tank'))for(const o of rows.filter(r=>r.role!=='tank'))
      assert.ok(t.defense>o.defense,t.id+':'+o.id+':'+tier);
  }
});
