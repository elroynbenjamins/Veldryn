import type {CombatCompanionRarity,CompanionAbilityDefinition,CompanionDefinition,CompanionEffectDefinition,CompanionSanctuaryUpgrade} from '../core/combat-companion-types';
import {EVENT_COMPANIONS} from './event-companions-v2';

/**
 * Rarity is a TOTAL companion power budget, never a second stat multiplier.
 * 1.09 means a fully invested Rare companion targets ~109% of a comparable Standard.
 */
export const COMPANION_RARITY_CONFIG:Record<CombatCompanionRarity,{
  maxLevel:number;targetPowerMultiplier:number;levelCostMultiplier:number;xpRequiredMultiplier:number;label:string;
}>={
  standard:{maxLevel:20,targetPowerMultiplier:1,levelCostMultiplier:1,xpRequiredMultiplier:1,label:'Standard'},
  rare:{maxLevel:25,targetPowerMultiplier:1.09,levelCostMultiplier:1.18,xpRequiredMultiplier:1.08,label:'Rare'},
  elite:{maxLevel:30,targetPowerMultiplier:1.12,levelCostMultiplier:1.38,xpRequiredMultiplier:1.16,label:'Elite'},
  prestige:{maxLevel:35,targetPowerMultiplier:1.155,levelCostMultiplier:1.62,xpRequiredMultiplier:1.25,label:'Prestige'},
};

/** Current level cap by completed Ascension tier. */
export const COMPANION_STAGE_CAPS:Record<CombatCompanionRarity,readonly [number,number,number,number]>={
  standard:[10,20,20,20],
  rare:[10,20,25,25],
  elite:[10,20,25,30],
  prestige:[10,20,25,35],
};

export const COMPANION_LEVEL_CURVE={baseXp:65,xpGrowth:1.16,goldBase:38,goldGrowth:1.24,essenceBase:4,essenceGrowth:1.19} as const;
export const COMPANION_BOND_CONFIG={
  maxLevel:10,
  // cumulative XP required for Bond Levels 1-10
  xpThresholds:[0,90,210,370,580,840,1160,1540,1990,2520] as const,
  rewards:{2:'Small progression reward',4:'Companion profile icon',6:'Passive improvement',8:'Companion title/profile reward',10:'Bond Trait'} as Record<number,string>,
  sourceXp:{battle:4,boss:60,dungeon:32,companion_objective:45,future_activity:12} as const,
} as const;

export const COMPANION_ASCENSION_BASE_COST={
  1:{gold:650,companionEssence:90,bondstones:1,materialQuantity:4},
  2:{gold:1900,companionEssence:240,bondstones:3,materialQuantity:9},
  3:{gold:4800,companionEssence:560,bondstones:7,materialQuantity:16},
  mastery:{gold:9000,companionEssence:950,bondstones:12,materialQuantity:24},
} as const;

export const COMPANION_SANCTUARY_CONFIG:Record<CompanionSanctuaryUpgrade,{
  maxLevel:number;goldCosts:number[];essenceCosts:number[];materialId?:string;materialCosts?:number[];description:string;
}>={
  trainingGround:{maxLevel:3,goldCosts:[1800,5200,12000],essenceCosts:[120,320,720],materialId:'ASTER_IRON_INGOT',materialCosts:[8,16,28],description:'Provides passive Companion XP on long-timer claims.'},
  essenceBasin:{maxLevel:3,goldCosts:[2200,6500,14500],essenceCosts:[80,220,520],materialId:'ECHO_QUARTZ',materialCosts:[5,10,18],description:'Generates a small weekly Companion Essence claim.'},
  bondHall:{maxLevel:3,goldCosts:[2500,7200,16000],essenceCosts:[160,420,900],materialId:'OATHGLASS_SHARD',materialCosts:[6,12,20],description:'Increases earned Bond XP by +5%, +10%, then +15%.'},
  expeditionPens:{maxLevel:3,goldCosts:[8500,16000,28000],essenceCosts:[650,1150,1900],materialId:'RUNEBOUND_CORE',materialCosts:[6,12,20],description:'Unlocks 1, 2, then 3 simultaneous Sanctuary Companion Expeditions.'},
  masteryChamber:{maxLevel:1,goldCosts:[18000],essenceCosts:[1400],materialId:'OATHGLASS_FRAGMENT',materialCosts:[18],description:'Required for Prestige Mastery and highest companion progression.'},
};
export const COMPANION_SANCTUARY_BOND_BONUS=[0,.05,.10,.15] as const;
export const COMPANION_SANCTUARY_TRAINING_XP_PER_DAY=[0,24,52,84] as const;
export const COMPANION_SANCTUARY_WEEKLY_ESSENCE=[0,20,48,80] as const;

