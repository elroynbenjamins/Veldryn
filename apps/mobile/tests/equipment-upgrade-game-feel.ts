import {enhancementFeedback,enhancementPityBonusPct} from '../src/core/visual-feedback';

const fs=require('fs') as {readFileSync:(path:string,encoding:string)=>string};
function ok(value:unknown,message:string){if(!value)throw new Error(message)}
function equal(actual:unknown,expected:unknown,message:string){if(actual!==expected)throw new Error(`${message}: ${String(actual)} !== ${String(expected)}`)}

equal(enhancementPityBonusPct(0),0,'pity starts at zero');
equal(enhancementPityBonusPct(3),6,'pity adds two percentage points per failure');
equal(enhancementPityBonusPct(99),10,'pity caps at ten percentage points');

const success=enhancementFeedback(
 {itemId:'GEAR',rank:6,failures:2,gemIds:[]},
 {itemId:'GEAR',rank:7,failures:0,gemIds:[]},
);
equal(success?.kind,'upgrade_success','rank increase must produce a success result');
equal(success?.previousRank,6,'success result must retain prior rank');
equal(success?.rank,7,'success result must expose committed rank');
equal(success?.pityBeforePct,4,'success result must retain consumed pity context');
equal(success?.pityAfterPct,0,'success resets pity');

const failure=enhancementFeedback(
 {itemId:'GEAR',rank:7,failures:1,gemIds:[]},
 {itemId:'GEAR',rank:7,failures:2,gemIds:[]},
);
equal(failure?.kind,'upgrade_failure','failure counter increase must produce a protected failure result');
equal(failure?.rank,7,'failed tempering must keep the protected rank');
equal(failure?.pityBeforePct,2,'failure result must expose previous pity');
equal(failure?.pityAfterPct,4,'failure result must expose improved pity');

const modal=fs.readFileSync('src/components/EquipmentEnhancementModal.tsx','utf8');
ok(modal.includes('UPGRADE SUCCESS'),'enhancement modal must celebrate a committed success');
ok(modal.includes('TEMPERING FAILED'),'enhancement modal must clearly identify a protected failure');
ok(modal.includes('PROTECTED'),'failure presentation must reinforce rank protection');
ok(modal.includes('trackBase')&&modal.includes('trackPity'),'success chance bar must distinguish base chance from pity');
ok(modal.includes('Enhancement rank ${enhancement.rank} of 10')&&modal.includes('rankStepFilled')&&modal.includes('rankStepNext'),'enhancement UI must show compact +1 to +10 rank progression');
ok(modal.includes('% BASE')&&modal.includes('% PITY'),'chance breakdown must label base chance and pity');
ok(modal.includes('Try again ·'),'failure flow must support an immediate repeat attempt');
ok(modal.includes('riskApprovedTarget'),'high-rank confirmation should be remembered for repeat attempts at the same target rank');
ok(modal.includes('Animated.sequence'),'upgrade outcomes must have a brief motion response when reduced motion is disabled');
ok(modal.includes('reduceMotion'),'upgrade feedback must respect reduced-motion settings');

console.log('PASS equipment upgrade feedback makes success, protected failure, pity and repeat attempts legible');
