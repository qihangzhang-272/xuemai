import { randomUUID } from 'node:crypto';
import { mkdir, mkdtemp, rename, rm, writeFile } from 'node:fs/promises';
import { isIP } from 'node:net';
import path from 'node:path';
import { strFromU8, unzipSync } from 'fflate';
import { ProviderTaskFailedError, ProviderTaskPersistenceError } from './provider-task-error';
import { MaterialTextQualityError, decodeUtf8MaterialText } from '@/lib/material-text-quality';

const DEFAULT_BASE_URL = 'https://mineru.net/api/v4';
const DEFAULT_POLL_INTERVAL_MS = 10_000;
const DEFAULT_POLL_TIMEOUT_MS = 15 * 60_000;
const DEFAULT_REQUEST_TIMEOUT_MS = 2 * 60_000;
const MAX_ZIP_BYTES = 100 * 1024 * 1024;
const MAX_EXTRACTED_ARTIFACT_BYTES = 100 * 1024 * 1024;
const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp']);
const BLOCKED_IPV4_RANGES = [
  [0x00000000, 0x00ffffff], // 0.0.0.0/8
  [0x0a000000, 0x0affffff], // 10.0.0.0/8
  [0x64400000, 0x647fffff], // 100.64.0.0/10
  [0x7f000000, 0x7fffffff], // 127.0.0.0/8
  [0xa9fe0000, 0xa9feffff], // 169.254.0.0/16
  [0xac100000, 0xac1fffff], // 172.16.0.0/12
  [0xc0000000, 0xc00000ff], // 192.0.0.0/24
  [0xc0000200, 0xc00002ff], // 192.0.2.0/24
  [0xc0586300, 0xc05863ff], // 192.88.99.0/24
  [0xc0a80000, 0xc0a8ffff], // 192.168.0.0/16
  [0xc6120000, 0xc613ffff], // 198.18.0.0/15
  [0xc6336400, 0xc63364ff], // 198.51.100.0/24
  [0xcb007100, 0xcb0071ff], // 203.0.113.0/24
  [0xe0000000, 0xefffffff], // 224.0.0.0/4
  [0xf0000000, 0xffffffff], // 240.0.0.0/4
] as const;

export interface MinerUParseArtifacts {
  markdown: string;
  contentList: string | null;
  layout: string | null;
  images: string[];
  stats: {
    markdownCharacters: number;
    contentBlocks: number;
    layoutBlocks: number;
    images: number;
  };
}

export interface MinerUParseResult {
  textContent: string;
  provider: 'mineru';
  artifacts: MinerUParseArtifacts;
}

export class MinerUConfigurationError extends Error {
  constructor(message = 'MINERU_API_TOKEN 未配置') {
    super(message);
    this.name = 'MinerUConfigurationError';
  }
}

interface MinerUParserOptions {
  token?: string;
  baseUrl?: string;
  modelVersion?: string;
  language?: string;
  enableTable?: boolean;
  enableFormula?: boolean;
  pollIntervalMs?: number;
  pollTimeoutMs?: number;
  requestTimeoutMs?: number;
  artifactRoot?: string;
  artifactRelativeDir?: string;
  providerTaskId?: string | null;
  persistProviderTaskId?: (taskId: string) => Promise<void>;
  signal?: AbortSignal;
  fetch?: typeof fetch;
  sleep?: (ms: number, signal?: AbortSignal) => Promise<void>;
  now?: () => number;
}

