export {};
const fs=require('fs') as {readFileSync:(path:string,encoding:string)=>string};
function ok(value:boolean,message:string){if(!value)throw new Error(message)}
const read=(path:string)=>fs.readFileSync(path,'utf8');

const stage=read('src/components/coop/DungeonCombatStage.tsx');
const card=read('src/components/coop/CombatantProfileCard.tsx');
const art=read('src/theme/dungeon-enemy-art.ts');

ok(stage.includes('enemyZone')&&stage.includes('partyField'),'Battlefield must have separate enemy and party zones');
ok(stage.indexOf('enemyZone')<stage.indexOf('partyField'),'Enemy/boss zone must render above the four party cards');
ok(stage.includes("partyField:{flexDirection:'row'"),'Four player combat cards must share one bottom row');
ok(stage.includes('formationSlot:{flex:1,minWidth:0}'),'Party profile cards must divide the bottom row evenly');
ok(stage.includes('<CombatantProfileCard compact'),'Bottom party cards must use compact profile-card presentation');
ok(stage.includes("actorDirection=actorIsParty===false?1:-1"),'Combat actor motion must travel vertically toward the opposing side');
ok(stage.includes('translateY:actorAnim.interpolate'),'Combat action motion must use the vertical battlefield axis');
ok(card.includes('dungeonEnemyPortraitSource(name)'),'Enemy combat cards must resolve bespoke enemy art');
ok(card.includes('enemyBossScene'),'Boss art must receive a larger upper-stage presentation');
for(const name of ['The Hollow Regent','The Coinbound Captain','The Rimebell Colossus','Veilshade Stalker','Ledger Hexer','Bellfrost Spirit']){
 ok(art.includes(name),name+' must be registered as implemented dungeon art');
}
for(const file of ['the_hollow_regent.png','the_coinbound_captain.png','the_rimebell_colossus.png','veilshade_stalker.png','ledger_hexer.png','bellfrost_spirit.png']){
 ok(art.includes(file),file+' must have an implementation path');
}
console.log('PASS: dungeon battlefield is boss/enemy above four bottom profile cards with implemented enemy art');
