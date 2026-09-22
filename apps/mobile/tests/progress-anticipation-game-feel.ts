import {contractAnticipation,forgeAnticipation,masteryMilestoneAnticipation,pityAnticipation,progressAnticipation} from '../src/core/progress-anticipation';

const fs=require('fs') as {readFileSync:(path:string,encoding:string)=>string};
function ok(value:unknown,message:string){if(!value)throw new Error(message)}
function equal(actual:unknown,expected:unknown,message:string){if(actual!==expected)throw new Error(`${message}: ${String(actual)} !== ${String(expected)}`)}

equal(progressAnticipation(50,100).band,'none','ordinary progress must stay quiet');
equal(progressAnticipation(85,100).band,'near','80%+ progress should enter anticipation');
equal(progressAnticipation(98,100).band,'urgent','very high progress should enter final stretch');
equal(progressAnticipation(9,10,{integer:true}).band,'next','one discrete step remaining should be explicit');

equal(contractAnticipation(8,10).band,'near','contracts in the final 20% should become visible');
equal(contractAnticipation(9,10).band,'next','one contract progress remaining should be explicit');
equal(forgeAnticipation(45,600).band,'near','Forge jobs under one minute should surface finishing soon');
equal(forgeAnticipation(10,600).band,'urgent','Forge jobs in the last seconds should say almost done');

const mastery=masteryMilestoneAnticipation(497);
equal(mastery?.rank,20,'mastery anticipation must target the next meaningful milestone');
equal(mastery?.remaining,3,'mastery milestone must expose exact kills remaining');
equal(mastery?.label,'elite knowledge','rank-20 mastery anticipation must describe the unlock');
equal(mastery?.band,'near','five or fewer kills to a meaningful mastery milestone should surface');

equal(pityAnticipation(7,8).band,'next','one pity miss from guarantee must identify the next eligible clear');
equal(pityAnticipation(54,60).band,'near','large pity tracks should surface inside their final ten percent');

const skills=fs.readFileSync('src/screens/SkillsScreen.tsx','utf8');
const forge=fs.readFileSync('src/components/EquipmentCraftQueuePanel.tsx','utf8');
const quests=fs.readFileSync('src/screens/QuestScreen.tsx','utf8');
const encounters=fs.readFileSync('src/components/RegionEncounterList.tsx','utf8');
const gems=fs.readFileSync('src/components/GemCodexModal.tsx','utf8');

ok(skills.includes('FINAL STRETCH')&&skills.includes('ALMOST THERE'),'skill detail must tell players when the next level is close');
ok(skills.includes('progressAnticipation(p.current,p.need'),'Skills hub cards must use the same anticipation model');
ok(forge.includes('FINISHING SOON')&&forge.includes('ALMOST DONE'),'Forge must distinguish finishing-soon from almost-done jobs');
ok(forge.includes('forgeAnticipation(job.remainingSeconds,job.durationSeconds)'),'Forge cues must derive from job timing rather than fixed UI state');
ok(quests.includes('NEXT PROGRESS COMPLETES IT')&&quests.includes('ALMOST COMPLETE'),'contracts must make final progress legible');
ok(encounters.includes('MASTERY MILESTONE CLOSE')&&encounters.includes('NEXT KILL UNLOCKS'),'monster Mastery must anticipate meaningful threshold unlocks');
ok(encounters.includes('masteryMilestone.label'),'Mastery cue must describe what the milestone unlocks');
ok(gems.includes('NEXT ELIGIBLE CLEAR')&&gems.includes('to guaranteed drop'),'gem pity must explain the guarantee horizon');
ok(gems.includes('ONE CLEAR LEFT'),'weekly Resonance Cache must call out its final required clear');

console.log('PASS near-completion anticipation stays quiet normally and highlights meaningful final stretches');
