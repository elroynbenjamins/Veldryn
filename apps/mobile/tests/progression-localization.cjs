const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('../node_modules/typescript');
const React = require('../node_modules/react');
const {renderToStaticMarkup} = require('../node_modules/react-dom/server');

const app = path.resolve(__dirname, '..');
const compile = (source, filename) => ts.transpileModule(source, {
  fileName: filename,
  compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true},
}).outputText;
const previousLoader = require.extensions['.ts'];
require.extensions['.ts'] = (module, filename) => module._compile(compile(fs.readFileSync(filename, 'utf8'), filename), filename);
const progression = require('../src/i18n/progression.ts');
if (previousLoader) require.extensions['.ts'] = previousLoader;
else delete require.extensions['.ts'];

const {progressionCatalogs, progressionTranslationRows, progressionT, progressionText, progressionEnvironmentText, progressionTravelReason, progressionError} = progression;
const languages = ['en', 'de', 'es', 'nl', 'it', 'fr'];
const keys = Object.keys(progressionTranslationRows).sort();
const placeholders = text => [...text.matchAll(/\{([a-zA-Z][a-zA-Z0-9_]*)\}/g)].map(match => match[1]).sort();
for (const language of languages) {
  assert.deepEqual(Object.keys(progressionCatalogs[language]).sort(), keys);
  for (const key of keys) {
    const translated = progressionCatalogs[language][key];
    assert.equal(typeof translated, 'string', language + ': ' + key);
    assert.ok(translated.trim(), language + ': empty ' + key);
    assert.deepEqual(placeholders(translated), placeholders(key), language + ': placeholders for ' + key);
    assert.equal(progressionTranslationRows[key].length, 5);
  }
}

// Names passed as parameters are opaque, including words that are also UI keys.
for (const language of languages) {
  const name = 'Clear <Mira> {count}';
  const result = progressionT(language, 'Start hunting {name}', {name});
  assert.ok(result.includes(name));
  assert.equal(progressionText(language, 'Player-created rule {name}'), 'Player-created rule {name}');
  assert.ok(progressionTravelReason(language, 'Reach Level 45 to travel to Frostmarch').includes('45'));
  assert.ok(progressionTravelReason(language, 'Reach Level 45 to travel to Frostmarch').includes('Frostmarch'));
  assert.ok(progressionTravelReason(language, 'Complete Kings Road scouting to discover the route to Sunscar').includes('Kings Road'));
  assert.equal(progressionEnvironmentText(language, 'Bloomtide'), 'Bloomtide');
}
assert.equal(progressionEnvironmentText('de', '+8% combat XP · −5% combat speed'), '+8% Kampf-EP · −5% Kampftempo');
assert.equal(progressionEnvironmentText('fr', 'Clear Skies'), 'Ciel dégagé');
assert.equal(progressionError('fr', new Error('raw_server_failure_123'), 'Could not update goals.'), progressionT('fr', 'Could not update goals.'));

const screens = ['WorldScreen','QuestScreen','EventScreen','ProgressionPlannerScreen','MasteryHallScreen','AchievementsScreen','AdventurersJournalScreen','WorldMilestoneFeedScreen'];
const components = ["AnnualEventCalendarPanel","ContractBoardSummary","CrossSkillDiscoveriesPanel","EventContributionBreakdownPanel","ExplorationPanel","EnvironmentBanner","EnvironmentDetailsModal","FrostmarchRegionPanel","SunscarRegionPanel","MasteryHallPanel","MasteryDiscoveryPanel","RegionalContractFocus","RegionalCrisisPanel","RegionalJournalPanel","RegionalStoryLeadsPanel","RegionCompletionPanel","RegionEncounterList","TravelRegionModal","WorldBossPanel","WorldBossResultPanel","WorkingTowardFocusPanel","WorkingTowardSummary","IdleRulesEditorV40","QuestModeSwitch","QuestReward"];
const ownedFiles = [...screens.map(name => 'screens/' + name), ...components.map(name => 'components/' + name)];
for (const relative of ownedFiles) {
  const filename = path.join(app, 'src', relative + '.tsx');
  const source = fs.readFileSync(filename, 'utf8');
  const ast = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  assert.equal(ast.parseDiagnostics.length, 0, relative + ': JSX must parse');
  function inspect(node) {
    if (ts.isCallExpression(node) && node.expression.getText(ast) === 't' && ts.isStringLiteral(node.arguments[0])) {
      assert.ok(Object.hasOwn(progressionTranslationRows, node.arguments[0].text), relative + ': missing key ' + node.arguments[0].text);
    }
    if (ts.isParameter(node) && node.initializer) {
      assert.ok(!/\bt\(/.test(node.initializer.getText(ast)), relative + ': translator unavailable in default parameter');
    }
    if (ts.isJsxAttribute(node) && ['tone','name','accessibilityRole','keyboardType','resizeMode','key'].includes(node.name.getText(ast)) && node.initializer) {
      assert.ok(!/\b(?:t|p|progressionT|progressionText)\(/.test(node.initializer.getText(ast)), relative + ': translated technical prop');
    }
    ts.forEachChild(node, inspect);
  }
  inspect(ast);
}

// Render representative owned UI without loading the native runtime or game engine.
function renderComponent(name, language, props) {
  const filename = path.join(app, 'src/components', name + '.tsx');
  const nativeElement = tag => ({children}) => React.createElement(tag, null, children);
  const native = {Text:nativeElement('span'),View:nativeElement('div'),StyleSheet:{create:value=>value,hairlineWidth:1}};
  const loaded = new Module(filename, module);
  loaded.filename = filename;
  loaded.paths = Module._nodeModulePaths(path.dirname(filename));
  const normalRequire = loaded.require.bind(loaded);
  loaded.require = id => {
    if (id === 'react-native') return native;
    if (id.endsWith('/GameLanguageProvider')) return {useGameLanguage:()=>language};
    if (id.endsWith('/progression')) return progression;
    if (id.endsWith('/shared-world-v19')) return {formatCompact:value=>String(value)};
    if (id.endsWith('/items')) return {itemDef:()=>({name:'Clear'})};
    if (id.endsWith('/theme')) return {C:{},radii:{md:4},typography:{}};
    if (id === './ItemArtwork') return {ItemArtwork:()=>null};
    return normalRequire(id);
  };
  loaded._compile(compile(fs.readFileSync(filename,'utf8'),filename),filename);
  return renderToStaticMarkup(React.createElement(loaded.exports[name],props));
}
for (const language of languages) {
  const reward = renderComponent('QuestReward',language,{gold:12,xp:9,itemId:'unchanged_item_id',quantity:2});
  assert.ok(reward.includes(progressionT(language,'Rewards')));
  assert.ok(reward.includes(progressionT(language,'Gold')));
  assert.ok(reward.includes('2× Clear'), 'proper item name must not be localized');
  const boss = renderComponent('WorldBossResultPanel',language,{impact:7,appliedDamage:9,breakdown:{direct:1,mitigation:2,healing:3,utility:4,survival:5}});
  assert.ok(boss.includes(progressionT(language,'WORLD BOSS ATTEMPT COMPLETE')));
  assert.ok(boss.includes(progressionT(language,'HEALING')));
}

// This verifies catalog completeness, not full content-catalog localization.
// Quest story/description catalogs, seasonal challenge prose, event definitions,
// regional authored content, server achievement descriptions and world-feed prose
// still require their own translated source data. Player text remains untouched.
console.log('PASS progression localization: ' + keys.length + ' keys in six languages, placeholders, names, environment, JSX and rendered UI');

