// Biome backdrops and harvest nodes for the gathering scenes. Every painter is deterministic
// and palette-driven, so a new region is a palette entry rather than a new illustration.
import {PixelCanvas,dither,noise,mix} from './canvas.mjs';
import {INK} from './gatherer.mjs';

export const SCENE={width:200,height:56,ground:48};

/** Dithered vertical bands between palette stops. */
function gradient(canvas,y0,y1,stops,x0=0,x1=canvas.width){
  const span=Math.max(1,y1-y0);
  for(let y=y0;y<y1;y++){
    const position=(y-y0)/span*(stops.length-1),index=Math.min(stops.length-2,Math.floor(position)),t=position-index;
    for(let x=x0;x<x1;x++)canvas.set(x,y,dither(x,y,t)?stops[index+1]:stops[index]);
  }
}
/** Soft radial glow using ordered dithering: stays on the pixel grid and adds no gradients. */
function glow(canvas,cx,cy,radius,color,strength=.8){
  for(let y=cy-radius;y<=cy+radius;y++)for(let x=cx-radius;x<=cx+radius;x++){
    const distance=Math.hypot(x-cx,(y-cy)*1.25)/radius;
    if(distance<1&&dither(x,y,(1-distance)*strength))canvas.set(x,y,color);
  }
}
function speckle(canvas,x0,y0,x1,y1,color,density,seed){
  for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)if(noise(x,y,seed)<density)canvas.set(x,y,color);
}
function ridge(canvas,baseY,amplitude,period,phase,color,fillTo,seed=0){
  for(let x=0;x<canvas.width;x++){
    const y=Math.round(baseY-amplitude*(.55*Math.sin((x+phase)/period)+.3*Math.sin((x+phase*2)/(period*.43))+.15*(noise(Math.floor(x/3),7,seed)-.5)*2));
    for(let yy=y;yy<fillTo;yy++)canvas.set(x,yy,color);
  }
}

// ---------------------------------------------------------------- biome palettes
export const BIOMES={
  asterfall:{
    cave:{wallDark:'#1f2530',wall:'#2e3644',wallLight:'#3f4a5a',floorLight:'#7a6d5c',floor:'#5a5045',floorDark:'#3c352f',crystal:'#49c2b1',crystalLight:'#b6fff0',lamp:'#ffc66b'},
    wood:{skyTop:'#7fc4e0',skyBottom:'#cfeccf',far:'#6fae7c',mid:'#3f8558',near:'#2c6646',groundLight:'#8ccf6a',ground:'#5fa650',groundDark:'#3d7a40',dirt:'#6b5038',tuft:'#b4e37a',leaf:'#9bd96a'},
    water:{skyTop:'#86c9e6',skyBottom:'#d9f0d6',far:'#7fb98a',farDark:'#4f8f66',waterLight:'#bfeaf2',waterFar:'#7cc3d6',water:'#4f9fc0',waterDeep:'#2f7ea6',bankLight:'#8ccf6a',bank:'#5fa650',bankDark:'#5b4630',reed:'#3d7a40',reedTip:'#8a6a3c',rock:'#7b8794',rockLight:'#a9b6c2'},
  },
  sunscar:{
    cave:{wallDark:'#3c2118',wall:'#5c3424',wallLight:'#804a30',floorLight:'#d2a56b',floor:'#a97a48',floorDark:'#7a5230',crystal:'#f2b63e',crystalLight:'#fff0a8',lamp:'#ffe2a0'},
    wood:{skyTop:'#f4b56a',skyBottom:'#fde6b0',far:'#e2b06e',mid:'#c98c4f',near:'#a86c3c',groundLight:'#f0d090',ground:'#d9ae6c',groundDark:'#b08248',dirt:'#96683a',tuft:'#c9c06a',leaf:'#d8c66a'},
    water:{skyTop:'#f6bd74',skyBottom:'#fde9b8',far:'#e0ad6a',farDark:'#b9834a',waterLight:'#d6f3e6',waterFar:'#8fd6c6',water:'#55b3a6',waterDeep:'#2f8a86',bankLight:'#f0d090',bank:'#d9ae6c',bankDark:'#9a6c3c',reed:'#6f9a4a',reedTip:'#c9a04a',rock:'#b8875a',rockLight:'#e0b684'},
  },
  frostmarch:{
    cave:{wallDark:'#1c2a3d',wall:'#2e4663',wallLight:'#4a6d91',floorLight:'#e4f3fb',floor:'#a9cbe0',floorDark:'#6f97b5',crystal:'#9fe2ff',crystalLight:'#f2fcff',lamp:'#ffd98a'},
    wood:{skyTop:'#9fbfd9',skyBottom:'#e6f1f7',far:'#a9c3d6',mid:'#6f93ad',near:'#456c88',groundLight:'#ffffff',ground:'#dcecf5',groundDark:'#a9c6d9',dirt:'#7d8c99',tuft:'#bcd6e6',leaf:'#eaf6fb'},
    water:{skyTop:'#a6c4dc',skyBottom:'#e9f3f8',far:'#b6cedd',farDark:'#7d9db5',waterLight:'#e4f6fc',waterFar:'#8fb9d1',water:'#4f86ab',waterDeep:'#2f6288',bankLight:'#ffffff',bank:'#dcecf5',bankDark:'#8fafc6',reed:'#7d9db5',reedTip:'#e4f6fc',rock:'#c4dceb',rockLight:'#f2fbff'},
  },
  ashlands:{
    cave:{wallDark:'#171113',wall:'#281d20',wallLight:'#3f2d30',floorLight:'#6a504a',floor:'#463634',floorDark:'#2c2222',crystal:'#ff7a3c',crystalLight:'#ffd08a',lamp:'#ff9a4a'},
    wood:{skyTop:'#4a2a34',skyBottom:'#c9623c',far:'#5c3238',mid:'#3d2428',near:'#2a1a1e',groundLight:'#7a625a',ground:'#54433f',groundDark:'#372b2a',dirt:'#2c2222',tuft:'#8a6a5a',leaf:'#ff9a4a'},
    water:{skyTop:'#4a2a34',skyBottom:'#d06a3e',far:'#5c3238',farDark:'#3a2228',waterLight:'#ffb46a',waterFar:'#6a3f46',water:'#4a2f3c',waterDeep:'#2e1f2c',bankLight:'#7a625a',bank:'#54433f',bankDark:'#2c2222',reed:'#6a4a3a',reedTip:'#ff9a4a',rock:'#463634',rockLight:'#7a625a'},
  },
};

