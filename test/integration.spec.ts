import { readFileSync } from 'node:fs';
import path from 'node:path';

import { UsenetPriority } from '@ctrl/shared-usenet';
import { describe, expect, expectTypeOf, it } from 'vitest';

import { Nzbget } from '../src/index.js';
import type { NzbGetSettings } from '../src/types.js';

const baseUrl = process.env.TEST_NZBGET_URL ?? 'http://127.0.0.1:6789';
const username = process.env.TEST_NZBGET_USERNAME ?? 'nzbget';
const password = process.env.TEST_NZBGET_PASSWORD ?? 'tegbzn6789';
const sampleUrl = process.env.TEST_NZBGET_NZB_URL;
const integrationEnabled = Boolean(process.env.TEST_NZBGET_URL);
const __dirname = new URL('.', import.meta.url).pathname;
const fixturePath = path.join(__dirname, 'fixtures', 'sample.nzb');
const sampleNzb = readFileSync(fixturePath);

async function sleep(milliseconds: number): Promise<void> {
  await new Promise(resolve => {
    setTimeout(resolve, milliseconds);
  });
}

async function waitForHistoryJob(
  client: Nzbget,
  id: string,
  attempts = 20,
): Promise<Awaited<ReturnType<Nzbget['getHistoryJob']>>> {
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await client.getHistoryJob(id);
    } catch {
      if (attempt === attempts - 1) {
        throw new Error(`History job ${id} did not become available`);
      }

      await sleep(250);
    }
  }

  throw new Error(`History job ${id} did not become available`);
}

