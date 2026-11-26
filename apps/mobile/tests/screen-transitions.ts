import {SCREEN_TRANSITION_PRESETS,screenTransitionFor} from '../src/core/screen-transitions';

function assert(ok:unknown,message:string){if(!ok)throw new Error(message);}
assert(screenTransitionFor('Home','Character')==='primary','Primary navigation is lightweight');
assert(screenTransitionFor('World','Inventory')==='primary','Primary shortcuts share the same motion');
assert(screenTransitionFor('More','Guild')==='detail','Nested routes get a modest reveal');
assert(screenTransitionFor('Home','Coop')==='dungeon','Dungeon entry is distinct');
assert(screenTransitionFor('Coop','Home',true)==='return','Back navigation uses the return preset');
assert(screenTransitionFor('Settings','More',true)==='return','History back remains subtle');
assert(screenTransitionFor('Skills','Skills')==='none','Tab reselection must never animate');
for(const [name,preset] of Object.entries(SCREEN_TRANSITION_PRESETS)){
 assert(preset.durationMs>=0&&preset.durationMs<=250,name+' must not block gameplay');
 assert(preset.startOpacity>=0&&preset.startOpacity<=1,name+' opacity is valid');
}
assert(SCREEN_TRANSITION_PRESETS.none.durationMs===0&&SCREEN_TRANSITION_PRESETS.none.startOpacity===1,'Initial rendering stays instant');
console.log('PASS screen transition selection, durations, and no-op policy');
