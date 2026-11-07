import type {Language} from './languages';
import type {QuestActDef,QuestDef} from '../content/quests';
import {chapterTwoActCopy,chapterTwoQuestCopy} from './quest-story-act-two';
import {chapterThreeActCopy,chapterThreeQuestCopy} from './quest-story-act-three';

/** Reviewed Chapter I source copy. IDs and exact English wording must both match.
 * Monster and region names stay untouched; unknown or revised text falls back verbatim.
 * Column order: en, de, es, nl, it, fr, ru, tr.
 */
type EightLanguages=readonly [string,string,string,string,string,string,string,string];
type StoryField='name'|'description'|'story';
const languageColumn:Record<Language,number>={en:0,de:1,es:2,nl:3,it:4,fr:5,ru:6,tr:7};
export const chapterOneActCopy={
  1:{
  "name": [
    "Whispers in the Green",
    "Flüstern im Grünen",
    "Susurros en el verdor",
    "Gefluister in het groen",
    "Sussurri nel verde",
    "Murmures dans la verdure",
    "Шёпот среди зелени",
    "Yeşillikte Fısıltılar"
  ],
  "subtitle": [
    "Earn a name beyond the safety of the first road.",
    "Mache dir jenseits des sicheren ersten Weges einen Namen.",
    "Gánate un nombre más allá de la seguridad del primer camino.",
    "Maak naam buiten de veiligheid van de eerste weg.",
    "Fatti un nome oltre la sicurezza della prima strada.",
    "Faites-vous un nom au-delà de la sécurité de la première route.",
    "Заслужи себе имя за пределами безопасной первой дороги.",
    "İlk yolun güvenliğini geride bırakıp kendine bir isim yap."
  ]
}
} as const satisfies Partial<Record<QuestActDef['act'],Record<'name'|'subtitle',EightLanguages>>>;
export const chapterOneQuestCopy={
  "QST_001": {
    "name": [
      "A Name in the Ledger",
      "Ein Name im Register",
      "Un nombre en el registro",
      "Een naam in het register",
      "Un nome nel registro",
      "Un nom dans le registre",
      "Имя в реестре",
      "Defterde Bir İsim"
    ],
    "description": [
      "Defeat 5 Moss Rats.",
      "Besiege 5 Moss Rats.",
      "Derrota a 5 Moss Rats.",
      "Versla 5 Moss Rats.",
      "Sconfiggi 5 Moss Rats.",
      "Vainquez 5 Moss Rats.",
      "Победите 5 Moss Rats.",
      "5 Moss Rats yen."
    ],
    "story": [
      "The local ledger has more missing names than living ones. A simple rat cull is hardly heroic, but it is the first chance to prove you can return from the road.",
      "Im örtlichen Register stehen mehr Vermisste als Lebende. Ein paar Ratten zu beseitigen ist kaum heldenhaft, aber es ist deine erste Chance zu beweisen, dass du von der Straße zurückkehren kannst.",
      "El registro local contiene más nombres de desaparecidos que de vivos. Acabar con unas ratas no parece heroico, pero es tu primera oportunidad de demostrar que puedes volver del camino.",
      "In het plaatselijke register staan meer vermisten dan levenden. Een paar ratten uitroeien is niet bepaald heldhaftig, maar het is je eerste kans om te bewijzen dat je van de weg kunt terugkeren.",
      "Nel registro locale ci sono più nomi di dispersi che di vivi. Eliminare qualche ratto non è certo eroico, ma è la prima occasione per dimostrare che sai tornare dalla strada.",
      "Le registre local compte plus de disparus que de vivants. Éliminer quelques rats n'a rien d'héroïque, mais c'est une première occasion de prouver que vous pouvez revenir de la route.",
      "В местной книге пропавших имён больше, чем живых людей. Истребление крыс — не подвиг, но это первый шанс доказать, что ты способен вернуться с дороги.",
      "Yerel kayıt defterinde yaşayanlardan çok kayıpların adı var. Birkaç fareyi temizlemek kahramanlık sayılmaz ama yoldan sağ dönüp dönemeyeceğini kanıtlamak için ilk fırsatın."
    ]
  },
  "QST_002": {
    "name": [
      "First Blood, First Skill",
      "Erstes Blut, erste Fertigkeit",
      "Primera sangre, primera habilidad",
      "Eerste bloed, eerste vaardigheid",
      "Primo sangue, prima abilità",
      "Premier sang, première compétence",
      "Первая кровь, первый навык",
      "İlk Kan, İlk Beceri"
    ],
    "description": [
      "Reach level 2 in any guided gathering skill.",
      "Erreiche Stufe 2 in einer angeleiteten Sammelfertigkeit.",
      "Alcanza el nivel 2 en cualquier habilidad de recolección guiada.",
      "Bereik niveau 2 in een begeleide verzamelvaardigheid.",
      "Raggiungi il livello 2 in una qualsiasi abilità di raccolta guidata.",
      "Atteignez le niveau 2 dans une compétence de récolte guidée.",
      "Достигните 2-го уровня в любом навыке сбора с подсказками.",
      "Rehberli bir toplama becerisinde 2. seviyeye ulaş."
    ],
    "story": [
      "Steel alone will not carry you through Asterfall. The camp quartermaster sends you to learn the land, gather what it gives, and stop depending on supplies brought from safer places.",
      "Stahl allein bringt dich nicht durch Asterfall. Der Quartiermeister schickt dich los, das Land kennenzulernen, seine Rohstoffe zu sammeln und nicht länger von Vorräten aus sicheren Gegenden abhängig zu sein.",
      "El acero por sí solo no te llevará a través de Asterfall. El intendente del campamento te envía a conocer la tierra, recoger sus recursos y dejar de depender de suministros de lugares más seguros.",
      "Met alleen staal kom je niet door Asterfall. De kwartiermeester stuurt je eropuit om het land te leren kennen, grondstoffen te verzamelen en niet langer te vertrouwen op voorraden uit veiligere gebieden.",
      "Il solo acciaio non ti basterà per attraversare Asterfall. Il quartiermastro ti manda a conoscere la terra, raccoglierne le risorse e smettere di dipendere dai rifornimenti delle zone più sicure.",
      "L'acier seul ne suffira pas à traverser Asterfall. L'intendant du camp vous envoie découvrir la région, récolter ses ressources et ne plus dépendre des provisions venues de lieux plus sûrs.",
      "Одной стали не хватит, чтобы пройти через Asterfall. Интендант лагеря велит изучить эти земли, собирать их дары и перестать зависеть от припасов из безопасных мест.",
      "Asterfall boyunca yalnızca çeliğe güvenemezsin. Kampın levazım subayı toprağı tanımanı, sunduğu kaynakları toplamanı ve güvenli bölgelerden gelen erzaklara bağımlı olmamanı istiyor."
    ]
  },
  "QST_003": {
    "name": [
      "A Hound's Trail",
      "Die Spur des Jagdhundes",
      "El rastro del sabueso",
      "Het spoor van de jachthond",
      "La pista del segugio",
      "La piste du chien de chasse",
      "След гончей",
      "Av Köpeğinin İzi"
    ],
    "description": [
      "Travel to Ironwood Forest, then trace its paths to discover the Ironwood Wolf encounter.",
      "Reise nach Ironwood Forest und erkunde die Pfade, um die Begegnung mit Ironwood Wolf zu entdecken.",
      "Viaja a Ironwood Forest y sigue sus senderos para descubrir el encuentro con Ironwood Wolf.",
      "Reis naar Ironwood Forest en verken de paden om het gevecht met Ironwood Wolf te ontdekken.",
      "Raggiungi Ironwood Forest e segui i sentieri per scoprire lo scontro con Ironwood Wolf.",
      "Voyagez jusqu'à Ironwood Forest, puis explorez ses sentiers pour découvrir la rencontre avec Ironwood Wolf.",
      "Отправьтесь в Ironwood Forest и исследуйте тропы, чтобы найти встречу с Ironwood Wolf.",
      "Ironwood Forest bölgesine git, ardından Ironwood Wolf karşılaşmasını keşfetmek için patikaları araştır."
    ],
    "story": [
      "The wardens have found wolf tracks along the Ironwood verge, but no reliable path to the pack. Travel to the forest first, then trace its old trails to reveal where the wolves are hunting and open the road for future expeditions.",
      "Die Waldhüter fanden Wolfsspuren am Rand von Ironwood, aber keinen sicheren Weg zum Rudel. Reise zuerst in den Wald, erkunde seine alten Pfade und finde heraus, wo die Wölfe jagen. So öffnest du den Weg für spätere Expeditionen.",
      "Los guardianes encontraron huellas de lobo en los límites de Ironwood, pero ninguna ruta segura hasta la manada. Ve primero al bosque y sigue sus antiguos senderos para hallar la zona de caza y abrir el camino a futuras expediciones.",
      "De wachters vonden wolvensporen aan de rand van Ironwood, maar geen betrouwbare route naar de roedel. Reis eerst naar het bos en verken de oude paden om het jachtgebied te vinden en de weg voor toekomstige expedities vrij te maken.",
      "I guardiani hanno trovato tracce di lupi ai margini di Ironwood, ma nessun sentiero sicuro verso il branco. Raggiungi la foresta e segui gli antichi percorsi per trovare la zona di caccia e aprire la strada alle future spedizioni.",
      "Les gardiens ont repéré des traces de loups à la lisière d'Ironwood, mais aucune piste fiable vers la meute. Gagnez la forêt, puis suivez ses anciens sentiers pour découvrir où chassent les loups et ouvrir la voie aux prochaines expéditions.",
      "Стражи нашли волчьи следы на окраине Ironwood, но надёжного пути к стае нет. Сначала отправься в лес, затем исследуй старые тропы, найди охотничьи угодья волков и открой дорогу будущим экспедициям.",
      "Muhafızlar Ironwood kıyısında kurt izleri buldu ama sürüye giden güvenli bir yol yok. Önce ormana git, sonra eski patikaları izleyerek kurtların avlandığı yeri bul ve gelecek seferler için yolu aç."
    ]
  },
  "QST_004": {
    "name": [
      "Tools of the Trade",
      "Handwerkszeug",
      "Herramientas del oficio",
      "Gereedschap van het vak",
      "Gli attrezzi del mestiere",
      "Les outils du métier",
      "Инструменты ремесла",
      "Mesleğin Araçları"
    ],
    "description": [
      "Equip at least 2 pieces of gear.",
      "Lege mindestens 2 Ausrüstungsstücke an.",
      "Equipa al menos 2 piezas de equipo.",
      "Rust minstens 2 uitrustingsstukken uit.",
      "Equipaggia almeno 2 pezzi di equipaggiamento.",
      "Équipez au moins 2 pièces d'équipement.",
      "Наденьте минимум 2 предмета снаряжения.",
      "En az 2 ekipman parçası kuşan."
    ],
    "story": [
      "The smith laughs at the state of your equipment and refuses to call luck a fighting style. If you intend to push deeper, you will need a kit built for more than field vermin.",
      "Der Schmied lacht über den Zustand deiner Ausrüstung. Glück will er nicht als Kampfstil gelten lassen. Wenn du tiefer vordringen willst, brauchst du Ausrüstung, die mehr aushält als ein paar Feldschädlinge.",
      "El herrero se ríe del estado de tu equipo y se niega a llamar estilo de combate a la suerte. Si quieres adentrarte más, necesitarás equipo preparado para algo peor que las alimañas del campo.",
      "De smid lacht om de staat van je uitrusting en weigert geluk een vechtstijl te noemen. Als je verder wilt trekken, heb je spullen nodig die tegen meer bestand zijn dan ongedierte op het veld.",
      "Il fabbro ride delle condizioni del tuo equipaggiamento e si rifiuta di chiamare la fortuna uno stile di combattimento. Per spingerti oltre, ti servirà qualcosa di più adatto ai parassiti dei campi.",
      "Le forgeron rit de l'état de votre équipement et refuse de considérer la chance comme une technique de combat. Pour aller plus loin, il vous faudra du matériel capable d'affronter autre chose que les nuisibles des champs.",
      "Кузнец смеётся над твоим снаряжением и отказывается считать удачу боевым стилем. Чтобы продвинуться дальше, понадобится экипировка, пригодная для сражений не только с полевыми вредителями.",
      "Demirci ekipmanının hâline gülüyor ve şansın bir dövüş tarzı sayılamayacağını söylüyor. Daha derine ilerlemek istiyorsan tarla haşerelerinden fazlasına dayanabilecek donanıma ihtiyacın var."
    ]
  },
  "QST_005": {
    "name": [
      "Into Ironwood",
      "Nach Ironwood",
      "Hacia Ironwood",
      "Ironwood in",
      "Verso Ironwood",
      "En route vers Ironwood",
      "В глубь Ironwood",
      "Ironwood'a Doğru"
    ],
    "description": [
      "Reach character level 7.",
      "Erreiche Charakterstufe 7.",
      "Alcanza el nivel de personaje 7.",
      "Bereik personageniveau 7.",
      "Raggiungi il livello personaggio 7.",
      "Atteignez le niveau de personnage 7.",
      "Достигните 7-го уровня персонажа.",
      "Karakter seviyesini 7'a çıkar."
    ],
    "story": [
      "Rumours from the forest no longer sound like frightened farmers exaggerating. Something beneath the roots is stirring, and the wardens will only open the deeper paths to adventurers who have survived long enough to matter.",
      "Die Gerüchte aus dem Wald klingen nicht mehr nach Übertreibungen verängstigter Bauern. Unter den Wurzeln regt sich etwas, und die Waldhüter öffnen die tieferen Pfade nur Abenteurern, die lange genug überlebt haben.",
      "Los rumores del bosque ya no parecen exageraciones de campesinos asustados. Algo se mueve bajo las raíces, y los guardianes solo abrirán los senderos profundos a quienes hayan sobrevivido lo suficiente.",
      "De geruchten uit het bos klinken niet langer als overdrijvingen van bange boeren. Onder de wortels ontwaakt iets, en de wachters openen de diepere paden alleen voor avonturiers die lang genoeg hebben overleefd.",
      "Le voci sulla foresta non sembrano più esagerazioni di contadini spaventati. Qualcosa si muove sotto le radici e i guardiani apriranno i sentieri più profondi solo agli avventurieri abbastanza esperti da sopravvivere.",
      "Les rumeurs venues de la forêt ne ressemblent plus aux exagérations de paysans effrayés. Quelque chose remue sous les racines, et les gardiens n'ouvriront les sentiers profonds qu'aux aventuriers ayant fait leurs preuves.",
      "Лесные слухи больше не похожи на выдумки перепуганных крестьян. Под корнями что-то пробуждается, и стражи откроют глубинные тропы лишь тем искателям приключений, кто сумел выжить достаточно долго.",
      "Ormandan gelen söylentiler artık korkmuş çiftçilerin abartıları gibi gelmiyor. Köklerin altında bir şey kıpırdanıyor; muhafızlar derin patikaları yalnızca hayatta kalmayı başarmış maceracılara açacak."
    ]
  }
} as const satisfies Record<string,Record<StoryField,EightLanguages>>;

