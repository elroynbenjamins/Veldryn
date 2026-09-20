import type {CompanionRarity,CompanionRole} from './policy';
import type {CompanionCodexMilestoneDefinition,CompanionIdentityProfile,CompanionMissionDefinition,CompanionProvingGroundChallengeDefinition,CompanionServerDefinition,CompanionSpecialChallengeDefinition,CompanionTechniqueDefinition,CompanionTrialSeasonDefinition,CompanionWeeklyChallengeDefinition} from './domain';

const raw:Array<[string,string,CompanionRole,CompanionRarity,string,number,number,number,number,string,number]>= [
 ['UNIT_001','Ironwood Hound','damage','standard','REG_001',180,22,12,2,'damage',1.00],['UNIT_002','Runebound Sentry','tank','standard','REG_001',260,14,24,2.6,'shield',.06],['UNIT_003','Silverbrook Sprite','support','standard','REG_001',150,12,10,2.2,'heal',.04],
 ['UNIT_004','Briarhorn Cub','damage','rare','REG_001',230,25,18,2.4,'damage',1.20],['UNIT_005','Lantern Wisp','support','rare','REG_001',145,18,11,2,'interrupt',.55],['UNIT_006','Oathbound Page','tank','rare','REG_001',290,16,25,2.8,'shield',.05],
 ['UNIT_007','Gloamknife Shade','damage','elite','REG_001',155,29,10,1.7,'damage',1.45],['UNIT_008','Dawnwing','support','elite','REG_001',180,14,14,2.3,'shield',.04],['UNIT_009','Echo Stalker','damage','elite','REG_001',175,27,13,1.9,'damage',1.25],
 ['UNIT_010','Forge Automaton','damage','rare','REG_001',205,26,20,2.9,'damage',1.35],['UNIT_011',"Veyren's Memory",'support','elite','REG_001',190,21,16,2.4,'damage',.85],['UNIT_012','Oathglass Knightling','support','prestige','REG_001',220,23,21,2.2,'utility',.25],
 ['UNIT_013','Dune Stalker','damage','rare','REG_SUNSCAR',190,27,15,2.2,'damage',1.10],['UNIT_014','Oasis Djinnling','support','elite','REG_SUNSCAR',205,18,15,2.2,'heal',.05],['UNIT_015','Solar Scarab','tank','elite','REG_SUNSCAR',205,18,25,2.2,'shield',.05],['UNIT_016',"Tyrant's Heir",'tank','prestige','REG_SUNSCAR',225,18,25,2.2,'shield',.06],
 ['UNIT_017','Rime Wolf Pup','damage','rare','REG_FROSTMARCH',190,27,15,2.2,'damage',1.10],['UNIT_018','Bell Sprite','support','elite','REG_FROSTMARCH',205,18,15,2.2,'heal',.05],['UNIT_019','Choir Golem','tank','elite','REG_FROSTMARCH',205,18,25,2.2,'shield',.05],['UNIT_020','Wyrm Echo','damage','prestige','REG_FROSTMARCH',225,27,15,2.2,'damage',1.18],
 ['UNIT_021','Obsidian Drakelet','damage','rare','REG_ASHLANDS',190,27,15,2.2,'damage',1.10],['UNIT_022','Forge Custodian','tank','elite','REG_ASHLANDS',205,18,25,2.2,'shield',.05],['UNIT_023','Primal Spark','damage','elite','REG_ASHLANDS',205,27,15,2.2,'damage',1.14],['UNIT_024','Regent Shade','support','prestige','REG_ASHLANDS',225,18,15,2.2,'heal',.06],
 ['EVT_UNIT_001','Keeper of First Dawn','support','elite','EVENT_TURNING_OF_THE_AGE',205,18,15,2.2,'utility',.05],
 ['EVT_UNIT_002','Vowbound Cherub','support','prestige','EVENT_HEARTBOND_FESTIVAL',225,18,15,2.2,'utility',.05],
 ['EVT_UNIT_003','Bloomwarden','tank','elite','EVENT_BLOOMWAKE',205,18,24,2.2,'mitigation',.06],
 ['EVT_UNIT_004','Suncrest Champion','damage','prestige','EVENT_SUNCREST_GAMES',225,28,15,2.2,'damage',1.08],
 ['EVT_UNIT_005','Astral Wayfarer','damage','elite','EVENT_STARFALL_NIGHTS',205,25,15,2.2,'damage',1.08],
 ['EVT_UNIT_006','Harvest Guardian','tank','elite','EVENT_HARVESTWAKE',205,18,24,2.2,'mitigation',.06],
 ['EVT_UNIT_007','Veil Hound','damage','elite','EVENT_VEILBREAK',205,25,15,2.2,'damage',1.08],
 ['EVT_UNIT_008','Hollow Knightling','tank','prestige','EVENT_VEILBREAK',225,18,27,2.2,'mitigation',.06],
 ['EVT_UNIT_009','Frostbell Herald','support','elite','EVENT_FROSTFALL_FESTIVAL',205,18,15,2.2,'utility',.05],
 ['EVT_UNIT_010','Caravan Sentinel','support','elite','EVENT_MERCHANT_GUILD_FESTIVAL',205,18,15,2.2,'utility',.05],
];
const COMPANION_IDENTITY_PROFILES:Record<string,CompanionIdentityProfile>={
 UNIT_013:{activeName:'Venom Pounce',basicDamageMultiplier:1.02,activeDamageMultiplier:1.04,activeExecuteBonus:.05,hasteBonus:.015,bond:{activeExecuteBonus:.03,hasteBonus:.01}},
 UNIT_014:{activeName:'Mirage Spring',activeHealMultiplier:1.12,activeCooldownMultiplier:.95,hasteBonus:.02,bond:{activeHealMultiplier:1.08,hasteBonus:.02}},
 UNIT_015:{activeName:'Solar Carapace',activeShieldMultiplier:1.15,activeReflectPct:.08,defenseMultiplier:1.02,bond:{activeReflectPct:.04,defenseMultiplier:1.02}},
 UNIT_016:{activeName:'Crownward',activeShieldMultiplier:1.12,defenseMultiplier:1.04,basicDamageMultiplier:1.03,bond:{activeShieldMultiplier:1.06,defenseMultiplier:1.02}},
 UNIT_017:{activeName:'Rimefang Rush',activeDamageMultiplier:1.04,activeExecuteBonus:.06,hasteBonus:.02,bond:{activeExecuteBonus:.03,activeCooldownMultiplier:.96}},
 UNIT_018:{activeName:'Resonant Chime',activeHealMultiplier:1.08,activeCooldownMultiplier:.90,hasteBonus:.015,bond:{activeHealMultiplier:1.05,hasteBonus:.02}},
 UNIT_019:{activeName:'Choir Ward',activeShieldMultiplier:1.10,defenseMultiplier:1.05,basicDamageMultiplier:1.04,bond:{defenseMultiplier:1.02,activeShieldMultiplier:1.05}},
 UNIT_020:{activeName:"Wyrm's Verdict",activeDamageMultiplier:1.08,activeExecuteBonus:.07,bond:{activeDamageMultiplier:1.04,activeCooldownMultiplier:.96}},
 UNIT_021:{activeName:'Obsidian Rend',activeDamageMultiplier:1.06,basicDamageMultiplier:1.04,hasteBonus:.01,bond:{activeExecuteBonus:.04}},
 UNIT_022:{activeName:'Forge Barrier',activeShieldMultiplier:1.13,defenseMultiplier:1.04,activeReflectPct:.05,bond:{activeReflectPct:.04}},
 UNIT_023:{activeName:'Primal Arc',activeDamageMultiplier:1.06,hasteBonus:.03,activeCooldownMultiplier:.96,bond:{activeDamageMultiplier:1.03}},
 UNIT_024:{activeName:"Regent's Decree",activeHealMultiplier:1.08,activeCooldownMultiplier:.94,hasteBonus:.02,defenseMultiplier:1.02,bond:{activeHealMultiplier:1.05,defenseMultiplier:1.02}},
 EVT_UNIT_001:{activeName:'First Dawn',utilityMultiplier:1.08,activeHealMultiplier:1.05,activeCooldownMultiplier:.95,hasteBonus:.02,bond:{utilityMultiplier:1.04,hasteBonus:.01}},
 EVT_UNIT_002:{activeName:'Vow Link',utilityMultiplier:1.06,activeHealMultiplier:1.12,defenseMultiplier:1.02,bond:{activeHealMultiplier:1.05,defenseMultiplier:1.02}},
 EVT_UNIT_003:{activeName:'Living Bastion',mitigationMultiplier:1.12,defenseMultiplier:1.04,bond:{mitigationMultiplier:1.06,defenseMultiplier:1.02}},
 EVT_UNIT_004:{activeName:'Solar Momentum',activeDamageMultiplier:1.08,activeExecuteBonus:.05,hasteBonus:.01,bond:{activeDamageMultiplier:1.04}},
 EVT_UNIT_005:{activeName:'Starfall Mark',activeDamageMultiplier:1.06,activeCooldownMultiplier:.94,hasteBonus:.02,bond:{activeExecuteBonus:.04}},
 EVT_UNIT_006:{activeName:'Harvest Bulwark',mitigationMultiplier:1.10,defenseMultiplier:1.04,bond:{mitigationMultiplier:1.05,defenseMultiplier:1.02}},
 EVT_UNIT_007:{activeName:'Veil Rend',activeDamageMultiplier:1.06,activeExecuteBonus:.07,hasteBonus:.01,bond:{activeExecuteBonus:.03}},
 EVT_UNIT_008:{activeName:'Hollow Guard',mitigationMultiplier:1.14,defenseMultiplier:1.05,activeCooldownMultiplier:.96,bond:{defenseMultiplier:1.03}},
 EVT_UNIT_009:{activeName:'Frostbell Cycle',utilityMultiplier:1.08,activeHealMultiplier:1.08,activeCooldownMultiplier:.90,hasteBonus:.01,bond:{activeHealMultiplier:1.05}},
 EVT_UNIT_010:{activeName:'Caravan Formation',utilityMultiplier:1.05,activeHealMultiplier:1.05,defenseMultiplier:1.02,hasteBonus:.02,bond:{activeCooldownMultiplier:.96}},
};
const cooldown=(rarity:CompanionRarity,role:CompanionRole)=>1000*(role==='damage'?(rarity==='prestige'?18:20):rarity==='prestige'?22:24);
const target=(role:CompanionRole)=>role==='damage'?{assistTarget:'current_target' as const,standaloneTarget:'current_target' as const}:role==='tank'?{assistTarget:'owner' as const,standaloneTarget:'self' as const}:{assistTarget:'owner' as const,standaloneTarget:'lowest_hp_ally' as const};
const effect=(kind:string):CompanionServerDefinition['active']['effectKind']=>kind==='damage'?'damage':kind==='shield'?'shield':kind==='interrupt'?'interrupt':kind==='heal'?'heal':kind==='mitigation'?'mitigation':'utility';
export const COMPANION_SERVER_DEFINITIONS:CompanionServerDefinition[]=raw.map(([id,name,role,rarity,originId,hp,power,defense,attackSpeed,kind,coeff])=>({
 id,name,role,rarity,originId,baseStats:{hp,power,defense,attackSpeed},tags:[role,rarity,originId],
 active:{id:`${id}_ACTIVE`,name:COMPANION_IDENTITY_PROFILES[id]?.activeName??`${name} Signature`,cooldownMs:cooldown(rarity,role),baseCoeff:coeff,perLevelCoeff:kind==='damage'?.004:.0006,effectKind:effect(kind),targeting:target(role)},
 identity:COMPANION_IDENTITY_PROFILES[id],
 visual:rarity==='prestige'?{rarityFrame:'prestige',summonEffect:'prestige_summon',idleEffect:'prestige_idle',profileFrame:'prestige_profile',masteryMarker:'prestige_mastery',nameplateTreatment:'prestige_nameplate',animationRef:`${id}_prestige_entry`,rarityIcon:'★',rarityLabel:'Prestige',accessibilityLabel:'Prestige combat companion. Star rarity icon and ornate structured frame.',reducedMotionFallback:'prestige_static_entry'}:rarity==='elite'?{rarityFrame:'elite',summonEffect:'elite_summon',masteryMarker:'elite_mastery',rarityIcon:'◆◆◆',rarityLabel:'Elite',accessibilityLabel:'Elite combat companion. Triple-diamond rarity icon and distinct structured frame.',reducedMotionFallback:'elite_static_entry'}:rarity==='rare'?{rarityFrame:'rare',rarityIcon:'◆◆',rarityLabel:'Rare',accessibilityLabel:'Rare combat companion. Double-diamond rarity icon and enhanced frame.'}:{rarityFrame:'standard',rarityIcon:'◆',rarityLabel:'Standard',accessibilityLabel:'Standard combat companion. Single-diamond rarity icon and simple frame.'},
}));
export const companionServerDefinition=(id:string)=>COMPANION_SERVER_DEFINITIONS.find(x=>x.id===id);

