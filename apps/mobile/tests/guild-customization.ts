import {DEFAULT_GUILD_BANNER_ID,GUILD_BANNERS,GUILD_FRAMES,GUILD_NAME_COLORS,visibleGuildNameColors,guildCosmeticUnlockLabel,isGuildCosmeticUnlocked,normalizeGuildBannerId,normalizeGuildFrameId,normalizeGuildMotto,normalizeGuildNameColorId,normalizeGuildNameplateId} from '../src/core/guild-customization';

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
equal(GUILD_BANNERS.filter(x=>x.unlock.type!=='event').length,8,'All supplied base banners must be present');
equal(GUILD_FRAMES.filter(x=>x.unlock.type!=='event').length,9,'All supplied progression borders must be present');
equal(GUILD_NAME_COLORS.length,2,'Only basic and implemented event color exist');
equal(normalizeGuildNameColorId('name_amethyst'),'name_ivory','Valid name color must be preserved');
equal(isGuildCosmeticUnlocked({type:'guild_level',level:5},{guildLevel:4,bannerGalleryTier:0,pveAchievementIds:[]}),false,'Level cosmetic must stay locked');
equal(isGuildCosmeticUnlocked({type:'guild_level',level:5},{guildLevel:5,bannerGalleryTier:0,pveAchievementIds:[]}),true,'Level cosmetic unlock boundary');
equal(guildCosmeticUnlockLabel({type:'banner_gallery_tier',tier:4}),'Banner Gallery Tier 4','Unlock label');
console.log('PASS: guild customization IDs and motto normalization are stable');

const base={guildLevel:10,bannerGalleryTier:5,pveAchievementIds:['guild_pve_raid_hard_clear']};
equal(visibleGuildNameColors(base).length,1,'Level and raid achievements do not reveal colors');
equal(visibleGuildNameColors({...base,eventCosmeticIds:['name_halloween_orange']}).length,2,'Earned event color remains visible');
equal(normalizeGuildNameColorId('name_frost'),'name_ivory','Future ice color remains unavailable');

const revealed={...base,revealedEventColorIds:['name_halloween_orange']};
equal(visibleGuildNameColors(revealed).length,2,'Previously released event color is shown');
equal(isGuildCosmeticUnlocked(GUILD_NAME_COLORS[1].unlock,revealed),false,'Showing a released color does not unlock it');
equal(isGuildCosmeticUnlocked(GUILD_NAME_COLORS[1].unlock,{...revealed,eventCosmeticIds:['name_halloween_orange']}),true,'Milestone ownership permits selection');
