// A tiny integer pixel canvas. Everything is drawn on a whole-pixel grid with no anti-aliasing,
// so nearest-neighbour export keeps one consistent pixel size across every generated sprite.
import {encodePng} from './png.mjs';

export function rgba(hex,alpha=255){
  const value=hex.replace('#','');
  return [parseInt(value.slice(0,2),16),parseInt(value.slice(2,4),16),parseInt(value.slice(4,6),16),alpha];
}

/** Deterministic hash noise in [0,1). Scenes must be reproducible across runs. */
export function noise(x,y,seed=0){
  let h=(x*374761393+y*668265263+seed*2147483647)|0;
  h=(h^(h>>>13))*1274126177|0;
  h=h^(h>>>16);
  return ((h>>>0)%100000)/100000;
}

const BAYER4=[[0,8,2,10],[12,4,14,6],[3,11,1,9],[15,7,13,5]];
/** Ordered-dither threshold in (0,1): true when `amount` wins at this pixel. */
export function dither(x,y,amount){return amount>(BAYER4[((y%4)+4)%4][((x%4)+4)%4]+.5)/16;}

export class PixelCanvas{
  constructor(width,height){this.width=width;this.height=height;this.data=new Uint8Array(width*height*4);}
  inside(x,y){return x>=0&&y>=0&&x<this.width&&y<this.height;}
  get(x,y){if(!this.inside(x,y))return [0,0,0,0];const i=(y*this.width+x)*4;return [this.data[i],this.data[i+1],this.data[i+2],this.data[i+3]];}
  alpha(x,y){return this.inside(x,y)?this.data[(y*this.width+x)*4+3]:0;}
  set(x,y,color){
    x=Math.round(x);y=Math.round(y);
    if(!this.inside(x,y)||!color)return;
    const c=typeof color==='string'?rgba(color):color,i=(y*this.width+x)*4;
    if(c[3]===0)return;
    this.data[i]=c[0];this.data[i+1]=c[1];this.data[i+2]=c[2];this.data[i+3]=c[3]??255;
  }
  clear(x,y){if(this.inside(x,y))this.data.fill(0,(y*this.width+x)*4,(y*this.width+x)*4+4);}
  rect(x,y,w,h,color){for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)this.set(xx,yy,color);}
  line(x0,y0,x1,y1,color){
    x0=Math.round(x0);y0=Math.round(y0);x1=Math.round(x1);y1=Math.round(y1);
    const dx=Math.abs(x1-x0),dy=-Math.abs(y1-y0),sx=x0<x1?1:-1,sy=y0<y1?1:-1;let error=dx+dy;
    for(;;){
      this.set(x0,y0,color);
      if(x0===x1&&y0===y1)break;
      const twice=2*error;
      if(twice>=dy){error+=dy;x0+=sx;}
      if(twice<=dx){error+=dx;y0+=sy;}
    }
  }
  /** A line `thickness` pixels wide, thickened perpendicular to its dominant axis. */
  thickLine(x0,y0,x1,y1,thickness,color){
    const steep=Math.abs(y1-y0)>Math.abs(x1-x0);
    for(let offset=0;offset<thickness;offset++){
      const shift=offset-Math.floor((thickness-1)/2);
      if(steep)this.line(x0+shift,y0,x1+shift,y1,color);else this.line(x0,y0+shift,x1,y1+shift,color);
    }
  }
  ellipse(cx,cy,rx,ry,color){
    for(let y=Math.floor(cy-ry);y<=Math.ceil(cy+ry);y++)for(let x=Math.floor(cx-rx);x<=Math.ceil(cx+rx);x++){
      const nx=(x-cx)/Math.max(.5,rx),ny=(y-cy)/Math.max(.5,ry);
      if(nx*nx+ny*ny<=1)this.set(x,y,color);
    }
  }
  /** Rows of single-character palette keys; '.' and ' ' are transparent. */
  stamp(x,y,rows,palette,flip=false){
    rows.forEach((row,ry)=>{
      for(let rx=0;rx<row.length;rx++){
        const key=row[flip?row.length-1-rx:rx];
        if(key==='.'||key===' ')continue;
        const color=palette[key];
        if(!color)throw new Error(`Unknown palette key "${key}"`);
        this.set(x+rx,y+ry,color);
      }
    });
  }
  blit(source,dx,dy){
    for(let y=0;y<source.height;y++)for(let x=0;x<source.width;x++){
      const i=(y*source.width+x)*4;
      if(source.data[i+3])this.set(dx+x,dy+y,[source.data[i],source.data[i+1],source.data[i+2],source.data[i+3]]);
    }
  }
  /** One-pixel ink outline around every opaque shape (4-neighbourhood), the classic sprite silhouette. */
  outline(color){
    const ink=typeof color==='string'?rgba(color):color,targets=[];
    for(let y=0;y<this.height;y++)for(let x=0;x<this.width;x++){
      if(this.alpha(x,y))continue;
      if(this.alpha(x-1,y)||this.alpha(x+1,y)||this.alpha(x,y-1)||this.alpha(x,y+1))targets.push([x,y]);
    }
    for(const [x,y] of targets)this.set(x,y,ink);
    return this;
  }
  scaled(factor){
    const out=new PixelCanvas(this.width*factor,this.height*factor);
    for(let y=0;y<out.height;y++){
      const sy=Math.floor(y/factor);
      for(let x=0;x<out.width;x++){
        const si=(sy*this.width+Math.floor(x/factor))*4,di=(y*out.width+x)*4;
        out.data[di]=this.data[si];out.data[di+1]=this.data[si+1];out.data[di+2]=this.data[si+2];out.data[di+3]=this.data[si+3];
      }
    }
    return out;
  }
  png(){return encodePng(this.width,this.height,this.data);}
}

/** Lay frames out left-to-right (or top-to-bottom) into one sheet. */
export function sheet(frames,direction='row'){
  const width=frames[0].width,height=frames[0].height;
  const out=direction==='row'?new PixelCanvas(width*frames.length,height):new PixelCanvas(width,height*frames.length);
  frames.forEach((frame,index)=>{
    if(frame.width!==width||frame.height!==height)throw new Error('Sheet frames must share one size');
    out.blit(frame,direction==='row'?index*width:0,direction==='row'?0:index*height);
  });
  return out;
}

export function mix(a,b,t){
  const ca=typeof a==='string'?rgba(a):a,cb=typeof b==='string'?rgba(b):b;
  return [0,1,2].map(i=>Math.round(ca[i]+(cb[i]-ca[i])*t)).concat(255);
}