export const COMPANION_TECHNIQUE_UNLOCK={ascensionTier:2,bondLevel:7,mode:'any' as const};

type TechniqueSeed={suffix:string;name:string;description:string;effects:CompanionTechniqueDefinition['effects']};
const CUSTOM_TECHNIQUE_SEEDS:Record<string,readonly TechniqueSeed[]>={
  UNIT_013:[
    {suffix:'VENOM_AMBUSH',name:'Venom Ambush',description:'Lean into poisoned prey with stronger finishing pressure.',effects:[{kind:'damage',value:.04},{kind:'execute',value:.08}]},
    {suffix:'SANDSTEP',name:'Sandstep',description:'Trade burst for faster repositioning and active cycles.',effects:[{kind:'haste',value:.08},{kind:'cooldown',value:-.06}]},
  ],
  UNIT_014:[
    {suffix:'DEEP_OASIS',name:'Deep Oasis',description:'Strengthen restoration for long encounters.',effects:[{kind:'heal_strength',value:.16}]},
    {suffix:'MIRAGE_CURRENT',name:'Mirage Current',description:'Quicker support pulses with a small haste bonus.',effects:[{kind:'haste',value:.06},{kind:'cooldown',value:-.08}]},
  ],
  UNIT_015:[
    {suffix:'SOLAR_SHELL',name:'Solar Shell',description:'Build a stronger protective shell before retaliation.',effects:[{kind:'shield_strength',value:.18}]},
    {suffix:'SUN_MIRROR',name:'Sun Mirror',description:'Slightly thinner shields reflect more absorbed damage.',effects:[{kind:'shield_strength',value:-.03},{kind:'reflect',value:.15}]},
  ],
  UNIT_016:[
    {suffix:'TYRANT_BULWARK',name:'Tyrant Bulwark',description:'Favor raw staying power and stronger barriers.',effects:[{kind:'defense',value:.08},{kind:'shield_strength',value:.10}]},
    {suffix:'BURNING_CROWN',name:'Burning Crown',description:'Convert some defensive budget into pressure.',effects:[{kind:'damage',value:.05},{kind:'defense',value:.03}]},
  ],
  UNIT_017:[
    {suffix:'SHATTERFANG',name:'Shatterfang',description:'Punish weakened prey with heavier finishing bites.',effects:[{kind:'execute',value:.12}]},
    {suffix:'WINTER_HUNT',name:'Winter Hunt',description:'Maintain a quicker hunting rhythm against durable targets.',effects:[{kind:'haste',value:.10},{kind:'damage',value:.02}]},
  ],
  UNIT_018:[
    {suffix:'GRAND_RESONANCE',name:'Grand Resonance',description:'Bigger bell pulses improve restorative output.',effects:[{kind:'heal_strength',value:.12}]},
    {suffix:'QUICK_CHIME',name:'Quick Chime',description:'Ring more often at the cost of peak effect strength.',effects:[{kind:'heal_strength',value:-.03},{kind:'cooldown',value:-.14}]},
  ],
  UNIT_019:[
    {suffix:'RESONANT_PLATING',name:'Resonant Plating',description:'Harden the Choir Golem for sustained punishment.',effects:[{kind:'defense',value:.10},{kind:'shield_strength',value:.06}]},
    {suffix:'FRACTURE_HYMN',name:'Fracture Hymn',description:'Turn resonance into a more aggressive guard pattern.',effects:[{kind:'damage',value:.05},{kind:'defense',value:.03}]},
  ],
  UNIT_020:[
    {suffix:'WYRMS_FURY',name:"Wyrm's Fury",description:'Commit to higher sustained damage.',effects:[{kind:'damage',value:.07}]},
    {suffix:'TELEGRAPH_HUNTER',name:'Telegraph Hunter',description:'Gain a larger payoff against enemies near defeat.',effects:[{kind:'execute',value:.11},{kind:'cooldown',value:-.04}]},
  ],
  UNIT_021:[
    {suffix:'OBSIDIAN_FANG',name:'Obsidian Fang',description:'Drive harder through armored targets.',effects:[{kind:'damage',value:.055}]},
    {suffix:'MOLTEN_PURSUIT',name:'Molten Pursuit',description:'Sacrifice some peak damage for speed and uptime.',effects:[{kind:'haste',value:.09},{kind:'cooldown',value:-.05}]},
  ],
  UNIT_022:[
    {suffix:'FORGE_BARRIER',name:'Forge Barrier',description:'Reinforce every generated barrier.',effects:[{kind:'shield_strength',value:.16},{kind:'defense',value:.04}]},
    {suffix:'OVERHEAT_GUARD',name:'Overheat Guard',description:'Return a portion of absorbed pressure to attackers.',effects:[{kind:'shield_strength',value:-.02},{kind:'reflect',value:.12}]},
  ],
  UNIT_023:[
    {suffix:'CHAIN_SURGE',name:'Chain Surge',description:'Increase Primal Spark damage output.',effects:[{kind:'damage',value:.06}]},
    {suffix:'QUICK_SPARK',name:'Quick Spark',description:'Favor rapid casts and attack tempo.',effects:[{kind:'haste',value:.12},{kind:'cooldown',value:-.06}]},
  ],
  UNIT_024:[
    {suffix:'REGENTS_WARD',name:"Regent's Ward",description:'Lean into defensive utility for difficult fights.',effects:[{kind:'defense',value:.08},{kind:'heal_strength',value:.08}]},
    {suffix:'SHADE_COMMAND',name:'Shade Command',description:'Cycle tactical support effects more quickly.',effects:[{kind:'haste',value:.08},{kind:'cooldown',value:-.08}]},
  ],
  EVT_UNIT_001:[
    {suffix:'FIRST_LIGHT',name:'First Light',description:'Strengthen the Keeper’s opening protection.',effects:[{kind:'shield_strength',value:.12},{kind:'haste',value:.04}]},
    {suffix:'NEW_DAWN',name:'New Dawn',description:'Trade peak protection for faster support cycles.',effects:[{kind:'cooldown',value:-.12}]},
  ],
  EVT_UNIT_002:[
    {suffix:'SHARED_VOW',name:'Shared Vow',description:'Strengthen restorative effects on vulnerable allies.',effects:[{kind:'heal_strength',value:.14}]},
    {suffix:'GUARDED_BOND',name:'Guarded Bond',description:'Favor protection over healing throughput.',effects:[{kind:'defense',value:.08},{kind:'cooldown',value:-.05}]},
  ],
  EVT_UNIT_003:[
    {suffix:'ROOT_BASTION',name:'Root Bastion',description:'Grow thicker shields as the fight continues.',effects:[{kind:'shield_strength',value:.15},{kind:'defense',value:.05}]},
    {suffix:'LIVING_BARK',name:'Living Bark',description:'Favor sustained defense and faster recovery cycles.',effects:[{kind:'defense',value:.09},{kind:'cooldown',value:-.05}]},
  ],
  EVT_UNIT_004:[
    {suffix:'SOLAR_MOMENTUM',name:'Solar Momentum',description:'Build stronger sustained pressure.',effects:[{kind:'damage',value:.07}]},
    {suffix:'FINAL_RADIANCE',name:'Final Radiance',description:'Save the brightest strike for wounded enemies.',effects:[{kind:'execute',value:.13}]},
  ],
  EVT_UNIT_005:[
    {suffix:'STARFALL',name:'Starfall',description:'Increase the damage budget of Star Mark bursts.',effects:[{kind:'damage',value:.055}]},
    {suffix:'ASTRAL_TEMPO',name:'Astral Tempo',description:'Cycle Star Marks faster with increased tempo.',effects:[{kind:'haste',value:.10},{kind:'cooldown',value:-.06}]},
  ],
  EVT_UNIT_006:[
    {suffix:'STORED_HARVEST',name:'Stored Harvest',description:'Convert more incoming pressure into future barriers.',effects:[{kind:'shield_strength',value:.15}]},
    {suffix:'AUTUMN_REPRISAL',name:'Autumn Reprisal',description:'Return a portion of absorbed damage to attackers.',effects:[{kind:'reflect',value:.12},{kind:'defense',value:.03}]},
  ],
  EVT_UNIT_007:[
    {suffix:'VEIL_REND',name:'Veil Rend',description:'Hit weakened, debuffed targets much harder.',effects:[{kind:'execute',value:.12},{kind:'damage',value:.02}]},
    {suffix:'SHADOW_CHASE',name:'Shadow Chase',description:'Stay on debuffed targets with faster attacks and actives.',effects:[{kind:'haste',value:.08},{kind:'cooldown',value:-.07}]},
  ],
  EVT_UNIT_008:[
    {suffix:'LAST_STAND',name:'Last Stand',description:'Increase defensive scaling when the Knightling is pressured.',effects:[{kind:'defense',value:.11},{kind:'shield_strength',value:.06}]},
    {suffix:'HOLLOW_MIRROR',name:'Hollow Mirror',description:'Reflect more damage through spectral barriers.',effects:[{kind:'reflect',value:.14},{kind:'shield_strength',value:-.03}]},
  ],
  EVT_UNIT_009:[
    {suffix:'GRAND_BELL',name:'Grand Bell',description:'Favor stronger restorative bell auras.',effects:[{kind:'heal_strength',value:.12}]},
    {suffix:'QUICK_BELL',name:'Quick Bell',description:'Rotate support bells more frequently.',effects:[{kind:'cooldown',value:-.14},{kind:'haste',value:.04}]},
  ],
  EVT_UNIT_010:[
    {suffix:'CARAVAN_WARD',name:'Caravan Ward',description:'Favor protection for long expeditions and boss fights.',effects:[{kind:'defense',value:.08},{kind:'heal_strength',value:.06}]},
    {suffix:'ADAPTABLE_ROUTE',name:'Adaptable Route',description:'Favor flexible tempo and shorter support cooldowns.',effects:[{kind:'haste',value:.08},{kind:'cooldown',value:-.06}]},
  ],
};

