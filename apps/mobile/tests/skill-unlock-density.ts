import {GATHERING,RECIPES} from '../src/content/skills';
import {HERB_NODES,HERBALISM_METHODS} from '../src/content/herbalism';
import {ALCHEMY_RECIPES} from '../src/content/alchemy';
import {FAITH_TIERS,FAITH_BLESSINGS} from '../src/content/faith';
import {EXPLORATION_ROUTES} from '../src/content/exploration';
import {V33_EQUIPMENT_RECIPES} from '../src/content/equipment-recipes-v33';
function ok(value:unknown,message:string){if(!value)throw new Error(message)}
function levels(values:number[]){return [...new Set(values.filter(v=>v>=1&&v<=100))].sort((a,b)=>a-b)}
function maxGap(values:number[]){const rows=levels([1,...values,100]);let best={from:1,to:1,gap:0};for(let i=1;i<rows.length;i++){const gap=rows[i]-rows[i-1];if(gap>best.gap)best={from:rows[i-1],to:rows[i],gap};}return best;}
const ladders:Record<string,number[]>={
 mining:GATHERING.filter(x=>x.skillId==='mining').map(x=>x.unlockLevel),
 woodcutting:GATHERING.filter(x=>x.skillId==='woodcutting').map(x=>x.unlockLevel),
 fishing:GATHERING.filter(x=>x.skillId==='fishing').map(x=>x.unlockLevel),
 herbalism:[...HERB_NODES.map(x=>x.unlockLevel),...HERBALISM_METHODS.map(x=>x.unlockLevel)],
 smithing:[...RECIPES.filter(x=>x.skillId==='smithing').map(x=>x.level),...V33_EQUIPMENT_RECIPES.filter(x=>x.skillId==='smithing').map(x=>x.level)],
 tailoring:V33_EQUIPMENT_RECIPES.filter(x=>x.skillId==='tailoring').map(x=>x.level),
 cooking:RECIPES.filter(x=>x.skillId==='cooking').map(x=>x.level),
 alchemy:ALCHEMY_RECIPES.map(x=>x.level),
 enchanting:RECIPES.filter(x=>x.skillId==='enchanting').map(x=>x.level),
 faith:[...FAITH_TIERS.map(x=>x.level),...FAITH_BLESSINGS.map(x=>x.level)],
 exploration:EXPLORATION_ROUTES.map(x=>x.requiredLevel),
};
const report=Object.fromEntries(Object.entries(ladders).map(([skill,rows])=>[skill,{unlocks:levels(rows),maxGap:maxGap(rows)}]));
for(const skill of ['mining','woodcutting','fishing','herbalism','smithing','tailoring','cooking','alchemy','faith','exploration']){
 const gap=maxGap(ladders[skill]);ok(gap.gap<=30,skill+' has an excessive unlock drought: '+gap.from+'→'+gap.to);
}
// Enchanting's normal recipe table is intentionally sparse because raw-gem refinement/combine unlocks
// live in the dedicated gem system; only ensure the late catalyst milestones remain present here.
ok(ladders.enchanting.includes(70)&&ladders.enchanting.includes(90),'Enchanting catalyst milestones must remain at 70 and 90');
console.log(JSON.stringify({status:'PASS',report},null,2));
