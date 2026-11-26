import {DEFAULT_QUICK_NAV_DESTINATIONS,normalizeQuickNavDestinations,QUICK_NAV_DESTINATIONS} from '../src/core/quick-navigation';
import {newGame} from '../src/core/game';
import {normalizeSave} from '../src/core/save-normalization';

function same(actual:readonly string[],expected:readonly string[],message:string){
 if(actual.join(',')!==expected.join(','))throw new Error(message+': '+actual.join(','));
}
const custom=['Dungeon','Pets','Social','Forge','Collections'] as const;
const state=newGame(0);
same(state.settings.quickNavDestinations??[],DEFAULT_QUICK_NAV_DESTINATIONS,'New saves must receive five default shortcuts');
same(normalizeQuickNavDestinations(custom),custom,'Valid custom shortcut order must be preserved');
same(normalizeQuickNavDestinations(['Quests','Dungeon','Companions','Guild','Settings']),DEFAULT_QUICK_NAV_DESTINATIONS,'Legacy default migrates to recommended destinations');
same(normalizeQuickNavDestinations(['Unknown','Unknown','Unknown']),DEFAULT_QUICK_NAV_DESTINATIONS,'Malformed shortcut data must restore the recommended shortcuts');
same(normalizeQuickNavDestinations(['Account','Social','Social','Empty','Guild']),['Quests','Social','ResourceCodex','Party','Guild'],'Retired and duplicate shortcuts must be repaired without moving valid slots');
same(normalizeQuickNavDestinations(['Character','Skills','World','Inventory','More']),DEFAULT_QUICK_NAV_DESTINATIONS,'Permanent navigation shortcuts are replaced');
const repaired=normalizeQuickNavDestinations(['Guild','Guild','Party','Events','Unknown']);
same(repaired,['Guild','Quests','Party','Events','ResourceCodex'],'Repair must reserve valid later choices');
same(normalizeQuickNavDestinations(repaired),repaired,'Normalization must be idempotent');
if(new Set(repaired).size!==5||!repaired.every(id=>QUICK_NAV_DESTINATIONS.some(choice=>choice===id)))throw new Error('Exactly five distinct selectable destinations are required');
const legacy=JSON.parse(JSON.stringify(state));delete legacy.settings.quickNavDestinations;
same(normalizeSave(legacy).settings.quickNavDestinations??[],DEFAULT_QUICK_NAV_DESTINATIONS,'Older saves must be upgraded with five shortcuts');
legacy.settings.quickNavDestinations=[...custom];
same(normalizeSave(legacy).settings.quickNavDestinations??[],custom,'Legacy saves must preserve valid custom selections');
console.log('PASS: quick navigation defaults, customization order, legacy-save normalization and in-place repair are stable');