// ---------------------------------------------------------------- backgrounds
/** Wall crystal positions shared with the runtime glint overlay. */
export const CAVE_CRYSTALS=[[26,17],[74,12],[134,20],[168,30]];
export function caveBackground(biome){
  const p=BIOMES[biome].cave,c=new PixelCanvas(SCENE.width,SCENE.height),W=SCENE.width,floorY=SCENE.ground-2;
  gradient(c,0,floorY,[p.wallDark,p.wall,p.wall,p.wallLight]);
  // A paler chamber opening behind the work face gives the cave depth.
  const chamber=mix(p.wallLight,p.floorLight,.22);
  for(let y=4;y<floorY;y++)for(let x=84;x<196;x++){
    const edge=Math.hypot((x-142)/54,(y-floorY)/40);
    if(edge<1&&dither(x,y,(1-edge)*1.15))c.set(x,y,edge<.55&&dither(x+2,y+1,(.55-edge)*1.4)?chamber:p.wallLight);
  }
  // Far stalagmites standing in the chamber.
  for(const [x,h,w] of [[112,13,7],[128,8,5],[152,17,9],[171,10,6],[188,14,8],[20,11,7],[58,7,5]]){
    for(let i=0;i<w;i++){
      const reach=Math.round(h*(1-Math.abs(i-(w-1)/2)/((w+1)/2)));
      c.rect(x+i,floorY-reach,1,reach,p.wall);
      if(i<w/2-1&&reach>2)c.rect(x+i,floorY-reach,1,Math.max(1,reach-2),p.wallLight);
    }
  }
  // Rock strata and blotches.
  for(let i=0;i<26;i++){
    const x=Math.floor(noise(i,1,11)*W),y=4+Math.floor(noise(i,2,11)*(floorY-10)),w=4+Math.floor(noise(i,3,11)*9);
    c.rect(x,y,w,1,noise(i,4,11)>.5?p.wallDark:p.wallLight);
    if(noise(i,5,11)>.6)c.rect(x+1,y+1,Math.max(1,w-3),1,p.wallDark);
  }
  // Ceiling: hanging stone (or ice) teeth.
  for(let x=0;x<W;){
    const width=3+Math.floor(noise(x,9,3)*6),length=3+Math.floor(noise(x,10,3)*9);
    for(let i=0;i<width;i++){
      const reach=Math.round(length*(1-Math.abs(i-(width-1)/2)/((width+1)/2)));
      c.rect(x+i,0,1,reach+2,p.wallDark);
      if(i===0&&reach>2)c.rect(x+i,1,1,reach,biome==='frostmarch'?p.crystal:p.wall);
    }
    x+=width+Math.floor(noise(x,11,3)*5);
  }
  // Crystal clusters growing from the wall (their glints are animated at runtime).
  for(const [x,y] of CAVE_CRYSTALS){
    c.rect(x,y-3,2,4,p.crystal);c.rect(x,y-3,1,3,p.crystalLight);c.rect(x+2,y-1,2,2,p.crystal);c.set(x-1,y,p.crystal);c.set(x+3,y-2,p.crystalLight);
  }
  if(biome!=='frostmarch'){
    // Timber shoring: two posts and a lintel.
    const timber='#5a4028',timberLight='#7d5a38',timberDark='#3a2818';
    for(const x of [156,180]){c.rect(x,14,3,floorY-14,timber);c.rect(x,14,1,floorY-14,timberLight);c.rect(x+2,14,1,floorY-14,timberDark);}
    c.rect(152,11,35,3,timber);c.rect(152,11,35,1,timberLight);c.rect(152,13,35,1,timberDark);
    c.line(159,22,165,14,timberDark);c.line(179,22,173,14,timberDark);
  }
  // Lantern on a timber post lights the work area.
  const lampX=40,lampY=30;
  glow(c,lampX,lampY,19,p.wallLight,.9);glow(c,lampX,lampY,12,mix(p.wallLight,p.lamp,.3),.85);glow(c,lampX,lampY,6,mix(p.wallLight,p.lamp,.6),.9);
  c.rect(lampX-1,lampY+3,2,floorY-lampY-3,'#4a3524');c.rect(lampX-1,lampY+3,1,floorY-lampY-3,'#6b4c30');
  c.rect(lampX-4,lampY+2,8,1,'#4a3524');
  c.rect(lampX-2,lampY-3,4,5,INK);c.rect(lampX-1,lampY-2,2,3,p.lamp);c.set(lampX-1,lampY-2,'#fff6d6');c.rect(lampX-1,lampY-4,2,1,'#4a3524');
  // Floor.
  c.rect(0,floorY,W,SCENE.height-floorY,p.floor);
  c.rect(0,floorY,W,1,p.floorLight);
  for(let x=0;x<W;x++)if(noise(x,30,7)>.55)c.set(x,floorY+1,p.floorLight);
  speckle(c,0,floorY+2,W,SCENE.height,p.floorDark,.2,8);speckle(c,0,floorY+3,W,SCENE.height,p.floorLight,.05,9);
  gradient(c,SCENE.height-3,SCENE.height,[p.floor,p.floorDark]);
  // Loose rubble.
  for(let i=0;i<9;i++){
    const x=6+Math.floor(noise(i,40,2)*(W-12)),y=floorY+2+Math.floor(noise(i,41,2)*4);
    c.rect(x,y,3,2,p.floorDark);c.rect(x,y,2,1,p.floorLight);
  }
  if(biome==='ashlands'){
    for(let i=0;i<6;i++){const x=12+Math.floor(noise(i,50,4)*(W-30)),y=floorY+2+Math.floor(noise(i,51,4)*4);c.rect(x,y,4+Math.floor(noise(i,52,4)*5),1,p.crystal);c.set(x+1,y,p.crystalLight);}
  }
  if(biome==='sunscar'){
    // A dusty shaft of daylight from a crack in the roof.
    const shaft=mix(p.wallLight,p.lamp,.5);
    for(let y=0;y<floorY;y++)for(let x=120+Math.floor(y*.45);x<129+Math.floor(y*.62);x++)if(dither(x,y,.3-.12*y/floorY))c.set(x,y,shaft);
  }
  return c;
}

