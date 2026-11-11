import type {CoopDungeonProjection,CoopRoomType,CoopTier} from '../core/coop-dungeon-browsing';
import {coopPolicyText,ct,type CoopMessageKey, type Language} from '../i18n';
import type {CoopEntrySource} from '../online/coop-entry-source';
import type {CharacterState} from '../core/types';
import type {CoopRole} from '../core/coop-ui-contract';
import type {CoopLoadoutProjection} from '../core/coop-loadout-presentation';
import type {CoopEventExpeditionPreview} from '../core/coop-event-expeditions';

const rooms:CoopRoomType[]=['battle','elite','event','camp','treasure','echo','merchant','risk','boss'];
const difficulties:CoopTier[]=[1,2,3];
const definitions:Array<{id:string;name:string;region:string;min:number;recommended:number;implemented:boolean;description:CoopMessageKey}>=[
 {id:'EXP_001',name:'Rootbound Vault',region:'Asterfall',min:10,recommended:25,implemented:true,description:'fixture.rootbound'},
 {id:'EXP_003',name:'Buried Observatory',region:'Sunscar',min:25,recommended:34,implemented:true,description:'fixture.observatory'},
 {id:'EXP_005',name:'Shiverlake Descent',region:'Frostmarch',min:38,recommended:52,implemented:false,description:'fixture.shiverlake'},
];

/** Development-only projection; values mirror the canonical backend launch registry. */
const roles:Record<CharacterState['classId'],CoopRole>={IRONWARDEN:'tank',BASTION:'tank',DREADGUARD:'tank',DAWNKEEPER:'support',STONECALLER:'support',WAYFINDER:'damage',RAVAGER:'damage',HEXWEAVER:'damage',KNIFE_DANCER:'damage'};
export function createCoopDungeonFixtureSource(language:Language,character?:CharacterState|null):CoopEntrySource{
  const characterLevel=character?.level??25;
  const dungeons:CoopDungeonProjection[]=definitions.map(definition=>({
    id:definition.id,name:definition.name,region:definition.region,description:ct(language,definition.description),minLevel:definition.min,recommendedLevel:definition.recommended,syncLevel:definition.recommended,
    available:definition.implemented&&characterLevel>=definition.min,lockedReason:!definition.implemented?ct(language,'browse.inDevelopment'):characterLevel<definition.min?ct(language,'browse.requiresLevel',{level:definition.min}):undefined,enabledRoomTypes:rooms,difficulties,preBossRoomMin:5,preBossRoomMax:5,estimatedMinutes:{min:6,max:8},tierMinLevels:{1:definition.min,2:definition.min,3:definition.min},tierMinPower:definition.id==='EXP_001'?{1:2500,2:3750,3:5000}:definition.id==='EXP_003'?{1:6000,2:7250,3:8500}:{1:0,2:0,3:0},
    bossVariants:definition.id==='EXP_001'?[
      {bossId:'BOSS_EXP_ROOT',name:'Rootbound Heart',chancePercent:50,gemFamilies:['effect_bulwark','effect_renewal','effect_unyielding','stat_vitality'],rawGemPercent:18,recipePercent:8,catalystPercent:15,gemPityClears:8},
      {bossId:'BOSS_EXP_BELL',name:'Bell-Warden',chancePercent:50,gemFamilies:['effect_bulwark','effect_ruin','effect_execution','stat_vitality'],rawGemPercent:18,recipePercent:8,catalystPercent:15,gemPityClears:8},
    ]:definition.id==='EXP_003'?[
      {bossId:'BOSS_EXP_SOLAR',name:'The Buried Heliarch',chancePercent:50,gemFamilies:['effect_momentum','effect_critical_surge','effect_retaliation','stat_precision'],rawGemPercent:18,recipePercent:8,catalystPercent:15,gemPityClears:8},
      {bossId:'BOSS_EXP_SPHINX',name:'The Veiled Sphinx',chancePercent:50,gemFamilies:['effect_momentum','effect_flow','effect_benediction','stat_precision'],rawGemPercent:18,recipePercent:8,catalystPercent:15,gemPityClears:8},
    ]:[],rewardBudgetState:coopPolicyText(language,'rewardCadence'),
  }));
  const role=character?roles[character.classId]:'damage',characterId=character?.id??'fixture-character',level=characterLevel;
  const before={maxHp:character?.hp??3400,attackPower:character?.attack??625,healingPower:role==='support'?650:120,defense:character?.defense??750};
  const effective={...before,maxHp:Math.min(before.maxHp,role==='tank'?5200:role==='support'?3800:3400),attackPower:Math.min(before.attackPower,role==='damage'?625:420),healingPower:Math.min(before.healingPower,role==='support'?650:180),defense:Math.min(before.defense,role==='tank'?1500:role==='support'?900:750)};
  const loadouts:CoopLoadoutProjection[]=[
    {id:'fixture-ready',characterId,revision:3,verifiedRevision:3,name:'Expedition Build',characterName:character?.name??'Preview Hero',className:character?.classId.replace('_',' ')??'WAYFINDER',role,status:'verified',ready:true,failures:[],level,effectiveLevel:Math.min(level,25),beforeStats:before,effectiveStats:effective,skills:role==='tank'?['Guard','Challenge','Counter']:role==='support'?['Restore','Ward','Cleanse']:['Strike','Volley','Execute'],equipment:['Saved weapon','Saved armor set','Saved accessories'],normalizationVersion:'coop-normalization-v1',verifiedAt:'development fixture'},
    {id:'fixture-stale',characterId,revision:5,verifiedRevision:4,name:'Recently Changed',characterName:character?.name??'Preview Hero',className:character?.classId.replace('_',' ')??'WAYFINDER',role,status:'stale',ready:false,failures:[],level,skills:['Snapshot unavailable'],equipment:['Build changed after verification']},
  ];
  const eventExpeditions:CoopEventExpeditionPreview[]=[
    {id:'EVENT_SUNCREST_SHATTERED_ISLES',eventName:ct(language,'event.suncrest'),name:'The Shattered Isles',description:ct(language,'event.shatteredDescription'),routeHighlights:[ct(language,'event.coastalRuins'),ct(language,'event.sunShrine'),ct(language,'event.pirateCamp')],finalBoss:'Aureon, First Champion',status:'preview',minLevel:45,rewardMarks:96},
    {id:'EVENT_STARFALL_ASTRAL_RIFT',eventName:ct(language,'event.starfall'),name:'Astral Rift Expedition',description:ct(language,'event.astralDescription'),routeHighlights:[ct(language,'event.meteorField'),ct(language,'event.starShrine'),ct(language,'event.riftGate')],finalBoss:'The Constellation Eater',status:'preview',minLevel:70,rewardMarks:118},
  ];
  return {kind:'fixture',load:async()=>({dungeons,eventExpeditions,loadouts})};
}
