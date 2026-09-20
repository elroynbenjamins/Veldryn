import type {CompanionRarity,CompanionRole} from './policy';
import type {CompanionCodexMilestoneDefinition,CompanionMissionDefinition,CompanionProvingGroundChallengeDefinition,CompanionServerDefinition,CompanionSpecialChallengeDefinition,CompanionTechniqueDefinition,CompanionTrialSeasonDefinition,CompanionWeeklyChallengeDefinition} from './domain';

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
const cooldown=(rarity:CompanionRarity,role:CompanionRole)=>1000*(role==='damage'?(rarity==='prestige'?18:20):rarity==='prestige'?22:24);
const target=(role:CompanionRole)=>role==='damage'?{assistTarget:'current_target' as const,standaloneTarget:'current_target' as const}:role==='tank'?{assistTarget:'owner' as const,standaloneTarget:'self' as const}:{assistTarget:'owner' as const,standaloneTarget:'lowest_hp_ally' as const};
const effect=(kind:string):CompanionServerDefinition['active']['effectKind']=>kind==='damage'?'damage':kind==='shield'?'shield':kind==='interrupt'?'interrupt':kind==='heal'?'heal':kind==='mitigation'?'mitigation':'utility';

const COMPANION_ACTIVE_IDENTITY:Record<string,Partial<CompanionServerDefinition['active']>>={
 UNIT_001:{name:'Hamstring Pounce',cooldownMs:14000,condition:'execute_pressure'},
 UNIT_002:{name:'Rune Brace',cooldownMs:18000,condition:'two_hit_guard'},
 UNIT_003:{name:'Silver Current',cooldownMs:20000,condition:'resource_tempo'},
 UNIT_004:{name:'Briar Charge',cooldownMs:16000,condition:'defense_break'},
 UNIT_005:{name:'Lantern Snuff',cooldownMs:22000,condition:'interrupt_cast'},
 UNIT_006:{name:"Page's Vow",cooldownMs:24000,condition:'owner_guard'},
 UNIT_007:{name:'Gloamstep',cooldownMs:18000,condition:'execute_pressure'},
 UNIT_008:{name:'Dawn Pinion',cooldownMs:24000,condition:'low_ally_guard'},
 UNIT_009:{name:'Echo Rend',cooldownMs:17000,condition:'debuff_hunter'},
 UNIT_010:{name:'Siege Bolt',cooldownMs:20000,condition:'armor_pierce'},
 UNIT_011:{name:'Memory Command',cooldownMs:22000,condition:'target_swap'},
 UNIT_012:{name:'Oathglass Reflection',cooldownMs:26000,condition:'copy_buff'},
 UNIT_013:{name:'Venom Ambush',cooldownMs:18000,condition:'poison_pressure'},
 UNIT_014:{name:'Oasis Pulse',cooldownMs:22000,condition:'resource_pulse'},
 UNIT_015:{name:'Solar Carapace',cooldownMs:24000,condition:'solar_reflect'},
 UNIT_016:{name:"Tyrant's Aegis",cooldownMs:22000,condition:'aegis'},
 UNIT_017:{name:'Rimefang',cooldownMs:18000,condition:'chill_shatter'},
 UNIT_018:{name:'Resonant Chime',cooldownMs:21000,condition:'cooldown_rhythm'},
 UNIT_019:{name:'Choir Bastion',cooldownMs:23000,condition:'armor_break_guard'},
 UNIT_020:{name:"Wyrm's Echo",cooldownMs:18000,condition:'telegraph_reward'},
 UNIT_021:{name:'Obsidian Fang',cooldownMs:18000,condition:'armor_pierce'},
 UNIT_022:{name:'Forge Barrier',cooldownMs:23000,condition:'barrier'},
 UNIT_023:{name:'Primal Arc',cooldownMs:19000,condition:'chain_hits'},
 UNIT_024:{name:"Regent's Decree",cooldownMs:22000,condition:'adaptive_utility'},
 EVT_UNIT_001:{name:'First Dawn Benediction',cooldownMs:21000,condition:'haste_shield'},
 EVT_UNIT_002:{name:'Vowbound Link',cooldownMs:22000,condition:'linked_guard'},
 EVT_UNIT_003:{name:'Barkheart Ward',cooldownMs:22000,condition:'bark_shield'},
 EVT_UNIT_004:{name:'Suncrest Momentum',cooldownMs:18000,condition:'momentum'},
 EVT_UNIT_005:{name:'Starfall Mark',cooldownMs:19000,condition:'star_marks'},
 EVT_UNIT_006:{name:'Harvest Bulwark',cooldownMs:22000,condition:'stored_barrier'},
 EVT_UNIT_007:{name:'Veil Rend',cooldownMs:19000,condition:'debuff_hunter'},
 EVT_UNIT_008:{name:'Hollow Last Stand',cooldownMs:22000,condition:'low_hp_barrier'},
 EVT_UNIT_009:{name:'Frostbell Chorus',cooldownMs:21000,condition:'rotating_bells'},
 EVT_UNIT_010:{name:'Caravan Formation',cooldownMs:21000,condition:'adaptive_utility'},
};

