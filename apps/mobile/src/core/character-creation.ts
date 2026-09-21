export {characterNameError,normalizeCharacterName} from './identity-names';
/** Shared creation policy; existing saves are not renamed. */
export function carouselIndex(index:number,direction:number,count:number){
  return count>0?((index+direction)%count+count)%count:0;
}
