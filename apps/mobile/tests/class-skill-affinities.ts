import {assert} from './test-assert';
import {CLASS_SKILL_AFFINITIES,classSkillAffinity,skillAffinityModifiers,captureSkillAffinity,activeSkillAffinity,normalizeSkillAffinitySnapshot,affinityXpRemainderKey,settleAffinitySkillXp} from '../src/core/class-skill-affinities';
import {professionActionPace} from '../src/core/profession-action-pace';
import {createCharacter,newGame,startGathering,previewActivityReward,claimActivity,craftRecipe,effectiveStats,startCombat} from '../src/core/game';
import {activeGatheringRuntimeProjection,gatheringBalanceProjection} from '../src/core/balance-projection';
import {startProcessingBatch,previewProcessingReward,processingRefund,normalizeProcessingBatch} from '../src/core/processing';
import {startAlchemyBatch,previewAlchemyReward,alchemyRefund,normalizeAlchemyBatch} from '../src/core/alchemy';
import {startGemRefinement,startGemCombine,startEquipmentCraft,claimForgeJob,cancelEquipmentCraft,equipmentCraftDurationSeconds,normalizeEquipmentCraftingQueue,isTimedEquipmentRecipe,moveWaitingEquipmentCraft} from '../src/core/equipment-crafting-queue';
import {gemRefineRecipeV1,gemRefineRecipeIdV1,gemCombineRecipeV1,gemCombineRecipeIdV1,gemResearchXpV1} from '../src/core/gem-progression-v1';
import {GATHERING,RECIPES} from '../src/content/skills';
import {WORLD_ZONES} from '../src/content/world-map';
import {equipmentCraftSlotBreakdown} from '../src/core/equipment-crafting-queue';
import {HERB_NODES} from '../src/content/herbalism';
import {ALCHEMY_RECIPES} from '../src/content/alchemy';
import {MOBILE_GEM_FAMILIES_V1} from '../src/content/gems-v1';
import {CLASSES} from '../src/content/classes';
import {projectCharacter} from '../src/core/account-roster';
import {normalizeSave} from '../src/core/save-normalization';
import {totalXpAtLevel} from '../src/core/progression';
import {characterPermanentMultipliers} from '../src/core/permanent-boosts';
import {executeGameCommand} from '../src/core/game-commands';
import type {ClassId,GameState,SkillId,ItemStack} from '../src/core/types';

