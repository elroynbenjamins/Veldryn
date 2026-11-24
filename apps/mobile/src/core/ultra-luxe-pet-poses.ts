/** 3x2 authored pose atlas. One clock, no JS frame updates. */
export const ULTRA_LUXE_POSE_ATLASES={
 celestial:{frameWidth:112,frameHeight:159,columns:3,rows:2},
 draconic:{frameWidth:128,frameHeight:120,columns:3,rows:2},
} as const;
export type PoseTheme=keyof typeof ULTRA_LUXE_POSE_ATLASES;
/** Neutral, breathing intermediate, breathing raised, attentive, tail/wing adjustment, signature.
 * Changes are held until the next authored pose. Frame 0 on both ends for a clean loop. */
const STEPS=[
 [0,0],[.65,1],[1.3,2],[2,1],[2.7,0],[3.5,1],[4.2,2],[5,1],[5.8,3],[6.6,1],[7.3,0],
 [8,1],[8.7,2],[9.4,1],[10.1,0],[10.8,4],[11.5,1],[12.2,2],[13,3],[14,2],[15,5],[17.8,2],[19,1],
 [19.7,0],[20.5,1],[21.2,2],[22,1],[22.8,0],[24,0],
] as const;
/** Tiny transition (0.5 ms) avoids duplicate key times and prevents scrolling through cells. */
export function poseAtlasTimeline(){
 const inputRange:number[]=[0],frames:number[]=[0];
 for(let i=1;i<STEPS.length;i++){
  const [seconds,frame]=STEPS[i];
  inputRange.push((seconds-.0005)/24,seconds/24);
  frames.push(STEPS[i-1][1],frame);
 }
 return {inputRange,frames};
}
export function poseAtlasCell(frame:number){return {column:frame%3,row:Math.floor(frame/3)};}
