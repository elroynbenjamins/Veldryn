'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');
const popup=read('src/components/RewardPopup.tsx');
const timeline=read('src/components/ActivityQueueResults.tsx');
const icons=read('src/core/activity-icon.ts');
const recipes=read('src/content/cross-profession-components.ts');

// Compact presentation is strictly opt-in for narrow offline reports. The
// standard reward popup (including the Galaxy S24+ layout) stays unchanged.
assert(popup.includes('compactOffline=welcomeBack&&width<400'));
assert(popup.includes('compactOffline&&s.compactCard'));
assert(popup.includes('compactOffline&&s.compactCardContent'));
assert(popup.includes('compact={compactOffline}'));
assert(popup.includes('(!compactOffline||showCompactDetails)&&welcomeReport'));
assert(popup.includes('(!compactOffline||showCompactDetails)&&<View style={s.loot}>'));
assert(popup.includes('accessibilityState={{expanded:showCompactDetails}}'));
assert(popup.includes("compactCard:{maxHeight:'96%'"));

// Compact timeline keeps the normal presentation as its fallback and
// retains access to each activity's loot and queue warnings.
assert(timeline.includes("compact=false}:{reward:RewardBundle;numberMode:'abbreviated'|'exact';compact?:boolean}"));
assert(timeline.includes('if(compact)return <View'));
assert(timeline.includes('<MonsterPortraitFrame monster={monster} size={40} framed={false}/>'));
assert(timeline.includes('<MonsterPortraitFrame monster={monster} size={28} framed={false}/>'));
assert(timeline.includes('reward.pendingQueue?.map'));
assert(timeline.includes('reward.offlineCapReached'));

// In particular, processing cloth bindings must not use the cooking icon.
assert(icons.includes('recipeSkillById.get(targetId)'));
assert(recipes.includes("id:'WEAVE_CLOTH_BINDINGS',name:'Weave Cloth Bindings',skillId:'tailoring'"));

console.log('PASS: compact offline report is width-gated, expandable and preserves tailoring activity art');
