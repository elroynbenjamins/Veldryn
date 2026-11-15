import type {ClassId} from './types';

/** Small, authored ordinary-hunt advantages for the eight new regional enemies.
 * All classes remain able to fight all enemies; no class-specific drops or locks.
 * Apply exactly once to strike output (damage-driven hunts) or legacy cycle speed,
 * and to incoming damage when a defensive matchup is advantageous. */
type ClassAdvantage={classId:ClassId;outputMultiplier?:number;incomingMultiplier?:number};
const MATCHUPS:Readonly<Record<string,readonly ClassAdvantage[]>>={
  DUSTVEIL_RUNNER:[{classId:'WAYFINDER',outputMultiplier:1.06}],
  SANDPLATE_JUGGERNAUT:[{classId:'RAVAGER',outputMultiplier:1.07},{classId:'IRONWARDEN',incomingMultiplier:.94}],
  PRISM_HEXER:[{classId:'HEXWEAVER',outputMultiplier:1.06}],
  CROWN_EXECUTIONER:[{classId:'KNIFE_DANCER',outputMultiplier:1.05}],
  RIME_BERSERKER:[{classId:'DREADGUARD',incomingMultiplier:.93}],
  FROSTNEEDLE_BROOD:[{classId:'BASTION',incomingMultiplier:.93}],
  CHOIR_DEFILER:[{classId:'DAWNKEEPER',outputMultiplier:1.06,incomingMultiplier:.95}],
  STORMGLASS_COLOSSUS:[{classId:'STONECALLER',outputMultiplier:1.07,incomingMultiplier:.95}],
};
export function regionalClassCounter(monsterId:string,classId:ClassId){
  const value=MATCHUPS[monsterId]?.find(row=>row.classId===classId);
  return {
    outputMultiplier:value?.outputMultiplier??1,
    incomingMultiplier:value?.incomingMultiplier??1,
  };
}
export function regionalCounterCoverage(){
  return Object.values(MATCHUPS).flat().map(({classId})=>classId);
}
