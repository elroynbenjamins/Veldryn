import {RequestSingleflight} from '../src/core/request-singleflight';
function ok(value:boolean,message:string){if(!value)throw new Error(message);}
async function main(){
 const requests=new RequestSingleflight<number>();
 let release:(n:number)=>void=()=>{},calls=0;
 const read=()=>{calls++;return new Promise<number>(resolve=>{release=resolve;});};
 const first=requests.run('viewerA:target',read);
 const second=requests.run('viewerA:target',read);
 const other=requests.run('viewerB:target',async()=>{calls++;return 2;});
 await Promise.resolve();
 ok(calls===2,'In-flight requests are deduplicated only within the same viewer');
 release(1);
 ok(await first===1&&await second===1&&await other===2,'All callers see their own authorized read');
 await Promise.resolve();await Promise.resolve();
 ok(await requests.run('viewerA:target',async()=>{calls++;return 3;})===3,'Completed profile requests are not cached');
 let failures=0;
 try{await requests.run('viewerA:failed',async()=>{failures++;throw new Error('offline');});}catch(e){ok((e as Error).message==='offline','Read error returned');}
 try{await requests.run('viewerA:failed',async()=>{failures++;throw new Error('offline2');});}catch(e){ok((e as Error).message==='offline2','New authorization request retried');}
 ok(failures===2,'Failures do not poison in-flight map');
 console.log('PASS viewer-scoped request coalescing without cached private profile data');
}
void main().catch(e=>{console.error(e);throw e;});
