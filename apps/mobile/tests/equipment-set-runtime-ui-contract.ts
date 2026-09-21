export {};
const fs=require('fs') as {readFileSync:(path:string,encoding:string)=>string};
function ok(value:boolean,message:string){if(!value)throw new Error(message)}
const read=(path:string)=>fs.readFileSync(path,'utf8');

const runtime=read('src/core/equipment-set-runtime.ts');
const game=read('src/core/game.ts');
const character=read('src/screens/CharacterScreen.tsx');
const inspect=read('src/components/ItemQuickInspect.tsx');
const setPanel=read('src/components/EquipmentSetProgressPanel.tsx');

ok(runtime.includes("if(pieces>=2)addStats"),'2pc static set bonus must activate by equipped-piece count');
ok(runtime.includes("if(pieces>=4)addStats"),'4pc static set bonus must activate by equipped-piece count');
ok(runtime.includes("if(pieces>=8)addStats"),'8pc static set bonus must activate by equipped-piece count');
ok(runtime.includes("if(pieces>=10)addStats"),'10pc static set bonus must activate by equipped-piece count');
ok(runtime.includes("sixPieceStatus:pieces>=6?'trigger-hook-pending':'locked'"),'6pc conditional must be preserved as a hook rather than faked');
ok(runtime.includes("'max hp':'maxHp'")&&runtime.includes("'crit damage':'critDamage'"),'Static parser must cover V33 stat language');
ok(runtime.includes('unsupportedStatic'),'Runtime must expose catalog parsing coverage');

ok(game.includes('activeEquipmentSetRuntime(state),setStats=setRuntime.stats'),'Effective stats must consume equipped V33 set runtime');
ok(game.includes('hp=Math.ceil(hp*(1+setStats.maxHp))'),'Max HP set bonuses must affect live stats');
ok(game.includes('defense=Math.ceil(defense*(1+setStats.armor))'),'Armor set bonuses must affect live defense');
ok(game.includes('basePower*(1+setStats.power)'),'Power set bonuses must affect live Power');
ok(game.includes('baseCritChance+setStats.critRate'),'Crit Rate set bonuses must affect live stats');
ok(game.includes('1.5+setStats.critDamage'),'Crit Damage set bonuses must affect live stats');
ok(game.includes('.84+setStats.accuracy'),'Accuracy set bonuses must affect live stats');
ok(game.includes('baseEvasion+setStats.evasion'),'Evasion set bonuses must affect live stats');
ok(game.includes('.05+setStats.haste'),'Haste set bonuses must affect live stats');
ok(game.includes('setCombat.speedMultiplier*setOutput'),'Haste/Accuracy/Crit/Penetration set output must reach trusted combat simulation');
ok(game.includes('setCombat.incomingDamageMultiplier'),'Ward/Evasion set mitigation must reach trusted combat simulation');
ok(game.includes('setCombat.recoveryMultiplier'),'Potency must reach the simulator recovery lane');

ok(character.includes('ACTIVE SET STATS'),'Character stats must surface live set-only combat stats');
ok(character.includes('label="Haste"'),'Character stats must surface Haste');
ok(character.includes('label="Armor"')&&character.includes('label="Ward"')&&character.includes('label="Tenacity"'),'Character stats must surface V33 defensive set stats');

ok(inspect.includes("row.runtime==='live'?'LIVE':'HOOK'"),'Item inspect must distinguish live thresholds from conditional hooks');
ok(inspect.includes('2/4/8/10 always-on V33 bonuses are live'),'Item inspect must accurately explain runtime coverage');
ok(setPanel.includes('2/4/8/10 always-on bonuses are live'),'Set progress copy must not claim the 6pc condition is simulated');

console.log('PASS: V33 set runtime is wired through stats/combat and UI accurately distinguishes live bonuses from 6pc hooks');
