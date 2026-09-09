/** Syntax only; explicitly not a native dependency typecheck or application build. */
const fs=require('node:fs');const path=require('node:path');const ts=require('typescript');
const root=path.resolve(__dirname,'..');const files=fs.readdirSync(path.join(root,'src/native')).filter(f=>/\.tsx?$/.test(f));let failures=0;
for(const name of files){const f=path.join(root,'src/native',name);const out=ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2020},fileName:f,reportDiagnostics:true});const errors=out.diagnostics.filter(d=>d.category===ts.DiagnosticCategory.Error);failures+=errors.length;console.log(name,errors.length?'FAIL':'syntax OK');for(const d of errors)console.error(ts.flattenDiagnosticMessageText(d.messageText,' '));}
console.log('Scope: syntax transpilation only. Native full typecheck/device build still required.');process.exitCode=failures?1:0;