const ability=(id:string,name:string,description:string,cooldownSeconds:number,target:string,kind:CompanionEffectDefinition['kind'],baseValue:number,perLevel:number,extra:Partial<CompanionEffectDefinition>={}):CompanionAbilityDefinition=>({
  id,name,description,cooldownSeconds,target,
  effect:{kind,value:baseValue,description,...extra},
  scaling:{baseValue,perLevel,maxValue:kind==='damage'?baseValue+.28:undefined},
});
const passive=(kind:CompanionEffectDefinition['kind'],value:number,description:string,condition?:string):CompanionEffectDefinition=>({kind,value,description,condition});
const req=(type:CompanionDefinition['unlockRequirements'][number]['type'],description:string,target?:string,amount?:number)=>({type,description,target,amount});
const origin=(id:string,name:string,type:CompanionDefinition['origin']['type']='region')=>({id,name,type});
const trait=(id:string,name:string,kind:CompanionEffectDefinition['kind'],value:number,description:string,condition?:string)=>({id,name,description,effect:passive(kind,value,description,condition)});

const ASTER=origin('REG_001','Asterfall');
const SUNSCAR=origin('REG_SUNSCAR','Sunscar');
const FROST=origin('REG_FROSTMARCH','Frostmarch');
const ASH=origin('REG_ASHLANDS','Ashlands');

/**
 * Asterfall units come directly from the Combat Units design family.
 * Old Utility/Flexible role tags are deliberately collapsed into Support because
 * the active system now permits exactly Damage/Tank/Support.
 */
