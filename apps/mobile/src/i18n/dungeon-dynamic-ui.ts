import {useMemo} from 'react';
import type {Language} from './languages';
import {useGameLanguage} from './GameLanguageProvider';
import {interpolateTranslation,type TranslationParams} from './translator';
import type {CoopCombatReplayCueView} from '../core/coop-presentation';
import {playbackCueLabel} from '../core/dungeon-combat-playback';
import {dungeonEnemyAbilityDisplayName,dungeonEnemyDisplayName} from '../core/dungeon-enemy-display';
import {seasonalBossDisplayName} from './seasonal-boss-copy';

/** User-visible wording for server-authoritative Dungeon events.
 * Never translate IDs, usernames, amounts, route titles or unknown server ability names.
 */
export const dungeonDynamicUiRows={
 "{actor} heals {target}": ["{actor} heilt {target}","{actor} cura a {target}","{actor} geneest {target}","{actor} cura {target}","{actor} soigne {target}","{actor} лечит {target}","{actor}, {target} hedefini iyileştiriyor"],
 "{actor} shields {target}": ["{actor} schützt {target}","{actor} protege a {target}","{actor} beschermt {target}","{actor} protegge {target}","{actor} protège {target}","{actor} защищает {target} щитом","{actor}, {target} için kalkan sağlıyor"],
 "{actor} heals {target} with {ability}": ["{actor} heilt {target} mit {ability}","{actor} cura a {target} con {ability}","{actor} geneest {target} met {ability}","{actor} cura {target} con {ability}","{actor} soigne {target} avec {ability}","{actor} лечит {target} с помощью {ability}","{actor}, {ability} ile {target} hedefini iyileştiriyor"],
 "{actor} shields {target} with {ability}": ["{actor} schützt {target} mit {ability}","{actor} protege a {target} con {ability}","{actor} beschermt {target} met {ability}","{actor} protegge {target} con {ability}","{actor} protège {target} avec {ability}","{actor} защищает {target} с помощью {ability}","{actor}, {ability} ile {target} için kalkan sağlıyor"],
 "{actor} misses {target}": ["{actor} verfehlt {target}","{actor} falla contra {target}","{actor} mist {target}","{actor} manca {target}","{actor} manque {target}","{actor} промахивается по {target}","{actor}, {target} hedefini ıskaladı"],
 "{actor} attacks {target}": ["{actor} greift {target} an","{actor} ataca a {target}","{actor} valt {target} aan","{actor} attacca {target}","{actor} attaque {target}","{actor} атакует {target}","{actor}, {target} hedefine saldırıyor"],
 "{actor} uses {ability}": ["{actor} setzt {ability} ein","{actor} usa {ability}","{actor} gebruikt {ability}","{actor} usa {ability}","{actor} utilise {ability}","{actor} использует {ability}","{actor}, {ability} kullanıyor"],
 "{actor} uses {ability} on {target}": ["{actor} setzt {ability} gegen {target} ein","{actor} usa {ability} contra {target}","{actor} gebruikt {ability} op {target}","{actor} usa {ability} su {target}","{actor} utilise {ability} sur {target}","{actor} использует {ability} против {target}","{actor}, {target} üzerinde {ability} kullanıyor"],
 "{actor} enters {ability}": ["{actor} wechselt zu {ability}","{actor} entra en {ability}","{actor} gaat naar {ability}","{actor} entra in {ability}","{actor} passe à {ability}","{actor} переходит в фазу {ability}","{actor}, {ability} aşamasına geçiyor"],
 "{actor} changes phase": ["{actor} wechselt die Phase","{actor} cambia de fase","{actor} wisselt van fase","{actor} cambia fase","{actor} change de phase","{actor} меняет фазу","{actor} aşama değiştiriyor"],
 "{actor} begins {ability}": ["{actor} beginnt {ability}","{actor} comienza {ability}","{actor} begint met {ability}","{actor} inizia {ability}","{actor} commence {ability}","{actor} начинает {ability}","{actor}, {ability} başlatıyor"],
 "{actor} begins a cast": ["{actor} beginnt zu zaubern","{actor} empieza a lanzar un hechizo","{actor} begint te casten","{actor} inizia un incantesimo","{actor} commence à incanter","{actor} начинает чтение заклинания","{actor} büyü kullanmaya başlıyor"],
 "{actor} interrupts with {ability}": ["{actor} unterbricht mit {ability}","{actor} interrumpe con {ability}","{actor} onderbreekt met {ability}","{actor} interrompe con {ability}","{actor} interrompt avec {ability}","{actor} прерывает с помощью {ability}","{actor}, {ability} ile kesintiye uğratıyor"],
 "{actor} interrupts the cast": ["{actor} unterbricht den Zauber","{actor} interrumpe el lanzamiento","{actor} onderbreekt de spreuk","{actor} interrompe l'incantesimo","{actor} interrompt l'incantation","{actor} прерывает заклинание","{actor} büyüyü kesintiye uğratıyor"],
 "{actor} assist": ["{actor} hilft mit","Asistencia de {actor}","Hulp van {actor}","Supporto di {actor}","Assistance de {actor}","Помощь от {actor}","{actor} yardım ediyor"],
 "{target} is downed": ["{target} ist kampfunfähig","{target} ha caído","{target} is uitgeschakeld","{target} è a terra","{target} est à terre","{target} выведен из строя","{target} yere düştü"],
 "Encounter cleared": ["Begegnung abgeschlossen","Encuentro superado","Gevecht voltooid","Scontro superato","Rencontre terminée","Бой завершён","Karşılaşma tamamlandı"],
 "Party defeated": ["Gruppe besiegt","Grupo derrotado","Groep verslagen","Squadra sconfitta","Équipe vaincue","Отряд побеждён","Grup yenildi"],
 "Encounter timed out": ["Zeitlimit des Kampfes erreicht","Tiempo del encuentro agotado","Gevechtstijd verstreken","Tempo dello scontro scaduto","Temps de combat écoulé","Время боя истекло","Karşılaşma süresi doldu"],
 "CRIT": ["KRIT","CRÍTICO","KRIT","CRIT","CRITIQUE","КРИТ","KRİTİK"],
 "MISS": ["VERFEHLT","FALLO","MIS","MANCATO","MANQUÉ","ПРОМАХ","ISKA"],
 "{amount} absorbed": ["{amount} absorbiert","{amount} absorbido","{amount} geabsorbeerd","{amount} assorbiti","{amount} absorbés","Поглощено: {amount}","{amount} emildi"],
 "GEM PROC": ["EDELSTEIN-EFFEKT","EFECTO DE GEMA","EDELSTEENEFFECT","EFFETTO GEMMA","EFFET DE GEMME","ЭФФЕКТ КАМНЯ","TAŞ ETKİSİ"],
 "Support": ["Unterstützung","Apoyo","Ondersteuning","Supporto","Soutien","Поддержка","Destek"],
 "ally": ["Verbündeten","aliado","bondgenoot","alleato","allié","союзника","müttefik"],
 "Combatant": ["Kämpfer","Combatiente","Vechter","Combattente","Combattant","Боец","Savaşçı"],
 "target": ["Ziel","objetivo","doelwit","bersaglio","cible","цели","hedef"],
 "Boss": ["Boss","Jefe","Baas","Boss","Boss","Босс","Boss"],
 "Party": ["Gruppe","Grupo","Groep","Squadra","Équipe","Отряд","Grup"],
 "Companion": ["Begleiter","Compañero","Metgezel","Compagno","Compagnon","Спутник","Yoldaş"],
 "ACTION": ["AKTION","ACCIÓN","ACTIE","AZIONE","ACTION","ДЕЙСТВИЕ","EYLEM"],
 "PHASE": ["PHASE","FASE","FASE","FASE","PHASE","ФАЗА","AŞAMA"],
 "CAST": ["ZAUBER","CONJURO","SPREUK","INCANTESIMO","INCANTATION","ЗАКЛИНАНИЕ","BÜYÜ"],
 "INTERRUPT": ["UNTERBRECHUNG","INTERRUPCIÓN","ONDERBREKING","INTERRUZIONE","INTERRUPTION","ПРЕРЫВАНИЕ","KESİNTİ"],
 "ASSIST": ["HILFE","ASISTENCIA","HULP","SUPPORTO","ASSISTANCE","ПОМОЩЬ","YARDIM"],
 "CLASS ABILITY": ["KLASSENFÄHIGKEIT","HABILIDAD DE CLASE","KLASSEVAARDIGHEID","ABILITÀ DI CLASSE","CAPACITÉ DE CLASSE","УМЕНИЕ КЛАССА","SINIF YETENEĞİ"],
 "COMPANION SKILL": ["BEGLEITERFÄHIGKEIT","HABILIDAD DE COMPAÑERO","METGEZELVAARDIGHEID","ABILITÀ COMPAGNO","CAPACITÉ DU COMPAGNON","УМЕНИЕ СПУТНИКА","YOLDAŞ YETENEĞİ"],
 "SHIELD {amount}": ["SCHILD {amount}","ESCUDO {amount}","SCHILD {amount}","SCUDO {amount}","BOUCLIER {amount}","ЩИТ {amount}","KALKAN {amount}"],
 "DOWN": ["AUSGEFALLEN","CAÍDO","UITGESCHAKELD","A TERRA","À TERRE","ПОВЕРЖЕН","DÜŞTÜ"],
 "VICTORY": ["SIEG","VICTORIA","OVERWINNING","VITTORIA","VICTOIRE","ПОБЕДА","ZAFER"],
 "WIPE": ["NIEDERLAGE","DERROTA","NEDERLAAG","SCONFITTA","DÉFAITE","ПОРАЖЕНИЕ","YENİLGİ"],
 "TIMEOUT": ["ZEITLIMIT","TIEMPO AGOTADO","TIJDSLIMIET","TEMPO SCADUTO","TEMPS ÉCOULÉ","ВРЕМЯ ИСТЕКЛО","SÜRE DOLDU"],
 "LIVE": ["LIVE","EN VIVO","LIVE","DAL VIVO","EN DIRECT","В ПРЯМОМ ЭФИРЕ","CANLI"],
 "{count} combat events": ["{count} Kampfeignisse","{count} eventos de combate","{count} gevechtsgebeurtenissen","{count} eventi di combattimento","{count} événements de combat","Боевых событий: {count}","{count} savaş olayı"],
 "{count} recent": ["{count} letzte","{count} recientes","{count} recent","{count} recenti","{count} récents","Последних событий: {count}","{count} son olay"],
 "Route {title}: {risk}; {reward}. {extra}{action}": ["Route {title}: {risk}; {reward}. {extra}{action}","Ruta {title}: {risk}; {reward}. {extra}{action}","Route {title}: {risk}; {reward}. {extra}{action}","Percorso {title}: {risk}; {reward}. {extra}{action}","Voie {title} : {risk} ; {reward}. {extra}{action}","Маршрут {title}: {risk}; {reward}. {extra}{action}","Rota {title}: {risk}; {reward}. {extra}{action}"],
 "{votes} of {total} votes. ": ["{votes} von {total} Stimmen. ","{votes} de {total} votos. ","{votes} van {total} stemmen. ","{votes} voti su {total}. ","{votes} votes sur {total}. ","Голосов: {votes} из {total}. ","{total} oydan {votes} oy. "],
 "Your vote. ": ["Deine Stimme. ","Tu voto. ","Jouw stem. ","Il tuo voto. ","Votre vote. ","Ваш голос. ","Senin oyun. "],
 "Your vote": ["Deine Stimme","Tu voto","Jouw stem","Il tuo voto","Votre vote","Ваш голос","Senin oyun"],
 "Choose room": ["Raum wählen","Elegir sala","Kies kamer","Scegli stanza","Choisir la salle","Выбрать комнату","Oda seç"],
 "Vote": ["Abstimmen","Votar","Stemmen","Vota","Voter","Голосовать","Oy ver"],
 "Unavailable": ["Nicht verfügbar","No disponible","Niet beschikbaar","Non disponibile","Indisponible","Недоступно","Kullanılamıyor"],
 "Awaiting choice": ["Warte auf Auswahl","Esperando elección","Wachten op keuze","In attesa di scelta","En attente de choix","Ожидание выбора","Seçim bekleniyor"],
 "{votes}/4 votes": ["{votes}/4 Stimmen","{votes}/4 votos","{votes}/4 stemmen","{votes}/4 voti","{votes}/4 votes","{votes}/4 голосов","{votes}/4 oy"],
 "Choose a room": ["Raum wählen","Elegir una sala","Kies een kamer","Scegli una stanza","Choisir une salle","Выбрать комнату","Oda seç"],
 "Vote on a route": ["Route wählen","Votar una ruta","Stem op een route","Vota il percorso","Voter pour une voie","Голосовать за маршрут","Bir rotaya oy ver"],
 "Resolving room": ["Raum wird abgewickelt","Resolviendo sala","Kamer wordt afgerond","Risoluzione stanza","Résolution de la salle","Завершение комнаты","Oda çözülüyor"],
 "Expedition completed": ["Expedition abgeschlossen","Expedición completada","Expeditie voltooid","Spedizione completata","Expédition terminée","Экспедиция завершена","Sefer tamamlandı"],
 "Expedition failed": ["Expedition gescheitert","Expedición fallida","Expeditie mislukt","Spedizione fallita","Expédition échouée","Экспедиция провалена","Sefer başarısız"],
 "an ability": ["eine Fähigkeit","una habilidad","een vaardigheid","un'abilità","une capacité","способность","bir yetenek"],
 "Party member": ["Gruppenmitglied","Miembro del grupo","Groepslid","Membro del gruppo","Membre du groupe","Участник отряда","Grup üyesi"],
 "DMG {amount}": ["SCH {amount}","DAÑO {amount}","SCH {amount}","DAN {amount}","DÉG {amount}","УРОН {amount}","HSR {amount}"],
 "HEAL {amount}": ["HEIL {amount}","CURA {amount}","GEN {amount}","CURE {amount}","SOIN {amount}","ЛЕЧ {amount}","İYİL {amount}"],
 "TAKEN {amount}": ["ERL {amount}","REC {amount}","INC {amount}","SUB {amount}","SUBI {amount}","ПОЛ {amount}","ALIN {amount}"],
 "INT {count}": ["UNT {count}","INT {count}","OND {count}","INT {count}","INT {count}","ПРЕР {count}","KES {count}"],
 "TANK": ["TANK","TANQ","TANK","TANK","TANK","ТАНК","TANK"],
 "SUP": ["SUP","APO","STEUN","SUP","SOUT","ПОД","DST"],
 "DPS": ["DPS","DPS","DPS","DPS","DPS","DPS","DPS"],
 "Boss ability": ["Bossfähigkeit","Habilidad del jefe","Baasvaardigheid","Abilità del boss","Capacité du boss","Умение босса","Boss yeteneği"],
 "A disconnected party member is being piloted with basic attacks and safe defensive abilities while reconnect is available.": ["Ein getrenntes Gruppenmitglied kämpft vorübergehend mit einfachen Angriffen und sicheren Abwehrfähigkeiten, bis es sich wieder verbindet.","Si un miembro del grupo se desconecta, la IA usa ataques básicos y defensas seguras hasta que vuelva a conectarse.","Een groepslid zonder verbinding gebruikt tijdelijk basisaanvallen en veilige verdedigingsvaardigheden totdat het weer verbinding heeft.","Un membro del gruppo disconnesso usa temporaneamente attacchi base e abilità difensive sicure finché non si riconnette.","Un membre du groupe déconnecté utilise temporairement des attaques de base et des défenses sûres en attendant de se reconnecter.","Пока участник группы отключён, ИИ использует обычные атаки и безопасные защитные умения до его возвращения.","Bağlantısı kesilen grup üyesi geri dönene kadar yapay zekâ temel saldırılar ve güvenli savunma yetenekleri kullanır."],
} as const satisfies Record<string,readonly [string,string,string,string,string,string,string]>;
export type DungeonDynamicUiKey=keyof typeof dungeonDynamicUiRows;
const indexes:Partial<Record<Language,number>>={de:0,es:1,nl:2,it:3,fr:4,ru:5,tr:6};
export function dungeonDynamicUiText(language:Language,key:DungeonDynamicUiKey,params:TranslationParams={}):string{
 const i=indexes[language];return interpolateTranslation(i===undefined?key:dungeonDynamicUiRows[key][i],params);
}
export function useDungeonDynamicUiText(){
 const language=useGameLanguage();
 return useMemo(()=>(key:DungeonDynamicUiKey,params?:TranslationParams)=>dungeonDynamicUiText(language,key,params),[language]);
}
const render=(language:Language,key:DungeonDynamicUiKey,params:TranslationParams={})=>dungeonDynamicUiText(language,key,params);
/** The English live combat label remains byte-for-byte identical to the original formatter.
 * For other languages, only fixed verbs/suffixes change. All cue state and data remain untouched.
 */
