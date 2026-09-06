import {CLASS_COMBAT_STYLES} from '../src/core/class-combat';
const entries=Object.entries(CLASS_COMBAT_STYLES);
if(entries.length!==9)throw new Error('Every class needs a combat style');
for(const [id,style] of entries){if(!style.name||!style.description||style.speedMultiplier<=0||style.damageTakenMultiplier<=0||style.recoveryPct<=0)throw new Error(`Invalid combat style ${id}`)}
if(CLASS_COMBAT_STYLES.RAVAGER.speedMultiplier<=CLASS_COMBAT_STYLES.BASTION.speedMultiplier)throw new Error('Class identities are not distinct');
console.log(`PASS: ${entries.length} class combat identities`);
