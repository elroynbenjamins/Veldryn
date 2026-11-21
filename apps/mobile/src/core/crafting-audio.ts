/** Crafting audio: one low-volume cue per confirmed action, never per AFK batch. */
import {RECIPES} from '../content/skills';
import {itemDef} from '../content/items';
import {playSound} from '../storage/audio';
import {SOUND_EFFECT_ASSETS,type SoundEffectId} from '../theme/audio-assets';

export type CraftCue='smith_hammer_1'|'smith_hammer_2'|'smelt_bellows'|'smelt_pour'|'forge_ignite'|'forge_quench'|'woodwork_plane'|'tailor_stitch'|'alchemy_bubble'|'cooking_sizzle';
let lastCue:CraftCue|undefined;
let lastAt=0;
let hammerAlternate=false,smeltAlternate=false;

/** Kept independent of optional new assets so older binary builds stay silent safely. */
export function playCraftCue(cue:CraftCue):void{
 const now=Date.now();
 if(cue===lastCue&&now-lastAt<900)return;
 lastCue=cue;lastAt=now;
 if(Object.prototype.hasOwnProperty.call(SOUND_EFFECT_ASSETS,cue))playSound(cue as SoundEffectId,0.7);
}

export function craftCueForRecipe(recipeId:string):CraftCue{
 const recipe=RECIPES.find(row=>row.id===recipeId);
 const id=recipeId.toUpperCase(),name=(recipe?.name??'').toLowerCase();
 if(id.startsWith('SMELT_')||name.includes('smelt')){smeltAlternate=!smeltAlternate;return smeltAlternate?'smelt_bellows':'smelt_pour';}
 if(recipe?.skillId==='alchemy')return 'alchemy_bubble';
 if(recipe?.skillId==='cooking')return 'cooking_sizzle';
 if(recipe?.skillId==='tailoring')return 'tailor_stitch';
 if(name.includes('wood')||name.includes('timber')||name.includes('carve'))return 'woodwork_plane';
 if(recipe&&(['gear','tool'].includes(itemDef(recipe.output.itemId).type)||id.includes('FORGE_')))return 'forge_ignite';
 hammerAlternate=!hammerAlternate;
 return hammerAlternate?'smith_hammer_1':'smith_hammer_2';
}

export function playCraftStarted(recipeId:string):void{playCraftCue(craftCueForRecipe(recipeId));}
export function playForgeClaimed():void{playCraftCue('forge_quench');}
