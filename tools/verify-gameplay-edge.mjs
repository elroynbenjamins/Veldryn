/** Read-only byte parity via the same isolated generator used for regeneration. */
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const build=fileURLToPath(new URL('./build-online.mjs',import.meta.url));
const result=spawnSync(process.execPath,[build,'--verify'],{stdio:'inherit'});
if(result.error)throw result.error;
process.exitCode=result.status??1;
