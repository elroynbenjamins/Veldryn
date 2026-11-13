import {QUESTS, type QuestAct} from '../content/quests';
import type {GameState} from './types';
import type {Language} from '../i18n/languages';
import {SUPPORTED_LANGUAGES} from '../i18n/languages';
import {localizedQuestStoryText} from '../i18n/quest-story-copy';

/**
 * Story-only discoveries. They do not grant rewards, alter quest IDs, or
 * introduce progression state: the authoritative claimed quest is the key.
 * Column order always matches SUPPORTED_LANGUAGES: en/de/es/nl/it/fr/ru/tr.
 */
type EightLanguages = readonly [string,string,string,string,string,string,string,string];
interface DiscoveryDefinition {questId:string; text:EightLanguages}
export const STORY_DISCOVERIES:readonly DiscoveryDefinition[] = [
  {questId:'QST_003',text:[
    'The wolf trail ends at a stone carved with a royal oath-mark. Its grooves are warm, though the surrounding moss is cold.',
    'Die Wolfsspur endet an einem Stein mit einem königlichen Eidsiegel. Seine Rillen sind warm, obwohl das Moos ringsum kalt ist.',
    'El rastro del lobo termina junto a una piedra con un juramento real grabado. Sus surcos están tibios, aunque el musgo está frío.',
    'Het wolvenspoor eindigt bij een steen met een koninklijk eedteken. De groeven zijn warm, hoewel het mos eromheen koud is.',
    'Le tracce del lupo finiscono presso una pietra incisa con un giuramento reale. I solchi sono caldi, ma il muschio intorno è freddo.',
    'La piste du loup s’arrête devant une pierre gravée d’un serment royal. Ses rainures sont chaudes, malgré la mousse froide.',
    'Волчий след обрывается у камня с королевской клятвой. Борозды тёплые, хотя мох вокруг холоден.',
    'Kurt izi, kraliyet yemini işlenmiş bir taşta bitiyor. Çevresindeki yosun soğukken taşın oyukları sıcak.'
  ]},
  {questId:'QST_006',text:[
    'The thorns coil around those same marks, not toward passing travelers. Something is forcing the old wards to wake.',
    'Die Dornen winden sich um dieselben Zeichen, nicht zu Reisenden hin. Etwas zwingt die alten Schutzsiegel zum Erwachen.',
    'Las espinas rodean esas mismas marcas, no a los viajeros. Algo está obligando a despertar a los antiguos sellos.',
    'De doornen kronkelen om dezelfde tekens heen, niet naar reizigers. Iets dwingt de oude zegels te ontwaken.',
    'Le spine si avvolgono attorno agli stessi segni, non verso i viandanti. Qualcosa sta risvegliando gli antichi sigilli.',
    'Les épines enlacent ces mêmes marques, sans chercher les voyageurs. Quelque chose réveille de force les anciens sceaux.',
    'Шипы тянутся к тем же знакам, а не к путникам. Нечто заставляет древние печати пробуждаться.',
    'Dikenler yolculara değil, aynı işaretlere dolanıyor. Bir şey eski mühürleri zorla uyandırıyor.'
  ]},
  {questId:'QST_009',text:[
    'The vault is no tomb. Its roots bind a cracked Oathglass lens, built to carry a command farther than any horn could reach.',
    'Das Gewölbe ist keine Gruft. Seine Wurzeln umschließen eine gesprungene Oathglass-Linse, die Befehle weiter tragen konnte als jedes Horn.',
    'La cámara no es una tumba. Sus raíces sujetan una lente de Oathglass agrietada, capaz de transmitir órdenes más allá de cualquier cuerno.',
    'De kluis is geen graf. De wortels klemmen een gebarsten Oathglass-lens vast, gemaakt om bevelen verder te dragen dan een hoorn ooit kon.',
    'Il sotterraneo non è una tomba. Le radici stringono una lente di Oathglass incrinata, capace di trasmettere ordini oltre ogni corno.',
    'Le caveau n’est pas une tombe. Ses racines retiennent une lentille de Oathglass fendue, conçue pour porter un ordre plus loin que tout cor.',
    'Хранилище — не гробница. Корни сковали треснувшую линзу Oathglass, способную передавать приказ дальше любого рога.',
    'Mahzen bir mezar değil. Kökleri, emirleri her borudan uzağa taşıyabilen çatlak bir Oathglass merceğini bağlıyor.'
  ]},
  {questId:'QST_010',text:[
    'When the lens pulses, lanterns turn toward the old royal road. The dead are not wandering: someone is still repeating their final order.',
    'Wenn die Linse pulsiert, wenden sich die Laternen der alten Königsstraße zu. Die Toten irren nicht umher: Jemand wiederholt ihren letzten Befehl.',
    'Cuando la lente palpita, las linternas giran hacia el antiguo camino real. Los muertos no vagan: alguien sigue repitiendo su última orden.',
    'Wanneer de lens pulseert, draaien de lantaarns naar de oude koningsweg. De doden dwalen niet: iemand herhaalt nog steeds hun laatste bevel.',
    'Quando la lente pulsa, le lanterne si volgono verso l’antica strada reale. I morti non vagano: qualcuno ripete ancora il loro ultimo ordine.',
    'Lorsque la lentille pulse, les lanternes se tournent vers l’ancienne route royale. Les morts n’errent pas : quelqu’un répète leur dernier ordre.',
    'Когда линза пульсирует, фонари поворачиваются к старой королевской дороге. Мертвецы не бродят: кто-то вновь отдаёт последний приказ.',
    'Mercek titreştiğinde fenerler eski kraliyet yoluna dönüyor. Ölüler başıboş değil: biri hâlâ son emirlerini yineliyor.'
  ]},
  {questId:'QST_014',text:[
    'The Knight guarded a gate, not a throne. The signal in the glass turned his oath into a prison; his defeat breaks only one link in the chain.',
    'Der Ritter bewachte ein Tor, keinen Thron. Das Signal im Glas machte seinen Eid zum Gefängnis; sein Fall zerbricht nur ein Glied der Kette.',
    'El Caballero protegía una puerta, no un trono. La señal del cristal convirtió su juramento en prisión; derrotarlo rompe un solo eslabón.',
    'De Ridder bewaakte een poort, geen troon. Het signaal in het glas maakte zijn eed tot een gevangenis; zijn val verbreekt slechts één schakel.',
    'Il Cavaliere difendeva un cancello, non un trono. Il segnale nel vetro rese il suo giuramento una prigione; la sconfitta spezza solo un anello.',
    'Le Chevalier gardait une porte, pas un trône. Le signal du verre transforma son serment en prison ; sa défaite ne brise qu’un maillon.',
    'Рыцарь охранял врата, а не трон. Сигнал в стекле превратил его клятву в тюрьму; поражение разрывает лишь одно звено.',
    'Şövalye bir tahtı değil, kapıyı koruyordu. Camdaki sinyal yeminini hapishaneye çevirdi; yenilgisi zincirin yalnızca bir halkasını kırdı.'
  ]},
  {questId:'QST_015',text:[
    'The last shard pulls toward the glass deserts of Sunscar. Beneath its hum lies a second tone, cold as the distant bells of Frostmarch.',
    'Der letzte Splitter zieht zu den Glaswüsten von Sunscar. Unter seinem Summen liegt ein zweiter Ton, kalt wie die fernen Glocken von Frostmarch.',
    'El último fragmento apunta a los desiertos de cristal de Sunscar. Bajo su zumbido suena una segunda nota, fría como las campanas de Frostmarch.',
    'De laatste scherf trekt naar de glaswoestijnen van Sunscar. Onder het gezoem klinkt een tweede toon, koud als de verre klokken van Frostmarch.',
    'L’ultimo frammento punta ai deserti di vetro di Sunscar. Sotto il suo ronzio risuona una seconda nota, fredda come le campane di Frostmarch.',
    'Le dernier éclat attire vers les déserts de verre de Sunscar. Sous son bourdonnement résonne une seconde note, froide comme les cloches de Frostmarch.',
    'Последний осколок тянется к стеклянным пустыням Sunscar. Под его гулом слышен второй тон, холодный, словно далёкие колокола Frostmarch.',
    'Son parça Sunscar’ın cam çöllerine çekiliyor. Uğultusunun altında Frostmarch’ın uzak çanları kadar soğuk ikinci bir ses var.'
  ]},
];

