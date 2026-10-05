import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, expectTypeOf, it } from 'vitest';

import {
  Nzbget,
  UsenetJobState,
  UsenetPostProcess,
  UsenetPriority,
  UsenetStateMessage,
  configItemsToMap,
  deriveCategories,
  deriveScripts,
  normalizeNzbgetHistoryItem,
  normalizeNzbgetJob,
  normalizeNzbgetStatus,
  normalizedAddOptionsToNzbget,
} from '../src/index.js';
import type {
  NzbGetConfigItem,
  NzbGetConfigTemplate,
  NzbGetDupeMode,
  NzbGetEditQueueCommand,
  NzbGetEditQueueParameter,
  NzbGetHistoryStatus,
  NzbGetHistoryItem,
  NzbGetMarkStatus,
  NzbGetDeleteStatus,
  NzbGetMoveStatus,
  NzbGetParStatus,
  NzbGetQueueStatus,
  NzbGetQueueItem,
  NzbGetSortParam,
  NzbGetScriptStatus,
  NzbGetStatus,
  NzbGetUnpackStatus,
} from '../src/types.js';

const __dirname = new URL('.', import.meta.url).pathname;

function readFixture<T>(filename: string): T {
  const filePath = path.join(__dirname, 'fixtures', filename);
  return JSON.parse(readFileSync(filePath, 'utf8')) as T;
}

describe('normalizeNzbgetStatus', () => {
  it('normalizes status output', () => {
    const status = normalizeNzbgetStatus(readFixture<NzbGetStatus>('status.json'));
    expect(status.speedBytesPerSecond).toBe(1024);
    expect(status.totalRemainingSize).toBe(512);
  });

  it('prefers the 64-bit download rate and fills post-processing and complete dir', () => {
    const raw: NzbGetStatus = {
      ...readFixture<NzbGetStatus>('status-26.3.json'),
      // 5 GiB/s, which overflows the deprecated int32 field
      DownloadRate: -1,
      DownloadRateLo: 1_073_741_824,
      DownloadRateHi: 1,
    };
    const status = normalizeNzbgetStatus(raw, { MainDir: '/config', DestDir: '${MainDir}/done' });

    expect(status.speedBytesPerSecond).toBe(5_368_709_120);
    expect(status.isPostProcessingPaused).toBe(true);
    expect(status.completeDir).toBe('/config/done');
  });
});

