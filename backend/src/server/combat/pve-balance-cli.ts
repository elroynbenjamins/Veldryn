import {EXPEDITION_ENCOUNTERS} from './content/expedition-encounters';
import {launchPlayer} from './content/launch-combat';
import {runPveBalanceBatch} from './pve-balance-batch';

const argv=process.argv.slice(2);
const has=(flag:string)=>argv.includes(flag);
const value=(flag:string,fallback:string)=>{const index=argv.indexOf(flag);return index>=0&&argv[index+1]?argv[index+1]:fallback;};
const numberValue=(flag:string,fallback:number)=>{const parsed=Number(value(flag,String(fallback)));if(!Number.isFinite(parsed))throw new Error(`invalid_${flag.replace(/^--/,'')}`);return parsed;};

if(has('--list')){
  console.log(Object.keys(EXPEDITION_ENCOUNTERS).sort().join('\n'));
}else{
  const encounterId=value('--encounter','ROOTBOUND_BOSS');
  if(!EXPEDITION_ENCOUNTERS[encounterId])throw new Error(`unknown_encounter:${encounterId}`);
  const partyClasses=value('--party','Ironwarden,Wayfinder,Ravager,Dawnkeeper').split(',').map(item=>item.trim()).filter(Boolean);
  if(partyClasses.length!==4)throw new Error('party_requires_four_classes');
  if(new Set(partyClasses).size!==partyClasses.length)throw new Error('party_classes_must_be_unique');
  const level=Math.round(numberValue('--level',25)),iterations=Math.round(numberValue('--runs',100)),maxDurationMs=Math.round(numberValue('--max-ms',180000)),seedPrefix=value('--seed','VELDRYN_PVE_BATCH_CLI_V1');
  const players=partyClasses.map(classId=>launchPlayer(classId,level));
  const roleCounts=players.reduce((record,player)=>{record[player.role]=(record[player.role]??0)+1;return record;},{} as Record<string,number>);
  if(roleCounts.tank!==1||roleCounts.damage!==2||roleCounts.support!==1)throw new Error('party_requires_1_tank_2_damage_1_support');
  const report=runPveBalanceBatch({encounterId,players,iterations,seedPrefix,maxDurationMs});
  const output={
    harness:'VELDRYN_PVE_BALANCE_BATCH_V1',
    fixtureModel:'launchPlayer',
    provisionalStats:true,
    note:'Current launch-player fixture stats are for regression/simulation plumbing only. Do not treat these results as final balance targets.',
    config:{encounterId,partyClasses,level,iterations,seedPrefix,maxDurationMs},
    report,
  };
  console.log(JSON.stringify(output,null,has('--pretty')?2:0));
}