const techniquePair=(def:CompanionServerDefinition):CompanionTechniqueDefinition[]=>{
 const group=`${def.id}:technique`,unlock=COMPANION_TECHNIQUE_UNLOCK,custom=CUSTOM_TECHNIQUE_SEEDS[def.id];
 if(custom?.length===2){const suffixes=def.role==='tank'?['FORTIFIED','REFLECTIVE']:def.role==='damage'?['EXECUTIONER','RELENTLESS']:['DEEP_RESTORATION','RAPID_AID'];return custom.map((seed,index)=>({id:`${def.id}_${suffixes[index]}`,companionId:def.id,name:seed.name,description:seed.description,mutuallyExclusiveGroup:group,unlock,effects:[...seed.effects]}));}
 if(def.role==='tank')return[
  {id:`${def.id}_FORTIFIED`,companionId:def.id,name:'Fortified Shell',description:'Shield strength +15%.',mutuallyExclusiveGroup:group,unlock,effects:[{kind:'shield_strength',value:.15}]},
  {id:`${def.id}_REFLECTIVE`,companionId:def.id,name:'Reflective Shell',description:'Shield strength -5%, but reflects part of absorbed damage.',mutuallyExclusiveGroup:group,unlock,effects:[{kind:'shield_strength',value:-.05},{kind:'reflect',value:.12}]},
 ];
 if(def.role==='damage')return[
  {id:`${def.id}_EXECUTIONER`,companionId:def.id,name:'Executioner',description:'Higher damage against enemies below 30% HP.',mutuallyExclusiveGroup:group,unlock,effects:[{kind:'execute',value:.10}]},
  {id:`${def.id}_RELENTLESS`,companionId:def.id,name:'Relentless',description:'Smaller damage bonus with a shorter active cooldown.',mutuallyExclusiveGroup:group,unlock,effects:[{kind:'damage',value:.03},{kind:'cooldown',value:-.08}]},
 ];
 return[
  {id:`${def.id}_DEEP_RESTORATION`,companionId:def.id,name:'Deep Restoration',description:'Stronger healing and restoration.',mutuallyExclusiveGroup:group,unlock,effects:[{kind:'heal_strength',value:.13}]},
  {id:`${def.id}_RAPID_AID`,companionId:def.id,name:'Rapid Aid',description:'Slightly weaker effect with a shorter active cooldown.',mutuallyExclusiveGroup:group,unlock,effects:[{kind:'heal_strength',value:-.04},{kind:'cooldown',value:-.12}]},
 ];
};
export const COMPANION_TECHNIQUES=COMPANION_SERVER_DEFINITIONS.flatMap(techniquePair);
export const companionTechniques=(companionId:string)=>COMPANION_TECHNIQUES.filter(x=>x.companionId===companionId);
export const companionTechnique=(id:string)=>COMPANION_TECHNIQUES.find(x=>x.id===id);

