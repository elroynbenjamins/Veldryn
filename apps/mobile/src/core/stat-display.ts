/**
 * Cosmetic multiplier for displayed character/gear stat magnitudes.
 * Combat math, save data, and server-side projection use raw values; this
 * is applied only at UI leaf nodes that render stat numbers to the player.
 * Percentage stats (crit chance, haste, evasion) are not affected because
 * they already display as percent and have semantic meaning.
 */
export const DISPLAY_STAT_MULTIPLIER=10;

/** Scale a raw stat for display and round to a whole number. */
export function displayStat(value:number):number{
  if(!Number.isFinite(value))return 0;
  return Math.round(value*DISPLAY_STAT_MULTIPLIER);
}

/** Scale a raw stat for display, keeping one decimal if the input was fractional. */
export function displayStatPrecise(value:number):string{
  if(!Number.isFinite(value))return '0';
  const scaled=value*DISPLAY_STAT_MULTIPLIER;
  if(Number.isInteger(value*DISPLAY_STAT_MULTIPLIER))return String(Math.round(scaled));
  return scaled.toFixed(1);
}
