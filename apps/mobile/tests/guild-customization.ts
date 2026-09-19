import {DEFAULT_GUILD_BANNER_ID,GUILD_BANNERS,GUILD_FRAMES,GUILD_NAME_COLORS,guildCosmeticUnlockLabel,isGuildCosmeticUnlocked,normalizeGuildBannerId,normalizeGuildFrameId,normalizeGuildMotto,normalizeGuildNameColorId,normalizeGuildNameplateId} from '../src/core/guild-customization';

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
equal(GUILD_BANNERS.length,8,'All supplied base banners must be present');
equal(GUILD_FRAMES.length,9,'All supplied progression borders must be present');
equal(GUILD_NAME_COLORS.length,9,'All supplied name colors must be present');
equal(normalizeGuildNameColorId('name_amethyst'),'name_amethyst','Valid name color must be preserved');
equal(isGuildCosmeticUnlocked({type:'guild_level',level:5},{guildLevel:4,bannerGalleryTier:0,pveAchievementIds:[]}),false,'Level cosmetic must stay locked');
equal(isGuildCosmeticUnlocked({type:'guild_level',level:5},{guildLevel:5,bannerGalleryTier:0,pveAchievementIds:[]}),true,'Level cosmetic unlock boundary');
equal(guildCosmeticUnlockLabel({type:'banner_gallery_tier',tier:4}),'Banner Gallery Tier 4','Unlock label');
console.log('PASS: guild customization IDs and motto normalization are stable');
