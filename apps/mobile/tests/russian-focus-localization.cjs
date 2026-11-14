const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ts=require('../node_modules/typescript');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}
}).outputText,f);
const {RUSSIAN_FOCUS_ROWS}=require('../src/i18n/russian-focus.ts');
const {RUSSIAN_CONTINUATION_ROWS}=require('../src/i18n/russian-continuation.ts');
const {RUSSIAN_PROGRESS_ROWS}=require('../src/i18n/russian-progress.ts');
const {RUSSIAN_PROFILE_ROWS}=require('../src/i18n/russian-profile.ts');
const {RUSSIAN_ACCOUNT_ROWS}=require('../src/i18n/russian-account.ts');
const {RUSSIAN_SOCIAL_ROWS}=require('../src/i18n/russian-social.ts');
const continuationKeys=Object.keys(RUSSIAN_CONTINUATION_ROWS);
for(const key of continuationKeys)assert.ok(!Object.prototype.hasOwnProperty.call(RUSSIAN_FOCUS_ROWS,key),'Duplicate focused/continuation RU key: '+key);
const {earlyLocaleText,EARLY_LOCALE_ROWS}=require('../src/i18n/early-locales.ts');
const {createSourceTranslator}=require('../src/i18n/source-catalog.ts');
const {createTranslator}=require('../src/i18n/translator.ts');
const russianCatalogs=[RUSSIAN_FOCUS_ROWS,RUSSIAN_CONTINUATION_ROWS,RUSSIAN_PROGRESS_ROWS,RUSSIAN_PROFILE_ROWS,RUSSIAN_ACCOUNT_ROWS,RUSSIAN_SOCIAL_ROWS];
const seen=new Set();
for(const catalog of russianCatalogs)for(const key of Object.keys(catalog)){
  assert.ok(!seen.has(key),'Duplicate Russian translation: '+key);
  seen.add(key);
}
const combined=Object.assign({},...russianCatalogs);
const keys=Object.keys(combined);
assert.ok(keys.length>=5660,'Expected continued Russian UI coverage');
assert.ok(keys.length>=4925,'Expected expanded Russian UI coverage');
const tokens=s=>[...s.matchAll(/\{([A-Za-z][A-Za-z0-9_]*)\}/g)].map(m=>m[1]).sort();
const modules=['account','app-shell','battle','companions','creation','gameplay','navigation','profile','progression','social'];
const sources=modules.map(name=>fs.readFileSync(path.join(__dirname,'../src/i18n/'+name+'.ts'),'utf8'));
const owned=new Set(sources.flatMap(source=>[...source.matchAll(/^\s*(['"])(.*?)\1\s*:\s*\[/gm)].map(match=>match[2])));
for(const key of keys){
  const translated=combined[key];
  assert.ok(owned.has(key),'Missing exact source key '+key);
  assert.ok(translated.trim(),'Empty Russian translation for '+key);
  assert.deepEqual(tokens(translated),tokens(key),'Placeholder mismatch: '+key);
  assert.equal(earlyLocaleText('ru',key),translated,'Unreachable Russian translation: '+key);
}
assert.equal(earlyLocaleText('ru','UNKNOWN LIVE SERVER COPY'),undefined,'Unknown server copy must remain untranslated');
assert.equal(earlyLocaleText('tr','Companion Index'),'Yoldaş Rehberi','Turkish coverage must remain independent of Russian');
for(const [key,expected] of Object.entries({
  'Companion Index':'Каталог спутников',
  'Tower of Companions':'Башня спутников',
  'Choose a boon':'Выберите благословение',
  'EQUIPMENT PREVIEW':'ПРОСМОТР СНАРЯЖЕНИЯ',
  'LOCAL PROFILE':'ЛОКАЛЬНЫЙ ПРОФИЛЬ',
  'World Regions':'Регионы мира',
  'Your weekly assignments':'Ваши задания на неделю',
  'ACCOUNT RECOVERY':'ВОССТАНОВЛЕНИЕ АККАУНТА',
  'Expedition Shop':'Магазин экспедиций',
  'Delete unreadable local save?':'Удалить повреждённое локальное сохранение?',
  'Current activity':'Текущее занятие',
  'Encounter replay':'Повтор сражения',
  'The foe is barely holding on.':'Враг едва держится.',
  'A stone shard strikes · {amount}':'Каменный осколок поражает цель · {amount}',
  'Food & potions':'Еда и зелья',
  'Guild Projects':'Проекты гильдии',
  'Pinned Goals':'Закреплённые цели',
  'Leave Party?':'Покинуть группу?',
  'COMBINE GEMS':'ОБЪЕДИНИТЬ САМОЦВЕТЫ',
  'Reach Level 10':'Достигните уровня 10',
  'PET COLLECTION':'КОЛЛЕКЦИЯ ПИТОМЦЕВ',
  'Bestiary Filters':'Фильтры бестиария',
  'Festival calendar':'Календарь фестивалей',
  'GUILD CHANNEL':'КАНАЛ ГИЛЬДИИ',
  'Interface theme':'Тема интерфейса',
  'Redeem code':'Активировать код',
  'Sanctuary Missions':'Задания святилища',
  'LIVE MATCHMAKING':'ПОИСК ОНЛАЙН-ГРУППЫ',
  'Password requirements':'Требования к паролю',
  'Sign out':'Выйти из аккаунта',
  'COMPANION TRAINING':'ТРЕНИРОВКА СПУТНИКОВ',
  'Begin Journey':'Начать приключение',
  'FIRST HUNT':'ПЕРВАЯ ОХОТА',
  'MATCHES FOUND':'ГРУППЫ НАЙДЕНЫ',
  'Raid in progress · resolves at {time}':'Рейд идёт · итоги в {time}',
  'ACCOUNT PRESTIGE':'ПРЕСТИЖ АККАУНТА',
  'Auto-travel between queued activities':'Автопереход между занятиями в очереди',
  'Start brewing':'Начать варку',
  'My companions':'Мои спутники',
  'Companion Codex':'Справочник спутников',
  'Floor {value0} · Recommended Power {value1}':'Этаж {value0} · рекомендуемая мощь {value1}',
  'PROFILE CUSTOMIZATION':'НАСТРОЙКА ПРОФИЛЯ',
  'EQUIPMENT READINESS':'ГОТОВНОСТЬ СНАРЯЖЕНИЯ',
  'Apply name style':'Применить стиль имени',
  'COMBAT SKILL XP SPLIT':'РАСПРЕДЕЛЕНИЕ БОЕВОГО ОПЫТА',
  'Activity queue':'Очередь занятий',
  'Auto-eat below {percent}% HP':'Автоеда при здоровье ниже {percent}%',
  'STORAGE MANAGEMENT':'УПРАВЛЕНИЕ ХРАНИЛИЩЕМ',
  'Sell selected items?':'Продать выбранные предметы?',
  'Working Toward is using this item for {goal}. Additional goals: {count}.':'Предмет нужен для цели {goal}. Других целей: {count}.',
  'DAILY SUPPLIES':'ЕЖЕДНЕВНЫЕ ПРИПАСЫ',
  'Claim Daily Supplies':'Забрать ежедневные припасы',
  'Missing companion materials.':'Не хватает материалов для спутников.',
  'Trial run is no longer active.':'Попытка испытания уже не активна.',
  'EQUIPMENT FORGE':'КУЗНИЦА СНАРЯЖЕНИЯ',
  'GEM SOCKETED':'САМОЦВЕТ ВСТАВЛЕН',
  'HOLY WATER':'СВЯТАЯ ВОДА',
  'AUDIENCE PREVIEW':'ПРОСМОТР ДЛЯ ДРУГИХ',
  'Name style saved.':'Стиль имени сохранён.',
  'Profile hidden from this viewer':'Профиль скрыт от этого зрителя',
  'Bond 10 improves the Djinnling’s restorative tempo.':'Связь 10 ускоряет лечение Djinnling.',
  'PAST FESTIVALS':'ПРОШЕДШИЕ ФЕСТИВАЛИ',
  'FINAL CLAIM CHECKLIST':'СПИСОК НАГРАД ПЕРЕД ЗАВЕРШЕНИЕМ',
  'CHARACTER DELETION CONFIRMATION':'ПОДТВЕРЖДЕНИЕ УДАЛЕНИЯ ПЕРСОНАЖА',
  'BUY BOTH':'КУПИТЬ ОБА',
  'No tool equipped':'Инструмент не выбран',
  'Queued monster is no longer available.':'Враг из очереди больше недоступен.',
  'NEXT LV {level} · {title}':'СЛЕД. УР. {level} · {title}',
  'VELDRYN Rankings':'Рейтинги VELDRYN',
  'Share my Echo':'Поделиться моим Эхо',
  'Google Play purchases':'Покупки Google Play',
  'Import save backup':'Импорт резервной копии',
  'Shield strength +15%.':'Прочность щита +15%.',
  'Complete {count} {region} Sanctuary assignments':'Выполните {count} поручений святилища региона {region}',
  'WORLD BOSS ATTEMPT COMPLETE':'ПОПЫТКА МИРОВОГО БОССА ЗАВЕРШЕНА',
  'Idle Rule deleted.':'Правило AFK удалено.',
  'OFFLINE PROGRESS':'ОФЛАЙН-ПРОГРЕСС',
  'Search recipes…':'Поиск рецептов…'
})){
  assert.equal(earlyLocaleText('ru',key),expected,'Focused Russian text missing for '+key);
  assert.notEqual(earlyLocaleText('tr',key),expected,'Turkish UI must never inherit Russian text: '+key);
}
assert.equal(earlyLocaleText('ru','Show breakdown'),'Показать подробности','Older Russian catalog entries still work');
const params={count:3,name:'PLAYER-007',amount:2};
const sourceTranslator=createSourceTranslator({'{name}, needs attention':['de','es','nl','it','fr']});
assert.equal(sourceTranslator('ru','{name}, needs attention',params),'PLAYER-007: требуется внимание');
assert.equal(sourceTranslator('en','{name}, needs attention',params),'PLAYER-007, needs attention');
const typedTranslator=createTranslator({en:{a:'{count}/10 equipped'},de:{a:'{count}/10 ausgerüstet'}});
assert.equal(typedTranslator('ru','a',params),'Надето: 3/10');
assert.equal(typedTranslator('de','a',params),'3/10 ausgerüstet');
assert.equal(typedTranslator('ru','a',{count:1}),'Надето: 1/10');
for(const key of keys)assert.ok(!Object.hasOwn(EARLY_LOCALE_ROWS,key),'Duplicate RU entry in starter catalog: '+key);
const russianOwned=new Set([...keys,...Object.keys(EARLY_LOCALE_ROWS)].filter(key=>owned.has(key)));
const coverage=(100*russianOwned.size/owned.size).toFixed(1);
assert.ok(russianOwned.size>=keys.length,'Coverage cannot be smaller than focused translations');
console.log('PASS: '+keys.length+' focused and continuation Russian UI translations, source keys, placeholders, and language fallback');
console.log('Russian catalog coverage: '+russianOwned.size+'/'+owned.size+' distinct authored keys ('+coverage+'%). Remaining keys fall back to English.');
for(let i=0;i<modules.length;i++){
  const keysInModule=new Set([...sources[i].matchAll(/^\s*(['"])(.*?)\1\s*:\s*\[/gm)].map(match=>match[2]));
  const localCount=[...keysInModule].filter(key=>russianOwned.has(key)).length;
  const percentage=keysInModule.size?(100*localCount/keysInModule.size).toFixed(1):'100.0';
  console.log('  '+modules[i]+': '+localCount+'/'+keysInModule.size+' ('+percentage+'% RU)');
}
