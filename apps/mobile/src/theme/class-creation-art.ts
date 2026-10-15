import type {ClassId} from '../core/types';
import {CLASS_ICON_ACCENT} from '../content/class-icon-colors';
import {classIconArtwork} from './character-assets';

/** Approved class illustrations for selection; these do not grant equipment. */
export const classCreationPresentation = {
  IRONWARDEN:{accent:CLASS_ICON_ACCENT.IRONWARDEN,traits:'Guard · Threat · Counterplay'},
  BASTION:{accent:CLASS_ICON_ACCENT.BASTION,traits:'Barriers · Fortification · Protection'},
  DREADGUARD:{accent:CLASS_ICON_ACCENT.DREADGUARD,traits:'Dread · Control · Self-sustain'},
  DAWNKEEPER:{accent:CLASS_ICON_ACCENT.DAWNKEEPER,traits:'Healing · Cleansing · Protection'},
  WAYFINDER:{accent:CLASS_ICON_ACCENT.WAYFINDER,traits:'Range · Precision · Sustained damage'},
  RAVAGER:{accent:CLASS_ICON_ACCENT.RAVAGER,traits:'Heavy melee · Breaking defenses'},
  HEXWEAVER:{accent:CLASS_ICON_ACCENT.HEXWEAVER,traits:'Hexes · Arcane damage · Focus'},
  KNIFE_DANCER:{accent:CLASS_ICON_ACCENT.KNIFE_DANCER,traits:'Precision · Critical strikes · Execution'},
  STONECALLER:{accent:CLASS_ICON_ACCENT.STONECALLER,traits:'Resonance · Geomancy · Totems'},
} satisfies Record<ClassId,{accent:string;traits:string}>;

export function classCreationArt(id:ClassId){
  void id;
  return {male:{front:classIconArtwork[id],back:classIconArtwork[id]},female:{front:classIconArtwork[id],back:classIconArtwork[id]}};
}
