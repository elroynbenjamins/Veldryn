import {itemDef} from '../content/items';
import {mobileGemFamilyV1,parseMobileRawGemItemIdV1} from '../content/gems-v1';
import {gemEffectDescription} from './equipment-enhancement';
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

  if(item.type==='gem'&&item.gemStat){
    const statName={attack:'Attack',defense:'Defense',hp:'Max HP'}[item.gemStat];
    const amount=Number(((item.gemPercent??0)*100).toFixed(3));
    return {bonus:'+'+amount+'% '+statName+' when socketed',active:true};
  }
  if(item.type==='gem'&&item.gemEffect){
    return {bonus:gemEffectDescription(itemId),detail:'Active when socketed in an Effect Gem slot.',active:true};
  }
  return {bonus:item.passive??'No socket bonus available.',active:false};
}
