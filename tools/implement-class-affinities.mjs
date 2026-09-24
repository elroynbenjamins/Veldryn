import {readFileSync,writeFileSync,mkdirSync,readdirSync} from 'node:fs';
import path from 'node:path';

// One-time, branch-scoped source integration. Every replacement is checked before any file is written.
const pending=new Map();
const read=p=>pending.has(p)?pending.get(p):readFileSync(p,'utf8');
function patch(p,from,to,count=1){
 const source=read(p),found=source.split(from).length-1;
 if(found!==count){if(found===0&&source.includes(to)){console.log('Already applied:',p,from.slice(0,55));return;}throw new Error(`${p}: expected ${count} exact matches, found ${found}: ${from.slice(0,120)}`);}
 pending.set(p,source.split(from).join(to));
}
function addImport(p,line){if(!read(p).includes(line))pending.set(p,line+'\n'+read(p));}
const core='apps/mobile/src/core/',ui='apps/mobile/src/components/';
addImport(core+'game.ts',"import {captureSkillAffinity,activeSkillAffinity,affinityXpRemainderKey,settleAffinitySkillXp} from './class-skill-affinities';");
addImport(core+'game.ts',"import {professionActionPace} from './profession-action-pace';");
patch(core+'types.ts','export interface ActiveActivity { kind:',"export interface ActiveActivity { skillAffinity?:import('./class-skill-affinities').SkillAffinitySnapshot; kind:");
patch(core+'types.ts','export interface EquipmentCraftJob{\n',"export interface EquipmentCraftJob{\n  /** XP and affinity are captured for the crafting owner when inputs are reserved. */\n  xpPerCraft?:number;\n  skillAffinity?:import('./class-skill-affinities').SkillAffinitySnapshot;\n");
patch(core+'game.ts','const pacing=gatheringPacing(state,g),mastery=professionMasteryMultipliers(g.id,state.account.professionMasteryByAction?.[g.id]);','const pacing=gatheringPacing(state,g),mastery=professionMasteryMultipliers(g.id,state.account.professionMasteryByAction?.[g.id]),affinity=activeSkillAffinity(state,g.skillId);');
patch(core+'game.ts','/(multipliers.gatheringSpeedMultiplier*specialtySpeed*mastery.speed);','/(multipliers.gatheringSpeedMultiplier*specialtySpeed*mastery.speed*affinity.speedMultiplier);');
patch(core+'game.ts','    const rawXp=Math.floor(actions*g.xp*effect.xpMultiplier*(method?.xpMultiplier??1)*multipliers.skillXpMultiplier*mastery.xp);\n    const xp=Math.min(Math.max(0,totalXpAtLevel(100)-(skill?.xp??0)),rawXp);',
 '    const xpKey=affinityXpRemainderKey(state.character.id,g.skillId);\n    const gain=settleAffinitySkillXp(actions*g.xp*effect.xpMultiplier*(method?.xpMultiplier??1)*multipliers.skillXpMultiplier*mastery.xp*affinity.xpMultiplier,state.rewardRemainders?.[xpKey],totalXpAtLevel(100)-(skill?.xp??0));\n    const xp=gain.xp;');