export const COMPANION_RARITY_TARGET:Record<CompanionRarity,number>={standard:1,rare:1.09,elite:1.12,prestige:1.155};
export const COMPANION_RARITY_MAX_LEVEL:Record<CompanionRarity,number>={standard:20,rare:25,elite:30,prestige:35};
export const COMPANION_DUPLICATE_ESSENCE:Record<CompanionRarity,number>={standard:50,rare:100,elite:180,prestige:300};
export const COMPANION_MAX_XP_ESSENCE_RATE=.10;
export const COMPANION_MAX_XP_WEEKLY_ESSENCE_CAP=500;
export const COMPANION_EXPEDITION_BOND_RATE=.25;
export const COMPANION_EXPEDITION_GRADE_THRESHOLDS={B:1.10,A:1.25,S:1.50} as const;
export const COMPANION_EXPEDITION_PEN_DURATION_REDUCTION:Record<number,number>={0:0,1:0,2:.03,3:.05};
export const COMPANION_EXPEDITION_BONUS_CHANCE_CAP=.20;
export const COMPANION_TECHNIQUE_SWITCH_COST={gold:0,companionEssence:80};
export const COMPANION_SYNERGY_COMBAT_CAP=1.06;

export interface CompanionTrialModifierConfig{
 id:string;description:string;enemyDefenseMultiplier?:number;enemyAttackMultiplier?:number;enemyHpMultiplier?:number;enemyHasteBonus?:number;enemyAccuracyBonus?:number;playerHealingMultiplier?:number;playerHasteBonus?:number;playerShieldMultiplier?:number;
}
export const COMPANION_TRIAL_MODIFIERS:Record<string,CompanionTrialModifierConfig>={
 armored:{id:'armored',description:'Enemies have increased defense.',enemyDefenseMultiplier:1.10},
 rushing:{id:'rushing',description:'Enemies act faster.',enemyHasteBonus:.05},
 anti_heal:{id:'anti_heal',description:'Healing is reduced.',playerHealingMultiplier:.88},
 shattering:{id:'shattering',description:'Enemy attacks pressure shields.',enemyAttackMultiplier:1.04,playerShieldMultiplier:.94},
 arcane_storm:{id:'arcane_storm',description:'Periodic magic pressure.',enemyAttackMultiplier:1.06},
 execution:{id:'execution',description:'Low-HP companions are threatened.',enemyAttackMultiplier:1.03,enemyAccuracyBonus:.02},
 predator:{id:'predator',description:'Enemies pressure the weakest companion.',enemyAccuracyBonus:.03},
 unstable_magic:{id:'unstable_magic',description:'Companion cooldowns recover slightly faster, but enemy magic pressure rises.',playerHasteBonus:.04,enemyAttackMultiplier:1.05},
 thick_hide:{id:'thick_hide',description:'Enemies resist basic pressure.',enemyDefenseMultiplier:1.06,enemyHpMultiplier:1.03},
 frailty:{id:'frailty',description:'Companion shields are modestly weaker.',playerShieldMultiplier:.90},
 relentless:{id:'relentless',description:'Enemies fight with increasing tempo.',enemyHasteBonus:.07},
};
export const COMPANION_TRIAL_FLOOR_COUNT=30;
export const COMPANION_TRIAL_BOSS_INTERVAL=5;
export const COMPANION_TRIAL_RECOMMENDED_POWER_START=2750;
export const COMPANION_TRIAL_RECOMMENDED_POWER_END=4300;
export const COMPANION_TRIAL_ENEMY_GROWTH=1.020;
export const COMPANION_TRIAL_MITIGATION_CONSTANT=100;
export const companionTrialRecommendedPower=(floor:number)=>{const f=Math.max(1,Math.min(COMPANION_TRIAL_FLOOR_COUNT,Math.floor(floor)));const t=(f-1)/Math.max(1,COMPANION_TRIAL_FLOOR_COUNT-1);return Math.round(COMPANION_TRIAL_RECOMMENDED_POWER_START*Math.pow(COMPANION_TRIAL_RECOMMENDED_POWER_END/COMPANION_TRIAL_RECOMMENDED_POWER_START,t));};
export const companionTrialEnemyScale=(floor:number)=>Math.pow(COMPANION_TRIAL_ENEMY_GROWTH,Math.max(0,Math.floor(floor)-1));
export const companionTrialFloorModifiers=(floor:number)=>{
 const pool=['armored','rushing','anti_heal','shattering','arcane_storm','execution','predator','unstable_magic','thick_hide','frailty','relentless'];
 const count=floor>=21?3:floor>=11?2:1;return Array.from({length:count},(_,i)=>pool[(floor*3+i*4)%pool.length]);
};
export const companionTrialReward=(floor:number,firstClear:boolean,boss:boolean)=>({
 companionEssence:firstClear?Math.round(25+floor*4+(boss?60:0)):0,
 gold:firstClear?Math.round(300+floor*90+(boss?1200:0)):Math.round(20+floor*3),
 bondstones:firstClear&&boss?(floor>=30?3:floor>=20?2:floor>=10?1:0):0,
 materials:firstClear&&boss?{TRIAL_SANCTUARY_MATERIAL:Math.max(1,Math.floor(floor/10))}:{},
});
export const COMPANION_MONTHLY_COMPLETION_REWARD={companionEssence:600,gold:15000,bondstones:3,materials:{TRIAL_SANCTUARY_MATERIAL:4}};

