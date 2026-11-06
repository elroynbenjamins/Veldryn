import type {Language} from './languages';
import {SUPPORTED_LANGUAGES} from './languages';
import type {GameState} from '../core/types';
import type {QuestDef} from '../content/quests';
import type {WeeklyOrder} from '../core/weekly-orders-v41';
import {QUESTS} from '../content/quests';
import {questLockHint,questDestination} from '../core/quest-journal';
import {localizedQuestStoryText} from './quest-story-copy';
import {weeklyOrderLockReason} from '../core/quest-availability';
import {MONSTERS} from '../content/monsters';
import {RECIPES,GATHERING} from '../content/skills';
import {WORLD_ZONES} from '../content/world-map';
import {EXPLORATION_ROUTES} from '../content/exploration';
import {itemDef} from '../content/items';
import {interpolateTranslation,type TranslationParams} from './translator';

/** Presentation-only Quest and Weekly Contract unlock/destination guidance.
 * Server and gameplay rules remain authoritative. DE/ES/NL/IT/FR/RU/TR. */
type SevenLanguages=readonly [string,string,string,string,string,string,string];
export const questUnlockCopyRows={
  "Reach character level {level} through Combat to unlock this objective.": [
    "Erreiche Charakterstufe {level} im Kampf, um dieses Ziel freizuschalten.",
    "Alcanza el nivel de personaje {level} combatiendo para desbloquear este objetivo.",
    "Bereik personageniveau {level} via gevechten om dit doel vrij te spelen.",
    "Raggiungi il livello personaggio {level} in combattimento per sbloccare questo obiettivo.",
    "Atteignez le niveau {level} en combat pour débloquer cet objectif.",
    "Достигните {level}-го уровня в боях, чтобы открыть эту цель.",
    "Bu hedefi açmak için savaşarak {level}. karakter seviyesine ulaş."
  ],
  "Claim “{chapter}” to unlock this objective. Progress is not tracked while locked.": [
    "Hole die Belohnung für „{chapter}“ ab, um dieses Ziel freizuschalten. Solange es gesperrt ist, zählt kein Fortschritt.",
    "Reclama «{chapter}» para desbloquear este objetivo. El progreso no cuenta mientras esté bloqueado.",
    "Claim ‘{chapter}’ om dit doel te ontgrendelen. Zolang het vergrendeld is, telt voortgang niet.",
    "Riscatta «{chapter}» per sbloccare questo obiettivo. I progressi non contano finché è bloccato.",
    "Récupérez « {chapter} » pour débloquer cet objectif. La progression ne compte pas tant qu'il est verrouillé.",
    "Получите награду за «{chapter}», чтобы открыть цель. Пока она закрыта, прогресс не учитывается.",
    "Bu hedefi açmak için “{chapter}” ödülünü al. Kilitliyken ilerleme sayılmaz."
  ],
  "Continue the story to unlock this objective.": [
    "Setze die Geschichte fort, um dieses Ziel freizuschalten.",
    "Continúa la historia para desbloquear este objetivo.",
    "Ga verder met het verhaal om dit doel vrij te spelen.",
    "Continua la storia per sbloccare questo obiettivo.",
    "Continuez l'histoire pour débloquer cet objectif.",
    "Продолжайте историю, чтобы открыть эту цель.",
    "Bu hedefin kilidini açmak için hikâyeye devam et."
  ],
  "Visit {zone}": [
    "Besuche {zone}",
    "Visita {zone}",
    "Bezoek {zone}",
    "Visita {zone}",
    "Visiter {zone}",
    "Отправиться в {zone}",
    "{zone} bölgesini ziyaret et"
  ],
  "{monster} · character level {level}. Collect hunt rewards on Home to update kill objectives.": [
    "{monster} · Charakterstufe {level}. Hole Jagdbelohnungen auf der Startseite ab, damit Tötungsziele zählen.",
    "{monster} · nivel de personaje {level}. Recoge las recompensas de caza en Inicio para actualizar las bajas.",
    "{monster} · personageniveau {level}. Haal jachtbeloningen op via Home om verslagen vijanden te laten meetellen.",
    "{monster} · livello personaggio {level}. Riscatta le ricompense di caccia nella Home per aggiornare le uccisioni.",
    "{monster} · niveau de personnage {level}. Récupérez les récompenses de chasse à l'accueil pour valider les éliminations.",
    "{monster} · уровень персонажа {level}. Забирайте награды за охоту на главном экране, чтобы убийства засчитывались.",
    "{monster} · karakter seviyesi {level}. Öldürme hedefleri için Av ödüllerini Ana Ekran'dan al."
  ],
  "Travel to {zone}": [
    "Reise nach {zone}",
    "Viaja a {zone}",
    "Reis naar {zone}",
    "Viaggia verso {zone}",
    "Voyager vers {zone}",
    "Отправиться в {zone}",
    "{zone} bölgesine git"
  ],
  "Travel to {zone} first. Then open Skills → Exploration and scout {route} to discover the encounter.": [
    "Reise zuerst nach {zone}. Öffne dann Fertigkeiten → Erkundung und erkunde {route}, um die Begegnung zu entdecken.",
    "Viaja primero a {zone}. Luego abre Habilidades → Exploración y explora {route} para descubrir el encuentro.",
    "Reis eerst naar {zone}. Open dan Vaardigheden → Verkenning en verken {route} om de ontmoeting te ontdekken.",
    "Viaggia prima a {zone}. Poi apri Abilità → Esplorazione ed esplora {route} per scoprire l'incontro.",
    "Voyagez d'abord vers {zone}. Ouvrez ensuite Compétences → Exploration et explorez {route} pour découvrir la rencontre.",
    "Сначала отправьтесь в {zone}. Затем откройте Навыки → Исследование и разведайте {route}, чтобы обнаружить противника.",
    "Önce {zone} bölgesine git. Ardından Beceriler → Keşif'ten {route} rotasını araştırarak karşılaşmayı bul."
  ],
  "Open equipment": [
    "Ausrüstung öffnen",
    "Abrir equipo",
    "Uitrusting openen",
    "Apri equipaggiamento",
    "Ouvrir l'équipement",
    "Открыть снаряжение",
    "Ekipmanı aç"
  ],
  "Equip gear from Inventory. Items in Bank must be withdrawn first.": [
    "Lege Ausrüstung aus dem Inventar an. Bankgegenstände musst du zuerst abheben.",
    "Equipa objetos del Inventario. Retira antes del Banco los que tengas guardados allí.",
    "Rust voorwerpen uit je inventaris uit. Haal spullen eerst uit de bank.",
    "Equipaggia oggetti dall'inventario. Ritira prima dalla banca quelli depositati.",
    "Équipez les objets depuis l'inventaire. Retirez d'abord ceux de la banque.",
    "Надевайте снаряжение из инвентаря. Предметы из банка сначала нужно забрать.",
    "Eşyaları Envanter'den kuşan. Bankadakileri önce çekmelisin."
  ],
  "Find gathering activities": [
    "Sammelaktivitäten finden",
    "Buscar actividades de recolección",
    "Verzamelactiviteiten zoeken",
    "Trova attività di raccolta",
    "Trouver des activités de récolte",
    "Найти действия по сбору",
    "Toplama etkinliklerini bul"
  ],
  "Check Inventory": [
    "Inventar prüfen",
    "Revisar Inventario",
    "Inventaris controleren",
    "Controlla inventario",
    "Consulter l'inventaire",
    "Проверить инвентарь",
    "Envanteri kontrol et"
  ],
  "{action} · {skill} level {level}. Item objectives count carried Inventory items, not Bank storage.": [
    "{action} · {skill} Stufe {level}. Für Gegenstandsziele zählt nur das mitgeführte Inventar, nicht die Bank.",
    "{action} · {skill} nivel {level}. Los objetivos cuentan objetos del Inventario, no del Banco.",
    "{action} · {skill} niveau {level}. Voor voorwerpdoelen telt alleen je inventaris, niet de bank.",
    "{action} · {skill} livello {level}. Gli obiettivi contano gli oggetti nell'inventario, non in banca.",
    "{action} · {skill} niveau {level}. Les objectifs comptent les objets dans l'inventaire, pas ceux de la banque.",
    "{action} · {skill} ур. {level}. Учитываются предметы в инвентаре, но не в банке.",
    "{action} · {skill} seviye {level}. Eşya hedeflerinde yalnızca Envanter sayılır, Banka değil."
  ],
  "Item objectives count carried Inventory items, not Bank storage.": [
    "Für Gegenstandsziele zählt nur das mitgeführte Inventar, nicht die Bank.",
    "Los objetivos de objetos cuentan el Inventario, no el Banco.",
    "Voor voorwerpdoelen telt je inventaris, niet de bank.",
    "Gli obiettivi degli oggetti contano l'inventario, non la banca.",
    "Les objectifs d'objets comptent l'inventaire, pas la banque.",
    "Учитываются предметы в инвентаре, но не в банке.",
    "Eşya hedeflerinde Envanter sayılır, Banka değil."
  ],
  "Open skills & crafting": [
    "Fertigkeiten und Herstellung öffnen",
    "Abrir habilidades y fabricación",
    "Vaardigheden en vervaardigen openen",
    "Apri abilità e creazione",
    "Ouvrir compétences et fabrication",
    "Открыть навыки и ремесло",
    "Beceriler ve üretimi aç"
  ],
  "Gather materials and collect their rewards, or craft eligible recipes, to increase skill XP.": [
    "Sammle Materialien und hole Belohnungen ab oder stelle passende Rezepte her, um Fertigkeits-EP zu erhalten.",
    "Recolecta materiales y recoge sus recompensas, o fabrica recetas disponibles, para ganar EXP de habilidad.",
    "Verzamel materialen en claim beloningen of maak beschikbare recepten om vaardigheids-XP te verdienen.",
    "Raccogli materiali e ricompense oppure crea ricette disponibili per ottenere PE abilità.",
    "Récoltez des matériaux et leurs récompenses, ou fabriquez des recettes disponibles, pour gagner de l'XP de compétence.",
    "Собирайте материалы и награды или создавайте доступные предметы, чтобы получать опыт навыков.",
    "Beceri XP kazanmak için malzeme ve ödülleri topla veya uygun tariflerle üretim yap."
  ],
  "Explore Asterfall": [
    "Asterfall erkunden",
    "Explorar Asterfall",
    "Verken Asterfall",
    "Esplora Asterfall",
    "Explorer Asterfall",
    "Исследовать Asterfall",
    "Asterfall'ı keşfet"
  ],
  "Character XP is awarded when combat rewards are collected on Home.": [
    "Charakter-EP erhältst du, wenn du Kampfbelohnungen auf der Startseite abholst.",
    "La EXP de personaje se obtiene al recoger las recompensas de combate en Inicio.",
    "Personage-XP krijg je wanneer je gevechtsbeloningen op Home ophaalt.",
    "Ottieni PE personaggio riscattando le ricompense di combattimento nella Home.",
    "L'XP de personnage est accordée lorsque vous récupérez les récompenses de combat à l'accueil.",
    "Опыт персонажа начисляется при получении боевых наград на главном экране.",
    "Karakter XP'si, Ana Ekran'da savaş ödülleri alındığında verilir."
  ],
  "Create a character first.": [
    "Erstelle zuerst einen Charakter.",
    "Crea primero un personaje.",
    "Maak eerst een personage aan.",
    "Crea prima un personaggio.",
    "Créez d'abord un personnage.",
    "Сначала создайте персонажа.",
    "Önce bir karakter oluştur."
  ],
  "This encounter is not available.": [
    "Diese Begegnung ist nicht verfügbar.",
    "Este encuentro no está disponible.",
    "Deze ontmoeting is niet beschikbaar.",
    "Questo incontro non è disponibile.",
    "Cette rencontre n'est pas disponible.",
    "Эта встреча недоступна.",
    "Bu karşılaşma kullanılamıyor."
  ],
  "Defeat {monster} in the story first.": [
    "Besiege zuerst {monster} in der Geschichte.",
    "Derrota primero a {monster} en la historia.",
    "Versla eerst {monster} in het verhaal.",
    "Sconfiggi prima {monster} nella storia.",
    "Vainquez d'abord {monster} dans l'histoire.",
    "Сначала победите {monster} по сюжету.",
    "Önce hikâyede {monster} yen."
  ],
  "Discover {monster} in {zone} first.": [
    "Entdecke zuerst {monster} in {zone}.",
    "Descubre primero a {monster} en {zone}.",
    "Ontdek eerst {monster} in {zone}.",
    "Scopri prima {monster} a {zone}.",
    "Découvrez d'abord {monster} dans {zone}.",
    "Сначала обнаружьте {monster} в {zone}.",
    "Önce {zone} bölgesinde {monster} keşfet."
  ],
  "This recipe belongs to another class.": [
    "Dieses Rezept gehört zu einer anderen Klasse.",
    "Esta receta pertenece a otra clase.",
    "Dit recept hoort bij een andere klasse.",
    "Questa ricetta appartiene a un'altra classe.",
    "Cette recette appartient à une autre classe.",
    "Этот рецепт предназначен для другого класса.",
    "Bu tarif başka bir sınıfa ait."
  ],
  "Craft {name} first.": [
    "Stelle zuerst {name} her.",
    "Fabrica primero {name}.",
    "Maak eerst {name}.",
    "Crea prima {name}.",
    "Fabriquez d'abord {name}.",
    "Сначала создайте {name}.",
    "Önce {name} üret."
  ],
  "Requires Level {level}.": [
    "Erfordert Stufe {level}.",
    "Requiere nivel {level}.",
    "Vereist niveau {level}.",
    "Richiede livello {level}.",
    "Niveau {level} requis.",
    "Требуется уровень {level}.",
    "Seviye {level} gerekli."
  ],
  "Requires {skill} {level}.": [
    "Erfordert {skill} {level}.",
    "Requiere {skill} {level}.",
    "Vereist {skill} {level}.",
    "Richiede {skill} {level}.",
    "Nécessite {skill} {level}.",
    "Требуется {skill} {level}.",
    "{skill} {level} gerekli."
  ],
  "Travel to {region} first.": [
    "Reise zuerst nach {region}.",
    "Viaja primero a {region}.",
    "Reis eerst naar {region}.",
    "Viaggia prima a {region}.",
    "Voyagez d'abord vers {region}.",
    "Сначала отправьтесь в {region}.",
    "Önce {region} bölgesine git."
  ],
  "This region is not available yet.": [
    "Diese Region ist noch nicht verfügbar.",
    "Esta región todavía no está disponible.",
    "Deze regio is nog niet beschikbaar.",
    "Questa regione non è ancora disponibile.",
    "Cette région n'est pas encore disponible.",
    "Этот регион пока недоступен.",
    "Bu bölge henüz kullanılamıyor."
  ],
  "This source is not available yet.": [
    "Diese Quelle ist noch nicht verfügbar.",
    "Esta fuente aún no está disponible.",
    "Deze bron is nog niet beschikbaar.",
    "Questa fonte non è ancora disponibile.",
    "Cette source n'est pas encore disponible.",
    "Этот источник пока недоступен.",
    "Bu kaynak henüz kullanılamıyor."
  ],
  "This dungeon is not available yet.": [
    "Dieser Dungeon ist noch nicht verfügbar.",
    "Esta mazmorra aún no está disponible.",
    "Deze kerker is nog niet beschikbaar.",
    "Questo dungeon non è ancora disponibile.",
    "Ce donjon n'est pas encore disponible.",
    "Это подземелье пока недоступно.",
    "Bu zindan henüz kullanılamıyor."
  ]
} as const satisfies Record<string,SevenLanguages>;
export function questUnlockText(language:Language,key:string,params:TranslationParams={}):string{
 const index=SUPPORTED_LANGUAGES.indexOf(language)-1;
 const row=Object.prototype.hasOwnProperty.call(questUnlockCopyRows,key)
  ?questUnlockCopyRows[key as keyof typeof questUnlockCopyRows]:undefined;
 return interpolateTranslation(row&&index>=0?row[index]:key,params);
}
export function localizedQuestLockHint(language:Language,state:Pick<GameState,'character'|'quests'>,def:QuestDef):string{
 const source=questLockHint(state,def);
 if(def.requiredCharacterLevel&&(state.character?.level??0)<def.requiredCharacterLevel){
  const expected=`Reach character level ${def.requiredCharacterLevel} through Combat to unlock this objective.`;
  return source===expected?questUnlockText(language,'Reach character level {level} through Combat to unlock this objective.',{level:def.requiredCharacterLevel}):source;
 }
 const index=QUESTS.findIndex(quest=>quest.id===def.id),previous=index>0?QUESTS[index-1]:undefined;
 if(previous&&source===`Claim “${previous.name}” to unlock this objective. Progress is not tracked while locked.`)
  return questUnlockText(language,'Claim “{chapter}” to unlock this objective. Progress is not tracked while locked.',{chapter:localizedQuestStoryText(language,previous,'name')});
 return questUnlockText(language,source);
}
/** The destination itself is never modified: this only localizes its player-facing
 * button/hint using its original authored source and current canonical content. */
