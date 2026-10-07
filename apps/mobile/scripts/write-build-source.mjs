import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const target=path.resolve(here,'..','src','build-source.generated.ts');
const clean=value=>typeof value==='string'&&value.trim()?value.trim():null;
const commit=clean(process.env.EAS_BUILD_GIT_COMMIT_HASH)||clean(process.env.GITHUB_SHA);
const buildId=clean(process.env.EAS_BUILD_ID);

const source=[
  '// Generated during EAS build. Do not edit the cloud-build output manually.',
  `export const BUILD_SOURCE_COMMIT:string|null=${JSON.stringify(commit)};`,
  `export const BUILD_SOURCE_BUILD_ID:string|null=${JSON.stringify(buildId)};`,
  '',
].join('\n');

fs.writeFileSync(target,source,'utf8');
console.log(`VELDRYN build source: ${commit??'unknown'}${buildId?` · EAS ${buildId}`:''}`);
