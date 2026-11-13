'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=path=>fs.readFileSync(path,'utf8');

const pager=read('src/components/OptionPager.tsx');
assert.ok(pager.includes('live.current.options.length>1'),'A one-option pager must not steal scroll gestures');
assert.ok(pager.includes('dotTarget:{width:30,height:30'),'Category dots need a usable touch surface');
assert.ok(pager.includes('hitSlop={6}'),'Category dots should have a wider hit area');
assert.ok(pager.includes('railWidth>=options.length*30'),'Nine tier dots must change to a counter rather than overflow a narrow panel');
assert.ok(pager.includes('if(reduceMotion){drag.setValue(0);return;}'),'Reduced motion must settle instantly instead of springing');

const wardrobe=read('src/components/profile/ProfileWardrobeChips.tsx');
assert.ok(wardrobe.includes('accessibilityRole="progressbar"'),'Wardrobe completion needs a screen-reader progress value');

const profile=read('src/screens/ProfileCustomizeScreen.tsx');
assert.ok(profile.includes('minimumFontScale={0.8}'),'Compact profile tabs must adapt to large font settings');
assert.ok(profile.includes('<Text numberOfLines={2} style={s.toastText}'),'Equipped cosmetic names must not be clipped to one line');

const showcase=read('src/components/profile/ProfileShowcasePanel.tsx');
assert.ok(showcase.includes('const pickerEmpty='),'Showcase pickers should show a helpful empty state');
assert.ok(showcase.includes('accessibilityRole="button" disabled={disabled} accessibilityState={{selected,disabled}}'),'Multi-picker choices must announce selected and disabled states');
assert.ok(showcase.includes('accessibilityState={{selected:value.favoriteCompanionId===row.id}}'),'Companion picker should announce the selected favorite');
const profileCopy=read('src/i18n/profile.ts');
assert.ok(profileCopy.includes('"No entries unlocked for this showcase yet."'),'Empty showcase copy must be translated');

const stage=read('src/components/profile/ProfileStage.tsx');
assert.ok(stage.includes('tool:{width:44,height:44'),'Profile stage controls need minimum 44-point touch targets');

const audience=read('src/components/ProfileAudiencePreviewModal.tsx');
assert.ok(audience.includes('reduceMotion={state.settings.reduceMotion}'),'Audience preview modal must respect reduced motion');
assert.ok(audience.includes('stackLayout=width<400||fontScale>=1.2'),'Audience tabs must stack before they collide on narrower phones');
assert.ok(audience.includes('numberOfLines={stack?6:3}'),'Long profile highlights must not be cut off after only two lines');
assert.ok(audience.includes('profileText(language,"No featured achievements")'),'Preview empty labels must respect the active language');

const badges=read('src/components/PlayerBadgeSettings.tsx');
assert.ok(badges.includes("slot==='profile'&&full"),'Full profile showcases need guidance to free a slot');
assert.ok(badges.includes('accessibilityValue={{text:status}}'),'Badge rows should announce their equipped/profile status');

const forge=read('src/components/SmithingCollection.tsx');
assert.ok(forge.includes('width:viewportWidth,fontScale'),'Forge grid should size its first paint to the viewport');
assert.ok(forge.includes('fontScale>=1.6?3:'),'Extra-large text should use a three-column equipment grid');

const shop=read('src/components/coop/DungeonMarksShopView.tsx');
assert.ok(shop.includes('const offerEligible='),'Purchase button visibility should be separate from purchase availability');
assert.ok(shop.includes('{offerEligible?<GameButton'),'An eligible purchase must retain its button while saving');
assert.ok(shop.includes('loading={pending===item.id} disabled={!canPurchase}'),'Pending purchases must show loading and prevent duplicate submits');
assert.ok(shop.includes('disabled={busy||!!pending||refreshing}'),'Shop navigation must not hide active purchase feedback');
assert.ok(shop.includes('requestLock.current=true')&&shop.includes('requestLock.current=false'),'Shop refresh and purchase requests must share one immediate re-entrancy lock');
assert.ok(shop.includes('Processing purchase')&&shop.includes('Not available yet'),'Shop offers must display processing and offline states');

const expeditionShop=read('src/components/ExpeditionShopPanel.tsx');
assert.ok(shop.includes("item.status==='insufficient_marks'?'Need more Marks'")&&shop.includes("item.status==='eligible'"),'Expedition offers must distinguish affordable rewards from insufficient Marks');
assert.ok(shop.includes('requestLock.current')&&shop.includes("offerEligible?"),'Purchase review must retain its lock and eligibility state');
assert.ok(shop.includes('loading={pending===item.id} disabled={!canPurchase}'),'Purchase action should display an in-flight indicator');
assert.ok(expeditionShop.includes('disabled={loading||purchasing} onPress={onBack}')&&expeditionShop.includes('onRefresh={refresh} busy={loading||purchasing}'),'Back navigation and shop controls must not hide a pending purchase state');

const chapters=read('src/components/WorldChapterNavigator.tsx');
assert.ok(chapters.includes('<Text numberOfLines={2} style={s.meta}>'),'Current chapter progress metrics must wrap instead of truncating');
assert.ok(chapters.includes('const here=!!siblingRegion&&siblingRegion.id===current.id;'),'Only a travelled-to sibling region should be marked HERE: chapter sub-areas need their own lock-aware compact rows');
assert.ok(chapters.includes('disabled={!access} onPress={()=>onOpenCombat(zone.areaId)}'),'Locked regional areas must not expose active Combat actions');
assert.ok(chapters.includes('disabled={!access} onPress={()=>onOpenSkills(zone.areaId)}'),'Locked regional areas must not expose active Gathering actions');
assert.ok(shop.includes('minimumFontScale={0.85}'),'The Dungeon Shop balance should fit narrow wallet rows');
assert.ok(shop.includes('tab:{flex:1,minHeight:44'),'Shop tabs must meet the 44-point touch minimum');
assert.ok(shop.includes('disabled:busy||!!pending||refreshing'),'Shop tab and card actions must respect an externally busy state');
assert.ok(shop.includes("onPurchase?'Available':'Preview only'"),'A catalogue without purchase wiring must not advertise a buyable offer');

console.log('PASS changed-screen responsive layout, showcase picker accessibility, and single-flight shop feedback');
