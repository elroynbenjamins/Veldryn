import {assert} from './test-assert';
import {SUPPORTED_LANGUAGES} from '../src/i18n/languages';
import {APP_SHELL_MESSAGES,appText} from '../src/i18n/app-shell';
import {NAVIGATION_MESSAGES} from '../src/i18n/navigation';
import {BATTLE_MESSAGES} from '../src/i18n/battle';
import {VISUAL_MESSAGES} from '../src/i18n/visuals';
import {MONSTERS} from '../src/content/monsters';
import {encounterIdentity} from '../src/core/encounter-identity';
import {CLASS_COMBAT_STYLES} from '../src/core/class-combat';
import {interpolateTranslation,formatLocalizedNumber,formatLocalizedDate,createTranslator} from '../src/i18n/translator';
import {systemNotifications} from '../src/core/system-notifications';
import {newGame} from '../src/core/game';
import {formatGameNumber} from '../src/core/number-format';

const placeholders=(text:string)=>[...new Set([...text.matchAll(/\{([A-Za-z][A-Za-z0-9_]*)\}/g)].map(match=>match[1]))].sort().join(',');
for(const [source,translations] of Object.entries({...APP_SHELL_MESSAGES,...NAVIGATION_MESSAGES,...BATTLE_MESSAGES,...VISUAL_MESSAGES})){
 assert.equal(translations.length,SUPPORTED_LANGUAGES.length-1);
 for(const translation of translations){assert.ok(translation.trim().length>0);assert.equal(placeholders(translation),placeholders(source),source);}
}
for(const monster of MONSTERS){
 const encounter=encounterIdentity(monster);
 for(const text of [encounter.archetype,encounter.pressure,encounter.summary,encounter.tactic,...encounter.mechanics])assert.ok(Object.hasOwn(BATTLE_MESSAGES,text),`Missing encounter text: ${text}`);
}
for(const style of Object.values(CLASS_COMBAT_STYLES))assert.ok(Object.hasOwn(BATTLE_MESSAGES,style.description));
assert.equal(appText('nl','Cannot travel'),'Reizen niet mogelijk');
assert.equal(appText('fr','{name} is ready.',{name:'Ironwarden'}),'Ironwarden est prêt.');
assert.equal(appText('nl','Player text stays exactly like this'),'Player text stays exactly like this');
assert.equal(appText('de','constructor'),'constructor');
assert.equal(interpolateTranslation('{name}: {count}',{name:'$& {count}',count:3}),'$& {count}: 3');
assert.equal(interpolateTranslation('Missing {count}'),'Missing {count}');
const translate=createTranslator({en:{key:'Hello {name}'},de:{key:'Hallo {name}'},es:{key:'Hola {name}'},nl:{key:'Hallo {name}'},it:{key:'Ciao {name}'},fr:{key:'Bonjour {name}'}});
assert.equal(translate('nl','key',{name:'Eira'}),'Hallo Eira');
assert.equal(translate('nl','constructor' as 'key'),'constructor');
assert.equal(translate('nl','Unknown source' as 'key'),'Unknown source');
assert.equal(formatLocalizedNumber('nl',12345.6),'12.345,6');
assert.equal(formatLocalizedNumber('en',12345.6),'12,345.6');
assert.equal(formatGameNumber(12345,'exact','nl'),'12.345');
assert.equal(formatGameNumber(12500,'abbreviated','de'),'12,5K');
assert.ok(formatLocalizedDate('de',new Date('2026-09-27T12:00:00Z'),{timeZone:'UTC',year:'numeric',month:'2-digit',day:'2-digit'}).includes('27.09.2026'));
const state=newGame(1000);state.settings.language='nl';state.overflow.stacks=[{itemId:'TRAVEL_RATION',quantity:2}];
const overflow=systemNotifications(state,1000).find(row=>row.id==='overflow');
assert.equal(overflow?.title,'Opslag vraagt aandacht');assert.ok(overflow?.body.includes('2'));
console.log('PASS localization foundation: six-language completeness, placeholders, name preservation, locale formatting and system notices');
