import {characterNameError,guildNameError,normalizeCharacterName,normalizeGuildName} from '../src/core/identity-names';

function fail(message:string):never{throw new Error(message)}
function equal(actual:unknown,expected:unknown,message:string){if(actual!==expected)fail(message+': expected '+String(expected)+', got '+String(actual))}
function ok(value:unknown,message:string){if(!value)fail(message)}

equal(normalizeCharacterName("  O’Connor  "),"O'Connor",'Smart apostrophe normalizes to ASCII apostrophe');
equal(normalizeCharacterName('Anne–Marie'),'Anne-Marie','Smart dash normalizes to hyphen');
equal(normalizeGuildName('  Silver   Wardens  '),'Silver Wardens','Repeated spaces normalize');
equal(normalizeCharacterName('Ａelric'),'Aelric','Compatibility-width Latin normalizes');

for(const name of ['Aelric','Éowyn','Łukasz','Anne-Marie',"O'Connor",'Van Helsing','Ștefan']){
 equal(characterNameError(name),'','Valid Latin character name: '+name);
}
for(const name of ['🔥Mage','Aelric_','Aelric123','Aelric!','Борис','李雷','A--B',"O''Brien",'@Admin','A.elric']){
 ok(characterNameError(name),'Reject unsafe character name: '+name);
}
equal(characterNameError('A'),'Use at least 2 characters.','Character minimum length');
ok(characterNameError('A'.repeat(21)),'Character maximum length');

for(const name of ['Silver Wardens','L’Égide','Dawn-Keepers'])equal(guildNameError(name),'','Valid Guild name: '+name);
for(const name of ['GG','Raiders🔥','Guild_One','Guild123','騎士団','Raiders & Co'])ok(guildNameError(name),'Reject unsafe Guild name: '+name);

console.log('PASS: normalized Latin-only character and Guild identity names');
