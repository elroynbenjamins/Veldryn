import {
 COLLECTIBLE_PLAYER_BADGE_IDS,SUPPORTER_BADGE_IDS,MAX_EQUIPPED_PLAYER_BADGES,MAX_FEATURED_PLAYER_BADGES,
 normalizePlayerBadges,playerBadgeIds,profileBadgeIds,validatedFeaturedBadges,supporterTierMonths,
 canEquipSupporterBadge,type PlayerBadgeIdentity,
} from '../src/core/player-badges';
function ok(value:unknown,message:string){if(!value)throw new Error(message);}
const now=1000;
const snapshot=(staff:PlayerBadgeIdentity['staff'],supporter:boolean):PlayerBadgeIdentity=>({staff,supporter,validUntilMs:2000});
ok(playerBadgeIds(snapshot('admin',true),now).join(',')==='admin,supporter','legacy staff and Supporter coexist');
ok(playerBadgeIds(snapshot('moderator',false),now).join(',')==='moderator','hidden Supporter leaves staff visible');
ok(playerBadgeIds(snapshot(null,true),now).join(',')==='supporter','legacy Supporter remains visible');
ok(playerBadgeIds(snapshot(null,false),now).length===0,'ordinary player has no badge');
ok(playerBadgeIds(snapshot('admin',true),2000).length===0,'expired cache fails closed');
ok(MAX_EQUIPPED_PLAYER_BADGES===1,'one elective badge by design');
ok(COLLECTIBLE_PLAYER_BADGE_IDS.length===6,'all current earned badges still exist');
ok(SUPPORTER_BADGE_IDS.join(',')==='supporter,supporter_3m,supporter_6m,supporter_12m','four cosmetic Supporter tiers');

ok(playerBadgeIds({...snapshot(null,false),extras:['founder','beta_tester']},now).join(',')==='founder','legacy double selection collapses safely to one');
ok(playerBadgeIds({...snapshot('admin',true),extras:['founder','beta_tester']},now).join(',')==='admin,founder','staff badge appears separately');
ok(playerBadgeIds({...snapshot(null,true),extras:['veteran','guild_leader']},now).join(',')==='veteran','earned single badge takes precedence over legacy Supporter');
ok(playerBadgeIds(normalizePlayerBadges({staff:null,supporter:true,extras:['admin','founder','founder','event_champion'],validUntilMs:2000}),now).join(',')==='founder','no fake admin or double collectibles');

for(const [tier,id] of [[1,'supporter'],[3,'supporter_3m'],[6,'supporter_6m'],[12,'supporter_12m']] as const){
 ok(canEquipSupporterBadge(id,true,tier),'verified active Supporter unlocks its earned tier');
 ok(!canEquipSupporterBadge(id,false,tier),'expired Supporter cannot equip tier');
 const identity=normalizePlayerBadges({staff:'admin',supporter:true,supporterAvailable:true,supporterTierMonths:tier,equippedBadgeId:id,extras:[],validUntilMs:2000});
 ok(playerBadgeIds(identity,now).join(',')==='admin,'+id,'tier badge is actually projected next to staff badge');
}
ok(!canEquipSupporterBadge('supporter_3m',true,1),'cannot claim three-month art with one month of tenure');
ok(!canEquipSupporterBadge('supporter_12m',true,6),'cannot claim twelve-month art at six months');
ok(!canEquipSupporterBadge('supporter_6m',true,3),'cannot claim six-month art at three months');
ok(supporterTierMonths(12,false)===0&&supporterTierMonths(12,true)===12,'active status gates tier presentation');