describe.skipIf(!integrationEnabled)('nzbget integration', () => {
  it('loads the nzbget version', async () => {
    const client = new Nzbget({ baseUrl, username, password });

    await expect(client.getVersion()).resolves.toMatch(/^\d+\.\d+/);
  });

  it('loads raw nzbget status', async () => {
    const client = new Nzbget({ baseUrl, username, password });

    const status = await client.status();

    expect(status).toMatchObject({
      DownloadRate: expect.any(Number),
      DownloadLimit: expect.any(Number),
      DownloadPaused: expect.any(Boolean),
      RemainingSizeLo: expect.any(Number),
      RemainingSizeHi: expect.any(Number),
    });
    expect(status.DownloadLimit).toBeGreaterThanOrEqual(0);
    expect(status.RemainingSizeLo).toBeGreaterThanOrEqual(0);
    expect(status.RemainingSizeHi).toBeGreaterThanOrEqual(0);
  });

  it('loads raw config values', async () => {
    const client = new Nzbget({ baseUrl, username, password });

    await expect(client.getConfig()).resolves.toMatchObject({
      ControlUsername: 'nzbget',
      ControlPassword: 'tegbzn6789',
      ControlPort: '6789',
      MainDir: expect.any(String),
    });
  });

  it('loads settings from the server with the expected types', async () => {
    const client = new Nzbget({ baseUrl, username, password });
    const settings = await client.getConfig();

    expectTypeOf(settings).toEqualTypeOf<NzbGetSettings>();
    expectTypeOf(settings.ControlPort).toBeString();
    expectTypeOf(settings.MainDir).toBeString();
    expectTypeOf(settings['Server1.Port']).toEqualTypeOf<string | undefined>();
    expectTypeOf(settings['Category1.Name']).toEqualTypeOf<string | undefined>();
    expect(settings).toMatchObject({
      ControlUsername: expect.any(String),
      ControlPassword: expect.any(String),
      ControlPort: expect.any(String),
      MainDir: expect.any(String),
    });
  });

  it('derives categories from config', async () => {
    const client = new Nzbget({ baseUrl, username, password });
    const categories = await client.getCategories();

    expect(categories).toEqual(expect.any(Array));
    for (const category of categories) {
      expect(category).toMatchObject({
        id: expect.any(String),
        name: expect.any(String),
        path: expect.any(String),
      });
    }
  });

  it('derives scripts from config templates', async () => {
    const client = new Nzbget({ baseUrl, username, password });
    const scripts = await client.getScripts();

    expect(scripts).toEqual(expect.any(Array));
    for (const script of scripts) {
      expect(script).toMatchObject({
        id: expect.any(String),
        name: expect.any(String),
      });
    }
  });

  it('loads normalized all-data state', async () => {
    const client = new Nzbget({ baseUrl, username, password });
    const data = await client.getAllData();

    expect(data).toMatchObject({
      categories: expect.any(Array),
      scripts: expect.any(Array),
      queue: expect.any(Array),
      history: expect.any(Array),
      status: expect.any(Object),
      raw: {
        status: expect.any(Object),
        groups: expect.any(Array),
        history: expect.any(Array),
      },
    });
  });

  it('loads normalized history items', async () => {
    const client = new Nzbget({ baseUrl, username, password });
    const history = await client.getHistory();

    expect(history).toEqual(expect.any(Array));
    for (const item of history) {
      expect(item).toMatchObject({
        id: expect.any(String),
        name: expect.any(String),
        category: expect.any(String),
        progress: expect.any(Number),
        isCompleted: expect.any(Boolean),
        stateMessage: expect.any(String),
        totalSize: expect.any(Number),
        remainingSize: expect.any(Number),
        raw: expect.any(Object),
      });
      expect(item.queuePosition).toBe(-1);
      expect(item.remainingSize).toBe(0);
      expect(item.downloadSpeed).toBe(0);
    }
  });

  it('loads one normalized history item by id when history exists', async () => {
    const client = new Nzbget({ baseUrl, username, password });
    const history = await client.getHistory();
    const first = history[0];

    if (!first) {
      return;
    }

    await expect(client.getHistoryJob(first.id)).resolves.toMatchObject({
      id: first.id,
      name: expect.any(String),
      category: expect.any(String),
      progress: expect.any(Number),
      isCompleted: expect.any(Boolean),
      stateMessage: expect.any(String),
      totalSize: expect.any(Number),
      remainingSize: expect.any(Number),
      raw: expect.any(Object),
    });
  });

  it('finds a normalized history item by id when history exists', async () => {
    const client = new Nzbget({ baseUrl, username, password });
    const history = await client.getHistory();
    const first = history[0];

    if (!first) {
      return;
    }

    await expect(client.findJob(first.id)).resolves.toMatchObject({
      source: 'history',
      job: {
        id: first.id,
        name: expect.any(String),
        category: expect.any(String),
        progress: expect.any(Number),
        isCompleted: expect.any(Boolean),
        stateMessage: expect.any(String),
        totalSize: expect.any(Number),
        remainingSize: expect.any(Number),
        raw: expect.any(Object),
      },
    });
  });

  it('lists files without raising an rpc parameter error', async () => {
    const client = new Nzbget({ baseUrl, username, password });

    await expect(client.listFiles(0)).resolves.toEqual(expect.any(Array));
  });

  it('returns null for a missing normalized job lookup', async () => {
    const client = new Nzbget({ baseUrl, username, password });

    await expect(client.findJob('999999')).resolves.toBeNull();
  });

  it('pauses and resumes the download queue', async () => {
    const client = new Nzbget({ baseUrl, username, password });

    await expect(client.pauseDownload()).resolves.toBe(true);
    await expect(client.status()).resolves.toMatchObject({
      DownloadPaused: true,
    });

    await expect(client.resumeDownload()).resolves.toBe(true);
    await expect(client.status()).resolves.toMatchObject({
      DownloadPaused: false,
    });
  });

  it('updates and restores the download rate limit', async () => {
    const client = new Nzbget({ baseUrl, username, password });
    const originalStatus = await client.status();
    const originalLimit = originalStatus.DownloadLimit;

    await expect(client.setRate(1024)).resolves.toBe(true);
    await expect(client.status()).resolves.toMatchObject({
      DownloadLimit: 1_048_576,
    });

    await expect(client.setRate(originalLimit)).resolves.toBe(true);
  });

  it('adds a file and reads queue data', async () => {
    const client = new Nzbget({ baseUrl, username, password });
    const id = await client.addNzbFile(sampleNzb, {
      category: '',
    });

    expect(id).toBeTruthy();
    const queue = await client.getQueue();
    expect(queue.length).toBeGreaterThan(0);
  });

  it('adds a file and exposes it through history lookup', async () => {
    const client = new Nzbget({ baseUrl, username, password });
    const id = await client.addNzbFile(sampleNzb, {
      category: 'movies',
      startPaused: true,
    });

    const historyJob = await waitForHistoryJob(client, id);
    const foundJob = await client.findJob(id);

    expect(historyJob).toMatchObject({
      id,
      name: expect.any(String),
      category: expect.stringMatching(/^movies$/i),
      raw: expect.any(Object),
    });
    expect(foundJob).toMatchObject({
      source: 'history',
      job: {
        id,
        category: expect.stringMatching(/^movies$/i),
        raw: expect.any(Object),
      },
    });
  });

  it('loads an existing queue job by id and finds it in queue lookup', async () => {
    const client = new Nzbget({ baseUrl, username, password });
    const queue = await client.getQueue();
    const first = queue[0];

    if (!first) {
      return;
    }

    const queueJob = await client.getQueueJob(first.id);
    const foundJob = await client.findJob(first.id);

    expect(queueJob).toMatchObject({
      id: first.id,
      name: expect.any(String),
      category: expect.any(String),
      raw: expect.any(Object),
    });
    expect(foundJob).toMatchObject({
      source: 'queue',
      job: {
        id: first.id,
        raw: expect.any(Object),
      },
    });
  });

  it('updates and restores an existing queue job category and priority', async () => {
    const client = new Nzbget({ baseUrl, username, password });
    const queue = await client.getQueue();
    const first = queue[0];

    if (!first) {
      return;
    }

    const originalCategory = first.category;
    const originalPriority = first.priority;

    try {
      await expect(client.setCategory(first.id, 'movies')).resolves.toBe(true);
      await expect(client.setPriority(first.id, UsenetPriority.veryHigh)).resolves.toBe(true);

      await expect(client.getQueueJob(first.id)).resolves.toMatchObject({
        id: first.id,
        category: 'movies',
        priority: UsenetPriority.veryHigh,
        raw: {
          MinPriority: 100,
          MaxPriority: 100,
        },
      });
    } finally {
      await client.setCategory(first.id, originalCategory!);
      await client.setPriority(first.id, originalPriority!);
    }
  });

  it('pauses and resumes an existing individual queue job', async () => {
    const client = new Nzbget({ baseUrl, username, password });
    const queue = await client.getQueue();
    const first = queue[0];

    if (!first) {
      return;
    }

    await expect(client.pauseJob(first.id)).resolves.toBe(true);
    await expect(client.getQueueJob(first.id)).resolves.toMatchObject({
      id: first.id,
      stateMessage: expect.stringMatching(/paused/i),
    });

    await expect(client.resumeJob(first.id)).resolves.toBe(true);
    await expect(client.getQueueJob(first.id)).resolves.toMatchObject({
      id: first.id,
    });
    await expect(client.getQueueJob(first.id)).resolves.not.toMatchObject({
      stateMessage: expect.stringMatching(/paused/i),
    });
  });

  it('moves an existing queue job when multiple queue items exist', async () => {
    const client = new Nzbget({ baseUrl, username, password });
    const queue = await client.getQueue();

    if (queue.length < 2) {
      return;
    }

    const first = queue[0]!;
    const second = queue[1]!;

    await expect(client.moveJob(second.id, 0)).resolves.toBe(true);
    await expect(client.getQueueJob(second.id)).resolves.toMatchObject({
      id: second.id,
      queuePosition: 0,
    });

    await expect(client.moveJob(second.id, 1)).resolves.toBe(true);
    await expect(client.getQueueJob(second.id)).resolves.toMatchObject({
      id: second.id,
      queuePosition: 1,
    });

    await expect(client.moveJob(first.id, 0)).resolves.toBe(true);
  });

  it('loads raw history including hidden entries', async () => {
    const client = new Nzbget({ baseUrl, username, password });

    await expect(client.history(true)).resolves.toEqual(expect.any(Array));
  });

  it('adds a url when a fixture url is available', async () => {
    if (!sampleUrl) {
      return;
    }

    const client = new Nzbget({ baseUrl, username, password });
    const id = await client.addNzbUrl(sampleUrl, {
      category: '',
    });

    expect(id).toBeTruthy();
  });
});
