import {SUPPORTED_LANGUAGES,type Language} from './languages';
import {interpolateTranslation,type TranslationParams} from './translator';

/** Translation order follows the five non-English release languages. */
export type TranslationRow=readonly [de:string,es:string,nl:string,it:string,fr:string];
export function createSourceTranslator(rows:Record<string,TranslationRow>){
 return (language:Language,source:string,params?:TranslationParams):string=>{
  const index=SUPPORTED_LANGUAGES.indexOf(language)-1;
  const row=Object.prototype.hasOwnProperty.call(rows,source)?rows[source]:undefined;
  return interpolateTranslation(index>=0&&row?row[index]:source,params);
 };
}
