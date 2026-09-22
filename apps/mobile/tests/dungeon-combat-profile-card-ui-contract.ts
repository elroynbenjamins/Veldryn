export {};
const fs=require('fs') as {readFileSync:(path:string,encoding:string)=>string};
function ok(value:boolean,message:string){if(!value)throw new Error(message)}
const read=(path:string)=>fs.readFileSync(path,'utf8');

const card=read('src/components/coop/CombatantProfileCard.tsx');
const stage=read('src/components/coop/DungeonCombatStage.tsx');
const art=read('src/theme/dungeon-combat-art.ts');
const enemyArt=read('src/theme/dungeon-enemy-art.ts');

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
ok(stage.includes("partyField:{width:'100%',flexDirection:'row'")&&stage.includes("formationSlot:{flex:1,minWidth:0}"),'Four party combat cards must share one compact bottom row');
ok(stage.includes("bossField:{width:'66%'"),'Boss encounter card must receive stronger centered emphasis than a normal enemy');
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
ok(card.includes("boss?'BOSS HP':'HP'")&&card.includes('enemyHpTrack'),'Enemy and boss cards must show replay-time HP');
ok(stage.includes('playbackCombatantState')&&stage.includes('currentHp={enemyState?.hp}')&&stage.includes('combatShield={enemyState?.shield??0}'),'Battlefield must drive boss HP and shield from replay snapshots');
ok(stage.includes('ready:state.hp>0')&&stage.includes('currentHp:state.hp'),'Party downed and HP state must follow the current replay cue rather than final run state');
ok(card.includes('LOW HP')&&card.includes('criticalRow'),'Party cards must call out critical health before a down');
ok(card.includes('phaseThreshold')&&card.includes('phase.hpPct'),'Boss HP bar must show authoritative phase threshold markers');
ok(stage.includes('bossPhases={boss?run.bossMechanic?.telegraph?.phases:undefined}'),'Battlefield must pass authoritative boss phase thresholds into the encounter card');
ok(card.includes('CombatStatusStrip')&&card.includes('statusStrip'),'Combat cards must render a compact status-effect strip');
ok(card.includes("return 'DOT'")&&card.includes("return 'HOT'")&&card.includes("'VULN'")&&card.includes("'HASTE'"),'Status pills must distinguish harmful, healing and common buff states');
ok(card.includes('slice(0,gemProc?2:3)')&&card.includes('statusOverflow'),'Status strips must cap visible pills and show overflow rather than expand the card');
ok(card.includes('Effect Gem proc')&&card.includes('>GEM<'),'Current Effect Gem procs must receive compact card feedback without becoming persistent fake buffs');
ok(stage.includes('playbackCombatantStatuses')&&stage.includes('statuses={enemyStatuses}')&&stage.includes('statuses={statuses}'),'Battlefield must resolve status windows for both boss/enemy and party cards');
ok(card.includes('GEM_STATUS_CODES')&&card.includes("'gem:momentum':'MOM'")&&card.includes("'gem:flow':'FLOW'")&&card.includes("'gem:unyielding':'UNY'"),'Persistent Effect Gem stacks need compact named combat codes');
ok(card.includes("'gem:retaliation_ready':'RETAL'")&&card.includes("'gem:benediction_charge':'BENE'")&&card.includes("'gem:opportunist_ready':'OPP'"),'Ready, charge and harmful Effect Gem states need distinct compact codes');
ok(card.includes("status.source==='gem'")&&card.includes('styles.statusGem'),'Persistent beneficial Effect Gem states must use the gem visual treatment while harmful marks remain harmful');
ok(stage.includes('DUNGEON_PLAYBACK_SPEEDS')&&stage.includes('playbackSpeed')&&stage.includes('1×')===false,'Dungeon replay must use shared 1x/2x/4x speed controls rather than hard-coded timing labels');
ok(stage.includes('accessibilityLabel="Skip combat replay to result"')&&stage.includes('setCueIndex(Math.max(0,cues.length-1))'),'Dungeon replay must offer a direct skip-to-result control');
ok(stage.includes('playbackAdvanceDelayMs(current,next,playbackSpeed)')&&stage.includes('playbackCastDisplayMs(currentBossCast,playbackSpeed)'),'Replay speed must scale both cue and boss-cast timing');
ok(stage.includes('playbackVisualDurationMs')&&stage.includes('fxDuration'),'Replay speed must scale combat VFX presentation too');
ok(card.includes('FOCUS →')&&card.includes('bossCast.targetLabel'),'Boss cast card must show the authoritative focus target when available');
ok(stage.includes('targetLabel:currentBossCast.targetName?.trim()'),'Battlefield must feed the cast cue target into the boss focus label');
ok(stage.includes('PARTY CONTRIBUTION')&&stage.includes('authoritative totals'),'Completed combat replay must show a compact factual contribution recap');
ok(stage.includes("role==='tank'")&&stage.includes('TAKEN')&&stage.includes("role==='support'")&&stage.includes('HEAL'),'Contribution recap must emphasize role-relevant factual metrics');
ok(stage.includes('DMG')&&stage.includes('INT')&&!stage.includes('MVP'),'Contribution recap must show damage and interrupts without ranking players');
for(const enemy of ['The Hollow Regent','The Coinbound Captain','The Rimebell Colossus','Veilshade Stalker','Ledger Hexer','Bellfrost Spirit'])ok(enemyArt.toLowerCase().includes(enemy.toLowerCase()),enemy+' must have registered encounter artwork');
ok(enemyArt.includes("require('../../assets/dungeon-enemies-v1/"),'Enemy artwork must be bundled as static Metro assets');

for(const classId of ['IRONWARDEN','BASTION','DREADGUARD','WAYFINDER','RAVAGER','HEXWEAVER','KNIFE_DANCER','DAWNKEEPER','STONECALLER']){
 ok(art.includes(classId+':'),classId+' needs a canonical dungeon combat skin');
}
ok(!art.includes('selectedSkinId'),'Dungeon combat art must remain class-locked rather than use player cosmetic skin selection');
ok(art.includes("body:BodyPresentation='male'"),'Combat art must preserve male/female presentation when available');

console.log('PASS: dungeon combat uses compact profile-derived cards with fixed class artwork and combat-first information');
