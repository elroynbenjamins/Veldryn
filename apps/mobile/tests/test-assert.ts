export function ok(value:unknown,message='expected truthy value'){if(!value)throw new Error(message);}
export function equal(actual:unknown,expected:unknown,message='values differ'){if(actual!==expected)throw new Error(`${message}: expected ${String(expected)}, got ${String(actual)}`);}
export function notEqual(actual:unknown,expected:unknown,message='values should differ'){if(actual===expected)throw new Error(`${message}: both were ${String(actual)}`);}
export function deepEqual(actual:unknown,expected:unknown,message='structures differ'){const a=JSON.stringify(actual),b=JSON.stringify(expected);if(a!==b)throw new Error(`${message}: expected ${b}, got ${a}`);}
export const assert=Object.assign(ok,{ok,equal,notEqual,deepEqual});