const NOW=Date.UTC(2026,8,24,12);
let passes=0;const failures:string[]=[];
function check(name:string,fn:()=>void){try{fn();passes++;console.log('PASS '+name)}catch(error){failures.push(name+': '+String(error));console.error('FAIL '+name,error)}}
function near(a:number,b:number,label='numeric equality'){assert.ok(Math.abs(a-b)<1e-7*Math.max(1,Math.abs(b)),`${label}: ${a} versus ${b}`)}
function throws(fn:()=>unknown){let threw=false;try{fn()}catch{threw=true}assert.ok(threw,'expected rejection')}
function fresh(classId:ClassId):GameState{const s=createCharacter(newGame(NOW),classId,'Affinity Tester');s.character!.id='test_'+classId;return s;}
function funded(classId:ClassId,inputs:readonly ItemStack[]=[]):GameState{
 const s=fresh(classId);s.character={...s.character!,level:90,gold:10000000};
 s.skills=s.skills.map(row=>({...row,level:90,xp:totalXpAtLevel(90)}));
 s.inventory={capacity:200,stacks:inputs.map(row=>({...row,quantity:row.quantity*20}))};s.bank={capacity:1000,stacks:[]};return s;
}
function rosterEntry(s:GameState){return {character:s.character!,inventory:s.inventory,overflow:s.overflow,activity:s.activity,skills:s.skills,quests:s.quests,currentRegionId:s.currentRegionId};}
const expected:Record<ClassId,string>={IRONWARDEN:'smithing',BASTION:'smithing',DREADGUARD:'alchemy',WAYFINDER:'fishing',RAVAGER:'woodcutting',HEXWEAVER:'enchanting',KNIFE_DANCER:'tailoring',DAWNKEEPER:'herbalism',STONECALLER:'mining'};
for(const cls of CLASSES)check(cls.name+' has exactly one accepted profession affinity',()=>{
 assert.equal(classSkillAffinity(cls.id),expected[cls.id]);
 for(const {skillId} of fresh(cls.id).skills){const m=skillAffinityModifiers(cls.id,skillId);near(m.xpMultiplier,expected[cls.id]===skillId?1.05:1);near(m.speedMultiplier,expected[cls.id]===skillId?1.03:1)}
});
check('invalid IDs and prototype keys fail neutral',()=>{for(const id of [null,undefined,'','toString','__proto__','BAD']){assert.equal(classSkillAffinity(id),undefined);near(skillAffinityModifiers(id,'mining').xpMultiplier,1)}});
check('readonly rule map matches the live nine-class roster',()=>{assert.equal(Object.keys(CLASS_SKILL_AFFINITIES).length,CLASSES.length);assert.ok(Object.isFrozen(CLASS_SKILL_AFFINITIES))});
check('combat, class training, hunting, exploration and Faith never receive affinity',()=>{for(const c of CLASSES)for(const kind of ['combat','training','hunting','exploration','faith','guard'])assert.deepEqual(skillAffinityModifiers(c.id,kind),{xpMultiplier:1,speedMultiplier:1})});
check('fractional XP survives twenty small awards',()=>{let xp=0,remainder=0;for(let i=0;i<20;i++){const g=settleAffinitySkillXp(.05,remainder);xp+=g.xp;remainder=g.remainder}assert.equal(xp,1);near(remainder,0)});
check('fractional settlement is independent of chunk size',()=>{let xp=0,remainder=0;for(let i=0;i<7;i++){const g=settleAffinitySkillXp(9.45,remainder);xp+=g.xp;remainder=g.remainder}const total=settleAffinitySkillXp(7*9.45);assert.equal(xp,total.xp);near(remainder,total.remainder)});
check('XP cap clears fractions and invalid XP is rejected',()=>{assert.deepEqual(settleAffinitySkillXp(100,.9,3),{xp:3,remainder:0});throws(()=>settleAffinitySkillXp(NaN));throws(()=>settleAffinitySkillXp(-1))});
check('fraction keys cannot leak into another character',()=>assert.notEqual(affinityXpRemainderKey('owner_a','smithing'),affinityXpRemainderKey('owner_b','smithing')));
check('snapshot binds owner, class, profession and accepted rates',()=>{
 const s=fresh('STONECALLER'),snapshot=captureSkillAffinity(s,'mining')!;assert.ok(snapshot);
 s.activity={kind:'mining',targetId:'COPPER_VEIN',startedAtMs:NOW,lastClaimAtMs:NOW,skillAffinity:snapshot};
 near(activeSkillAffinity(s,'mining').xpMultiplier,1.05);
 near(activeSkillAffinity({...s,character:{...s.character!,id:'wrong'}},'mining').xpMultiplier,1);
 near(activeSkillAffinity(s,'woodcutting').xpMultiplier,1);
 assert.equal(normalizeSkillAffinitySnapshot({...snapshot,xpMultiplier:99}),undefined);
 assert.equal(captureSkillAffinity(s,'fishing'),undefined);
});
for(const classId of ['STONECALLER','RAVAGER','WAYFINDER','DAWNKEEPER'] as const){
 const skillId=CLASS_SKILL_AFFINITIES[classId],node=[...GATHERING,...HERB_NODES].find(row=>row.skillId===skillId&&row.unlockLevel===1)!;
 check(classId+' gathering duration and hourly preview match real rewards',()=>{
  const base=fresh(classId),region=WORLD_ZONES.find(row=>row.id===node.zoneId)!;base.character={...base.character!,level:region.minLevel,xp:totalXpAtLevel(region.minLevel)};base.currentRegionId=node.zoneId;
  const s=startGathering(base,node.id,NOW),legacy={...s,activity:{...s.activity!,skillAffinity:undefined}};
  const current=activeGatheringRuntimeProjection(s)!,old=activeGatheringRuntimeProjection(legacy)!;
  near(old.cycleSeconds/current.cycleSeconds,1.03);near((current.xpPerHour/current.actionsPerHour)/(old.xpPerHour/old.actionsPerHour),1.05);
  const at=NOW+current.cycleSeconds*1000*2+.01,reward=previewActivityReward(s,at);
  assert.equal(reward.kills,2);assert.equal(reward.xp,Math.floor(current.xpPerHour/current.actionsPerHour*2+1e-9));
  const settled=claimActivity(s,at);assert.equal(settled.state.skills.find(row=>row.skillId===skillId)!.xp,reward.xp);
  near(settled.state.character!.xp,base.character!.xp,'gathering does not award character XP');
  const legacyRestored=normalizeSave(JSON.parse(JSON.stringify(legacy)));near(activeGatheringRuntimeProjection(legacyRestored)!.cycleSeconds,old.cycleSeconds);
  const restored=normalizeSave(JSON.parse(JSON.stringify(s)));near(activeGatheringRuntimeProjection(restored)!.cycleSeconds,current.cycleSeconds);
  const potential=gatheringBalanceProjection(base,node,1);assert.ok(potential.xpPerHour>0);
 });
}
check('new non-affinity gathering has identical neutral rates',()=>{
 const s=fresh('IRONWARDEN'),node=GATHERING.find(row=>row.skillId==='woodcutting'&&row.unlockLevel===1)!;s.currentRegionId=node.zoneId;
 const started=startGathering(s,node.id,NOW);assert.equal(started.activity!.skillAffinity,undefined);near(activeSkillAffinity(started,node.skillId).speedMultiplier,1);
});
const smelt=RECIPES.find(row=>row.id==='SMELT_COPPER_INGOT')!;
for(const c of ['IRONWARDEN','BASTION'] as const)check(c+' processing grants XP and speed without cheaper inputs',()=>{
 const a=funded(c,smelt.inputs),b=funded('WAYFINDER',smelt.inputs);
 const sa=startProcessingBatch(a,smelt.id,5,NOW),sb=startProcessingBatch(b,smelt.id,5,NOW),pa=sa.activity!.processing!,pb=sb.activity!.processing!;
 near(pb.cycleSeconds/pa.cycleSeconds,1.03);near(pa.xpPerBatch/pb.xpPerBatch,1.05);
 assert.equal(a.character!.gold-sa.character!.gold,5*smelt.gold);assert.deepEqual(pa.inputsPerBatch,pb.inputsPerBatch);assert.deepEqual(pa.outputPerBatch,pb.outputPerBatch);
 assert.deepEqual(processingRefund(pa),processingRefund(pb));assert.deepEqual(normalizeProcessingBatch(JSON.parse(JSON.stringify(pa)),smelt.id),pa);
 const reward=previewProcessingReward(sa,pa.cycleSeconds*5+.001);assert.equal(reward.craftingActions,5);assert.equal(reward.items[0].quantity,smelt.output.quantity*5);assert.equal(reward.xp,Math.floor(pa.xpPerBatch*5+1e-9));
});
check('Dreadguard brewing uses snapshotted XP and duration',()=>{
 const r=ALCHEMY_RECIPES[0],a=funded('DREADGUARD',r.inputs),b=funded('IRONWARDEN',r.inputs);
 const sa=startAlchemyBatch(a,r.id,5,NOW),sb=startAlchemyBatch(b,r.id,5,NOW),ba=sa.activity!.brew!,bb=sb.activity!.brew!;
 near(bb.cycleSeconds/ba.cycleSeconds,1.03);near(ba.xpPerBatch/bb.xpPerBatch,1.05);
 assert.equal(a.character!.gold-sa.character!.gold,5*r.gold);assert.deepEqual(alchemyRefund(ba),alchemyRefund(bb));
 assert.deepEqual(normalizeAlchemyBatch(JSON.parse(JSON.stringify(ba)),r.id),ba);
 const reward=previewAlchemyReward(sa,ba.cycleSeconds*5+.001);assert.equal(reward.craftingActions,5);assert.equal(reward.items[0].quantity,5);assert.equal(reward.xp,Math.floor(5*ba.xpPerBatch+1e-9));
});
check('saved batch rates are not retroactively recalculated',()=>{
 const r=ALCHEMY_RECIPES[0],s=startAlchemyBatch(funded('DREADGUARD',r.inputs),r.id,2,NOW),before=s.activity!.brew!;
 const restored=normalizeSave(JSON.parse(JSON.stringify(s)));near(restored.activity!.brew!.cycleSeconds,before.cycleSeconds);near(restored.activity!.brew!.xpPerBatch,before.xpPerBatch);
 const legacy={...before,cycleSeconds:r.seconds,xpPerBatch:r.xp};assert.deepEqual(normalizeAlchemyBatch(legacy,r.id),legacy);
});
const gemFamily=MOBILE_GEM_FAMILIES_V1.find(row=>row.kind==='stat')!.familyId;
const refine=gemRefineRecipeV1(gemRefineRecipeIdV1(gemFamily,1))!;
check('gem refinement includes affinity once in duration and XP',()=>{
 const s=funded('HEXWEAVER',refine.inputs),pace=professionActionPace(s,refine,'forge'),result=startGemRefinement(s,refine.id,NOW);
 assert.equal(result.seconds,Math.ceil(refine.seconds/1.03));near(result.job.xpPerCraft!,refine.xp*1.05);near(result.seconds,pace.cycleSeconds);
 assert.equal(s.character!.gold-result.state.character!.gold,refine.gold);assert.deepEqual(result.job.reservedInputs,refine.inputs);
 const stored=normalizeEquipmentCraftingQueue(JSON.parse(JSON.stringify([result.job])))[0];
 for(const key of ['id','recipeId','ownerCharacterId','startedAtMs','completesAtMs','xpPerCraft','reservedGold'] as const)assert.equal(stored[key],result.job[key]);
 assert.deepEqual(stored.skillAffinity,result.job.skillAffinity);assert.deepEqual(stored.reservedInputs,result.job.reservedInputs);
});
check('two fractional gem XP claims total the full award',()=>{
 let s=funded('HEXWEAVER',refine.inputs);const before=s.skills.find(row=>row.skillId==='enchanting')!.xp;
 const a=startGemRefinement(s,refine.id,NOW),b=startGemRefinement(a.state,refine.id,NOW+1);s=b.state;
 s=claimForgeJob(s,a.job.id,a.job.completesAtMs+1,.9).state;s=claimForgeJob(s,b.job.id,b.job.completesAtMs+1,.9).state;
 assert.equal(s.skills.find(row=>row.skillId==='enchanting')!.xp-before,189);
 near(s.rewardRemainders![affinityXpRemainderKey(s.character!.id,'enchanting')],0);
 throws(()=>claimForgeJob(s,a.job.id,a.job.completesAtMs+2,.9));
});
check('claiming another character’s forge job never changes owner or bonus',()=>{
 let s=funded('HEXWEAVER',refine.inputs),other=fresh('RAVAGER');s.otherCharacters=[rosterEntry(other)];
 const started=startGemRefinement(s,refine.id,NOW),ownerXp=s.skills.find(row=>row.skillId==='enchanting')!.xp;
 const switched=projectCharacter(started.state,other.character!.id),result=claimForgeJob(switched,started.job.id,started.job.completesAtMs+1,.9).state;
 assert.equal(result.character!.id,other.character!.id);assert.equal(result.skills.find(row=>row.skillId==='enchanting')!.xp,0);
 assert.equal(result.otherCharacters!.find(row=>row.character.id===s.character!.id)!.skills.find(row=>row.skillId==='enchanting')!.xp-ownerXp,94);
 near(result.rewardRemainders![affinityXpRemainderKey(s.character!.id,'enchanting')],.5);
});
check('queued jobs preserve rates through reordering and save',()=>{
 let s=funded('HEXWEAVER',refine.inputs);const jobs=[],capacity=equipmentCraftSlotBreakdown(s).capacity;
 for(let i=0;i<capacity+2;i++){const result=startGemRefinement(s,refine.id,NOW+i);s=result.state;jobs.push(result.job)}
 assert.ok(jobs[capacity].startedAtMs>NOW+capacity);s=moveWaitingEquipmentCraft(s,jobs[capacity+1].id,'up',NOW+capacity+3);
 const queue=normalizeEquipmentCraftingQueue(JSON.parse(JSON.stringify(s.account.equipmentCraftingQueue)));
 for(const job of queue){near(job.completesAtMs-job.startedAtMs,Math.ceil(refine.seconds/1.03)*1000);near(job.xpPerCraft!,94.5)}
});
check('legacy forge jobs receive no retroactive affinity',()=>{
 const base=funded('HEXWEAVER',refine.inputs),started=startGemRefinement(base,refine.id,NOW);
 const job={...started.job,xpPerCraft:undefined,skillAffinity:undefined,completesAtMs:NOW+refine.seconds*1000};
 const s={...started.state,account:{...started.state.account,equipmentCraftingQueue:[job]}};
 const result=claimForgeJob(s,job.id,job.completesAtMs+1,.9).state;
 assert.equal(result.skills.find(row=>row.skillId==='enchanting')!.xp-base.skills.find(row=>row.skillId==='enchanting')!.xp,refine.xp);
});
check('active cancellation still refunds materials and 90% Gold',()=>{
 const base=funded('HEXWEAVER',refine.inputs),started=startGemRefinement(base,refine.id,NOW),cancelled=cancelEquipmentCraft(started.state,started.job.id,NOW+1000).state;
 assert.equal(cancelled.character!.gold,base.character!.gold-refine.gold+Math.floor(refine.gold*.9));
 for(const i of refine.inputs)assert.equal(cancelled.inventory.stacks.find(row=>row.itemId===i.itemId)!.quantity,base.inventory.stacks.find(row=>row.itemId===i.itemId)!.quantity);
});
check('gem combination follows the same formula',()=>{
 const r=gemCombineRecipeV1(gemCombineRecipeIdV1(gemFamily,1))!,s=funded('HEXWEAVER',r.inputs),result=startGemCombine(s,r.id,NOW);
 assert.equal(result.seconds,Math.ceil(r.seconds/1.03));near(result.job.xpPerCraft!,r.xp*1.05);assert.deepEqual(result.job.reservedInputs,r.inputs);
});
for(const c of ['IRONWARDEN','BASTION','KNIFE_DANCER'] as const)check(c+' equipment craft uses the recipe profession',()=>{
 const skillId=CLASS_SKILL_AFFINITIES[c],r=RECIPES.find(row=>row.skillId===skillId&&isTimedEquipmentRecipe(row)&&(!row.classId||row.classId===c));
 assert.ok(r,'matching class has a timed equipment recipe');const s=funded(c,r!.inputs),result=startEquipmentCraft(s,r!.id,NOW),pace=professionActionPace(s,r!,'forge');
 assert.equal(result.seconds,equipmentCraftDurationSeconds(s,r!.id));near(result.seconds,pace.cycleSeconds);near(result.job.xpPerCraft!,pace.xpPerAction);assert.equal(result.job.skillAffinity?.skillId,skillId);
});
check('instant recipes grant XP but invent no timer',()=>{
 const r=RECIPES.find(row=>row.noviceSetId&&row.classId==='IRONWARDEN'&&!row.requiresCraftedItemId)!;
 const base=funded('IRONWARDEN',r.inputs),pace=professionActionPace(base,r,'instant'),result=craftRecipe(base,r.id,NOW);
 assert.equal(pace.cycleSeconds,0);assert.equal(result.skills.find(row=>row.skillId===r.skillId)!.xp-base.skills.find(row=>row.skillId===r.skillId)!.xp,Math.floor(pace.xpPerAction+1e-9));
 assert.equal(base.character!.gold-result.character!.gold,r.gold);
});
check('gem research XP uses only the matching affinity',()=>{assert.equal(gemResearchXpV1(fresh('HEXWEAVER')),630);assert.equal(gemResearchXpV1(fresh('STONECALLER')),600)});
check('forge affinity cannot overrun maximum skill XP',()=>{
 const base=funded('HEXWEAVER',refine.inputs);base.skills=base.skills.map(row=>row.skillId==='enchanting'?{...row,xp:totalXpAtLevel(100)-1}:row);
 const started=startGemRefinement(base,refine.id,NOW),result=claimForgeJob(started.state,started.job.id,started.job.completesAtMs+1,.9).state;
 assert.equal(result.skills.find(row=>row.skillId==='enchanting')!.xp,totalXpAtLevel(100));assert.equal(result.rewardRemainders![affinityXpRemainderKey(base.character!.id,'enchanting')],0);
});
check('affinity does not enter generic account/combat multipliers',()=>{
 for(const c of CLASSES){const s=fresh(c.id);assert.deepEqual(characterPermanentMultipliers(s),characterPermanentMultipliers(fresh('IRONWARDEN')));
 const combat=startCombat(s,'MOSS_RAT',NOW),before=effectiveStats(combat);const pretend={...combat,activity:{...combat.activity!,skillAffinity:captureSkillAffinity(s,CLASS_SKILL_AFFINITIES[c.id])}};
 assert.deepEqual(effectiveStats(pretend),before);assert.deepEqual(previewActivityReward(pretend,NOW+60000),previewActivityReward(combat,NOW+60000));}
});
check('shared game command captures affinity rather than taking client multipliers',()=>{
 const s=fresh('RAVAGER'),node=GATHERING.find(row=>row.skillId==='woodcutting'&&row.unlockLevel===1)!;s.currentRegionId=node.zoneId;
 const result=executeGameCommand(s,{type:'start',args:{kind:'gathering',id:node.id}},NOW);assert.equal(result.state.activity!.skillAffinity?.speedMultiplier,1.03);
});
check('Hexweaver armor crafting does not gain an Enchanting bonus',()=>{
 const r=RECIPES.find(row=>row.classId==='HEXWEAVER'&&isTimedEquipmentRecipe(row))!;assert.ok(r);assert.notEqual(r.skillId,'enchanting');
 const s=funded('HEXWEAVER',r.inputs),result=startEquipmentCraft(s,r.id,NOW),pace=professionActionPace(s,r,'forge');assert.equal(result.job.skillAffinity,undefined);near(pace.affinity.xpMultiplier,1);near(pace.affinity.speedMultiplier,1);near(result.job.xpPerCraft!,pace.xpPerAction);
});
console.log(`Class affinity checks: ${passes} passed, ${failures.length} failed`);
if(failures.length)throw new Error(failures.join('\n'));