ok(playerBadgeIds(normalizePlayerBadges({staff:null,supporter:false,supporterAvailable:true,supporterTierMonths:6,equippedBadgeId:'founder',extras:['founder'],validUntilMs:2000}),now).join(',')==='founder','Supporter tier history does not force supporter badge to display');
const normalized=normalizePlayerBadges({staff:null,supporter:false,supporterAvailable:true,supporterTierMonths:6,equippedBadgeId:'founder',extras:['founder'],validUntilMs:2000});
ok(normalizePlayerBadges(normalized)?.supporterTierMonths===6,'normalization must preserve verified Supporter status while wearing a collectible');
ok(playerBadgeIds(normalizePlayerBadges({staff:null,supporter:true,supporterAvailable:true,supporterTierMonths:1,equippedBadgeId:'supporter_6m',extras:[],validUntilMs:2000}),now).length===0,'unearned tier cannot be spoofed by trusted-shape input');
ok(playerBadgeIds(normalizePlayerBadges({staff:null,supporter:false,supporterAvailable:false,supporterTierMonths:6,equippedBadgeId:'supporter_3m',extras:[],validUntilMs:2000}),now).length===0,'expired Supporter can no longer wear tier');
ok(playerBadgeIds(normalizePlayerBadges({staff:'moderator',supporter:true,supporterAvailable:true,equippedBadgeId:null,validUntilMs:2000}),now).join(',')==='moderator','explicit unequip does not disable automatic staff identity');
ok(playerBadgeIds(normalizePlayerBadges({staff:null,supporter:true,supporterAvailable:true,equippedBadgeId:null,validUntilMs:2000}),now).length===0,'explicit unequip wins over legacy auto Supporter');
ok(playerBadgeIds(normalizePlayerBadges({staff:'owner',supporter:'true',validUntilMs:2000}),now).length===0,'unknown staff and loose booleans rejected');
// The profile shelf: three of the player's choosing, in their own order, beside the
// automatic staff mark, while the name row still carries exactly one elective badge.
ok(MAX_FEATURED_PLAYER_BADGES===3,'three profile badges by design');
ok(validatedFeaturedBadges(['beta_tester','founder','admin'],['beta_tester','founder']).join(',')==='beta_tester,founder','a shelf keeps every owned pick and drops staff ids');
ok(validatedFeaturedBadges(['veteran','founder','beta_tester','event_champion'],COLLECTIBLE_PLAYER_BADGE_IDS).join(',')==='veteran,founder,beta_tester','a shelf stops at three and keeps the order it was given');
ok(validatedFeaturedBadges(['beta_tester','founder'],['founder']).join(',')==='founder','a locked pick is dropped without disturbing the rest');
ok(validatedFeaturedBadges(['founder','founder'],['founder']).join(',')==='founder','the same badge cannot fill two shelf slots');
ok(validatedFeaturedBadges('founder',['founder']).length===0&&validatedFeaturedBadges(undefined,['founder']).length===0,'a malformed shelf is empty, not a crash');

