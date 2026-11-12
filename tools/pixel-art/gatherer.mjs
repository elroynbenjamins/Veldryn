// The gatherer: one small side-view adventurer rigged from stamped body parts plus
// procedurally posed arms and tools, so every frame of every action shares proportions.
import {PixelCanvas} from './canvas.mjs';

export const GATHERER_PALETTE={
  h:'#4a3020',H:'#7a5233',              // hair, hair highlight
  s:'#e8b48a',S:'#b9805c',e:'#2a1a1a',  // skin, skin shade, eye
  t:'#3f7f6d',T:'#58a58c',d:'#2a574e',  // tunic, tunic light, tunic shade
  b:'#6b4526',B:'#d9b160',              // belt, buckle
  p:'#4b4038',P:'#6a5b4d',              // trousers shade (back leg), trousers
  k:'#3a2a20',K:'#5a4030',              // boots shade, boots
  w:'#8a5f38',W:'#b98b52',              // tool handle wood, wood light
  m:'#9aa7b4',M:'#e6eef5',n:'#5d6975',  // metal, metal light, metal shade
  r:'#c9423a',R:'#f08a6a',              // bobber red, bobber highlight
  l:'#aebccb',                          // fishing line
  f:'#9fb9c9',F:'#e3f0f6',g:'#56707f',  // fish body, fish belly, fish back
  x:'#ffffff',y:'#bfe3ff',              // motion smear core, smear edge
};
export const INK='#1a1520';

const HEAD=[
  '..hhhh..',
  '.hHHhhh.',
  'hhHhhhhh',
  'hhhsssss',
  'hhssesss',
  'hhsssssS',
  '.hsssss.',
  '..SssS..',
];
const TORSO=[
  '..tTTt...',
  '.tTTTTtt.',
  'tTTTTTttd',
  'tTTTTTttd',
  'tTTTTtttd',
  'tTTTTtttd',
  'bbbbBBbbb',
  'tTTTTtttd',
  '.tTTtttd.',
];
const LEGS=[
  '.ppp.PPP.',
  '.ppp.PPP.',
  '.ppp.PPP.',
  '.ppp.PPP.',
  '.kkk.KKK.',
  '.kkkkKKKK',
];
// A planted, slightly bent stance used on the frames where weight comes down.
const LEGS_BENT=[
  '.ppp.PPP..',
  '.ppp.PPP..',
  '.ppp..PPP.',
  '.ppp..PPP.',
  '.kkk..KKK.',
  '.kkkk.KKKK',
];

const FEET_Y=37;      // sole row inside a frame
const BODY_X=15;      // left edge of the body column inside a frame
const rad=degrees=>degrees*Math.PI/180;

function fillPolygon(canvas,points,color){
  const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
  for(let y=Math.floor(Math.min(...ys));y<=Math.ceil(Math.max(...ys));y++){
    for(let x=Math.floor(Math.min(...xs));x<=Math.ceil(Math.max(...xs));x++){
      let inside=false;
      for(let i=0,j=points.length-1;i<points.length;j=i++){
        const [xi,yi]=points[i],[xj,yj]=points[j];
        if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)inside=!inside;
      }
      if(inside)canvas.set(x,y,color);
    }
  }
}

function drawTool(canvas,P,tool,grip,angle){
  const u=[Math.cos(rad(angle)),Math.sin(rad(angle))],n=[-u[1],u[0]];
  const at=(along,across=0)=>[grip[0]+u[0]*along+n[0]*across,grip[1]+u[1]*along+n[1]*across];
  if(tool==='rod'){
    const butt=at(-3),tip=at(21);
    canvas.line(butt[0],butt[1],tip[0],tip[1],P.w);
    const reel=at(1,1);canvas.set(reel[0],reel[1],P.n);
    const upper=at(11);canvas.line(upper[0],upper[1],tip[0],tip[1],P.W);
    return {tip:[Math.round(tip[0]),Math.round(tip[1])]};
  }
  const butt=at(-3),neck=at(14);
  canvas.thickLine(butt[0],butt[1],neck[0],neck[1],2,P.w);
  canvas.line(butt[0],butt[1],neck[0],neck[1],P.W);
  if(tool==='pickaxe'){
    // A curved double-pointed head, perpendicular to the handle.
    const points=[at(11,-6),at(13,-3),at(14,0),at(13,3),at(11,6)];
    for(let i=0;i<points.length-1;i++)canvas.thickLine(points[i][0],points[i][1],points[i+1][0],points[i+1][1],2,P.m);
    for(let i=1;i<points.length-2;i++)canvas.line(points[i][0],points[i][1],points[i+1][0],points[i+1][1],P.M);
    const tipA=at(11,-6),tipB=at(11,6);canvas.set(tipA[0],tipA[1],P.n);canvas.set(tipB[0],tipB[1],P.n);
    return {tip:[Math.round(at(14,0)[0]),Math.round(at(14,0)[1])],strike:at(12,6).map(Math.round)};
  }
  // Axe: a wedge that widens toward the cutting edge on the leading side of the swing.
  fillPolygon(canvas,[at(11,-2),at(15,-2),at(16,3),at(15,5),at(11,5),at(10,3)],P.m);
  const edgeA=at(10,5),edgeB=at(16,5);canvas.line(edgeA[0],edgeA[1],edgeB[0],edgeB[1],P.M);
  const backA=at(11,-2),backB=at(15,-2);canvas.line(backA[0],backA[1],backB[0],backB[1],P.n);
  const eye=at(13,1);canvas.set(eye[0],eye[1],P.n);
  return {tip:[Math.round(at(15,0)[0]),Math.round(at(15,0)[1])],strike:at(13,5).map(Math.round)};
}

