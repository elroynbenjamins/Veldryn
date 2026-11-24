import {PROFILE_COSMETIC_RUNTIME,profileCosmeticRuntimeByBorder,profileCosmeticRuntimeByEffect} from '../src/theme/profile-cosmetic-runtime-v1';
function fail(message:string):never{throw new Error(message)}
function ok(value:unknown,message:string){if(!value)fail(message)}
function equal(actual:unknown,expected:unknown,message:string){if(actual!==expected)fail(message+': expected '+String(expected)+', got '+String(actual))}
equal(PROFILE_COSMETIC_RUNTIME.length,4,'four approved animated profile collections');
equal(new Set(PROFILE_COSMETIC_RUNTIME.map(r=>r.borderId)).size,4,'border ids are unique');
equal(new Set(PROFILE_COSMETIC_RUNTIME.map(r=>r.effectId)).size,4,'effect ids are unique');
for(const row of PROFILE_COSMETIC_RUNTIME){
 ok(row.tracks.length>=5&&row.tracks.length<=12,row.collection+' keeps motion subtle');
 ok(row.glows.length>=6&&row.glows.length<=12,row.collection+' has staggered border lights');
 ok(row.tracks.some(t=>t.points.some(([x,y])=>x>.82&&y<.38)),row.collection+' uses the approved upper-right empty space');
 equal(profileCosmeticRuntimeByBorder.get(row.borderId),row,row.collection+' resolves by border');
 equal(profileCosmeticRuntimeByEffect.get(row.effectId),row,row.collection+' resolves by effect');
}
const kinds=new Map(PROFILE_COSMETIC_RUNTIME.map(r=>[r.motionProfile,new Set(r.tracks.map(t=>t.particle))]));
ok(kinds.get('frostbound')?.has('snowflake'),'Frostbound uses snowflakes');
ok(kinds.get('amberglass')?.has('ember'),'Amberglass uses embers');
ok(kinds.get('briarbound')?.has('leaf')&&kinds.get('briarbound')?.has('firefly'),'Briarbound uses leaves and fireflies');
ok(kinds.get('gloamward')?.has('arcane'),'Gloamward uses arcane sparks');
console.log('PASS: four native cosmetic runtimes retain unique particles, placement and bounded motion');