patch(core+'game.ts','nextRewardRemainders:{...(state.rewardRemainders??{}),[g.itemId]:Math.max(0,quantityFloat-quantity)}','nextRewardRemainders:{...(state.rewardRemainders??{}),[xpKey]:gain.remainder,[g.itemId]:Math.max(0,quantityFloat-quantity)}');
patch(core+'game.ts','activity:{kind:g.skillId,targetId,','activity:{skillAffinity:captureSkillAffinity(state,g.skillId),kind:g.skillId,targetId,');
patch(core+'game.ts',"activity:{kind:'herbalism',targetId,","activity:{skillAffinity:captureSkillAffinity(state,'herbalism'),kind:'herbalism',targetId,");
patch(core+'game.ts','baseXp=Math.floor(r.xp*multipliers.skillXpMultiplier*mastery.xp)',"affinityXpKey=affinityXpRemainderKey(state.character.id,r.skillId),affinityXpGain=settleAffinitySkillXp(professionActionPace(state,r,'instant').xpPerAction,state.rewardRemainders?.[affinityXpKey],totalXpAtLevel(100)-sk.xp),baseXp=affinityXpGain.xp");
patch(core+'game.ts','rewardRemainders:{...(state.rewardRemainders??{}),[masteryKey]:masteryRemainder}','rewardRemainders:{...(state.rewardRemainders??{}),[affinityXpKey]:affinityXpGain.remainder,[masteryKey]:masteryRemainder}');
patch(core+'game.ts','const xp=sk.xp+boosted.xp;','const xp=Math.min(totalXpAtLevel(100),sk.xp+boosted.xp);');

addImport(core+'balance-projection.ts',"import {skillAffinityModifiers,activeSkillAffinity} from './class-skill-affinities';");
patch(core+'balance-projection.ts','export function gatheringBalanceProjection(state:GameState,activity:GatherDef,offlineHours:number):GatheringBalanceProjection{','export function gatheringBalanceProjection(state:GameState,activity:GatherDef,offlineHours:number):GatheringBalanceProjection{\n  const affinity=skillAffinityModifiers(state.character?.classId,activity.skillId);');
patch(core+'balance-projection.ts','  if(!definition)return undefined;','  if(!definition)return undefined;\n  const affinity=activeSkillAffinity(state,definition.skillId);');
patch(core+'balance-projection.ts','/(permanent.gatheringSpeedMultiplier*specialtySpeed*mastery.speed)','/(permanent.gatheringSpeedMultiplier*specialtySpeed*mastery.speed*affinity.speedMultiplier)',2);
patch(core+'balance-projection.ts','permanent.skillXpMultiplier*mastery.xp','permanent.skillXpMultiplier*mastery.xp*affinity.xpMultiplier',3);

for(const name of ['processing.ts','alchemy.ts']){
 addImport(core+name,"import {professionActionPace} from './profession-action-pace';");
 addImport(core+name,"import {captureSkillAffinity,affinityXpRemainderKey} from './class-skill-affinities';");
}
patch(core+'processing.ts','const bonuses=characterPermanentMultipliers(state),mastery=professionMasteryMultipliers(recipe.id,state.account.professionMasteryByAction?.[recipe.id]);',"const bonuses=characterPermanentMultipliers(state),pace=professionActionPace(state,recipe,'batch');");
patch(core+'processing.ts','cycleSeconds:Math.max(1,recipe.seconds/mastery.speed),xpPerBatch:recipe.xp*bonuses.skillXpMultiplier*mastery.xp','cycleSeconds:pace.cycleSeconds,xpPerBatch:pace.xpPerAction');
patch(core+'processing.ts','bonusSnapshot:bonuses,processing','bonusSnapshot:bonuses,skillAffinity:captureSkillAffinity(state,recipe.skillId),processing');
patch(core+'processing.ts','const xpKey=`xp:processing:${processing.skillId}`','const xpKey=activity.skillAffinity?affinityXpRemainderKey(state.character!.id,processing.skillId):`xp:processing:${processing.skillId}`');
patch(core+'alchemy.ts','const bonuses=characterPermanentMultipliers(state),mastery=professionMasteryMultipliers(recipeId,state.account.professionMasteryByAction?.[recipeId]);',"const bonuses=characterPermanentMultipliers(state),pace=professionActionPace(state,recipe,'batch');");
patch(core+'alchemy.ts','cycleSeconds:recipe.seconds/mastery.speed,xpPerBatch:recipe.xp*bonuses.skillXpMultiplier*mastery.xp','cycleSeconds:pace.cycleSeconds,xpPerBatch:pace.xpPerAction');
patch(core+'alchemy.ts','bonusSnapshot:bonuses,brew',"bonusSnapshot:bonuses,skillAffinity:captureSkillAffinity(state,'alchemy'),brew");
patch(core+'alchemy.ts',"xpKey='xp:alchemy'","xpKey=activity.skillAffinity?affinityXpRemainderKey(state.character!.id,'alchemy'):'xp:alchemy'");

