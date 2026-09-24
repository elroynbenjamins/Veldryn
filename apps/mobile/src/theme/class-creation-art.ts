import type {ClassId} from '../core/types';
import {startingCharacterArtwork} from './character-assets';

/** Approved class illustrations for selection; these do not grant equipment or skins. */
export const classCreationPresentation = {
  IRONWARDEN:{accent:'#70BDFA',traits:'Guard · Threat · Counterplay'},
  BASTION:{accent:'#C98342',traits:'Barriers · Fortification · Protection'},
  DREADGUARD:{accent:'#A4536C',traits:'Dread · Control · Self-sustain'},
  DAWNKEEPER:{accent:'#F1DE75',traits:'Healing · Cleansing · Protection'},
  WAYFINDER:{accent:'#9EC57F',traits:'Range · Precision · Sustained damage'},
  RAVAGER:{accent:'#EB6A43',traits:'Heavy melee · Breaking defenses'},
  HEXWEAVER:{accent:'#C4A0FA',traits:'Hexes · Arcane damage · Focus'},
  KNIFE_DANCER:{accent:'#E968AF',traits:'Precision · Critical strikes · Execution'},
  STONECALLER:{accent:'#54C8BE',traits:'Resonance · Geomancy · Totems'},
} satisfies Record<ClassId,{accent:string;traits:string}>;

export function classCreationArt(id:ClassId){
  void id;
  return startingCharacterArtwork;
}
