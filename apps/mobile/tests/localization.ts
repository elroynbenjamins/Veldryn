import {newGame} from '../src/core/game';
import {normalizeSave} from '../src/core/save-normalization';
import {LANGUAGE_NAMES,MESSAGE_COUNT,OPERATIONAL_MESSAGE_COUNT,SUPPORTED_LANGUAGES,ot,t,translatedMessageCount} from '../src/i18n';

function ok(value:boolean,message:string){if(!value)throw new Error(message)}

ok(SUPPORTED_LANGUAGES.join(',')==='en,de,es,nl,it,fr','Release languages are missing or out of order');
ok(new Set(SUPPORTED_LANGUAGES.map(language=>LANGUAGE_NAMES[language])).size===6,'Language names must be unique');
for(const language of SUPPORTED_LANGUAGES){
  ok(translatedMessageCount(language)===MESSAGE_COUNT,`${language} shared catalog is incomplete`);
  const saved={...newGame(1_000),settings:{...newGame(1_000).settings,language}};
  ok(normalizeSave(saved).settings.language===language,`${language} was not preserved by save normalization`);
}
ok(t('es','nav.home')==='Inicio','Spanish navigation translation is unavailable');
ok(t('fr','common.back')==='Retour','French back translation is unavailable');
ok(ot('es','save.retry')==='Reintentar carga','Spanish recovery translation is unavailable');
ok(ot('de','overflow.move',{count:3})==='3 Gegenstände zur Bank verschieben','Operational interpolation failed');
ok(OPERATIONAL_MESSAGE_COUNT>=30,'Operational localization coverage unexpectedly shrank');
ok(normalizeSave({...newGame(1_000),settings:{...newGame(1_000).settings,language:'unknown'}}).settings.language==='en','Unknown languages must fall back to English');

console.log(`Localization tests passed (${SUPPORTED_LANGUAGES.length} languages, ${MESSAGE_COUNT} shared and ${OPERATIONAL_MESSAGE_COUNT} operational messages each).`);