export async function parseDocumentWithMinerU(
  input: { fileName: string; bytes: Uint8Array },
  options: MinerUParserOptions = {},
): Promise<MinerUParseResult> {
  const token = options.token ?? process.env.MINERU_API_TOKEN ?? '';
  if (!token.trim()) throw new MinerUConfigurationError();
  options.signal?.throwIfAborted();

  const fetcher = options.fetch ?? fetch;
  const baseUrl = (
    options.baseUrl ??
    nonEmpty(process.env.MINERU_API_BASE_URL) ??
    DEFAULT_BASE_URL
  ).replace(/\/$/, '');
  const requestTimeoutMs =
    options.requestTimeoutMs ??
    readPositiveInteger(process.env.MINERU_API_REQUEST_TIMEOUT_MS, DEFAULT_REQUEST_TIMEOUT_MS);
  const pollIntervalMs =
    options.pollIntervalMs ??
    readPositiveInteger(process.env.MINERU_API_POLL_INTERVAL_MS, DEFAULT_POLL_INTERVAL_MS);
  const pollTimeoutMs =
    options.pollTimeoutMs ??
    readPositiveInteger(process.env.MINERU_API_POLL_TIMEOUT_MS, DEFAULT_POLL_TIMEOUT_MS);
  const sleep = options.sleep ?? waitForPoll;
  const now = options.now ?? Date.now;
  const headers = {
    authorization: `Bearer ${token}`,
    accept: 'application/json',
    'content-type': 'application/json',
  };

  let batchId = nonEmpty(options.providerTaskId ?? undefined);
  if (!batchId) {
    const submission = await requestJson(
      fetcher,
      `${baseUrl}/file-urls/batch`,
      requestTimeoutMs,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          files: [{ name: input.fileName, data_id: `material-${randomUUID()}` }],
          model_version:
            options.modelVersion ?? nonEmpty(process.env.MINERU_API_MODEL_VERSION) ?? 'vlm',
          language: options.language ?? nonEmpty(process.env.MINERU_API_LANGUAGE) ?? 'ch',
          enable_table: options.enableTable ?? true,
          enable_formula: options.enableFormula ?? true,
        }),
      },
      options.signal,
    );
    const data = objectValue(submission.data);
    batchId = stringValue(data?.batch_id) ?? undefined;
    const uploadUrl = Array.isArray(data?.file_urls) ? stringValue(data.file_urls[0]) : null;
    if (!batchId || !uploadUrl) throw new Error('MinerU 未返回可用的上传任务');
    assertSafeRemoteUrl(uploadUrl, 'MinerU 上传地址无效');

    const uploadResponse = await fetcher(uploadUrl, {
      method: 'PUT',
      body: new Uint8Array(input.bytes),
      redirect: 'error',
      signal: requestSignal(requestTimeoutMs, options.signal),
    });
    if (!uploadResponse.ok) throw new Error('MinerU 文件上传失败');
    try {
      await options.persistProviderTaskId?.(batchId);
    } catch (cause) {
      throw new ProviderTaskPersistenceError(batchId, cause);
    }
  }

  const deadline = now() + pollTimeoutMs;
  let zipUrl: string | null = null;
  while (now() <= deadline) {
    const status = await requestJson(
      fetcher,
      `${baseUrl}/extract-results/batch/${encodeURIComponent(batchId)}`,
      requestTimeoutMs,
      { method: 'GET', headers },
      options.signal,
    );
    const statusData = objectValue(status.data);
    const results = statusData?.extract_result;
    const result = Array.isArray(results) ? objectValue(results[0]) : null;
    const state = stringValue(result?.state)?.toLowerCase();
    zipUrl = stringValue(result?.full_zip_url);
    if (zipUrl) break;
    if (state === 'failed' || state === 'error') {
      throw new ProviderTaskFailedError('MinerU 文档解析失败');
    }
    if (state === 'done') throw new Error('MinerU 解析结果缺少 full_zip_url');
    await sleep(pollIntervalMs, options.signal);
  }
  if (!zipUrl) throw new Error('MinerU 文档解析超时');
  assertSafeRemoteUrl(zipUrl, 'MinerU 结果下载地址无效');

  const download = await fetcher(zipUrl, {
    method: 'GET',
    redirect: 'error',
    signal: requestSignal(requestTimeoutMs, options.signal),
  });
  if (!download.ok) throw new Error('MinerU 解析结果下载失败');
  const contentLength = Number(download.headers.get('content-length'));
  if (Number.isFinite(contentLength) && contentLength > MAX_ZIP_BYTES) {
    throw new Error('MinerU 解析结果压缩包过大');
  }
  const zipBytes = new Uint8Array(await download.arrayBuffer());
  options.signal?.throwIfAborted();
  if (zipBytes.byteLength > MAX_ZIP_BYTES) throw new Error('MinerU 解析结果压缩包过大');

  const artifactRoot = path.resolve(
    options.artifactRoot ??
      nonEmpty(process.env.MATERIAL_PARSE_ARTIFACT_ROOT) ??
      path.join(process.cwd(), '.data', 'lesson-material-artifacts'),
  );
  const artifactRelativeDir = safeRelativePath(
    options.artifactRelativeDir ?? `${path.parse(input.fileName).name}-${randomUUID()}`,
  );
  return extractMinerUArchive(zipBytes, artifactRoot, artifactRelativeDir);
}

