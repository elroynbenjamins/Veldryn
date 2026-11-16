/** One canonical dungeon per region carries the two original boss encounters.
 * Each newly created route freezes a deterministic 50/50 selection. Frostmarch
 * and Ashlands remain unlisted/unpublished until their respective content and
 * SQL reward-settlement gates are enabled; do not advertise gem odds early. */
export interface DungeonBossVariant{bossId:string;name:string;gemFamilies:readonly string[];}
export const DUNGEON_BOSS_REWARD_RATES=Object.freeze({rawGemPercent:18,recipePercent:8,catalystPercent:15,gemPityClears:8});
export const DUNGEON_BOSS_VARIANTS:Readonly<Record<string,readonly DungeonBossVariant[]>>=Object.freeze({
 EXP_001:[
  {bossId:'BOSS_EXP_ROOT',name:'Rootbound Heart',gemFamilies:['effect_bulwark','effect_renewal','effect_unyielding','stat_vitality']},
  {bossId:'BOSS_EXP_BELL',name:'Bell-Warden',gemFamilies:['effect_bulwark','effect_ruin','effect_execution','stat_vitality']},
 ],
 EXP_003:[
  {bossId:'BOSS_EXP_SOLAR',name:'The Buried Heliarch',gemFamilies:['effect_momentum','effect_critical_surge','effect_retaliation','stat_precision']},
  {bossId:'BOSS_EXP_SPHINX',name:'The Veiled Sphinx',gemFamilies:['effect_momentum','effect_flow','effect_benediction','stat_precision']},
 ],
 EXP_005:[
  {bossId:'BOSS_EXP_BELLBEAST',name:'The Bellbeast of Shiverlake',gemFamilies:['effect_aegis','effect_unyielding','effect_guardians_gift','stat_resolute']},
  {bossId:'BOSS_EXP_CANTOR',name:'The Frozen Cantor',gemFamilies:['effect_shared_resolve','effect_battle_rhythm','effect_renewal','stat_ward']},
 ],
 EXP_007:[
  {bossId:'BOSS_EXP_FEN',name:'The Blackglass Fen Prime',gemFamilies:['effect_predator','effect_execution','effect_ruin','stat_savage']},
  {bossId:'BOSS_EXP_PRIME',name:'The Crucible Prime',gemFamilies:['effect_bulwark','effect_aegis','effect_retaliation','stat_iron']},
 ],
});
export const dungeonBossVariantsFor=(expeditionId:string):readonly DungeonBossVariant[]=>DUNGEON_BOSS_VARIANTS[expeditionId]??[];
export function publishedDungeonBossVariants(expeditionId:string){
 const bosses=dungeonBossVariantsFor(expeditionId);
 return bosses.map(boss=>({...boss,chancePercent:100/bosses.length,...DUNGEON_BOSS_REWARD_RATES}));
}
