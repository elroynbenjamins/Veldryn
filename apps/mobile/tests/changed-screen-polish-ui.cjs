'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=path=>fs.readFileSync(path,'utf8');

const pager=read('src/components/OptionPager.tsx');
assert.ok(pager.includes('live.current.options.length>1'),'A one-option pager must not steal scroll gestures');
assert.ok(pager.includes('dotTarget:{width:30,height:30'),'Category dots need a usable touch surface');
assert.ok(pager.includes('hitSlop={6}'),'Category dots should have a wider hit area');

const wardrobe=read('src/components/profile/ProfileWardrobeChips.tsx');
assert.ok(wardrobe.includes('accessibilityRole="progressbar"'),'Wardrobe completion needs a screen-reader progress value');

const profile=read('src/screens/ProfileCustomizeScreen.tsx');
assert.ok(profile.includes('minimumFontScale={0.8}'),'Compact profile tabs must adapt to large font settings');
assert.ok(profile.includes('<Text numberOfLines={2} style={s.toastText}'),'Equipped cosmetic names must not be clipped to one line');

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
assert.ok(shop.includes('disabled={!!pending||refreshing}'),'Shop navigation must not hide active purchase feedback');

console.log('PASS responsive profile and forge controls, accessible pager, and dungeon shop pending feedback');
