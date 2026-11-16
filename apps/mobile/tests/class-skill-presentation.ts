import {CLASS_SKILLS} from '../src/content/class-skills';
import {createCharacter,newGame} from '../src/core/game';
import {characterClassEffects,characterClassSkills,MAX_CLASS_SKILL_XP} from '../src/core/class-skills';
import {classSkillBonuses,classSkillBonusLabel} from '../src/core/class-skill-presentation';
import {totalXpAtLevel} from '../src/core/progression';
import type {ClassId} from '../src/core/types';

function ok(value:unknown,message:string):asserts value{if(!value)throw new Error(message);}
const near=(a:number,b:number)=>Math.abs(a-b)<1e-9;
for(const classId of Object.keys(CLASS_SKILLS) as ClassId[]){
 const base=createCharacter(newGame(1000),classId).character!;
 for(const level of [1,2,50,100]){
  const character={...base,classSkills:characterClassSkills(base).map(row=>({...row,xp:totalXpAtLevel(level)}))};
  const bonuses=CLASS_SKILLS[classId].flatMap(skill=>classSkillBonuses(character,skill.id));
  const actual=characterClassEffects(character);
  for(const stat of ['attack','hp','defense','accuracy','evasion','haste','ward','penetration','potency','classHealing'] as const){
   const sum=bonuses.filter(row=>row.stat===stat).reduce((sum,row)=>sum+row.currentPercent,0);
   const baseline=['attack','hp','defense','classHealing'].includes(stat)?1:0;
   ok(near(sum,(actual[stat]-baseline)*100),`${classId} level ${level}: displayed ${stat} matches combat`);
  }
  for(const bonus of bonuses)ok(bonus.currentPercent>=0&&bonus.currentPercent<=bonus.maxPercent,`${classId}: bonuses remain bounded`);
 }
 const max={...base,classSkills:characterClassSkills(base).map(row=>({...row,xp:MAX_CLASS_SKILL_XP}))};
 for(const skill of CLASS_SKILLS[classId])for(const bonus of classSkillBonuses(max,skill.id))ok(near(bonus.currentPercent,bonus.maxPercent),'Mastered bonus equals cap');
 ok(classSkillBonuses(base,'invalid').length===0,'Unknown skills have no bonus');
 if(classId==='KNIFE_DANCER'){
  const precision=classSkillBonuses(max,'precision');
  ok(precision.map(bonus=>bonus.stat).join(',')==='accuracy,evasion','Precision popup shows Accuracy and Evasion instead of Attack and Defense');
  ok(near(precision[0].maxPercent,3)&&near(precision[1].maxPercent,6),'Precision popup shows the exact level-100 combat bonuses');
 }
}
// Audit all 18 class-skill slots (including class-dependent shared skill names).
// These are the bonuses the live passive combat engine currently grants; tooltips
// must read those same values, not a separate hand-written flavor description.
const expectedEffects:Record<ClassId,readonly [string,string]>={
 IRONWARDEN:['defense:8','ward:5'],
 BASTION:['defense:10','ward:6'],
 DREADGUARD:['attack:7','ward:5'],
 DAWNKEEPER:['attack:4,classHealing:10','hp:6,ward:4'],
 WAYFINDER:['attack:7','accuracy:4,haste:2'],
 RAVAGER:['attack:7','attack:2,penetration:5'],
 HEXWEAVER:['attack:7','attack:2,potency:5'],
 KNIFE_DANCER:['attack:3,haste:4','accuracy:3,evasion:6'],
 STONECALLER:['attack:4,classHealing:8','defense:8,ward:3'],
};
let auditedSlots=0;
for(const classId of Object.keys(CLASS_SKILLS) as ClassId[]){
 const base=createCharacter(newGame(1000),classId).character!;
 const max={...base,classSkills:characterClassSkills(base).map(row=>({...row,xp:MAX_CLASS_SKILL_XP}))};
 CLASS_SKILLS[classId].forEach((definition,index)=>{
  const actual=classSkillBonuses(max,definition.id)
   .map(bonus=>bonus.stat+':'+Number(bonus.maxPercent.toFixed(2))).join(',');
  ok(actual===expectedEffects[classId][index],classId+'/'+definition.name+' passive effect matches live skill audit: '+actual);
  auditedSlots++;
 });
}
ok(auditedSlots===18,'All 18 class skill slots audited, including duplicate skill IDs across classes');

ok(classSkillBonusLabel(6.999999999999995)==='+7%','No floating point artifacts in labels');
ok(classSkillBonusLabel(7/99)==='+0.07%','Small early-level gains stay visible');
const fs=require('fs') as {readFileSync:(path:string,encoding:string)=>string;existsSync:(path:string)=>boolean};
const assets=fs.readFileSync('src/theme/class-skill-assets.ts','utf8');
for(const id of new Set(Object.values(CLASS_SKILLS).flat().map(row=>row.id))){
 ok(assets.includes(`${id}:require('../../assets/class-skill-icons-v1/${id}.webp')`),'Dedicated registry entry for '+id);
 ok(fs.existsSync(`assets/class-skill-icons-v1/${id}.webp`),'Runtime icon exists for '+id);
}
const screen=fs.readFileSync('src/screens/SkillsScreen.tsx','utf8');
ok(screen.includes('classSkillIcon(card.id.slice(6))')&&!screen.includes('classEmblemIconArtwork'),'Skills cards use individual skill art, not duplicate class emblems');
ok(screen.includes('classSkillBonuses')&&screen.includes('AT LEVEL 100'),'Skill popup exposes runtime-backed bonus values');
ok(screen.includes("selectedBonuses.map(bonus=>gl(bonus.label)).join(' · ')")&&!screen.includes('{gl(selectedDefinition.theme)}'),
 'Class skill popup summary always uses runtime stat labels, not potentially mismatched authored flavor text');
console.log('PASS: all nine classes show accurate skill bonuses, early-level gains and dedicated skill artwork');
