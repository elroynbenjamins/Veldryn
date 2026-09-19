import {DEFAULT_QUICK_NAV_DESTINATIONS,normalizeQuickNavDestinations} from '../src/core/quick-navigation';
import {newGame} from '../src/core/game';
import {normalizeSave} from '../src/core/save-normalization';

const custom=['Character','Skills','World','Inventory','Account'] as const;
const state=newGame(0);
if(state.settings.quickNavDestinations?.join(',')!==DEFAULT_QUICK_NAV_DESTINATIONS.join(','))throw new Error('New saves must receive five default shortcuts');
if(normalizeQuickNavDestinations(custom).join(',')!==custom.join(','))throw new Error('Valid custom shortcut order must be preserved');
if(normalizeQuickNavDestinations(['Unknown','Unknown','Unknown']).join(',')!=='Empty,Empty,Empty,Empty,Empty')throw new Error('Malformed shortcut data must be normalized safely');
const legacy=JSON.parse(JSON.stringify(state));delete legacy.settings.quickNavDestinations;
if(normalizeSave(legacy).settings.quickNavDestinations?.length!==5)throw new Error('Older saves must be upgraded with five shortcuts');
console.log('PASS: quick navigation defaults, customization order and legacy-save normalization are stable');
