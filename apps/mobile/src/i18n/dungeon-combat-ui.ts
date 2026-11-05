import {useMemo} from 'react';
import type {Language} from './languages';
import {useGameLanguage} from './GameLanguageProvider';
import {interpolateTranslation,type TranslationParams} from './translator';

/** Combat card and screen-reader labels; no changes to replay state, damage or effect codes. */
export const dungeonCombatUiRows={
 "{name}, {className}, {role}, {percent}% health": ["{name}, {className}, {role}, {percent} % Lebenspunkte","{name}, {className}, {role}, {percent}% de salud","{name}, {className}, {role}, {percent}% gezondheid","{name}, {className}, {role}, {percent}% salute","{name}, {className}, {role}, {percent} % de santé","{name}, {className}, {role}, здоровье {percent}%","{name}, {className}, {role}, %{percent} sağlık"],
 "Inspect {name} combat details": ["Kampfinfos von {name} ansehen","Inspeccionar detalles de combate de {name}","Bekijk gevechtsdetails van {name}","Esamina i dettagli di combattimento di {name}","Examiner les détails de combat de {name}","Просмотреть боевые сведения о {name}","{name} savaş ayrıntılarını incele"],
 "{count} stacks": ["{count} Stapel","{count} acumulaciones","{count} stapels","{count} accumuli","{count} cumuls","Стаков: {count}","{count} birikim"],
 "Effect Gem proc": ["Effektedelstein ausgelöst","Gema de efecto activada","Effectedelsteen geactiveerd","Gemma effetto attivata","Gemme d'effet déclenchée","Сработал камень эффекта","Etki taşı tetiklendi"],
 "{count} more effects": ["{count} weitere Effekte","{count} efectos más","{count} extra effecten","Altri {count} effetti","{count} effets supplémentaires","Дополнительных эффектов: {count}","{count} ek etki"],
 "BARRIER +{amount}": ["BARRIERE +{amount}","BARRERA +{amount}","BARRIÈRE +{amount}","BARRIERA +{amount}","BARRIÈRE +{amount}","БАРЬЕР +{amount}","BARİYER +{amount}"],
 "FOCUS → {target}": ["ZIEL → {target}","OBJETIVO → {target}","DOELWIT → {target}","BERSAGLIO → {target}","CIBLE → {target}","ЦЕЛЬ → {target}","HEDEF → {target}"],
 "Boss {name}": ["Boss {name}","Jefe {name}","Baas {name}","Boss {name}","Boss {name}","Босс {name}","Boss {name}"],
 "Dungeon enemy {name}": ["Dungeon-Gegner {name}","Enemigo de mazmorra {name}","Kerkervijand {name}","Nemico del dungeon {name}","Ennemi du donjon {name}","Враг подземелья: {name}","Zindan düşmanı {name}"],
 "TANK": ["TANK","TANQUE","TANK","TANK","TANK","ТАНК","TANK"],
 "SUPPORT": ["UNTERSTÜTZUNG","APOYO","STEUN","SUPPORTO","SOUTIEN","ПОДДЕРЖКА","DESTEK"],
 "DAMAGE": ["SCHADEN","DAÑO","SCHADE","DANNI","DÉGÂTS","УРОН","HASAR"],
} as const satisfies Record<string,readonly [string,string,string,string,string,string,string]>;
export type DungeonCombatUiKey=keyof typeof dungeonCombatUiRows;
const index:Partial<Record<Language,number>>={de:0,es:1,nl:2,it:3,fr:4,ru:5,tr:6};
export function dungeonCombatUiText(language:Language,key:DungeonCombatUiKey,params:TranslationParams={}):string{
 const i=index[language];
 return interpolateTranslation(i===undefined?key:dungeonCombatUiRows[key][i],params);
}
export function useDungeonCombatUiText(){
 const language=useGameLanguage();
 return useMemo(()=>(key:DungeonCombatUiKey,params?:TranslationParams)=>dungeonCombatUiText(language,key,params),[language]);
}
