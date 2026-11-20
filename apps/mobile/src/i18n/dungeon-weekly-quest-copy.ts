import type {Language} from './languages';
import type {DungeonWeeklyQuestId} from '../core/dungeon-weekly-quests';

const QUEST_COPY:Record<DungeonWeeklyQuestId,Record<Language,readonly [string,string]>>={
 clears:{
  en:['Dungeon Duty','Defeat a dungeon boss this week.'],
  de:['Dungeonauftrag','Besiege diese Woche einen Dungeonboss.'],
  es:['Deber de mazmorra','Derrota a un jefe de mazmorra esta semana.'],
  nl:['Kerkertaak','Versla deze week een kerkerbaas.'],
  it:['Incarico nel dungeon','Sconfiggi un boss del dungeon questa settimana.'],
  fr:['Mission de donjon','Vainquez un boss de donjon cette semaine.'],
  ru:['Задание подземелья','Победи босса подземелья на этой неделе.'],
  tr:['Zindan Görevi','Bu hafta bir zindan patronunu yen.'],
 },
 deep15:{
  en:['Deep Delver','Reach room 15 in a single dungeon run this week.'],
  de:['Tiefenforscher','Erreiche diese Woche Raum 15 in einem Dungeonlauf.'],
  es:['Explorador de las profundidades','Alcanza la sala 15 en una sola incursión esta semana.'],
  nl:['Diepteverkenner','Bereik deze week kamer 15 in één kerkerpoging.'],
  it:['Esploratore degli abissi','Raggiungi la stanza 15 in una singola spedizione questa settimana.'],
  fr:['Explorateur des profondeurs','Atteignez la salle 15 lors d’une expédition cette semaine.'],
  ru:['Исследователь глубин','Достигни комнаты 15 за один поход на этой неделе.'],
  tr:['Derinlik Kâşifi','Bu hafta tek zindan koşusunda 15. odaya ulaş.'],
 },
 elite3:{
  en:['Elite Hunter','Defeat 3 elite encounters in a single dungeon run this week.'],
  de:['Elitejäger','Besiege diese Woche 3 Elitegegner in einem Dungeonlauf.'],
  es:['Cazador de élites','Derrota a 3 élites en una sola incursión esta semana.'],
  nl:['Elitenjager','Versla deze week 3 elitegevechten in één kerkerpoging.'],
  it:['Cacciatore di élite','Sconfiggi 3 élite in una sola spedizione questa settimana.'],
  fr:['Chasseur d’élites','Battez 3 élites en une seule expédition cette semaine.'],
  ru:['Охотник на элиту','Победи 3 элитных противников за один поход на этой неделе.'],
  tr:['Seçkin Avcısı','Bu hafta tek zindan koşusunda 3 seçkin düşmanı yen.'],
 },
};
export function dungeonWeeklyQuestCopy(id:DungeonWeeklyQuestId,language:Language):{name:string;description:string}{
 const pair=QUEST_COPY[id]?.[language]??QUEST_COPY[id]?.en;
 return {name:pair?.[0]??id,description:pair?.[1]??''};
}
