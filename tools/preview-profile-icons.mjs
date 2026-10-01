import {createServer} from 'node:http';
import {readFileSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const root=new URL('../',import.meta.url);
createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost');
 const file=url.pathname==='/'||url.pathname==='/artifacts/profile-icons/index.html'?'artifacts/profile-icons/index.html':/^\/apps\/mobile\/assets\/profile-icons-v1\/[a-z_-]+\.png$/.test(url.pathname)?url.pathname.slice(1):null;
 if(!file){res.writeHead(404);res.end();return;}
 const path=fileURLToPath(new URL(file,root));if(!existsSync(path)){res.writeHead(404);res.end();return;}
 res.writeHead(200,{'Content-Type':file.endsWith('.png')?'image/png':'text/html; charset=utf-8','Cache-Control':'no-cache'});res.end(readFileSync(path));
}).listen(8098,'127.0.0.1',()=>console.log('Profile icon gallery: http://localhost:8098/artifacts/profile-icons/index.html'));
