/** Authored solo finale requirements; never substitutes co-op encounter definitions. */
export const SOLO_FINALE_REVIEW_RELEASED=false;
const rows=[
 {regionId:'ASTERFALL',questId:'story2:asterfall:14',level:25,areaId:'KINGS_ROAD',name:'Fallen Knight',encounterId:'FALLEN_KNIGHT',predecessor:'story2:asterfall:13',candidateTier:2,binding:'legacy_solo_verified',mechanics:['ward','telegraphed heavy hit','enrage']},
 {regionId:'SUNSCAR',questId:'story2:sunscar:16',level:50,areaId:'ZONE_010',name:'The Sand Tyrant',encounterId:null,predecessor:'story2:sunscar:15',candidateTier:4,binding:'pending_solo_runtime',mechanics:['telegraphed fire burst','temporary sand barrier','vulnerability window']},
 {regionId:'FROSTMARCH',questId:'story2:frostmarch:16',level:75,areaId:'ZONE_015',name:'The Frost Wyrm',encounterId:null,predecessor:'story2:frostmarch:15',candidateTier:5,binding:'pending_solo_runtime',mechanics:['ice pressure','telegraphed shatter','recovery window']},
];
export function soloFinaleRequirementsReview(regionId){
 const q=rows.find(x=>x.regionId===regionId);
 if(!q)return null;
 return {...q,mechanics:[...q.mechanics],recommendedTierOnly:true,requiresClass:null,requiresCompanion:null,requiresDungeon:false,released:false,authorizesAccess:false,authorizesReward:false};
}
export function soloFinaleEvidenceReview({regionId,expected,facts}){
 const q=soloFinaleRequirementsReview(regionId);
 const fail=reason=>({status:'unavailable',reason,released:false,authorizesReward:false,authorizesAccess:false});
 if(!q||q.binding!=='legacy_solo_verified')return fail('solo_runtime_binding_pending');
 if(!expected?.accountId||!expected?.characterId||facts?.accountId!==expected.accountId||facts?.characterId!==expected.characterId||facts?.revision!==expected.revision||!Number.isSafeInteger(facts.revision)||facts.revision<0)return fail('unverified_facts');
 if(facts.level<q.level||!facts.claimedQuestIds?.includes(q.predecessor))return fail('story_prerequisites');
 const proof=facts.soloVictory;
 if(!proof||proof.accountId!==expected.accountId||proof.characterId!==expected.characterId||proof.encounterId!==q.encounterId||proof.mode!=='story_solo'||proof.status!=='settled'||proof.won!==true||!Number.isSafeInteger(proof.revision)||proof.revision<0||proof.revision>facts.revision)return fail('verified_solo_victory_required');
 return {status:'review',complete:true,questId:q.questId,encounterId:q.encounterId,released:false,authorizesReward:false,authorizesAccess:false};
}
