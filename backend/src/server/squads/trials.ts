export type TrialModifier='armored'|'rushing'|'anti_heal'|'shattering'|'arcane_storm'|'execution';
export interface TrialFloor{floor:number;recommendedPower:number;modifiers:TrialModifier[];boss:boolean;}
export interface TrialRunState{accountId:string;seasonKey:string;floor:number;aliveCharacterIds:string[];revivesRemaining:number;score:number;}
export function generateTrialFloor(floor:number):TrialFloor{
 if(floor<1||floor>30)throw new Error('invalid_trial_floor');
 const pool:TrialModifier[]=['armored','rushing','anti_heal','shattering','arcane_storm','execution'];
 const count=floor>=21?3:floor>=11?2:1;
 const mods:Array<TrialModifier>=[];
 for(let i=0;i<count;i++)mods.push(pool[(floor*3+i*2)%pool.length]);
 return{floor,recommendedPower:Math.round(900*Math.pow(1.075,floor-1)),modifiers:[...new Set(mods)],boss:floor%5===0};
}
export function trialScore(floor:number,seconds:number,downs:number){return Math.max(0,Math.round(floor*1000-seconds*2-downs*150));}
export function canEnterTrial(aliveCharacterIds:string[]){return aliveCharacterIds.length>=1;}
export function trialCheckpointFloor(floor:number){return floor<5?1:Math.floor((floor-1)/5)*5+1;}