export const COMPANION_SERVER_DEFINITIONS:CompanionServerDefinition[]=raw.map(([id,name,role,rarity,originId,hp,power,defense,attackSpeed,kind,coeff])=>{
 const identity=COMPANION_ACTIVE_IDENTITY[id]??{};
 return {
 id,name,role,rarity,originId,baseStats:{hp,power,defense,attackSpeed},tags:[role,rarity,originId,identity.condition??'signature'],
 active:{id:`${id}_ACTIVE`,name:identity.name??`${name} Signature`,cooldownMs:identity.cooldownMs??cooldown(rarity,role),baseCoeff:identity.baseCoeff??coeff,perLevelCoeff:identity.perLevelCoeff??(kind==='damage'?.004:.0006),effectKind:identity.effectKind??effect(kind),targeting:identity.targeting??target(role),condition:identity.condition},
 visual:rarity==='prestige'?{rarityFrame:'prestige',summonEffect:'prestige_summon',idleEffect:'prestige_idle',profileFrame:'prestige_profile',masteryMarker:'prestige_mastery',nameplateTreatment:'prestige_nameplate',animationRef:`${id}_prestige_entry`,rarityIcon:'★',rarityLabel:'Prestige',accessibilityLabel:'Prestige combat companion. Star rarity icon and ornate structured frame.',reducedMotionFallback:'prestige_static_entry'}:rarity==='elite'?{rarityFrame:'elite',summonEffect:'elite_summon',masteryMarker:'elite_mastery',rarityIcon:'◆◆◆',rarityLabel:'Elite',accessibilityLabel:'Elite combat companion. Triple-diamond rarity icon and distinct structured frame.',reducedMotionFallback:'elite_static_entry'}:rarity==='rare'?{rarityFrame:'rare',rarityIcon:'◆◆',rarityLabel:'Rare',accessibilityLabel:'Rare combat companion. Double-diamond rarity icon and enhanced frame.'}:{rarityFrame:'standard',rarityIcon:'◆',rarityLabel:'Standard',accessibilityLabel:'Standard combat companion. Single-diamond rarity icon and simple frame.'},
 };});
export const companionServerDefinition=(id:string)=>COMPANION_SERVER_DEFINITIONS.find(x=>x.id===id);