const ASTERFALL_COMPANIONS:CompanionDefinition[]=[
  {id:'UNIT_001',name:'Ironwood Hound',description:'Fast finisher for farming.',archetype:'Striker',role:'damage',rarity:'standard',origin:ASTER,unlockRequirements:[req('quest','Complete Ironwood introduction','QST_005',1)],baseStats:{hp:180,power:22,defense:12,attackSpeed:2},activeAbility:ability('UABL_001','Hamstring Pounce','Damage + 8% slow',14,'Lowest-HP enemy','damage',1,.006,{secondaryValue:.08,durationSeconds:4}),passiveAbility:passive('execute',.04,'Pack Instinct: +4% damage against enemies below 35% HP.','target_hp_below_35'),bondTrait:trait('BOND_001','Relentless Chase','cooldown_reduction',.08,'Hamstring Pounce recharges 8% faster after defeating a weakened target.','target_defeated_below_35'),ascensionMaterialId:'IRONWOOD_FANG'},
  {id:'UNIT_002',name:'Runebound Sentry',description:'Smooths solo and boss damage spikes.',archetype:'Guardian',role:'tank',rarity:'standard',origin:ASTER,unlockRequirements:[req('achievement','Defeat 250 Old Mines enemies','OLD_MINES_KILLS',250)],baseStats:{hp:260,power:14,defense:24,attackSpeed:2.6},activeAbility:ability('UABL_002','Rune Brace','6% damage reduction to next 2 hits',18,'Owner','damage_reduction',.06,.001,{secondaryValue:2,durationSeconds:5}),passiveAbility:passive('damage_reduction',.06,'Runic Guard: every 12s, owner takes 6% less damage from the next hit.','every_12_seconds'),bondTrait:trait('BOND_002','Carved Shelter','shield',.025,'Rune Brace also grants a small follow-up shield after its second protected hit.','rune_brace_consumed'),ascensionMaterialId:'RUNEBOUND_CORE'},
  {id:'UNIT_003',name:'Silverbrook Sprite',description:'Small tempo and class-resource support.',archetype:'Support',role:'support',rarity:'standard',origin:ASTER,unlockRequirements:[req('skill_level','Reach Fishing 25','fishing',25),req('collection','Discover all Silverbrook nodes','SILVERBROOK_NODES')],baseStats:{hp:150,power:12,defense:10,attackSpeed:2.2},activeAbility:ability('UABL_003','Silver Current','Restore 4% class resource + 3% Haste',20,'Owner','resource_restore',.04,.001,{secondaryValue:.03,durationSeconds:5}),passiveAbility:passive('cooldown_reduction',.05,"Flowing Current: owner's first ability after combat starts has 5% shorter cooldown.",'first_owner_ability'),bondTrait:trait('BOND_003','Deep Current','haste',.025,'Silver Current grants an additional short Haste pulse after restoring class resource.','silver_current_used'),ascensionMaterialId:'WISP_DUST'},
  {id:'UNIT_004',name:'Briarhorn Cub',description:'Durable-target pressure through mild defense shred.',archetype:'Bruiser',role:'damage',rarity:'rare',origin:ASTER,unlockRequirements:[req('monster_mastery','Reach Forest Troll Mastery 20','FOREST_TROLL',20)],baseStats:{hp:230,power:25,defense:18,attackSpeed:2.4},activeAbility:ability('UABL_004','Briar Charge','Damage + -5% Defence',16,'Highest-Defence enemy','damage',1.2,.006,{secondaryValue:.05,durationSeconds:5}),passiveAbility:passive('defense_shred',.03,'Barkbreaker: attacks have a 12% chance to apply -3% Defence for 5s; non-stacking.','12_percent_proc'),bondTrait:trait('BOND_004','Rootbreaker','damage',.06,'Deals 6% more companion damage to targets currently affected by defense reduction.','target_defense_reduced'),ascensionMaterialId:'THORN_SAP'},
  {id:'UNIT_005',name:'Lantern Wisp',description:'Interrupt-focused co-op helper.',archetype:'Disruptor',role:'support',rarity:'rare',origin:ASTER,unlockRequirements:[req('dungeon_clears','Complete Lanternwatch Siege 10 times','LANTERNWATCH_SIEGE',10)],baseStats:{hp:145,power:18,defense:11,attackSpeed:2},activeAbility:ability('UABL_005','Lantern Snuff','Damage + interrupt',22,'Casting enemy','interrupt',.55,.004),passiveAbility:passive('accuracy',.08,'Flicker Sense: +8% unit accuracy against enemies currently casting.','enemy_casting'),bondTrait:trait('BOND_005','Afterglow','cooldown_reduction',.1,'A successful interrupt shortens the next Lantern Snuff cooldown by 10%.','successful_interrupt'),ascensionMaterialId:'LANTERNSTEEL_SHARD'},
  {id:'UNIT_006',name:'Oathbound Page',description:'Boss-progression defensive companion.',archetype:'Guardian',role:'tank',rarity:'rare',origin:ASTER,unlockRequirements:[req('boss_kills','Defeat The Fallen Knight once','FALLEN_KNIGHT',1)],baseStats:{hp:290,power:16,defense:25,attackSpeed:2.8},activeAbility:ability('UABL_006',"Page's Vow",'Shield for 5% owner max HP',24,'Owner','shield',.05,.001),passiveAbility:passive('damage_reduction',.08,'Oathkeeper: once per encounter, intercepts 8% of one hit dealt to owner.','once_per_encounter'),bondTrait:trait('BOND_006','Renewed Vow','damage_reduction',.025,'After the shield breaks, the owner gains brief mitigation.','shield_broken'),ascensionMaterialId:'OATHGLASS_SHARD'},
  {id:'UNIT_007',name:'Gloamknife Shade',description:'Fast rare-target cleanup and execute pressure.',archetype:'Assassin',role:'damage',rarity:'elite',origin:ASTER,unlockRequirements:[req('achievement','Reach Knife Dancer class skill total 80','KNIFE_DANCER_SKILL_TOTAL',80)],baseStats:{hp:155,power:29,defense:10,attackSpeed:1.7},activeAbility:ability('UABL_007','Gloamstep','Damage; +20% coefficient under 25% HP',18,'Lowest-HP enemy','damage',1.45,.005,{secondaryValue:.2}),passiveAbility:passive('execute',.10,'Veiled Edge: first unit hit against a new target has +10% crit chance.','new_target'),bondTrait:trait('BOND_007','Final Shadow','execute',.08,'Gloamstep gains an additional execute bonus against critically wounded targets.','target_hp_below_25'),ascensionMaterialId:'GLOAM_DUST'},
  {id:'UNIT_008',name:'Dawnwing',description:'Long-form group sustain.',archetype:'Support',role:'support',rarity:'elite',origin:ASTER,unlockRequirements:[req('achievement','Heal or shield 1,000,000 effective HP in co-op','COOP_EFFECTIVE_SUPPORT',1000000)],baseStats:{hp:180,power:14,defense:14,attackSpeed:2.3},activeAbility:ability('UABL_008','Dawn Pinion','4% max-HP shield + cleanse minor debuff',24,'Lowest-HP ally','shield',.04,.001,{secondaryValue:1,durationSeconds:5}),passiveAbility:passive('shield',.02,'Warm Light: every 15s the lowest-HP party member gains a 2% max-HP shield.','every_15_seconds'),bondTrait:trait('BOND_008','Second Dawn','cleanse',1,'Dawn Pinion may remove one additional minor debuff when used below 35% HP.','target_hp_below_35'),ascensionMaterialId:'OATHGLASS_FRAGMENT'},
  {id:'UNIT_009',name:'Echo Stalker',description:'Coordinated damage companion that rewards debuffs.',archetype:'Hunter',role:'damage',rarity:'elite',origin:ASTER,unlockRequirements:[req('achievement','Complete 50 positive Echo objectives','POSITIVE_ECHO_OBJECTIVES',50)],baseStats:{hp:175,power:27,defense:13,attackSpeed:1.9},activeAbility:ability('UABL_009','Echo Rend','Damage; +10% coefficient if 2+ debuffs',17,'Debuffed enemy','damage',1.25,.006,{secondaryValue:.1}),passiveAbility:passive('damage',.05,'Echo Hunter: +5% damage against enemies with any player-applied debuff.','target_debuffed'),bondTrait:trait('BOND_009','Resonant Hunt','cooldown_reduction',.08,'Echo Rend recharges faster while the priority target has multiple debuffs.','target_has_2_debuffs'),ascensionMaterialId:'ECHO_QUARTZ'},
  {id:'UNIT_010',name:'Forge Automaton',description:'Slow armor-pressure artillery companion.',archetype:'Artillery',role:'damage',rarity:'rare',origin:ASTER,unlockRequirements:[req('achievement','Craft 500 equipment pieces','EQUIPMENT_CRAFTS',500),req('skill_level','Reach Smithing 30','smithing',30)],baseStats:{hp:205,power:26,defense:20,attackSpeed:2.9},activeAbility:ability('UABL_010','Siege Bolt','Damage + ignores 8% Defence',20,'Highest-HP enemy','damage',1.35,.005,{secondaryValue:.08}),passiveAbility:passive('armor_pierce',.05,'Calibrated Shot: every 4th attack ignores 5% of target Defence.','every_4th_attack'),bondTrait:trait('BOND_010','Perfect Calibration','armor_pierce',.03,'Siege Bolt ignores an additional 3% Defence against high-HP targets.','target_hp_above_60'),ascensionMaterialId:'FALLEN_RIVET'},
  {id:'UNIT_011',name:"Veyren's Memory",description:'Tactical utility that rewards active targeting.',archetype:'Tactician',role:'support',rarity:'elite',origin:ASTER,unlockRequirements:[req('achievement','Complete all 3 Fallen Procession memory outcomes','FALLEN_PROCESSION_OUTCOMES',3)],baseStats:{hp:190,power:21,defense:16,attackSpeed:2.4},activeAbility:ability('UABL_011','Memory Command','Damage + owner +2% Accuracy vs target',22,'Priority target','damage',.85,.004,{secondaryValue:.02,durationSeconds:6}),passiveAbility:passive('haste',.12,'Remembered Route: first manual target swap each encounter gives unit +12% Haste for 4s.','first_manual_target_swap'),bondTrait:trait('BOND_011','Perfect Recall','accuracy',.03,'Memory Command grants a slightly stronger accuracy window after a manual target swap.','manual_target_swap'),ascensionMaterialId:'TORN_OATHCLOTH'},
  {id:'UNIT_012',name:'Oathglass Knightling',description:'Prestige tactical companion with balanced utility.',archetype:'Champion',role:'support',rarity:'prestige',origin:ASTER,unlockRequirements:[req('boss_kills','Defeat Fallen Knight','FALLEN_KNIGHT',1),req('meta','Reach rank 20 mastery on all 22 Asterfall monsters','ASTERFALL_MASTERY_20_ALL',22),req('dungeon_clears','Clear COP_001, COP_002 and COP_003','ASTERFALL_COOP_SET',3)],baseStats:{hp:220,power:23,defense:21,attackSpeed:2.2},activeAbility:ability('UABL_012','Oathglass Reflection','Damage + copy one eligible self-buff duration at 25%',26,'Priority target','utility',.25,.002,{secondaryValue:.95,durationSeconds:4}),passiveAbility:passive('utility',.25,"Reflected Oath: copies 25% of owner's current non-ultimate self-buff duration onto itself.",'eligible_owner_buff'),bondTrait:trait('BOND_012','True Reflection','cooldown_reduction',.1,'A successful copied buff shortens the next Reflection cooldown without copying stat magnitude.','eligible_buff_copied'),ascensionMaterialId:'OATHGLASS_FRAGMENT'},
];

