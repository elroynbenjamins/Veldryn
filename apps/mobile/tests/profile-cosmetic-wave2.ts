import {WAVE2_SETS,WAVE2_READY_SET_IDS,wave2Ready,wave2Owned,wave2Complete,wave2HasEffect} from '../src/core/profile-cosmetic-wave2';
function ok(value:unknown,message:string){if(!value)throw new Error(message);}
ok(WAVE2_SETS.length===4,'four reserved collections');
const all=WAVE2_SETS.flatMap(s=>[s.borderId,s.effectId,...s.iconIds]);
ok(new Set(all).size===16,'sixteen distinct piece IDs');
for(const row of WAVE2_SETS){
 const ownership={unlockedProfileBorderIds:[row.borderId],unlockedProfileEffectIds:[row.effectId],unlockedProfileIconIds:[...row.iconIds]};
 const ready=[row.id];
 ok(!wave2Complete({},row,ready),'non-owner');
 ok(!wave2Complete(ownership,row,[]),'not ready');
 ok(wave2Complete(ownership,row,ready),'all four owned, no tester needed');
 ok(!wave2Complete({...ownership,unlockedProfileIconIds:[row.iconIds[0]]},row,ready),'partial grant no quick equip');
 ok(wave2HasEffect(ownership,ready),'owned effect category available');
 ok(!wave2HasEffect(ownership,[]),'unready effect not visible');
 ok(!wave2Owned({},'effect',row.effectId,ready),'cannot select unowned effect');
 ok(!wave2Ready('icon',row.borderId,ready),'kind fence');
 ok(wave2Complete(ownership,row)===WAVE2_READY_SET_IDS.includes(row.id),'production readiness defaults');
 for(const other of WAVE2_SETS.filter(s=>s.id!==row.id))ok(!wave2Owned(ownership,'effect',other.effectId,ready),'no cross-set access');
}
console.log('PASS wave 2 standard ownership and readiness contract');
