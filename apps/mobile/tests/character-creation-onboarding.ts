import {readFileSync} from 'node:fs';
import {assert} from './test-assert';

const creation=readFileSync('src/screens/ClassSelectScreen.tsx','utf8');
const app=readFileSync('App.tsx','utf8');
const welcome=readFileSync('src/components/AsterfallWelcomeModal.tsx','utf8');

assert.ok(creation.includes('PLAY STYLE'));
assert.ok(creation.includes('WHAT HAPPENS NEXT'));
assert.ok(!creation.includes('Your first crafting goal:'),'creation review must not teach crafting before QST_002');
assert.ok(!creation.includes('Full equipment-set appearances become permanent skin unlocks later.'),'creation review must not teach late cosmetics');
assert.ok(welcome.includes('WELCOME TO ASTERFALL'));
assert.ok(welcome.includes('defeating 5 Moss Rats'));
assert.ok(welcome.includes('only what matters for your next objective'));
assert.ok(app.includes('setCreationWelcome({name,classId:id})'));
assert.ok(app.includes("setCurrentTab('World')"));
console.log('PASS character creation stays focused and hands off to QST_001');
