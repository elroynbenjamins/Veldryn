import {deterministicInt} from '../expeditions/rng';

/** Eight named, run-only artifacts; different room paths produce different builds.
 * No world equipment/item grants. Duplicate stacks are capped at two per kind. */
export const DUNGEON_ARTIFACTS={
 RELIC_EMBER_HEART:{name:'Ember Heart',description:'+5% attack power.'},
 RELIC_IRON_BARK:{name:'Ironbark Idol',description:'+7% defense.'},
 RELIC_QUICK_SILVER:{name:'Quicksilver Feather',description:'+4% haste.'},
 RELIC_EAGLE_EYE:{name:'Eagle-Eye Lens',description:'+2.5 percentage points critical chance.'},
 RELIC_MOON_WELL:{name:'Moonwell Stone',description:'+10% healing power.'},
 RELIC_HUNTER_MARK:{name:'Hunter\'s Sigil',description:'+6% attack against elites.'},
 RELIC_BOSS_WARD:{name:'Ward of Ancients',description:'+8% defense against bosses.'},
 RELIC_PARTY_OATH:{name:'Oathbound Crest',description:'+4% attack and defense for tanks and supports.'},
} as const;
export type DungeonArtifactId=keyof typeof DUNGEON_ARTIFACTS;
export function isDungeonArtifact(id:string):id is DungeonArtifactId{return Object.prototype.hasOwnProperty.call(DUNGEON_ARTIFACTS,id);}
export function rollDungeonArtifact(secret:string,runId:string,nodeId:string,owned:readonly string[]):DungeonArtifactId{
 const catalog=Object.keys(DUNGEON_ARTIFACTS) as DungeonArtifactId[];
 const eligible=catalog.filter(id=>owned.filter(item=>item===id).length<2);
 const pool=eligible.length?eligible:catalog;
 return pool[deterministicInt(secret,0,pool.length-1,'dungeon-relic-v1',runId,nodeId)];
}
export function dungeonArtifactBonuses(owned:readonly string[],role:string|undefined,enemyKind:string):{
 attack:number;defense:number;healing:number;haste:number;critChance:number
}{
 const count=(id:DungeonArtifactId)=>Math.min(2,owned.filter(item=>item===id).length);
 const oath=(role==='tank'||role==='support')?count('RELIC_PARTY_OATH'):0;
 return {
  attack:1+count('RELIC_EMBER_HEART')*.05+(enemyKind==='elite'?count('RELIC_HUNTER_MARK')*.06:0)+oath*.04,
  defense:1+count('RELIC_IRON_BARK')*.07+(enemyKind==='boss'?count('RELIC_BOSS_WARD')*.08:0)+oath*.04,
  healing:1+count('RELIC_MOON_WELL')*.10,
  haste:count('RELIC_QUICK_SILVER')*.04,
  critChance:count('RELIC_EAGLE_EYE')*.025,
 };
}
