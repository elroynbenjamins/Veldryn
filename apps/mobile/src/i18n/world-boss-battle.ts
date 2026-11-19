import type {Language} from './languages';
import {SUPPORTED_LANGUAGES} from './languages';
import {interpolateTranslation,type TranslationParams} from './translator';

/** World Boss fight-screen copy. Columns DE/ES/NL/IT/FR/RU/TR; English is the key.
 * Boss and region names are proper nouns and are not translated here. */
export const worldBossBattleRows={
 "WORLD HP":["WELT-LP","VIDA MUNDIAL","WERELD-HP","SALUTE MONDIALE","PV MONDIAUX","ЗДОРОВЬЕ МИРА","DÜNYA CANI"],
 "YOUR PARTY":["DEINE GRUPPE","TU GRUPO","JOUW GROEP","IL TUO GRUPPO","VOTRE GROUPE","ВАШ ОТРЯД","GRUBUN"],
 "Armored":["Gepanzert","Acorazado","Gepantserd","Corazzato","Cuirassé","В броне","Zırhlı"],
 "Exposed":["Entblößt","Expuesto","Blootgesteld","Esposto","Exposé","Уязвим","Savunmasız"],
 "Enraged":["Rasend","Enfurecido","Woedend","Infuriato","Enragé","В ярости","Öfkeli"],
 "Tonic active":["Tonikum aktiv","Tónico activo","Tonicum actief","Tonico attivo","Tonique actif","Тоник действует","Tonik etkin"],
 "Incoming: {ability}":["Gleich: {ability}","Se acerca: {ability}","Komt eraan: {ability}","In arrivo: {ability}","Imminent : {ability}","Готовится: {ability}","Geliyor: {ability}"],
 "Guarded!":["Abgeschirmt!","¡Protegido!","Afgeschermd!","Protetto!","Protégé !","Прикрыт!","Korundu!"],
 "Cleansed!":["Gereinigt!","¡Purificado!","Gereinigd!","Purificato!","Purifié !","Очищен!","Arındı!"],
 "Interrupted!":["Unterbrochen!","¡Interrumpido!","Onderbroken!","Interrotto!","Interrompu !","Прервано!","Kesildi!"],
 "Guard broken!":["Schutz gebrochen!","¡Guardia rota!","Verdediging gebroken!","Guardia spezzata!","Garde brisée !","Защита сломлена!","Savunma kırıldı!"],
 "Weak point exposed!":["Schwachstelle freigelegt!","¡Punto débil expuesto!","Zwakke plek blootgelegd!","Punto debole esposto!","Point faible exposé !","Слабое место открыто!","Zayıf nokta açığa çıktı!"],
 "Special cancelled":["Spezialangriff abgebrochen","Ataque especial cancelado","Speciale aanval geannuleerd","Attacco speciale annullato","Attaque spéciale annulée","Особая атака отменена","Özel saldırı iptal edildi"],
 "{name} has fallen":["{name} ist gefallen","{name} ha caído","{name} is gevallen","{name} è caduto","{name} est tombé","{name} пал","{name} düştü"],
 "World HP below {percent}%":["Welt-LP unter {percent} %","Vida mundial por debajo del {percent} %","Wereld-HP onder {percent}%","Salute mondiale sotto il {percent}%","PV mondiaux sous {percent} %","Здоровье мира ниже {percent}%","Dünya canı %{percent} altında"],
 "Final blow!":["Letzter Schlag!","¡Golpe final!","Genadeslag!","Colpo finale!","Coup de grâce !","Последний удар!","Son vuruş!"],
 "Residual Echo: no world HP damage":["Nachhall: kein Schaden an Welt-LP","Eco residual: sin daño a la vida mundial","Restecho: geen schade aan wereld-HP","Eco residuo: nessun danno alla salute mondiale","Écho résiduel : aucun dégât aux PV mondiaux","Остаточное эхо: урона здоровью мира нет","Kalıntı Yankı: dünya canına hasar yok"],
 "BATTLE RESULTS":["KAMPFERGEBNIS","RESULTADO DEL COMBATE","GEVECHTSRESULTAAT","RISULTATO DELLA BATTAGLIA","RÉSULTAT DU COMBAT","ИТОГИ БИТВЫ","SAVAŞ SONUCU"],
 "World HP credit":["Welt-LP-Gutschrift","Vida mundial acreditada","Toegekende wereld-HP","Salute mondiale accreditata","PV mondiaux crédités","Засчитано здоровья мира","Dünya canı katkısı"],
 "Party damage":["Gruppenschaden","Daño del grupo","Groepsschade","Danni del gruppo","Dégâts du groupe","Урон отряда","Grup hasarı"],
 "PARTY HONORS":["GRUPPENEHREN","HONORES DEL GRUPO","GROEPSEERBEWIJZEN","ONORI DEL GRUPPO","HONNEURS DU GROUPE","НАГРАДЫ ОТРЯДА","GRUP ONURLARI"],
 "Vanguard":["Vorhut","Vanguardia","Voorhoede","Avanguardia","Avant-garde","Авангард","Öncü"],
 "Bulwark":["Bollwerk","Baluarte","Bolwerk","Baluardo","Rempart","Оплот","Siper"],
 "Lifebinder":["Lebensbinder","Atavidas","Levensbinder","Legavita","Lieur de vie","Хранитель жизни","Can Bağlayıcı"],
 "Spellbreaker":["Bannbrecher","Rompehechizos","Spreukbreker","Spezzaincanti","Brise-sort","Разрушитель чар","Büyü Kıran"],
 "Purifier":["Läuterer","Purificador","Zuiveraar","Purificatore","Purificateur","Очиститель","Arındırıcı"],
 "Continue":["Weiter","Continuar","Doorgaan","Continua","Continuer","Продолжить","Devam"],
} as const satisfies Record<string,readonly [string,string,string,string,string,string,string]>;
export type WorldBossBattleKey=keyof typeof worldBossBattleRows;

export function worldBossBattleText(language:Language,key:WorldBossBattleKey,params:TranslationParams={}):string{
 const index=SUPPORTED_LANGUAGES.indexOf(language)-1;
 const row=worldBossBattleRows[key] as readonly string[];
 return interpolateTranslation(index>=0&&row[index]?row[index]:key,params);
}

/** Authored ability IDs (e.g. ROOT_SLAM) as readable names. These are boss move
 * names, kept as authored English until the boss content catalog is localized. */
export function worldBossAbilityName(abilityId:string):string{
 return abilityId.split('_').filter(Boolean).map(part=>part[0]+part.slice(1).toLowerCase()).join(' ');
}
