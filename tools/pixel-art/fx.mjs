// Combat effect sheets. Each effect is exported as two white layers: a `tint` mask the app
// colours with the current theme accent, and a `core` of hot white pixels drawn on top.
// That keeps one set of sprites valid for every theme and every damage type.
import {PixelCanvas} from './canvas.mjs';

const WHITE=(alpha=255)=>[255,255,255,alpha];
const SIZE=32,C=16;
const pair=()=>({tint:new PixelCanvas(SIZE,SIZE),core:new PixelCanvas(SIZE,SIZE)});
const polar=(cx,cy,radius,degrees)=>[cx+Math.cos(degrees*Math.PI/180)*radius,cy+Math.sin(degrees*Math.PI/180)*radius];

/** A crescent that sweeps across the target and thins out. */
function slash(){
  const head=[.3,.7,1,1,1],tail=[0,.05,.3,.62,.86],alpha=[255,255,255,210,140];
  return head.map((h,frame)=>{
    const {tint,core}=pair(),t=tail[frame];
    for(let step=0;step<=120;step++){
      const position=step/120;
      if(position<t||position>h)continue;
      const local=(position-t)/Math.max(.001,h-t),angle=-152+position*172,thickness=Math.sin(Math.PI*local)*3.4;
      for(let w=0;w<=thickness;w++){
        const [x,y]=polar(C+1,C+3,11.5-w,angle);
        tint.set(x,y,WHITE(alpha[frame]));
      }
      if(local>.45&&frame<4){const [x,y]=polar(C+1,C+3,11.5,angle);core.set(x,y,WHITE());}
    }
    return {tint,core};
  });
}

/** A heavy blow: flash, spikes and a breaking shock ring. */
function smash(){
  return [0,1,2,3,4].map(frame=>{
    const {tint,core}=pair();
    if(frame<=1){tint.ellipse(C,C,2+frame*2,2+frame*2,WHITE());core.ellipse(C,C,1+frame,1+frame,WHITE());}
    const reach=[4,8,12,13,14][frame],inner=[0,2,5,9,12][frame];
    for(let spike=0;spike<8;spike++){
      const angle=spike*45+10,long=spike%2===0;
      const [x0,y0]=polar(C,C,inner,angle),[x1,y1]=polar(C,C,long?reach:reach*.68,angle);
      if(frame<4)tint.thickLine(x0,y0,x1,y1,long&&frame<3?2:1,WHITE(frame===3?190:255));
      if(frame>0&&frame<3&&long){const [cx,cy]=polar(C,C,inner+1,angle);core.line(cx,cy,x1,y1,WHITE());}
    }
    if(frame>=2){
      const radius=[0,0,7,10,12][frame];
      for(let a=0;a<360;a+=frame===2?6:frame===3?12:24){const [x,y]=polar(C,C,radius,a);tint.set(x,y,WHITE(frame===4?150:230));}
    }
    if(frame>=3)for(let chip=0;chip<6;chip++){const [x,y]=polar(C,C,reach-1,chip*60+25);tint.rect(Math.round(x),Math.round(y),frame===3?2:1,frame===3?2:1,WHITE(frame===4?170:255));}
    return {tint,core};
  });
}

/** Light hit sparks flying outward. */
function burst(){
  const angles=[-160,-115,-70,-25,20,65,110,155];
  return [0,1,2,3,4].map(frame=>{
    const {tint,core}=pair();
    if(frame===0){tint.ellipse(C,C,3,3,WHITE());core.ellipse(C,C,1.5,1.5,WHITE());}
    if(frame===1){tint.ellipse(C,C,2,2,WHITE(220));core.set(C,C,WHITE());}
    angles.forEach((angle,index)=>{
      const near=[1,4,7,10,12][frame]+(index%2),length=[2,4,4,3,1][frame];
      const [x0,y0]=polar(C,C,near,angle),[x1,y1]=polar(C,C,near+length,angle);
      tint.line(x0,y0,x1,y1,WHITE(frame===4?150:255));
      if(frame>0&&frame<3)core.set(x1,y1,WHITE());
    });
    return {tint,core};
  });
}

