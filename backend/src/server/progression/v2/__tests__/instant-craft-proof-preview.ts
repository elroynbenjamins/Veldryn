import {projectPendingInstantCraftCareerProofV2} from '../instant-craft-proof-preview';
const account='11111111-1111-4111-8111-111111111111';
const character='33333333-3333-4333-8333-333333333333';
const other='44444444-4444-4444-8444-444444444444';
const data={
 accountId:account,requestId:'instant00001',requestHash:'b'.repeat(64),
 commandType:'craft',expectedGameRevision:77,adminQa:false,
 originalCharacterId:character,committedCharacterId:character,
 requestedRecipeId:'SMELT_COPPER_INGOT',requestedQuantity:3,
 contributions:[{kind:'crafting',contentId:'SMELT_COPPER_INGOT',units:3}],
 recipes:[
  {id:'SMELT_COPPER_INGOT',skillId:'smithing' as const,level:1,seconds:36,isTimed:false},
  {id:'EQUIPMENT_SWORD_T1',skillId:'smithing' as const,level:12,seconds:600,isTimed:true},
  {id:'TAILOR_PRACTICE',skillId:'tailoring' as const,level:80,seconds:700,isTimed:false},
 ],
 owningSkillLevel:1,owningSkillXpBefore:1000,owningSkillXpAfter:1300,
};
const eq=(a:unknown,b:unknown,label:string)=>{
 if(a!==b)throw Error(label+': expected '+String(b)+', got '+String(a));
};
async function reject(work:()=>Promise<unknown>,pattern:RegExp,label:string){
 try{await work();}catch(err){
  if(pattern.test(String(err)))return;
  throw Error(label+': wrong error '+String(err));
 }
 throw Error(label+': expected rejection');
}
async function test(){
 const result=await projectPendingInstantCraftCareerProofV2(data);
 if(!result)throw Error('expected settled craft proof');
 eq(result.sourceKind,'craft_claim','canonical source kind');
 eq(result.professionId,'smithing','smith XP only');
 eq(result.baseEffortSeconds,108,'three real crafting actions');
 eq(result.difficultyBasisPoints,10000,'same-level craft');
 eq(result.characterId,character,'correct original character');
 eq(result.expectedGameRevision,77,'bound to committed revision');
 eq(result.segmentIndex,0,'one command proof');
 eq(result.sourceCompletedAtMs,null,'DB should assign completion');
 eq(result.sourceId.length,64,'stable source digest');
 const replay=await projectPendingInstantCraftCareerProofV2(data);
 eq(replay?.sourceId,result.sourceId,'retry canonical receipt');
 eq(await projectPendingInstantCraftCareerProofV2({...data,adminQa:true}),null,'QA cannot craft XP');
 eq(await projectPendingInstantCraftCareerProofV2({...data,commandType:'craft_cancel'}),null,'cancel not paid');
 eq(await projectPendingInstantCraftCareerProofV2({...data,commandType:'craft_claim'}),null,'timed claim requires separate proof');
 const queued=await projectPendingInstantCraftCareerProofV2({...data,requestedRecipeId:'EQUIPMENT_SWORD_T1',
  requestedQuantity:1,contributions:[],owningSkillLevel:12});
 eq(queued,null,'starting timed Forge job cannot award');
 const capped=await projectPendingInstantCraftCareerProofV2({...data,
  requestedRecipeId:'TAILOR_PRACTICE',requestedQuantity:40,
  owningSkillLevel:100,owningSkillXpBefore:10000,owningSkillXpAfter:10000,
  contributions:[{kind:'crafting',contentId:'TAILOR_PRACTICE',units:40}]});
 eq(capped?.baseEffortSeconds,10800,'bulk credit caps 3h per command');
 eq(capped?.difficultyBasisPoints,5000,'trivial craft yields reduced XP');
 const maxed=await projectPendingInstantCraftCareerProofV2({...data,
  owningSkillLevel:100,owningSkillXpBefore:10000,owningSkillXpAfter:10000});
 eq(maxed?.professionId,'smithing','maxed profession still advances overall level');
 eq(maxed?.difficultyBasisPoints,2500,'trivial maxed work heavily reduced');
 await reject(()=>projectPendingInstantCraftCareerProofV2({...data,committedCharacterId:other}),
  /character_switch/,'cannot move craft XP to alt');
 await reject(()=>projectPendingInstantCraftCareerProofV2({...data,requestedQuantity:4}),
  /incomplete_work/,'missing one completed action');
 await reject(()=>projectPendingInstantCraftCareerProofV2({...data,contributions:[]}),
  /incomplete_work/,'no completed work');
 await reject(()=>projectPendingInstantCraftCareerProofV2({...data,owningSkillXpBefore:1301}),
  /skill_xp_regressed/,'XP cannot go backward');
 await reject(()=>projectPendingInstantCraftCareerProofV2({...data,owningSkillXpAfter:1000}),
  /no_earned_skill_xp/,'nonmaxed skill must actually gain XP');
 await reject(()=>projectPendingInstantCraftCareerProofV2({...data,
  recipes:[...data.recipes,data.recipes[0]]}),
  /invalid_catalogue/,'duplicate recipe');
 await reject(()=>projectPendingInstantCraftCareerProofV2({...data,
  requestedRecipeId:'TAILOR_PRACTICE',contributions:[{kind:'crafting',contentId:'TAILOR_PRACTICE',units:3}]}),
  /skill_locked/,'recipe requires trained skill');
 await reject(()=>projectPendingInstantCraftCareerProofV2({...data,
  contributions:[{kind:'crafting',contentId:'SMELT_COPPER_INGOT',units:3},
   {kind:'crafting',contentId:'SMELT_COPPER_INGOT',units:3}]}),
  /incomplete_work/,'duplicate craft proof');
 await reject(()=>projectPendingInstantCraftCareerProofV2({...data,
  contributions:[{kind:'crafting',contentId:'SMELT_COPPER_INGOT',units:3},
   {kind:'crafting',contentId:'OTHER_RECIPE',units:1}]}),
  /mixed_crafting_sources/,'no character XP when two recipes appear in a one-recipe command');
 await reject(()=>projectPendingInstantCraftCareerProofV2({...data,
  contributions:[null] as unknown as typeof data.contributions}),
  /invalid_contributions/,'null or malformed contribution does not crash or mint');
 const withUnrelatedMetadata=await projectPendingInstantCraftCareerProofV2({...data,
  contributions:[{kind:'crafting',contentId:'SMELT_COPPER_INGOT',units:3},
    {kind:'quest',contentId:'QUEST_TUTORIAL',units:1}]});
 eq(withUnrelatedMetadata?.baseEffortSeconds,108,
   'noncraft metadata may coexist without changing earned craft effort');
 console.log('PASS: instant craft proof requires completed recipes, skill XP, correct character, single-recipe provenance and capped bulk work');
}
void test().catch(e=>{throw e;});
