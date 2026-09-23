export {};
const fs=require('fs') as {readFileSync:(path:string,encoding:string)=>string};
function ok(v:boolean,m:string){if(!v)throw new Error(m)}
const read=(p:string)=>fs.readFileSync(p,'utf8');
const assets=read('src/theme/monster-assets.ts');
const frame=read('src/components/MonsterPortraitFrame.tsx');
const monsters=read('src/content/monsters.ts');

const missing=['SUNSCAR_SCORPION','DUNE_ORACLE','GLASSBOUND_SENTINEL','FROSTWOLF','BELLWRAITH','CHOIR_HUNTER','BLACKGLASS_MIRELING','CINDER_TITAN','ASHEN_REVENANT'];
for(const id of missing){
  ok(monsters.includes("id:'"+id+"'"),'Expected later-region monster '+id);
}
ok(assets.includes('monsterPortraitSource'),'Monster portrait registry must expose a safe lookup');
ok(frame.includes('const portrait=monsterPortraitSource(monster.id)'),'Portrait frame must use the safe lookup');
ok(frame.includes("portrait?<Image source={portrait}"),'Known portraits must keep normal image rendering');
ok(frame.includes("monster.name.slice(0,1).toUpperCase()"),'Missing portraits must render a stable themed fallback');
ok(!frame.includes('monsterPortraits[monster.id]'),'Portrait frame must not pass undefined sources directly to Image');
console.log('PASS: later-region monsters have a safe portrait fallback until dedicated art is authored');