describe('normalizeNzbgetJob', () => {
  const status = readFixture<NzbGetStatus>('status.json');
  const queue = readFixture<NzbGetQueueItem[]>('queue.json');

  it('normalizes queue items', () => {
    const job = normalizeNzbgetJob(queue[0]!, status, 0);

    expect(job.id).toBe('23');
    expect(job.category).toBe('movies');
    expect(job.progress).toBe(50);
    expect(job.stateMessage).toBe('Downloading');
    expect(job.downloadSpeed).toBe(1024);
    expect(job.isCompleted).toBe(false);
  });

  it('normalizes url items being fetched as grabbing', () => {
    const [fetching] = readFixture<NzbGetQueueItem[]>('queue-26.3-url-fetching.json');
    const job = normalizeNzbgetJob(fetching!, status, 0);

    expect(job).toMatchObject({
      id: 'fetching-1',
      state: UsenetJobState.grabbing,
      stateMessage: UsenetStateMessage.grabbing,
      isCompleted: false,
      progress: 0,
      downloadSpeed: 0,
    });
  });

  it('maps post-processing and queue-script statuses', () => {
    for (const itemStatus of ['PP_QUEUED', 'UNPACKING', 'POST_UNPACK_RENAMING', 'QS_EXECUTING']) {
      const job = normalizeNzbgetJob(
        { ...queue[0]!, Status: itemStatus, ActiveDownloads: 0 },
        status,
        0,
      );
      expect(job.state).toBe(UsenetJobState.postProcessing);
      expect(job.isCompleted).toBe(true);
    }
  });

  it('uses Status for paused instead of comparing sizes', () => {
    const paused = normalizeNzbgetJob(
      { ...queue[0]!, Status: 'PAUSED', ActiveDownloads: 0, PausedSizeLo: 1024 },
      status,
      0,
    );
    expect(paused.state).toBe(UsenetJobState.paused);
    expect(paused.progress).toBe(50);

    const draining = normalizeNzbgetJob({ ...queue[0]!, PausedSizeLo: 1024 }, status, 0);
    expect(draining.state).toBe(UsenetJobState.paused);
    expect(draining.downloadSpeed).toBe(0);

    const parsOnly = normalizeNzbgetJob(
      { ...queue[0]!, Status: 'PP_QUEUED', ActiveDownloads: 0, PausedSizeLo: 1024 },
      status,
      0,
    );
    expect(parsOnly.state).toBe(UsenetJobState.postProcessing);
    expect(parsOnly.progress).toBe(100);

    const queued = normalizeNzbgetJob(
      { ...queue[0]!, Status: 'QUEUED', ActiveDownloads: 0 },
      status,
      0,
    );
    expect(queued.state).toBe(UsenetJobState.queued);

    const globallyPaused = normalizeNzbgetJob(
      { ...queue[0]!, Status: 'QUEUED', ActiveDownloads: 0 },
      { ...status, DownloadPaused: true },
      0,
    );
    expect(globallyPaused.state).toBe(UsenetJobState.paused);
  });

  it('leaves paused par files out of progress and eta', () => {
    // 2048 total, 1024 remaining of which 512 are paused extra pars
    const job = normalizeNzbgetJob({ ...queue[0]!, PausedSizeLo: 512 }, status, 0);

    expect(job.progress).toBeCloseTo(66.67, 1);
    expect(job.eta).toBe(1);
    expect(job.remainingSize).toBe(1024);
    expect(job.pausedSize).toBe(512);

    const globallyPaused = normalizeNzbgetJob(
      { ...queue[0]!, Status: 'QUEUED', ActiveDownloads: 0, PausedSizeLo: 512 },
      { ...status, DownloadPaused: true },
      0,
    );
    expect(globallyPaused.state).toBe(UsenetJobState.paused);
    expect(globallyPaused.progress).toBeCloseTo(66.67, 1);
  });

  it('uses MaxPriority', () => {
    const job = normalizeNzbgetJob({ ...queue[0]!, MinPriority: 0, MaxPriority: 100 }, status, 0);
    expect(job.priority).toBe(UsenetPriority.veryHigh);
  });
});

describe('normalizeNzbgetHistoryItem', () => {
  it('normalizes history items', () => {
    const history = readFixture<NzbGetHistoryItem[]>('history.json');
    const [completed, failed] = history.map(normalizeNzbgetHistoryItem);

    expect(completed?.succeeded).toBe(true);
    expect(completed?.stateMessage).toBe('Completed');
    expect(failed?.succeeded).toBe(false);
    expect(failed?.stateMessage).toBe('Failed');
    expect(failed?.failureMessage).toContain('par=FAILURE');
  });

  it('classifies real url fetch failures and duplicates', () => {
    const history = readFixture<NzbGetHistoryItem[]>('history-26.3.json');
    const [urlFailure, duplicate] = history.map(normalizeNzbgetHistoryItem);

    expect(urlFailure).toMatchObject({
      id: 'url-failure-1',
      state: UsenetJobState.error,
      stateMessage: UsenetStateMessage.failed,
      succeeded: false,
      isCompleted: false,
      failureMessage: 'status=FAILURE/FETCH, url=FAILURE',
    });
    expect(duplicate).toMatchObject({
      state: UsenetJobState.deleted,
      stateMessage: UsenetStateMessage.deleted,
      succeeded: false,
    });
    expect(duplicate?.failureMessage).toContain('delete=COPY');
  });

  it('classifies by the Status prefix', () => {
    const [item] = readFixture<NzbGetHistoryItem[]>('history.json');
    const classify = (Status: string) => normalizeNzbgetHistoryItem({ ...item!, Status }).state;

    expect(classify('SUCCESS/HEALTH')).toBe(UsenetJobState.completed);
    expect(classify('WARNING/SCRIPT')).toBe(UsenetJobState.warning);
    expect(classify('DELETED/MANUAL')).toBe(UsenetJobState.deleted);
    expect(classify('FAILURE/HEALTH')).toBe(UsenetJobState.error);
  });
});

