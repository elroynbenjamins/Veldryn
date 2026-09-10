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

const rootBattleIds=['ROOT_SCOUTS','ROOT_GUARDIANS','ROOT_VINES','ROOT_STALKERS','ROOT_SENTINELS'];
for(const [index,id] of rootBattleIds.entries()){
 ASTERFALL_ENCOUNTERS[id]=()=>[
  enemy(`${id}_A`,['Briar Scout','Root Guardian','Strangling Vine','Moss Stalker','Grove Sentinel'][index],4_800+index*350,310+index*14,560+index*35,.95+index*.04),
  enemy(`${id}_B`,['Sporeling','Thornling','Sap Husk','Briar Hound','Rootbound Husk'][index],4_100+index*300,300+index*12,520+index*30,.92+index*.04),
 ];
}
for(const id of ['ROOT_ELITE_BRAMBLE','ROOT_ELITE_WARDEN','ROOT_ELITE_MYCELIUM']) ASTERFALL_ENCOUNTERS[id]=ASTERFALL_ENCOUNTERS.ROOTBOUND_ELITE_01;
ASTERFALL_ENCOUNTERS.BOSS_EXP_ROOT=ASTERFALL_ENCOUNTERS.ROOTBOUND_BOSS;
ASTERFALL_ENCOUNTERS.LANTERN_BATTLE_02=()=>[enemy('LANTERN_SHADE_1','Banner Shade',5000,360,590,1.02),enemy('LANTERN_SHADE_2','Echo Bat',4300,340,520,.94)];
ASTERFALL_ENCOUNTERS.LANTERN_BATTLE_03=()=>[enemy('LANTERN_PILGRIM_1','Drowned Pilgrim',5600,370,640,1.05),enemy('LANTERN_PILGRIM_2','Lantern Wretch',4700,355,570,1)];
ASTERFALL_ENCOUNTERS.LANTERN_ELITE_02=()=>[{...enemy('LANTERN_KNIGHT','Fallen Lantern Knight',13200,460,880,1.28),abilities:[{id:'LANTERN_SWEEP',name:'Lantern Sweep',cooldownMs:7800,castTimeMs:900,target:'all_enemies',priority:85,interruptible:true,effects:[{kind:'damage',coeff:.58,damageType:'shadow'}]}]}];
ASTERFALL_ENCOUNTERS.LANTERN_ELITE_03=ASTERFALL_ENCOUNTERS.LANTERN_ELITE_01;
ASTERFALL_ENCOUNTERS.BOSS_EXP_BELL=ASTERFALL_ENCOUNTERS.LANTERN_BOSS;
