import {MONSTERS} from '../content/monsters';
import type {GameState} from './types';
import {monsterMastery} from './monster-mastery';

export type RegionalStoryLeadRegion='SUNSCAR'|'FROSTMARCH'|'ASHLANDS';
export interface RegionalStoryLead{
  id:string;
  regionId:RegionalStoryLeadRegion;
  chapter:number;
  title:string;
  location:string;
  minLevel:number;
  targetMonsterId:string;
  lore:string;
  objective:string;
}
export interface RegionalStoryLeadView extends RegionalStoryLead{
  monsterName:string;
  masteryRank:number;
  status:'locked'|'available'|'mastered';
}

export const REGIONAL_STORY_LEADS:readonly RegionalStoryLead[]=[
  {id:'SUNSCAR_01',regionId:'SUNSCAR',chapter:1,title:'Glasswind Crossing',location:'Caravan Road',minLevel:26,targetMonsterId:'SUNSCAR_SCORPION',lore:'The first road beyond Asterfall is half-buried by glass sand. Caravans refuse to move until someone clears the scorpions nesting beneath the sun-warmed shards.',objective:'Hunt Sunscar Scorpions and learn how the desert punishes careless travelers.'},
  {id:'SUNSCAR_02',regionId:'SUNSCAR',chapter:2,title:'Oracle in the Mirage',location:'False Oasis',minLevel:31,targetMonsterId:'DUNE_ORACLE',lore:'Travelers are following voices into dry basins that appear as water from a distance. The Dune Oracles know why the mirages are becoming more convincing.',objective:'Press deeper into Sunscar and confront the Dune Oracles behind the false routes.'},
  {id:'SUNSCAR_03',regionId:'SUNSCAR',chapter:3,title:'The Glassbound Watch',location:'Buried Observatory',minLevel:38,targetMonsterId:'GLASSBOUND_SENTINEL',lore:'A buried observatory has begun opening itself one chamber at a time. Glassbound Sentinels still defend its instruments as though the last astronomers never left.',objective:'Break the Sentinel watch and uncover the route through the observatory ruins.'},

  {id:'FROSTMARCH_01',regionId:'FROSTMARCH',chapter:1,title:'Tracks Beyond Thawgate',location:'White Pass',minLevel:46,targetMonsterId:'FROSTWOLF',lore:'Fresh tracks cross every marked trail north of Thawgate, then vanish in blowing snow. Frostwolves are shadowing travelers long before they strike.',objective:'Hunt Frostwolves until the northern approach is safe enough for scouts to move.'},
  {id:'FROSTMARCH_02',regionId:'FROSTMARCH',chapter:2,title:'The Bell in the Snow',location:'Shiverlake Approach',minLevel:53,targetMonsterId:'BELLWRAITH',lore:'A bell rings from nowhere during the whiteout, and each toll leaves another set of footprints where no traveler stood before. The Bellwraiths are gathering around the sound.',objective:'Track the Bellwraiths and follow their resonance toward the frozen lake.'},
  {id:'FROSTMARCH_03',regionId:'FROSTMARCH',chapter:3,title:'Hollow Choir',location:'Choir Caverns',minLevel:63,targetMonsterId:'CHOIR_HUNTER',lore:'The sound beneath Frostmarch is no longer a single bell. A hollow choir echoes through the caverns, and its hunters are guarding the passages that carry the song upward.',objective:'Defeat Choir Hunters and open a path toward the deepest resonance chambers.'},

  {id:'ASHLANDS_01',regionId:'ASHLANDS',chapter:1,title:'Blackglass Rising',location:'Blackglass Mire',minLevel:71,targetMonsterId:'BLACKGLASS_MIRELING',lore:'New blackglass is pushing through the marsh in jagged veins. Mirelings gather around the freshest growth as though something beneath the mire is feeding them.',objective:'Hunt Blackglass Mirelings and map where the new glass veins are surfacing.'},
  {id:'ASHLANDS_02',regionId:'ASHLANDS',chapter:2,title:'Heart of the Furnace',location:'Furnace Road',minLevel:78,targetMonsterId:'CINDER_TITAN',lore:'The old furnace road is open again, but every mile is marked by heat cracks and the footsteps of Cinder Titans. The crucible ahead has started burning without keepers.',objective:'Bring down Cinder Titans and secure the furnace road for the next expedition.'},
  {id:'ASHLANDS_03',regionId:'ASHLANDS',chapter:3,title:'The Ashen Regent',location:'Regent Causeway',minLevel:86,targetMonsterId:'ASHEN_REVENANT',lore:'Ashen Revenants are forming ranks along a causeway of fused blackglass. Their movements point toward a command deeper in the Ashlands rather than mindless wandering.',objective:'Break the Revenant formations and reach the causeway leading toward the unknown regent.'},
];

export function regionalStoryLeads(regionId:string,state:GameState):RegionalStoryLeadView[]{
  return REGIONAL_STORY_LEADS.filter(lead=>lead.regionId===regionId).map(lead=>{
    const monster=MONSTERS.find(row=>row.id===lead.targetMonsterId),masteryRank=monsterMastery(state,lead.targetMonsterId).rank;
    return {...lead,monsterName:monster?.name??lead.targetMonsterId,masteryRank,status:state.character!.level<lead.minLevel?'locked':masteryRank>=20?'mastered':'available'};
  });
}
export function nextRegionalStoryLead(regionId:string,state:GameState){
  const leads=regionalStoryLeads(regionId,state);
  return leads.find(lead=>lead.status==='available')??leads.find(lead=>lead.status==='locked')??leads[leads.length-1];
}
