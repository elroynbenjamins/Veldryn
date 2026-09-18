import {DEFAULT_GUILD_BANNER_ID,normalizeGuildBannerId,normalizeGuildFrameId,normalizeGuildMotto,normalizeGuildNameplateId} from '../src/core/guild-customization';

function equal(actual:unknown,expected:unknown,message:string){if(actual!==expected)throw new Error(`${message}: expected ${String(expected)}, got ${String(actual)}`)}
equal(normalizeGuildBannerId('phoenix_crimson'),'phoenix_crimson','Valid banner must be preserved');
equal(normalizeGuildBannerId('unknown'),DEFAULT_GUILD_BANNER_ID,'Unknown banner must fall back');
equal(normalizeGuildFrameId('emerald_vine'),'emerald_vine','Valid frame must be preserved');
equal(normalizeGuildFrameId('bad'),'classic','Invalid frame must fall back');
equal(normalizeGuildNameplateId('sapphire_royal'),'sapphire_royal','Valid nameplate must be preserved');
equal(normalizeGuildNameplateId(null),'classic','Invalid nameplate must fall back');
equal(normalizeGuildMotto('  Stronger   together.  '),'Stronger together.','Motto whitespace must normalize');
equal(normalizeGuildMotto(''),'Stronger together.','Empty motto must fall back');
equal(normalizeGuildMotto('x'.repeat(100)).length,80,'Motto must cap at 80 characters');
console.log('PASS: guild customization IDs and motto normalization are stable');
