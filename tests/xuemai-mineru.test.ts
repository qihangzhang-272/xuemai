import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { strToU8, zipSync } from 'fflate';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { parseDocumentWithMinerU } from '../lib/mdt/mineru-parser';
import { ProviderTaskFailedError, ProviderTaskPersistenceError } from '../lib/mdt/provider-task-error';
import { MaterialTextQualityError } from '@/lib/material-text-quality';

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

function jsonResponse(value: unknown) {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

function successfulFetch(zipBytes: Uint8Array) {
  return vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(
      jsonResponse({
        code: 0,
        data: { batch_id: 'batch-1', file_urls: ['https://upload.example/material'] },
      }),
    )
    .mockResolvedValueOnce(new Response(null, { status: 200 }))
    .mockResolvedValueOnce(
      jsonResponse({
        code: 0,
        data: { extract_result: [{ state: 'running', file_name: 'lesson.pdf' }] },
      }),
    )
    .mockResolvedValueOnce(
      jsonResponse({
        code: 0,
        data: {
          extract_result: [
            {
              state: 'done',
              file_name: 'lesson.pdf',
              full_zip_url: 'https://download.example/result.zip?signature=secret',
            },
          ],
        },
      }),
    )
    .mockResolvedValueOnce(new Response(Uint8Array.from(zipBytes), { status: 200 }));
}

describe('MinerU v4 文档解析器', () => {
  it('上传、轮询并安全保存 Markdown 与结构化工件', async () => {
    const root = await mkdtemp(join(tmpdir(), 'mdt-mineru-'));
    roots.push(root);
    const zipBytes = zipSync({
      'result/full.md': strToU8('# 第一章\n\n正文'),
      'result/content_list.json': strToU8(JSON.stringify([{ type: 'text' }, { type: 'table' }])),
      'result/middle.json': strToU8(
        JSON.stringify({ pdf_info: [{ para_blocks: [{}, {}], discarded_blocks: [{}] }] }),
      ),
      'result/images/page-1.png': new Uint8Array([1, 2, 3]),
    });
    const fetchMock = successfulFetch(zipBytes);
    const sleep = vi.fn().mockResolvedValue(undefined);

    const result = await parseDocumentWithMinerU(
      { fileName: 'lesson.pdf', bytes: Buffer.from('%PDF-') },
      {
        token: 'token',
        fetch: fetchMock,
        sleep,
        artifactRoot: root,
        artifactRelativeDir: '9/upload-1',
      },
    );

    expect(result).toEqual({
      textContent: '# 第一章\n\n正文',
      provider: 'mineru',
      artifacts: {
        markdown: '9/upload-1/result/full.md',
        contentList: '9/upload-1/result/content_list.json',
        layout: '9/upload-1/result/middle.json',
        images: ['9/upload-1/result/images/page-1.png'],
        stats: { markdownCharacters: 9, contentBlocks: 2, layoutBlocks: 3, images: 1 },
      },
    });
    await expect(readFile(join(root, result.artifacts.markdown), 'utf8')).resolves.toBe(
      '# 第一章\n\n正文',
    );
    expect(JSON.stringify(result.artifacts)).not.toContain('signature');
    expect(sleep).toHaveBeenCalledOnce();

    const [submitUrl, submitInit] = fetchMock.mock.calls[0]!;
    expect(submitUrl).toBe('https://mineru.net/api/v4/file-urls/batch');
    expect(JSON.parse(String(submitInit?.body))).toMatchObject({
      files: [{ name: 'lesson.pdf' }],
      model_version: 'vlm',
      language: 'ch',
      enable_table: true,
      enable_formula: true,
    });
    expect(new Headers(fetchMock.mock.calls[1]![1]?.headers).has('authorization')).toBe(false);
    expect(fetchMock.mock.calls[1]![1]?.redirect).toBe('error');
    expect(fetchMock.mock.calls[4]![1]?.redirect).toBe('error');
  });

  it('拒绝 full.md 中的非法 UTF-8，而不是返回替换字符', async () => {
    const root = await mkdtemp(join(tmpdir(), 'mdt-mineru-invalid-utf8-'));
    roots.push(root);
    const fetchMock = successfulFetch(
      zipSync({ 'result/full.md': Uint8Array.from([0xff, 0xfe, 0x61]) }),
    );

    const parsing = parseDocumentWithMinerU(
      { fileName: 'lesson.pdf', bytes: Buffer.from('%PDF-') },
      {
        token: 'token',
        fetch: fetchMock,
        sleep: vi.fn().mockResolvedValue(undefined),
        artifactRoot: root,
        artifactRelativeDir: '9/invalid-utf8',
      },
    );

    await expect(parsing).rejects.toBeInstanceOf(MaterialTextQualityError);
    await expect(parsing).rejects.toThrow('教材正文无法识别');
  });

  it('已有远端任务 ID 时跳过提交和上传，只恢复轮询原任务', async () => {
    const root = await mkdtemp(join(tmpdir(), 'mdt-mineru-resume-'));
    roots.push(root);
    const zipBytes = zipSync({ 'result/full.md': strToU8('恢复后的正文') });
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        jsonResponse({
          code: 0,
          data: {
            extract_result: [
              {
                state: 'done',
                file_name: 'lesson.pdf',
                full_zip_url: 'https://download.example/result.zip',
              },
            ],
          },
        }),
      )
      .mockResolvedValueOnce(new Response(Uint8Array.from(zipBytes), { status: 200 }));

    await expect(
      parseDocumentWithMinerU(
        { fileName: 'lesson.pdf', bytes: Buffer.from('%PDF-') },
        {
          token: 'token',
          providerTaskId: 'batch-existing',
          fetch: fetchMock,
          artifactRoot: root,
          artifactRelativeDir: '9/resumed',
        },
      ),
    ).resolves.toMatchObject({ textContent: '恢复后的正文' });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]![0]).toBe(
      'https://mineru.net/api/v4/extract-results/batch/batch-existing',
    );
    expect(fetchMock.mock.calls[0]![1]?.method).toBe('GET');
  });

  it('上传成功后先持久化 batch ID，落库失败时不开始轮询', async () => {
    const persistError = new Error('database unavailable');
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        jsonResponse({
          code: 0,
          data: { batch_id: 'batch-persist', file_urls: ['https://upload.example/material'] },
        }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 200 }));
    const persistProviderTaskId = vi.fn().mockRejectedValue(persistError);

    const parsing = parseDocumentWithMinerU(
      { fileName: 'lesson.pdf', bytes: Buffer.from('%PDF-') },
      { token: 'token', fetch: fetchMock, persistProviderTaskId },
    );
    await expect(parsing).rejects.toBeInstanceOf(ProviderTaskPersistenceError);
    await parsing.catch((error) => {
      expect(error).toMatchObject({ taskId: 'batch-persist' });
    });

    expect(persistProviderTaskId).toHaveBeenCalledWith('batch-persist');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('文件上传失败时不持久化尚不可恢复的 batch ID', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        jsonResponse({
          code: 0,
          data: { batch_id: 'batch-without-file', file_urls: ['https://upload.example/material'] },
        }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 500 }));
    const persistProviderTaskId = vi.fn();

    await expect(
      parseDocumentWithMinerU(
        { fileName: 'lesson.pdf', bytes: Buffer.from('%PDF-') },
        { token: 'token', fetch: fetchMock, persistProviderTaskId },
      ),
    ).rejects.toThrow('MinerU 文件上传失败');

    expect(persistProviderTaskId).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it.each([
    'https://localhost/upload',
    'https://127.0.0.1/upload',
    'https://10.0.0.1/upload',
    'https://172.16.0.1/upload',
    'https://192.168.0.1/upload',
    'https://169.254.169.254/upload',
    'https://100.64.0.1/upload',
    'https://198.18.0.1/upload',
    'https://224.0.0.1/upload',
    'https://240.0.0.1/upload',
    'https://[::1]/upload',
    'https://[fc00::1]/upload',
    'https://[fe80::1]/upload',
    'https://[::ffff:127.0.0.1]/upload',
  ])('拒绝指向本机或私网 IP 的 MinerU 上传地址：%s', async (uploadUrl) => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(
      jsonResponse({
        code: 0,
        data: { batch_id: 'batch-private', file_urls: [uploadUrl] },
      }),
    );

    await expect(
      parseDocumentWithMinerU(
        { fileName: 'lesson.pdf', bytes: Buffer.from('%PDF-') },
        { token: 'token', fetch: fetchMock },
      ),
    ).rejects.toThrow('MinerU 上传地址无效');
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('拒绝指向私网 IP 的 MinerU 结果下载地址', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(
      jsonResponse({
        code: 0,
        data: {
          extract_result: [
            {
              state: 'done',
              file_name: 'lesson.pdf',
              full_zip_url: 'https://10.0.0.2/result.zip',
            },
          ],
        },
      }),
    );

    await expect(
      parseDocumentWithMinerU(
        { fileName: 'lesson.pdf', bytes: Buffer.from('%PDF-') },
        { token: 'token', providerTaskId: 'batch-existing', fetch: fetchMock },
      ),
    ).rejects.toThrow('MinerU 结果下载地址无效');
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('缺少 Token 时明确报配置错误且不发起请求', async () => {
    const fetchMock = vi.fn<typeof fetch>();
    await expect(
      parseDocumentWithMinerU(
        { fileName: 'lesson.pdf', bytes: Buffer.from('%PDF-') },
        { token: '', fetch: fetchMock },
      ),
    ).rejects.toThrow('MINERU_API_TOKEN 未配置');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('调用方已取消时不提交远端解析任务', async () => {
    const controller = new AbortController();
    const reason = new Error('material lease lost');
    controller.abort(reason);
    const fetchMock = vi.fn<typeof fetch>();

    await expect(
      parseDocumentWithMinerU(
        { fileName: 'lesson.pdf', bytes: Buffer.from('%PDF-') },
        { token: 'token', fetch: fetchMock, signal: controller.signal },
      ),
    ).rejects.toBe(reason);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('轮询请求进行中收到取消信号时立即停止', async () => {
    const controller = new AbortController();
    const reason = new Error('material lease lost');
    let enter!: () => void;
    const entered = new Promise<void>((resolve) => (enter = resolve));
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        jsonResponse({
          code: 0,
          data: { batch_id: 'batch-1', file_urls: ['https://upload.example/material'] },
        }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockImplementationOnce(
        async (_url, init) =>
          new Promise<Response>((_resolve, reject) => {
            enter();
            init?.signal?.addEventListener('abort', () => reject(init.signal?.reason), {
              once: true,
            });
          }),
      );
    const processing = parseDocumentWithMinerU(
      { fileName: 'lesson.pdf', bytes: Buffer.from('%PDF-') },
      { token: 'token', fetch: fetchMock, signal: controller.signal },
    );
    await entered;

    controller.abort(reason);
    await expect(processing).rejects.toBe(reason);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('把供应商明确失败标记为可新建任务的终态错误', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        jsonResponse({
          code: 0,
          data: { batch_id: 'batch-failed', file_urls: ['https://upload.example/material'] },
        }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(
        jsonResponse({
          code: 0,
          data: { extract_result: [{ state: 'failed', file_name: 'lesson.pdf' }] },
        }),
      );

    await expect(
      parseDocumentWithMinerU(
        { fileName: 'lesson.pdf', bytes: Buffer.from('%PDF-') },
        { token: 'token', fetch: fetchMock },
      ),
    ).rejects.toBeInstanceOf(ProviderTaskFailedError);
  });

  it('拒绝包含目录穿越路径的结果压缩包', async () => {
    const root = await mkdtemp(join(tmpdir(), 'mdt-mineru-slip-'));
    roots.push(root);
    const fetchMock = successfulFetch(
      zipSync({
        '../escape.txt': strToU8('bad'),
        'result/full.md': strToU8('正文'),
      }),
    );

    await expect(
      parseDocumentWithMinerU(
        { fileName: 'lesson.pdf', bytes: Buffer.from('%PDF-') },
        {
          token: 'token',
          fetch: fetchMock,
          sleep: vi.fn().mockResolvedValue(undefined),
          artifactRoot: root,
          artifactRelativeDir: '9/upload-2',
        },
      ),
    ).rejects.toThrow('不安全');
  });
});
