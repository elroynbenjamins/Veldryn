import type {Language} from './languages';

/** Compact Dungeon 1.0.11 UI microcopy, including accessibility hints.
 * Keep the eight supported languages complete before publishing the feature. */
type Key='bossChoice'|'bossFinish'|'bossFinal'|'bossHint'|'weeklyExpand'|'weeklyCollapse';
const rows:Record<Language,Record<Key,string>>={
 en:{bossChoice:'Boss option every 7 rooms',bossFinish:'Fight boss · finish run',bossFinal:'Fight final boss',bossHint:'Defeating this boss ends the run.',weeklyExpand:'Show weekly challenge details',weeklyCollapse:'Hide weekly challenge details'},
 de:{bossChoice:'Bosswahl alle 7 Räume',bossFinish:'Boss bekämpfen · Lauf beenden',bossFinal:'Endboss bekämpfen',bossHint:'Ein Sieg über diesen Boss beendet den Lauf.',weeklyExpand:'Wochenaufgabe öffnen',weeklyCollapse:'Wochenaufgabe schließen'},
 es:{bossChoice:'Jefe disponible cada 7 salas',bossFinish:'Luchar contra el jefe · terminar',bossFinal:'Luchar contra el jefe final',bossHint:'Vencer a este jefe termina la expedición.',weeklyExpand:'Ver detalles del reto semanal',weeklyCollapse:'Ocultar detalles del reto semanal'},
 nl:{bossChoice:'Baaskeuze elke 7 kamers',bossFinish:'Vecht tegen baas · beëindig run',bossFinal:'Vecht tegen eindbaas',bossHint:'Als je deze baas verslaat, eindigt de run.',weeklyExpand:'Details weekuitdaging tonen',weeklyCollapse:'Details weekuitdaging verbergen'},
 it:{bossChoice:'Boss ogni 7 stanze',bossFinish:'Affronta boss · termina spedizione',bossFinal:'Affronta il boss finale',bossHint:'Sconfiggere questo boss termina la spedizione.',weeklyExpand:'Mostra dettagli sfida settimanale',weeklyCollapse:'Nascondi dettagli sfida settimanale'},
 fr:{bossChoice:'Boss proposé toutes les 7 salles',bossFinish:'Affronter le boss · terminer',bossFinal:'Affronter le boss final',bossHint:'Vaincre ce boss termine cette expédition.',weeklyExpand:'Afficher les détails du défi hebdomadaire',weeklyCollapse:'Masquer les détails du défi hebdomadaire'},
 ru:{bossChoice:'Выбор босса каждые 7 комнат',bossFinish:'Сразиться с боссом · завершить поход',bossFinal:'Сразиться с финальным боссом',bossHint:'Победа над этим боссом завершает поход.',weeklyExpand:'Показать детали недельного задания',weeklyCollapse:'Скрыть детали недельного задания'},
 tr:{bossChoice:'Her 7 odada bir boss seçimi',bossFinish:'Boss ile savaş · koşuyu bitir',bossFinal:'Son boss ile savaş',bossHint:'Bu bossu yenmek koşuyu bitirir.',weeklyExpand:'Haftalık görevin ayrıntılarını göster',weeklyCollapse:'Haftalık görevin ayrıntılarını gizle'},
};
export function dungeonUxText(language:Language,key:Key):string{
 return (rows[language]??rows.en)[key];
}