function roundTree(c,x,baseY,height,width,trunk,leaf,leafDark){
  c.rect(x,baseY-Math.floor(height*.45),2,Math.floor(height*.45),trunk);
  c.ellipse(x+1,baseY-height*.62,width/2,height*.42,leafDark);
  c.ellipse(x,baseY-height*.68,width/2-1.5,height*.32,leaf);
}
function pine(c,x,baseY,height,width,trunk,leaf,snow){
  c.rect(x,baseY-3,2,3,trunk);
  for(let tier=0;tier<4;tier++){
    const top=baseY-height+tier*(height/4.6),half=1+tier*(width/8);
    for(let row=0;row<height/3.4;row++){
      const span=Math.round(half*(row+1)/(height/3.4));
      c.rect(x+1-span,Math.round(top+row),span*2,1,leaf);
      if(snow&&row===0)c.rect(x+1-span,Math.round(top+row),Math.max(1,span*2),1,snow);
    }
  }
  if(snow)c.set(x,baseY-height,snow);
}
function deadTree(c,x,baseY,height,color){
  c.rect(x,baseY-height,2,height,color);
  c.line(x,baseY-height+4,x-4,baseY-height-1,color);c.line(x+1,baseY-height+7,x+5,baseY-height+2,color);
  c.line(x-4,baseY-height-1,x-5,baseY-height-4,color);
}
function acacia(c,x,baseY,height,width,trunk,leaf,leafDark){
  c.line(x,baseY,x+2,baseY-height+3,trunk);c.line(x+1,baseY,x+3,baseY-height+3,trunk);
  c.ellipse(x+3,baseY-height+1,width/2,2.2,leafDark);c.ellipse(x+2,baseY-height,width/2-1,1.4,leaf);
}

