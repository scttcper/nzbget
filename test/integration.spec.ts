import { readFileSync } from 'node:fs';
import path from 'node:path';

import { UsenetJobState, UsenetPostProcess, UsenetPriority } from '@ctrl/shared-usenet';
import { describe, expect, it } from 'vitest';

import { Nzbget } from '../src/index.js';

const baseUrl = process.env.TEST_NZBGET_URL ?? 'http://127.0.0.1:6789';
const username = process.env.TEST_NZBGET_USERNAME ?? 'nzbget';
const password = process.env.TEST_NZBGET_PASSWORD ?? 'tegbzn6789';
const sampleUrl = process.env.TEST_NZBGET_NZB_URL;
const integrationEnabled = Boolean(process.env.TEST_NZBGET_URL);
const __dirname = new URL('.', import.meta.url).pathname;
const fixturePath = path.join(__dirname, 'fixtures', 'sample.nzb');
const sampleNzb = readFileSync(fixturePath);

// NZBGet itself listens on 6789 inside the container and 404s right away,
// while unreachable hosts get retried for minutes.
const missingNzbUrl = 'http://127.0.0.1:6789/missing.nzb';

/** NZBGet drops identical NZBs as `DELETED/COPY`, so give each test its own content. */
function uniqueNzb(label: string): string {
  const unique = `${label}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return sampleNzb.toString('utf8').replace('sample@test.invalid', `${unique}@test.invalid`);
}

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

  it('loads 64-bit rate and disk fields from status', async () => {
    const client = new Nzbget({ baseUrl, username, password });
    const status = await client.status();

    expect(status).toMatchObject({
      DownloadRateLo: expect.any(Number),
      DownloadRateHi: expect.any(Number),
      AverageDownloadRateLo: expect.any(Number),
      AverageDownloadRateHi: expect.any(Number),
      MonthSizeLo: expect.any(Number),
      DaySizeLo: expect.any(Number),
      QuotaReached: expect.any(Boolean),
      TotalDiskSpaceLo: expect.any(Number),
      FreeInterDiskSpaceLo: expect.any(Number),
      TotalInterDiskSpaceLo: expect.any(Number),
      QueueScriptCount: expect.any(Number),
    });
  });

  it('fills post-processing pause and complete dir in normalized status', async () => {
    const client = new Nzbget({ baseUrl, username, password });
    const [data, settings] = await Promise.all([client.getAllData(), client.getConfig()]);

    expect(data.status).toMatchObject({
      isPostProcessingPaused: expect.any(Boolean),
      completeDir: settings.DestDir.replace('${MainDir}', settings.MainDir),
    });
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

  it('round-trips pp-parameters and add options through listgroups', async () => {
    const client = new Nzbget({ baseUrl, username, password });
    const id = await client.addNzbFile(uniqueNzb('options'), {
      name: 'options.nzb',
      password: 'secret',
      postProcess: UsenetPostProcess.none,
      postProcessScript: 'Notify.py',
      priority: UsenetPriority.paused,
    });

    try {
      const job = await client.getQueueJob(id);
      expect(job.state).toBe(UsenetJobState.paused);
      expect((job.raw as { Status: string }).Status).toBe('PAUSED');
      expect((job.raw as { Parameters: unknown }).Parameters).toEqual([
        { Name: '*Unpack:', Value: 'no' },
        { Name: '*Unpack:Password', Value: 'secret' },
        { Name: 'Notify.py:', Value: 'yes' },
      ]);

      const droneId = await client.append(
        'drone.nzb',
        Buffer.from(uniqueNzb('drone')).toString('base64'),
        {
          addPaused: true,
          ppParameters: [{ Name: 'drone', Value: 'drone-roundtrip' }],
        },
      );
      try {
        const groups = await client.listGroups();
        expect(groups.find(group => group.NZBID === droneId)?.Parameters).toContainEqual({
          Name: 'drone',
          Value: 'drone-roundtrip',
        });
        await expect(client.getQueueJob('drone-roundtrip')).resolves.toMatchObject({
          id: 'drone-roundtrip',
        });
      } finally {
        await client.editQueue('GroupFinalDelete', '', droneId);
      }
    } finally {
      await client.removeJob(id, true);
    }
  });

  it('accepts autoCategory before pp-parameters', async () => {
    const client = new Nzbget({ baseUrl, username, password });
    const id = await client.append('auto.nzb', Buffer.from(uniqueNzb('auto')).toString('base64'), {
      addPaused: true,
      autoCategory: true,
      ppParameters: [{ Name: 'drone', Value: 'drone-auto' }],
    });

    try {
      const groups = await client.listGroups();
      expect(groups.find(group => group.NZBID === id)?.Parameters).toContainEqual({
        Name: 'drone',
        Value: 'drone-auto',
      });
    } finally {
      await client.editQueue('GroupFinalDelete', '', id);
    }
  });

  it('returns the history item when a duplicate skips the queue', async () => {
    const client = new Nzbget({ baseUrl, username, password });
    const nzb = uniqueNzb('dupe');
    const original = await client.normalizedAddNzb({ file: nzb }, { startPaused: true });
    expect(original.state).toBe(UsenetJobState.paused);

    const duplicate = await client.normalizedAddNzb({ file: nzb }, { startPaused: true });
    expect(duplicate).toMatchObject({
      state: UsenetJobState.deleted,
      raw: { Status: 'DELETED/COPY' },
    });

    await expect(client.removeJob(original.id, true)).resolves.toBe(true);
    await expect(client.findJob(original.id)).resolves.toBeNull();
    await expect(client.removeJob(duplicate.id)).resolves.toBe(true);
    await expect(client.findJob(duplicate.id)).resolves.toBeNull();
  });

  it('normalizes a failed url fetch as an error', async () => {
    const client = new Nzbget({ baseUrl, username, password });
    const id = await client.addNzbUrl(missingNzbUrl);

    const historyJob = await waitForHistoryJob(client, id);
    expect(historyJob).toMatchObject({
      id,
      state: UsenetJobState.error,
      succeeded: false,
      isCompleted: false,
      raw: { Kind: 'URL', Status: 'FAILURE/FETCH', UrlStatus: 'FAILURE' },
    });

    await expect(client.removeJob(id, true)).resolves.toBe(true);
    await expect(client.findJob(id)).resolves.toBeNull();
  });

  it('moves groups before and after each other', async () => {
    const client = new Nzbget({ baseUrl, username, password });
    const first = await client.addNzbFile(uniqueNzb('move-a'), { startPaused: true });
    const second = await client.addNzbFile(uniqueNzb('move-b'), { startPaused: true });
    const position = async (id: string) => (await client.getQueueJob(id)).queuePosition;

    try {
      await expect(client.editQueue('GroupMoveBefore', Number(first), second)).resolves.toBe(true);
      expect(await position(second)).toBe((await position(first)) - 1);

      await expect(client.editQueue('GroupMoveAfter', Number(first), second)).resolves.toBe(true);
      expect(await position(second)).toBe((await position(first)) + 1);

      await expect(client.editQueue('GroupSortFiles', '', first)).resolves.toBe(true);
    } finally {
      await client.editQueue('GroupFinalDelete', '', [first, second]);
    }
  });

  it('rejects editqueue commands removed upstream', async () => {
    const client = new Nzbget({ baseUrl, username, password });
    const editQueue = client.editQueue.bind(client) as (
      command: string,
      parameter: string,
      ids: number[],
    ) => Promise<boolean>;

    for (const command of ['FileSetPriority', 'PostMoveOffset', 'PostMoveTop', 'PostMoveBottom']) {
      await expect(editQueue(command, '', [1])).rejects.toThrow('Invalid action');
    }
  });

  it('loads sysinfo and systemhealth', async () => {
    const client = new Nzbget({ baseUrl, username, password });

    await expect(client.sysInfo()).resolves.toMatchObject({
      OS: { Name: expect.any(String), Version: expect.any(String) },
      CPU: { Arch: expect.any(String) },
      Tools: expect.any(Array),
      Libraries: expect.any(Array),
    });

    const health = await client.systemHealth();
    expect(health.Alerts).toEqual(expect.any(Array));
    expect(health.Sections).toContainEqual(
      expect.objectContaining({
        Name: 'Paths',
        Issues: expect.any(Array),
        Options: expect.any(Array),
        Subsections: expect.any(Array),
      }),
    );
  });

  it('clears the log', async () => {
    const client = new Nzbget({ baseUrl, username, password });
    const marker = `clear-log-${Date.now()}`;

    await client.writeLog('INFO', marker);
    expect((await client.log(0, 1000)).some(entry => entry.Text === marker)).toBe(true);

    await expect(client.clearLog()).resolves.toBe(true);
    expect((await client.log(0, 1000)).some(entry => entry.Text === marker)).toBe(false);
  });

  it('resets server volume counters', async () => {
    const client = new Nzbget({ baseUrl, username, password });

    await expect(client.resetServerVolume(-1, 'CUSTOM')).resolves.toBe(true);
    await expect(client.resetServerVolume(0)).resolves.toBe(true);
  });

  it('loads and saves the config file', async () => {
    const client = new Nzbget({ baseUrl, username, password });
    const config = await client.loadConfig();

    expect(config).toContainEqual({ Name: 'ControlPort', Value: '6789' });
    await expect(client.saveConfig(config)).resolves.toBe(true);
    await expect(client.loadConfig()).resolves.toEqual(config);
  });
});
