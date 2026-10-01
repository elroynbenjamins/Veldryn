/** Pick a composition for the measured surface, without stretching the image. */
export type CardBackgroundVariant='portrait'|'square'|'wide';
export function cardBackgroundVariant(width:number,height:number):CardBackgroundVariant{
 if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)return 'wide';
 const ratio=width/height;
 return ratio<.8?'portrait':ratio<1.45?'square':'wide';
}
