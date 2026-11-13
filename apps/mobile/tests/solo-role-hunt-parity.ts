import {assert} from './test-assert';
import {CLASSES} from '../src/content/classes';
import {CLASS_COMBAT_STYLES} from '../src/core/class-combat';
import {combatSustainProjection} from '../src/core/game';
import {REGIONAL_COMBAT_FIXTURES,regionalCombatFixture} from '../src/core/regional-combat-fixtures';

const selected=['KINGS_ROAD','SUNSCAR','FROSTMARCH','ASHLANDS'];
const preparations=['prepared','optimized'] as const;
const average=(values:number[])=>values.reduce((sum,value)=>sum+value,0)/values.length;
const violations:string[]=[];
const report:Array<{region:string;preparation:string;tankPct:number;supportPct:number;minRolePct:number;damageKillsPerHour:number;roleRates:Record<string,number>}>=[];

assert.equal(CLASSES.length,9,'all playable classes must be represented');
for(const cls of CLASSES){
 const style=CLASS_COMBAT_STYLES[cls.id];
 assert.ok(style.soloHuntDamageMultiplier>=1&&style.soloHuntDamageMultiplier<=2.1,cls.id+' solo offense must remain bounded');
 assert.ok(style.soloHuntTempoMultiplier>=1&&style.soloHuntTempoMultiplier<=1.1,cls.id+' solo tempo must remain bounded');
 if(cls.role==='Damage'){
  assert.equal(style.soloHuntDamageMultiplier,1,cls.id+' damage baseline cannot gain a role conversion');
  assert.equal(style.soloHuntTempoMultiplier,1,cls.id+' damage tempo cannot gain a role conversion');
 }
}

for(const def of REGIONAL_COMBAT_FIXTURES.filter(fixture=>selected.includes(fixture.regionId))){
 for(const preparation of preparations){
  const rows=CLASSES.map(cls=>{
   const state=regionalCombatFixture(def,preparation,cls.id);
   const projected=combatSustainProjection(state,def.monsterId);
   if(!projected)throw new Error(def.regionName+'/'+cls.name+' has no ordinary hunt projection');
   assert.ok(projected.killsPerHour>0&&Number.isFinite(projected.killsPerHour),
    def.regionName+'/'+cls.name+' must simulate real ordinary hunts');
   assert.ok(projected.xpPerHour>0,def.regionName+'/'+cls.name+' must earn combat XP');
   return {id:cls.id,role:cls.role,killsPerHour:projected.killsPerHour};
  });
  const reference=average(rows.filter(row=>row.role==='Damage').map(row=>row.killsPerHour));
  const tank=average(rows.filter(row=>row.role==='Tank').map(row=>row.killsPerHour));
  const support=average(rows.filter(row=>row.role==='Support').map(row=>row.killsPerHour));
  const tankPct=tank/reference,supportPct=support/reference;
  const roleRates=Object.fromEntries(rows.map(row=>[row.id,Number((row.killsPerHour/reference).toFixed(3))]));
  report.push({region:def.regionName,preparation,tankPct:Number(tankPct.toFixed(3)),supportPct:Number(supportPct.toFixed(3)),minRolePct:Number(Math.min(tankPct,supportPct).toFixed(3)),damageKillsPerHour:Number(reference.toFixed(2)),roleRates});
  // Search time creates a hard floor in overgeared regions. Do not artificially
  // slow one-hit kills to force a perfect role ratio at the search ceiling.
  // 85–95% Tank / 80–90% Support are targets; allow a narrow search-floor tolerance.
  if(tankPct<.83||supportPct<.79||tankPct>.99||supportPct>.95)
   violations.push(def.regionName+'/'+preparation+': '+JSON.stringify({tankPct,supportPct}));
 }
}

// Class damage and survival still differ: this test only covers ordinary hunt
// settlement. Boss, dungeon and PvP simulations must not use these bonuses.
console.log('ROLE_HUNT_PARITY_REPORT '+JSON.stringify(report));
assert.equal(violations.length,0,'ordinary-hunt role gap outside the safe band: '+violations.join('; '));
console.log('PASS: nine-class ordinary hunt role parity across prepared/optimized regional gear');
