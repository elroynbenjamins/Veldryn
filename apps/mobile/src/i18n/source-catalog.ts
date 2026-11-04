import {SUPPORTED_LANGUAGES,type Language} from './languages';
import {interpolateTranslation,type TranslationParams} from './translator';
import {earlyLocaleText} from './early-locales';

/** Existing rows cover DE, ES, NL, IT, FR; new locales fall back to English. */
export type TranslationRow=readonly [de:string,es:string,nl:string,it:string,fr:string];
export function createSourceTranslator(rows:Record<string,TranslationRow>){
 return (language:Language,source:string,params?:TranslationParams):string=>{
  const index=SUPPORTED_LANGUAGES.indexOf(language)-1;
  const row=Object.prototype.hasOwnProperty.call(rows,source)?rows[source]:undefined;
  const translated=index>=0&&row?row[index]:undefined;
  return interpolateTranslation(earlyLocaleText(language,source)??translated??source,params);
 };
}
