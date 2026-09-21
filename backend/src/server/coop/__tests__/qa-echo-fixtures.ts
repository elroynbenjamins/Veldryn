import {strict as assert} from 'node:assert';
import {MemoryQModeRunRepository,QModeService} from '../qmode';
import {createQaEchoPool,createQaFrozenLoadout,QA_ECHO_CONTENT_VERSION,QA_ECHO_DEFINITIONS} from '../qa-echo-fixtures';

const nowMs=1_790_000_000_000;
for(const definition of QA_ECHO_DEFINITIONS){
  const accountId=`qa-controller-${definition.classId.toLowerCase()}`;
  const service=new QModeService(new MemoryQModeRunRepository(),'qa-dungeon-secret');
  const run=service.create({
    requestId:`qa-request-${definition.classId.toLowerCase()}`,
    runId:`qa-run-${definition.classId.toLowerCase()}`,
    controllerAccountId:accountId,
    controllerSnapshot:createQaFrozenLoadout({accountId,classId:definition.classId,level:100}),
    expeditionId:'EXP_001',tier:5,contentVersion:QA_ECHO_CONTENT_VERSION,balanceVersion:'qa-balance-v1',
    nowMs,profiles:createQaEchoPool({nowMs,level:100}),
  });
  assert.equal(run.players.length,4);
  assert.equal(run.echoSourceAccountIds.length,3);
  assert.equal(new Set(run.echoSourceAccountIds).size,3);
  const roles=run.players.map(player=>player.role);
  assert.equal(roles.filter(role=>role==='tank').length,1);
  assert.equal(roles.filter(role=>role==='damage').length,2);
  assert.equal(roles.filter(role=>role==='support').length,1);
  const damageClasses=run.players.filter(player=>player.role==='damage').map(player=>player.classId);
  assert.equal(new Set(damageClasses).size,2,`duplicate damage class for ${definition.classId}`);
}
console.log('PASS QA Echo pool supports every controller class and valid 1T/2D/1S composition');
