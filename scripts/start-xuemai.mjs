import { cpSync, existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(root);
const major = Number(process.versions.node.split('.')[0]);
if (major < 24) throw new Error('请使用 Node.js 24 或更新版本运行学脉。');
if (!existsSync('.next/standalone/server.js')) throw new Error('请先执行 npm run build，再启动学脉。');
if (existsSync('.env.local')) process.loadEnvFile('.env.local');
const standalone = path.join(root, '.next/standalone');
cpSync(path.join(root, 'public'), path.join(standalone, 'public'), { recursive: true });
cpSync(path.join(root, '.next/static'), path.join(standalone, '.next/static'), { recursive: true });
// ponytail: 单个本机进程；不扫描或终止任何已占用端口的服务。
const child = spawn(process.execPath, [path.join(standalone, 'server.js')], { cwd: root, stdio: 'inherit', env: {
  ...process.env, HOSTNAME: '127.0.0.1', PORT: '3016', XUEMAI_DATA_DIR: path.resolve(root, process.env.XUEMAI_DATA_DIR || '.xuemai-data')
} });
child.on('exit', code => { process.exitCode = code ?? 1; });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