addImport(core+'save-normalization.ts',"import {normalizeSkillAffinitySnapshot} from './class-skill-affinities';");
patch(core+'save-normalization.ts','const activity=input.activity?{...input.activity,environment,','const activity=input.activity?{...input.activity,skillAffinity:normalizeSkillAffinitySnapshot(input.activity.skillAffinity),environment,');

const forge=core+'equipment-crafting-queue.ts';
addImport(forge,"import {professionActionPace} from './profession-action-pace';");
addImport(forge,"import {captureSkillAffinity,normalizeSkillAffinitySnapshot,affinityXpRemainderKey,settleAffinitySkillXp} from './class-skill-affinities';");
patch(forge,"import {levelFromXp} from './progression';","import {levelFromXp,totalXpAtLevel} from './progression';");
patch(forge,'      reservedGold:Number.isFinite(Number(row.reservedGold))?',"      xpPerCraft:typeof row.xpPerCraft==='number'&&Number.isFinite(row.xpPerCraft)&&row.xpPerCraft>=0&&row.xpPerCraft<=1000000?row.xpPerCraft:undefined,\n      skillAffinity:normalizeSkillAffinitySnapshot(row.skillAffinity),\n      reservedGold:Number.isFinite(Number(row.reservedGold))?");
patch(forge,'  const mastery=professionMasteryMultipliers(recipe.id,state.account.professionMasteryByAction?.[recipe.id]),speed=Math.max(.1,characterPermanentMultipliers(state).craftingSpeedMultiplier*mastery.speed);\n  return Math.max(1,Math.ceil(recipe.seconds/speed));',"  return professionActionPace(state,recipe,'forge').cycleSeconds;");
patch(forge,'  const mastery=professionMasteryMultipliers(recipe.id,projected.account.professionMasteryByAction?.[recipe.id]),speed=Math.max(.1,characterPermanentMultipliers(projected).craftingSpeedMultiplier*mastery.speed),seconds=Math.max(1,Math.ceil(recipe.seconds/speed)),durationMs=seconds*1000;',"  const seconds=professionActionPace(projected,recipe,'forge').cycleSeconds,durationMs=seconds*1000;",2);
patch(forge,'    reservedGold:recipe.gold,reservedInputs:recipe.inputs.map(input=>({...input})),',"    reservedGold:recipe.gold,reservedInputs:recipe.inputs.map(input=>({...input})),\n    xpPerCraft:professionActionPace(projected,recipe,'forge').xpPerAction,skillAffinity:captureSkillAffinity(projected,recipe.skillId),",3);
patch(forge,"function awardOwnerSkillXp(state:GameState,ownerCharacterId:string,recipe:Pick<Recipe,'id'|'skillId'|'xp'>){\n  const mastery=professionMasteryMultipliers(recipe.id,state.account.professionMasteryByAction?.[recipe.id]),awardXp=Math.max(1,Math.floor(recipe.xp*mastery.xp));\n  const award=(skills:SkillState[])=>skills.map(row=>{\n    if(row.skillId!==recipe.skillId)return row;\n    const xp=row.xp+awardXp;\n    return {...row,xp,level:levelFromXp(xp)};\n  });\n  if(state.character?.id===ownerCharacterId)return {...state,skills:award(state.skills)};\n  return {...state,otherCharacters:(state.otherCharacters??[]).map(entry=>entry.character.id===ownerCharacterId?{...entry,skills:award(entry.skills)}:entry)};\n}",
 "function awardOwnerSkillXp(state:GameState,ownerCharacterId:string,recipe:Pick<Recipe,'id'|'skillId'|'xp'>,job:EquipmentCraftJob){\n  const ownerSkills=state.character?.id===ownerCharacterId?state.skills:state.otherCharacters?.find(entry=>entry.character.id===ownerCharacterId)?.skills;\n  if(!ownerSkills)throw new Error('Crafting owner is no longer available');\n  const skill=ownerSkills.find(row=>row.skillId===recipe.skillId);\n  if(!skill)throw new Error('Crafting owner skill is missing');\n  const mastery=professionMasteryMultipliers(recipe.id,state.account.professionMasteryByAction?.[recipe.id]);\n  const rawXp=job.xpPerCraft??Math.max(1,Math.floor(recipe.xp*mastery.xp));\n  const key=affinityXpRemainderKey(ownerCharacterId,recipe.skillId),gain=settleAffinitySkillXp(rawXp,state.rewardRemainders?.[key],totalXpAtLevel(100)-skill.xp);\n  const next={...state,rewardRemainders:{...(state.rewardRemainders??{}),[key]:gain.remainder}};\n  const award=(skills:SkillState[])=>skills.map(row=>{if(row.skillId!==recipe.skillId)return row;const xp=row.xp+gain.xp;return {...row,xp,level:levelFromXp(xp)};});\n  if(state.character?.id===ownerCharacterId)return {...next,skills:award(state.skills)};\n  return {...next,otherCharacters:(state.otherCharacters??[]).map(entry=>entry.character.id===ownerCharacterId?{...entry,skills:award(entry.skills)}:entry)};\n}");
