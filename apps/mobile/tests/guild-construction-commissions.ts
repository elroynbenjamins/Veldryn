import {GUILD_COMPONENT_ITEMS,GUILD_COMPONENT_RECIPES,GUILD_COMPONENT_CRAFTING_RELEASED} from '../src/content/guild-components';
import {GUILD_CONSTRUCTION_BLUEPRINTS} from '../src/content/guild-construction-blueprints';
import {ITEMS,itemDef} from '../src/content/items';
import {RECIPES} from '../src/content/skills';
export {};
const fs=require('fs') as {readFileSync:(p:string,e:string)=>string};
function check(condition:unknown,detail:string){if(!condition)throw new Error(detail);}
const ids=new Set(GUILD_COMPONENT_ITEMS.map(x=>x.id));
check(ids.size===8,'Eight illustrated guild component IDs required');
check(GUILD_COMPONENT_RECIPES.length===8,'Exactly eight authored guild profession recipes');
check(!GUILD_COMPONENT_CRAFTING_RELEASED,'Guild commissions remain disabled until server integrations are ready');
const icons=fs.readFileSync('src/theme/guild-upgrade-component-art.ts','utf8');
for(const component of GUILD_COMPONENT_ITEMS){
 check(ITEMS.includes(component)&&itemDef(component.id)===component,'Component must exist in canonical item catalog');
 check(component.guildOnly&&component.value===0&&component.type==='material','No guild component can be sold');
 check(icons.includes(component.id),'Every commission must have existing illustrated resource icon');
}
for(const recipe of GUILD_COMPONENT_RECIPES){
 check(ids.has(recipe.output.itemId),'Every commission output must be guild-only');
 check(recipe.inputs.length>0&&recipe.inputs.every(x=>x.quantity>0&&itemDef(x.itemId)),'Every input must exist');
 check(recipe.repeatableTraining&&(recipe.skillId==='smithing'||recipe.skillId==='tailoring'),'Guild craft must use a profession');
 check(!RECIPES.some(x=>x.id===recipe.id),'Unreleased guild recipes must not be craftable');
}
const sql=fs.readFileSync('../../backend/supabase/migrations/20261104000017_guild_construction_10x_commissions.sql','utf8');
for(const row of GUILD_CONSTRUCTION_BLUEPRINTS){
 check(row.materials.every(x=>ids.has(x.itemId)),'Construction uses only illustrated guild components');
 for(const material of row.materials)
  check(sql.includes("('"+row.id+"','"+material.itemId+"',"+material.amount+")"),
   'SQL cost mismatch on '+row.id);
 check(sql.includes("('"+row.id+"',"+row.requiredGuildLevel+",'guild_"+row.id+"',false)"),
  'Construction guild-level requirement mismatch on '+row.id);
}
const shared=fs.readFileSync('../../packages/guild-shop/src/catalogue.ts','utf8');
for(const row of GUILD_CONSTRUCTION_BLUEPRINTS)check(shared.includes('id:"'+row.id+'"'),'Server catalogue missing '+row.id);
check(sql.includes('set enabled=false'),'New construction cannot accept live donations until release gates pass');
console.log('PASS: 8 illustrated guild materials, 8 real-input gated recipes, 17x 10x server project requirements');