export const COMPANION_WEEKLY_CHALLENGES:CompanionWeeklyChallengeDefinition[]=[
 {id:'NO_PRESTIGE_15',name:'Humble Resolve',description:'Clear Floor 15 with no Prestige companion.',minimumFloor:15,restrictions:[{type:'prohibit_rarity',rarity:'prestige'}],rewards:{companionEssence:120,bondstones:1,gold:2500}},
 {id:'STANDARD_BOSS',name:'Common Ground',description:'Clear a boss using at least one Standard companion.',minimumFloor:5,restrictions:[{type:'require_rarity',rarity:'standard',count:1}],rewards:{companionEssence:100,bondstones:1,gold:2200}},
 {id:'ASTERFALL_PAIR',name:'Asterfall Kin',description:'Clear 5+ floors with two Asterfall companions.',minimumFloor:5,restrictions:[{type:'require_origin',originId:'REG_001',count:2}],rewards:{companionEssence:110,bondstones:0,gold:2500,materials:{IRONWOOD_FANG:3}}},
 {id:'RARITY_SPECTRUM',name:'Rarity Spectrum',description:'Clear a boss with Standard, Rare and Elite/Prestige represented.',minimumFloor:10,restrictions:[{type:'rarity_mix',rarities:['standard','rare','elite']}],rewards:{companionEssence:150,bondstones:1,gold:3000}},
];

