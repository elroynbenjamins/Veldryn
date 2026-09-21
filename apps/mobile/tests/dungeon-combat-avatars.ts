import {CLASSES} from '../src/content/classes';
import {DUNGEON_COMBAT_AVATARS,DUNGEON_COMBAT_FORMATION} from '../src/core/dungeon-combat-avatars';

function assert(condition:unknown,message:string):asserts condition{if(!condition)throw new Error(message);}
const avatars=Object.values(DUNGEON_COMBAT_AVATARS);
assert(avatars.length===9,'all nine classes need canonical dungeon combat avatars');
assert(new Set(avatars.map(avatar=>avatar.canonicalSkinId)).size===9,'canonical combat skin IDs must be unique');
assert(avatars.every(avatar=>avatar.canvas.width===512&&avatar.canvas.height===640),'combat avatars must share a 512x640 canvas');
assert(avatars.every(avatar=>avatar.cosmeticPolicy==='class_locked'),'dungeon combat must use class-locked canonical visuals');
assert(avatars.every(avatar=>avatar.facing==='three_quarter_right'),'combat avatars must share one facing convention');
for(const classDef of CLASSES){
 const avatar=DUNGEON_COMBAT_AVATARS[classDef.id];
 assert(Boolean(avatar),`missing dungeon combat avatar for ${classDef.id}`);
 assert(avatar.label===classDef.name,`combat avatar label drifted for ${classDef.id}`);
 assert(avatar.role===classDef.role.toLowerCase(),`combat avatar role drifted for ${classDef.id}`);
 assert(Boolean(avatar.stanceId&&avatar.weaponSilhouette),`combat stance metadata missing for ${classDef.id}`);
}
assert(DUNGEON_COMBAT_FORMATION.tank.length===1,'formation needs one Tank slot');
assert(DUNGEON_COMBAT_FORMATION.damage.length===2,'formation needs two Damage slots');
assert(DUNGEON_COMBAT_FORMATION.support.length===1,'formation needs one Support slot');
console.log('dungeon combat avatar contract OK');
