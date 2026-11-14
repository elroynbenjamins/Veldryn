// Phase 2: compare genuine server settlement with split offline claims for
// every playable class, on representative live regions and two gear bands.
// These checks do not retune enemies or create class-specific reward bonuses.
import {assert} from './test-assert';
import {CLASSES} from '../src/content/classes';
import {combatSustainProjection,activeCombatHitProjection,claimActivity} from '../src/core/game';
import {REGIONAL_COMBAT_FIXTURES,regionalCombatFixture} from '../src/core/regional-combat-fixtures';

const regions=new Set(['GREENFIELDS','KINGS_ROAD','SUNSCAR','FROSTMARCH']);
const preparations=['prepared','optimized'] as const;
const START=1_700_000_000_000;
let cases=0;
const summary:Array<{region:string;preparation:string;minKillsPerHour:number;maxKillsPerHour:number}>=[];
assert.equal(CLASSES.length,9,'All nine combat classes must participate in the regional replay matrix');

for(const def of REGIONAL_COMBAT_FIXTURES.filter(row=>regions.has(row.regionId))){
 for(const preparation of preparations){
  const rates:number[]=[];
  for(const cls of CLASSES){
   const state=regionalCombatFixture(def,preparation,cls.id);
   const forecast=combatSustainProjection(state,def.monsterId)!;
   assert.ok(forecast&&Number.isFinite(forecast.killsPerHour)&&forecast.killsPerHour>0,cls.id+' must have a finite kill rate in '+def.regionName);
   assert.ok(Number.isFinite(forecast.netDamagePerKill)&&Number.isFinite(forecast.foodPerHour),cls.id+' survival and food forecast must be finite in '+def.regionName);
   assert.ok(Number.isFinite(forecast.xpPerHour)&&forecast.xpPerHour>0&&Number.isFinite(forecast.goldPerHour),cls.id+' must have finite rewards in '+def.regionName);
   rates.push(forecast.killsPerHour);
   // One original session clock; claiming at the encounter boundary or
   // partway through the next encounter may not duplicate casts or rewards.
   state.activity={kind:'combat',targetId:def.monsterId,combatTacticId:'balanced',startedAtMs:START,lastClaimAtMs:START};
   const cycleMs=Math.ceil(forecast.killCycleSeconds*1000);
   const halfway=START+Math.max(1000,cycleMs+137);
   const end=START+Math.max(3000,cycleMs*3+251);
   const single=claimActivity(state,end);
   const early=claimActivity(state,halfway);
   const late=claimActivity(early.state,end);
   const context=def.regionName+'/'+preparation+'/'+cls.id;
   assert.equal(early.reward.kills+late.reward.kills,single.reward.kills,'Split hunting cannot multiply kills: '+context);
   assert.equal(early.reward.xp+late.reward.xp,single.reward.xp,'Split hunting cannot multiply XP: '+context);
   assert.equal(early.reward.gold+late.reward.gold,single.reward.gold,'Split hunting cannot multiply Gold: '+context);
   for(const fractionKey of ['combat:base-xp-fraction','combat:base-gold-fraction']){
    const fraction=late.state.rewardRemainders?.[fractionKey];
    assert.ok(typeof fraction==='number'&&fraction>=0&&fraction<1,'Fractional combat rewards must remain bounded after split claims: '+context+'/'+fractionKey);
   }
   assert.ok(Math.abs(late.state.character!.currentHp-single.state.character!.currentHp)<1e-4,'Split hunt must preserve actual HP after real class skills: '+context);
   assert.ok(Math.abs((late.state.activity?.combatEnemyHp??0)-(single.state.activity?.combatEnemyHp??0))<1e-4,'Split hunt must preserve enemy HP: '+context);
   const live=activeCombatHitProjection(state,end)!;
   assert.ok(live.playerHp>=1&&live.playerHp<=live.playerMaxHp,'Combat replay must bound HP: '+context);
   assert.ok(live.enemyHp>=0&&live.enemyHp<=live.enemyMaxHp,'Combat replay must bound enemy HP: '+context);
   assert.ok((live.lastSkillEffects??[]).every(effect=>(effect.amount??0)>0),'Only positive real combat skill effects may appear: '+context);
   cases++;
  }
  summary.push({region:def.regionName,preparation,minKillsPerHour:Math.min(...rates),maxKillsPerHour:Math.max(...rates)});
 }
}
assert.equal(cases,72,'Expected nine classes across four regions and two gear bands');
console.log('COMBAT_SKILL_REGIONAL_MATRIX '+JSON.stringify({cases,summary}));
console.log('PASS: phase 2 combat skills preserve HP/reward parity across 72 regional hunt scenarios');
