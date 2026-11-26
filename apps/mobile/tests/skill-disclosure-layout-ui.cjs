const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const source=path=>readFileSync('src/'+path,'utf8');
const gathering=source('components/GatheringActivityList.tsx');
const tools=source('components/GatheringToolArtwork.tsx');
const toolPanel=source('components/GatheringToolLoadoutPanel.tsx');
const skills=source('screens/SkillsScreen.tsx');
const exploration=source('components/ExplorationPanel.tsx');
const disclosure=source('components/DisclosureControl.tsx');
const recipes=source('components/RecipeCard.tsx');
const workshop=source('components/ConsumableWorkshop.tsx');
const calendar=source('components/AnnualEventCalendarPanel.tsx');
const browser=source('dev/BrowserReview.tsx');

assert.match(gathering,/numberOfLines=\{2\} style=\{s\.name\}/,
 'Gathering title must wrap instead of covering the HERE badge or XP');
assert.match(gathering,/s\.metaLine/, 'HERE must live in a separate, responsive metadata row');
assert.match(gathering,/s\.locationMeta/, 'Current-region/location metadata is preserved');
assert.match(gathering,/inCurrentRegion\?gt\('Here'\):regionName/, 'The current region still receives its localized Here marker');
assert.match(gathering,/<DisclosureControl label=\{gt\('Drops'\)\}/, 'Drops use labeled disclosure');
assert.doesNotMatch(gathering,/>\{expanded\?'⌃':'⌄'\}/, 'No tiny chevron-only Drops toggles');
assert.match(tools,/size-inset\*2/, 'Tool icons fit within frames with real breathing room');
assert.match(skills,/<GatheringToolLoadoutPanel state=\{state\} skillId=\{gatheringSkill\}/,
 'Gathering skills must use the reviewed tier-first tool panel');
assert.match(toolPanel,/small=width<360\|\|fontScale>=1\.3/,
 'Tool tiers must scale for narrow phones and large text');
assert.match(toolPanel,/tier:\{minWidth:0,minHeight:72/,
 'Tier buttons need full-size touch targets without overflowing narrow screens');
assert.match(toolPanel,/const \[opened,setOpened\]=useState<Tier\|null>\(null\)/,
 'Only the four tier selectors should be visible before a player inspects a tier');
assert.match(toolPanel,/accessibilityState=\{\{expanded:opened===tool\.tier\}\}/,
 'Each tier must announce expanded/collapsed state');
assert.match(toolPanel,/minHeight:44/,
 'Tier details and tabs must preserve minimum 44px touch targets');
assert.match(disclosure,/minHeight:44/, 'Disclosure actions must be large enough for touch');
assert.match(disclosure,/accessibilityState=\{\{expanded\}\}/,
 'Disclosure state must be available to assistive technology');
assert.match(recipes,/<DisclosureMark expanded=\{expanded\}/, 'Recipes use shared disclosure');
assert.match(workshop,/<DisclosureMark expanded=\{isExpanded\}/, 'Alchemy details use shared disclosure');
assert.match(calendar,/<DisclosureMark expanded=\{calendarOpen\}/, 'Annual calendar uses shared disclosure');
assert.match(exploration,/const currentRoutes=EXPLORATION_ROUTES\.filter/,
 'Default Exploration list is current region first');
assert.match(exploration,/<DisclosureControl label=\{\(showOtherRegions/,
 'Other exploration regions are behind a labeled disclosure');
assert.match(browser,/id:'frostfall-preview'/, 'Frostfall staged teaser can be reviewed in hosted QA');
console.log('PASS: mobile gathering, fishing tools, disclosure controls, exploration and Frostfall review layouts');