export function localizedQuestDestinationText(language:Language,def:QuestDef,field:'label'|'hint'):string{
 const source=questDestination(def)[field];
 const monster=MONSTERS.find(row=>row.id===def.targetId);
 if((def.kind==='kills'||def.kind==='boss')&&monster){
  if(field==='label'&&source===`Visit ${monster.zone}`)return questUnlockText(language,'Visit {zone}',{zone:monster.zone});
  if(field==='hint'&&source===`${monster.name} · character level ${monster.unlockLevel}. Collect hunt rewards on Home to update kill objectives.`)
   return questUnlockText(language,'{monster} · character level {level}. Collect hunt rewards on Home to update kill objectives.',{monster:monster.name,level:monster.unlockLevel});
 }
 if(def.kind==='exploration'){
  const route=EXPLORATION_ROUTES.find(row=>row.id===def.targetId);
  const zone=WORLD_ZONES.find(row=>row.id===route?.zoneId)?.name??'the scouting region';
  const name=route?.name??'the route';
  if(field==='label'&&source===`Travel to ${zone}`)return questUnlockText(language,'Travel to {zone}',{zone});
  if(field==='hint'&&source===`Travel to ${zone} first. Then open Skills → Exploration and scout ${name} to discover the encounter.`)
   return questUnlockText(language,'Travel to {zone} first. Then open Skills → Exploration and scout {route} to discover the encounter.',{zone,route:name});
 }
 if(def.kind==='item'&&field==='hint'){
  const gather=GATHERING.find(row=>row.itemId===def.targetId);
  if(gather&&source===`${gather.name} · ${gather.skillId} level ${gather.unlockLevel}. Item objectives count carried Inventory items, not Bank storage.`)
   return questUnlockText(language,'{action} · {skill} level {level}. Item objectives count carried Inventory items, not Bank storage.',{action:gather.name,skill:gather.skillId,level:gather.unlockLevel});
 }
 return questUnlockText(language,source);
}
/** Localize only recognized lock formats. No rewriting source availability or
 * forcing a locked/unlocked state based on translated presentation text. */