export function forestBackground(biome){
  const p=BIOMES[biome].wood,c=new PixelCanvas(SCENE.width,SCENE.height),W=SCENE.width,groundY=SCENE.ground-3;
  gradient(c,0,34,[p.skyTop,p.skyBottom,p.skyBottom]);
  if(biome==='sunscar'){c.ellipse(150,13,6,6,'#fff4c8');c.ellipse(150,13,4,4,'#ffffff');}
  if(biome==='ashlands')glow(c,150,30,22,'#f08a4a',.7);
  if(biome==='asterfall'||biome==='frostmarch'){
    // Soft clouds.
    for(const [x,y,w] of [[28,8,16],[92,5,12],[160,10,18]]){c.rect(x,y,w,2,'#ffffff');c.rect(x+2,y-1,w-5,1,'#ffffff');}
  }
  ridge(c,30,5,31,0,p.far,groundY,1);
  if(biome==='sunscar'){
    ridge(c,36,4,23,40,p.mid,groundY,2);ridge(c,41,3,17,90,p.near,groundY,3);
    for(const x of [22,58,134,176])acacia(c,x,groundY,12+((x*7)%5),13,'#7a5230',p.tuft,'#8f9a4a');
  }else if(biome==='frostmarch'){
    for(let i=0;i<13;i++){const x=4+i*16+Math.floor(noise(i,1,21)*8);pine(c,x,groundY,15+Math.floor(noise(i,2,21)*7),11,'#4a3a30',p.mid,p.groundLight);}
    for(let i=0;i<8;i++){const x=10+i*26+Math.floor(noise(i,3,22)*10);pine(c,x,groundY,22+Math.floor(noise(i,4,22)*7),15,'#3a2c26',p.near,p.groundLight);}
  }else if(biome==='ashlands'){
    ridge(c,37,4,19,30,p.mid,groundY,2);
    for(const x of [14,40,70,128,152,186])deadTree(c,x,groundY,13+((x*5)%8),p.near);
  }else{
    for(let i=0;i<14;i++){const x=2+i*15+Math.floor(noise(i,1,31)*8);roundTree(c,x,groundY,14+Math.floor(noise(i,2,31)*6),12,'#5a4630',p.mid,p.far);}
    for(let i=0;i<9;i++){const x=8+i*23+Math.floor(noise(i,3,32)*9);roundTree(c,x,groundY,20+Math.floor(noise(i,4,32)*7),16,'#4a3826',p.near,p.mid);}
  }
  // Ground.
  c.rect(0,groundY,W,SCENE.height-groundY,p.ground);
  for(let x=0;x<W;x++){c.set(x,groundY,p.groundLight);if(noise(x,60,6)>.5)c.set(x,groundY+1,p.groundLight);}
  speckle(c,0,groundY+2,W,SCENE.height,p.groundDark,.16,12);
  gradient(c,SCENE.height-4,SCENE.height,[p.ground,p.groundDark]);
  // Worn footpath where the gatherer works.
  for(let x=62;x<120;x++)for(let y=groundY+3;y<groundY+7;y++)if(dither(x,y,.42))c.set(x,y,p.dirt);
  // Tufts, flowers and undergrowth.
  for(let i=0;i<22;i++){
    const x=3+Math.floor(noise(i,70,13)*(W-6)),y=groundY+1+Math.floor(noise(i,71,13)*5);
    c.set(x,y,p.tuft);c.set(x-1,y+1,p.tuft);c.set(x+1,y+1,p.tuft);
    if(biome==='asterfall'&&noise(i,72,13)>.72)c.set(x,y-1,noise(i,73,13)>.5?'#fff2a8':'#ffb3c7');
  }
  for(const [x,w] of [[4,15],[168,20],[142,10]]){
    c.ellipse(x+w/2,groundY-1,w/2,4,p.near);c.ellipse(x+w/2-1,groundY-2,w/2-2,2.6,p.mid);
    if(biome==='frostmarch')c.rect(Math.round(x+w/4),groundY-5,Math.round(w/2),1,p.groundLight);
  }
  return c;
}

