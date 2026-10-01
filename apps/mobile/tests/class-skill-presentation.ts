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
  for(const stat of ['attack','hp','defense'] as const){
   const sum=bonuses.filter(row=>row.stat===stat).reduce((sum,row)=>sum+row.currentPercent,0);
   ok(near(sum,(actual[stat]-1)*100),`${classId} level ${level}: displayed ${stat} matches combat`);
  }
  for(const bonus of bonuses)ok(bonus.currentPercent>=0&&bonus.currentPercent<=bonus.maxPercent,`${classId}: bonuses remain bounded`);
 }
 const max={...base,classSkills:characterClassSkills(base).map(row=>({...row,xp:MAX_CLASS_SKILL_XP}))};
 for(const skill of CLASS_SKILLS[classId])for(const bonus of classSkillBonuses(max,skill.id))ok(near(bonus.currentPercent,bonus.maxPercent),'Mastered bonus equals cap');
 ok(classSkillBonuses(base,'invalid').length===0,'Unknown skills have no bonus');
}
ok(classSkillBonusLabel(6.999999999999995)==='+7%','No floating point artifacts in labels');
ok(classSkillBonusLabel(7/99)==='+0.07%','Small early-level gains stay visible');
const fs=require('fs') as {readFileSync:(path:string,encoding:string)=>string;existsSync:(path:string)=>boolean};
const assets=fs.readFileSync('src/theme/class-skill-assets.ts','utf8');
for(const id of new Set(Object.values(CLASS_SKILLS).flat().map(row=>row.id))){
 ok(assets.includes(`${id}:require('../../assets/class-skill-icons-v1/${id}.png')`),'Dedicated registry entry for '+id);
 ok(fs.existsSync(`assets/class-skill-icons-v1/${id}.png`),'Runtime icon exists for '+id);
}
const screen=fs.readFileSync('src/screens/SkillsScreen.tsx','utf8');
ok(screen.includes('classSkillIcon(card.id.slice(6))')&&!screen.includes('classEmblemIconArtwork'),'Skills cards use individual skill art, not duplicate class emblems');
ok(screen.includes('classSkillBonuses')&&screen.includes('AT LEVEL 100'),'Skill popup exposes runtime-backed bonus values');
console.log('PASS: all nine classes show accurate skill bonuses, early-level gains and dedicated skill artwork');
