/** Test-only compact class baseline; parity checked by compact-cp-review.test.mjs. */
import type {ClassIdV2} from '../build-contract';
import type {CombatStats} from '../../types';
const compactRows = {"BASTION":{"start":[136,12,16],"level25":[210,18,32],"secondary":[5,8,680,180,0.05,0.03]},"IRONWARDEN":{"start":[130,13,15],"level25":[200,20,29],"secondary":[6,10,680,180,0.05,0.03]},"DREADGUARD":{"start":[126,15,14],"level25":[190,25,25],"secondary":[8,13,680,180,0.05,0.03]},"RAVAGER":{"start":[108,19,8],"level25":[160,34,17],"secondary":[2,3,700,160,0.12,0.05]},"KNIFE_DANCER":{"start":[90,19,8],"level25":[130,33,12],"secondary":[2,3,800,330,0.18,0.14]},"HEXWEAVER":{"start":[92,18,9],"level25":[135,32,13],"secondary":[3,5,790,250,0.13,0.09]},"WAYFINDER":{"start":[94,18,9],"level25":[140,31,14],"secondary":[2,4,810,270,0.15,0.1]},"DAWNKEEPER":{"start":[100,12,11],"level25":[155,19,19],"secondary":[18,32,720,230,0.07,0.08]},"STONECALLER":{"start":[102,17,12],"level25":[170,23,22],"secondary":[14,25,690,190,0.06,0.04]}} as const;
export function compactUnifiedStatsV2(id:ClassIdV2,level:number):CombatStats{
 if(!Number.isInteger(level)||level<1||level>100)throw Error('invalid compact QA level');
 const r=compactRows[id],v=(start:number,end:number)=>level<=25?start+(end-start)*(level-1)/24:end+(end-start)*(level-25)/25;
 const [hp,ap,def]=r.start.map((n,i)=>v(n,r.level25[i]));
 const [hs,he,accuracy,evasion,critChance,haste]=r.secondary;
 return {maxHp:hp,attackPower:ap,defense:def,healingPower:v(hs,he),accuracy,evasion,critChance,critMultiplier:1.5,haste};
}
export function compactCoreCpIndexV2(level:number,gear:{attack:number;defense:number;hp:number}){
 if(!Number.isInteger(level)||level<1||level>100||Object.values(gear).some(v=>!Number.isFinite(v)||v<0))throw Error('invalid compact CP fixture');
 const gearPoints=gear.attack+gear.defense+gear.hp/4;
 return {index:40*level/25+60*gearPoints/(73*2*1.08),gearPoints,cpApproved:false as const,releaseEnabled:false as const};
}
