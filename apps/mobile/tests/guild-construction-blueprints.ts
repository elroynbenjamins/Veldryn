import {GUILD_COMMISSION_ITEMS,GUILD_COMMISSION_RECIPES} from '../src/content/guild-commissions';
import {GUILD_CONSTRUCTION_BLUEPRINTS} from '../src/content/guild-construction-blueprints';
import {itemDef} from '../src/content/items';
import {recipeDef} from '../src/content/skills';
export {};
const fs=require('fs') as {readFileSync:(path:string,encoding:string)=>string};
function check(condition:unknown,detail:string){if(!condition)throw new Error(detail);}
const original=[
// Original 1x design numbers, before the user's 10x scaling request.
 [12,10],[18,8],[8,20],[16,12],[30,24],[20,18],[24,24],
 [30,16],[16,30],[24,20],[40,32],[30,25],[25,24],[30,24],[20,30],[40,35],[32,30],
];
check(GUILD_COMMISSION_ITEMS.length===10,'Expected exactly 10 commission outputs');
check(GUILD_COMMISSION_RECIPES.length===10,'Expected one timed recipe per output');
const ids=new Set(GUILD_COMMISSION_ITEMS.map(item=>item.id));
check(ids.size===10,'Guild item IDs must be unique');
for(const item of GUILD_COMMISSION_ITEMS){
 check(item.guildOnly===true&&item.type==='material'&&item.value===0,'Guild commission items must be guild-only, non-resellable materials');
 check(itemDef(item.id)===item,'Guild item must be registered in the shared catalog');
}
for(const recipe of GUILD_COMMISSION_RECIPES){
 check(recipeDef(recipe.id)===recipe,'Guild recipe must be included in the normal profession catalog');
 check(ids.has(recipe.output.itemId)&&recipe.output.quantity===1,'Output must be exactly one guild component');
 check(recipe.repeatableTraining&&(recipe.skillId==='smithing'||recipe.skillId==='tailoring'),'Must be a profession training recipe');
 check(recipe.inputs.length>0&&recipe.inputs.every(input=>input.quantity>0&&itemDef(input.itemId)),'Every ingredient must be an existing item');
}
check(GUILD_CONSTRUCTION_BLUEPRINTS.length===original.length,'Expected 17 permanent construction tiers');
const migration=fs.readFileSync('../../backend/supabase/migrations/20261104000002_guild_construction_10x_commissions.sql','utf8');
GUILD_CONSTRUCTION_BLUEPRINTS.forEach((row,index)=>{
 const amounts=row.materials.map(material=>material.amount);
 check(amounts.length===2&&amounts[0]===original[index][0]*10&&amounts[1]===original[index][1]*10,'10x requirement mismatch '+row.id);
 check(row.materials.every(material=>ids.has(material.itemId)),'Construction tiers must use only the new Guild materials');
 check(row.requiredGuildLevel>0&&row.benefit.length>4&&row.description.length>12,'Every building needs a level and a described reward');
 check(migration.includes(`('${row.id}',${row.requiredGuildLevel},'guild_${row.id}',false)`)||
       migration.includes(`('${row.id}',${row.requiredGuildLevel},'guild_construction_${row.id.replace('construction_','')}',false)`),'Every blueprint must be seeded disabled: '+row.id);
 for(const material of row.materials)
  check(migration.includes(`('${row.id}','${material.itemId}',${material.amount})`),'SQL costs do not match the client blueprint: '+row.id);
});
check(migration.includes('set enabled=false'),'All unimplemented projects must remain release-gated');
console.log('PASS: 10 guild-only components, 10 existing-input timed recipes, 17 construction tiers at exactly 10x original costs, SQL release gate');