export function watersideBackground(biome,cave=false){
  const cavePalette=BIOMES[biome].cave;
  const p=cave?{...BIOMES[biome].water,waterLight:'#8fd9d2',waterFar:'#3f8f96',water:'#2b6c7a',waterDeep:'#1b4a5c',bankLight:cavePalette.floorLight,bank:cavePalette.floor,bankDark:cavePalette.floorDark,reed:'#4f6a66',reedTip:cavePalette.crystal,rock:cavePalette.wallLight,rockLight:cavePalette.floorLight}:BIOMES[biome].water;
  const c=new PixelCanvas(SCENE.width,SCENE.height),W=SCENE.width,horizon=27;
  if(cave){
    gradient(c,0,horizon,[cavePalette.wallDark,cavePalette.wall,cavePalette.wallLight]);
    for(let x=0;x<W;){
      const width=3+Math.floor(noise(x,9,41)*6),length=3+Math.floor(noise(x,10,41)*8);
      for(let i=0;i<width;i++)c.rect(x+i,0,1,Math.round(length*(1-Math.abs(i-(width-1)/2)/((width+1)/2)))+2,cavePalette.wallDark);
      x+=width+Math.floor(noise(x,11,41)*5);
    }
    for(let i=0;i<6;i++){const x=12+Math.floor(noise(i,20,42)*(W-24)),y=10+Math.floor(noise(i,21,42)*12);c.set(x,y,cavePalette.crystal);c.set(x,y-1,cavePalette.crystalLight);c.set(x+1,y,cavePalette.crystal);}
    ridge(c,horizon-2,2,13,5,cavePalette.wallDark,horizon+1,43);
  }else{
    gradient(c,0,horizon,[p.skyTop,p.skyBottom,p.skyBottom]);
    if(biome==='sunscar'){c.ellipse(156,10,5,5,'#fff4c8');c.ellipse(156,10,3,3,'#ffffff');}
    if(biome==='ashlands')glow(c,150,24,20,'#f08a4a',.7);
    if(biome==='asterfall'||biome==='frostmarch')for(const [x,y,w] of [[34,7,15],[110,4,11],[168,9,16]]){c.rect(x,y,w,2,'#ffffff');c.rect(x+2,y-1,w-5,1,'#ffffff');}
    ridge(c,horizon-6,5,29,10,p.far,horizon+1,44);
    if(biome==='frostmarch')for(let i=0;i<11;i++){const x=6+i*18+Math.floor(noise(i,1,45)*8);pine(c,x,horizon,9+Math.floor(noise(i,2,45)*5),8,'#4a3a30',p.farDark,'#ffffff');}
    else if(biome==='sunscar')for(const x of [20,64,128,180])acacia(c,x,horizon,9,11,'#7a5230',p.reed,p.farDark);
    else if(biome==='ashlands')for(const x of [16,52,96,140,184])deadTree(c,x,horizon,9+((x*3)%5),p.farDark);
    else for(let i=0;i<13;i++){const x=4+i*16+Math.floor(noise(i,1,46)*7);roundTree(c,x,horizon,9+Math.floor(noise(i,2,46)*5),10,'#5a4630',p.farDark,p.far);}
  }
  // Water: bright at the horizon, deep in the foreground.
  gradient(c,horizon,SCENE.height,[p.waterFar,p.water,p.water,p.waterDeep]);
  const horizonLight=biome==='ashlands'?mix(p.waterFar,p.waterLight,.45):p.waterLight;
  c.rect(0,horizon,W,1,horizonLight);
  for(let x=0;x<W;x++)if(noise(x,80,14)>.6)c.set(x,horizon+1,horizonLight);
  // Still reflection streaks (the moving shimmer is drawn at runtime).
  for(let i=0;i<16;i++){
    const y=horizon+3+Math.floor(noise(i,81,15)*(SCENE.height-horizon-6)),x=96+Math.floor(noise(i,82,15)*(W-104));
    c.rect(x,y,3+Math.floor(noise(i,83,15)*5),1,mix(p.water,p.waterLight,.45));
  }
  // Rocks breaking the surface.
  for(const [x,y,w] of [[158,35,9],[176,41,6]]){
    c.ellipse(x+w/2,y,w/2,2.4,p.rock);c.rect(Math.round(x+1),y-2,Math.round(w/2),1,p.rockLight);c.rect(x-1,y+2,w+3,1,p.waterLight);
  }
  if(biome==='frostmarch'&&!cave)for(const [x,y,w] of [[122,33,12],[142,47,15],[186,31,9]]){c.rect(x,y,w,2,'#f2fbff');c.rect(x+1,y+2,w-1,1,p.rock);}
  // Foreground bank where the angler stands.
  const bankTop=40;
  for(let x=0;x<104;x++){
    const slope=x<86?0:Math.round(Math.pow((x-86)/18,1.7)*16);
    for(let y=bankTop+slope;y<SCENE.height;y++)c.set(x,y,y-(bankTop+slope)<2?p.bankLight:y-(bankTop+slope)<5?p.bank:p.bankDark);
  }
  speckle(c,0,bankTop+5,86,SCENE.height,mix(p.bankDark,INK,.3),.12,16);
  speckle(c,0,bankTop+2,86,bankTop+5,p.bankLight,.2,17);
  for(let x=86;x<106;x++){const slope=Math.round(Math.pow((x-86)/18,1.7)*16);c.set(x,bankTop+slope+ (x>100?1:0),p.waterLight);}
  // Reeds at the water's edge.
  for(const [x,h] of [[92,9],[95,12],[98,8],[102,10],[10,7],[14,10]]){
    const base=x<86?bankTop:bankTop+Math.round(Math.pow((x-86)/18,1.7)*16);
    c.rect(x,base-h,1,h,p.reed);c.set(x,base-h,p.reedTip);c.set(x,base-h-1,p.reedTip);
    if(h>8)c.set(x+1,base-h+3,p.reed);
  }
  // Tufts on the bank.
  for(let i=0;i<9;i++){const x=4+Math.floor(noise(i,90,18)*78);c.set(x,bankTop-1,p.bankLight);c.set(x+1,bankTop-2,p.bankLight);}
  return c;
}

