import {MONSTERS} from '../src/content/monsters';
import {REGIONAL_STORY_LEADS,regionalStoryLeads,nextRegionalStoryLead} from '../src/core/regional-story-leads';
import {createCharacter,newGame} from '../src/core/game';

function ok(value:unknown,message:string){if(!value)throw new Error(message)}
ok(REGIONAL_STORY_LEADS.length===9,'Expected three story leads across three post-Asterfall regions');
for(const regionId of ['SUNSCAR','FROSTMARCH','ASHLANDS'] as const){
 const rows=REGIONAL_STORY_LEADS.filter(row=>row.regionId===regionId);
 ok(rows.length===3,`${regionId} needs three story leads`);
 ok(rows.every((row,index)=>row.chapter===index+1),`${regionId} chapter numbers must remain ordered`);
 ok(rows.every(row=>MONSTERS.some(monster=>monster.id===row.targetMonsterId&&!monster.boss)),`${regionId} leads must target live regular monsters`);
 ok(rows[0].minLevel<rows[1].minLevel&&rows[1].minLevel<rows[2].minLevel,`${regionId} lead levels must escalate`);
}
let state=createCharacter(newGame(1),'WAYFINDER','Regional Tester');
state={...state,character:{...state.character!,level:40}};
const sunscar=regionalStoryLeads('SUNSCAR',state);
ok(sunscar[0].status==='available'&&sunscar[1].status==='available'&&sunscar[2].status==='available','Level 40 should expose all authored Sunscar leads');
ok(nextRegionalStoryLead('SUNSCAR',state)?.id==='SUNSCAR_01','Next lead should start at the first unresolved chapter');
state={...state,character:{...state.character!,monsterMasteryPoints:{SUNSCAR_SCORPION:500}}};
ok(regionalStoryLeads('SUNSCAR',state)[0].status==='mastered','Mastery 20 should mark the first lead mastered');
ok(nextRegionalStoryLead('SUNSCAR',state)?.id==='SUNSCAR_02','Next lead should advance after the first hunt is mastered');
const ashlands=regionalStoryLeads('ASHLANDS',state);
ok(ashlands.every(row=>row.status==='locked'),'Ashlands leads must remain level-gated for a level-40 character');
console.log('PASS: post-Asterfall Regional Story Leads validate');
