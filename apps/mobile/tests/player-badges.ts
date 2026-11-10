import {
 COLLECTIBLE_PLAYER_BADGE_IDS,SUPPORTER_BADGE_IDS,MAX_EQUIPPED_PLAYER_BADGES,
 normalizePlayerBadges,playerBadgeIds,validatedFeaturedBadges,supporterTierMonths,
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
ok(SUPPORTER_BADGE_IDS.join(',')==='supporter,supporter_3m,supporter_6m','three cosmetic Supporter tiers');

ok(playerBadgeIds({...snapshot(null,false),extras:['founder','beta_tester']},now).join(',')==='founder','legacy double selection collapses safely to one');
ok(playerBadgeIds({...snapshot('admin',true),extras:['founder','beta_tester']},now).join(',')==='admin,founder','staff badge appears separately');
ok(playerBadgeIds({...snapshot(null,true),extras:['veteran','guild_leader']},now).join(',')==='veteran','earned single badge takes precedence over legacy Supporter');
ok(playerBadgeIds(normalizePlayerBadges({staff:null,supporter:true,extras:['admin','founder','founder','event_champion'],validUntilMs:2000}),now).join(',')==='founder','no fake admin or double collectibles');

for(const [tier,id] of [[1,'supporter'],[3,'supporter_3m'],[6,'supporter_6m']] as const){
 ok(canEquipSupporterBadge(id,true,tier),'verified active Supporter unlocks its earned tier');
 ok(!canEquipSupporterBadge(id,false,tier),'expired Supporter cannot equip tier');
 const identity=normalizePlayerBadges({staff:'admin',supporter:true,supporterAvailable:true,supporterTierMonths:tier,equippedBadgeId:id,extras:[],validUntilMs:2000});
 ok(playerBadgeIds(identity,now).join(',')==='admin,'+id,'tier badge is actually projected next to staff badge');
}
ok(!canEquipSupporterBadge('supporter_3m',true,1),'cannot claim three-month art with one month of tenure');
ok(!canEquipSupporterBadge('supporter_6m',true,3),'cannot claim six-month art at three months');
ok(supporterTierMonths(6,false)===0&&supporterTierMonths(6,true)===6,'active status gates tier presentation');

ok(playerBadgeIds(normalizePlayerBadges({staff:null,supporter:false,supporterAvailable:true,supporterTierMonths:6,equippedBadgeId:'founder',extras:['founder'],validUntilMs:2000}),now).join(',')==='founder','Supporter tier history does not force supporter badge to display');
ok(playerBadgeIds(normalizePlayerBadges({staff:null,supporter:true,supporterAvailable:true,supporterTierMonths:1,equippedBadgeId:'supporter_6m',extras:[],validUntilMs:2000}),now).length===0,'unearned tier cannot be spoofed by trusted-shape input');
ok(playerBadgeIds(normalizePlayerBadges({staff:null,supporter:false,supporterAvailable:false,supporterTierMonths:6,equippedBadgeId:'supporter_3m',extras:[],validUntilMs:2000}),now).length===0,'expired Supporter can no longer wear tier');
ok(playerBadgeIds(normalizePlayerBadges({staff:'moderator',supporter:true,supporterAvailable:true,equippedBadgeId:null,validUntilMs:2000}),now).join(',')==='moderator','explicit unequip does not disable automatic staff identity');
ok(playerBadgeIds(normalizePlayerBadges({staff:null,supporter:true,supporterAvailable:true,equippedBadgeId:null,validUntilMs:2000}),now).length===0,'explicit unequip wins over legacy auto Supporter');
ok(playerBadgeIds(normalizePlayerBadges({staff:'owner',supporter:'true',validUntilMs:2000}),now).length===0,'unknown staff and loose booleans rejected');
ok(validatedFeaturedBadges(['beta_tester','founder','admin'],['beta_tester','founder']).join(',')==='beta_tester','legacy multi-selection normalizes to first owned');
ok(validatedFeaturedBadges(['beta_tester','founder'],['founder']).length===0,'a locked first badge is not silently replaced by a different one');
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
ok(screen.includes('badge'),'profile introduction mentions badges');
ok(settings.includes('SUPPORTER_BADGE_IDS.map')&&settings.includes('COLLECTIBLE_PLAYER_BADGE_IDS.map'),'new gallery includes all six collectibles and three supporter tiers');
ok(settings.includes('badges.setEquipped(equipped===id?null:id)'),'single tap replaces or unequips badge');
ok(settings.includes("staff badges appear automatically".replace('staff','Staff')),'staff identity is explained');

const art=read('src/components/PlayerBadges.tsx');
for(const id of ['supporter','supporter_3m','supporter_6m','admin','moderator',...COLLECTIBLE_PLAYER_BADGE_IDS])
 ok(art.includes(`player-badges-v1/${id}.webp`),'badge artwork bundled '+id);
const provider=read('src/online/PlayerBadgeProvider.tsx'),transport=read('src/online/player-badges.ts');
ok(provider.includes('setEquipped')&&transport.includes("request('update_player_equipped_badge_v2'"),'single badge preference is saved via authenticated server RPC');

const sql=read('../../backend/supabase/migrations/20261110153000_profile_badge_single_equip_supporter_tenure_v2.sql');
ok(sql.includes('private.supporter_badge_progress_v2')&&sql.includes('enable row level security'),'only private account tenure ledger is created');
ok(sql.includes('verified_since')&&sql.includes("interval '3 months'")&&sql.includes("interval '6 months'"),'3 and 6 months require elapsed verified tenure');
ok(sql.includes('refresh_supporter_badge_progress_v2')&&sql.includes('track_paid_supporter_badge_v2')&&sql.includes('track_promo_supporter_badge_v2'),'trusted commerce events update tenure');
ok(sql.includes('BADGE_NOT_OWNED')&&sql.includes('auth.uid()')&&sql.includes('update_player_equipped_badge_v2'),'caller badge ownership is enforced server-side');
ok(!sql.includes('raw_user_meta_data')&&!sql.includes('user_metadata'),'Supporter tier cannot be forged in user metadata');
ok(!sql.includes('grant execute on function public.update_player_equipped_badge_v2(text) to anon'),'badge mutation requires authenticated identity');
ok(sql.includes("cardinality(p_badge_ids)>2")&&sql.includes("p_badge_ids[1]"),'legacy 2-badge clients get one stored badge');
console.log('PASS: one elective badge, automatic staff, supporter 1/3/6 tiers, artwork, new tab, authenticated tenure and old-client compatibility');