const shelf=normalizePlayerBadges({staff:'admin',supporter:true,supporterAvailable:true,supporterTierMonths:6,equippedBadgeId:'founder',extras:['founder'],featured:['supporter_6m','veteran','founder'],validUntilMs:2000});
ok(playerBadgeIds(shelf,now).join(',')==='admin,founder','the name row is unchanged by a three-badge shelf');
ok(profileBadgeIds(shelf,now).join(',')==='supporter_6m,veteran,founder','the profile shelf is exactly what the player featured, in their order');
ok(profileBadgeIds(shelf,2000).length===0,'an expired identity shows no profile badges either');
const tooMany=normalizePlayerBadges({staff:null,supporter:false,featured:['founder','veteran','beta_tester','event_champion'],validUntilMs:2000});
ok(profileBadgeIds(tooMany,now).join(',')==='founder,veteran,beta_tester','a server shelf longer than three is truncated client-side');
const unearnedTier=normalizePlayerBadges({staff:null,supporter:true,supporterAvailable:true,supporterTierMonths:1,featured:['supporter_12m','founder'],validUntilMs:2000});
ok(profileBadgeIds(unearnedTier,now).join(',')==='founder','an unearned Supporter tier cannot be shelved by trusted-shape input');
const lapsed=normalizePlayerBadges({staff:null,supporter:false,supporterAvailable:false,supporterTierMonths:12,featured:['supporter_12m'],validUntilMs:2000});
ok(profileBadgeIds(lapsed,now).length===0,'a lapsed Supporter stops showing a tier star on the profile');
ok(profileBadgeIds(normalizePlayerBadges({staff:null,supporter:false,featured:['admin','moderator','founder'],validUntilMs:2000}),now).join(',')==='founder','a shelf cannot smuggle staff identity');
const noShelf=normalizePlayerBadges({staff:'admin',supporter:true,supporterAvailable:true,supporterTierMonths:1,equippedBadgeId:'supporter',extras:[],validUntilMs:2000});
ok(profileBadgeIds(noShelf,now).length===0&&playerBadgeIds(noShelf,now).join(',')==='admin,supporter','featuring nothing leaves no shelf at all, while the name row is untouched');
ok(profileBadgeIds(normalizePlayerBadges({staff:'moderator',supporter:false,featured:['moderator'],validUntilMs:2000}),now).length===0,'the automatic staff mark is never repeated on the shelf below the name');
ok(profileBadgeIds(undefined,now).length===0,'no identity means no profile badges');
for(const value of [null,[],{staff:'admin'},{staff:'admin',validUntilMs:NaN},{validUntilMs:Infinity},{validUntilMs:'2000'}])
 ok(!normalizePlayerBadges(value),'malformed snapshots rejected');

const fs=require('fs') as {readFileSync:(path:string,encoding:string)=>string};
const read=(path:string)=>fs.readFileSync(path,'utf8');
const oldSql=read('../../backend/supabase/migrations/20260927131912_player_identity_badges.sql');
ok(!oldSql.includes('raw_user_meta_data')&&!oldSql.includes('user_metadata'),'original badge ownership is not taken from user metadata');
ok(oldSql.includes("role='owner'")&&oldSql.includes('private.commerce_entitlements_v1(p_account_id)'),'legacy staff and Supporter derived server-side');
for(const path of ['OnlineWorldChat','OnlinePartyChat','GuildChat','ChatDock','PublicProfileScene','CompactPlayerIdentity','OnlineGuildManagement','PartyHubPanel','RecruitmentListing'])
 ok(read(`src/components/${path}.tsx`).includes('badges='),'badge identity projects to '+path);
for(const path of ['FriendsScreen','RankingsScreen'])
 ok(read(`src/screens/${path}.tsx`).includes('badges='),'public badge identity projects to '+path);

const profile=read('src/components/ProfileEditor.tsx'),screen=read('src/screens/ProfileCustomizeScreen.tsx'),settings=read('src/components/PlayerBadgeSettings.tsx');
ok(profile.includes("'Badges'|'Name Style'")&&profile.includes("tab==='Badges'&&<PlayerBadgeSettings/>"),'Badges are their own appearance tab');
ok(!profile.includes("<PlayerBadgeSettings/>\n   <PlayerNameStyleEditor"),'badge chooser was removed from Name Style');
const chips=read('src/components/profile/ProfileWardrobeChips.tsx'),look=read('src/components/profile/ProfileLookPanel.tsx');
ok(chips.includes("profileT(language,\"Badges\")")&&look.includes('<PlayerBadgeSettings/>'),'Customize Profile reaches the badge chooser from its own category chips');
ok(settings.includes('SUPPORTER_BADGE_IDS.map')&&settings.includes('COLLECTIBLE_PLAYER_BADGE_IDS.map'),'new gallery includes all six collectibles and four supporter tiers');
ok(settings.includes('badges.setEquipped(equipped===id?null:id)'),'single tap replaces or unequips badge');
ok(settings.includes("Staff badges appear automatically"),'staff identity is explained');
// One gallery, two destinations: the name row takes one badge, the profile takes three.
ok(settings.includes("type Slot='name'|'profile'")&&settings.includes('accessibilityRole="radiogroup"'),'the chooser must name its two destinations as a single-choice control');
ok(settings.includes('badges.setProfileBadges([...showcase,id])')&&settings.includes('badges.setProfileBadges(showcase.filter(row=>row!==id))'),'a profile slot is filled and emptied by the same tap');
ok(settings.includes('if(!full)void badges.setProfileBadges')&&settings.includes("maxed?r('FULL')")&&settings.includes('All three profile slots are filled'),'a full shelf explains itself instead of silently ignoring taps');
ok(settings.includes('BESIDE YOUR NAME')&&settings.includes('ON YOUR PROFILE'),'both previews are shown, so the two choices are never confused');
ok(settings.includes('<PlayerBadgeShowcase identity={badges.identity}'),'the profile preview renders the shelf, not the name row');

