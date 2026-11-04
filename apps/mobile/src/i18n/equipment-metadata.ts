import type {Language} from './languages';

/** Narrow, authored equipment metadata; never treat player-provided text as a template. */
export const equipmentMaterialMetadataRows={
 en:'EQUIPMENT 2.0 · {tiers} MATERIAL',
 de:'AUSRÜSTUNG 2.0 · MATERIAL {tiers}',
 es:'EQUIPO 2.0 · MATERIAL {tiers}',
 nl:'UITRUSTING 2.0 · MATERIAAL {tiers}',
 it:'EQUIPAGGIAMENTO 2.0 · MATERIALE {tiers}',
 fr:'ÉQUIPEMENT 2.0 · MATÉRIAU {tiers}',
 ru:'СНАРЯЖЕНИЕ 2.0 · МАТЕРИАЛ {tiers}',
 tr:'EKİPMAN 2.0 · {tiers} MALZEMESİ',
} as const satisfies Record<Language,string>;

export function equipmentMaterialMetadataText(language:Language,source:string):string|undefined{
 const match=/^EQUIPMENT 2\.0 · (T[1-9](?:(?:\/|–)T[1-9])*) MATERIAL$/.exec(source);
 if(!match)return undefined;
 return equipmentMaterialMetadataRows[language].replace('{tiers}',match[1]);
}
