const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const app=read('App.tsx');
const more=read('src/screens/MoreScreen.tsx');
const screen=read('src/screens/NewUnlocksScreen.tsx');
const storage=read('src/storage/unlock-inbox.ts');
const core=read('src/core/unlock-inbox.ts');
const account=read('src/i18n/account.ts');
const rewardInbox=read('src/screens/RewardsInboxScreen.tsx');
assert.ok(rewardInbox.includes('blockedClaims[row.id]')&&rewardInbox.includes("a('CLAIM BLOCKED')")&&rewardInbox.includes('setBlockedClaims(previous=>'),'Reward inbox must keep item-specific server blocker reasons visible while allowing retry');
assert.ok(account.includes('"CLAIM BLOCKED":'),'Reward inbox blocker label must have translated copy');
const notifications=read('src/core/navigation-notifications.ts');
assert(!app.includes('<CustomizationUnlockPopup'),'Cosmetic rewards must never trigger an interrupting unlock popup');
assert(!app.includes('customizationUnlocks.length'),'Cosmetic rewards should not hold tutorial or Whats New priority');
assert(app.includes("newlyUnlockedProfileRewards(before,next)")&&app.includes("newlyUnlockedProfileIcons(before,next)"),'Existing title/background/border/icon detection remains intact');
assert(app.includes('newlyUnlockedOtherCosmetics(before,next)'),'Pets, emotes and guild cosmetics are saved to the same inbox');
assert(app.includes('if(saved)queueCustomizationUnlocks(restored,next)'),'Offline settlement rewards are captured');
assert(app.includes('before.createdAtMs===next.createdAtMs)queueCustomizationUnlocks(before,next)'),'Server refreshes detect newly earned rewards without cross-account noise');
assert(app.includes('queueCustomizationUnlocks(before,result.state)')&&app.includes('queueCustomizationUnlocks(current,next)'),'Online and offline gameplay changes continue recording unlocks');
assert(app.includes("tab==='NewUnlocks'&&<NewUnlocksScreen"),'The Account unlock inbox is reachable as a real route');
assert(app.includes("loadProfileAttentionKeys(profileAttentionScope)")&&app.includes('legacyUnreadUnlockEntries(keys,state,Date.now())'),'Previously unread unlock keys migrate without being dropped');
assert(app.includes('await addUnlockInboxEntries(profileAttentionScope,legacy);await clearProfileAttentionKeys(profileAttentionScope)'),'Legacy markers are cleared only after successful migration');
assert(app.includes("tab!=='NewUnlocks'||!unlockInboxLoaded"),'Opening the inbox is what marks messages as read');
assert(!app.includes("tab!=='ProfileCustomize'||!profileAttentionKeys.length"),'Profile editing must not silently erase the unlock inbox');
assert(app.includes("const viewing=tabRef.current==='NewUnlocks'"),'Cosmetics earned while the inbox is open are reviewed in place');
assert(more.includes("items:['Activity','Profile','NewUnlocks'"),'Account visibly links to the unlock history');
assert(more.includes('newUnlockCount={')===false&&more.includes("id==='NewUnlocks'&&newUnlockCount>0"),'Unread badge belongs to New Unlocks');
assert(app.includes('newUnlockCount={unreadUnlockCount(unlockInbox)}'),'The badge count uses saved inbox entries');
assert(screen.includes('filtered.slice(0,20)')&&screen.includes('Show older unlocks')&&screen.includes('setShowAll(false)'),'History remains bounded after category filtering and resets the page on filter changes');
assert(screen.includes("onCustomize"),'Unlock list links to existing profile customization');
assert(!screen.includes("pet:'COSMETIC PET'")&&screen.includes("row.kind!=='pet'?<Text style={s.kind}")&&screen.includes('unlockInboxDisplayName(row)'),'Pet cards show the canonical pet name without the redundant cosmetic pet label');
assert(screen.includes("emote:'EMOTE'")&&screen.includes("guild_cosmetic:'GUILD COSMETIC'"),'Other cosmetic kinds retain readable labels');

assert(screen.includes("import {unlockInboxArtwork} from '../theme/unlock-inbox-art'")&&screen.includes('const art=unlockInboxArtwork(row)'),'Each unlock row looks up the earned cosmetic artwork');
assert(screen.includes("art?<Image accessible={false} source={art}")&&screen.includes('<UiIcon name={icons[row.kind]} size={27}/>'),'Actual cosmetic art renders first and a themed icon remains the fallback');
assert(screen.includes("row.kind==='background'?'cover':'contain'"),'Backgrounds crop to thumbnail while pets, frames and icons remain visible');
const artwork=read('src/theme/unlock-inbox-art.ts');
assert(artwork.includes("row.key.startsWith(prefix)")&&artwork.includes("row.key.slice(prefix.length)"),'Artwork lookup uses canonical kind:id keys, preserving colons in profile icon IDs');
for(const resolver of ['profileIconArtwork(id)','profileBackgroundPreviewById.get(id)?.source','profileBorderSourceById.get(id)','petArtSource(id)','chatEmoteArtwork(id)','guildTokenShopOfferArt(id)','guildBannerSourceByKey.get(id)','guildBorderSourceByKey.get(id)','guildNameplateSourceByKey.get(id)']){
 assert(artwork.includes(resolver),'Unlocked artwork must reuse existing production art source '+resolver);
}
assert(artwork.includes("case 'title':")&&artwork.includes('return undefined;'),'Titles without unique art retain the normal icon fallback');

assert(core.includes("UNLOCK_INBOX_LIMIT=100")&&storage.includes("PREFIX='veldryn.unlock-inbox.v1:'"),'Inbox is capped and account scoped');
assert(storage.includes('queues=new Map<string,Promise<void>>()'),'Concurrent writes must be serialized by scope');
assert(notifications.includes("subroute:'account.new-unlocks'"),'Global notification route points to the new inbox');
for(const key of ['New Unlocks','Recently unlocked','No new unlocks yet','Show older unlocks','Back to Account','{count} new unlocks']){
 assert(account.includes(JSON.stringify(key)+':'),key+' must have six-language copy');
}
console.log('PASS: Profile and cosmetic rewards use Account New Unlocks instead of popups');