// ---------------------------------------------------------------- harvest nodes
export const ORES={
  COPPER_ORE:{biome:'asterfall',ore:'#c8733a',oreLight:'#f6b07a',oreDark:'#8a4a22'},
  ASTER_IRON_ORE:{biome:'asterfall',ore:'#8fa6c0',oreLight:'#e0edf7',oreDark:'#56708a'},
  OATHSTONE_ORE:{biome:'asterfall',ore:'#8a72c4',oreLight:'#cdbcf5',oreDark:'#54428a'},
  ECHO_QUARTZ:{biome:'asterfall',ore:'#6fd6cc',oreLight:'#e2fffa',oreDark:'#3a8f8a',crystal:true},
  SUNSTONE_ORE:{biome:'sunscar',ore:'#f0a030',oreLight:'#fff0a0',oreDark:'#b0661a'},
  FROSTIRON:{biome:'frostmarch',ore:'#6fc0ea',oreLight:'#eafaff',oreDark:'#3a7fb0'},
  BLACKGLASS_ORE:{biome:'ashlands',ore:'#5a3a7a',oreLight:'#d080ff',oreDark:'#2a1a3a',crystal:true},
};
const ROCK_TONES={
  asterfall:{light:'#8b95a3',base:'#69727f',dark:'#474f5a'},
  sunscar:{light:'#d9a878',base:'#b07f54',dark:'#7d5536'},
  frostmarch:{light:'#d7ebf6',base:'#9dbdd3',dark:'#6688a3'},
  ashlands:{light:'#6f5a58',base:'#4c3c3c',dark:'#2f2526'},
};
export const ROCK={width:28,height:22};
export function oreRock(oreId){
  const ore=ORES[oreId],tone=ROCK_TONES[ore.biome],c=new PixelCanvas(ROCK.width,ROCK.height);
  const shape=(dx,dy,color)=>{c.ellipse(13+dx,14+dy,11,7,color);c.ellipse(9+dx,10+dy,7,6,color);c.ellipse(18+dx,11+dy,6,5,color);};
  shape(0,0,tone.dark);shape(-1,-1,tone.base);
  c.ellipse(8,8,4,3,tone.light);c.ellipse(17,9,3,2,tone.light);c.rect(5,12,5,1,tone.light);
  // Fracture lines.
  c.line(12,6,14,11,tone.dark);c.line(14,11,12,15,tone.dark);c.line(19,12,22,16,tone.dark);
  // Flat base so the rock sits on the cave floor.
  for(let x=0;x<ROCK.width;x++)for(let y=20;y<ROCK.height;y++)c.clear(x,y);
  c.rect(3,19,22,1,tone.dark);
  const veins=ore.crystal?[[7,7],[15,5],[20,10],[10,13]]:[[6,9],[11,12],[16,8],[20,13],[9,16],[15,15]];
  for(const [x,y] of veins){
    if(ore.crystal){
      c.rect(x,y-3,2,5,ore.ore);c.rect(x,y-3,1,4,ore.oreLight);c.set(x+2,y,ore.oreDark);c.set(x+2,y+1,ore.ore);c.set(x-1,y+1,ore.oreDark);
    }else{
      c.rect(x,y,3,2,ore.ore);c.set(x,y,ore.oreLight);c.set(x+2,y+1,ore.oreDark);c.set(x+3,y,ore.ore);
    }
  }
  return c.outline(INK);
}

