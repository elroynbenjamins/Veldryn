import {migrateSave} from './save-migrations';
import type {GameState} from './types';

const BACKUP_FORMAT='veldryn-save-backup';
const MAX_BACKUP_CHARACTERS=1_000_000;

interface SaveBackupEnvelope{
  format:typeof BACKUP_FORMAT;
  formatVersion:1;
  exportedAt:string;
  save:GameState;
}

export function createSaveBackup(state:GameState,exportedAt=new Date()):string{
  const backup:SaveBackupEnvelope={format:BACKUP_FORMAT,formatVersion:1,exportedAt:exportedAt.toISOString(),save:state};
  return JSON.stringify(backup);
}

export function parseSaveBackup(raw:string):GameState{
  const text=raw.trim();
  if(!text)throw new Error('Paste a VELDRYN save backup first.');
  if(text.length>MAX_BACKUP_CHARACTERS)throw new Error('This backup is too large to import safely.');
  let parsed:unknown;
  try{parsed=JSON.parse(text)}catch{throw new Error('This is not valid JSON. Paste the complete backup text.');}
  if(!parsed||typeof parsed!=='object')throw new Error('This backup does not contain a save.');
  const envelope=parsed as Partial<SaveBackupEnvelope>;
  if(envelope.format===BACKUP_FORMAT&&envelope.formatVersion!==1)throw new Error('This backup format version is not supported by this build.');
  const candidate=envelope.format===BACKUP_FORMAT?envelope.save:parsed;
  if(!candidate||typeof candidate!=='object')throw new Error('This backup does not contain a save.');
  try{return migrateSave(candidate)}catch(error){throw new Error(error instanceof Error?`This save cannot be imported: ${error.message}`:'This save cannot be imported.');}
}
