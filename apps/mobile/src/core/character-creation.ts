/** Shared creation policy; existing saves are not renamed. */
export function characterNameError(value:string):string{
  const name=value.trim();
  if(name.length<2)return 'Use at least 2 characters.';
  if(name.length>20)return 'Use no more than 20 characters.';
  if(!/^\p{L}[\p{L}\p{M} '\-]*$/u.test(name))return 'Use letters, spaces, apostrophes, or hyphens.';
  return '';
}
export function carouselIndex(index:number,direction:number,count:number){
  return count>0?((index+direction)%count+count)%count:0;
}
