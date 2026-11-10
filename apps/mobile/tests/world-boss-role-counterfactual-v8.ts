/**
 * World Boss v8 role counterfactual stress checks; development-only.
 * Battle engine still uses launchPlayer level 25 proxy stats, not actual gear.
 * Same initial seed is supplied, but mutable RNG cursor means changed ability
 * sequences can drift; these samples are descriptive, not causal effect sizes.
 */
import {assert} from './test-assert';
import {launchPlayer} from '../../../backend/src/server/combat/content/launch-combat';
import {simulateWorldBossRounds,type WorldBossId,type WorldBossPhase} from '../../../backend/src/server/combat/world-boss-round-prototype';
import type {CombatantDefinition} from '../../../backend/src/server/combat/types';

const bosses:WorldBossId[]=['hollowroot','sunscar','frostmarch'];
const phases:WorldBossPhase[]=['armored','exposed','enraged'];
const initiators=['Ironwarden','Wayfinder','Dawnkeeper'] as const;
const roles={
 tank:['Ironwarden','Bastion','Dreadguard'],
 damage:['Wayfinder','Ravager','Hexweaver','Knife Dancer'],
 support:['Dawnkeeper','Stonecaller'],
};
const pressure=[1.5,2.5] as const;
function squad(classId:string):CombatantDefinition[]{
 const initiator=launchPlayer(classId,25);
 const selected=[initiator]; const required={tank:1,damage:2,support:1};
 if(initiator.role==='enemy')throw Error('invalid_initiator');
 required[initiator.role]--;
 for(const role of ['tank','damage','support'] as const)for(const name of roles[role]){
  if(name!==classId&&required[role]>0){selected.push(launchPlayer(name,25));required[role]--;}
 }
 assert.equal(selected.length,4);
 return selected;
}
const mean=(xs:number[])=>xs.reduce((n,x)=>n+x,0)/xs.length;
let runs=0;
for(const boss of bosses)for(const phase of phases)for(const p of pressure)for(const initiator of initiators){
 const raw={full:[] as number[],withoutRecovery:[] as number[],withoutIntercept:[] as number[]};
 const surviving={full:[] as number[],withoutRecovery:[] as number[],withoutIntercept:[] as number[]};
 let supportRecoveryFull=0,supportRecoveryDisabled=0,tankProtectionFull=0,tankProtectionDisabled=0;
 for(let seed=0;seed<10;seed++){
  const formation=squad(initiator);
  const base={seed:'wb-counterplay-v8:'+boss+':'+phase+':'+p+':'+initiator+':'+seed,
   boss,phase,pressure:p,players:formation};
  const normal=simulateWorldBossRounds(base);
  const withoutRecovery=simulateWorldBossRounds({...base,
   players:formation.map(def=>def.role==='support'
    ?{...def,abilities:def.abilities.filter(a=>a.effects.every(e=>!['heal','hot','shield','cleanse'].includes(e.kind)))}
    :def),
  });
  const withoutIntercept=simulateWorldBossRounds({...base,testOnlyDisableTankInterception:true});
  const tank=formation.find(f=>f.role==='tank')!.id;
  const support=formation.find(f=>f.role==='support')!.id;
  supportRecoveryFull+=normal.participants[support].effectiveHealing+normal.participants[support].shieldConsumed;
  supportRecoveryDisabled+=withoutRecovery.participants[support].effectiveHealing+withoutRecovery.participants[support].shieldConsumed;
  tankProtectionFull+=normal.participants[tank].tankProtection;
  tankProtectionDisabled+=withoutIntercept.participants[tank].tankProtection;
  assert.equal(withoutRecovery.participants[support].effectiveHealing,0,'disabled recovery must never heal');
  assert.equal(withoutRecovery.participants[support].shieldConsumed,0,'disabled recovery must not generate shields');
  assert.equal(withoutIntercept.participants[tank].tankProtection,0,'disabled interception must award no protected damage');
  for(const [name,result] of [
   ['full',normal],['withoutRecovery',withoutRecovery],['withoutIntercept',withoutIntercept]
  ] as const){
   raw[name].push(result.bossHpDamage);
   surviving[name].push(Object.values(result.participants).filter(x=>x.survived).length);
   assert.ok(result.events.every(e=>e.round>=1&&e.round<=14),'no event outside the valid 14 rounds');
  }
  runs+=3;
 }
 console.log('WB_COUNTERPLAY_V8='+JSON.stringify({
  boss,phase,pressure:p,initiator,
  fixturesPerVariant:10,
  meanSquadDamage:{
   full:+mean(raw.full).toFixed(2),
   mutedSupportRecovery:+mean(raw.withoutRecovery).toFixed(2),
   noTankIntercept:+mean(raw.withoutIntercept).toFixed(2)
  },
  meanSurviving:{
   full:+mean(surviving.full).toFixed(2),
   mutedSupportRecovery:+mean(surviving.withoutRecovery).toFixed(2),
   noTankIntercept:+mean(surviving.withoutIntercept).toFixed(2)
  },
  effectiveSupportRecovery:+supportRecoveryFull.toFixed(2),
  mutedSupportRecovery:+supportRecoveryDisabled.toFixed(2),
  tankHpProtection:+tankProtectionFull.toFixed(2),
  mutedTankProtection:+tankProtectionDisabled.toFixed(2),
 }));
}
assert.equal(runs,3*3*2*3*10*3,'complete 1620-fight role counterfactual study');
console.log('WB_COUNTERPLAY_METHOD_V8='+JSON.stringify({
 runs,testOnly:true,productionMultipliersApproved:false,calibratedRoleFairness:false,
 fightSnapshotSource:'launchPlayer level25',rewardsMinted:0
}));
