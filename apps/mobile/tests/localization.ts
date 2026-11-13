import {newGame} from '../src/core/game';
import {normalizeSave} from '../src/core/save-normalization';
import {LANGUAGE_NAMES,MESSAGE_COUNT,OPERATIONAL_MESSAGE_COUNT,SUPPORTED_LANGUAGES,ot,t,translatedMessageCount} from '../src/i18n';
import {GATHERING} from '../src/content/skills';
import {GATHERING_TOOLS} from '../src/content/gathering-tools';
import {itemDef} from '../src/content/items';
import {HERB_NODES} from '../src/content/herbalism';
import {activityProgressFeedback} from '../src/core/balance-projection';
import {gameplayTranslate,localizeGameplay} from '../src/i18n/gameplay';
import {localizedItemName} from '../src/i18n/starter-item-names';

function ok(value:boolean,message:string){if(!value)throw new Error(message)}

ok(SUPPORTED_LANGUAGES.join(',')==='en,de,es,nl,it,fr,ru,tr','Release languages are missing or out of order');
ok(new Set(SUPPORTED_LANGUAGES.map(language=>LANGUAGE_NAMES[language])).size===8,'Language names must be unique');
for(const language of SUPPORTED_LANGUAGES){
  ok(translatedMessageCount(language)===MESSAGE_COUNT,`${language} shared catalog is incomplete`);
  const saved={...newGame(1_000),settings:{...newGame(1_000).settings,language}};
  ok(normalizeSave(saved).settings.language===language,`${language} was not preserved by save normalization`);
}
ok(t('ru','nav.home')==='Главная','Russian navigation starter translation unavailable');
ok(t('tr','settings.language')==='Dil','Turkish settings starter translation unavailable');
ok(ot('tr','save.retry')==='Yüklemeyi yeniden dene','Turkish recovery starter translation unavailable');
ok(t('es','nav.home')==='Inicio','Spanish navigation translation is unavailable');
ok(t('fr','common.back')==='Retour','French back translation is unavailable');
ok(ot('es','save.retry')==='Reintentar carga','Spanish recovery translation is unavailable');
ok(ot('de','overflow.move',{count:3})==='3 Gegenstände zur Bank verschieben','Operational interpolation failed');
ok(OPERATIONAL_MESSAGE_COUNT>=30,'Operational localization coverage unexpectedly shrank');
ok(normalizeSave({...newGame(1_000),settings:{...newGame(1_000).settings,language:'unknown'}}).settings.language==='en','Unknown languages must fall back to English');


// German gathering resources must never silently fall back to raw English names.
for(const node of [...GATHERING,...HERB_NODES]){
 ok(localizeGameplay('de',node.name)!==node.name,`Missing German gathering-node translation: ${node.name}`);
}
for(const kind of ['combat','gathering','crafting','training','exploration','faith'] as const){
 for(const phaseProgress of [0,0.4,0.8,1]){
  const english=activityProgressFeedback(kind,phaseProgress);
  ok(localizeGameplay('de',english)!==english,`Missing German activity phase: ${english}`);
 }
}
ok(localizeGameplay('de','Ironwood Tree')==='Eisenholzbaum','Woodcutting node should be German');
ok(localizeGameplay('de','Rootstream Trout Pool')==='Wurzelbachforellen-Tümpel','Fishing node should be German');
ok(localizeGameplay('de','Ironbloom Thicket')==='Eisenblütendickicht','Herbalism node should be German');
ok(localizedItemName('de','ROOTSTREAM_TROUT')==='Wurzelbachforelle','Inventory resource name should be German');
ok(gameplayTranslate('de','Unlocks at {skill} level {level}',{skill:localizeGameplay('de','woodcutting'),level:15})==='Freigeschaltet ab Holzfällen-Stufe 15','German unlock requirement should use localized skill names');
ok(gameplayTranslate('de','Have: {count} {resource} · {seconds}s',{count:103,resource:localizedItemName('de','ROOTSTREAM_TROUT'),seconds:74})==='Im Besitz: 103 Wurzelbachforelle · 74 s','German owned count should use localized resource names');
for(const node of [...GATHERING,...HERB_NODES]){
 ok(localizedItemName('de',node.itemId)!==itemDef(node.itemId).name,`Missing German gathering-item name: ${node.itemId}`);
}
for(const tool of GATHERING_TOOLS){
 ok(localizedItemName('de',tool.id)!==tool.name,`Missing German gathering-tool name: ${tool.id}`);
 if(tool.blueprint)ok(localizedItemName('de',tool.blueprint.itemId)!==(tool.name+' Blueprint'),`Missing German tool blueprint: ${tool.blueprint.itemId}`);
}
ok(localizeGameplay('de','Companion Mastery')==='Gefährtenmeisterschaft','Companion Mastery header should be German');
ok(localizeGameplay('de','Claim Companion Training')==='Gefährtentraining abholen','Sanctuary action should be German');

console.log(`Localization tests passed (${SUPPORTED_LANGUAGES.length} languages, ${MESSAGE_COUNT} shared and ${OPERATIONAL_MESSAGE_COUNT} operational messages each).`);