export const COMPANION_MISSIONS:CompanionMissionDefinition[]=[
 {id:'MISSION_SCOUT_2H',name:'Asterfall Perimeter Patrol',originId:'REG_001',durationMs:2*3600_000,missionVersion:2,minCompanions:1,maxCompanions:2,minimumPenLevel:1,minimumLevel:5,recommendedPower:1050,requirements:[{type:'min_level',value:5}],bonusRequirements:[{type:'origin_count',originId:'REG_001',count:1}],costs:{gold:300},baseRewards:{companionEssence:3,gold:280,companionXp:85,bondXp:12,materials:{IRONWOOD_FANG:1}},bonusRewards:{companionEssence:2,materials:{SUPPLIES:1}},bonusRewardChanceByGrade:{B:.05,A:.10,S:.15}},
 {id:'MISSION_APPRENTICE_3H',name:'Apprentice Field Survey',originId:'REG_001',durationMs:3*3600_000,missionVersion:1,minCompanions:2,maxCompanions:2,minimumPenLevel:1,minimumLevel:8,recommendedPower:1650,requirements:[{type:'max_rarity',rarity:'rare'},{type:'min_level',value:8}],bonusRequirements:[{type:'role_count',role:'support',count:1}],costs:{gold:430,materials:{SUPPLIES:1}},baseRewards:{companionEssence:5,gold:390,companionXp:120,bondXp:16,materials:{WISP_DUST:1}},bonusRewards:{companionEssence:2,materials:{SUPPLIES:1}},bonusRewardChanceByGrade:{B:.04,A:.08,S:.12}},
 {id:'MISSION_SILVERBROOK_4H',name:'Silverbrook Relief Run',originId:'REG_001',durationMs:4*3600_000,missionVersion:1,minCompanions:2,maxCompanions:3,minimumPenLevel:1,minimumLevel:10,recommendedPower:2100,requirements:[{type:'role_count',role:'support',count:1},{type:'min_level',value:10}],bonusRequirements:[{type:'origin_count',originId:'REG_001',count:2}],costs:{gold:600,materials:{SUPPLIES:1}},baseRewards:{companionEssence:7,gold:520,companionXp:155,bondXp:20,materials:{WISP_DUST:2}},bonusRewards:{companionEssence:3,materials:{ECHO_QUARTZ:1}},bonusRewardChanceByGrade:{B:.04,A:.09,S:.14}},
 {id:'MISSION_SUNSCAR_4H',name:'Sunscar Caravan Guard',originId:'REG_SUNSCAR',durationMs:4*3600_000,missionVersion:2,minCompanions:2,maxCompanions:3,minimumPenLevel:1,minimumLevel:15,recommendedPower:2800,requirements:[{type:'role_count',role:'tank',count:1},{type:'role_count',role:'support',count:1},{type:'min_level',value:15},{type:'origin_count',originId:'REG_SUNSCAR',count:1}],bonusRequirements:[{type:'origin_count',originId:'REG_SUNSCAR',count:2}],bonusOriginId:'REG_SUNSCAR',costs:{gold:650,materials:{SUPPLIES:2}},baseRewards:{companionEssence:7,gold:600,companionXp:160,bondXp:20,materials:{AMBERGLASS:1}},bonusRewards:{companionEssence:4,materials:{AMBERGLASS:1}},bonusRewardChanceByGrade:{B:.04,A:.08,S:.14}},
 {id:'MISSION_FROST_SCOUT_4H',name:'Frostmarch Whiteout Scout',originId:'REG_FROSTMARCH',durationMs:4*3600_000,missionVersion:1,minCompanions:2,maxCompanions:2,minimumPenLevel:1,minimumLevel:15,recommendedPower:2750,requirements:[{type:'role_count',role:'damage',count:1},{type:'min_level',value:15},{type:'origin_count',originId:'REG_FROSTMARCH',count:1}],bonusRequirements:[{type:'role_count',role:'support',count:1}],costs:{gold:690,materials:{SUPPLIES:2}},baseRewards:{companionEssence:7,gold:610,companionXp:165,bondXp:21,materials:{FROSTIRON:1}},bonusRewards:{companionEssence:4,materials:{RIMEGLASS:1}},bonusRewardChanceByGrade:{B:.04,A:.08,S:.13}},
 {id:'MISSION_ASTERFALL_SHRINE_8H',name:'Forgotten Asterfall Shrine',originId:'REG_001',durationMs:8*3600_000,missionVersion:1,minCompanions:3,maxCompanions:3,minimumPenLevel:2,minimumBondLevel:4,recommendedPower:3000,requirements:[{type:'min_bond',value:4},{type:'min_rarity',rarity:'rare',count:1}],bonusRequirements:[{type:'origin_count',originId:'REG_001',count:3}],costs:{gold:1050,materials:{SUPPLIES:3}},baseRewards:{companionEssence:14,gold:900,companionXp:250,bondXp:30,materials:{IRONWOOD_FANG:3}},bonusRewards:{companionEssence:7,materials:{TRIAL_SANCTUARY_MATERIAL:1}},bonusRewardChanceByGrade:{A:.06,S:.14}},
 {id:'MISSION_SUNSCAR_RUINS_8H',name:'Sunscar Ruin Survey',originId:'REG_SUNSCAR',durationMs:8*3600_000,missionVersion:1,minCompanions:3,maxCompanions:3,minimumPenLevel:2,minimumLevel:18,recommendedPower:3300,requirements:[{type:'role_count',role:'damage',count:1},{type:'role_count',role:'support',count:1},{type:'origin_count',originId:'REG_SUNSCAR',count:2},{type:'min_level',value:18}],bonusRequirements:[{type:'min_bond',value:5,count:2}],costs:{gold:1200,materials:{SUPPLIES:3}},baseRewards:{companionEssence:15,gold:1025,companionXp:285,bondXp:34,materials:{ASTRAL_SCRIPT:1}},bonusRewards:{companionEssence:7,materials:{SUNSTONE_ORE:1}},bonusRewardChanceByGrade:{A:.05,S:.12}},
 {id:'MISSION_FROST_8H',name:'Frostmarch Bell Route',originId:'REG_FROSTMARCH',durationMs:8*3600_000,missionVersion:2,minCompanions:2,maxCompanions:3,minimumPenLevel:2,minimumLevel:15,recommendedPower:3000,requirements:[{type:'role_count',role:'support',count:1},{type:'min_level',value:15}],bonusRequirements:[{type:'origin_count',originId:'REG_FROSTMARCH',count:2}],bonusOriginId:'REG_FROSTMARCH',costs:{gold:1100,materials:{SUPPLIES:3}},baseRewards:{companionEssence:15,gold:950,companionXp:270,bondXp:32,materials:{RIMEGLASS:1}},bonusRewards:{companionEssence:7,materials:{RIMEGLASS:1}},bonusRewardChanceByGrade:{A:.05,S:.12},bondstoneEligible:true},
 {id:'MISSION_ASH_RESCUE_8H',name:'Ashlands Furnace Rescue',originId:'REG_ASHLANDS',durationMs:8*3600_000,missionVersion:1,minCompanions:3,maxCompanions:3,minimumPenLevel:2,minimumLevel:18,recommendedPower:3500,requirements:[{type:'role_count',role:'tank',count:1},{type:'role_count',role:'support',count:1},{type:'origin_count',originId:'REG_ASHLANDS',count:1},{type:'min_level',value:18}],bonusRequirements:[{type:'min_ascension',tier:2,count:2}],costs:{gold:1280,materials:{SUPPLIES:3}},baseRewards:{companionEssence:15,gold:1080,companionXp:300,bondXp:36,materials:{BANNER_ASH:1}},bonusRewards:{companionEssence:7,materials:{TRIAL_SANCTUARY_MATERIAL:1}},bonusRewardChanceByGrade:{A:.04,S:.10}},
 {id:'MISSION_ASH_12H',name:'Ashlands Crucible Watch',originId:'REG_ASHLANDS',durationMs:12*3600_000,missionVersion:2,minCompanions:3,maxCompanions:3,minimumPenLevel:3,minimumLevel:20,recommendedPower:4000,requirements:[{type:'role_count',role:'tank',count:1},{type:'role_count',role:'damage',count:1},{type:'min_level',value:20},{type:'min_ascension',tier:2,count:2}],bonusRequirements:[{type:'origin_count',originId:'REG_ASHLANDS',count:2}],bonusOriginId:'REG_ASHLANDS',costs:{gold:1600,materials:{SUPPLIES:4}},baseRewards:{companionEssence:22,gold:1350,companionXp:400,bondXp:44,materials:{BANNER_ASH:1}},bonusRewards:{companionEssence:10,materials:{TRIAL_SANCTUARY_MATERIAL:1}},bonusRewardChanceByGrade:{A:.04,S:.10},bondstoneEligible:true},

 {id:'MISSION_GREENFIELDS_FORAGE_2H',name:'Greenfields Forage Run',originId:'REG_001',durationMs:2*3600_000,missionVersion:1,minCompanions:1,maxCompanions:2,minimumPenLevel:1,minimumLevel:5,recommendedPower:1000,requirements:[{type:'min_level',value:5},{type:'max_rarity',rarity:'rare'}],bonusRequirements:[{type:'max_rarity',rarity:'standard'}],costs:{gold:260},baseRewards:{companionEssence:2,gold:230,companionXp:80,bondXp:10,materials:{WISP_DUST:1}},bonusRewards:{companionEssence:2,materials:{MOSS_FIBER:2}},bonusRewardChanceByGrade:{B:.06,A:.10,S:.16}},
 {id:'MISSION_IRONWOOD_TRACK_4H',name:'Ironwood Tracking Detail',originId:'REG_001',durationMs:4*3600_000,missionVersion:1,minCompanions:2,maxCompanions:2,minimumPenLevel:1,minimumLevel:10,recommendedPower:2200,requirements:[{type:'role_count',role:'damage',count:1},{type:'min_level',value:10},{type:'origin_count',originId:'REG_001',count:1}],bonusRequirements:[{type:'origin_count',originId:'REG_001',count:2}],costs:{gold:520,materials:{SUPPLIES:1}},baseRewards:{companionEssence:5,gold:470,companionXp:150,bondXp:18,materials:{THORN_SAP:2}},bonusRewards:{companionEssence:3,materials:{IRONWOOD_FANG:2}},bonusRewardChanceByGrade:{B:.05,A:.10,S:.16}},
 {id:'MISSION_SUNSCAR_RELIC_6H',name:'Sunscar Relic Survey',originId:'REG_SUNSCAR',durationMs:6*3600_000,missionVersion:1,minCompanions:2,maxCompanions:3,minimumPenLevel:2,minimumLevel:18,recommendedPower:3150,requirements:[{type:'role_count',role:'support',count:1},{type:'min_bond',value:4,count:2},{type:'origin_count',originId:'REG_SUNSCAR',count:1}],bonusRequirements:[{type:'origin_count',originId:'REG_SUNSCAR',count:2}],costs:{gold:900,materials:{SUPPLIES:2}},baseRewards:{companionEssence:7,gold:760,companionXp:215,bondXp:26,materials:{ASTRAL_SCRIPT:1}},bonusRewards:{companionEssence:5,materials:{SUNSTONE_ORE:2}},bonusRewardChanceByGrade:{A:.08,S:.15}},
 {id:'MISSION_FROST_RESONANCE_6H',name:'Frostmarch Resonance Survey',originId:'REG_FROSTMARCH',durationMs:6*3600_000,missionVersion:1,minCompanions:2,maxCompanions:3,minimumPenLevel:2,minimumLevel:18,recommendedPower:3250,requirements:[{type:'role_count',role:'tank',count:1},{type:'min_bond',value:5,count:2},{type:'origin_count',originId:'REG_FROSTMARCH',count:1}],bonusRequirements:[{type:'origin_count',originId:'REG_FROSTMARCH',count:2}],costs:{gold:940,materials:{SUPPLIES:2}},baseRewards:{companionEssence:8,gold:800,companionXp:225,bondXp:28,materials:{CHOIR_BLOOM:1}},bonusRewards:{companionEssence:5,materials:{FROSTIRON:2}},bonusRewardChanceByGrade:{A:.07,S:.14}},
 {id:'MISSION_ASHLANDS_SALVAGE_8H',name:'Blackglass Salvage Run',originId:'REG_ASHLANDS',durationMs:8*3600_000,missionVersion:1,minCompanions:2,maxCompanions:3,minimumPenLevel:2,minimumLevel:20,recommendedPower:3600,requirements:[{type:'role_count',role:'damage',count:1},{type:'min_ascension',tier:1,count:2},{type:'origin_count',originId:'REG_ASHLANDS',count:1}],bonusRequirements:[{type:'origin_count',originId:'REG_ASHLANDS',count:2}],costs:{gold:1250,materials:{SUPPLIES:3}},baseRewards:{companionEssence:12,gold:1050,companionXp:310,bondXp:36,materials:{BLACKGLASS_CORE:1}},bonusRewards:{companionEssence:7,materials:{BANNER_ASH:2}},bonusRewardChanceByGrade:{A:.06,S:.13}},
 {id:'MISSION_OLD_FRIENDS_8H',name:'Old Friends Patrol',originId:'REG_001',durationMs:8*3600_000,missionVersion:1,minCompanions:3,maxCompanions:3,minimumPenLevel:2,minimumBondLevel:6,recommendedPower:2850,requirements:[{type:'max_rarity',rarity:'standard'},{type:'min_bond',value:6}],bonusRequirements:[{type:'origin_count',originId:'REG_001',count:3}],costs:{gold:950,materials:{SUPPLIES:2}},baseRewards:{companionEssence:10,gold:820,companionXp:280,bondXp:38,materials:{WISP_DUST:3}},bonusRewards:{companionEssence:8,materials:{TRIAL_SANCTUARY_MATERIAL:1}},bonusRewardChanceByGrade:{A:.08,S:.16}},
 {id:'MISSION_PRESTIGE_VIGIL_12H',name:'Sanctuary Prestige Vigil',durationMs:12*3600_000,missionVersion:1,minCompanions:3,maxCompanions:3,minimumPenLevel:3,minimumLevel:20,recommendedPower:4250,requirements:[{type:'min_rarity',rarity:'elite',count:2},{type:'min_ascension',tier:2,count:3},{type:'min_bond',value:7,count:3}],bonusRequirements:[{type:'min_rarity',rarity:'prestige',count:1}],costs:{gold:1750,materials:{SUPPLIES:4}},baseRewards:{companionEssence:18,gold:1450,companionXp:420,bondXp:48,materials:{TRIAL_SANCTUARY_MATERIAL:1}},bonusRewards:{companionEssence:12,materials:{TRIAL_SANCTUARY_MATERIAL:1}},bonusRewardChanceByGrade:{A:.05,S:.12},bondstoneEligible:true},];