/** Critical hit: a long four-point star with diagonal glints. */
function crit(){
  return [0,1,2,3,4].map(frame=>{
    const {tint,core}=pair(),long=[5,11,14,14,13][frame],short=[2,5,8,9,9][frame],inner=[0,0,2,7,11][frame];
    for(let arm=0;arm<4;arm++){
      const [x0,y0]=polar(C,C,inner,arm*90),[x1,y1]=polar(C,C,long,arm*90);
      tint.thickLine(x0,y0,x1,y1,frame<3?3:1,WHITE(frame===4?150:255));
      if(frame<3)core.line(x0,y0,polar(C,C,long-2,arm*90)[0],polar(C,C,long-2,arm*90)[1],WHITE());
      const [dx0,dy0]=polar(C,C,inner,arm*90+45),[dx1,dy1]=polar(C,C,short,arm*90+45);
      if(frame<4)tint.line(dx0,dy0,dx1,dy1,WHITE(frame===3?170:255));
    }
    if(frame<2){tint.ellipse(C,C,3+frame,3+frame,WHITE());core.ellipse(C,C,2,2,WHITE());}
    if(frame>=2)for(let glint=0;glint<4;glint++){const [x,y]=polar(C,C,long-1,glint*90+22);tint.rect(Math.round(x),Math.round(y),2,2,WHITE(frame===4?150:240));}
    return {tint,core};
  });
}

function plus(canvas,x,y,size,alpha=255){
  canvas.rect(x-size,y,size*2+1,1,WHITE(alpha));canvas.rect(x,y-size,1,size*2+1,WHITE(alpha));
}
/** Restorative sparkles that rise and thin out. */
function heal(){
  const motes=[[9,24,2],[22,26,1],[15,20,2],[25,18,1],[7,16,1]];
  return [0,1,2,3,4].map(frame=>{
    const {tint,core}=pair();
    motes.forEach(([x,y,size],index)=>{
      const delay=index%3,age=frame-delay;
      if(age<0||age>3)return;
      const lift=age*4,currentSize=age===3?Math.max(0,size-1):size;
      plus(tint,x,y-lift,currentSize,age===3?150:255);
      if(age<3)core.set(x,y-lift,WHITE());
    });
    if(frame<3)for(let a=0;a<360;a+=frame===0?20:30){const [x,y]=polar(C,C+6,6+frame*3,a);if(y>C+4)tint.set(x,y,WHITE(200-frame*50));}
    return {tint,core};
  });
}

/** A ward: a kite shield outline that pulses outward. */
function ward(){
  return [0,1,2,3,4].map(frame=>{
    const {tint,core}=pair(),grow=[0,1,2,3,4][frame],alpha=[255,255,230,180,120][frame];
    const top=C-8-grow,half=7+grow,bottom=C+10+grow;
    const outline=[[C-half,top],[C+half,top],[C+half,C+1],[C,bottom],[C-half,C+1]];
    for(let i=0;i<outline.length;i++){
      const [x0,y0]=outline[i],[x1,y1]=outline[(i+1)%outline.length];
      tint.thickLine(x0,y0,x1,y1,frame<2?2:1,WHITE(alpha));
    }
    if(frame<3){core.line(C-half+2,top+2,C+half-2,top+2,WHITE());core.line(C,top+2,C,bottom-3,WHITE(frame===2?160:255));}
    if(frame>=1)for(const [x,y] of [[C-half-2,top-2],[C+half+2,top-2],[C,bottom+2]])tint.rect(x,y,frame<3?2:1,frame<3?2:1,WHITE(alpha));
    return {tint,core};
  });
}

/** A spell bolt: a small orb with orbiting sparks, looped while it travels. */
function bolt(){
  return [0,1,2,3].map(frame=>{
    const tint=new PixelCanvas(16,16),core=new PixelCanvas(16,16);
    tint.ellipse(8,8,3.2,3.2,WHITE());core.ellipse(8,8,1.4,1.4,WHITE());
    for(let spark=0;spark<3;spark++){const [x,y]=polar(8,8,6,frame*30+spark*120);tint.set(x,y,WHITE());}
    for(let trail=1;trail<=3;trail++)tint.set(8-3-trail*1.5,8+((frame+trail)%2),WHITE(230-trail*55));
    return {tint,core};
  });
}

/** A physical arrow in its own colours (not tinted). */
export function arrow(){
  const c=new PixelCanvas(18,7);
  c.stamp(0,0,[
    '.ff...........i...',
    'ffi..........imi..',
    'iwwwwwwwwwwwwmmMi.',
    'ffi..........imi..',
    '.ff...........i...',
  ],{f:'#d8e2ea',i:'#1a1520',w:'#b98b52',m:'#9aa7b4',M:'#e6eef5'});
  return c;
}

export const FX_SHEETS={slash,smash,burst,crit,heal,ward,bolt};
