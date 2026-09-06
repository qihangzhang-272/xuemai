import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
const base = process.env.XUEMAI_TEST_URL || 'http://127.0.0.1:3016';
assert(['127.0.0.1', 'localhost'].includes(new URL(base).hostname));
const account = process.env.XUEMAI_SMOKE_USER;
const password = process.env.XUEMAI_SMOKE_PASSWORD;
assert(account && password, '请通过临时环境变量提供学脉验收账号');
let cookie = '';
async function json(path, body, method='POST') {
  const response = await fetch(`${base}/api/xuemai/${path}`, { method: body ? method : 'GET', headers: { Cookie: cookie, 'Content-Type': 'application/json', Origin: base }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const data = await response.json();
  assert.equal(response.status, 200, `${path}: ${JSON.stringify(data)}`);
  return {data,response};
}
const auth = await json('auth',{mode:'local',identifier:account,password});
cookie = auth.response.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ');
const state=(await json('state')).data;
const student=state.contacts.find(c=>c.kind==='student'&&c.name==='演示 · 陈一诺');
const klass=state.contacts.find(c=>c.kind==='class');
assert(student&&klass);
const report=[];
for(const fixture of [
  {file:'student-work.pdf',kind:'analysis',contactId:student.id,evidence:'observed'},
  {file:'student-work.png',kind:'analysis',contactId:student.id,evidence:'observed'},
  {file:'blank-worksheet.png',kind:'analysis',contactId:student.id,evidence:'insufficient'},
  {file:'lesson-outline.docx',kind:'analysis',contactId:student.id,evidence:'insufficient'},
  {file:'lesson-slides.pptx',kind:'analysis',contactId:student.id,evidence:'insufficient'},
]) {
  const started=Date.now();
  console.log(`验证 ${fixture.file} 上传及真实解析 / AI…`);
  const form=new FormData();
  form.set('file',new File([await readFile(`tests/fixtures/xuemai/${fixture.file}`)],fixture.file));
  const uploaded=await fetch(`${base}/api/xuemai/attachments`,{method:'POST',headers:{Cookie:cookie,Origin:base},body:form});
  assert.equal(uploaded.status,200);
  const attachment=await uploaded.json();
  let record=(await json('records',{contactId:fixture.contactId,kind:fixture.kind,input:'只根据上传文件中真实存在的学生作答、批改或订正进行判断。若是空白题目或纯教学资料，不推断学生能力。',date:'2026-09-04',attachmentIds:[attachment.id]})).data;
  record=(await json(`records/${record.id}`,{action:'generate',revision:record.revision},'PATCH')).data;
  assert.equal(record.status,'ready'); assert.equal(record.evidence,fixture.evidence);
  if(fixture.evidence==='insufficient'){
    const blocked=await fetch(`${base}/api/xuemai/records/${record.id}`,{method:'PATCH',headers:{Cookie:cookie,'Content-Type':'application/json'},body:JSON.stringify({action:'archive',revision:record.revision})});
    assert.equal(blocked.status,400);
  }
  const item={file:fixture.file,recordId:record.id,status:record.status,evidence:record.evidence,elapsedMs:Date.now()-started,title:record.title};
  report.push(item); await writeFile('output/material-smoke.json',JSON.stringify(report,null,2));
  console.log(`PASS ${fixture.file} (${Math.round(item.elapsedMs/1000)}s)`);
}
