import {SUPPORTED_LANGUAGES} from '../src/i18n/languages';
import {FROSTFALL_PREVIEW_COPY,frostfallPreviewText} from '../src/i18n/frostfall-preview';

const englishKeys=Object.keys(FROSTFALL_PREVIEW_COPY.en);
for(const language of SUPPORTED_LANGUAGES){
 const locale=FROSTFALL_PREVIEW_COPY[language];
 for(const key of englishKeys){
  const translation=locale[key as keyof typeof locale];
  if(!translation?.trim())throw new Error(`Missing Frostfall preview translation: ${language}.${key}`);
  const placeholders=(value:string)=>[...value.matchAll(/\\{([a-z]+)\\}/g)].map(m=>m[1]).sort().join(',');
  if(placeholders(translation)!==placeholders(FROSTFALL_PREVIEW_COPY.en[key as keyof typeof FROSTFALL_PREVIEW_COPY.en]))throw new Error(`Placeholder mismatch: ${language}.${key}`);
 }
 const countdown=frostfallPreviewText(language,'unlockIn',{time:'3d 2h'});
 if(!countdown.includes('3d 2h'))throw new Error(`Frostfall teaser countdown interpolation failed for ${language}`);
}
console.log('PASS: Frostfall preview copy covers eight languages and preserves dynamic countdowns');
