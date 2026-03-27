import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, expectTypeOf, it } from 'vitest';

import {
  Nzbget,
  configItemsToMap,
  deriveCategories,
  deriveScripts,
  normalizeNzbgetHistoryItem,
  normalizeNzbgetJob,
  normalizeNzbgetStatus,
} from '../src/index.js';
import type {
  NzbGetConfigItem,
  NzbGetConfigTemplate,
  NzbGetFile,
  NzbGetDupeMode,
  NzbGetEditQueueCommand,
  NzbGetEditQueueParameter,
  NzbGetHistoryStatus,
  NzbGetHistoryItem,
  NzbGetNewsServerStatus,
  NzbGetMarkStatus,
  NzbGetDeleteStatus,
  NzbGetMoveStatus,
  NzbGetAddOptions,
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

  it('types documented status fields', () => {
    expectTypeOf<NzbGetStatus['RemainingSizeMB']>().toEqualTypeOf<number | undefined>();
    expectTypeOf<NzbGetStatus['ForcedSizeLo']>().toEqualTypeOf<number | undefined>();
    expectTypeOf<NzbGetStatus['ArticleCacheMB']>().toEqualTypeOf<number | undefined>();
    expectTypeOf<NzbGetStatus['ThreadCount']>().toEqualTypeOf<number | undefined>();
    expectTypeOf<NzbGetStatus['ServerStandBy']>().toEqualTypeOf<boolean | undefined>();
    expectTypeOf<NzbGetStatus['FeedActive']>().toEqualTypeOf<boolean | undefined>();
    expectTypeOf<NzbGetStatus['NewsServers']>().toEqualTypeOf<
      NzbGetNewsServerStatus[] | undefined
    >();
  });
});

describe('normalizeNzbgetJob', () => {
  it('normalizes queue items', () => {
    const status = readFixture<NzbGetStatus>('status.json');
    const queue = readFixture<NzbGetQueueItem[]>('queue.json');
    const job = normalizeNzbgetJob(queue[0]!, status, 0);

    expect(job.id).toBe('23');
    expect(job.category).toBe('movies');
    expect(job.progress).toBe(50);
    expect(job.stateMessage).toBe('Downloading');
    expect(job.downloadSpeed).toBe(1024);
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
});

describe('deriveCategories and deriveScripts', () => {
  it('derives categories and scripts from config data', () => {
    const configItems = readFixture<NzbGetConfigItem[]>('config.json');
    const templates = readFixture<NzbGetConfigTemplate[]>('configtemplates.json');
    const config = configItemsToMap(configItems);
    const categories = deriveCategories(config);
    const scripts = deriveScripts(templates);

    expectTypeOf(config.MainDir).toBeString();
    expectTypeOf(config['Category1.Name']).toEqualTypeOf<string | undefined>();
    expect(categories[0]?.path).toContain('/downloads/complete/movies');
    expect(scripts[0]?.id).toBe('Notify.py');
  });
});

describe('lookup helpers', () => {
  it('types editQueue commands and parameters', () => {
    expectTypeOf<NzbGetEditQueueCommand>().toMatchTypeOf<
      | 'FileMoveOffset'
      | 'FileMoveTop'
      | 'FileMoveBottom'
      | 'FilePause'
      | 'FileResume'
      | 'FileDelete'
      | 'FilePauseAllPars'
      | 'FilePauseExtraPars'
      | 'FileSetPriority'
      | 'FileReorder'
      | 'FileSplit'
      | 'GroupPause'
      | 'GroupResume'
      | 'GroupDelete'
      | 'GroupDupeDelete'
      | 'GroupFinalDelete'
      | 'GroupPauseAllPars'
      | 'GroupPauseExtraPars'
      | 'GroupMoveTop'
      | 'GroupMoveBottom'
      | 'GroupMoveOffset'
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
      | 'PostMoveOffset'
      | 'PostMoveTop'
      | 'PostMoveBottom'
      | 'PostDelete'
      | 'HistoryDelete'
      | 'HistoryFinalDelete'
      | 'HistoryReturn'
      | 'HistoryProcess'
      | 'HistoryRedownload'
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
    expectTypeOf<NzbGetDupeMode>().toMatchTypeOf<'SCORE' | 'ALL' | 'FORCE'>();
    expectTypeOf<NzbGetParStatus>().toMatchTypeOf<
      'NONE' | 'FAILURE' | 'REPAIR_POSSIBLE' | 'SUCCESS' | 'MANUAL'
    >();
    expectTypeOf<NzbGetUnpackStatus>().toMatchTypeOf<
      'NONE' | 'FAILURE' | 'SPACE' | 'PASSWORD' | 'SUCCESS'
    >();
    expectTypeOf<NzbGetMoveStatus>().toMatchTypeOf<'NONE' | 'SUCCESS' | 'FAILURE'>();
    expectTypeOf<NzbGetScriptStatus>().toMatchTypeOf<'NONE' | 'FAILURE' | 'SUCCESS'>();
    expectTypeOf<NzbGetDeleteStatus>().toMatchTypeOf<
      'NONE' | 'MANUAL' | 'HEALTH' | 'DUPE' | 'BAD' | 'SCAN' | 'COPY'
    >();
    expectTypeOf<NzbGetMarkStatus>().toMatchTypeOf<'NONE' | 'GOOD' | 'BAD'>();
    expectTypeOf<NzbGetHistoryStatus>().toMatchTypeOf<
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
    >();
    expectTypeOf<NzbGetQueueStatus>().toMatchTypeOf<
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
      | 'EXECUTING_SCRIPT'
      | 'PP_FINISHED'
    >();
  });

  it('types append options from the documented api', () => {
    expectTypeOf<NzbGetAddOptions['dupeMode']>().toEqualTypeOf<NzbGetDupeMode | undefined>();
    expectTypeOf<NzbGetAddOptions['ppParameters']>().toEqualTypeOf<
      Array<{ Name: string; Value: unknown }> | undefined
    >();
  });

  it('types documented listfiles fields', () => {
    expectTypeOf<NzbGetFile['Priority']>().toEqualTypeOf<number | undefined>();
    expectTypeOf<NzbGetFile['Progress']>().toEqualTypeOf<number | undefined>();
    expectTypeOf<NzbGetFile['FilenameConfirmed']>().toEqualTypeOf<boolean | undefined>();
  });

  it('finds queue and history jobs explicitly', async () => {
    const client = new Nzbget();
    const status = readFixture<NzbGetStatus>('status.json');
    const queue = readFixture<NzbGetQueueItem[]>('queue.json');
    const history = readFixture<NzbGetHistoryItem[]>('history.json');

    client.status = async () => status;
    client.listGroups = async () => queue;
    client.history = async () => history;

    const queueJob = await client.getQueueJob('23');
    expect(queueJob.name).toBe('movie.release');

    const historyJob = await client.getHistoryJob('41');
    expect(historyJob.name).toBe('completed.release');

    const foundQueue = await client.findJob('23');
    expect(foundQueue?.source).toBe('queue');

    const foundHistory = await client.findJob('41');
    expect(foundHistory?.source).toBe('history');

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
});
