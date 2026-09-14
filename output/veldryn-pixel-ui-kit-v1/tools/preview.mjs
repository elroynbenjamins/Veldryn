import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {bake,manifest,root} from './bake.mjs';
const sharp=(await import(process.env.VELDRYN_SHARP_PATH?pathToFileURL(process.env.VELDRYN_SHARP_PATH).href:'sharp')).default;
const out=async(name,b)=>fs.writeFile(path.join(root,'preview',name),b);
// Stress every resizable component at its geometric minimum and at a larger size.
let tested=0;
for(const a of manifest.assets.filter(a=>a.insets)){
  for(const [w,h]of [[a.minimumSize.width,a.minimumSize.height],[a.width+173,a.mode==='3slice'?a.height:a.height+137]]){
    const png=await bake(a.id,w,h),raw=await sharp(png).ensureAlpha().raw().toBuffer();
    // The protected top-left and bottom-right cap pixels must remain identical.
    const original=await sharp(path.join(root,a.file)).ensureAlpha().raw().toBuffer();
    const cap=a.insets,ch=a.mode==='3slice'?a.height:cap.top;
    for(let y=0;y<ch;y++)for(let x=0;x<cap.left;x++)assert.ok(raw.subarray((y*w+x)*4,(y*w+x+1)*4).equals(original.subarray((y*a.width+x)*4,(y*a.width+x+1)*4)),`${a.id}: top-left cap changed`);
    const rh=a.mode==='3slice'?a.height:cap.bottom;
    for(let y=0;y<rh;y++)for(let x=0;x<cap.right;x++){
      const dst=((h-rh+y)*w+w-cap.right+x)*4,src=((a.height-rh+y)*a.width+a.width-cap.right+x)*4;
      assert.ok(raw.subarray(dst,dst+4).equals(original.subarray(src,src+4)),`${a.id}: bottom-right cap changed`);
    }
    tested++;
  }
  // Regression: doubling stretch zones repeats each source pixel, including thin rails.
  // This catches accidental cover/crop resizing even when all corner tests pass.
  const c=a.insets,cw=a.width-c.left-c.right,ch=a.height-c.top-c.bottom;
  const w=a.width+cw,h=a.mode==='9slice'?a.height+ch:a.height;
  const actual=await sharp(await bake(a.id,w,h)).ensureAlpha().raw().toBuffer();
  const source=await sharp(path.join(root,a.file)).ensureAlpha().raw().toBuffer();
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const sx=x<c.left?x:x>=w-c.right?a.width-(w-x):c.left+Math.floor((x-c.left)/2);
    const sy=a.mode==='3slice'?y:y<c.top?y:y>=h-c.bottom?a.height-(h-y):c.top+Math.floor((y-c.top)/2);
    const dst=(y*w+x)*4,src=(sy*a.width+sx)*4;
    assert.ok(actual.subarray(dst,dst+4).equals(source.subarray(src,src+4)),`${a.id}: stretch pixel cropped/resampled at ${x},${y}`);
  }
  tested++;
}
await fs.mkdir(path.join(root,'qa'),{recursive:true});
await fs.writeFile(path.join(root,'qa/stretch-validation.json'),JSON.stringify({status:'PASS',sizeCases:tested,checks:['minimum-size rendering','larger width/height rendering','protected cap pixels unchanged','exact pixel repetition at doubled stretch-zone dimensions'],sampling:'nearest-neighbor offline bake'},null,2)+'\n');
const fonts=[process.env.VELDRYN_PREVIEW_FONT,'C:/Windows/Fonts/segoeui.ttf','/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'].filter(Boolean);
let fontfile;for(const f of fonts){try{await fs.access(f);fontfile=f;break;}catch{}}
const txt=async(text,size=16,color='#EADCC5')=>sharp({text:{text:`<span foreground="${color}">${text}</span>`,font:`Segoe UI ${size}`,fontfile,rgba:true}}).png().toBuffer();
const asset=async(id)=>fs.readFile(path.join(root,manifest.assets.find(a=>a.id===id).file));
const textLayer=async(layers,text,x,y,size=16,color='#EADCC5')=>layers.push({input:await txt(text,size,color),left:x,top:y});
const centeredText=async(layers,text,x,y,width,size=16,color='#EADCC5')=>{const b=await txt(text,size,color);const m=await sharp(b).metadata();layers.push({input:b,left:x+Math.floor((width-m.width)/2),top:y});};
// Center the rendered glyph bounds inside the frame's padded content rectangle.
// Fixed top offsets fail for fonts, descenders, and short password-mask glyphs.
const controlText=async(layers,text,id,x,y,width,height,size=16,color='#EADCC5',align='center')=>{
  const {padding:p}=manifest.assets.find(a=>a.id===id);
  const b=await txt(text,size,color),m=await sharp(b).metadata();
  const contentWidth=width-p.left-p.right,contentHeight=height-p.top-p.bottom;
  assert.ok(m.width<=contentWidth&&m.height<=contentHeight,`${id}: text exceeds content area`);
  layers.push({input:b,left:x+p.left+(align==='left'?0:Math.floor((contentWidth-m.width)/2)),
    top:y+p.top+Math.floor((contentHeight-m.height)/2)});
};
const screens=[];
for(const kind of ['login','registration','character']){
  const layers=[];
  layers.push({input:await asset('veldryn_logo'),left:51,top:46});
  if(kind==='login'||kind==='registration'){
    const isReg=kind==='registration',y=186,h=isReg?548:450;
    layers.push({input:await bake(isReg?'create_account_frame_9slice':'login_frame_9slice',350,h),left:20,top:y});
    await centeredText(layers,isReg?'Create account':'Welcome back',44,y+42,302,24,'#F0D49A');
    await centeredText(layers,isReg?'Your journey starts here.':'Return to Veldryn.',44,y+79,302,14,'#AABACA');
    const labels=isReg?['Email','Password','Confirm password']:['Email','Password'];
    for(let i=0;i<labels.length;i++){
      const fy=y+122+i*80;
      await textLayer(layers,labels[i],52,fy,14,'#D8C5A5');
      layers.push({input:await bake('input_default_9slice',286,40),left:52,top:fy+23});
      await controlText(layers,i===0?'Email address':'••••••••','input_default_9slice',52,fy+23,286,40,16,'#8C9CAF','left');
    }
    if(isReg){
      layers.push({input:await asset('checkbox_checked'),left:56,top:y+366});
      await textLayer(layers,'I agree to the terms',90,y+368,14);
      layers.push({input:await bake('button_primary_3slice',286,40),left:52,top:y+417});
      await controlText(layers,'Create account','button_primary_3slice',52,y+417,286,40,16,'#F0D49A');
      await centeredText(layers,'Already a member? Sign in',52,y+478,286,14,'#A2E5ED');
    }else{
      layers.push({input:await bake('button_primary_3slice',286,40),left:52,top:y+299});
      await controlText(layers,'Sign in','button_primary_3slice',52,y+299,286,40,16,'#F0D49A');
      layers.push({input:await bake('button_secondary_3slice',286,40),left:52,top:y+355});
      await controlText(layers,'Create account','button_secondary_3slice',52,y+355,286,40,16,'#F0D49A');
      await centeredText(layers,'Forgot your password?',52,668,286,14,'#A2E5ED');
    }
  }else{
    await centeredText(layers,'Choose your path',24,165,342,24,'#F0D49A');
    layers.push({input:await bake('class_selection_frame_9slice',350,518),left:20,top:215});
    await centeredText(layers,'IRONWARDEN',48,253,294,20,'#F0D49A');
    layers.push({input:await asset('character_card_selected_9slice'),left:123,top:300});
    layers.push({input:await asset('veldryn_crystal_crest'),left:163,top:356});
    layers.push({input:await asset('carousel_back'),left:54,top:377});
    layers.push({input:await asset('carousel_next'),left:296,top:377});
    await centeredText(layers,'Existing hero artwork goes here',46,505,298,13,'#AABACA');
    for(let i=0;i<5;i++)layers.push({input:await asset(i===0?'carousel_dot_active':'carousel_dot_inactive'),left:149+i*20,top:536});
    layers.push({input:await bake('gender_frame_selected_3slice',128,40),left:59,top:578});
    layers.push({input:await bake('gender_frame_unselected_3slice',128,40),left:203,top:578});
    await controlText(layers,'Male','gender_frame_selected_3slice',59,578,128,40,16,'#F0D49A');
    await controlText(layers,'Female','gender_frame_unselected_3slice',203,578,128,40,16,'#F0D49A');
    layers.push({input:await bake('button_primary_3slice',274,40),left:58,top:654});
    await controlText(layers,'Continue','button_primary_3slice',58,654,274,40,16,'#F0D49A');
  }
  await centeredText(layers,'ASSET ASSEMBLY / '+kind.toUpperCase(),20,790,350,11,'#7D8DA3');
  const png=await sharp({create:{width:390,height:844,channels:4,background:'#101521'}}).composite(layers).png().toBuffer();
  await out(`${kind}-assembly.png`,png);screens.push({input:png,left:20+screens.length*410,top:78});
}
const title=await txt('VELDRYN · CORE UI + FIRST STEPS',24,'#F0D49A');
await out('assembly-overview.png',await sharp({create:{width:1250,height:950,channels:4,background:'#0B101A'}}).composite([{input:title,left:28,top:24},...screens]).png().toBuffer());
const stress=[];
await textLayer(stress,'RESIZE CHECK / protected corners, nearest pixels',24,20,20,'#F0D49A');
stress.push({input:await bake('panel_large_9slice',280,180),left:24,top:80});
stress.push({input:await bake('panel_large_9slice',440,280),left:328,top:80});
for(let i=0;i<3;i++)stress.push({input:await bake('button_primary_3slice',[144,288,440][i],40),left:24,top:402+i*62});
await out('stretch-preview.png',await sharp({create:{width:800,height:610,channels:4,background:'#1B2638'}}).composite(stress).png().toBuffer());
console.log(`PASS ${tested} stretch cases; rendered three 390×844 assembly examples.`);
