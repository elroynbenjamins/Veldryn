/** Never render an unstructured rejected value as "[object Object]" in a dungeon notice.
 *
 * Kept free of dependencies so the co-op surfaces, and the sandboxed sync tests,
 * can share one definition without pulling in the co-op network client.
 */
export function coopErrorMessage(error:unknown,fallback='Dungeons are temporarily unavailable. Try again.'){
 if(error instanceof Error&&error.message.trim())return error.message;
 if(typeof error==='string'&&error.trim())return error;
 if(error&&typeof error==='object'){
  const row=error as Record<string,unknown>;
  for(const key of ['message','error','code']){const value=row[key];if(typeof value==='string'&&value.trim())return value;}
 }
 return fallback;
}
