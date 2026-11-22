import {
  professionActionDurationV2,qualityWithMasteryV2,proposeCommonMaterialRecoveryV2,
} from '../profession-benefits-preview';
import {professionBonusesV2} from '../profession-mastery';

const eq=(actual:unknown,expected:unknown,label:string)=>{
  if(actual!==expected)throw Error(label+': expected '+String(expected)+' got '+String(actual));
};
const fail=(action:()=>unknown,pattern:RegExp,label:string)=>{
  try{action()}catch(e){if(pattern.test(String(e)))return;throw Error(label+': unexpected '+String(e))}
  throw Error(label+': expected failure');
};
const master=professionBonusesV2({professionId:'smithing',level:100,specialization:'production'});
eq(master.speedBasisPoints,1800,'max production speed');
eq(professionActionDurationV2(600,master.speedBasisPoints),509,'rate-based duration 10 min');
eq(professionActionDurationV2(600,master.speedBasisPoints,1000),500,'forge and profession share 20% cap');
eq(professionActionDurationV2(1,2000),1,'minimum 1 second');
eq(professionActionDurationV2(108000),108000,'30h base action bound');
eq(qualityWithMasteryV2(99,4),100,'quality max 100');
eq(qualityWithMasteryV2(0,4),4,'quality floor bonus');
fail(()=>qualityWithMasteryV2(50,10),/invalid_quality/,'oversized quality');
fail(()=>professionActionDurationV2(0,2000),/invalid_base_duration/,'nonpositive time');
fail(()=>professionActionDurationV2(600,2001),/invalid_speed_source/,'unbounded speed');

let calls=0;
const refund=proposeCommonMaterialRecoveryV2([
  {itemId:'IRON_INGOT',quantity:20,classification:'common'},
  {itemId:'BOSS_TROPHY',quantity:20,classification:'boss_drop'},
  {itemId:'MONSTER_FANG',quantity:20,classification:'combat_drop'},
  {itemId:'RARE_BLUEPRINT',quantity:20,classification:'blueprint'},
  {itemId:'ELIXIR',quantity:20,classification:'rare_catalyst'},
],900,()=>{calls++;return calls%2===0?0.9:0.001;});
eq(refund.length,1,'only common material eligible');
eq(refund[0].itemId,'IRON_INGOT','common only');
eq(refund[0].returnedQuantity,10,'unit-level binomial recovery projection');
eq(calls,20,'no random rolled for rare inputs');
eq(proposeCommonMaterialRecoveryV2([{itemId:'IRON_INGOT',quantity:1,classification:'common'}],0,()=>{throw Error('rng must not be used')}).length,0,'no RNG at 0%');
fail(()=>proposeCommonMaterialRecoveryV2([{itemId:'IRON_INGOT',quantity:2,classification:'common'}],1000,()=>0),/invalid_recovery_request/,'recovery hard cap');
fail(()=>proposeCommonMaterialRecoveryV2([{itemId:'IRON_INGOT',quantity:1,classification:'common'}],900,()=>1),/invalid_rng/,'uniform roll strict');
fail(()=>proposeCommonMaterialRecoveryV2([{itemId:'IRON_INGOT',quantity:1,classification:'common'},{itemId:'IRON_INGOT',quantity:1,classification:'common'}],900,()=>0),/invalid_reserved_input/,'duplicate input IDs');
fail(()=>proposeCommonMaterialRecoveryV2([{itemId:'IRON_INGOT',quantity:1,classification:'mythic' as any}],900,()=>0),/invalid_reserved_input/,'unknown item class');
console.log('PASS: profession benefit preview keeps rare drops scarce and caps speed/quality/recovery');