export function localizedDungeonPlaybackCue(language:Language,cue:CoopCombatReplayCueView):string{
 if(language==='en')return playbackCueLabel(cue);
 const actor=cue.actorName?dungeonEnemyDisplayName(cue.actorName.trim()):undefined;
 const target=cue.targetName?dungeonEnemyDisplayName(cue.targetName.trim()):undefined;
 const ability=cue.abilityName?seasonalBossDisplayName(language,dungeonEnemyAbilityDisplayName(cue.abilityName.trim())):undefined;
 const amount=cue.amount===undefined?'':' · '+Math.round(cue.amount);
 const suffix=cue.outcome==='critical'?' · '+render(language,'CRIT'):'';
 const misses=cue.outcome==='miss'?' · '+render(language,'MISS'):'';
 const absorbed=cue.absorbed&&cue.absorbed>0?' · '+render(language,'{amount} absorbed',{amount:Math.round(cue.absorbed)}):'';
 const gem=cue.gemProc?' · '+render(language,'GEM PROC'):'';
 const extras=suffix+misses+absorbed+gem;
 const named=(key:DungeonDynamicUiKey,params:TranslationParams)=>render(language,key,params);
 switch(cue.type){
  case 'action':
   if(cue.actionKind==='heal')return named(ability&&ability!=='Basic Attack'?'{actor} heals {target} with {ability}':'{actor} heals {target}',{actor:actor??render(language,'Support'),target:target??render(language,'ally'),ability:ability??''})+amount+extras;
   if(cue.actionKind==='shield')return named(ability&&ability!=='Basic Attack'?'{actor} shields {target} with {ability}':'{actor} shields {target}',{actor:actor??render(language,'Support'),target:target??render(language,'ally'),ability:ability??''})+amount+extras;
   if(cue.outcome==='miss')return named('{actor} misses {target}',{actor:actor??render(language,'Combatant'),target:target??render(language,'target')})+extras;
   if(dungeonEnemyAbilityDisplayName(cue.abilityName?.trim()??'')==='Basic Attack')return named('{actor} attacks {target}',{actor:actor??render(language,'Combatant'),target:target??render(language,'target')})+amount+extras;
   return named(target?'{actor} uses {ability} on {target}':'{actor} uses {ability}',{actor:actor??render(language,'Combatant'),ability:ability??render(language,'an ability'),...(target?{target}:{})})+amount+extras;
  case 'phase':return ability?named('{actor} enters {ability}',{actor:actor??render(language,'Boss'),ability}):named('{actor} changes phase',{actor:actor??render(language,'Boss')});
  case 'cast':return ability?named('{actor} begins {ability}',{actor:actor??render(language,'Boss'),ability}):named('{actor} begins a cast',{actor:actor??render(language,'Boss')});
  case 'interrupt':return ability?named('{actor} interrupts with {ability}',{actor:actor??render(language,'Party'),ability}):named('{actor} interrupts the cast',{actor:actor??render(language,'Party')});
  case 'assist':return ability??named('{actor} assist',{actor:actor??render(language,'Companion')});
  case 'down':return named('{target} is downed',{target:target??actor??render(language,'Party member')});
  case 'victory':return render(language,'Encounter cleared');
  case 'wipe':return render(language,'Party defeated');
  case 'timeout':return render(language,'Encounter timed out');
  default:return playbackCueLabel(cue);
 }
}
export function localizedDungeonCueType(language:Language,type:CoopCombatReplayCueView['type']|undefined):string{
 const keys={action:'ACTION',phase:'PHASE',cast:'CAST',interrupt:'INTERRUPT',assist:'ASSIST',down:'DOWN',victory:'VICTORY',wipe:'WIPE',timeout:'TIMEOUT'} as const;
 return type?render(language,keys[type]):render(language,'LIVE');
}