export const companionMission=(id:string)=>COMPANION_MISSIONS.find(x=>x.id===id);

export const COMPANION_PROVING_GROUNDS:CompanionProvingGroundChallengeDefinition[]=[
 {id:'PG_UNDERESTIMATED',name:'Underestimated',description:'Defeat a boss while using a Rare-or-lower Combat Companion.',eventTypes:['boss_defeat'],targetCount:1,condition:{maxRarity:'rare'},rewards:{companionEssence:100,gold:2500,bondstones:1}},
 {id:'PG_TRUSTED_ALLY',name:'Trusted Ally',description:'Complete a Dungeon using a Companion with Bond Level 8+.',eventTypes:['dungeon_complete'],targetCount:1,condition:{minBondLevel:8},rewards:{companionEssence:80,gold:2200,bondstones:0,materials:{TRIAL_SANCTUARY_MATERIAL:1}}},
 {id:'PG_BORROWED_DEFENSE',name:'Borrowed Defense',description:'As a Damage character, complete content using a Tank Companion.',eventTypes:['battle_complete','boss_defeat','dungeon_complete'],targetCount:3,condition:{requiredCharacterRole:'damage',requiredCompanionRole:'tank'},rewards:{companionEssence:75,gold:1800,bondstones:0}},
 {id:'PG_OLD_FRIENDS',name:'Old Friends',description:'Complete 25 battles using a Standard Companion.',eventTypes:['battle_complete'],targetCount:25,condition:{requiredRarity:'standard'},rewards:{companionEssence:130,gold:3200,bondstones:1}},
 {id:'PG_REGIONAL_LOYALTY',name:'Regional Loyalty',description:'Clear a Companion Trial boss with at least two Companions from the same origin.',eventTypes:['trial_boss_clear'],targetCount:1,condition:{requiredOriginCount:2},rewards:{companionEssence:110,gold:2600,bondstones:1}},
 {id:'PG_AGAINST_ODDS',name:'Against the Odds',description:'Clear a Companion Trial floor below its recommended Companion Team Power.',eventTypes:['trial_floor_clear','trial_boss_clear'],targetCount:1,condition:{belowRecommendedPower:true},rewards:{companionEssence:90,gold:2100,bondstones:0}},
 {id:'PG_MIXED_COMPANY',name:'Mixed Company',description:'Clear Companion Trials with one Standard, one Rare and one Elite/Prestige.',eventTypes:['trial_floor_clear','trial_boss_clear'],targetCount:3,condition:{rarityMix:['standard','rare','elite']},rewards:{companionEssence:150,gold:3400,bondstones:1}},
];

