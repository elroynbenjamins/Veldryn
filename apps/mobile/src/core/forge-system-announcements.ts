import type {ItemRarity} from './item-rarity';

export type AnnouncedForgeRarity=Extract<ItemRarity,'epic'|'legendary'|'mythic'>;
export interface ForgeSystemAnnouncement{
  characterName:string;
  equipmentName:string;
  rarity:AnnouncedForgeRarity;
  quality:number;
}

/** Converts only server-authored, well-formed world feed rows into a special System line. */
export function readForgeSystemAnnouncement(row:{kind:string;display_name:string;subject_name:string;detail:string|null}):ForgeSystemAnnouncement|null{
  const rarity=row.kind.startsWith('forge_')?row.kind.slice(6):'';
  if(rarity!=='epic'&&rarity!=='legendary'&&rarity!=='mythic')return null;
  const qualityMatch=/^Q(100|[1-9]?[0-9])\/100$/.exec(row.detail??'');
  if(!qualityMatch||!row.display_name.trim()||!row.subject_name.trim())return null;
  return {
    characterName:row.display_name,
    equipmentName:row.subject_name,
    rarity,
    quality:Number(qualityMatch[1]),
  };
}