describe('normalizedAddOptionsToNzbget', () => {
  it('maps shared add options to append arguments', () => {
    expect(
      normalizedAddOptionsToNzbget({
        category: 'tv',
        priority: UsenetPriority.paused,
        password: 'secret',
        postProcessScript: 'Notify.py',
        postProcess: UsenetPostProcess.none,
      }),
    ).toEqual({
      category: 'tv',
      priority: 0,
      addPaused: true,
      ppParameters: [
        { Name: '*Unpack:', Value: 'no' },
        { Name: '*Unpack:Password', Value: 'secret' },
        { Name: 'Notify.py:', Value: 'yes' },
      ],
    });

    expect(normalizedAddOptionsToNzbget({})).toEqual({
      category: '',
      priority: 0,
      addPaused: false,
      ppParameters: [],
    });
  });
});

describe('deriveCategories and deriveScripts', () => {
  it('derives categories and scripts from config data', () => {
    const configItems = readFixture<NzbGetConfigItem[]>('config.json');
    const templates = readFixture<NzbGetConfigTemplate[]>('configtemplates.json');
    const config = configItemsToMap(configItems);
    const categories = deriveCategories(config);
    const scripts = deriveScripts(templates);

    expect(categories[0]?.path).toContain('/downloads/complete/movies');
    expect(scripts[0]?.id).toBe('Notify.py');
  });
});