patch(forge,'awardOwnerSkillXp(next,job.ownerCharacterId,equipmentRecipe);','awardOwnerSkillXp(next,job.ownerCharacterId,equipmentRecipe,job);');
patch(forge,'awardOwnerSkillXp(next,job.ownerCharacterId,gemRecipe!);','awardOwnerSkillXp(next,job.ownerCharacterId,gemRecipe!,job);');

addImport(core+'gem-progression-v1.ts',"import {skillAffinityModifiers} from './class-skill-affinities';");
patch(core+'gem-progression-v1.ts','export function researchEffectGemV1(state:GameState,familyId:string){',"export function gemResearchXpV1(state:GameState){return Math.floor(GEM_RESEARCH_V1.xp*skillAffinityModifiers(state.character?.classId,'enchanting').xpMultiplier+1e-9);}\nexport function researchEffectGemV1(state:GameState,familyId:string){");
patch(core+'gem-progression-v1.ts','currentXp+GEM_RESEARCH_V1.xp','currentXp+gemResearchXpV1(state)');

addImport(ui+'RecipeCard.tsx',"import {professionActionPace} from '../core/profession-action-pace';");
patch(ui+'RecipeCard.tsx','effectiveXpPerCraft=Math.max(1,Math.floor(recipe.xp*permanent.skillXpMultiplier*mastery.xp))',"effectiveXpPerCraft=professionActionPace(state,recipe,alchemy||processing?'batch':timed?'forge':'instant').xpPerAction");
patch(ui+'RecipeCard.tsx','paceCycle=alchemy||processing?recipe.seconds/mastery.speed:timed?duration:0',"paceCycle=alchemy||processing?professionActionPace(state,recipe,'batch').cycleSeconds:timed?duration:0");
patch(ui+'RecipeCard.tsx','effectiveXp=effectiveXpPerCraft*multiplier;','effectiveXp=Math.floor(effectiveXpPerCraft*multiplier+1e-9);');
addImport(ui+'EnchantingRefineryPanel.tsx',"import {professionActionPace} from '../core/profession-action-pace';");
patch(ui+'EnchantingRefineryPanel.tsx','availableGemRefinementsV1,availableGemResearchV1,GEM_RESEARCH_V1','availableGemRefinementsV1,availableGemResearchV1,GEM_RESEARCH_V1,gemResearchXpV1');
patch(ui+'EnchantingRefineryPanel.tsx','const r=row.recipe,reagents=',"const r=row.recipe,pace=professionActionPace(state,r,'forge'),reagents=");
patch(ui+'EnchantingRefineryPanel.tsx','{r.xp.toLocaleString()} Enchanting XP · {duration(r.seconds)}','{Math.floor(pace.xpPerAction+1e-9).toLocaleString()} Enchanting XP · {duration(pace.cycleSeconds)}');
patch(ui+'EnchantingRefineryPanel.tsx','+{GEM_RESEARCH_V1.xp} XP','+{gemResearchXpV1(state)} XP');
addImport(ui+'creation/ClassHeroCarousel.tsx',"import {ClassSkillAffinityNote} from '../ClassSkillAffinityNote';");
patch(ui+'creation/ClassHeroCarousel.tsx','<Text style={s.description}>{selected.description}</Text>','<Text style={s.description}>{selected.description}</Text>\n    <ClassSkillAffinityNote classId={selected.id} compact/>');
addImport('apps/mobile/src/screens/SkillsScreen.tsx',"import {ClassSkillAffinityNote} from '../components/ClassSkillAffinityNote';");
patch('apps/mobile/src/screens/SkillsScreen.tsx','<SkillHero state={state} skillId={initialSkill} kind={detailKind}/>','<SkillHero state={state} skillId={initialSkill} kind={detailKind}/>\n    <ClassSkillAffinityNote classId={state.character?.classId} skillId={initialSkill}/>');

