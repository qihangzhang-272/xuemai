import { archiveOptions } from "../lib/xuemai/record-content.ts";
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';

const base = process.env.XUEMAI_TEST_URL || 'http://127.0.0.1:3016';
assert(['127.0.0.1', 'localhost'].includes(new URL(base).hostname), '仅允许本机验收');
const checks = [];
const id = Date.now().toString(36);
let cookie = '';
async function request(path, body, method = 'POST', expected = 200, selectedCookie = cookie) {
  const response = await fetch(`${base}/api/xuemai/${path}`, {
    method: body === undefined ? 'GET' : method,
    headers: { Cookie: selectedCookie, ...(body === undefined ? {} : { 'Content-Type': 'application/json', Origin: base }) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });
  const data = await response.json();
  assert.equal(response.status, expected, `${path}: ${JSON.stringify(data)}`);
  checks.push(`${body === undefined ? 'GET' : method} ${path}: ${expected}`);
  return { data, response };
}
await request('state', undefined, 'GET', 401);
const identifier = process.env.XUEMAI_SMOKE_USER || `qa-${id}`;
const password = process.env.XUEMAI_SMOKE_PASSWORD || randomBytes(12).toString('base64url');
let auth;
try { auth = await request('auth', { mode: 'register', identifier, password, name: '体验老师' }); }
catch { auth = await request('auth', { mode: 'local', identifier, password }); }
cookie = auth.response.headers.getSetCookie().map(c => c.split(';')[0]).join('; ');
assert(cookie.startsWith('xuemai_session='));
await mkdir('output', { recursive: true });
await writeFile('output/.smoke-access.txt', `仅限本机体验账号\n地址：${base}\n账号：${identifier}\n密码：${password}\n演示学生与教学内容均为合成验收数据。\n`);
console.log('本机账号就绪；验收凭据已保存到 output/.smoke-access.txt');

const klass = (await request('contacts', { kind: 'class', name: '演示 · 六年级数学小班', subject: '数学', grade: '六年级', classIds: [] })).data;
const student = (await request('contacts', { kind: 'student', name: '演示 · 陈一诺', subject: '数学', grade: '六年级', classIds: [klass.id] })).data;
await request('contacts', { kind: 'student', name: '', subject: '数学' }, 'POST', 400);
await request('contacts', { kind: 'student', name: '无效班级', subject: '数学', classIds: ['unknown'] }, 'POST', 404);
await request('records', { contactId: student.id, kind: 'record', input: '日期校验', date: '2026-02-31' }, 'POST', 400);
const input = '合成验收材料：今天学习分数乘法。陈一诺能独立列出 3/4 × 2/5，计算出 6/20，但忘记约分为 3/10。老师提示后能自行完成约分。课堂口头解释时能说明先乘分子再乘分母。下次课继续观察是否主动约分。';
let record = (await request('records', { contactId: student.id, kind: 'record', input, date: '2026-09-04', attachmentIds: [] })).data;
assert.equal(record.status, 'draft');
const originalVersion = record.revision;
console.log('正在调用真实模型整理课堂记录…');
record = (await request(`records/${record.id}`, { action: 'generate', revision: record.revision }, 'PATCH')).data;
assert.equal(record.status, 'ready');
assert(record.content.length > 30);
assert.equal(record.feedbackStatus, 'none');
assert.equal(record.archivedAt, null);
assert.equal(record.evidence, 'observed');
await request(`records/${record.id}`, { action: 'edit', revision: originalVersion, content: '过期版本' }, 'PATCH', 409);
record = (await request(`records/${record.id}`, { action: 'edit', revision: record.revision, content: `${record.content}\n老师补充：本次仅记录课堂观察，不作长期判断。` }, 'PATCH')).data;
assert.notEqual(record.content, record.aiContent);
console.log('正在生成真实家长反馈…');
record = (await request(`records/${record.id}`, { action: 'feedback', revision: record.revision }, 'PATCH')).data;
assert(record.feedback.length > 30);
assert.equal(record.feedbackStatus, 'pending');
assert.equal(record.archivedAt, null);
record = (await request(`records/${record.id}`, { action: 'edit', revision: record.revision, feedback: `${record.feedback}\n我们下次课会继续观察。` }, 'PATCH')).data;
record = (await request(`records/${record.id}`, { action: 'sent', revision: record.revision }, 'PATCH')).data;
assert.equal(record.sentContent, record.feedback);
assert.equal(record.archivedAt, null);
record = (await request(`records/${record.id}`, { action: 'archive', revision: record.revision, archiveIds: archiveOptions(record).filter(option => option.id !== 'feedback').map(option => option.id) }, 'PATCH')).data;
assert.equal(record.archiveContent, record.content);
await request(`records/${record.id}`, { action: 'edit', revision: record.revision, content: '篡改确认版本' }, 'PATCH', 400);
const unarchived = (await request('records', { contactId: student.id, kind: 'record', input: '未入档材料标记：不得出现在月报', date: '2026-09-03', attachmentIds: [] })).data;
let monthly = (await request('records', { contactId: student.id, kind: 'monthly', month: '2026-09', input: '', date: '2026-09-04', attachmentIds: [] })).data;
console.log('正在生成已入档记录月报…');
monthly = (await request(`records/${monthly.id}`, { action: 'generate', revision: monthly.revision }, 'PATCH')).data;
assert(monthly.sourceIds.includes(record.id));
assert(!monthly.sourceIds.includes(unarchived.id));
assert(!monthly.content.includes('未入档材料标记'));
await request('records', { contactId: klass.id, kind: 'prep', input: '范围外备课', date: '2026-09-04' }, 'POST', 400);
await request('records', { contactId: student.id, kind: 'daily', date: '2026-09-04' }, 'POST', 400);
monthly = (await request(`records/${monthly.id}`, { action: 'finalize', revision: monthly.revision }, 'PATCH')).data;
assert.equal(monthly.reportStatus, 'final');
await request(`records/${monthly.id}`, { action: 'edit', revision: monthly.revision, content: '覆盖定稿' }, 'PATCH', 400);

const form = new FormData();
form.set('file', new File(['合成验收材料：学生写出 3/4 × 2/5 = 6/20，老师圈出最后一步并提示约分，学生订正为 3/10。'], '学生订正记录.txt', { type: 'text/plain' }));
const uploaded = await fetch(`${base}/api/xuemai/attachments`, { method: 'POST', headers: { Cookie: cookie, Origin: base }, body: form });
assert.equal(uploaded.status, 200);
const attachment = await uploaded.json();
let analysis = (await request('records', { contactId: student.id, kind: 'analysis', input: '请只分析这次已经批改并订正的学习痕迹。', date: '2026-09-04', attachmentIds: [attachment.id] })).data;
console.log('正在分析上传材料…');
analysis = (await request(`records/${analysis.id}`, { action: 'generate', revision: analysis.revision }, 'PATCH')).data;
assert.equal(analysis.evidence, 'observed');
const otherAuth = await request('auth', { mode: 'register', identifier: `other-${id}`, password: randomBytes(12).toString('hex'), name: '隔离检查' });
const otherCookie = otherAuth.response.headers.getSetCookie().map(c => c.split(';')[0]).join('; ');
await request(`records/${record.id}`, { action: 'archive', revision: record.revision }, 'PATCH', 404, otherCookie);
await request(`attachments/${attachment.id}`, undefined, 'GET', 404, otherCookie);
const otherState = (await request('state', undefined, 'GET', 200, otherCookie)).data;
assert.equal(otherState.records.length, 0);
const exported = (await request('export')).data;
assert.equal(exported.format, 'xuemai-export-v1');
assert(!JSON.stringify(exported).includes('password_hash'));
const finalState = (await request('state')).data;
assert(finalState.records.find(r => r.id === record.id).archiveContent === record.content);
const legacy = await fetch(`${base}/api/workbench-v2`);
assert.equal(legacy.status, 404);
const csrf = await fetch(`${base}/api/xuemai/contacts`, { method: 'POST', headers: { Cookie: cookie, 'Content-Type': 'application/json', Origin: 'https://untrusted.example' }, body: '{}' });
assert.equal(csrf.status, 403);
await writeFile('output/http-smoke.json', JSON.stringify({ ok: true, time: new Date().toISOString(), checks, additionalChecks: ['独立账号与数据隔离', '过期版本拒绝', '月报仅使用入档快照', '范围外备课日报拒绝新建', '跨站写入拒绝', '原型 API 禁用', '真实模型记录反馈月报材料4条工作流'], identifiers: { studentId: student.id, classId: klass.id, recordId: record.id, monthlyId: monthly.id, analysisId: analysis.id } }, null, 2));
console.log(`PASS：${checks.length} 次接口检查及状态规则；详见 output/http-smoke.json`);
