import {useMemo} from 'react';
import type {Language} from './languages';
import {useGameLanguage} from './GameLanguageProvider';
import {interpolateTranslation,type TranslationParams} from './translator';
import {dungeonCombatUiText} from './dungeon-combat-ui';
import type {DungeonRole,DungeonRouteOptionV20} from '../core/live-dungeon-sunscar-v20';

/** Live Dungeon queue / ready-check / route UI. Server room names and reward hints are never translated speculatively. */
export const liveDungeonUiRows={
 "Team: 1 Tank · 2 Damage · 1 Support. Loadout locks at ready check.": ["Team: 1 Tank · 2 Schaden · 1 Unterstützung. Ausrüstung wird bei der Bereitschaftsabfrage gesperrt.","Equipo: 1 tanque · 2 daño · 1 apoyo. El equipo se bloquea en la confirmación.","Team: 1 tank · 2 schade · 1 steun. Uitrusting wordt vastgezet bij de gereedcheck.","Squadra: 1 tank · 2 danni · 1 supporto. L'equipaggiamento si blocca alla conferma.","Équipe : 1 tank · 2 dégâts · 1 soutien. L'équipement est verrouillé à la confirmation.","Группа: 1 танк · 2 бойца · 1 поддержка. Снаряжение закрепляется при проверке готовности.","Takım: 1 tank · 2 hasar · 1 destek. Hazır kontrolünde ekipman kilitlenir."],
 "READY CHECK · {seconds}s": ["BEREITSCHAFT · {seconds} s","CONFIRMACIÓN · {seconds} s","GEREEDCHECK · {seconds} s","CONFERMA · {seconds} s","PRÊT ? · {seconds} s","ПРОВЕРКА ГОТОВНОСТИ · {seconds} с","HAZIRLIK KONTROLÜ · {seconds} sn"],
 "{ready}/4 ready": ["{ready}/4 bereit","{ready}/4 listos","{ready}/4 gereed","{ready}/4 pronti","{ready}/4 prêts","Готовы: {ready}/4","{ready}/4 hazır"],
 "YOU": ["DU","TÚ","JIJ","TU","VOUS","ВЫ","SEN"],
 "LIVE EXPEDITION · NODE {current}/{total}": ["LIVE-EXPEDITION · KNOTEN {current}/{total}","EXPEDICIÓN EN VIVO · NODO {current}/{total}","LIVE EXPEDITIE · KNOOP {current}/{total}","SPEDIZIONE LIVE · NODO {current}/{total}","EXPÉDITION LIVE · NŒUD {current}/{total}","ЖИВАЯ ЭКСПЕДИЦИЯ · УЗЕЛ {current}/{total}","CANLI SEFER · AŞAMA {current}/{total}"],
 "CHOOSE NEXT ROUTE · {seconds}s": ["NÄCHSTE ROUTE WÄHLEN · {seconds} s","ELIGE LA SIGUIENTE RUTA · {seconds} s","KIES VOLGENDE ROUTE · {seconds} s","SCEGLI IL PROSSIMO PERCORSO · {seconds} s","CHOISIR LA SUITE · {seconds} s","ВЫБЕРИТЕ МАРШРУТ · {seconds} с","SONRAKİ ROTAYI SEÇ · {seconds} sn"],
 "{risk} risk": ["Risiko: {risk}","Riesgo: {risk}","Risico: {risk}","Rischio: {risk}","Risque : {risk}","Риск: {risk}","Risk: {risk}"],
 "Low": ["Niedrig","Bajo","Laag","Basso","Faible","Низкий","Düşük"],
 "Medium": ["Mittel","Medio","Gemiddeld","Medio","Moyen","Средний","Orta"],
 "High": ["Hoch","Alto","Hoog","Alto","Élevé","Высокий","Yüksek"],
 "If all four players choose the same route it resolves immediately. Otherwise the most votes wins when the timer ends.": ["Stimmen alle vier für dieselbe Route, beginnt sie sofort. Sonst gewinnt bei Zeitablauf die Mehrheit.","Si los cuatro eligen la misma ruta, se decide al instante. Si no, gana la más votada al terminar el tiempo.","Bij vier gelijke stemmen wordt de route meteen gekozen. Anders wint de route met de meeste stemmen na de timer.","Se tutti e quattro votano lo stesso percorso, si procede subito. Altrimenti vince il più votato allo scadere.","Si les quatre joueurs choisissent la même voie, elle est validée aussitôt. Sinon, la majorité l'emporte à la fin.","Если все четверо выберут один маршрут, голосование завершится сразу. Иначе победит большинство после таймера.","Dört oyuncu da aynı rotayı seçerse sonuç hemen belirlenir. Aksi halde süre bitince en çok oy alan kazanır."],
 "Progress is saved between rooms.": ["Fortschritt wird zwischen Räumen gespeichert.","El progreso se guarda entre salas.","Voortgang wordt tussen kamers opgeslagen.","I progressi vengono salvati tra le stanze.","La progression est sauvegardée entre les salles.","Прогресс сохраняется между комнатами.","İlerleme odalar arasında kaydedilir."],
 "1 Tank · 2 Damage · 1 Support": ["1 Tank · 2 Schaden · 1 Unterstützung","1 tanque · 2 daño · 1 apoyo","1 tank · 2 schade · 1 steun","1 tank · 2 danni · 1 supporto","1 tank · 2 dégâts · 1 soutien","1 танк · 2 бойца · 1 поддержка","1 tank · 2 hasar · 1 destek"],
 "Route option {name}, {risk}, {votes} votes": ["Route {name}, {risk}, {votes} Stimmen","Ruta {name}, {risk}, {votes} votos","Route {name}, {risk}, {votes} stemmen","Percorso {name}, {risk}, {votes} voti","Voie {name}, {risk}, {votes} votes","Маршрут {name}, {risk}, голосов: {votes}","Rota {name}, {risk}, {votes} oy"],
} as const satisfies Record<string,readonly [string,string,string,string,string,string,string]>;
export type LiveDungeonUiKey=keyof typeof liveDungeonUiRows;
const index:Partial<Record<Language,number>>={de:0,es:1,nl:2,it:3,fr:4,ru:5,tr:6};
export function liveDungeonUiText(language:Language,key:LiveDungeonUiKey,params:TranslationParams={}):string{
 const i=index[language];
 return interpolateTranslation(i===undefined?key:liveDungeonUiRows[key][i],params);
}
export function liveDungeonRoleText(language:Language,role:DungeonRole):string{
 return dungeonCombatUiText(language,role==='tank'?'TANK':role==='support'?'SUPPORT':'DAMAGE');
}
export function liveDungeonRiskText(language:Language,risk:DungeonRouteOptionV20['risk']):string{
 return liveDungeonUiText(language,risk);
}
export function useLiveDungeonUiText(){
 const language=useGameLanguage();
 return useMemo(()=>(key:LiveDungeonUiKey,params?:TranslationParams)=>liveDungeonUiText(language,key,params),[language]);
}