export const COMPANION_TECHNIQUE_UNLOCK={ascensionTier:2,bondLevel:7,mode:'all' as const};
type TechniqueEffect=CompanionTechniqueDefinition['effects'][number];
type TechniqueSeed={name:string;description:string;effects:TechniqueEffect[]};
const t=(name:string,description:string,...effects:TechniqueEffect[]):TechniqueSeed=>({name,description,effects});
const CUSTOM_TECHNIQUES:Record<string,[TechniqueSeed,TechniqueSeed]>={
 UNIT_001:[t('Cull the Weak','Hamstring Pounce becomes a stronger finisher against wounded enemies.',{kind:'execute',value:.12}),t('Pack Tempo','Trade some finishing focus for faster repeated pounces.',{kind:'damage',value:.025},{kind:'cooldown',value:-.10})],
 UNIT_002:[t('Deep Runes','Rune Brace creates a sturdier protective window.',{kind:'shield_strength',value:.16}),t('Counterseal','Slightly thinner protection reflects a share of absorbed damage.',{kind:'shield_strength',value:-.04},{kind:'reflect',value:.13})],
 UNIT_003:[t('Deep Current','Silver Current restores more effectively.',{kind:'heal_strength',value:.12}),t('Quick Current','Silver Current cycles faster and grants more tempo.',{kind:'cooldown',value:-.12},{kind:'haste',value:.03})],
 UNIT_004:[t('Rootbreaker','Briar Charge hits harder while finishing softened targets.',{kind:'damage',value:.05},{kind:'execute',value:.06}),t('Thorn Rush','Briar Charge cycles faster for sustained pressure.',{kind:'cooldown',value:-.10},{kind:'damage',value:.02})],
 UNIT_005:[t('Bright Interruption','Successful disruption leaves the Wisp acting faster.',{kind:'haste',value:.05}),t('Afterglow','Lantern Snuff recharges more quickly.',{kind:'cooldown',value:-.13})],
 UNIT_006:[t('Renewed Vow',"Page's Vow creates a stronger protective barrier.",{kind:'shield_strength',value:.16}),t('Oath Reprisal','A lighter vow reflects part of absorbed pressure.',{kind:'shield_strength',value:-.04},{kind:'reflect',value:.12})],
 UNIT_007:[t('Final Shadow','Gloamstep gains heavy execute pressure.',{kind:'execute',value:.14}),t('Night Tempo','Gloamstep sacrifices some execute focus for speed.',{kind:'damage',value:.025},{kind:'cooldown',value:-.11})],
 UNIT_008:[t('Second Dawn','Dawn Pinion provides stronger restoration and shielding.',{kind:'heal_strength',value:.12},{kind:'shield_strength',value:.08}),t('Swift Pinion','Dawn Pinion cycles more often.',{kind:'cooldown',value:-.12})],
 UNIT_009:[t('Resonant Hunt','Echo Rend hits harder into weakened targets.',{kind:'damage',value:.05},{kind:'execute',value:.05}),t('Persistent Echo','Echo Rend returns more quickly.',{kind:'cooldown',value:-.10},{kind:'damage',value:.02})],
 UNIT_010:[t('Perfect Calibration','Siege Bolt gains a stronger damage profile.',{kind:'damage',value:.06}),t('Rapid Loader','The Automaton fires its active more often.',{kind:'cooldown',value:-.12},{kind:'damage',value:.02})],
 UNIT_011:[t('Perfect Recall','Memory Command improves supportive tempo.',{kind:'haste',value:.05}),t('Tactical Repetition','Memory Command cycles faster.',{kind:'cooldown',value:-.12})],
 UNIT_012:[t('True Reflection','Oathglass Reflection provides a stronger utility window.',{kind:'haste',value:.06},{kind:'defense',value:.05}),t('Quick Reflection','Use Reflection more frequently.',{kind:'cooldown',value:-.13})],
 UNIT_013:[t('Virulent Fang','Venom Ambush gains higher finishing pressure.',{kind:'damage',value:.05},{kind:'execute',value:.07}),t('Sand Ambush','Ambush more often with a smaller damage gain.',{kind:'cooldown',value:-.11},{kind:'damage',value:.02})],
 UNIT_014:[t('Deep Oasis','Oasis Pulse becomes a stronger restorative effect.',{kind:'heal_strength',value:.15}),t('Quick Mirage','Oasis Pulse cycles faster and adds Haste.',{kind:'cooldown',value:-.11},{kind:'haste',value:.04})],
 UNIT_015:[t('Solar Shell','Solar Carapace creates a stronger shield.',{kind:'shield_strength',value:.17}),t('Radiant Reprisal','Trade shield strength for reflected damage.',{kind:'shield_strength',value:-.05},{kind:'reflect',value:.15})],
 UNIT_016:[t('Royal Bulwark',"Tyrant's Aegis becomes substantially sturdier.",{kind:'shield_strength',value:.18}),t('Defiant Crown','A lighter Aegis reflects pressure back at attackers.',{kind:'shield_strength',value:-.04},{kind:'reflect',value:.16})],
 UNIT_017:[t('Shatterfang','Rimefang gains stronger execute damage.',{kind:'execute',value:.12},{kind:'damage',value:.03}),t('Winter Hunt','Rimefang cycles faster during sustained fights.',{kind:'cooldown',value:-.12},{kind:'haste',value:.03})],
 UNIT_018:[t('Grand Resonance','Resonant Chime restores more strongly.',{kind:'heal_strength',value:.14}),t('Quick Chime','Chime more often and gain Haste.',{kind:'cooldown',value:-.13},{kind:'haste',value:.04})],
 UNIT_019:[t('Stone Chorus','Choir Bastion gains stronger protection.',{kind:'shield_strength',value:.16}),t('Cracking Hymn','Trade some protection for reflected pressure.',{kind:'shield_strength',value:-.04},{kind:'reflect',value:.13})],
 UNIT_020:[t('Predator Echo',"Wyrm's Echo gains powerful finishing damage.",{kind:'execute',value:.13},{kind:'damage',value:.04}),t('Wingbeat Tempo','Echo more often at slightly lower burst focus.',{kind:'cooldown',value:-.12},{kind:'damage',value:.025})],
 UNIT_021:[t('Blackglass Fang','Obsidian Fang hits harder against priority targets.',{kind:'damage',value:.06}),t('Drake Pursuit','Obsidian Fang cycles faster.',{kind:'cooldown',value:-.11},{kind:'execute',value:.05})],
 UNIT_022:[t('Tempered Barrier','Forge Barrier gains more shield strength.',{kind:'shield_strength',value:.17}),t('Overheat Reprisal','A thinner barrier reflects absorbed damage.',{kind:'shield_strength',value:-.05},{kind:'reflect',value:.14})],
 UNIT_023:[t('Forked Spark','Primal Arc gains stronger damage.',{kind:'damage',value:.065}),t('Rapid Discharge','Primal Arc cycles faster.',{kind:'cooldown',value:-.12},{kind:'haste',value:.03})],
 UNIT_024:[t('Measured Decree',"Regent's Decree improves restorative strength.",{kind:'heal_strength',value:.14},{kind:'defense',value:.04}),t('Urgent Decree','Use the Decree more often.',{kind:'cooldown',value:-.13},{kind:'haste',value:.04})],
 EVT_UNIT_001:[t('First Light','First Dawn Benediction grants stronger restoration.',{kind:'heal_strength',value:.12},{kind:'haste',value:.04}),t('New Year Haste','Benediction cycles faster.',{kind:'cooldown',value:-.12},{kind:'haste',value:.03})],
 EVT_UNIT_002:[t('Unbroken Vow','Vowbound Link becomes more protective.',{kind:'heal_strength',value:.14},{kind:'defense',value:.05}),t('Quickened Promise','The Link can be refreshed more often.',{kind:'cooldown',value:-.13},{kind:'haste',value:.03})],
 EVT_UNIT_003:[t('Ancient Bark','Barkheart Ward gains stronger protection.',{kind:'shield_strength',value:.17}),t('Thorned Bark','Trade some shielding for reflected damage.',{kind:'shield_strength',value:-.04},{kind:'reflect',value:.14})],
 EVT_UNIT_004:[t('Final Sprint','Suncrest Momentum gains heavy execute pressure.',{kind:'execute',value:.13},{kind:'damage',value:.04}),t('Relentless Games','Build pressure more frequently.',{kind:'cooldown',value:-.11},{kind:'damage',value:.03})],
 EVT_UNIT_005:[t('Falling Star','Starfall Mark hits harder.',{kind:'damage',value:.06}),t('Meteor Rhythm','Starfall Mark cycles faster.',{kind:'cooldown',value:-.12},{kind:'haste',value:.03})],
 EVT_UNIT_006:[t('Full Granary','Harvest Bulwark gains stronger shielding.',{kind:'shield_strength',value:.17}),t('Reaping Reprisal','Trade some barrier strength for reflection.',{kind:'shield_strength',value:-.04},{kind:'reflect',value:.14})],
 EVT_UNIT_007:[t('Deep Veil','Veil Rend gains execute pressure.',{kind:'execute',value:.11},{kind:'damage',value:.04}),t('Hunting Shade','Veil Rend cycles faster.',{kind:'cooldown',value:-.12},{kind:'damage',value:.025})],
 EVT_UNIT_008:[t('Last Lantern','Hollow Last Stand creates a stronger barrier.',{kind:'shield_strength',value:.18}),t('Hollow Reprisal','A lighter barrier reflects more damage.',{kind:'shield_strength',value:-.05},{kind:'reflect',value:.16})],
 EVT_UNIT_009:[t('Grand Chorus','Frostbell Chorus restores more strongly.',{kind:'heal_strength',value:.15}),t('Quick Bells','Rotate the bells more frequently.',{kind:'cooldown',value:-.13},{kind:'haste',value:.04})],
 EVT_UNIT_010:[t('Defensive Formation','Caravan Formation emphasizes protection.',{kind:'defense',value:.07},{kind:'heal_strength',value:.08}),t('Marching Formation','Caravan Formation emphasizes tempo.',{kind:'cooldown',value:-.12},{kind:'haste',value:.05})],
};
const techniquePair=(def:CompanionServerDefinition):CompanionTechniqueDefinition[]=>{
 const group=`${def.id}:technique`,unlock=COMPANION_TECHNIQUE_UNLOCK,seeds=CUSTOM_TECHNIQUES[def.id];
 if(!seeds)throw new Error(`Missing companion-specific Techniques for ${def.id}`);
 const legacySuffixes=def.role==='tank'?['FORTIFIED','REFLECTIVE']:def.role==='damage'?['EXECUTIONER','RELENTLESS']:['DEEP_RESTORATION','RAPID_AID'];
 return seeds.map((seed,index)=>({id:`${def.id}_${legacySuffixes[index]}`,companionId:def.id,name:seed.name,description:seed.description,mutuallyExclusiveGroup:group,unlock,effects:seed.effects}));
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
export const COMPANION_TECHNIQUE_SWITCH_COST={gold:2500,companionEssence:80};
export const COMPANION_BOND_MILESTONES={
 2:{companionEssence:20,rewardId:undefined,description:'Companion Essence cache'},
 4:{companionEssence:30,rewardId:'COMPANION_PROFILE_ICON',description:'Companion profile icon'},
 6:{companionEssence:0,rewardId:undefined,description:'Bonded passive improvement'},
 8:{companionEssence:50,rewardId:'COMPANION_BOND_TITLE',description:'Companion title / profile reward'},
 10:{companionEssence:0,rewardId:undefined,description:'Bond Trait'},
} as const;
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
 {id:'MISSION_SUNSCAR_4H',name:'Sunscar Caravan Guard',originId:'REG_SUNSCAR',durationMs:4*3600_000,missionVersion:2,minCompanions:2,maxCompanions:3,minimumPenLevel:1,minimumLevel:15,recommendedPower:2800,requirements:[{type:'role_count',role:'tank',count:1},{type:'role_count',role:'support',count:1},{type:'min_level',value:15},{type:'origin_count',originId:'REG_SUNSCAR',count:1}],bonusRequirements:[{type:'origin_count',originId:'REG_SUNSCAR',count:2}],bonusOriginId:'REG_SUNSCAR',costs:{gold:650,materials:{SUPPLIES:2}},baseRewards:{companionEssence:7,gold:600,companionXp:160,bondXp:20,materials:{AMBERGLASS:1}},bonusRewards:{companionEssence:4,materials:{AMBERGLASS:1}},bonusRewardChanceByGrade:{B:.04,A:.08,S:.14}},
 {id:'MISSION_ASTERFALL_SHRINE_8H',name:'Forgotten Asterfall Shrine',originId:'REG_001',durationMs:8*3600_000,missionVersion:1,minCompanions:3,maxCompanions:3,minimumPenLevel:2,minimumBondLevel:4,recommendedPower:3000,requirements:[{type:'min_bond',value:4},{type:'min_rarity',rarity:'rare',count:1}],bonusRequirements:[{type:'origin_count',originId:'REG_001',count:3}],costs:{gold:1050,materials:{SUPPLIES:3}},baseRewards:{companionEssence:14,gold:900,companionXp:250,bondXp:30,materials:{IRONWOOD_FANG:3}},bonusRewards:{companionEssence:7,materials:{TRIAL_SANCTUARY_MATERIAL:1}},bonusRewardChanceByGrade:{A:.06,S:.14}},
 {id:'MISSION_FROST_8H',name:'Frostmarch Bell Route',originId:'REG_FROSTMARCH',durationMs:8*3600_000,missionVersion:2,minCompanions:2,maxCompanions:3,minimumPenLevel:2,minimumLevel:15,recommendedPower:3000,requirements:[{type:'role_count',role:'support',count:1},{type:'min_level',value:15}],bonusRequirements:[{type:'origin_count',originId:'REG_FROSTMARCH',count:2}],bonusOriginId:'REG_FROSTMARCH',costs:{gold:1100,materials:{SUPPLIES:3}},baseRewards:{companionEssence:15,gold:950,companionXp:270,bondXp:32,materials:{RIMEGLASS:1}},bonusRewards:{companionEssence:7,materials:{RIMEGLASS:1}},bonusRewardChanceByGrade:{A:.05,S:.12},bondstoneEligible:true},
 {id:'MISSION_ASH_12H',name:'Ashlands Crucible Watch',originId:'REG_ASHLANDS',durationMs:12*3600_000,missionVersion:2,minCompanions:3,maxCompanions:3,minimumPenLevel:3,minimumLevel:20,recommendedPower:4000,requirements:[{type:'role_count',role:'tank',count:1},{type:'role_count',role:'damage',count:1},{type:'min_level',value:20},{type:'min_ascension',tier:2,count:2}],bonusRequirements:[{type:'origin_count',originId:'REG_ASHLANDS',count:2}],bonusOriginId:'REG_ASHLANDS',costs:{gold:1600,materials:{SUPPLIES:4}},baseRewards:{companionEssence:22,gold:1350,companionXp:400,bondXp:44,materials:{BANNER_ASH:1}},bonusRewards:{companionEssence:10,materials:{TRIAL_SANCTUARY_MATERIAL:1}},bonusRewardChanceByGrade:{A:.04,S:.10},bondstoneEligible:true},
];
export const companionMission=(id:string)=>COMPANION_MISSIONS.find(x=>x.id===id);