const pkgPath='apps/mobile/package.json',pkg=JSON.parse(read(pkgPath));
pkg.scripts['test:class-affinities']='tsc -p tsconfig.core.json --outDir .affinity-build && node .affinity-build/apps/mobile/tests/class-skill-affinities.js';
pending.set(pkgPath,JSON.stringify(pkg,null,2)+'\n');
pending.set('docs/CLASS_SKILL_AFFINITIES.md','# Class skill affinities\n\nAccepted implementation: +5% profession XP per action and +3% action speed.\n\nIronwarden/Bastion: Smithing; Dreadguard: Alchemy; Wayfinder: Fishing; Ravager: Woodcutting; Hexweaver: Enchanting; Knife Dancer: Tailoring; Dawnkeeper: Herbalism; Stonecaller: Mining.\n\nOne character-bound affinity, no account stacking, combat XP, combat haste, extra materials, quality chances, exclusive recipes, or non-affinity penalties. Duration is divided by 1.03; forge retains its existing whole-second rounding. Instant actions have no timer to shorten.\n\nNew gathering actions snapshot the affinity. Already-running activities without that snapshot keep their old rates. Processing and alchemy snapshot final cycle length and XP. Forge jobs snapshot XP and final duration at reservation, including queued work; another selected character cannot alter the crafting owner or reward. Legacy forge jobs retain legacy XP calculation and receive no retroactive affinity. Fractional XP uses owner-scoped keys; maximum skill level remains 100.\n\nPotential gathering rates, active rates, recipe cards and gem refinement previews use the same affinity/timing helpers as settlement. The creation carousel adds one compact line; the matching skill detail explains the benefit. No new tutorial popup.\n\nOnline gameplay imports the same executeGameCommand engine. Rebuild its generated Edge Function with tools/build-online.mjs; a code merge alone does not deploy it. No database migration is required.\n\nTests: pnpm --dir apps/mobile test:class-affinities.\n');
for(const [p,text] of pending){mkdirSync(path.dirname(p),{recursive:true});writeFileSync(p,text);console.log('Integrated',p);}
// Surface other callers for review rather than silently changing unrelated systems.
function walk(dir){return readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);}
for(const p of walk('apps/mobile/src').filter(p=>/\.tsx?$/.test(p))){
 const lines=readFileSync(p,'utf8').split('\n');
 lines.forEach((line,i)=>{if(/recipe\.seconds|r\.seconds|\.craftingSpeedMultiplier/.test(line)&&!/content\//.test(p))console.log('TIMING_AUDIT',p+':'+(i+1),line.slice(0,900));});
}
console.log('Class affinity source integration complete.');
