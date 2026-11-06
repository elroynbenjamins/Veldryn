import type {Language} from './languages';
import {SUPPORTED_LANGUAGES} from './languages';
import type {Recipe} from '../content/skills';
import {itemDef} from '../content/items';
import {localizedItemName} from './starter-item-names';
import {interpolateTranslation} from './translator';

/** UI-only recipe names. No recipe IDs or crafting commands are modified.
 * Exact authored English source guards leave changed or user-generated names untouched. */
type SevenLanguages=readonly [string,string,string,string,string,string,string];
export const craftingActionRows={
  "Smelt {item}": [
    "Schmelze {item}",
    "Fundir {item}",
    "Smelt {item}",
    "Fondi {item}",
    "Fondre {item}",
    "Выплавить: {item}",
    "{item} erit"
  ],
  "Forge {item}": [
    "Schmiede {item}",
    "Forjar {item}",
    "Smeed {item}",
    "Forgia {item}",
    "Forger {item}",
    "Выковать: {item}",
    "{item} döv"
  ],
  "Synthesize {item}": [
    "Synthetisiere {item}",
    "Sintetizar {item}",
    "Synthetiseer {item}",
    "Sintetizza {item}",
    "Synthétiser {item}",
    "Синтезировать: {item}",
    "{item} sentezle"
  ],
  "Cook {item}": [
    "Koche {item}",
    "Cocinar {item}",
    "Kook {item}",
    "Cucina {item}",
    "Cuisiner {item}",
    "Приготовить: {item}",
    "{item} pişir"
  ],
  "Roast {item}": [
    "Brate {item}",
    "Asar {item}",
    "Rooster {item}",
    "Arrostisci {item}",
    "Rôtir {item}",
    "Запечь: {item}",
    "{item} kızart"
  ],
  "Sear {item}": [
    "Brate {item} scharf an",
    "Sellar {item}",
    "Schroei {item} dicht",
    "Rosola {item}",
    "Saisir {item}",
    "Быстро обжарить: {item}",
    "{item} mühürle"
  ],
  "Bake {item}": [
    "Backe {item}",
    "Hornear {item}",
    "Bak {item}",
    "Cuoci al forno {item}",
    "Cuire au four {item}",
    "Запечь в печи: {item}",
    "{item} fırınla"
  ],
  "Grill {item}": [
    "Grille {item}",
    "Asar a la parrilla {item}",
    "Grill {item}",
    "Griglia {item}",
    "Griller {item}",
    "Приготовить на гриле: {item}",
    "{item} ızgarala"
  ],
  "Char {item}": [
    "Röste {item} dunkel",
    "Tostar {item}",
    "Rooster {item} donker",
    "Abbrustolisci {item}",
    "Griller fortement {item}",
    "Обуглить: {item}",
    "{item} közle"
  ],
  "Roast Oathscale": [
    "Brate Eidschuppen",
    "Asar escamas juradas",
    "Rooster eedschub",
    "Arrostisci squame del giuramento",
    "Rôtir les écailles du serment",
    "Запечь клятвенную чешую",
    "Yeminpulunu kızart"
  ],
  "Refine Oathglass into Dune Binder": [
    "Veredle Eidglas zu Dünenbinder",
    "Refinar cristal jurado en aglutinante de dunas",
    "Verfijn eedglas tot duinbinder",
    "Raffina vetro del giuramento in legante delle dune",
    "Raffiner le verre du serment en liant des dunes",
    "Переработать клятвостекло в связующее дюн",
    "Yemin Camını Kumul Bağlayıcıya dönüştür"
  ],
  "Refine Oathglass into Glassbound Binder": [
    "Veredle Eidglas zu Glasbinder",
    "Refinar cristal jurado en aglutinante de cristal",
    "Verfijn eedglas tot glasbinder",
    "Raffina vetro del giuramento in legante del vetro",
    "Raffiner le verre du serment en liant de verre",
    "Переработать клятвостекло в стеклянное связующее",
    "Yemin Camını Cam Bağlayıcıya dönüştür"
  ]
} as const satisfies Record<string,SevenLanguages>;
export const craftingActionRecipes={
  "SMELT_COPPER_INGOT": {
    "verb": "Smelt",
    "itemId": "COPPER_INGOT",
    "en": "Smelt Copper Ingot"
  },
  "SMELT_ASTER_IRON_INGOT": {
    "verb": "Smelt",
    "itemId": "ASTER_IRON_INGOT",
    "en": "Smelt Aster-Iron Ingot"
  },
  "FORGE_REINFORCED_FITTING": {
    "verb": "Forge",
    "itemId": "REINFORCED_FITTING",
    "en": "Forge Reinforced Fitting"
  },
  "SMELT_OATHSTONE_INGOT": {
    "verb": "Smelt",
    "itemId": "OATHSTONE_INGOT",
    "en": "Smelt Oathstone Ingot"
  },
  "SMELT_SUNSTONE_INGOT": {
    "verb": "Smelt",
    "itemId": "SUNSTONE_INGOT",
    "en": "Smelt Sunstone Ingot"
  },
  "SMELT_FROSTIRON_INGOT": {
    "verb": "Smelt",
    "itemId": "FROSTIRON_INGOT",
    "en": "Smelt Frostiron Ingot"
  },
  "SMELT_BLACKGLASS_INGOT": {
    "verb": "Smelt",
    "itemId": "BLACKGLASS_INGOT",
    "en": "Smelt Blackglass Ingot"
  },
  "ENCHANT_REGIONAL_CATALYST": {
    "verb": "Synthesize",
    "itemId": "REGIONAL_CATALYST",
    "en": "Synthesize Regional Catalyst"
  },
  "ENCHANT_RADIANT_CATALYST": {
    "verb": "Synthesize",
    "itemId": "RADIANT_CATALYST",
    "en": "Synthesize Radiant Catalyst"
  },
  "COOK_MEADOW_PERCH": {
    "verb": "Cook",
    "itemId": "MEADOW_PERCH",
    "en": "Cook Meadow Perch"
  },
  "COOK_SILVERFIN": {
    "verb": "Cook",
    "itemId": "SILVERFIN",
    "en": "Cook Silverfin"
  },
  "COOK_ROOTSTREAM_TROUT": {
    "verb": "Roast",
    "itemId": "ROOTSTREAM_TROUT",
    "en": "Roast Rootstream Trout"
  },
  "COOK_RIVER_EEL": {
    "verb": "Sear",
    "itemId": "RIVER_EEL",
    "en": "Sear River Eel"
  },
  "COOK_CAVE_LOACH": {
    "verb": "Bake",
    "itemId": "CAVE_LOACH",
    "en": "Bake Cave Loach"
  },
  "COOK_CROWN_CARP": {
    "verb": "Roast",
    "itemId": "CROWN_CARP",
    "en": "Roast Crown Carp"
  },
  "COOK_OASIS_CARP": {
    "verb": "Grill",
    "itemId": "OASIS_CARP",
    "en": "Grill Oasis Carp"
  },
  "COOK_EMBERFIN": {
    "verb": "Char",
    "itemId": "EMBERFIN",
    "en": "Char Emberfin"
  }
} as const;
export const craftingExceptionRecipes={
  "COOK_OATHSCALE": "Roast Oathscale",
  "REFINE_OATHGLASS_TO_DUNE_BINDER": "Refine Oathglass into Dune Binder",
  "REFINE_OATHGLASS_TO_GLASSBOUND_BINDER": "Refine Oathglass into Glassbound Binder"
} as const;

