import {MONSTERS} from '../content/monsters';
import {GATHERING} from '../content/skills';
import {HERB_NODES} from '../content/herbalism';
import {regionAreas,regionalArea} from '../content/regional-areas';

/** Presentation-only area grouping; server state still persists region IDs. */
export function regionalAreaActivityCounts(regionId:string,areaId:string){
  const area=regionalArea(regionId,areaId);
  if(!area)return {enemies:0,gathering:0};
  return {
    enemies:MONSTERS.filter(monster=>monster.areaId===area.id&&!monster.boss).length,
    gathering:[...GATHERING,...HERB_NODES].filter(node=>node.zoneId===regionId&&node.areaId===area.id).length,
  };
}
export function validateRegionalAreaContent():string[]{
  const errors:string[]=[];
  for(const regionId of ['SUNSCAR','FROSTMARCH']){
    const areas=regionAreas(regionId);
    if(areas.length!==4)errors.push(regionId+':area_count');
    if(new Set(areas.map(area=>area.id)).size!==4)errors.push(regionId+':duplicate_area');
    const monsterIds=new Set<string>(),nodeIds=new Set<string>();
    for(const area of areas){
      const {enemies,gathering}=regionalAreaActivityCounts(regionId,area.id);
      if(enemies!==2)errors.push(area.id+':enemy_count_'+enemies);
      if(gathering===0)errors.push(area.id+':gathering_empty');
      for(const monster of MONSTERS.filter(row=>row.areaId===area.id)){
        if(monsterIds.has(monster.id))errors.push(monster.id+':duplicate');monsterIds.add(monster.id);
        if(monster.unlockLevel<area.minLevel&&monster.regionalAreaAutoUnlock)errors.push(monster.id+':unlock_before_area');
      }
      for(const node of [...GATHERING,...HERB_NODES].filter(row=>row.areaId===area.id)){
        if(nodeIds.has(node.id))errors.push(node.id+':duplicate');nodeIds.add(node.id);
      }
    }
    if(monsterIds.size!==8)errors.push(regionId+':enemies_'+monsterIds.size);
    if(nodeIds.size!==10)errors.push(regionId+':gathering_'+nodeIds.size);
  }
  return errors;
}
