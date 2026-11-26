/** Smooth, theme-specific idle atlases, using one native showcase clock. */
export const ULTRA_LUXE_POSE_ATLASES={
 celestial:{frameWidth:112,frameHeight:159,columns:8,rows:6,frames:48,seconds:4,cycles:6},
 draconic:{frameWidth:128,frameHeight:120,columns:6,rows:6,frames:36,seconds:3,cycles:8},
} as const;
export type PoseTheme=keyof typeof ULTRA_LUXE_POSE_ATLASES;
/** A nearly instant transition between adjacent poses avoids scrolling across unrelated cells. */
export function poseAtlasTimeline(theme:PoseTheme='celestial'){
 const a=ULTRA_LUXE_POSE_ATLASES[theme],inputRange=[0],frames=[0];
 for(let i=1;i<=a.frames;i++){
  inputRange.push(i/a.frames-.0005/a.seconds,i/a.frames);
  frames.push(i-1,i%a.frames);
 }
 return {inputRange,frames};
}
export function poseAtlasCell(frame:number,theme:PoseTheme='celestial'){
 const columns=ULTRA_LUXE_POSE_ATLASES[theme].columns;
 return {column:frame%columns,row:Math.floor(frame/columns)};
}
