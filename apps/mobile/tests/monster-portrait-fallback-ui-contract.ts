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
  ok(assets.includes(id+':'),'Expected dedicated regional portrait mapping for '+id);
}
ok(assets.includes("require('../../assets/monsters/regional-monsters-v1.png')"),'Regional monster atlas must be bundled');
ok(assets.includes('monsterPortraitSource'),'Monster portrait registry must expose a safe lookup');
ok(assets.includes('regionalMonsterPortraitCell'),'Monster portrait registry must expose regional atlas cells');
ok(frame.includes('const portrait=monsterPortraitSource(monster.id),regionalCell=regionalMonsterPortraitCell(monster.id)'),'Portrait frame must resolve standalone or regional portrait art');
ok(frame.includes('regionalMonsterPortraitAtlas'),'Portrait frame must render the regional atlas');
ok(frame.includes("monster.name.slice(0,1).toUpperCase()"),'Unknown future monsters must retain a stable themed fallback');
ok(!frame.includes('monsterPortraits[monster.id]'),'Portrait frame must not pass undefined sources directly to Image');
console.log('PASS: later-region monsters have dedicated portraits with a safe future fallback');
