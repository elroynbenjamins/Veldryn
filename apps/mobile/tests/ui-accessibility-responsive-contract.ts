export {};
const fs=require('fs') as {readFileSync:(path:string,encoding:string)=>string};
function ok(value:boolean,message:string){if(!value)throw new Error(message)}
const read=(path:string)=>fs.readFileSync(path,'utf8');

const button=read('src/components/GameButton.tsx');
ok(button.includes('touchTargetMin')&&button.includes('compact:{minHeight:touchTargetMin'),'Compact buttons must retain the 44px minimum touch target');

const feedback=read('src/components/ActionFeedback.tsx');
ok(feedback.includes("action:{minHeight:44"),'Actionable feedback must retain a 44px action touch target');
ok(feedback.includes('useWindowDimensions')&&feedback.includes("stackAction=!!actionLabel&&!!onAction&&(width<360||fontScale>=1.25)"),'Actionable feedback must adapt to narrow phones and large text');
ok(feedback.includes('rootStack')&&feedback.includes("actionStack:{width:'100%'}"),'Actionable feedback must stack its action instead of squeezing the message');
ok(feedback.includes('accessibilityHint="Continues from this feedback"'),'Actionable feedback must explain the continuation action to assistive technology');

const confirm=read('src/components/ConfirmModal.tsx');
ok(confirm.includes('useWindowDimensions')&&confirm.includes("stackActions=width<360||fontScale>=1.25"),'Confirm dialogs must adapt actions for narrow phones and large text');
ok(confirm.includes('actionsStack')&&confirm.includes("actionStack:{flex:0,width:'100%'}"),'Confirm dialog actions must stack full-width instead of squeezing');

const profilePreview=read('src/components/ProfileAudiencePreviewModal.tsx');
ok(profilePreview.includes('useWindowDimensions')&&profilePreview.includes("stackLayout=width<360||fontScale>=1.25"),'Profile audience preview must adapt tabs and rows for narrow phones and large text');
ok(profilePreview.includes('audiencesStack')&&profilePreview.includes('rowValueStack'),'Profile audience tabs and highlight rows must stack when constrained');

const modal=read('src/components/GameModalSurface.tsx');
ok(modal.includes('KeyboardAvoidingView'),'Shared modals must protect focused fields from the iOS keyboard');
ok(modal.includes('onAccessibilityEscape={onClose}'),'Shared modals must support the accessibility escape gesture');
ok(modal.includes('accessible={false}')&&modal.includes('no-hide-descendants'),'Modal backdrops must not become redundant screen-reader focus targets');
ok(modal.includes("Platform.OS==='ios'?'padding':'height'"),'Shared modals must avoid Android keyboard overlap');

const reward=read('src/components/RewardPopup.tsx');
ok(reward.includes('useSafeAreaInsets')&&reward.includes('statusBarTranslucent'),'Reward results must honor modal safe areas on edge-to-edge devices');
ok(reward.includes('useWindowDimensions')&&reward.includes('rewardActionsStack'),'Reward follow-up actions must stack on narrow phones or large text');
ok(reward.includes('accessibilityViewIsModal')&&reward.includes('onAccessibilityEscape={onClose}'),'Reward results must expose modal accessibility semantics');

const chatPlayer=read('src/components/ChatPlayerSheet.tsx');
ok(chatPlayer.includes('useWindowDimensions')&&chatPlayer.includes("stackActions=width<360||fontScale>=1.25"),'Chat player actions must adapt to narrow phones and large text');
ok(chatPlayer.includes('actionsStack')&&chatPlayer.includes("actionStack:{flex:0,width:'100%',minWidth:0}"),'Chat player actions must stack full-width instead of squeezing');
ok(chatPlayer.includes("blockButton:{minWidth:76,minHeight:44")&&chatPlayer.includes("reportButton:{minWidth:76,minHeight:44"),'Chat moderation actions must retain 44px touch targets');

const forgeResult=read('src/components/ForgeResultFeedback.tsx');
ok(forgeResult.includes('useWindowDimensions')&&forgeResult.includes('actionsStack'),'Forge result actions must remain reachable on narrow or large-text layouts');
const travelModal=read('src/components/TravelRegionModal.tsx');
ok(travelModal.includes('useWindowDimensions')&&travelModal.includes('actionsStack'),'Travel actions must remain reachable on narrow or large-text layouts');

const gemCodex=read('src/components/GemCodexModal.tsx');
ok(gemCodex.includes("filter:{minHeight:44"),'Gem Codex type filter must retain the 44px touch minimum');
ok(gemCodex.includes('accessibilityHint="Cycles between all, Stat and Effect Gems"'),'Gem Codex filter must explain its cycling behavior to assistive technology');

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

const world=read('src/screens/WorldScreen.tsx');
ok(world.includes("title:'Combat World Boss'")&&world.includes("title:'Mining World Boss'")&&world.includes("title:'Fishing World Boss'")&&world.includes("title:'Woodcutting World Boss'"),'World must expose all four planned World Boss previews');
ok(world.includes('IN DEVELOPMENT')&&world.includes("futureGrid:{flexDirection:'row',flexWrap:'wrap'"),'World Boss previews must be clearly disabled and responsive');

ok(account.includes("inDevelopment=id==='Arena'")&&account.includes('disabled={inDevelopment}'),'Arena entry must remain visibly disabled while the mode is in development');
ok(account.includes('IN DEVELOPMENT'),'Account hub must label disabled future destinations');

const guildFuture=read('src/screens/GuildScreen.tsx');
ok(guildFuture.includes("'Guild vs Guild'")&&guildFuture.includes("'Guild Raids'")&&guildFuture.includes("'Guild Trials'")&&guildFuture.includes("'Guild Expeditions'")&&guildFuture.includes("'Guild Legacy'"),'Guild must expose the approved future-content previews');
ok(guildFuture.includes("onlineSection==='Future'?<GuildFutureContent/>"),'Guild future content must have a dedicated destination');
const guildHall=read('src/components/OnlineGuildHallPanel.tsx');
ok(guildHall.includes('Future Guild Legacy will preserve major trophies and season records permanently.'),'Guild Hall Trophy Room must explain its future Guild Legacy relationship');

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
ok((guild.match(/keyboardShouldPersistTaps="handled"/g)??[]).length>=3&&guild.includes('keyboardDismissMode="on-drag"'),'Guild directory, chat and customization controls must remain tappable while their child fields have the keyboard open');

const social=read('src/screens/SocialScreen.tsx');
ok(social.includes('keyboardShouldPersistTaps="handled"')&&social.includes('keyboardDismissMode="on-drag"'),'Social recruitment filters must not consume the first tap while search/tag fields are focused');

const profileCustomize=read('src/screens/ProfileCustomizeScreen.tsx');
ok(profileCustomize.includes('keyboardShouldPersistTaps="handled"')&&profileCustomize.includes('keyboardDismissMode="on-drag"'),'Profile customization must keep preview, preset and save controls responsive with the keyboard open');

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
