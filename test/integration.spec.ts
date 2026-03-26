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
  it('lists files without raising an rpc parameter error', async () => {
    const client = new Nzbget({ baseUrl, username, password });

    await expect(client.listFiles(0)).resolves.toEqual(expect.any(Array));
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
