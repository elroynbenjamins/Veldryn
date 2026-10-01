import type {GameState} from './types';
import {LANGUAGE_LOCALES} from '../i18n/translator';
import type {Language} from '../i18n/languages';

export function formatGameNumber(value:number,mode:GameState['settings']['numberMode'],language?:Language){
  if(mode==='exact'||Math.abs(value)<1_000)return Math.round(value).toLocaleString(language?LANGUAGE_LOCALES[language]:undefined);
  const absolute=Math.abs(value);
  const [divisor,suffix]=absolute>=1_000_000_000?[1_000_000_000,'B']:absolute>=1_000_000?[1_000_000,'M']:[1_000,'K'];
  const scaled=value/divisor;
  if(language)return `${scaled.toLocaleString(LANGUAGE_LOCALES[language],{useGrouping:false,maximumFractionDigits:Math.abs(scaled)>=100?0:Math.abs(scaled)>=10?1:2})}${suffix}`;
  return `${scaled.toFixed(Math.abs(scaled)>=100?0:Math.abs(scaled)>=10?1:2).replace(/\.0+$/,'').replace(/(\.[0-9])0$/,'$1')}${suffix}`;
}