export const WOODS={
  GREENWOOD_LOG:{biome:'asterfall',style:'round',bark:'#7a5a3a',barkLight:'#a07e52',barkDark:'#523a26',leaf:'#5fb04a',leafLight:'#a6e06a',leafDark:'#357a3a',wood:'#e0bf86'},
  IRONWOOD_LOG:{biome:'asterfall',style:'round',bark:'#5c5b5e',barkLight:'#8a8a8e',barkDark:'#38383c',leaf:'#3f7f5c',leafLight:'#6fb486',leafDark:'#244f3c',wood:'#b9b2a4'},
  CROWNWOOD_LOG:{biome:'asterfall',style:'round',bark:'#a08a6a',barkLight:'#d0bc94',barkDark:'#6e5c44',leaf:'#b7b84a',leafLight:'#f0e684',leafDark:'#7a7a2c',wood:'#f0dca8'},
  DUNEWOOD:{biome:'sunscar',style:'acacia',bark:'#a8794a',barkLight:'#d6a86e',barkDark:'#74502e',leaf:'#9aa64a',leafLight:'#d0d67a',leafDark:'#66722e',wood:'#e8c68a'},
  WHITEPINE_LOG:{biome:'frostmarch',style:'pine',bark:'#6a5648',barkLight:'#94806e',barkDark:'#46382e',leaf:'#3f7a6c',leafLight:'#ffffff',leafDark:'#264f48',wood:'#ead8b8'},
  CINDERWOOD_LOG:{biome:'ashlands',style:'cinder',bark:'#3a2c2c',barkLight:'#6a4a40',barkDark:'#1f1718',leaf:'#e0562c',leafLight:'#ffb04a',leafDark:'#8a2a1c',wood:'#c98a5a'},
};
export const TREE={width:46,height:54,trunkLeft:19,trunkWidth:8};
export function tree(woodId){
  const w=WOODS[woodId],c=new PixelCanvas(TREE.width,TREE.height),left=TREE.trunkLeft,trunkW=TREE.trunkWidth,base=TREE.height-2;
  const trunkTop=w.style==='pine'?10:w.style==='acacia'?16:20;
  // Trunk with bark shading and a flared root.
  for(let y=trunkTop;y<=base;y++){
    const flare=y>base-4?Math.ceil((y-(base-4))/2):0;
    c.rect(left-flare,y,trunkW+flare*2,1,w.bark);
    c.rect(left-flare,y,2,1,w.barkLight);c.rect(left+trunkW+flare-2,y,2,1,w.barkDark);
  }
  for(let i=0;i<9;i++){const y=trunkTop+4+i*3;c.rect(left+2+(i%2)*2,y,2,1,w.barkDark);if(i%3===0)c.set(left+3,y+1,w.barkLight);}
  // The chop notch faces the woodcutter: pale heartwood where the axe bites.
  const notchY=base-13;
  c.rect(left,notchY,3,4,w.wood);c.rect(left,notchY+1,4,2,w.wood);c.set(left+3,notchY+1,w.barkDark);c.rect(left,notchY+4,2,1,w.barkDark);
  if(w.style==='pine'){
    for(let tier=0;tier<5;tier++){
      const top=tier*7,half=5+tier*3.6;
      for(let row=0;row<10;row++){
        const span=Math.round(2+half*row/9),y=top+row;
        c.rect(left+trunkW/2-span,y,span*2,1,row>6?w.leafDark:w.leaf);
        if(row<2||(row===2&&tier>0))c.rect(left+trunkW/2-span,y,span*2,1,w.leafLight);
        if(row>=2&&row<5)c.rect(left+trunkW/2-span,y,Math.max(1,Math.round(span*.5)),1,w.leafLight);
      }
    }
  }else if(w.style==='acacia'){
    c.line(left+2,trunkTop+2,left-9,trunkTop-6,w.bark);c.line(left+3,trunkTop+2,left-8,trunkTop-6,w.barkDark);
    c.line(left+5,trunkTop+2,left+17,trunkTop-7,w.bark);c.line(left+6,trunkTop+2,left+18,trunkTop-7,w.barkDark);
    for(const [x,y,rx,ry] of [[23,6,21,5],[12,10,11,4],[34,10,11,4]]){c.ellipse(x,y+1,rx,ry,w.leafDark);c.ellipse(x,y,rx-1,ry-1,w.leaf);c.ellipse(x-2,y-1,rx-5,Math.max(1,ry-2.6),w.leafLight);}
  }else if(w.style==='cinder'){
    c.line(left+2,trunkTop+3,left-8,trunkTop-9,w.bark);c.line(left+3,trunkTop+3,left-7,trunkTop-9,w.barkLight);
    c.line(left+5,trunkTop+3,left+16,trunkTop-10,w.bark);c.line(left+6,trunkTop+3,left+17,trunkTop-10,w.barkDark);
    c.line(left+3,trunkTop,left+4,trunkTop-14,w.bark);c.line(left+4,trunkTop,left+5,trunkTop-14,w.barkDark);
    for(const [x,y,rx,ry] of [[10,9,8,5],[36,8,8,5],[23,4,9,4],[23,14,7,3]]){c.ellipse(x,y+1,rx,ry,w.leafDark);c.ellipse(x,y,rx-1,ry-1,w.leaf);c.ellipse(x-1,y-1,rx-4,Math.max(1,ry-2.4),w.leafLight);}
    // Glowing seams in the charred bark.
    for(const y of [trunkTop+6,trunkTop+15,trunkTop+24])c.rect(left+3,y,1,3,w.leaf);
  }else{
    for(const [x,y,rx,ry] of [[23,14,20,13],[11,17,10,8],[35,17,10,8],[23,7,13,7]])c.ellipse(x,y+1,rx,ry,w.leafDark);
    for(const [x,y,rx,ry] of [[22,13,18,11],[11,16,8,6],[34,16,8,6],[23,7,11,5]])c.ellipse(x,y,rx,ry,w.leaf);
    for(const [x,y,rx,ry] of [[17,8,7,3],[9,14,4,2],[30,12,5,2],[20,15,4,1.5]])c.ellipse(x,y,rx,ry,w.leafLight);
    for(let i=0;i<14;i++){const x=6+Math.floor(noise(i,1,woodId.length)*34),y=10+Math.floor(noise(i,2,woodId.length)*14);if(c.alpha(x,y))c.set(x,y,w.leafDark);}
  }
  return c.outline(INK);
}

