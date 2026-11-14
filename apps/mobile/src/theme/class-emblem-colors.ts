import type {ClassId} from '../core/types';

/** Class identity colors matched to the colored motifs in
 * assets/class-emblems-v4/icon/*.webp. These are not combat VFX or role
 * colors: each class gets its own emblem hue. Light variants retain the
 * hue while meeting practical text contrast on pale game themes.
 *
 * Keep this map alongside the emblem artwork when icons are redesigned.
 */
export const CLASS_EMBLEM_ACCENTS:Readonly<Record<ClassId,{dark:string;light:string}>>=Object.freeze({
 IRONWARDEN:   {dark:'#638BE0',light:'#285CB4'}, // blue enamel shield
 BASTION:      {dark:'#E5B34C',light:'#895C10'}, // gilded fortress
 DREADGUARD:   {dark:'#DF6873',light:'#AF3043'}, // crimson runes
 DAWNKEEPER:   {dark:'#F1D16B',light:'#865E07'}, // sun-gold halo
 WAYFINDER:    {dark:'#47C478',light:'#177044'}, // emerald leaves
 RAVAGER:      {dark:'#F18C48',light:'#A64C16'}, // orange forged blades
 HEXWEAVER:    {dark:'#BB8CEF',light:'#7343A9'}, // violet spellcraft
 KNIFE_DANCER: {dark:'#E767B2',light:'#A32A6E'}, // magenta daggers
 STONECALLER:  {dark:'#46D3CC',light:'#04716D'}, // turquoise stone
});

export function classEmblemAccent(classId:string|undefined,dark=true):string|undefined{
 if(!classId)return undefined;
 return CLASS_EMBLEM_ACCENTS[classId as ClassId]?.[dark?'dark':'light'];
}
