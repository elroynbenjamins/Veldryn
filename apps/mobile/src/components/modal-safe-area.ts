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
  const positive=(value:number)=>Number.isFinite(value)?Math.max(0,value):0;
  modalBottom=positive(modalBottom); rootBottom=positive(rootBottom);
  modalTop=positive(modalTop); rootTop=positive(rootTop);
  screenHeight=positive(screenHeight); frameHeight=positive(frameHeight);
  if(!android)return modalBottom;
  const knownBottom=Math.max(0,modalBottom,rootBottom);
  const expectedBottom=knownBottom||48;
  const excludedBottom=frameHeight>0&&screenHeight>0
    ?Math.max(0,screenHeight-frameHeight-Math.max(0,modalTop,rootTop))
    :0;
  // A positive modal inset describes space INSIDE its own native window;
  // never subtract external space from that measurement.
  return Math.max(0,modalBottom,expectedBottom-excludedBottom);
}

// Keyboard coordinates describe the screen, whereas the app window height
// may refer to a different native window. Prefer the actual modal frame,
// and reserve only the part still covered by the keyboard (adjustResize
// already removes the rest). Invalid geometry falls back to the app window.
export function resolveModalKeyboardOverlap({
  android,keyboardTop,frameY,frameHeight,windowHeight,screenHeight,
}:{
  android:boolean;keyboardTop:number|null;frameY:number;frameHeight:number;
  windowHeight:number;screenHeight:number;
}):number{
  if(!android||keyboardTop===null||!Number.isFinite(keyboardTop)||keyboardTop<0)return 0;
  const valid=(value:number)=>Number.isFinite(value)&&value>0;
  const measured=valid(frameHeight)?frameHeight:valid(windowHeight)?windowHeight:0;
  const origin=valid(frameHeight)&&Number.isFinite(frameY)?Math.max(0,frameY):0;
  const frameBottom=valid(screenHeight)?Math.min(screenHeight,origin+measured):origin+measured;
  return Math.min(measured,Math.max(0,frameBottom-keyboardTop));
}
