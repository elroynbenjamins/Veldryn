import {MONSTERS,type MonsterDef} from '../content/monsters';
import {REGIONAL_AREAS,regionalArea} from '../content/regional-areas';
import {WORLD_ZONES} from '../content/world-map';
import type {BestiaryEntryProjection,BestiaryProjection} from './bestiary-v40';

export interface MonsterCodexRow {monster:MonsterDef;entry:BestiaryEntryProjection}
export interface MonsterCodexZone {id:string;name:string;monsters:MonsterCodexRow[]}
export interface MonsterCodexRegion {
 id:string;name:string;minLevel:number;maxLevel:number;available:boolean;
 zones:MonsterCodexZone[];discovered:number;total:number;
}
const ASTERFALL_ZONE_NAMES=['Greenfields','Silverbrook','Ironwood Forest','Old Mines',"King's Road"] as const;
const REGION_ORDER=['ASTERFALL','SUNSCAR','FROSTMARCH','ASHLANDS'] as const;
const monsterById=new Map(MONSTERS.map(monster=>[monster.id,monster]));

export function monsterCodexRegionForLocation(locationId:string|undefined):string {
 return locationId==='SUNSCAR'||locationId==='FROSTMARCH'?locationId:'ASTERFALL';
}
function regionIdFor(monster:MonsterDef):string {
 return monster.zone==='Sunscar'?'SUNSCAR':monster.zone==='Frostmarch'?'FROSTMARCH':monster.zone==='Ashlands'?'ASHLANDS':'ASTERFALL';
}
function regionLabel(id:string):string{
 return id==='ASTERFALL'?'Asterfall':WORLD_ZONES.find(zone=>zone.id===id)?.name??id;
}
function locationFor(monster:MonsterDef,regionId:string):{id:string;name:string}{
 if(regionId==='ASTERFALL')return {id:monster.zone,name:monster.zone};
 const area=regionalArea(regionId,monster.areaId);
 return area?{id:area.id,name:area.name}:{id:monster.zone,name:monster.zone};
}
/** Group the canonical Bestiary projection without creating new progression state.
 * Unreleased monsters are excluded from the visible region tree and totals.
 */
export function monsterCodexRegions(projection:BestiaryProjection):MonsterCodexRegion[]{
 return REGION_ORDER.map(id=>{
  const world= WORLD_ZONES.find(zone=>zone.id===id);
  const available=id==='ASTERFALL'||world?.availability==='released';
  const grouped=new Map<string,MonsterCodexZone>();
  if(available){
   for(const entry of projection.entries){
    const monster=monsterById.get(entry.id);
    if(!monster||regionIdFor(monster)!==id)continue;
    const local=locationFor(monster,id),zone=grouped.get(local.id)??{id:local.id,name:local.name,monsters:[]};
    zone.monsters.push({monster,entry});grouped.set(local.id,zone);
   }
  }
  const sortOrder=id==='ASTERFALL'?[...ASTERFALL_ZONE_NAMES]:REGIONAL_AREAS.filter(area=>area.regionId===id).map(area=>area.name);
  const zones=[...grouped.values()].sort((a,b)=>{
   const ai=sortOrder.indexOf(a.name),bi=sortOrder.indexOf(b.name);
   return (ai<0?100:ai)-(bi<0?100:bi)||a.name.localeCompare(b.name);
  });
  for(const zone of zones)zone.monsters.sort((a,b)=>a.monster.level-b.monster.level||a.monster.name.localeCompare(b.monster.name));
  const all=zones.flatMap(zone=>zone.monsters);
  return {id,name:regionLabel(id),minLevel:id==='ASTERFALL'?1:world?.minLevel??0,
   maxLevel:id==='ASTERFALL'?25:world?.maxLevel??0,available:!!available,
   zones,discovered:all.filter(row=>row.entry.status!=='unknown'||row.entry.masteryPoints>0).length,total:all.length};
 });
}