// ---------------------------------------------------------------- yield pops & water effects
export function oreChunk(oreId){
  const ore=ORES[oreId],tone=ROCK_TONES[ore.biome],c=new PixelCanvas(10,10);
  c.stamp(1,1,['..bbbb..','.bllbbb.','bloobbdb','bbooOodb','bbbOoddb','.bbdddd.','..dddd..'],{b:tone.base,l:tone.light,d:tone.dark,o:ore.ore,O:ore.oreLight});
  return c.outline(INK);
}
export function logPiece(woodId){
  const w=WOODS[woodId],c=new PixelCanvas(13,9);
  c.stamp(1,2,['.bbbbbbbbb.','WwBBBBBBBBb','WwBbBBBbBBd','WwBBBBBBBBd','.ddddddddd.'],{b:w.barkLight,B:w.bark,d:w.barkDark,W:w.wood,w:mix(w.wood,w.barkDark,.3)});
  return c.outline(INK);
}
/** Expanding ring where the bobber touches the water. White so it can be tinted to any water palette. */
export function rippleFrames(){
  return [[3,1],[5,1.6],[7,2.2],[9,2.8]].map(([rx,ry],index)=>{
    const c=new PixelCanvas(20,8);
    for(let a=0;a<360;a+=4){
      const x=Math.round(10+Math.cos(a*Math.PI/180)*rx),y=Math.round(4+Math.sin(a*Math.PI/180)*ry);
      if(index<3||a%24<12)c.set(x,y,[255,255,255,index===3?150:255]);
    }
    return c;
  });
}
export function splashFrames(){
  const rows=[
    ['..........','..........','..........','....xx....','...xxxx...','..x.xx.x..'],
    ['..........','....x.....','..x.xx.x..','...xxxx...','..xx..xx..','.x......x.'],
    ['...x..x...','.x......x.','..........','..x....x..','.x......x.','..........'],
    ['.x......x.','..........','x........x','..........','..........','..........'],
  ];
  return rows.map(frame=>{const c=new PixelCanvas(10,6);c.stamp(0,0,frame,{x:[255,255,255,255]});return c;});
}