export const COMPANION_CODEX_MILESTONES:CompanionCodexMilestoneDefinition[]=[
 {id:'CODEX_COLLECTOR_I',name:'Companion Collector I',description:'Own 5 Combat Companions.',requirement:{type:'owned_total',count:5},reward:{companionEssence:120,rewardIds:['PROFILE_BADGE_COMPANION_COLLECTOR_I']}},
 {id:'CODEX_COLLECTOR_II',name:'Companion Collector II',description:'Own 15 Combat Companions.',requirement:{type:'owned_total',count:15},reward:{companionEssence:200,rewardIds:['PROFILE_BACKGROUND_COMPANION_GALLERY'],showcaseSlots:2}},
 {id:'CODEX_BONDKEEPER',name:'Bondkeeper',description:'Reach Bond 10 with 5 Combat Companions.',requirement:{type:'bond_10',count:5},reward:{companionEssence:160,rewardIds:['TITLE_BONDKEEPER']}},
 {id:'CODEX_MASTER_HANDLER',name:'Master Handler',description:'Fully Master 3 Combat Companions.',requirement:{type:'mastered',count:3},reward:{companionEssence:250,rewardIds:['PROFILE_BORDER_MASTER_HANDLER'],showcaseSlots:3}},
 {id:'CODEX_WORLDLY_COMPANY',name:'Worldly Company',description:'Own Combat Companions from 5 different origins.',requirement:{type:'origins_owned',count:5},reward:{companionEssence:180,rewardIds:['PROFILE_BADGE_WORLDLY_COMPANY']}},
];

export const COMPANION_SPECIAL_CHALLENGES:CompanionSpecialChallengeDefinition[]=[
 {id:'CHALLENGE_OATHGLASS_KNIGHTLING',name:'Oathglass Reflection Trial',bossId:'BOSS_COMPANION_OATHGLASS',rewardCompanionId:'UNIT_012',recommendedTeamPower:3800,requirements:[
  {type:'trial_floor',amount:20,description:'Reach Companion Trial Floor 20.'},{type:'boss_clear_count',target:'FALLEN_KNIGHT',amount:10,description:'Defeat the Fallen Knight 10 times.'},{type:'companion_owned',target:'UNIT_007',amount:1,description:'Own Gloamknife Shade.'},{type:'companion_bond_total',amount:18,originId:'REG_001',description:'Reach 18 total Bond across Asterfall companions.'},
 ]},
 {id:'CHALLENGE_TYRANTS_HEIR',name:"Tyrant's Heir Trial",bossId:'BOSS_COMPANION_TYRANT_HEIR',rewardCompanionId:'UNIT_016',recommendedTeamPower:3950,requirements:[
  {type:'trial_floor',amount:20,description:'Reach Companion Trial Floor 20.'},{type:'companion_owned',target:'UNIT_013',description:'Own Dune Stalker.'},{type:'companion_owned',target:'UNIT_014',description:'Own Oasis Djinnling.'},{type:'companion_owned',target:'UNIT_015',description:'Own Solar Scarab.'},{type:'companion_bond_total',amount:18,originId:'REG_SUNSCAR',description:'Reach 18 total Bond across Sunscar companions.'},
 ]},
 {id:'CHALLENGE_WYRM_ECHO',name:'Wyrm Echo Trial',bossId:'BOSS_COMPANION_WYRM_ECHO',rewardCompanionId:'UNIT_020',recommendedTeamPower:4200,requirements:[
  {type:'trial_floor',amount:25,description:'Reach Companion Trial Floor 25.'},{type:'companion_owned',target:'UNIT_017',description:'Own Rime Wolf Pup.'},{type:'companion_owned',target:'UNIT_018',description:'Own Bell Sprite.'},{type:'companion_owned',target:'UNIT_019',description:'Own Choir Golem.'},{type:'companion_bond_total',amount:18,originId:'REG_FROSTMARCH',description:'Reach 18 total Bond across Frostmarch companions.'},
 ]},
 {id:'CHALLENGE_REGENT_SHADE',name:'Regent Shade Trial',bossId:'BOSS_COMPANION_REGENT_SHADE',rewardCompanionId:'UNIT_024',recommendedTeamPower:4400,requirements:[
  {type:'trial_floor',amount:30,description:'Reach Companion Trial Floor 30.'},{type:'companion_owned',target:'UNIT_021',description:'Own Obsidian Drakelet.'},{type:'companion_owned',target:'UNIT_022',description:'Own Forge Custodian.'},{type:'companion_owned',target:'UNIT_023',description:'Own Primal Spark.'},{type:'companion_bond_total',amount:21,originId:'REG_ASHLANDS',description:'Reach 21 total Bond across Ashlands companions.'},
 ]},
 {id:'CHALLENGE_ASHEN_SUNWYRM_FUTURE',name:'Ashen Sunwyrm Challenge',bossId:'BOSS_COMPANION_ASHEN_SUNWYRM',rewardCompanionId:'FUTURE_ASHEN_SUNWYRM',recommendedTeamPower:4350,requirements:[
  {type:'region_completion',target:'REG_SUNSCAR',description:'Complete Sunscar story progression.'},{type:'trial_floor',amount:25,description:'Reach Companion Trial Floor 25.'},{type:'boss_clear_count',target:'SUNSCAR_REGIONAL_BOSS',amount:15,description:'Defeat the Sunscar regional boss 15 times.'},{type:'companion_bond_total',amount:18,originId:'REG_SUNSCAR',description:'Reach 18 total Bond across Sunscar companions.'},
 ]},
];

const utcBounds=(seasonKey:string)=>{const [y,m]=seasonKey.split('-').map(Number);const startsAt=new Date(Date.UTC(y,m-1,1)).toISOString();const endsAt=new Date(Date.UTC(y,m,1)).toISOString();return{startsAt,endsAt};};
const SEASON_OVERRIDES:Record<string,Partial<Omit<CompanionTrialSeasonDefinition,'seasonKey'|'startsAt'|'endsAt'>>>={
 '2026-09':{floorSetId:'tower_v1',modifiers:['armored','unstable_magic'],rewardSetId:'monthly_v1',specialChallenges:['NO_PRESTIGE_15'],featuredOrigin:'REG_SUNSCAR',featuredCompanionIds:['UNIT_013','UNIT_014','UNIT_015','UNIT_016']},
 '2026-10':{floorSetId:'tower_v1',modifiers:['thick_hide','execution'],rewardSetId:'monthly_v1',specialChallenges:['STANDARD_BOSS'],featuredOrigin:'REG_FROSTMARCH',featuredCompanionIds:['UNIT_017','UNIT_018','UNIT_019','UNIT_020']},
 '2026-11':{floorSetId:'tower_v1',modifiers:['relentless','frailty'],rewardSetId:'monthly_v1',specialChallenges:['RARITY_SPECTRUM'],featuredOrigin:'REG_ASHLANDS',featuredCompanionIds:['UNIT_021','UNIT_022','UNIT_023','UNIT_024']},
};
export function companionTrialSeasonDefinition(seasonKey:string):CompanionTrialSeasonDefinition{
 const bounds=utcBounds(seasonKey),rotation=['2026-09','2026-10','2026-11'];
 const override=SEASON_OVERRIDES[seasonKey]??SEASON_OVERRIDES[rotation[Number(seasonKey.slice(5))%rotation.length]];
 return {seasonKey,...bounds,floorSetId:override.floorSetId??'tower_v1',modifiers:override.modifiers??[],rewardSetId:override.rewardSetId??'monthly_v1',specialChallenges:override.specialChallenges??[],featuredOrigin:override.featuredOrigin,featuredCompanionIds:override.featuredCompanionIds};
}
