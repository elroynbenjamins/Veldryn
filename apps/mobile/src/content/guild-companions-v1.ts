import type {CompanionDefinition,CombatCompanionRole,CompanionEffectKind} from '../core/combat-companion-types';

interface GuildCompanionSeed{
 id:string;name:string;role:CombatCompanionRole;description:string;
 activeName:string;activeKind:CompanionEffectKind;activeValue:number;
 passiveName:string;passiveKind:CompanionEffectKind;passiveValue:number;
 bondName:string;bondKind:CompanionEffectKind;bondValue:number;
}
const seeds:readonly GuildCompanionSeed[]=[
 {id:'GUILD_UNIT_001',name:'Stormwatch Sentinel',role:'tank',
  description:'An oathbound shield bearer raised by guild cooperation.',
  activeName:'Stormwatch Aegis',activeKind:'damage_reduction',activeValue:.07,
  passiveName:'Sentinel Vow',passiveKind:'damage_reduction',passiveValue:.035,
  bondName:'Unbroken Fellowship',bondKind:'damage_reduction',bondValue:.025},
 {id:'GUILD_UNIT_002',name:'Oathbound Seeker',role:'damage',
  description:'A swift scout trained to protect the guild caravan.',
  activeName:'Oathstrike',activeKind:'damage',activeValue:1.08,
  passiveName:'Pathfinder Instinct',passiveKind:'execute',passiveValue:.055,
  bondName:'Seeker Resolve',bondKind:'execute',bondValue:.025},
 {id:'GUILD_UNIT_003',name:'Dawncall Herald',role:'support',
  description:'A loyal herald whose song rallies a threatened party.',
  activeName:'Dawncall',activeKind:'utility',activeValue:.05,
  passiveName:'Guild Rally',passiveKind:'haste',passiveValue:.018,
  bondName:'Fellowship Hymn',bondKind:'utility',bondValue:.025},
];
const stats=(role:CombatCompanionRole)=>({
 hp:role==='tank'?245:role==='support'?195:190,
 power:role==='damage'?27:18,defense:role==='tank'?26:16,attackSpeed:role==='damage'?2.0:2.25,
});
/** The existing rarity system has no "epic". Guild exclusivity is separate
 * from power: all three use the balanced Elite rarity tier (~112%). */
export const GUILD_COMBAT_COMPANIONS:readonly CompanionDefinition[]=seeds.map(seed=>{
 const desc=`${seed.name}'s guild-forged technique.`;
 return {
  id:seed.id,name:seed.name,description:seed.description,
  archetype:`Guild ${seed.role}`,role:seed.role,rarity:'elite',
  origin:{type:'meta',id:'GUILD_TOKEN_SHOP',name:'Guild Token Shop'},
  unlockRequirements:[{type:'meta',target:`guild_shop:${seed.id}`,description:'Purchase this companion with Guild Tokens.'}],
  baseStats:stats(seed.role),
  activeAbility:{
   id:`${seed.id}_ACTIVE`,name:seed.activeName,description:desc,
   cooldownSeconds:seed.role==='damage'?18:22,
   target:seed.role==='damage'?'Priority target':seed.role==='tank'?'Owner':'Lowest-HP ally',
   effect:{kind:seed.activeKind,value:seed.activeValue,description:desc,durationSeconds:5},
   scaling:{baseValue:seed.activeValue,perLevel:seed.activeKind==='damage'?.004:.001,
    maxValue:seed.activeKind==='damage'?1.35:undefined},
  },
  passiveAbility:{kind:seed.passiveKind,value:seed.passiveValue,description:seed.passiveName},
  bondTrait:{id:`${seed.id}_BOND`,name:seed.bondName,description:seed.bondName,
   effect:{kind:seed.bondKind,value:seed.bondValue,description:seed.bondName}},
  ascensionMaterialId:'TRIAL_SANCTUARY_MATERIAL',
  ascensionMaterialCosts:[
   {tier:1,itemId:'TRIAL_SANCTUARY_MATERIAL',quantity:2},
   {tier:2,itemId:'TRIAL_SANCTUARY_MATERIAL',quantity:4},
   {tier:3,itemId:'TRIAL_SANCTUARY_MATERIAL',quantity:7},
  ],
  availability:{recurringAvailability:'permanent'},
  visual:{portraitId:seed.id,pixelSize:'96x96',accessibilityLabel:seed.name},
 };
});