const art=read('src/components/PlayerBadges.tsx');
for(const id of ['supporter','supporter_3m','supporter_6m','supporter_12m','admin','moderator',...COLLECTIBLE_PLAYER_BADGE_IDS])
 ok(art.includes(`player-badges-v1/${id}.webp`),'badge artwork bundled '+id);
const badgeArt=read('src/components/PlayerBadges.tsx');
ok(badgeArt.includes('export function PlayerBadgeShowcase')&&badgeArt.includes('profileBadgeIds(identity,useBadgeClock(identity))'),'the profile shelf is its own component over the profile projection');
for(const [path,marker] of [['components/PublicProfileScene.tsx','profile.playerBadges'],['components/profile/ProfileStage.tsx','badges.identity'],['components/profile/ProfileShowcasePanel.tsx','badges.identity']] as const)
 ok(read('src/'+path).includes('<PlayerBadgeShowcase identity={'+marker),'the profile badge shelf is shown on '+path);

// The identity column is read against the portrait beside it: the name's line box starts
// on the portrait's top edge and the shelf is pushed down to finish on its bottom edge,
// which is why the showcase card carries no eyebrow above the name any more.
const plateStyles=read('src/theme/profile-showcase-styles.ts');
for(const path of ['components/PublicProfileScene.tsx','components/ProfileScenePreview.tsx']){
 const card=read('src/'+path);
 ok(card.includes('s.identityStack')&&card.includes('<View style={s.identityFill}/>'),'the identity column must be bracketed by the portrait in '+path);
 ok(!card.includes('PLAYER SHOWCASE'),'the eyebrow above the name is gone, so the name starts level with the portrait in '+path);
}
const scene=read('src/components/PublicProfileScene.tsx');
ok(scene.includes('<View style={s.metaRow}>')&&!scene.includes("<Text style={s.power}>COMBAT POWER"),'Combat power must ride on the level line: a line of its own pushed the shelf past the portrait on the card a chat tap opens');
ok(scene.includes('metaInRow:{flexShrink:1,minWidth:0,marginTop:0}')&&scene.includes('power:{flexShrink:0'),'The class name gives way before the combat power number does');
ok(plateStyles.includes('identityStack:{minHeight:96}')&&plateStyles.includes('identityStackCompact:{minHeight:64}')&&plateStyles.includes('identityFill:{flexGrow:1,minHeight:7}'),'the column matches the portrait it sits beside at both portrait sizes, and never crowds the shelf against the level line');

const provider=read('src/online/PlayerBadgeProvider.tsx'),transport=read('src/online/player-badges.ts');
ok(provider.includes('setEquipped')&&transport.includes("request('update_player_equipped_badge_v2'"),'single badge preference is saved via authenticated server RPC');
ok(transport.includes('missingBadgeRpc')&&transport.includes("id==='supporter_3m'||id==='supporter_6m'||id==='supporter_12m'"),'legacy servers only fall back for basic owned badges, never unverified prestige tiers');

