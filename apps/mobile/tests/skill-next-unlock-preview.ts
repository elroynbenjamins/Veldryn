import {nextSkillUnlockLabel,nextSkillUnlockPreview} from '../src/core/skill-next-unlock';

const fs=require('fs') as {readFileSync:(path:string,encoding:string)=>string};
function ok(value:unknown,message:string){if(!value)throw new Error(message)}
function equal(actual:unknown,expected:unknown,message:string){if(actual!==expected)throw new Error(`${message}: ${String(actual)} !== ${String(expected)}`)}

const mining=nextSkillUnlockPreview('mining',7);
equal(mining?.level,8,'Mining level 7 must preview the real level-8 authored activity');
ok(mining?.names.includes('Aster-Iron Vein'),'Mining preview must name the authored Aster-Iron unlock');
equal(mining?.levelsAway,1,'next-level unlock must say one level away');
equal(nextSkillUnlockLabel(mining!),'NEXT ACTIVITY','single gathering unlock must use the activity label');

const smithing=nextSkillUnlockPreview('smithing',1);
ok(smithing&&smithing.level>1&&smithing.names.length>0,'Smithing must preview its next authored recipe level');
equal(nextSkillUnlockLabel(smithing!),(smithing?.names.length??0)>1?'NEXT RECIPES':'NEXT RECIPE','Smithing preview label must match same-level recipe count');

const faith=nextSkillUnlockPreview('faith',1);
ok(faith&&faith.level>1&&faith.names.length>0,'Faith must preview the next tier or blessing');
equal(nextSkillUnlockLabel(faith!),'NEXT FAITH UNLOCK','Faith uses a distinct progression label');

equal(nextSkillUnlockPreview('mining',100),undefined,'maxed skills must not promise future content');
equal(nextSkillUnlockPreview('hunting',20),undefined,'skills without authored unlock content must stay quiet');

const skills=fs.readFileSync('src/screens/SkillsScreen.tsx','utf8');
ok(skills.includes('nextSkillUnlockPreview(skillId,skill.level)'),'Skill detail must derive preview from current authored progression');
ok(skills.includes('nextUnlock.names.join'),'Skill detail must name the exact upcoming content');
ok(skills.includes('levels away'),'farther unlocks must state their level distance');
ok(skills.includes("'Next level'"),'a one-level-away unlock must use the more motivating next-level copy');
ok(skills.includes('NEXT ACTIVITY')===false,'labels should come from the shared helper rather than hard-coded screen copies');

console.log('PASS skill detail previews the next authored activity, recipe or Faith unlock without inventing content');
