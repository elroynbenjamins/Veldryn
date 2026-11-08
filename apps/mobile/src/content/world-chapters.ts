/**
 * Presentation-only grouping. Each existing world region keeps its persisted ID,
 * unlock rules, weather, travel targets and gameplay content.
 */
export interface WorldChapterGroup {
  id:'ASTERFALL_HEARTLANDS'|'SUNSCAR'|'FROSTMARCH'|'ASHLANDS'|'VEILLANDS';
  name:string;
  numeral:string;
  artRegionId:string;
  regionIds:readonly string[];
  description:string;
}
export const WORLD_CHAPTER_GROUPS:readonly WorldChapterGroup[]=[
  {id:'ASTERFALL_HEARTLANDS',name:'Asterfall Heartlands',numeral:'I',artRegionId:'ASTERFALL_HEARTLANDS',
   regionIds:['GREENFIELDS','SILVERBROOK','IRONWOOD','OLD_MINES','KINGS_ROAD'],
   description:'The first roads, forests, mines and the Fallen Knight.'},
  {id:'SUNSCAR',name:'Sunscar',numeral:'II',artRegionId:'SUNSCAR',
   regionIds:['SUNSCAR'],description:'Glass deserts and buried royal ruins.'},
  {id:'FROSTMARCH',name:'Frostmarch',numeral:'III',artRegionId:'FROSTMARCH',
   regionIds:['FROSTMARCH'],description:'Frozen passes and the lair of the Frost Wyrm.'},
  {id:'ASHLANDS',name:'Ashlands',numeral:'IV',artRegionId:'ASHLANDS',
   regionIds:['ASHLANDS'],description:'Blackglass marshes and the crucible.'},
  {id:'VEILLANDS',name:'The Veillands',numeral:'V',artRegionId:'VEILLANDS',
   regionIds:['VEILLANDS'],description:'A reality-thin frontier beyond the known road.'},
];
export function worldChapterForRegionId(regionId:string){
  return WORLD_CHAPTER_GROUPS.find(chapter=>chapter.regionIds.includes(regionId));
}
