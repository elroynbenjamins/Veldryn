export {};
const fs=require('fs') as {readFileSync:(path:string,encoding:string)=>string};
function ok(value:boolean,message:string){if(!value)throw new Error(message)}
const read=(path:string)=>fs.readFileSync(path,'utf8');

const button=read('src/components/GameButton.tsx');
ok(button.includes('touchTargetMin')&&button.includes('compact:{minHeight:touchTargetMin'),'Compact buttons must retain the 44px minimum touch target');

const modal=read('src/components/GameModalSurface.tsx');
ok(modal.includes('KeyboardAvoidingView'),'Shared modals must protect focused fields from the iOS keyboard');
ok(modal.includes('onAccessibilityEscape={onClose}'),'Shared modals must support the accessibility escape gesture');
ok(modal.includes('accessible={false}')&&modal.includes('no-hide-descendants'),'Modal backdrops must not become redundant screen-reader focus targets');

const nav=read('src/components/PrimaryNavigation.tsx');
ok(nav.includes("badgeLabel=badge==='dot'?'new activity'"),'Primary navigation must announce dot badges');
ok(nav.includes('notification'),'Primary navigation must announce numeric badge counts');

const input=read('src/components/GameTextInput.tsx');
ok(input.includes('accessibilityState={{...props.accessibilityState,disabled:!editable}}'),'Text inputs must expose disabled state');
ok(input.includes('selectionColor={props.selectionColor??C.selectionLine}'),'Text inputs must keep visible theme-aware selection/caret contrast');

const account=read('src/screens/MoreScreen.tsx');
ok(account.includes('useWindowDimensions')&&account.includes('singleColumn=width<350||fontScale>=1.25'),'Account hub must stack on narrow phones or large text');
ok(account.includes("tileWide:{flexBasis:'100%',minWidth:0}"),'Account tiles must support a full-width responsive mode');
ok(account.includes('accessibilityHint={meta.description}'),'Account tiles must expose descriptions without depending on truncated visual copy');
ok(account.includes('attentionLabel=(id:MoreDestination)'),'Account attention must be announced on the parent navigation tile');

const skills=read('src/screens/SkillsScreen.tsx');
ok(skills.includes('useWindowDimensions')&&skills.includes('stackCards=width<350||fontScale>=1.25'),'Skills hub must stack on narrow phones or large text');
ok(skills.includes("skillCardWide:{width:'100%',minWidth:0}"),'Skills cards must support full-width responsive mode');
ok(skills.includes('accessibilityHint'),'Skill cards must expose an action hint');
ok(skills.includes('modeChip:{minHeight:44'),'Skill mode controls must retain a 44px touch target');
ok(skills.includes('keyboardDismissMode="on-drag"'),'Skills search/crafting flow must dismiss the keyboard on drag');

const quest=read('src/screens/QuestScreen.tsx');
ok(quest.includes('filterChip:{minHeight:44'),'Quest filters must retain a 44px touch target');
ok(quest.includes('accessibilityRole="tab" accessibilityState={{selected}}'),'Quest filter controls must use tab semantics');
ok(quest.includes('keyboardDismissMode="on-drag"'),'Quest search must dismiss the keyboard on drag');

const friends=read('src/screens/FriendsScreen.tsx');
ok(friends.includes('tabChip:{minHeight:44'),'Friends tabs must retain a 44px touch target');
ok(friends.includes('keyboardDismissMode="on-drag"'),'Friends search must dismiss the keyboard on drag');

const guild=read('src/screens/GuildScreen.tsx');
ok(guild.includes('tabChip:{minHeight:44'),'Guild tabs must retain a 44px touch target');
ok(guild.includes('accessibilityLabel={badgeLabel?'),'Guild tab badges must be included in the tab accessibility label');

const achievements=read('src/screens/AchievementsScreen.tsx');
ok(achievements.includes('filter:{minHeight:44'),'Achievement filters must retain a 44px touch target');
ok(achievements.includes('stackRows=width<360||fontScale>=1.25'),'Achievement rows must adapt to narrow phones and large text');
ok(achievements.includes("rowStack:{flexDirection:'column'"),'Achievement actions must stack instead of squeezing text');

const rankings=read('src/screens/RankingsScreen.tsx');
ok(rankings.includes('chip:{minHeight:44'),'Ranking filters must retain a 44px touch target');
ok(rankings.includes('stackRows=width<360||fontScale>=1.25'),'Ranking rows must adapt to narrow phones and large text');
ok(rankings.includes("goldStack:{width:'100%',marginLeft:54,textAlign:'left'}"),'Ranking values must wrap below identity content when space is constrained');

const top=read('src/components/GameTopBar.tsx');
ok(top.includes('accessible accessibilityRole="text" style={styles.hpBlock}'),'Top-bar health must be exposed as one readable accessibility element');
ok(top.includes('gold`} style={styles.goldBlock}'),'Top-bar Gold must be exposed as one readable accessibility element');

console.log('PASS: responsive layouts, touch targets, keyboard behavior and screen-reader semantics remain accessible');