export function localizedRecipeName(language:Language,recipe:Pick<Recipe,'id'|'name'|'output'>):string{
 const action=craftingActionRecipes[recipe.id as keyof typeof craftingActionRecipes];
 const col=SUPPORTED_LANGUAGES.indexOf(language)-1;
 if(action&&recipe.name===action.en){
  const label=`${action.verb} {item}` as keyof typeof craftingActionRows;
  const localizedItem=localizedItemName(language,action.itemId);
  const row=craftingActionRows[label];
  return interpolateTranslation(col>=0?row[col]:label,{item:localizedItem});
 }
 const special=craftingExceptionRecipes[recipe.id as keyof typeof craftingExceptionRecipes];
 if(special&&recipe.name===special){
  const row=craftingActionRows[special];
  return col>=0?row[col]:special;
 }
 // Potion, infusion and crafted-food recipes whose name equals their output
 // use the already reviewed ID-based name without creating duplicate translations.
 if(recipe.name===itemDef(recipe.output.itemId).name)return localizedItemName(language,recipe.output.itemId);
 return recipe.name;
}
export function recipeMatchesLocalizedSearch(language:Language,recipe:Pick<Recipe,'id'|'name'|'output'>,query:string):boolean{
 const q=query.trim().toLocaleLowerCase(language);
 return !q||[recipe.name,itemDef(recipe.output.itemId).name,localizedRecipeName(language,recipe),localizedItemName(language,recipe.output.itemId)]
  .some(text=>text.toLocaleLowerCase(language).includes(q));
}
