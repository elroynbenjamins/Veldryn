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
for(const boss of ['The Hollow Regent','The Coinbound Captain','The Rimebell Colossus'])ok(enemyArt.toLowerCase().includes(boss.toLowerCase()),boss+' must have registered encounter artwork');
ok(enemyArt.includes("require('../../assets/dungeon-enemies-v1/"),'Enemy artwork must be bundled as static Metro assets');

for(const classId of ['IRONWARDEN','BASTION','DREADGUARD','WAYFINDER','RAVAGER','HEXWEAVER','KNIFE_DANCER','DAWNKEEPER','STONECALLER']){
 ok(art.includes(classId+':'),classId+' needs a canonical dungeon combat skin');
}
ok(!art.includes('selectedSkinId'),'Dungeon combat art must remain class-locked rather than use player cosmetic skin selection');
ok(art.includes("body:BodyPresentation='male'"),'Combat art must preserve male/female presentation when available');

console.log('PASS: dungeon combat uses compact profile-derived cards with fixed class artwork and combat-first information');
