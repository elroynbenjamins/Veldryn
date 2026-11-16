import {itemDef} from '../content/items';
import {GEM_ROLL_MIN_PERCENT_V1,GEM_ROLL_MAX_PERCENT_V1,mobileGemFamilyV1,parseMobileRawGemItemIdV1} from '../content/gems-v1';
import {legacyGemBonusValue} from './equipment-enhancement';
import {canonicalGemMetaV1,formatGemRollRangeV1} from './gem-progression-v1';

/** Player-facing socket effects. Never present an unrefined gem as an active buff. */
export function gemPouchBonusDisplayV1(itemId:string):{bonus:string;detail?:string;active:boolean}{
  const item=itemDef(itemId);
  const raw=parseMobileRawGemItemIdV1(itemId);
  if(raw){
    const family=mobileGemFamilyV1(raw.familyId)!;
    const range=formatGemRollRangeV1(raw.familyId,raw.grade);
    return {
      bonus:'No active bonus until refined',
      detail:family.kind==='stat'
        ?'After refining: '+range+' when socketed.'
        :'After refining: '+family.description+' Possible socket strength: '+range+'.',
      active:false,
    };
  }

  const meta=canonicalGemMetaV1(itemId);
  if(meta){
    const family=mobileGemFamilyV1(meta.familyId)!;
    const range=formatGemRollRangeV1(meta.familyId,meta.grade);
    return family.kind==='stat'
      ?{bonus:range+' when socketed',detail:family.description,active:true}
      :{bonus:family.description,detail:'Possible socket strength: '+range+'.',active:true};
  }

  if(item.type==='gem'&&(item.gemStat||item.gemEffect)){
    const format=(value:number)=>String(Number((value*100).toFixed(3)));
    const range=(itemId:string)=>format(legacyGemBonusValue(itemId,GEM_ROLL_MIN_PERCENT_V1))+'–'+format(legacyGemBonusValue(itemId,GEM_ROLL_MAX_PERCENT_V1))+'%';
    if(item.gemStat){
      const statName={attack:'Attack',defense:'Defense',hp:'Max HP'}[item.gemStat];
      return {bonus:'+'+range(itemId)+' '+statName+' when socketed',detail:'One of nine equally likely rolls, from 80% to 120% of the base bonus.',active:true};
    }
    const effectLabel={combat_speed:'combat speed',boss_power:'combat power against bosses',damage_reduction:'incoming combat damage',recovery:'out-of-combat recovery'}[item.gemEffect!];
    return {
      bonus:item.gemEffect==='damage_reduction'?range(itemId)+' less '+effectLabel:'+'+range(itemId)+' '+effectLabel,
      detail:'One of nine equally likely rolls. Actual bonus is determined when socketed.',
      active:true,
    };
  }
  return {bonus:item.passive??'No socket bonus available.',active:false};
}
