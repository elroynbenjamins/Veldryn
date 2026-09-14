
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const root=process.cwd(),out=path.join(root,'output/ui-refinement-v1');
const ts=require(path.join(root,'apps/mobile/node_modules/typescript'));
const sharp=require('C:/Users/elroy/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp/dist/index.cjs');
const {chromium}=require('C:/Users/elroy/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('apps/mobile/src/components/stat-bar-value.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports});
 const cases=[[5,10,.5],[15,10,1],[-5,10,0],[5,0,0],[0,0,0],[NaN,10,0],[5,Infinity,0],[Infinity,10,0],[5,-10,0]];
 for(const [value,total,expected] of cases)assert.equal(exports.statBarValue(value,total).progress,expected);
 const source=fs.readFileSync('apps/mobile/src/theme/ui-icons.ts','utf8'),assets=[];
 for(const m of source.matchAll(/(\w+):require\('([^']+)'\)/g)){const file=path.resolve('apps/mobile/src/theme',m[2]);assert.ok(fs.existsSync(file),file);assets.push(m[1]);}
 const exported=fs.readdirSync('apps/mobile/assets/ui-icons-v1').filter(x=>x.endsWith('.png'));
 assert.equal(exported.length,33);
 for(const file of exported){const m=await sharp('apps/mobile/assets/ui-icons-v1/'+file).metadata();const size=file.includes('@3x')?96:file.includes('@2x')?64:32;assert.equal(m.width,size);assert.equal(m.height,size);assert.ok(m.hasAlpha);}
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 const page=await browser.newPage();const reviews=[];
 for(const width of [390,320]){
  await page.setViewportSize({width,height:844});
  await page.goto('file:///'+path.join(out,'preview.html').replace(/\\/g,'/'));
  await page.waitForFunction(()=>Array.from(document.images).every(i=>i.complete&&i.naturalWidth>0));
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
  assert.equal(overflow,false,'Horizontal overflow at '+width);
  await page.screenshot({path:path.join(out,'review-'+width+'.png'),fullPage:true});
  await page.locator('#search').fill('Crystal');await page.getByRole('button',{name:'Clear search',exact:true}).click();assert.equal(await page.locator('#search').inputValue(),'');
  await page.locator('#open-modal').click();
  const dialog=await page.locator('dialog').evaluate(d=>({scrolls:d.querySelector('.copy').scrollHeight>d.querySelector('.copy').clientHeight,bottom:d.getBoundingClientRect().bottom,actionsBottom:d.querySelector('.actions').getBoundingClientRect().bottom}));
  assert.ok(dialog.scrolls);assert.ok(dialog.bottom<=844);assert.ok(dialog.actionsBottom<=844);
  await page.screenshot({path:path.join(out,'confirmation-'+width+'.png')});
  await page.getByRole('button',{name:'Cancel',exact:true}).click();
  await page.evaluate(()=>{const rows=Array.from(document.querySelectorAll('main *,nav *')).map(el=>({el,size:parseFloat(getComputedStyle(el).fontSize),line:parseFloat(getComputedStyle(el).lineHeight)}));for(const {el,size,line} of rows){el.style.fontSize=(size*1.5)+'px';if(Number.isFinite(line))el.style.lineHeight=(line*1.5)+'px';}});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'Large-text horizontal overflow '+width);
  await page.screenshot({path:path.join(out,'large-text-'+width+'.png'),fullPage:true});
  reviews.push({width,horizontalOverflow:false,largeTextHorizontalOverflow:false,clearSearch:true,longModalScrolls:true,actionsInViewport:true});
 }
 await browser.close();
 const result={statBarEdgeCases:cases.length,registeredIcons:assets.length,exportedPngs:exported.length,browserCompanion:reviews,nativeDeviceTested:false};
 fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify(result,null,2));
 console.log(JSON.stringify(result));
})().catch(error=>{console.error(error);process.exit(1);});
