function render(value:unknown){try{return JSON.stringify(value)}catch{return String(value)}}
/** Explicitly typed so `assert.ok(x)` narrows `x` (TypeScript requires a declared type for assertion methods). */
interface TestAssert{
 ok(value:unknown,message?:string):asserts value;
 equal(actual:unknown,expected:unknown,message?:string):void;
 notEqual(actual:unknown,expected:unknown,message?:string):void;
 deepEqual(actual:unknown,expected:unknown,message?:string):void;
}
export const assert:TestAssert={
 ok(value:unknown,message='assertion failed'){if(!value)throw new Error(message);},
 equal(actual:unknown,expected:unknown,message='values differ'){if(actual!==expected)throw new Error(message+': expected '+render(expected)+', got '+render(actual));},
 notEqual(actual:unknown,expected:unknown,message='values unexpectedly equal'){if(actual===expected)throw new Error(message+': both were '+render(actual));},
 deepEqual(actual:unknown,expected:unknown,message='structures differ'){if(render(actual)!==render(expected))throw new Error(message+': expected '+render(expected)+', got '+render(actual));},
};
