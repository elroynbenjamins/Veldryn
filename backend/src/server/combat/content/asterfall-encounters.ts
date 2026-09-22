import type {CombatantDefinition} from '../types';
import {pveBarrier,withPveIdentity} from '../pve-encounter-identity';
import {rootboundHeartBoss,bellWardenBoss} from './launch-combat';

const s=(maxHp:number,attackPower:number,defense:number,accuracy=650,evasion=120)=>({maxHp,attackPower,healingPower:0,defense,accuracy,evasion,critChance:.04,critMultiplier:1.5,haste:0});
const enemy=(id:string,name:string,hp:number,ap:number,def:number,abilityCoeff=1.0):CombatantDefinition=>withPveIdentity({
 id,name,team:'enemies',role:'enemy',level:25,stats:s(hp,ap,def),basicAttackMs:2800,basicAttackCoeff:.72,
 abilities:[{id:`${id}_HEAVY`,name:'Heavy Strike',cooldownMs:7000,castTimeMs:700,target:'current_target',priority:70,effects:[{kind:'damage',coeff:abilityCoeff,damageType:'physical'}]}],
},'bruiser',['heavy_hit']);

function rootWarden():CombatantDefinition{
 const base=enemy('ROOT_WARDEN','Root Warden',13500,430,900,1.25);
 return withPveIdentity({...base,boss:false,abilities:[...base.abilities,pveBarrier('ROOT_WARDEN_WARD','Root Ward',1250,12000)]},'guardian',['heavy_hit','barrier']);
}
function bellSentinel(id='BELL_SENTINEL',name='Bell Sentinel',hp=12800,ap=450,def=840):CombatantDefinition{
 const base=enemy(id,name,hp,ap,def,1.15);
 return withPveIdentity({...base,abilities:[{id:`${id}_TOLL`,name:'Sentinel Toll',cooldownMs:8000,castTimeMs:1100,target:'all_enemies',priority:90,interruptible:true,effects:[{kind:'damage',coeff:.62,damageType:'shadow'}]}]},'caster',['interrupt','aoe']);
}
const rootBoss=()=>withPveIdentity(rootboundHeartBoss(),'bruiser',['heavy_hit','aoe','interrupt','dot','enrage']);
const bellBoss=()=>withPveIdentity(bellWardenBoss(),'caster',['interrupt','aoe','vulnerability']);

export const ASTERFALL_ENCOUNTERS:Record<string,()=>CombatantDefinition[]>={
 ROOTBOUND_BATTLE_01:()=>[enemy('ROOT_HUSK_1','Briar Husk',5200,330,620),enemy('ROOT_HUSK_2','Briar Husk',5200,330,620)],
 ROOTBOUND_ELITE_01:()=>[rootWarden()],
 ROOTBOUND_BOSS:()=>[rootBoss()],
 LANTERN_BATTLE_01:()=>[enemy('LANTERN_WRETCH_1','Lantern Wretch',4800,350,560),enemy('LANTERN_WRETCH_2','Lantern Wretch',4800,350,560)],
 LANTERN_ELITE_01:()=>[bellSentinel()],
 LANTERN_BOSS:()=>[bellBoss()],
};

const rootBattleIds=['ROOT_SCOUTS','ROOT_GUARDIANS','ROOT_VINES','ROOT_STALKERS','ROOT_SENTINELS'];
for(const [index,id] of rootBattleIds.entries()){
 ASTERFALL_ENCOUNTERS[id]=()=>[
  enemy(`${id}_A`,['Briar Scout','Root Guardian','Strangling Vine','Moss Stalker','Grove Sentinel'][index],4_800+index*350,310+index*14,560+index*35,.95+index*.04),
  enemy(`${id}_B`,['Sporeling','Thornling','Sap Husk','Briar Hound','Rootbound Husk'][index],4_100+index*300,300+index*12,520+index*30,.92+index*.04),
 ];
}
for(const id of ['ROOT_ELITE_BRAMBLE','ROOT_ELITE_WARDEN','ROOT_ELITE_MYCELIUM'])ASTERFALL_ENCOUNTERS[id]=()=>[rootWarden()];
ASTERFALL_ENCOUNTERS.BOSS_EXP_ROOT=()=>[rootBoss()];
ASTERFALL_ENCOUNTERS.LANTERN_BATTLE_02=()=>[enemy('LANTERN_SHADE_1','Banner Shade',5000,360,590,1.02),enemy('LANTERN_SHADE_2','Echo Bat',4300,340,520,.94)];
ASTERFALL_ENCOUNTERS.LANTERN_BATTLE_03=()=>[enemy('LANTERN_PILGRIM_1','Drowned Pilgrim',5600,370,640,1.05),enemy('LANTERN_PILGRIM_2','Lantern Wretch',4700,355,570,1)];
ASTERFALL_ENCOUNTERS.LANTERN_ELITE_02=()=>[bellSentinel('LANTERN_KNIGHT','Fallen Lantern Knight',13200,460,880)];
ASTERFALL_ENCOUNTERS.LANTERN_ELITE_03=()=>[bellSentinel()];
ASTERFALL_ENCOUNTERS.BOSS_EXP_BELL=()=>[bellBoss()];
