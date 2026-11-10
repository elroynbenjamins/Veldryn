const assert=require('node:assert/strict');
const fs=require('node:fs');
const src=path=>fs.readFileSync('src/'+path,'utf8');
const stat=src('core/stat-display.ts');
const monsters=src('content/monsters.ts');
const cards=src('components/RegionEncounterList.tsx');
const intro=src('components/BossEncounterIntro.tsx');
const battle=src('components/BattleStage.tsx');
const story=src('components/StoryBossBattleModal.tsx');
const regional=src('components/RegionalCombatPanel.tsx');

// The x10 is strictly a presentation convention, NOT an enemy-difficulty buff.
assert.match(stat,/DISPLAY_STAT_MULTIPLIER=10/, 'canonical cosmetic stat scale is x10');
assert.doesNotMatch(monsters,/DISPLAY_STAT_MULTIPLIER/, 'monster combat stats remain raw');
assert.match(cards,/HP \{displayStat\(monster\.hp\)\} · ATK \{displayStat\(monster\.attack\)\} · DEF \{displayStat\(monster\.defense\)\}/,
  'enemy cards, including compact inspections, show cosmetic-scaled HP ATK DEF');
assert.match(cards,/displayStat\(readiness\.recommendedPower\)/, 'enemy readiness power shares character UI scale');
assert.match(intro,/hp:displayStat\(monster\.hp\)/, 'chapter-boss intro shows scaled boss HP');
assert.match(battle,/current=\{displayStat\(fight\?\.enemyHp\?\?view\.enemyHp\)\}/,
  'live enemy health from raw hit projection is scaled once');
assert.match(battle,/current=\{displayStat\(fight\?\.playerHp\?\?state\.character!\.currentHp\)\}/,
  'live player health is scaled once');
assert.match(battle,/damageValue=\(value:number\)=>displayStatPrecise\(value\)/,
  'live hit text uses the tenfold display scale, retaining fractional precision');
assert.match(story,/displayStat\(battle\.bossMaxHp\)/,'Fallen Knight battle uses scaled HP');
assert.match(story,/displayStat\(event\.amount\?\?0\)/,'Fallen Knight replay uses scaled damage and healing');
assert.match(regional,/displayStat\(last\.result\.result\.enemyMaxHp\)/,
  'Sunscar optional encounter result uses scaled enemy HP');
assert.match(regional,/displayStat\(cue\.amount\?\?0\)/,
  'Sunscar optional encounter replay uses scaled damage');
console.log('PASS enemy/player UI stat magnitude parity; no x10 combat stat mutation');