async function extractMinerUArchive(
  zipBytes: Uint8Array,
  artifactRoot: string,
  artifactRelativeDir: string,
): Promise<MinerUParseResult> {
  let extractedBytes = 0;
  const entries = unzipSync(zipBytes, {
    filter(entry) {
      const safeName = safeRelativePath(entry.name);
      const selected = isArtifactEntry(safeName);
      if (selected) {
        extractedBytes += entry.originalSize;
        if (extractedBytes > MAX_EXTRACTED_ARTIFACT_BYTES) {
          throw new Error('MinerU 解压后工件过大');
        }
      }
      return selected;
    },
  });
  const normalizedEntries = Object.entries(entries).map(
    ([name, bytes]) => [safeRelativePath(name), bytes] as const,
  );
  const markdownEntries = normalizedEntries.filter(
    ([name]) => path.posix.basename(name) === 'full.md',
  );
  if (markdownEntries.length !== 1) {
    throw new MaterialTextQualityError('content', 'MinerU 结果必须包含唯一的 full.md');
  }

  const [markdownName, markdownBytes] = markdownEntries[0]!;
  const markdown = decodeUtf8MaterialText(markdownBytes).trim();
  if (!markdown) {
    throw new MaterialTextQualityError('content', 'MinerU 返回了空的 full.md');
  }
  const contentListEntry = normalizedEntries.find(([name]) => isContentList(name)) ?? null;
  const layoutEntry = normalizedEntries.find(([name]) => isLayout(name)) ?? null;
  const imageEntries = normalizedEntries.filter(([name]) => isImage(name));

  const finalDir = resolveInside(artifactRoot, artifactRelativeDir);
  await mkdir(artifactRoot, { recursive: true });
  const temporaryDir = await mkdtemp(path.join(artifactRoot, '.extract-'));
  try {
    for (const [name, bytes] of normalizedEntries) {
      const destination = resolveInside(temporaryDir, name);
      await mkdir(path.dirname(destination), { recursive: true });
      await writeFile(destination, bytes);
    }
    await rm(finalDir, { recursive: true, force: true });
    await mkdir(path.dirname(finalDir), { recursive: true });
    await rename(temporaryDir, finalDir);
  } catch (error) {
    await rm(temporaryDir, { recursive: true, force: true });
    throw error;
  }

  const relative = (name: string) => path.posix.join(artifactRelativeDir, name);
  return {
    textContent: markdown,
    provider: 'mineru',
    artifacts: {
      markdown: relative(markdownName),
      contentList: contentListEntry ? relative(contentListEntry[0]) : null,
      layout: layoutEntry ? relative(layoutEntry[0]) : null,
      images: imageEntries.map(([name]) => relative(name)).sort(),
      stats: {
        markdownCharacters: markdown.length,
        contentBlocks: contentListEntry ? countContentBlocks(contentListEntry[1]) : 0,
        layoutBlocks: layoutEntry ? countLayoutBlocks(layoutEntry[1]) : 0,
        images: imageEntries.length,
      },
    },
  };
}

async function requestJson(
  fetcher: typeof fetch,
  url: string,
  requestTimeoutMs: number,
  init: RequestInit,
  signal?: AbortSignal,
): Promise<Record<string, unknown>> {
  const response = await fetcher(url, {
    ...init,
    signal: requestSignal(requestTimeoutMs, signal),
  });
  if (!response.ok) throw new Error('MinerU API 请求失败');
  let value: unknown;
  try {
    value = await response.json();
  } catch {
    throw new Error('MinerU API 返回了无效 JSON');
  }
  const payload = objectValue(value);
  if (!payload || payload.code !== 0) throw new Error('MinerU API 请求失败');
  return payload;
}

function requestSignal(timeoutMs: number, signal?: AbortSignal) {
  const timeout = AbortSignal.timeout(timeoutMs);
  return signal ? AbortSignal.any([signal, timeout]) : timeout;
}

function waitForPoll(ms: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) return Promise.reject(signal.reason);
  return new Promise((resolve, reject) => {
    const timer = setTimeout(done, ms);
    function done() {
      signal?.removeEventListener('abort', aborted);
      resolve();
    }
    function aborted() {
      clearTimeout(timer);
      reject(signal?.reason);
    }
    signal?.addEventListener('abort', aborted, { once: true });
  });
}

