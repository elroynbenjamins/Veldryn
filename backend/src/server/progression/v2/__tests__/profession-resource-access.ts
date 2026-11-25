import {professionResourceEligibilityV2} from '../profession-resource-access';
import {professionTotalXpForLevelV2,overallTotalXpForLevelV2} from '../character-progression';

const master={
  combatLevel:1,overallCharacterXp:overallTotalXpForLevelV2(90),
  professionXp:{mining:professionTotalXpForLevelV2(96)},
};
const ashlands={
  nodeId:'DEEP_BLACKGLASS_VEIN',professionId:'mining' as const,
  requiredProfessionLevel:86,regionId:'ASHLANDS',
  safeAccessRouteId:'profession-ashlands-mine',available:true,
};
const result=professionResourceEligibilityV2(master,ashlands);
if(!result.canGather||result.reason!=='available'||result.combatLevelUsed||
   result.grantsWorldOrCombatAccess)throw Error('combat level 1 master miner must independently qualify without combat-world unlocks');
const tooYoung=professionResourceEligibilityV2({
  combatLevel:75,overallCharacterXp:overallTotalXpForLevelV2(100),
  professionXp:{mining:professionTotalXpForLevelV2(20)},
},ashlands);
if(tooYoung.canGather||tooYoung.reason!=='skill_required')
  throw Error('combat power or general character level must never substitute for mining');
const otherSkill=professionResourceEligibilityV2({
  combatLevel:1,overallCharacterXp:overallTotalXpForLevelV2(100),
  professionXp:{smithing:professionTotalXpForLevelV2(100)},
},ashlands);
if(otherSkill.canGather||otherSkill.reason!=='skill_required')
  throw Error('master smithing must not unlock advanced mining');
const missingRoute=professionResourceEligibilityV2(master,{...ashlands,safeAccessRouteId:null});
if(missingRoute.canGather||missingRoute.reason!=='route_unavailable')
  throw Error('never pretend inaccessible combat zone is safely visitable');
const closed=professionResourceEligibilityV2(master,{...ashlands,available:false});
if(closed.canGather||closed.reason!=='route_unavailable')
  throw Error('disabled profession route must remain closed');
for(const invalid of [
  {...ashlands,professionId:'smithing' as any},
  {...ashlands,requiredProfessionLevel:101},
  {...ashlands,safeAccessRouteId:'@@@'},
]){
  let failed=false;
  try{professionResourceEligibilityV2(master,invalid)}catch(e){failed=/invalid_catalogue/.test(String(e));}
  if(!failed)throw Error('malformed server resource catalogue must fail closed');
}
console.log('PASS: isolated safe gathering-route policy rejects combat substitutes and unauthored routes');
