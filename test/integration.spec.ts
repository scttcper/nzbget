import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { Nzbget } from '../src/index.js';

const baseUrl = process.env.TEST_NZBGET_URL;
const username = process.env.TEST_NZBGET_USERNAME;
const password = process.env.TEST_NZBGET_PASSWORD;
const sampleUrl = process.env.TEST_NZBGET_NZB_URL;
const integrationEnabled = Boolean(baseUrl && username && password);
const __dirname = new URL('.', import.meta.url).pathname;
const fixturePath = path.join(__dirname, 'fixtures', 'sample.nzb');

describe.skipIf(!integrationEnabled)('nzbget integration', () => {
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

  it('adds a file and reads queue data', async () => {
    const client = new Nzbget({ baseUrl, username, password });
    const id = await client.addNzbFile(readFileSync(fixturePath), {
      category: '',
    });

    expect(id).toBeTruthy();
    const queue = await client.getQueue();
    expect(queue.length).toBeGreaterThan(0);
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
