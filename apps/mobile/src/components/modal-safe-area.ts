// Android edge-to-edge modal windows may report zero bottom insets on
// some OEM/navigation configurations. Use the app inset as a second signal,
// then a conservative three-button navigation allowance when both are zero.
// Subtract only space demonstrably outside the modal, leaving room for a
// possible status-bar exclusion. All values are density-independent pixels.
export function resolveModalBottomInset({
  android,modalBottom,modalTop,rootBottom,rootTop,screenHeight,frameHeight,
}:{
  android:boolean;modalBottom:number;modalTop:number;rootBottom:number;rootTop:number;
  screenHeight:number;frameHeight:number;
}):number{
  if(!android)return Math.max(0,modalBottom);
  const knownBottom=Math.max(0,modalBottom,rootBottom);
  const expectedBottom=knownBottom||48;
  const excludedBottom=frameHeight>0&&screenHeight>0
    ?Math.max(0,screenHeight-frameHeight-Math.max(0,modalTop,rootTop))
    :0;
  // A positive modal inset describes space INSIDE its own native window;
  // never subtract external space from that measurement.
  return Math.max(0,modalBottom,expectedBottom-excludedBottom);
}
