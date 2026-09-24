import {readFileSync,writeFileSync} from 'node:fs';

// Runtime integration is already committed in 7e85f84. This final pass touches only derived previews.
// Each operation is idempotent and all replacements are validated before writing any files.
const pending=new Map();
const read=p=>pending.has(p)?pending.get(p):readFileSync(p,'utf8');
function patch(p,from,to,count=1){
 const source=read(p);
 if(source.includes(to)&&!source.includes(from)){console.log('Already applied',p);return;}
 const found=source.split(from).length-1;
 if(found!==count)throw new Error(`${p}: expected ${count} exact matches, found ${found}: ${from.slice(0,120)}`);
 pending.set(p,source.split(from).join(to));
}
function addImport(p,line){if(!read(p).includes(line))pending.set(p,line+'\n'+read(p));}
const core='apps/mobile/src/core/',ui='apps/mobile/src/components/';
patch(ui+'RecipeCard.tsx','recipe.seconds/mastery.speed*batchCount','paceCycle*batchCount',2);
addImport(ui+'GemCodexModal.tsx',"import {professionActionPace} from '../core/profession-action-pace';");
patch(ui+'GemCodexModal.tsx','const recipe=row.recipe,key=',"const recipe=row.recipe,pace=professionActionPace(state,row.recipe,'forge'),key=",2);
patch(ui+'GemCodexModal.tsx','{duration(recipe.seconds)} · +{recipe.xp.toLocaleString()} Enchanting XP','{duration(pace.cycleSeconds)} · +{Math.floor(pace.xpPerAction+1e-9).toLocaleString()} Enchanting XP',2);
patch(ui+'GemCodexModal.tsx',"const duration=(seconds:number)=>seconds>=3600?(seconds/3600)+'h':seconds>=60?(seconds/60)+'m':seconds+'s';","const duration=(seconds:number)=>{const total=Math.ceil(seconds),h=Math.floor(total/3600),m=Math.floor(total%3600/60),s=total%60;return h?`${h}h${m?' '+m+'m':''}`:m?`${m}m${s?' '+s+'s':''}`:`${s}s`;};");
addImport(core+'material-acquisition-plan.ts',"import {professionActionPace} from './profession-action-pace';");
patch(core+'material-acquisition-plan.ts',"Math.max(1,recipe.seconds/mastery.speed)*batches","professionActionPace(state,recipe,'batch').cycleSeconds*batches",2);
patch(core+'material-acquisition-plan.ts',"    const permanent=characterPermanentMultipliers(state),speed=Math.max(.1,permanent.craftingSpeedMultiplier*mastery.speed);\n    return Math.max(1,Math.ceil(recipe.seconds/speed))*batches;","    return professionActionPace(state,recipe,'forge').cycleSeconds*batches;");
addImport(core+'profession-view.ts',"import {professionActionPace} from './profession-action-pace';");
patch(core+'profession-view.ts','totalSeconds:recipe.seconds*batches',"totalSeconds:professionActionPace(state,recipe,'batch').cycleSeconds*batches");
addImport(core+'equipment-crafting-path.ts',"import {professionActionPace} from './profession-action-pace';");
patch(core+'equipment-crafting-path.ts','craftTimeLabel:formatQueueTimeV31(recipe.seconds)',"craftTimeLabel:recipe.noviceSetId?'Instant':formatQueueTimeV31(professionActionPace(state,recipe,'forge').cycleSeconds)");
patch(ui+'ClassSkillAffinityNote.tsx','Costs and rewards per action stay the same; XP earns the stated bonus.','Materials and Gold per action stay the same; XP earns the stated bonus.');
for(const [p,text] of pending){writeFileSync(p,text);console.log('Aligned',p);}
console.log('Final affinity preview integration complete.');