/** Regional content definitions. Ability/effect numbers are conservative foundations and remain data-only for later balance passes. */
const regional=(id:string,name:string,rarity:CombatCompanionRarity,role:CompanionDefinition['role'],unlockRequirements:CompanionDefinition['unlockRequirements'],identity:string,region:CompanionDefinition['origin'],materialId:string,effect:CompanionEffectDefinition['kind']):CompanionDefinition=>({
  id,name,description:identity,archetype:identity.split('/')[0].trim(),role,rarity,origin:region,
  unlockRequirements,
  baseStats:{hp:rarity==='prestige'?225:rarity==='elite'?205:190,power:role==='damage'?27:18,defense:role==='tank'?25:15,attackSpeed:2.2},
  activeAbility:ability(`${id}_ACTIVE`,`${name} Signature`,identity,rarity==='prestige'?24:20,'Priority target',effect,effect==='damage'?1.1:.04,effect==='damage'?.005:.001),
  passiveAbility:passive(effect,effect==='damage'?.035:.025,`${name} passive reinforces its ${identity.toLowerCase()} identity.`),
  bondTrait:trait(`${id}_BOND`,`${name} Bond Trait`,effect,effect==='damage'?.05:.03,`Bond 10 strengthens ${name}'s defining combat interaction.`),
  ascensionMaterialId:materialId,visual:{pixelSize:'96x96'}
});
const REGIONAL_COMPANIONS:CompanionDefinition[]=[
  regional('UNIT_013','Dune Stalker','rare','damage',[req('monster_mastery','Reach Sunscar Scorpion Mastery 20','SUNSCAR_SCORPION',20)],'Assassin / poison pressure',SUNSCAR,'AMBERGLASS','damage'),
  regional('UNIT_014','Oasis Djinnling','elite','support',[req('monster_mastery','Reach Dune Oracle Mastery 20','DUNE_ORACLE',20)],'Support / resource utility',SUNSCAR,'ASTRAL_SCRIPT','resource_restore'),
  regional('UNIT_015','Solar Scarab','elite','tank',[req('monster_mastery','Reach Glassbound Sentinel Mastery 20','GLASSBOUND_SENTINEL',20)],'Guardian / reflect timing',SUNSCAR,'SUNSTONE_ORE','damage_reduction'),
  regional('UNIT_016',"Tyrant's Heir",'prestige','tank',[req('meta','Own Dune Stalker, Oasis Djinnling, and Solar Scarab','REG_SUNSCAR',3)],'Champion / defensive sidegrade',SUNSCAR,'ASTRAL_SCRIPT','shield'),
  regional('UNIT_017','Rime Wolf Pup','rare','damage',[req('monster_mastery','Reach Frostwolf Mastery 20','FROSTWOLF',20)],'Striker / chill setup',FROST,'RIMEGLASS','damage'),
  regional('UNIT_018','Bell Sprite','elite','support',[req('monster_mastery','Reach Bellwraith Mastery 20','BELLWRAITH',20)],'Support / cooldown rhythm',FROST,'CHOIR_BLOOM','cooldown_reduction'),
  regional('UNIT_019','Choir Golem','elite','tank',[req('monster_mastery','Reach Choir Hunter Mastery 20','CHOIR_HUNTER',20)],'Guardian / armour break',FROST,'FROSTIRON','damage_reduction'),
  regional('UNIT_020','Wyrm Echo','prestige','damage',[req('meta','Own Rime Wolf Pup, Bell Sprite, and Choir Golem','REG_FROSTMARCH',3)],'Champion / telegraph reward',FROST,'RIMEGLASS','damage'),
  regional('UNIT_021','Obsidian Drakelet','rare','damage',[req('monster_mastery','Reach Blackglass Mireling Mastery 20','BLACKGLASS_MIRELING',20)],'Hunter / armour pierce',ASH,'BANNER_ASH','armor_pierce'),
  regional('UNIT_022','Forge Custodian','elite','tank',[req('monster_mastery','Reach Cinder Titan Mastery 20','CINDER_TITAN',20)],'Guardian / barrier',ASH,'BANNER_ASH','shield'),
  regional('UNIT_023','Primal Spark','elite','damage',[req('monster_mastery','Reach Ashen Revenant Mastery 20','ASHEN_REVENANT',20)],'Artillery / chain hits',ASH,'BANNER_ASH','chain_damage'),
  regional('UNIT_024','Regent Shade','prestige','support',[req('meta','Own Obsidian Drakelet, Forge Custodian, and Primal Spark','REG_ASHLANDS',3)],'Champion / tactical utility',ASH,'BANNER_ASH','utility'),
];

export const COMBAT_COMPANIONS:CompanionDefinition[]=[...ASTERFALL_COMPANIONS,...REGIONAL_COMPANIONS,...EVENT_COMPANIONS];
export const combatCompanionDef=(id:string)=>COMBAT_COMPANIONS.find(entry=>entry.id===id);