const sql=read('../../backend/supabase/migrations/20261110153000_profile_badge_single_equip_supporter_tenure_v2.sql');
ok(sql.includes('private.supporter_badge_progress_v2')&&sql.includes('enable row level security'),'only private account tenure ledger is created');
ok(sql.includes('credited_seconds')&&sql.includes('accruing')&&sql.includes("interval '3 months'")&&sql.includes("interval '6 months'")&&sql.includes("interval '12 months'"),'3, 6 and 12 months require cumulative earned tenure');
ok(sql.includes('refresh_supporter_badge_progress_v2')&&sql.includes('track_paid_supporter_badge_v2')&&sql.includes('track_promo_supporter_badge_v2'),'trusted commerce events update tenure');
ok(sql.includes('BADGE_NOT_OWNED')&&sql.includes('auth.uid()')&&sql.includes('update_player_equipped_badge_v2'),'caller badge ownership is enforced server-side');
ok(!sql.includes('raw_user_meta_data')&&!sql.includes('user_metadata'),'Supporter tier cannot be forged in user metadata');
ok(!sql.includes('grant execute on function public.update_player_equipped_badge_v2(text) to anon'),'badge mutation requires authenticated identity');
ok(sql.includes("cardinality(p_badge_ids)>2")&&sql.includes("p_badge_ids[1]"),'legacy 2-badge clients get one stored badge');

const shelfSql=read('../../backend/supabase/migrations/20261111113000_profile_badge_showcase_v3.sql');
ok(provider.includes('setProfileBadges')&&transport.includes("request('update_player_profile_badges_v3'"),'the profile shelf is saved through its own authenticated RPC');
ok(transport.includes('updateLegacyFeaturedBadges')&&transport.includes("request('update_player_featured_badges_v1'"),'the legacy single-badge writer stays for servers without the shelf');
ok(shelfSql.includes('add column if not exists profile_badge_ids')&&shelfSql.includes('cardinality(profile_badge_ids)<=3'),'the shelf is its own column and cannot exceed three badges');
const allowedStart=shelfSql.indexOf('profile_badge_ids<@array[');
const shelfAllowed=shelfSql.slice(allowedStart,shelfSql.indexOf(']::text[]',allowedStart));
ok(allowedStart>0&&shelfAllowed.includes("'founder'")&&shelfAllowed.includes("'supporter_12m'")
 &&!shelfAllowed.includes("'admin'")&&!shelfAllowed.includes("'moderator'"),'only cosmetic badge ids may be stored on the shelf, never a staff role');
ok(shelfSql.includes('update_player_profile_badges_v3')&&shelfSql.includes('auth.uid()')&&shelfSql.includes('BADGE_NOT_OWNED')&&shelfSql.includes('INVALID_BADGE_SELECTION'),'shelf writes are authenticated and ownership-checked server-side');
ok(shelfSql.includes('count(distinct id)'),'the same badge cannot be stored twice on one shelf');
ok(shelfSql.includes("id='supporter_12m' and v_tier>=12")&&shelfSql.includes('private.supporter_badge_tier_v2'),'a shelved Supporter tier is re-checked against verified tenure');
ok(shelfSql.includes("'featured',to_jsonb(v_profile)")&&shelfSql.includes("'extras',to_jsonb(v_featured)"),'the public identity carries the shelf without dropping the legacy extras field');
ok(!shelfSql.includes('raw_user_meta_data')&&!shelfSql.includes('user_metadata'),'shelf ownership cannot be forged in user metadata');
ok(!shelfSql.includes('to anon'),'shelf mutation requires an authenticated identity');
ok(!shelfSql.includes('set profile_badge_ids=case'),'the shelf is never seeded from the worn badge, which the name row already shows');
console.log('PASS: one badge beside the name, three on the profile, automatic staff, supporter 0/3/6/12 tiers, artwork, authenticated tenure and old-client compatibility');