export const COMPANION_PROVING_GROUNDS:CompanionProvingGroundChallengeDefinition[]=[
 {id:'PG_UNDERESTIMATED',name:'Underestimated',description:'Defeat a boss while using a Rare-or-lower Combat Companion.',eventTypes:['boss_defeat'],targetCount:1,condition:{maxRarity:'rare'},rewards:{companionEssence:100,gold:2500,bondstones:1}},
 {id:'PG_TRUSTED_ALLY',name:'Trusted Ally',description:'Complete a Dungeon using a Companion with Bond Level 8+.',eventTypes:['dungeon_complete'],targetCount:1,condition:{minBondLevel:8},rewards:{companionEssence:80,gold:2200,bondstones:0,materials:{TRIAL_SANCTUARY_MATERIAL:1,EVENT_BONDBLOOM:1}}},
 {id:'PG_BORROWED_DEFENSE',name:'Borrowed Defense',description:'As a Damage character, complete content using a Tank Companion.',eventTypes:['battle_complete','boss_defeat','dungeon_complete'],targetCount:3,condition:{requiredCharacterRole:'damage',requiredCompanionRole:'tank'},rewards:{companionEssence:75,gold:1800,bondstones:0}},
 {id:'PG_OLD_FRIENDS',name:'Old Friends',description:'Complete 25 battles using a Standard Companion.',eventTypes:['battle_complete'],targetCount:25,condition:{requiredRarity:'standard'},rewards:{companionEssence:130,gold:3200,bondstones:1}},
 {id:'PG_REGIONAL_LOYALTY',name:'Regional Loyalty',description:'Clear a Companion Trial boss with at least two Companions from the same origin.',eventTypes:['trial_boss_clear'],targetCount:1,condition:{requiredOriginCount:2},rewards:{companionEssence:110,gold:2600,bondstones:1}},
 {id:'PG_AGAINST_ODDS',name:'Against the Odds',description:'Clear a Companion Trial floor below its recommended Companion Team Power.',eventTypes:['trial_floor_clear','trial_boss_clear'],targetCount:1,condition:{belowRecommendedPower:true},rewards:{companionEssence:90,gold:2100,bondstones:0}},
 {id:'PG_MIXED_COMPANY',name:'Mixed Company',description:'Clear Companion Trials with one Standard, one Rare and one Elite/Prestige.',eventTypes:['trial_floor_clear','trial_boss_clear'],targetCount:3,condition:{rarityMix:['standard','rare','elite']},rewards:{companionEssence:150,gold:3400,bondstones:1,materials:{EVENT_BONDBLOOM:1}}},
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
 {id:'CHALLENGE_TYRANTS_HEIR',name:"Crown of the Buried Tyrant",bossId:'BOSS_COMPANION_TYRANT_HEIR',rewardCompanionId:'UNIT_016',recommendedTeamPower:4050,requirements:[
  {type:'region_completion',target:'REG_SUNSCAR',description:'Complete Sunscar story progression.'},{type:'trial_floor',amount:20,description:'Reach Companion Trial Floor 20.'},{type:'companion_owned',target:'UNIT_013',description:'Own Dune Stalker.'},{type:'companion_owned',target:'UNIT_014',description:'Own Oasis Djinnling.'},{type:'companion_owned',target:'UNIT_015',description:'Own Solar Scarab.'},{type:'companion_bond_total',amount:18,originId:'REG_SUNSCAR',description:'Reach 18 total Bond across Sunscar companions.'},
 ]},
 {id:'CHALLENGE_WYRM_ECHO',name:'Echo of the Wyrmspine',bossId:'BOSS_COMPANION_WYRM_ECHO',rewardCompanionId:'UNIT_020',recommendedTeamPower:4300,requirements:[
  {type:'region_completion',target:'REG_FROSTMARCH',description:'Complete Frostmarch story progression.'},{type:'trial_floor',amount:25,description:'Reach Companion Trial Floor 25.'},{type:'companion_owned',target:'UNIT_017',description:'Own Rime Wolf Pup.'},{type:'companion_owned',target:'UNIT_018',description:'Own Bell Sprite.'},{type:'companion_owned',target:'UNIT_019',description:'Own Choir Golem.'},{type:'companion_bond_total',amount:20,originId:'REG_FROSTMARCH',description:'Reach 20 total Bond across Frostmarch companions.'},
 ]},
 {id:'CHALLENGE_REGENT_SHADE',name:'The Empty Throne',bossId:'BOSS_COMPANION_REGENT_SHADE',rewardCompanionId:'UNIT_024',recommendedTeamPower:4525,requirements:[
  {type:'region_completion',target:'REG_ASHLANDS',description:'Complete Ashlands story progression.'},{type:'trial_floor',amount:30,description:'Reach Companion Trial Floor 30.'},{type:'companion_owned',target:'UNIT_021',description:'Own Obsidian Drakelet.'},{type:'companion_owned',target:'UNIT_022',description:'Own Forge Custodian.'},{type:'companion_owned',target:'UNIT_023',description:'Own Primal Spark.'},{type:'companion_bond_total',amount:22,originId:'REG_ASHLANDS',description:'Reach 22 total Bond across Ashlands companions.'},
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