function arm(canvas,P,from,to,sleeve){
  canvas.thickLine(from[0],from[1],to[0],to[1],2,sleeve);
  canvas.rect(Math.round(to[0])-1,Math.round(to[1])-1,2,2,P.s);
}

/**
 * @param {{tool:'pickaxe'|'axe'|'rod',angle:number,grip:[number,number],lean?:number,drop?:number,bent?:boolean,headTilt?:number}} pose
 * @returns {{canvas:PixelCanvas,tip:[number,number],strike?:number[]}}
 */
export function drawGatherer(width,height,pose,extra){
  const canvas=new PixelCanvas(width,height),P=GATHERER_PALETTE;
  const lean=pose.lean??0,drop=pose.drop??0;
  const legsTop=FEET_Y-5,torsoTop=legsTop-9+drop,headTop=torsoTop-8;
  const bodyX=BODY_X+lean,headX=bodyX+(pose.headTilt??0)+(lean>0?1:0);
  const shoulderBack=[bodyX+2,torsoTop+2],shoulderFront=[bodyX+6,torsoTop+2];
  const u=[Math.cos(rad(pose.angle)),Math.sin(rad(pose.angle))];
  const gripBack=pose.grip,gripFront=[pose.grip[0]+u[0]*4,pose.grip[1]+u[1]*4];
  arm(canvas,P,shoulderBack,gripBack,P.d);
  canvas.stamp(BODY_X,legsTop,pose.bent?LEGS_BENT:LEGS,P);
  canvas.stamp(bodyX,torsoTop,TORSO,P);
  canvas.stamp(headX,headTop,HEAD,P);
  const tool=drawTool(canvas,P,pose.tool,gripBack,pose.angle);
  arm(canvas,P,shoulderFront,gripFront,P.t);
  canvas.outline(INK);
  // Anything drawn after the outline (line, bobber, smear, fish) keeps its own thin silhouette.
  extra?.(canvas,P,tool);
  return {canvas,tip:tool.tip,strike:tool.strike};
}

/** A two-tone motion smear along the arc the tool head just travelled. */
function smear(canvas,P,grip,fromAngle,toAngle,radius){
  const steps=Math.max(6,Math.round(Math.abs(toAngle-fromAngle)/6));
  for(let i=0;i<=steps;i++){
    const angle=rad(fromAngle+(toAngle-fromAngle)*i/steps),fade=i/steps;
    const x=grip[0]+Math.cos(angle)*radius,y=grip[1]+Math.sin(angle)*radius;
    if(fade>.35)canvas.set(x,y,fade>.7?P.x:P.y);
    if(fade>.6)canvas.set(grip[0]+Math.cos(angle)*(radius-1),grip[1]+Math.sin(angle)*(radius-1),P.y);
  }
}

const SWING_FRAME={width:48,height:40};
function swingClip(tool,poses,smearFrame){
  const frames=poses.map((pose,index)=>drawGatherer(SWING_FRAME.width,SWING_FRAME.height,{tool,...pose},index===smearFrame
    ?(canvas,P)=>smear(canvas,P,pose.grip,poses[index-1].angle,pose.angle,tool==='pickaxe'?16:17)
    :undefined));
  return frames;
}

/** Mining: ready, wind-up, swing, impact, recoil, recover. */
export function miningFrames(){
  const frames=swingClip('pickaxe',[
    {angle:-78,grip:[23,24]},
    {angle:-138,grip:[21,22],lean:-1},
    {angle:-56,grip:[24,22],lean:1},
    {angle:10,grip:[25,25],lean:2,drop:1,bent:true},
    {angle:0,grip:[25,25],lean:1,bent:true},
    {angle:-52,grip:[24,24]},
  ],2);
  return {frames:frames.map(f=>f.canvas),durationsMs:[230,170,70,120,120,210],impactFrame:3,contact:frames[3].strike,frame:SWING_FRAME};
}

