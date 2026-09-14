export function test(name:string,fn:()=>void){try{fn();console.log('PASS '+name);}catch(error){console.error('FAIL '+name,error);throw error;}}
export function equal(actual:any,expected:any,message:string){if(JSON.stringify(actual)!==JSON.stringify(expected))throw new Error(`${message}: ${JSON.stringify(actual)} !== ${JSON.stringify(expected)}`);}
export const exactEqual=equal;
export function ok(value:unknown,message:string){if(!value)throw new Error(message);}
export function throws(fn:()=>unknown,message:string){let failed=false;try{fn();}catch{failed=true;}if(!failed)throw new Error(message);}
export function close(actual:number,expected:number,message:string){if(Math.abs(actual-expected)>.0001)throw new Error(`${message}: ${actual} !== ${expected}`);}
import {totalXpAtLevel} from '../src/core/progression';
export function skillLevels(state:any,levels:number[]){const skills=state.skills.map((s:any,i:number)=>i<levels.length?{...s,level:levels[i],xp:totalXpAtLevel(levels[i])}:s);return {...state,skills};}
