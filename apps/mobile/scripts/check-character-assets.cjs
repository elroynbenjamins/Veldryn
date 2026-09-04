const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const classes=['ironwarden','bastion','dreadguard','dawnkeeper','wayfinder','ravager','hexweaver','knife_dancer','stonecaller'];
const registry=fs.readFileSync(path.join(root,'src/theme/novice-assets.ts'),'utf8');
let count=0;
for(const classId of classes)for(const body of ['male','female'])for(const view of ['front','back']){
  const relative=`../../assets/first-crafted/${classId}/${body}/${view}.png`;
  if(!registry.includes(`require('${relative}')`))throw new Error(`Missing static Metro registration: ${relative}`);
  const bytes=fs.readFileSync(path.resolve(root,'src/theme',relative));
  if(bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')throw new Error(`Invalid PNG: ${relative}`);
  if(bytes.readUInt32BE(16)<1||bytes.readUInt32BE(20)<1)throw new Error(`Invalid dimensions: ${relative}`);
  count++;
}
console.log(`PASS: ${count} first-crafted PNGs and static Metro registrations`);
