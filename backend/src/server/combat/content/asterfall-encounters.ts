import type { CombatantDefinition } from '../types';
import { rootboundHeartBoss, bellWardenBoss } from './launch-combat';
const s=(maxHp:number,attackPower:number,defense:number,accuracy=650,evasion=120)=>({maxHp,attackPower,healingPower:0,defense,accuracy,evasion,critChance:.04,critMultiplier:1.5,haste:0});
const enemy=(id:string,name:string,hp:number,ap:number,def:number,abilityCoeff=1.0):CombatantDefinition=>({id,name,team:'enemies',role:'enemy',level:25,stats:s(hp,ap,def),basicAttackMs:2800,basicAttackCoeff:.72,abilities:[{id:`${id}_HEAVY`,name:'Heavy Strike',cooldownMs:7000,castTimeMs:700,target:'current_target',priority:70,effects:[{kind:'damage',coeff:abilityCoeff,damageType:'physical'}]}]});
export const ASTERFALL_ENCOUNTERS:Record<string,()=>CombatantDefinition[]>={
 ROOTBOUND_BATTLE_01:()=>[enemy('ROOT_HUSK_1','Briar Husk',5200,330,620),enemy('ROOT_HUSK_2','Briar Husk',5200,330,620)],
 ROOTBOUND_ELITE_01:()=>[{...enemy('ROOT_WARDEN','Root Warden',13500,430,900,1.25),boss:false}],
 ROOTBOUND_BOSS:()=>[rootboundHeartBoss()],
 LANTERN_BATTLE_01:()=>[enemy('LANTERN_WRETCH_1','Lantern Wretch',4800,350,560),enemy('LANTERN_WRETCH_2','Lantern Wretch',4800,350,560)],
 LANTERN_ELITE_01:()=>[{...enemy('BELL_SENTINEL','Bell Sentinel',12800,450,840,1.30),abilities:[{id:'SENTINEL_TOLL',name:'Sentinel Toll',cooldownMs:8000,castTimeMs:1100,target:'all_enemies',priority:90,interruptible:true,effects:[{kind:'damage',coeff:.62,damageType:'shadow'}]}]}],
 LANTERN_BOSS:()=>[bellWardenBoss()],
};