function safeRelativePath(value: string) {
  const normalized = value.replace(/\\/g, '/');
  const segments = normalized.split('/');
  if (
    !normalized ||
    normalized.includes('\0') ||
    normalized.startsWith('/') ||
    /^[a-zA-Z]:/.test(normalized) ||
    segments.some((segment) => segment === '..')
  ) {
    throw new Error('MinerU 压缩包包含不安全路径');
  }
  const safe = segments.filter((segment) => segment && segment !== '.').join('/');
  if (!safe) throw new Error('MinerU 压缩包包含不安全路径');
  return safe;
}

function resolveInside(root: string, relativePath: string) {
  const resolvedRoot = path.resolve(root);
  const resolved = path.resolve(resolvedRoot, ...safeRelativePath(relativePath).split('/'));
  if (resolved !== resolvedRoot && !resolved.startsWith(`${resolvedRoot}${path.sep}`)) {
    throw new Error('MinerU 压缩包包含不安全路径');
  }
  return resolved;
}

function isArtifactEntry(name: string) {
  return (
    path.posix.basename(name) === 'full.md' ||
    isContentList(name) ||
    isLayout(name) ||
    isImage(name)
  );
}

function isContentList(name: string) {
  const base = path.posix.basename(name).toLowerCase();
  return base === 'content_list.json' || base.endsWith('_content_list.json');
}

function isLayout(name: string) {
  const base = path.posix.basename(name).toLowerCase();
  return base === 'middle.json' || base === 'layout.json' || base.endsWith('_middle.json');
}

function isImage(name: string) {
  const normalized = `/${name.toLowerCase()}`;
  return normalized.includes('/images/') && IMAGE_EXTENSIONS.has(path.posix.extname(normalized));
}

function countContentBlocks(bytes: Uint8Array) {
  const value = parseJson(bytes);
  if (Array.isArray(value)) return value.length;
  const object = objectValue(value);
  return Array.isArray(object?.items) ? object.items.length : 0;
}

function countLayoutBlocks(bytes: Uint8Array) {
  const value = objectValue(parseJson(bytes));
  const pages = value?.pdf_info;
  if (!Array.isArray(pages)) return 0;
  return pages.reduce((total, page) => {
    const item = objectValue(page);
    const paragraphCount = Array.isArray(item?.para_blocks) ? item.para_blocks.length : 0;
    const discardedCount = Array.isArray(item?.discarded_blocks) ? item.discarded_blocks.length : 0;
    return total + paragraphCount + discardedCount;
  }, 0);
}

function parseJson(bytes: Uint8Array): unknown {
  try {
    return JSON.parse(strFromU8(bytes));
  } catch {
    return null;
  }
}

function assertSafeRemoteUrl(value: string, message: string) {
  let target: URL;
  try {
    target = new URL(value);
  } catch {
    throw new Error(message);
  }
  if (
    target.protocol !== 'https:' ||
    target.username ||
    target.password ||
    target.hostname === 'localhost' ||
    target.hostname.endsWith('.localhost') ||
    isBlockedIpLiteral(target.hostname)
  ) {
    throw new Error(message);
  }
}

function isBlockedIpLiteral(value: string) {
  const hostname = value.replace(/^\[|\]$/g, '').toLowerCase();
  const family = isIP(hostname);
  if (family === 4) return isBlockedIpv4(hostname);
  if (family !== 6) return false;
  if (hostname === '::' || hostname === '::1') return true;

  const first = Number.parseInt(hostname.split(':')[0] || '0', 16);
  if ((first & 0xfe00) === 0xfc00 || (first & 0xffc0) === 0xfe80) return true;

  const mapped = /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/.exec(hostname);
  if (!mapped) return false;
  const high = Number.parseInt(mapped[1]!, 16);
  const low = Number.parseInt(mapped[2]!, 16);
  return isBlockedIpv4(`${high >> 8}.${high & 0xff}.${low >> 8}.${low & 0xff}`);
}

function isBlockedIpv4(value: string) {
  const address = value.split('.').reduce((total, octet) => total * 256 + Number(octet), 0);
  return BLOCKED_IPV4_RANGES.some(([start, end]) => address >= start && address <= end);
}

function objectValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function readPositiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function nonEmpty(value: string | undefined) {
  return value?.trim() || undefined;
}
