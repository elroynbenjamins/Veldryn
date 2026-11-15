const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const modal=fs.readFileSync(path.resolve(__dirname,'../src/components/StoryBossBattleModal.tsx'),'utf8');
const parser=fs.readFileSync(path.resolve(__dirname,'../src/core/story-boss-reward-display.ts'),'utf8');

// The resolved fight is swapped, not stacked above or below a long result paragraph.
assert.match(modal,/if\(finished\)return <GameModalSurface/,'Results replace the combat arena once fully replayed');
assert.doesNotMatch(modal,/<Text style=\{s\.resultCopy\}>\{gl\(message\)\}/,'No long result paragraph remains below the combat feed');
assert.match(modal,/resultShell:\{flex:1,minHeight:0\}/,'Result view fills the existing modal');
assert.match(modal,/<ScrollView style=\{s\.resultScroller\}/,'Large loot lists scroll inside the result');
assert.match(modal,/<View style=\{s\.resultFooter\}><GameButton.*style=\{s\.resultContinue\}/,'Continue remains pinned and full width');
assert.match(modal,/<BossLootSection title="GUARANTEED REWARDS"/,'Base clear loot is shown');
assert.match(modal,/<BossLootSection title="OATHGLASS BOUNTY"/,'Bounty loot is separate');
assert.match(modal,/<BossLootSection title="BOSS DROPS"/,'Boss drops are separate');
assert.match(modal,/useWindowDimensions\(\).*singleColumn/,'Small screens or enlarged text receive responsive loot cards');
assert.match(parser,/FALLEN_KNIGHT_CLEAR_REWARD\.items\.map/,'Base weekly loot comes from the game reward catalog');
console.log('PASS story boss compact post-fight reward modal contracts');
