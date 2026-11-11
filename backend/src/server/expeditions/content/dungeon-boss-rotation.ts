/** The one published queue in each region preserves both original final bosses.
 * Frozen server routes select one with equal odds. The SQL gem claim trigger
 * uses these exact boss IDs and gem-family pools for authenticated rewards. */
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
});
export const dungeonBossVariantsFor=(expeditionId:string):readonly DungeonBossVariant[]=>DUNGEON_BOSS_VARIANTS[expeditionId]??[];
export function publishedDungeonBossVariants(expeditionId:string){
 const bosses=dungeonBossVariantsFor(expeditionId);
 return bosses.map(boss=>({...boss,chancePercent:100/bosses.length,...DUNGEON_BOSS_REWARD_RATES}));
}
