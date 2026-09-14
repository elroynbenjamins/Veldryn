
const fs=require('fs'),path=require('path'),{pathToFileURL}=require('url');
const {chromium}=require('C:/Users/elroy/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'}),page=await browser.newPage({viewport:{width:390,height:844}}),report=[];
for(const config of [{width:390,large:false},{width:320,large:true}]){
 await page.setViewportSize({width:config.width,height:844});
 for(const screen of ['character','inventory','world','profile','login','rewards']){
  await page.goto(pathToFileURL(path.resolve('output/visual-polish-v3/preview.html')).href+(config.large?'?large=1':'')+'#'+screen);
  await page.waitForFunction(()=>Array.from(document.images).every(i=>i.complete));
  const check=await page.evaluate(()=>({documentOverflow:document.documentElement.scrollWidth>innerWidth,brokenImages:Array.from(document.images).filter(i=>!i.naturalWidth).map(i=>i.src)}));
  await page.screenshot({path:'output/visual-polish-v3/'+screen+'-'+config.width+(config.large?'-large':'')+'.png',fullPage:true});report.push({screen,...config,...check});
 }}
 fs.writeFileSync('output/visual-polish-v3/browser-review.json',JSON.stringify({kind:'browser companion, not native device QA',checks:report},null,2));console.log(JSON.stringify(report));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
