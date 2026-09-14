import {resolveIdentityClass} from '../src/core/social-identity';
import {CLASSES} from '../src/content/classes';
function assert(value:unknown,message:string){if(!value)throw new Error(message);}
for(const c of CLASSES){assert(resolveIdentityClass(c.id)===c.id,'Canonical class id '+c.id);assert(resolveIdentityClass(' '+c.name.toUpperCase()+' ')===c.id,'Display class name '+c.name);}
assert(resolveIdentityClass('Knife-Dancer')==='KNIFE_DANCER','Hyphenated server name');
assert(resolveIdentityClass('Mystery Mage')===undefined,'Unknown class must not invent a hero');
assert(resolveIdentityClass(null)===undefined&&resolveIdentityClass('')===undefined,'Absent class uses neutral identity');
console.log('PASS: all canonical/display class identities and unknown fallbacks');
