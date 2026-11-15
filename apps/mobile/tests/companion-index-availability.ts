import {ALL_COMBAT_COMPANIONS,COMBAT_COMPANIONS} from '../src/content/combat-companions';
import {COMPANION_INDEX_COUNTS,UNRELEASED_SEASONAL_COMPANION_COUNT,companionIndexGroup} from '../src/core/companion-index-availability';

const ok=(condition:unknown,message:string)=>{if(!condition)throw new Error(message);};
const count=(group:ReturnType<typeof companionIndexGroup>)=>ALL_COMBAT_COMPANIONS.filter(def=>companionIndexGroup(def)===group).length;
ok(ALL_COMBAT_COMPANIONS.length===38,'38 total designed companions are retained');
ok(COMBAT_COMPANIONS.length===30,'Only 30 released/presented companions appear in the player catalog');
ok(COMPANION_INDEX_COUNTS.available===23,'23 permanently earnable companions');
ok(COMPANION_INDEX_COUNTS.event===3,'3 previously released seasonal companions');
ok(COMPANION_INDEX_COUNTS.comingSoon===12,'12 unreleased companions counted without exposing unreleased event identities');
ok(COMPANION_INDEX_COUNTS.available+COMPANION_INDEX_COUNTS.event+COMPANION_INDEX_COUNTS.comingSoon===ALL_COMBAT_COMPANIONS.length,'Category totals cover authored companions exactly once');
ok(UNRELEASED_SEASONAL_COMPANION_COUNT===8,'8 seasonal companions remain hidden until release');
ok(COMBAT_COMPANIONS.filter(def=>companionIndexGroup(def)==='comingSoon').length===4,'Only the 4 previously visible Ashlands previews may be shown');
ok(COMBAT_COMPANIONS.every(def=>companionIndexGroup(def)!=='event'||def.origin.type==='event'),'Past-event category holds only seasonal event units');
ok(ALL_COMBAT_COMPANIONS.every(def=>companionIndexGroup(def)!=='comingSoon'||def.origin.type==='event'||def.origin.id==='REG_ASHLANDS'),'Upcoming only includes pending events and unreleased regional content');
ok(count('available')===23&&count('event')===3&&count('comingSoon')===12,'All grouping counts match source definitions');
console.log('PASS: Companion Index categories and spoiler-safe upcoming event counts');
