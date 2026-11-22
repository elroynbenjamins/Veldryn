import {accountCareerSlotsV2} from '../account-career-slots';
function equal(a:unknown,b:unknown,label:string){if(a!==b)throw Error(label+': '+String(a)+' != '+String(b));}
function throws(work:()=>unknown,message:string){
  let rejected=false;
  try{work()}catch(e){rejected=/invalid_progress/.test(String(e));}
  if(!rejected)throw Error(message);
}
for(const [level,slots] of [[1,1],[24,1],[25,2],[49,2],[50,3],[74,3],[75,4],[99,4],[100,5]]){
  const p=accountCareerSlotsV2(level,1);
  equal(p.careerUnlockedSlots,slots,'single career alternative Lv'+level);
  equal(p.effectiveSlots,slots,'effective from career Lv'+level);
  equal(p.existingSlotsNeverRegress,true,'no earned legacy loss');
}
equal(accountCareerSlotsV2(1,5).effectiveSlots,5,'preserve legacy five slots');
equal(accountCareerSlotsV2(30,4).effectiveSlots,4,'preserve legacy four slots');
equal(accountCareerSlotsV2(100,3).effectiveSlots,5,'crafting-only mastery can unlock all slots');
throws(()=>accountCareerSlotsV2(101,1),'too-high level rejected');
throws(()=>accountCareerSlotsV2(20,6),'too many existing slots rejected');
throws(()=>accountCareerSlotsV2(20,0),'underflow rejected');
throws(()=>accountCareerSlotsV2(20.5,2),'fractional level rejected');
console.log('PASS: optional one-career account slots never revoke existing multi-skill unlocks');