export function localizedWeeklyOrderLockReason(language:Language,state:GameState,order:WeeklyOrder):string|undefined{
 const source=weeklyOrderLockReason(state,order);
 if(source===undefined)return undefined;
 const monster=MONSTERS.find(m=>m.id===order.targetId);
 if(monster){
  if(source===`Defeat ${monster.name} in the story first.`)
   return questUnlockText(language,'Defeat {monster} in the story first.',{monster:monster.name});
  if(source===`Discover ${monster.name} in ${monster.zone} first.`)
   return questUnlockText(language,'Discover {monster} in {zone} first.',{monster:monster.name,zone:monster.zone});
 }
 const recipe=RECIPES.find(r=>r.id===order.targetId);
 if(recipe?.requiresCraftedItemId){
  const name=itemDef(recipe.requiresCraftedItemId).name;
  if(source===`Craft ${name} first.`)return questUnlockText(language,'Craft {name} first.',{name});
 }
 const level=source.match(/^Requires Level ([0-9]+)\.$/);
 if(level)return questUnlockText(language,'Requires Level {level}.',{level:level[1]});
 const skill=source.match(/^Requires (.+) ([0-9]+)\.$/);
 if(skill)return questUnlockText(language,'Requires {skill} {level}.',{skill:skill[1],level:skill[2]});
 const region=source.match(/^Travel to (.+) first\.$/);
 if(region)return questUnlockText(language,'Travel to {region} first.',{region:region[1]});
 return questUnlockText(language,source);
}
