import {FROSTFALL_GUILD_COSMETIC_IDS,GUILD_BACKGROUNDS,guildCosmeticVisible,normalizeGuildBackgroundId,DEFAULT_GUILD_BANNER_ID,GUILD_BANNERS,GUILD_FRAMES,GUILD_NAME_COLORS,visibleGuildNameColors,guildCosmeticUnlockLabel,isGuildCosmeticUnlocked,normalizeGuildBannerId,normalizeGuildFrameId,normalizeGuildMotto,normalizeGuildNameColorId,normalizeGuildNameplateId} from '../src/core/guild-customization';

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
equal(GUILD_BANNERS.filter(x=>x.unlock.type!=='event'&&x.unlock.type!=='construction').length,8,'All supplied base banners must be present');
equal(GUILD_FRAMES.filter(x=>x.unlock.type!=='event'&&x.unlock.type!=='construction').length,9,'All supplied progression borders must be present');
equal(GUILD_NAME_COLORS.length,3,'Basic, Veilbreak and release-gated Frostfall colors exist');
equal(normalizeGuildNameColorId('name_amethyst'),'name_ivory','Valid name color must be preserved');
equal(isGuildCosmeticUnlocked({type:'guild_level',level:5},{guildLevel:4,bannerGalleryTier:0,pveAchievementIds:[]}),false,'Level cosmetic must stay locked');
equal(isGuildCosmeticUnlocked({type:'guild_level',level:5},{guildLevel:5,bannerGalleryTier:0,pveAchievementIds:[]}),true,'Level cosmetic unlock boundary');
equal(guildCosmeticUnlockLabel({type:'banner_gallery_tier',tier:4}),'Banner Gallery Tier 4','Unlock label');
const constructionBanner=GUILD_BANNERS.find(x=>x.id==='guild_banner_stormwatch')!;
const constructionFrame=GUILD_FRAMES.find(x=>x.id==='guild_frame_verdant')!;
const craftState={guildLevel:10,bannerGalleryTier:0,pveAchievementIds:[]};
equal(isGuildCosmeticUnlocked(constructionBanner.unlock,craftState),false,'Construction banner is not free');
equal(isGuildCosmeticUnlocked(constructionBanner.unlock,{...craftState,constructionReleasedIds:['guild_banner_stormwatch']}),false,'Art release never grants unearned Guild rewards');
equal(isGuildCosmeticUnlocked(constructionBanner.unlock,{...craftState,constructionUnlockIds:['guild_banner_stormwatch']}),false,'Completed Guild structure remains locked until artwork release');
equal(isGuildCosmeticUnlocked(constructionBanner.unlock,{...craftState,constructionUnlockIds:['guild_banner_stormwatch'],constructionReleasedIds:['guild_banner_stormwatch']}),true,'Constructed Guild art requires both ownership and release');
equal(isGuildCosmeticUnlocked(constructionFrame.unlock,craftState),false,'Constructed frame remains separately locked');

console.log('PASS: guild customization IDs and motto normalization are stable');

const base={guildLevel:10,bannerGalleryTier:5,pveAchievementIds:['guild_pve_raid_hard_clear']};
equal(visibleGuildNameColors(base).length,1,'Level and raid achievements do not reveal colors');
equal(visibleGuildNameColors({...base,eventCosmeticIds:['name_halloween_orange']}).length,2,'Earned event color remains visible');
equal(normalizeGuildNameColorId('name_frost'),'name_ivory','Future ice color remains unavailable');

const revealed={...base,revealedEventColorIds:['name_halloween_orange']};
equal(visibleGuildNameColors(revealed).length,2,'Previously released event color is shown');
equal(isGuildCosmeticUnlocked(GUILD_NAME_COLORS[1].unlock,revealed),false,'Showing a released color does not unlock it');
equal(isGuildCosmeticUnlocked(GUILD_NAME_COLORS[1].unlock,{...revealed,eventCosmeticIds:['name_halloween_orange']}),true,'Milestone ownership permits selection');

const seasonal=[...GUILD_BACKGROUNDS,...GUILD_BANNERS,...GUILD_FRAMES,...GUILD_NAME_COLORS].filter(row=>FROSTFALL_GUILD_COSMETIC_IDS.some(id=>id===row.id));
equal(seasonal.length,4,'Four independent Frostfall slots');
for(const row of seasonal){
 equal(guildCosmeticVisible(row.id,base),false,'Unreleased, unowned reward stays hidden');
 equal(isGuildCosmeticUnlocked(row.unlock,{...base,eventCosmeticIds:[row.id]}),false,'Ownership without art release stays locked');
 equal(isGuildCosmeticUnlocked(row.unlock,{...base,releasedEventCosmeticIds:[row.id]}),false,'Art release without ownership stays locked');
 equal(isGuildCosmeticUnlocked(row.unlock,{...base,eventCosmeticIds:[row.id],releasedEventCosmeticIds:[row.id]}),true,'Owned released reward is equippable');
}
equal(normalizeGuildBackgroundId('background_frostfall_winter_aurora_2026'),'background_frostfall_winter_aurora_2026','Permanent background round trip');
equal(normalizeGuildBannerId('banner_frostfall_standard_2026'),'banner_frostfall_standard_2026','Permanent banner round trip');
equal(normalizeGuildFrameId('border_frostfall_frozen_majesty_2026'),'border_frostfall_frozen_majesty_2026','Permanent frame round trip');
equal(normalizeGuildNameColorId('name_frostfall_aurora_2026'),'name_frostfall_aurora_2026','Permanent color round trip');
