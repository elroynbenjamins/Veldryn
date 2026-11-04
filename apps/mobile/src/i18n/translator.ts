import type {Language} from './languages';
import {earlyLocaleText} from './early-locales';

export type TranslationParams=Record<string,string|number>;

/** Replace only catalog placeholders; interpolated names are never translated. */
export function interpolateTranslation(message:string,params:TranslationParams={}):string{
 return message.replace(/\{([a-zA-Z][a-zA-Z0-9_]*)\}/g,(placeholder,key:string)=>
  Object.prototype.hasOwnProperty.call(params,key)?String(params[key]):placeholder);
}

export function createTranslator<K extends string>(catalogs:Partial<Record<Language,Partial<Record<K,string>>>>){
 return (language:Language,key:K,params:TranslationParams={}):string=>{
  const read=(catalog:Partial<Record<K,string>>|undefined)=>catalog&&Object.prototype.hasOwnProperty.call(catalog,key)&&typeof catalog[key]==='string'?catalog[key]:undefined;
  const english=read(catalogs.en);
  return interpolateTranslation((english?earlyLocaleText(language,english):undefined)??read(catalogs[language])??english??key,params);
 };
}

export const LANGUAGE_LOCALES:Record<Language,string>={
 en:'en-GB',de:'de-DE',es:'es-ES',nl:'nl-NL',it:'it-IT',fr:'fr-FR',ru:'ru-RU',tr:'tr-TR',
};

export function formatLocalizedNumber(language:Language,value:number,options?:Intl.NumberFormatOptions):string{
 return new Intl.NumberFormat(LANGUAGE_LOCALES[language],options).format(value);
}

export function formatLocalizedDate(language:Language,value:number|Date,options?:Intl.DateTimeFormatOptions):string{
 return new Intl.DateTimeFormat(LANGUAGE_LOCALES[language],options).format(value);
}
