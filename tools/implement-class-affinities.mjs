import {readFileSync,writeFileSync} from 'node:fs';
const file='apps/mobile/tests/equipment-crafting-source-v33.ts';let source=readFileSync(file,'utf8');
const line="import {skillAffinityModifiers} from '../src/core/class-skill-affinities';";
if(!source.includes(line))source=line+'\n'+source;
const old='  if(gather){const pace=gatheringBalanceProjection(state,gather,24);return quantity/Math.max(.0001,pace.runtimeItemsPerHour);}';
const next=`  if(gather){
    const pace=gatheringBalanceProjection(state,gather,24),affinity=skillAffinityModifiers(state.character?.classId,gather.skillId);
    // This test guards authored material quantities at baseline, not specialist completion times.
    // Affinity runtime speed and unchanged per-action yields are tested separately across all classes.
    const baselineItemsPerHour=pace.runtimeItemsPerHour/affinity.speedMultiplier;
    return quantity/Math.max(.0001,baselineItemsPerHour);
  }`;
if(!source.includes(next)){if(source.split(old).length-1!==1)throw new Error('Expected exactly one material-budget baseline formula');source=source.replace(old,next);}
writeFileSync(file,source);
console.log('Baseline material floors remain unchanged; accepted class speed remains active in gameplay.');
