import {createCharacter,newGame} from '../src/core/game';
import {
  normalizeNameHexColor,normalizePlayerNameStyle,effectivePlayerNameStyle,
  playerNameStyleEntitlements,supporterPresetStyle,withPlayerNameStyle,
} from '../src/core/player-name-style';

function ok(value:unknown,message:string){if(!value)throw new Error(message)}
function equal(actual:unknown,expected:unknown,message:string){if(actual!==expected)throw new Error(`${message}: expected ${String(expected)}, got ${String(actual)}`)}

equal(normalizeNameHexColor('#abc'),'#AABBCC','3-digit HEX should normalize to full RGB');
equal(normalizeNameHexColor('7bd7ff'),'#7BD7FF','HEX input may omit the hash');

let state=createCharacter(newGame(0),'WAYFINDER','Chromatic');
state=withPlayerNameStyle(state,{mode:'gradient',solidColor:'#AA55FF',gradientColors:['#42D9FF','#8B5CFF','#FF65C8'],presetId:'custom',animated:true});
equal(effectivePlayerNameStyle(state).mode,'default','No paid name-style entitlement should render the standard name');

state={...state,account:{...state.account,entitlements:{vip_plus:true}}};
const vip=effectivePlayerNameStyle(state);
equal(vip.mode,'solid','VIP+ must fall back from a saved Supporter gradient to its permanent solid color');
equal(vip.solidColor,'#AA55FF','VIP+ fallback should preserve the selected solid RGB color');
ok(playerNameStyleEntitlements(state).canSolid,'VIP+ must unlock solid RGB names');
ok(!playerNameStyleEntitlements(state).canGradient,'VIP+ alone must not unlock gradients');

state={...state,account:{...state.account,entitlements:{vip_plus:true,supporter:true},playerNameStyle:supporterPresetStyle('aurora','#AA55FF')}};
const supporter=effectivePlayerNameStyle(state);
equal(supporter.mode,'gradient','Supporter must unlock advanced gradient names');
ok(supporter.animated===true,'Aurora Supporter preset should opt into slow flow');
ok(playerNameStyleEntitlements(state).canGradient&&playerNameStyleEntitlements(state).canAnimated,'Supporter must unlock gradients and slow animation');

state={...state,account:{...state.account,entitlements:{vip_plus:true}}};
const expired=effectivePlayerNameStyle(state);
equal(expired.mode,'solid','Expired Supporter must fall back to VIP+ solid without deleting the stored gradient');
equal(normalizePlayerNameStyle(state.account.playerNameStyle).mode,'gradient','Stored Supporter design must survive subscription expiry');

console.log('PASS: VIP+ solid RGB, Supporter gradients, stacking and expiry fallback are entitlement-safe');
