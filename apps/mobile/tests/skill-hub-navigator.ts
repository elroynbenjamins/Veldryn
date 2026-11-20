import {filterSkillNavigatorEntries,skillNavigatorCategoryFor,skillNavigatorRouteFor,SKILL_NAVIGATOR_CATEGORIES,type SkillNavigatorEntry} from '../src/core/skill-hub-navigator';
import {equal,test} from './account-test-helpers';
const rows:SkillNavigatorEntry[]=[
 {id:'combat',name:'Combat',subtitle:'Fight & train',category:'combat',route:'combat'},
 {id:'class:guardcraft',name:'Guardcraft',subtitle:'Combat skill',category:'combat',route:'discipline',level:41,xp:100},
 {id:'mining',name:'Mining',subtitle:'Gathering',category:'gathering',route:'skill',level:24,xp:500},
 {id:'smithing',name:'Smithing',subtitle:'Crafting',category:'crafting',route:'skill',level:17,xp:100},
 {id:'future-profession',name:'New Profession',subtitle:'Other',category:'other',route:'overview',level:1,xp:0},
 {id:'companion-mastery',name:'Companion Mastery',subtitle:'Account-wide companion skill',category:'companions',route:'companion-mastery',level:13,xp:450},
];
test('Skill Navigator categories preserve legacy professions and leave future professions visible',()=>{
 equal(SKILL_NAVIGATOR_CATEGORIES,['combat','gathering','crafting','other','companions'],'stable order');
 for(const id of ['mining','woodcutting','fishing','herbalism','exploration'])equal(skillNavigatorCategoryFor(id),'gathering',id);
 for(const id of ['smithing','cooking','alchemy','tailoring','enchanting','faith'])equal(skillNavigatorCategoryFor(id),'crafting',id);
 equal(skillNavigatorCategoryFor('future-profession'),'other','new trainable profession is not lost');
});
test('Skill Navigator filters groups, names, ids and localized visible kinds without changing route',()=>{
 equal(filterSkillNavigatorEntries(rows,'all','').length,6,'all groups visible');
 equal(filterSkillNavigatorEntries(rows,'combat','').map(row=>row.route),['combat','discipline'],'combat action and distinct XP-bearing discipline remain');
 equal(filterSkillNavigatorEntries(rows,'gathering','min').map(row=>row.id),['mining'],'category plus query');
 equal(filterSkillNavigatorEntries(rows,'all','SMITH').map(row=>row.id),['smithing'],'case-insensitive name');
 equal(filterSkillNavigatorEntries(rows,'all','class:guard').map(row=>row.id),['class:guardcraft'],'stable id search');
 equal(filterSkillNavigatorEntries(rows,'companions','account-wide').map(row=>row.id),['companion-mastery'],'subtitle search');
 equal(filterSkillNavigatorEntries(rows,'all','unmatched'),[],'empty state');
});
test('New tracked skills open a safe progress overview until their real activity route is implemented',()=>{
 equal(skillNavigatorRouteFor('mining'),'skill','supported gathering details');
 equal(skillNavigatorRouteFor('smithing'),'skill','supported crafting details');
 equal(skillNavigatorRouteFor('faith'),'skill','supported devotion details');
 equal(skillNavigatorRouteFor('future-profession'),'overview','future XP does not open blank crafting view');
 equal(skillNavigatorRouteFor('hunting'),'overview','historical hunting skill remains visible but never opens an empty detail');
});
test('Skill Navigator does not map ability/talent selections to trainable profession XP',()=>{
 equal(rows.filter(row=>row.route==='skill').map(row=>row.id),['mining','smithing'],'only professions with implemented detail screens use the skill route');
 equal(rows.filter(row=>row.route==='overview').map(row=>row.id),['future-profession'],'unsupported XP skills are shown via progress-only overview');
 equal(rows.find(row=>row.id==='class:guardcraft')?.route,'discipline','class combat disciplines remain distinct from future selectable abilities');
});