describe('lookup helpers', () => {
  it('types editQueue commands and parameters', () => {
    expectTypeOf<NzbGetEditQueueCommand>().toEqualTypeOf<
      | 'FileSetPriority'
      | 'PostMoveOffset'
      | 'PostMoveTop'
      | 'PostMoveBottom'
      | 'FileMoveOffset'
      | 'FileMoveTop'
      | 'FileMoveBottom'
      | 'FilePause'
      | 'FileResume'
      | 'FileDelete'
      | 'FilePauseAllPars'
      | 'FilePauseExtraPars'
      | 'FileReorder'
      | 'FileSplit'
      | 'GroupPause'
      | 'GroupResume'
      | 'GroupDelete'
      | 'GroupParkDelete'
      | 'GroupDupeDelete'
      | 'GroupFinalDelete'
      | 'GroupPauseAllPars'
      | 'GroupPauseExtraPars'
      | 'GroupMoveTop'
      | 'GroupMoveBottom'
      | 'GroupMoveOffset'
      | 'GroupMoveBefore'
      | 'GroupMoveAfter'
      | 'GroupSetCategory'
      | 'GroupApplyCategory'
      | 'GroupSetPriority'
      | 'GroupMerge'
      | 'GroupSetParameter'
      | 'GroupSetName'
      | 'GroupSetDupeKey'
      | 'GroupSetDupeScore'
      | 'GroupSetDupeMode'
      | 'GroupSort'
      | 'GroupSortFiles'
      | 'PostDelete'
      | 'HistoryDelete'
      | 'HistoryFinalDelete'
      | 'HistoryReturn'
      | 'HistoryProcess'
      | 'HistoryRedownload'
      | 'HistoryRetryFailed'
      | 'HistorySetName'
      | 'HistorySetCategory'
      | 'HistorySetParameter'
      | 'HistorySetDupeKey'
      | 'HistorySetDupeScore'
      | 'HistorySetDupeMode'
      | 'HistorySetDupeBackup'
      | 'HistoryMarkBad'
      | 'HistoryMarkGood'
      | 'HistoryMarkSuccess'
    >();
    expectTypeOf<NzbGetEditQueueParameter<'FileMoveOffset'>>().toEqualTypeOf<
      number | `${number}`
    >();
    expectTypeOf<NzbGetEditQueueParameter<'FilePause'>>().toEqualTypeOf<''>();
    expectTypeOf<NzbGetEditQueueParameter<'GroupPause'>>().toEqualTypeOf<''>();
    expectTypeOf<NzbGetEditQueueParameter<'GroupMoveOffset'>>().toEqualTypeOf<
      number | `${number}`
    >();
    expectTypeOf<NzbGetEditQueueParameter<'GroupSetCategory'>>().toEqualTypeOf<string>();
    expectTypeOf<NzbGetEditQueueParameter<'GroupApplyCategory'>>().toEqualTypeOf<string>();
    expectTypeOf<NzbGetEditQueueParameter<'GroupSetPriority'>>().toEqualTypeOf<number>();
    expectTypeOf<
      NzbGetEditQueueParameter<'GroupSetParameter'>
    >().toEqualTypeOf<`${string}=${string}`>();
    expectTypeOf<NzbGetEditQueueParameter<'GroupSetDupeMode'>>().toEqualTypeOf<NzbGetDupeMode>();
    expectTypeOf<NzbGetEditQueueParameter<'GroupSort'>>().toEqualTypeOf<NzbGetSortParam>();
    expectTypeOf<NzbGetEditQueueParameter<'HistorySetDupeBackup'>>().toEqualTypeOf<
      '0' | '1' | 0 | 1
    >();
    expectTypeOf<NzbGetEditQueueParameter<'HistoryMarkBad'>>().toEqualTypeOf<''>();
  });

  it('types documented history status fields', () => {
    expectTypeOf<NzbGetDupeMode>()
      .extract<'SCORE' | 'ALL' | 'FORCE'>()
      .toEqualTypeOf<'SCORE' | 'ALL' | 'FORCE'>();
    expectTypeOf<NzbGetParStatus>()
      .extract<'NONE' | 'FAILURE' | 'REPAIR_POSSIBLE' | 'SUCCESS' | 'MANUAL'>()
      .toEqualTypeOf<'NONE' | 'FAILURE' | 'REPAIR_POSSIBLE' | 'SUCCESS' | 'MANUAL'>();
    expectTypeOf<NzbGetUnpackStatus>()
      .extract<'NONE' | 'FAILURE' | 'SPACE' | 'PASSWORD' | 'SUCCESS'>()
      .toEqualTypeOf<'NONE' | 'FAILURE' | 'SPACE' | 'PASSWORD' | 'SUCCESS'>();
    expectTypeOf<NzbGetMoveStatus>()
      .extract<'NONE' | 'SUCCESS' | 'FAILURE'>()
      .toEqualTypeOf<'NONE' | 'SUCCESS' | 'FAILURE'>();
    expectTypeOf<NzbGetScriptStatus>()
      .extract<'NONE' | 'FAILURE' | 'SUCCESS'>()
      .toEqualTypeOf<'NONE' | 'FAILURE' | 'SUCCESS'>();
    expectTypeOf<NzbGetDeleteStatus>()
      .extract<'NONE' | 'MANUAL' | 'HEALTH' | 'DUPE' | 'BAD' | 'SCAN' | 'COPY'>()
      .toEqualTypeOf<'NONE' | 'MANUAL' | 'HEALTH' | 'DUPE' | 'BAD' | 'SCAN' | 'COPY'>();
    expectTypeOf<NzbGetMarkStatus>()
      .extract<'NONE' | 'GOOD' | 'BAD'>()
      .toEqualTypeOf<'NONE' | 'GOOD' | 'BAD'>();
    expectTypeOf<NzbGetHistoryStatus>()
      .extract<
        | 'SUCCESS/ALL'
        | 'SUCCESS/UNPACK'
        | 'SUCCESS/PAR'
        | 'SUCCESS/HEALTH'
        | 'SUCCESS/GOOD'
        | 'SUCCESS/MARK'
        | 'WARNING/SCRIPT'
        | 'WARNING/SPACE'
        | 'WARNING/PASSWORD'
        | 'WARNING/DAMAGED'
        | 'WARNING/REPAIRABLE'
        | 'WARNING/HEALTH'
        | 'WARNING/SKIPPED'
        | 'DELETED/MANUAL'
        | 'DELETED/DUPE'
        | 'DELETED/COPY'
        | 'DELETED/GOOD'
        | 'FAILURE/PAR'
        | 'FAILURE/UNPACK'
        | 'FAILURE/MOVE'
        | 'FAILURE/SCAN'
        | 'FAILURE/BAD'
        | 'FAILURE/HEALTH'
        | 'FAILURE/FETCH'
        | 'SUCCESS/HIDDEN'
        | 'FAILURE/HIDDEN'
        | 'FAILURE/INTERNAL_ERROR'
      >()
      .toEqualTypeOf<
        | 'SUCCESS/ALL'
        | 'SUCCESS/UNPACK'
        | 'SUCCESS/PAR'
        | 'SUCCESS/HEALTH'
        | 'SUCCESS/GOOD'
        | 'SUCCESS/MARK'
        | 'WARNING/SCRIPT'
        | 'WARNING/SPACE'
        | 'WARNING/PASSWORD'
        | 'WARNING/DAMAGED'
        | 'WARNING/REPAIRABLE'
        | 'WARNING/HEALTH'
        | 'WARNING/SKIPPED'
        | 'DELETED/MANUAL'
        | 'DELETED/DUPE'
        | 'DELETED/COPY'
        | 'DELETED/GOOD'
        | 'FAILURE/PAR'
        | 'FAILURE/UNPACK'
        | 'FAILURE/MOVE'
        | 'FAILURE/SCAN'
        | 'FAILURE/BAD'
        | 'FAILURE/HEALTH'
        | 'FAILURE/FETCH'
        | 'SUCCESS/HIDDEN'
        | 'FAILURE/HIDDEN'
        | 'FAILURE/INTERNAL_ERROR'
      >();
    expectTypeOf<NzbGetQueueStatus>()
      .extract<
        | 'QUEUED'
        | 'PAUSED'
        | 'DOWNLOADING'
        | 'FETCHING'
        | 'PP_QUEUED'
        | 'LOADING_PARS'
        | 'VERIFYING_SOURCES'
        | 'REPAIRING'
        | 'VERIFYING_REPAIRED'
        | 'RENAMING'
        | 'UNPACKING'
        | 'MOVING'
        | 'POST_UNPACK_RENAMING'
        | 'EXECUTING_SCRIPT'
        | 'PP_FINISHED'
        | 'POST_DOWNLOAD_RENAMING'
        | 'QS_QUEUED'
        | 'QS_EXECUTING'
      >()
      .toEqualTypeOf<
        | 'QUEUED'
        | 'PAUSED'
        | 'DOWNLOADING'
        | 'FETCHING'
        | 'PP_QUEUED'
        | 'LOADING_PARS'
        | 'VERIFYING_SOURCES'
        | 'REPAIRING'
        | 'VERIFYING_REPAIRED'
        | 'RENAMING'
        | 'UNPACKING'
        | 'MOVING'
        | 'POST_UNPACK_RENAMING'
        | 'EXECUTING_SCRIPT'
        | 'PP_FINISHED'
        | 'POST_DOWNLOAD_RENAMING'
        | 'QS_QUEUED'
        | 'QS_EXECUTING'
      >();
  });
  it('finds queue and history jobs explicitly', async () => {
    const client = new Nzbget();
    const status = readFixture<NzbGetStatus>('status.json');
    const queue = readFixture<NzbGetQueueItem[]>('queue.json');
    const history = readFixture<NzbGetHistoryItem[]>('history.json');
    const queueWithDroneId: NzbGetQueueItem[] = [
      {
        ...queue[0]!,
        Parameters: [{ Name: 'drone', Value: 'drone-queue-23' }],
      },
    ];
    const historyWithDroneId: NzbGetHistoryItem[] = [
      {
        ...history[0]!,
        Parameters: [{ Name: 'drone', Value: 'drone-history-41' }],
      },
    ];

    client.status = async () => status;
    client.listGroups = async () => queueWithDroneId;
    client.history = async () => historyWithDroneId;

    const queueJob = await client.getQueueJob('23');
    expect(queueJob.name).toBe('movie.release');
    expect(queueJob.id).toBe('drone-queue-23');

    const historyJob = await client.getHistoryJob('41');
    expect(historyJob.name).toBe('completed.release');
    expect(historyJob.id).toBe('drone-history-41');

    const normalizedQueueJob = await client.getQueueJob('drone-queue-23');
    expect(normalizedQueueJob.name).toBe('movie.release');

    const normalizedHistoryJob = await client.getHistoryJob('drone-history-41');
    expect(normalizedHistoryJob.name).toBe('completed.release');

    const foundQueue = await client.findJob('23');
    expect(foundQueue?.source).toBe('queue');
    expect(foundQueue?.job.id).toBe('drone-queue-23');

    const foundHistory = await client.findJob('41');
    expect(foundHistory?.source).toBe('history');
    expect(foundHistory?.job.id).toBe('drone-history-41');

    const foundNormalizedQueue = await client.findJob('drone-queue-23');
    expect(foundNormalizedQueue?.source).toBe('queue');

    const foundNormalizedHistory = await client.findJob('drone-history-41');
    expect(foundNormalizedHistory?.source).toBe('history');

    await expect(client.getQueueJob('999')).rejects.toMatchObject({
      name: 'UsenetNotFoundError',
      code: 'USENET_NOT_FOUND',
      client: 'nzbget',
      target: 'queueJob',
      id: '999',
    });

    await expect(client.getHistoryJob('999')).rejects.toMatchObject({
      name: 'UsenetNotFoundError',
      code: 'USENET_NOT_FOUND',
      client: 'nzbget',
      target: 'historyJob',
      id: '999',
    });

    const missing = await client.findJob('999');
    expect(missing).toBeNull();
  });

  it('returns a normalized queue id from add helpers', async () => {
    const client = new Nzbget();

    client.append = async (_name, _contentOrUrl, options) => (options?.addPaused ? 41 : 23);

    await expect(client.addNzbFile('<nzb />', { startPaused: true })).resolves.toBe('41');
    await expect(client.addNzbUrl('https://example.test/test.nzb')).resolves.toBe('23');
  });

  it('sends pp-parameters flat and only sends autoCategory when set', async () => {
    const client = new Nzbget();
    const calls: unknown[][] = [];
    const transport = client as unknown as {
      rpc: <T>(method: string, params?: unknown[]) => Promise<T>;
    };
    transport.rpc = async <T>(_method: string, params: unknown[] = []): Promise<T> => {
      calls.push(params);
      return 1 as T;
    };

    const ppParameters = [
      { Name: 'drone', Value: 'abc' },
      { Name: '*Unpack:', Value: 'no' },
    ];
    await client.append('a.nzb', 'content', { ppParameters });
    await client.append('a.nzb', 'content', { ppParameters, autoCategory: true });

    expect(calls).toEqual([
      ['a.nzb', 'content', '', 0, false, false, '', 0, 'all', ['drone', 'abc', '*Unpack:', 'no']],
      [
        'a.nzb',
        'content',
        '',
        0,
        false,
        false,
        '',
        0,
        'all',
        true,
        ['drone', 'abc', '*Unpack:', 'no'],
      ],
    ]);
  });

  it('does not resend editqueue with the pre-v18 signature on failure', async () => {
    const client = new Nzbget();
    const calls: unknown[][] = [];
    const transport = client as unknown as {
      rpc: <T>(method: string, params?: unknown[]) => Promise<T>;
    };
    transport.rpc = async (_method: string, params: unknown[] = []) => {
      calls.push(params);
      throw new Error('timeout');
    };

    await expect(client.editQueue('GroupPause', '', 23)).rejects.toThrow('timeout');
    expect(calls).toEqual([['GroupPause', '', [23]]]);
  });

  it('removes history items when the job is not in the queue', async () => {
    const client = new Nzbget();
    const history = readFixture<NzbGetHistoryItem[]>('history.json');
    const editCalls: Array<{ command: string; ids: unknown }> = [];

    client.listGroups = async () => [];
    client.history = async () => history;
    client.editQueue = async (command, _parameter, ids) => {
      editCalls.push({ command, ids });
      return true;
    };

    await expect(client.removeJob('41')).resolves.toBe(true);
    await expect(client.removeJob('42', true)).resolves.toBe(true);
    await expect(client.removeJob('999')).rejects.toMatchObject({
      name: 'UsenetNotFoundError',
      id: '999',
    });
    expect(editCalls).toEqual([
      { command: 'HistoryDelete', ids: 41 },
      { command: 'HistoryFinalDelete', ids: 42 },
    ]);
  });

  it('falls back to history when a new job skips the queue', async () => {
    const client = new Nzbget();
    const [, duplicate] = readFixture<NzbGetHistoryItem[]>('history-26.3.json');

    client.append = async () => duplicate!.NZBID;
    client.status = async () => readFixture<NzbGetStatus>('status-26.3.json');
    client.listGroups = async () => [];
    client.history = async () => [duplicate!];

    await expect(client.normalizedAddNzb({ file: '<nzb />' })).resolves.toMatchObject({
      id: `${duplicate!.NZBID}`,
      state: UsenetJobState.deleted,
    });
  });

  it('throws the shared not-found error from moveJob when the queue item is missing', async () => {
    const client = new Nzbget();

    client.listGroups = async () => [];

    await expect(client.moveJob('999', 0)).rejects.toMatchObject({
      name: 'UsenetNotFoundError',
      code: 'USENET_NOT_FOUND',
      client: 'nzbget',
      target: 'queueJob',
      id: '999',
    });
  });

  it('uses raw queue ids for normalized queue edit methods', async () => {
    const client = new Nzbget();
    const queue = readFixture<NzbGetQueueItem[]>('queue.json');
    const editCalls: Array<{
      command: NzbGetEditQueueCommand;
      parameter: unknown;
      ids: Array<number | string> | number | string;
    }> = [];

    client.listGroups = async () => [
      {
        ...queue[0]!,
        Parameters: [{ Name: 'drone', Value: 'drone-queue-23' }],
      },
    ];
    client.editQueue = async <TCommand extends NzbGetEditQueueCommand>(
      command: TCommand,
      parameter: NzbGetEditQueueParameter<TCommand>,
      ids: Array<number | string> | number | string,
    ): Promise<boolean> => {
      editCalls.push({ command, parameter, ids });
      return true;
    };

    await expect(client.pauseJob('drone-queue-23')).resolves.toBe(true);
    await expect(client.resumeJob('drone-queue-23')).resolves.toBe(true);
    await expect(client.removeJob('drone-queue-23')).resolves.toBe(true);
    await expect(client.setCategory('drone-queue-23', 'movies')).resolves.toBe(true);
    await expect(client.setPriority('drone-queue-23', UsenetPriority.veryHigh)).resolves.toBe(true);
    await expect(client.moveJob('drone-queue-23', 0)).resolves.toBe(true);

    expect(editCalls).toEqual([
      { command: 'GroupPause', parameter: '', ids: 23 },
      { command: 'GroupResume', parameter: '', ids: 23 },
      { command: 'GroupDelete', parameter: '', ids: 23 },
      { command: 'GroupApplyCategory', parameter: 'movies', ids: 23 },
      { command: 'GroupSetPriority', parameter: 100, ids: 23 },
      { command: 'GroupMoveTop', parameter: '', ids: 23 },
    ]);
  });

  it('calls native control pause and logging rpc methods', async () => {
    const client = new Nzbget();
    const calls: Array<{ method: string; params: unknown[] }> = [];
    const transport = client as unknown as {
      rpc: <T>(method: string, params?: unknown[]) => Promise<T>;
    };

    // Verify the wrapper forwards the correct RPC method names.
    transport.rpc = async <T>(method: string, params: unknown[] = []): Promise<T> => {
      calls.push({ method, params });
      if (['log', 'loadlog', 'servervolumes', 'loadconfig'].includes(method)) {
        return [] as T;
      }

      return true as T;
    };

    await expect(client.shutdown()).resolves.toBe(true);
    await expect(client.reload()).resolves.toBe(true);
    await expect(client.scan()).resolves.toBe(true);
    await expect(client.pausePost()).resolves.toBe(true);
    await expect(client.resumePost()).resolves.toBe(true);
    await expect(client.pauseScan()).resolves.toBe(true);
    await expect(client.resumeScan()).resolves.toBe(true);
    await expect(client.scheduleResume(30)).resolves.toBe(true);
    await expect(client.log(10, 0)).resolves.toEqual(expect.any(Array));
    await expect(client.writeLog('INFO', 'hello')).resolves.toBe(true);
    await expect(client.loadLog(23, 10, 0)).resolves.toEqual(expect.any(Array));
    await expect(client.serverVolumes()).resolves.toEqual(expect.any(Array));
    await expect(client.resetServerVolume(-1)).resolves.toBe(true);
    await expect(client.resetServerVolume(1, 'CUSTOM')).resolves.toBe(true);
    await expect(client.clearLog()).resolves.toBe(true);
    await expect(client.loadConfig()).resolves.toEqual([]);
    await expect(client.saveConfig([{ Name: 'MainDir', Value: '/config' }])).resolves.toBe(true);
    expect(calls).toEqual([
      { method: 'shutdown', params: [] },
      { method: 'reload', params: [] },
      { method: 'scan', params: [] },
      { method: 'pausepost', params: [] },
      { method: 'resumepost', params: [] },
      { method: 'pausescan', params: [] },
      { method: 'resumescan', params: [] },
      { method: 'scheduleresume', params: [30] },
      { method: 'log', params: [10, 0] },
      { method: 'writelog', params: ['INFO', 'hello'] },
      { method: 'loadlog', params: [23, 10, 0] },
      { method: 'servervolumes', params: [] },
      { method: 'resetservervolume', params: [-1, ''] },
      { method: 'resetservervolume', params: [1, 'CUSTOM'] },
      { method: 'clearlog', params: [] },
      { method: 'loadconfig', params: [] },
      { method: 'saveconfig', params: [[{ Name: 'MainDir', Value: '/config' }]] },
    ]);
  });
});
