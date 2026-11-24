// Review model for private SQL, not a live server path.
export function caps(n,focus=1){
 if(!Number.isInteger(n)||n<1||!Number.isFinite(focus)||focus<=0)throw Error('invalid roster');
 return n<=1?[.34,1]:n===2?[.20,.60]:n===3?[.15,.45]:n===4?[.11,.34]:[.11*Math.min(1,focus),.28*Math.min(1,focus)];
}
export function capacity(rows,hp){return rows.reduce((s,r)=>{const [a,p]=caps(rows.length,r.focus);return s+Math.min(3*Math.min(r.hit,Math.ceil(hp*a)),Math.ceil(hp*p));},0)}
export function target(rows){
 if(!rows.length)return 1000;
 if(rows.some(r=>!Number.isFinite(r.hit)||r.hit<=0||!Number.isFinite(r.focus)||r.focus<=0))throw Error('invalid power');
 const total=rows.reduce((s,r)=>s+r.hit,0),step=total*2.25>=100000?10000:total*2.25>=10000?1000:100;
 let hp=Math.max(100,Math.min(1e9,Math.round(total*2.25/step)*step));
 for(let i=0;i<=128;i++){
  const cap=capacity(rows,hp);if(hp<=cap||hp<=100)return hp;
  hp=Math.max(100,Math.min(hp-step,Math.floor(cap/step)*step));
 }
 return 100;
}
export const rewards=Object.freeze([{percent:25,gold:500,tokens:5},{percent:50,gold:500,tokens:10},{percent:100,gold:1000,tokens:15}]);