export interface RecoveredStoryDiscovery {questId:string; act:QuestAct; chapter:number; title:string; text:string}
const sourceById = new Map(QUESTS.map((quest,index)=>[quest.id,{quest,chapter:index+1}] as const));
const discoveryById = new Map(STORY_DISCOVERIES.map(discovery=>[discovery.questId,discovery] as const));

export function storyDiscoveryText(language:Language,questId:string):string|undefined{
  const discovery=discoveryById.get(questId);
  return discovery?.text[SUPPORTED_LANGUAGES.indexOf(language)];
}

/** Never expose a discovery until the reward has actually been claimed. */
export function recoveredStoryDiscoveries(
  state:Pick<GameState,'quests'>,language:Language
):RecoveredStoryDiscovery[]{
  const claimed=new Set(state.quests.filter(row=>row.status==='claimed').map(row=>row.questId));
  return STORY_DISCOVERIES.flatMap(discovery=>{
    if(!claimed.has(discovery.questId))return [];
    const source=sourceById.get(discovery.questId);
    if(!source)return [];
    return [{questId:discovery.questId,act:source.quest.act,chapter:source.chapter,
      title:localizedQuestStoryText(language,source.quest,'name'),
      text:storyDiscoveryText(language,discovery.questId)??discovery.text[0]}];
  });
}
export function storyActProgress(state:Pick<GameState,'quests'>){
  const claimed=new Set(state.quests.filter(row=>row.status==='claimed').map(row=>row.questId));
  return ([1,2,3] as const).map(act=>{
    const quests=QUESTS.filter(def=>def.act===act);
    const completed=quests.filter(def=>claimed.has(def.id)).length;
    return {act,completed,total:quests.length,finished:completed===quests.length};
  });
}