/** Woodcutting: ready, shoulder wind-up, swing, bite into the trunk, hold, recover. */
export function choppingFrames(){
  const frames=swingClip('axe',[
    {angle:-76,grip:[23,24]},
    {angle:-146,grip:[21,22],lean:-1},
    {angle:-52,grip:[24,22],lean:1},
    {angle:-6,grip:[25,24],lean:2,bent:true},
    {angle:-10,grip:[25,24],lean:2,bent:true},
    {angle:-50,grip:[24,24]},
  ],2);
  return {frames:frames.map(f=>f.canvas),durationsMs:[260,190,70,140,140,220],impactFrame:3,contact:frames[3].strike,frame:SWING_FRAME};
}

const FISH_FRAME={width:80,height:48};
/** Where the bobber rests on the water, in fishing-frame pixels. */
export const BOBBER_REST=[66,42];

function bobber(canvas,P,x,y,submerged=0){
  if(submerged<2){canvas.rect(x-1,y-2+submerged,3,2-Math.max(0,submerged-1),P.r);canvas.set(x-1,y-2+submerged,P.R);}
  if(submerged<1)canvas.rect(x-1,y,3,1,P.x);
  canvas.set(x,y-3+submerged,INK);
}
function fishingLine(canvas,P,from,to,sag){
  const mid=[(from[0]+to[0])/2,(from[1]+to[1])/2+sag];
  canvas.line(from[0],from[1],mid[0],mid[1],P.l);
  canvas.line(mid[0],mid[1],to[0],to[1],P.l);
}
function fish(canvas,P,x,y){
  // Hooked head-up, so it reads as a catch hanging from the line.
  canvas.stamp(x,y,[
    '..ii..',
    '.iggi.',
    'igefgi',
    'igffFi',
    'igfFFi',
    '.igFi.',
    '.igfi.',
    'iggfgi',
    'ii..ii',
  ],{i:INK,g:P.g,f:P.f,F:P.F,e:INK});
}

/** Fishing: a cast, a calm waiting loop, and a catch reaction that only plays for a resolved action. */
export function fishingFrames(){
  const make=(pose,extra)=>drawGatherer(FISH_FRAME.width,FISH_FRAME.height,{tool:'rod',...pose},extra).canvas;
  const [bx,by]=BOBBER_REST;
  const cast=[
    make({angle:-128,grip:[21,25],lean:-1},(c,P,t)=>fishingLine(c,P,t.tip,[t.tip[0]-3,t.tip[1]+7],1)),
    make({angle:-64,grip:[24,24],lean:1},(c,P,t)=>{smear(c,P,[24,24],-128,-64,21);fishingLine(c,P,t.tip,[46,6],-2);bobber(c,P,46,7);}),
    make({angle:-34,grip:[25,25],lean:1},(c,P,t)=>{fishingLine(c,P,t.tip,[60,24],-5);bobber(c,P,60,25);}),
    make({angle:-38,grip:[25,25]},(c,P,t)=>{fishingLine(c,P,t.tip,[bx,by-2],3);bobber(c,P,bx,by,1);}),
  ];
  const wait=[0,0,1,1].map((bob,index)=>make({angle:-38-(index===2?1:0),grip:[25,25]},(c,P,t)=>{
    fishingLine(c,P,t.tip,[bx,by-2+bob],4-bob);bobber(c,P,bx,by+bob);
  }));
  const pull=[
    make({angle:-30,grip:[25,25],lean:1},(c,P,t)=>{fishingLine(c,P,t.tip,[bx,by],0);bobber(c,P,bx,by,2);}),
    make({angle:-66,grip:[24,24],lean:-1,bent:true},(c,P,t)=>{fishingLine(c,P,t.tip,[bx-6,by-12],0);fish(c,P,bx-9,by-12);}),
    make({angle:-92,grip:[22,25],lean:-1,bent:true},(c,P,t)=>{fishingLine(c,P,t.tip,[40,14],0);fish(c,P,37,14);}),
    make({angle:-74,grip:[23,25]},(c,P,t)=>{fishingLine(c,P,t.tip,[33,18],0);fish(c,P,30,18);}),
  ];
  return {
    cast:{frames:cast,durationsMs:[220,90,150,240]},
    wait:{frames:wait,durationsMs:[800,800,800,800]},
    pull:{frames:pull,durationsMs:[230,170,220,320]},
    frame:FISH_FRAME,bobber:BOBBER_REST,
  };
}
