import type {QuestDef} from '../content/quests';
import type {ThemeColors} from '../theme/theme';

export type QuestPresentationTier='standard'|'notable'|'rare'|'epic'|'legendary';

export interface QuestPresentationMeta{
  tier:QuestPresentationTier;
  label:string;
  color:string;
  surface:string;
}

const TIER_BY_QUEST_ID:Record<string,QuestPresentationTier>={
  QST_001:'standard',QST_002:'standard',QST_003:'notable',QST_004:'notable',QST_005:'rare',
  QST_006:'notable',QST_007:'notable',QST_008:'rare',QST_009:'rare',QST_010:'epic',
  QST_011:'rare',QST_012:'rare',QST_013:'epic',QST_014:'legendary',QST_015:'epic',
};

export function questPresentationTier(def:QuestDef):QuestPresentationTier{
  return TIER_BY_QUEST_ID[def.id]??(def.kind==='boss'?'legendary':'standard');
}

export function questPresentationMeta(def:QuestDef,C:ThemeColors):QuestPresentationMeta{
  const tier=questPresentationTier(def);
  if(tier==='legendary')return {tier,label:'Legendary',color:C.accent,surface:C.accentSurface};
  if(tier==='epic')return {tier,label:'Epic',color:C.special,surface:C.specialSurface};
  if(tier==='rare')return {tier,label:'Rare',color:C.info,surface:C.infoSurface};
  if(tier==='notable')return {tier,label:'Notable',color:C.good,surface:C.goodSurface};
  return {tier,label:'Standard',color:C.muted,surface:C.panel2};
}
