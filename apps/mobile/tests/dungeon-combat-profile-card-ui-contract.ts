export {};
const fs=require('fs') as {readFileSync:(path:string,encoding:string)=>string};
function ok(value:boolean,message:string){if(!value)throw new Error(message)}
const read=(path:string)=>fs.readFileSync(path,'utf8');

const card=read('src/components/coop/CombatantProfileCard.tsx');
const stage=read('src/components/coop/DungeonCombatStage.tsx');
const art=read('src/theme/dungeon-combat-art.ts');
const enemyArt=read('src/theme/dungeon-enemy-art.ts');
const inspect=read('src/components/coop/CombatantInspectPanel.tsx');

ok(card.includes('useGameTheme'),'Combat profile cards must follow the active UI theme');
ok(card.includes('dungeonCombatPortraitSource'),'Combat cards must bind canonical full-character artwork');
ok(card.includes('identityPlate'),'Combat cards must retain the profile-scene identity plate language');
ok(card.includes('HP')&&card.includes('hpTrack'),'Combat profile cards must prioritize health readability');
ok(card.includes('COMPANION')&&card.includes('ASSIST PROC'),'Combat profile cards must retain owner-bound companion assists');
ok(card.includes('ECHO')&&card.includes('DOWN'),'Combat profile cards must expose dungeon state without social clutter');
ok(!card.includes('profileTitle')&&!card.includes('guildTag'),'Combat cards must not carry biography/title/guild profile clutter into battle');
ok(stage.includes("import {CombatantProfileCard,EnemyCombatProfileCard} from './CombatantProfileCard'"),'Dungeon stage must use profile-derived combat cards');
ok(stage.includes('<CombatantProfileCard')&&stage.includes('<EnemyCombatProfileCard'),'Both party and enemy sides must use the combat profile-card language');
ok(stage.indexOf('<EnemyCombatProfileCard')<stage.indexOf('<CombatantProfileCard'),'Enemy/boss card must render above the party cards on the mobile battlefield');
// The October profile-art refresh deliberately changed the old four-card strip
// to a readable two-column formation. Preserve that scene while testing the
// replay behavior that the visual refresh accidentally removed.
ok(stage.includes("partyField:{width:'100%',flexDirection:'row',flexWrap:'wrap'")&&stage.includes("formationSlot:{width:'48%',flexGrow:1,minWidth:0}"),'Four party combat cards must retain the modern two-column formation');
ok(stage.includes('layout.bossWidthPctFinal')&&stage.includes('layout.bossWidthPct'),'Boss encounter card must retain stronger centered emphasis through the responsive width contract');
ok(!stage.includes('<ClassAvatar'),'Dungeon stage must not regress to the generic initial/weapon combat box');
ok(card.includes('dungeonEnemyPortraitSource(name)'),'Named bosses/enemies must resolve real artwork in the encounter card');
ok(card.includes("boss?'♛':'◆'"),'Unknown enemies must retain a safe visual fallback');
ok(card.includes('bossPhaseLabel')&&card.includes('PHASE'),'Boss card must keep the latest authoritative phase visible');
ok(card.includes('INTERRUPT NOW')&&card.includes('castTrack'),'Interruptible boss casts must be readable inside the encounter card');
ok(card.includes('Animated.View')&&card.includes('feedbackStyle'),'Damage, heal, miss, crit and barrier feedback must support rise/fade animation');
ok(stage.includes('playbackAdvanceDelayMs')&&stage.includes('playbackCastDisplayMs'),'Combat playback must reserve readable time for boss casts');
ok(stage.includes('bossPhaseLabel')&&stage.includes('bossCast={boss?bossCast:undefined}'),'Vertical battlefield must feed phase and cast state into the boss card');
ok(card.includes('AnimatedHealthBar')&&card.includes('animateHealth'),'Combat HP bars must animate between authoritative replay states and honor reduced motion');
ok(card.includes('BARRIER +')&&card.includes('barrierTrack'),'Party combat cards must show active replay-time barriers');
ok(card.includes('boss?st("BOSS HP"):st("HP")')&&card.includes('enemyHpTrack'),'Enemy and boss cards must show localized replay-time HP');
ok(stage.includes('playbackCombatantState')&&stage.includes('currentHp={state?.hp}')&&stage.includes('combatShield={state?.shield??0}'),'Battlefield must drive each replay enemy HP and shield from authoritative snapshots');
ok(stage.includes('ready:state.hp>0')&&stage.includes('currentHp:state.hp'),'Party downed and HP state must follow the current replay cue rather than final run state');
ok(card.includes('LOW')&&card.includes('criticalInline'),'Party cards must call out critical health inline without adding another card row');
ok(card.includes('phaseThreshold')&&card.includes('phase.hpPct'),'Boss HP bar must show authoritative phase threshold markers');
ok(stage.includes('bossPhases={boss?run.bossMechanic?.telegraph?.phases:undefined}'),'Battlefield must pass authoritative boss phase thresholds into the encounter card');
ok(card.includes('CombatStatusStrip')&&card.includes('statusStrip'),'Combat cards must render a compact status-effect strip');
ok(card.includes("return 'DOT'")&&card.includes("return 'HOT'")&&card.includes("'VULN'")&&card.includes("'HEAL↓'")&&card.includes("'HASTE'"),'Status pills must distinguish damage, healing-pressure, healing and common buff states');
ok(card.includes('visibleLimit=Math.max(1,gemProc?limit-1:limit)')&&card.includes('statusOverflow'),'Status strips must cap visible pills by responsive layout budget and show overflow rather than expand the card');
ok(card.includes('Effect Gem proc')&&card.includes('{st("GEM")}'),'Current Effect Gem procs must receive localized compact card feedback without becoming persistent fake buffs');
ok(stage.includes('playbackCombatantStatuses')&&stage.includes('statuses={statuses}'),'Battlefield must resolve status windows independently for enemy and party cards');
ok(card.includes('GEM_STATUS_CODES')&&card.includes("'gem:momentum':'MOM'")&&card.includes("'gem:flow':'FLOW'")&&card.includes("'gem:unyielding':'UNY'"),'Persistent Effect Gem stacks need compact named combat codes');
ok(card.includes("'gem:retaliation_ready':'RETAL'")&&card.includes("'gem:benediction_charge':'BENE'")&&card.includes("'gem:opportunist_ready':'OPP'"),'Ready, charge and harmful Effect Gem states need distinct compact codes');
ok(card.includes("status.source==='gem'")&&card.includes('styles.statusGem'),'Persistent beneficial Effect Gem states must use the gem visual treatment while harmful marks remain harmful');
ok(stage.includes('DUNGEON_PLAYBACK_SPEEDS')&&stage.includes('playbackSpeed')&&stage.includes('1×')===false,'Dungeon replay must use shared 1x/2x/4x speed controls rather than hard-coded timing labels');
ok(stage.includes('accessibilityLabel={st("Skip combat replay to result")}')&&stage.includes('setCueIndex(Math.max(0,cues.length-1))'),'Dungeon replay must offer a localized direct skip-to-result control');
ok(stage.includes('playbackAdvanceDelayMs(current,next,playbackSpeed)')&&stage.includes('playbackCastDisplayMs(currentBossCast,playbackSpeed)'),'Replay speed must scale both cue and boss-cast timing');
ok(stage.includes('playbackVisualDurationMs')&&stage.includes('fxDuration'),'Replay speed must scale combat VFX presentation too');
ok(card.includes('FOCUS →')&&card.includes('bossCast.targetLabel'),'Boss cast card must show the authoritative focus target when available');
ok(stage.includes('targetLabel:currentBossCast.targetName?.trim()'),'Battlefield must feed the cast cue target into the boss focus label');
ok(stage.includes('PARTY CONTRIBUTION')&&stage.includes('Encounter totals')&&stage.includes('replay.contributions??[]'),'Completed combat replay must show factual contribution totals from its authoritative replay');
ok(stage.includes("role==='tank'")&&stage.includes('TAKEN')&&stage.includes("role==='support'")&&stage.includes('HEAL'),'Contribution recap must emphasize role-relevant factual metrics');
ok(stage.includes('DMG')&&stage.includes('INT')&&!stage.includes('MVP'),'Contribution recap must show damage and interrupts without ranking players');
ok(stage.includes('accessibilityLabel={paused?st("Resume combat replay"):st("Pause combat replay")}')&&stage.includes('paused||cueIndex>=cues.length-1'),'Replay must support localized pause/resume by stopping automatic cue advance');
ok(stage.includes('complete?st("ENCOUNTER RECAP"):paused?st("PAUSED"):st("NOW PLAYING")')&&stage.includes('paused?st("▶ Resume"):st("Ⅱ Pause")'),'Paused replay state must be visibly explicit and localized');
ok(stage.includes('accessibilityLabel={showLog?st("Hide combat battle log"):st("Show combat battle log")}')&&stage.includes("recent.length&&(!complete||showLog)"),'Completed replay must collapse the detailed battle log by default');
ok(stage.includes('setPaused(false);setShowLog(false);setCueIndex(0)'),'Replay encounter must reset pause and collapsed-log state');
ok(!stage.includes('member:{minHeight:126')&&!stage.includes('avatarFrame:{height:44')&&!stage.includes('castWarning:{minHeight:34'),'Dungeon stage must not retain obsolete pre-profile-card combat styles');
ok(!card.includes('No companion assist')&&!card.includes('noAssist:'),'Party cards must not spend vertical space on empty companion placeholders');
ok(card.includes('card:{flex:1,minHeight:116')&&card.includes('combatInfo:{padding:10,paddingTop:0,gap:4')&&card.includes('layout&&{minHeight:layout.cardMinHeight}'),'Party combat cards must keep the modern compact density while honoring narrower-phone sizes');
ok(card.includes('hollow-courtyard-v1.jpg')&&card.includes('surface-fade-dark.webp')&&card.includes('surface-fade-light.webp')&&card.includes('emblemRing'),'Restoring replay controls must preserve the courtyard artwork, theme fades and circular party portraits');
ok(stage.includes("{assists?<StateChip")&&!stage.includes("'NO ASSISTS'"),'Combat header must only show companion-assist summary when assists actually exist');
ok(stage.includes('useWindowDimensions')&&stage.includes('dungeonCombatLayout(windowWidth)'),'Dungeon battlefield must select a tested layout from the current phone width');
ok(stage.includes('padding:layout.arenaPadding')&&stage.includes('gap:layout.partyGap'),'Small-phone layout must reclaim arena padding and party-card gap');
ok(stage.includes('layout.bossWidthPctFinal')&&stage.includes('layout.bossWidthPct'),'Stacked boss/enemy card width must adapt independently from the four-card row');
ok(stage.includes('playbackEnemyCombatants(replay)')&&stage.includes('visibleEnemies.map(enemy=>'),'Normal combat must render each replay enemy rather than collapse the encounter into one card');
ok(stage.includes("visibleEnemies=boss?(bossEnemy?[bossEnemy]:[]):replayEnemies.slice(0,4)"),'Boss combat must remain a singular emphasized card while normal rooms may show multiple enemies');
ok(stage.includes('enemyGroup')&&stage.includes('enemySlot')&&stage.includes('compact={!boss&&visibleEnemies.length>1}'),'Multi-enemy rooms must use a compact responsive enemy row');
ok(card.includes('combatantId?currentCue.targetId===combatantId:currentCue.targetName===name'),'Enemy damage feedback must bind to combatant id so duplicate enemy names do not mirror feedback');
ok(stage.includes('combatantId={enemy.id}')&&stage.includes('selectedForInspect={inspectKey===key}'),'Each enemy card must bind replay state and inspection to its authoritative combatant id');
ok(stage.includes('layout={layout}')&&card.includes('layout?:DungeonCombatLayout'),'Party combat cards must receive the responsive density contract');
ok(card.includes('layout.cardMinHeight')&&/layout\??\.sceneHeight/.test(card)&&card.includes('layout.portraitWidth'),'Responsive combat cards must adapt height, portrait window and scene height without changing formation');
ok(card.includes('limit={layout?.statusLimit??3}'),'Narrow phones must reduce visible status-pill count rather than widen cards');
ok(stage.includes('layout.controlsWrap&&s.playbackControlsWrap')&&stage.includes("playbackControlsWrap:{flexWrap:'wrap'"),'Replay controls must wrap safely on narrow phones');
for(const control of ['speedButton','pauseButton','stepButton','skipButton','replayButton']){
 const style=stage.match(new RegExp(control+':\\{([^}]+)\\}'))?.[1]??'';
 ok(/minHeight:touchTargetMin/.test(style),'Replay control '+control+' must use the minimum touch-target token');
}
ok(read('src/theme/theme.ts').includes('touchTargetMin=44'),'The shared minimum touch target must stay at least 44px');
ok(stage.includes("controlActions:{flexDirection:'row',flexWrap:'wrap'")&&stage.includes('layout.controlsWrap&&s.controlActionsWrap'),'Replay action buttons must reflow within their row on small phones');
ok(stage.includes('layout.contributionIdentityMinWidth')&&stage.includes('layout.contributionIdentityWidthPct'),'Contribution recap identity width must adapt on narrow phones');
ok(card.includes('selectedForInspect')&&card.includes('Inspect ${slot.name} combat details'),'Party combat cards must expose tap-to-inspect interaction without adding a permanent button row');
ok(card.includes('Inspect ${name} combat details')&&card.includes('inspectSelected'),'Boss/enemy combat cards must support the same inspect interaction and selected state');
ok(stage.includes('inspectKey')&&stage.includes('enemyInspectKey(enemy.id)')&&stage.includes('slotInspectKey(slot)'),'Battlefield must track inspection by authoritative id for every enemy and all four party cards');
ok(stage.includes('if(!reduceMotion&&cues.length>1)setPaused(true)'),'Opening combat inspection must enter a step-capable paused replay state when replay cues are available');
ok(stage.includes('<CombatantInspectPanel')&&stage.includes('onClose={()=>setInspectKey(undefined)}'),'Selected combatant must render a closable compact inspection panel');
ok(inspect.includes('COMBAT INSPECT')&&inspect.includes('ACTIVE EFFECTS'),'Inspection panel must clearly separate combat identity and effect details');
ok(inspect.includes('close:{minWidth:touchTargetMin,minHeight:touchTargetMin'),'Combat inspection must have a full-size close touch target');
ok(inspect.includes('status.label')&&inspect.includes('status.stacks>1')&&inspect.includes('remaining(status.remainingMs)'),'Inspection panel must show full effect name, stacks and remaining duration rather than only compact codes');
ok(inspect.includes("status.source==='gem'")&&inspect.includes("return 'Effect Gem'")&&inspect.includes("return 'Damage over time'")&&inspect.includes("return 'Healing over time'"),'Inspection panel must explain Effect Gem and timed-effect sources in player-facing terms');
ok(inspect.includes('BARRIER')&&inspect.includes('COMPANION')&&inspect.includes('PHASE'),'Inspection panel must surface combat barrier, companion and boss phase context when available');
ok(inspect.includes('INTERRUPTIBLE CAST')&&inspect.includes('Focus →'),'Boss inspection must retain cast interruptibility and authoritative focus target context');
// Paused inspection stepping stays bounded to the authoritative replay cue list.
ok(stage.includes('stepReplay=(delta:-1|1)')&&stage.includes('setCueIndex(value=>Math.max(0,Math.min(cues.length-1,value+delta)))'),'Paused combat inspection must step safely between authoritative replay cues');
ok(stage.includes('accessibilityLabel={st("Previous combat event")}')&&stage.includes('accessibilityLabel={st("Next combat event")}'),'Paused replay must expose localized accessible previous/next event controls');
ok(stage.includes('disabled={cueIndex<=0}')&&stage.includes('disabled={cueIndex>=cues.length-1}'),'Event-step controls must clamp at replay boundaries');
ok(stage.includes('(!complete||paused)&&!reduceMotion&&cues.length>1'),'Paused inspection must retain controls even when manually stepped onto the final cue');
ok(stage.includes('if(!reduceMotion&&cues.length>1)setPaused(true)'),'Inspecting any replay moment, including the final result, must enter a step-capable paused state');
for(const enemy of ['The Hollow Regent','The Coinbound Captain','The Rimebell Colossus','Veilshade Stalker','Ledger Hexer','Bellfrost Spirit'])ok(enemyArt.toLowerCase().includes(enemy.toLowerCase()),enemy+' must have registered encounter artwork');
ok(enemyArt.includes("require('../../assets/dungeon-enemies-v1/"),'Enemy artwork must be bundled as static Metro assets');

ok(art.includes('classIconArtwork[classId as ClassId]'),'Dungeon combat uses class profile icons');
ok(!art.includes('profileIconId'),'Dungeon combat art must remain class-locked rather than use player cosmetic icon selection');
ok(art.includes("body:BodyPresentation='male'"),'Combat art must preserve male/female presentation when available');

console.log('PASS: dungeon combat uses compact profile-derived cards with fixed class artwork and combat-first information');