const localizedActCopy={1:chapterOneActCopy[1],2:chapterTwoActCopy[2],3:chapterThreeActCopy[3]} as const;
const localizedQuestCopy:Record<string,Record<StoryField,EightLanguages>>={...chapterOneQuestCopy,...chapterTwoQuestCopy,...chapterThreeQuestCopy};

export function localizedQuestActText(language:Language,act:QuestActDef,field:'name'|'subtitle'):string{
  if(!Object.prototype.hasOwnProperty.call(localizedActCopy,act.act))return act[field];
  const row=localizedActCopy[act.act as keyof typeof localizedActCopy][field];
  return row[0]===act[field]?row[languageColumn[language]]:act[field];
}
export function localizedQuestStoryText(language:Language,quest:Pick<QuestDef,'id'|StoryField>,field:StoryField):string{
  if(!Object.prototype.hasOwnProperty.call(localizedQuestCopy,quest.id))return quest[field];
  const row=localizedQuestCopy[quest.id][field];
  return row[0]===quest[field]?row[languageColumn[language]]:quest[field];
}
/** Search both the existing English catalog and reviewed localized chapter prose.
 * Never translate names passed to the search or change Journal status filtering.
 */
export function questMatchesLocalizedSearch(language:Language,quest:QuestDef,query:string):boolean{
  const term=query.trim().toLocaleLowerCase(language);
  if(!term)return true;
  return [
    quest.name,quest.description,quest.location,quest.story,
    localizedQuestStoryText(language,quest,'name'),
    localizedQuestStoryText(language,quest,'description'),
    localizedQuestStoryText(language,quest,'story'),
  ].some(value=>value.toLocaleLowerCase(language).includes(term));
}
