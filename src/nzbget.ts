import {
  AddNzbOptions as NormalizedAddNzbOptions,
  AllClientData,
  Category,
  FoundUsenetJob,
  NormalizedUsenetHistoryItem,
  NormalizedUsenetJob,
  NzbInput,
  Script,
  UsenetClient,
  UsenetClientConfig,
  UsenetClientState,
  UsenetPriority,
  UsenetNotFoundError,
} from '@ctrl/shared-usenet';
import { ofetch } from 'ofetch';
import type { Jsonify } from 'type-fest';
import { joinURL } from 'ufo';
import { stringToBase64, stringToUint8Array, uint8ArrayToBase64 } from 'uint8array-extras';

import {
  configItemsToMap,
  deriveCategories,
  deriveScripts,
  getNzbgetHistoryItemId,
  getNzbgetQueueItemId,
  normalizeNzbgetHistoryItem,
  normalizeNzbgetJob,
  normalizeNzbgetStatus,
  normalizedAddOptionsToNzbget,
  normalizedPriorityToNzbget,
} from './normalizeUsenetData.js';
import type {
  JsonRpcResponse,
  NzbGetAddOptions,
  NzbGetConfigItem,
  NzbGetConfigTemplate,
  NzbGetEditQueueCommand,
  NzbGetEditQueueParameter,
  NzbGetFile,
  NzbGetHistoryItem,
  NzbGetLogEntry,
  NzbGetLogKind,
  NzbGetQueueItem,
  NzbGetServerVolume,
  NzbGetServerVolumeCounter,
  NzbGetSettings,
  NzbGetStatus,
  NzbGetSysInfo,
  NzbGetSystemHealth,
} from './types.js';

interface NzbgetState extends UsenetClientState {
  version?: {
    version: string;
  };
}

const defaults: UsenetClientConfig = {
  baseUrl: 'http://localhost:6789/',
  path: '/jsonrpc',
  username: 'nzbget',
  password: 'tegbzn6789',
  timeout: 5000,
};

function encodeBasicAuth(username: string, password: string): string {
  return stringToBase64(`${username}:${password}`);
}

function normalizeIds(ids: Array<number | string> | number | string): number[] {
  const values = Array.isArray(ids) ? ids : [ids];
  return values.map(value => Number.parseInt(`${value}`, 10)).filter(value => !Number.isNaN(value));
}

function toBase64(input: string | Uint8Array): string {
  return uint8ArrayToBase64(typeof input === 'string' ? stringToUint8Array(input) : input);
}

function findQueueItem(
  groups: NzbGetQueueItem[],
  id: string,
): { item: NzbGetQueueItem; index: number } | undefined {
  const index = groups.findIndex(
    item => getNzbgetQueueItemId(item) === id || `${item.NZBID}` === id,
  );
  const item = index === -1 ? undefined : groups[index];
  return item ? { item, index } : undefined;
}

function findHistoryItem(history: NzbGetHistoryItem[], id: string): NzbGetHistoryItem | undefined {
  return history.find(item => getNzbgetHistoryItemId(item) === id || `${item.NZBID}` === id);
}

async function sleep(milliseconds: number): Promise<void> {
  await new Promise<void>(resolve => {
    setTimeout(resolve, milliseconds);
  });
}

export class Nzbget implements UsenetClient {
  static createFromState(
    config: Readonly<UsenetClientConfig>,
    state: Readonly<Jsonify<NzbgetState>>,
  ): Nzbget {
    const client = new Nzbget(config);
    client.state = { ...state };
    return client;
  }

  config: UsenetClientConfig;
  state: NzbgetState = {};

  constructor(options: Partial<UsenetClientConfig> = {}) {
    this.config = { ...defaults, ...options };
  }

  exportState(): Jsonify<NzbgetState> {
    return JSON.parse(JSON.stringify(this.state));
  }

  /** Calls {@link https://nzbget.com/documentation/api/version/ | version}. */
  async getVersion(): Promise<string> {
    const version = await this.rpc<string>('version');
    this.state.version = { version };
    return version;
  }

  /** Calls {@link https://nzbget.com/documentation/api/shutdown/ | shutdown}. */
  async shutdown(): Promise<boolean> {
    return this.rpc<boolean>('shutdown');
  }

  /** Calls {@link https://nzbget.com/documentation/api/reload/ | reload}. */
  async reload(): Promise<boolean> {
    return this.rpc<boolean>('reload');
  }

  /** Calls {@link https://nzbget.com/documentation/api/status/ | status}. */
  async status(): Promise<NzbGetStatus> {
    return this.rpc<NzbGetStatus>('status');
  }

  /** Calls {@link https://nzbget.com/documentation/api/listgroups/ | listgroups}. */
  async listGroups(): Promise<NzbGetQueueItem[]> {
    return this.rpc<NzbGetQueueItem[]>('listgroups', [0]);
  }

  /** Calls {@link https://nzbget.com/documentation/api/history/ | history}. */
  async history(hidden = false): Promise<NzbGetHistoryItem[]> {
    return this.rpc<NzbGetHistoryItem[]>('history', [hidden]);
  }

  /** Calls {@link https://nzbget.com/documentation/api/config/ | config}. */
  async getConfig(): Promise<NzbGetSettings> {
    const items = await this.rpc<NzbGetConfigItem[]>('config');
    return configItemsToMap(items);
  }

  /** Calls {@link https://nzbget.com/documentation/api/configtemplates/ | configtemplates}. */
  async configTemplates(loadFromDisk = false): Promise<NzbGetConfigTemplate[]> {
    return this.rpc<NzbGetConfigTemplate[]>('configtemplates', [loadFromDisk]);
  }

  /** Calls {@link https://nzbget.com/documentation/api/listfiles/ | listfiles}. */
  async listFiles(id: number | string): Promise<NzbGetFile[]> {
    return this.rpc<NzbGetFile[]>('listfiles', [0, 0, Number.parseInt(`${id}`, 10)]);
  }

  /** Calls {@link https://nzbget.com/documentation/api/pausedownload/ | pausedownload}. */
  async pauseDownload(): Promise<boolean> {
    return this.rpc<boolean>('pausedownload');
  }

  /** Calls {@link https://nzbget.com/documentation/api/resumedownload/ | resumedownload}. */
  async resumeDownload(): Promise<boolean> {
    return this.rpc<boolean>('resumedownload');
  }

  /** Calls {@link https://nzbget.com/documentation/api/pausepost/ | pausepost}. */
  async pausePost(): Promise<boolean> {
    return this.rpc<boolean>('pausepost');
  }

  /** Calls {@link https://nzbget.com/documentation/api/resumepost/ | resumepost}. */
  async resumePost(): Promise<boolean> {
    return this.rpc<boolean>('resumepost');
  }

  /** Calls {@link https://nzbget.com/documentation/api/pausescan/ | pausescan}. */
  async pauseScan(): Promise<boolean> {
    return this.rpc<boolean>('pausescan');
  }

  /** Calls {@link https://nzbget.com/documentation/api/resumescan/ | resumescan}. */
  async resumeScan(): Promise<boolean> {
    return this.rpc<boolean>('resumescan');
  }

  /** Calls {@link https://nzbget.com/documentation/api/scheduleresume/ | scheduleresume}. */
  async scheduleResume(seconds: number): Promise<boolean> {
    return this.rpc<boolean>('scheduleresume', [seconds]);
  }

  /** Calls {@link https://nzbget.com/documentation/api/rate/ | rate}. */
  async setRate(limitBytesPerSecond: number): Promise<boolean> {
    return this.rpc<boolean>('rate', [limitBytesPerSecond]);
  }

  /**
   * Calls {@link https://nzbget.com/documentation/api/append/ | append}.
   *
   * NZBGet reads JSON-RPC params as a flat stream of values, so `ppParameters`
   * are sent as `[name, value, ...]`. Sending `{Name, Value}` objects would store
   * `Name=drone` and `Value=<id>` as two separate parameters.
   * @link https://github.com/nzbgetcom/nzbget/blob/develop/daemon/remote/XmlRpc.cpp (`DownloadXmlCommand::Execute`)
   */
  async append(
    name: string,
    contentOrUrl: string,
    options: NzbGetAddOptions = {},
  ): Promise<number> {
    const ppParameters = (options.ppParameters ?? []).flatMap(({ Name, Value }) => [
      Name,
      String(Value),
    ]);

    return this.rpc<number>('append', [
      name,
      contentOrUrl,
      options.category ?? '',
      options.priority ?? 0,
      options.addToTop ?? false,
      options.addPaused ?? false,
      options.dupeKey ?? '',
      options.dupeScore ?? 0,
      options.dupeMode ?? 'all',
      ...(options.autoCategory === undefined ? [] : [options.autoCategory]),
      ppParameters,
    ]);
  }

  /**
   * Calls {@link https://nzbget.com/documentation/api/editqueue/ | editqueue}
   * with the v18+ signature.
   */
  async editQueue<TCommand extends NzbGetEditQueueCommand>(
    command: TCommand,
    parameter: NzbGetEditQueueParameter<TCommand>,
    ids: Array<number | string> | number | string,
  ): Promise<boolean> {
    return this.rpc<boolean>('editqueue', [command, `${parameter}`, normalizeIds(ids)]);
  }

  /** Calls {@link https://nzbget.com/documentation/api/scan/ | scan}. */
  async scan(): Promise<boolean> {
    return this.rpc<boolean>('scan');
  }

  /** Calls {@link https://nzbget.com/documentation/api/log/ | log}. */
  async log(idFrom: number, numberOfEntries: number): Promise<NzbGetLogEntry[]> {
    return this.rpc<NzbGetLogEntry[]>('log', [idFrom, numberOfEntries]);
  }

  /** Calls {@link https://nzbget.com/documentation/api/writelog/ | writelog}. */
  async writeLog(kind: NzbGetLogKind, text: string): Promise<boolean> {
    return this.rpc<boolean>('writelog', [kind, text]);
  }

  /** Calls {@link https://nzbget.com/documentation/api/loadlog/ | loadlog}. */
  async loadLog(
    nzbId: number | string,
    idFrom: number,
    numberOfEntries: number,
  ): Promise<NzbGetLogEntry[]> {
    return this.rpc<NzbGetLogEntry[]>('loadlog', [
      Number.parseInt(`${nzbId}`, 10),
      idFrom,
      numberOfEntries,
    ]);
  }

  /** Calls {@link https://nzbget.com/documentation/api/servervolumes/ | servervolumes}. */
  async serverVolumes(): Promise<NzbGetServerVolume[]> {
    return this.rpc<NzbGetServerVolume[]>('servervolumes');
  }

  /**
   * Calls {@link https://nzbget.com/documentation/api/resetservervolume/ | resetservervolume}.
   *
   * @param serverId `ServerID` from {@link Nzbget.serverVolumes}, or `-1` for all servers.
   */
  async resetServerVolume(
    serverId: number,
    counter: NzbGetServerVolumeCounter = '',
  ): Promise<boolean> {
    return this.rpc<boolean>('resetservervolume', [serverId, counter]);
  }

  /**
   * Calls `clearlog`, which empties the in-memory log returned by {@link Nzbget.log}.
   * @link https://github.com/nzbgetcom/nzbget/blob/develop/daemon/remote/XmlRpc.cpp
   */
  async clearLog(): Promise<boolean> {
    return this.rpc<boolean>('clearlog');
  }

  /** Calls {@link https://nzbget.com/documentation/api/sysinfo/ | sysinfo} (v24.2+). */
  async sysInfo(): Promise<NzbGetSysInfo> {
    return this.rpc<NzbGetSysInfo>('sysinfo');
  }

  /**
   * Calls {@link https://nzbget.com/documentation/api/systemhealth/ | systemhealth} (v26.0+).
   * Marked experimental upstream.
   */
  async systemHealth(): Promise<NzbGetSystemHealth> {
    return this.rpc<NzbGetSystemHealth>('systemhealth');
  }

  /**
   * Calls {@link https://nzbget.com/documentation/api/loadconfig/ | loadconfig}.
   * Values are returned as stored in the file, e.g. `${MainDir}/dst`.
   */
  async loadConfig(): Promise<NzbGetConfigItem[]> {
    return this.rpc<NzbGetConfigItem[]>('loadconfig');
  }

  /**
   * Calls {@link https://nzbget.com/documentation/api/saveconfig/ | saveconfig}.
   *
   * Rewrites the config file with exactly these options; any option left out
   * is removed from the file. Start from {@link Nzbget.loadConfig} and call
   * {@link Nzbget.reload} to apply.
   */
  async saveConfig(items: NzbGetConfigItem[]): Promise<boolean> {
    return this.rpc<boolean>('saveconfig', [items]);
  }

  async getCategories(): Promise<Category[]> {
    return deriveCategories(await this.getConfig());
  }

  async getScripts(): Promise<Script[]> {
    return deriveScripts(await this.configTemplates());
  }

  async pauseQueue(): Promise<boolean> {
    return this.pauseDownload();
  }

  async resumeQueue(): Promise<boolean> {
    return this.resumeDownload();
  }

  async pauseJob(id: string): Promise<boolean> {
    return this.editQueueJob('GroupPause', '', id);
  }

  async resumeJob(id: string): Promise<boolean> {
    return this.editQueueJob('GroupResume', '', id);
  }

  /**
   * Deletes a queue job (`GroupDelete`, or `GroupFinalDelete` to skip history),
   * or a history item (`HistoryDelete` keeps a hidden record for duplicate
   * checks, `HistoryFinalDelete` removes it entirely).
   */
  async removeJob(id: string, removeData = false): Promise<boolean> {
    const queueMatch = findQueueItem(await this.listGroups(), id);
    if (queueMatch) {
      return this.editQueue(
        removeData ? 'GroupFinalDelete' : 'GroupDelete',
        '',
        queueMatch.item.NZBID,
      );
    }

    const historyItem = findHistoryItem(await this.history(), id);
    if (historyItem) {
      return this.editQueue(
        removeData ? 'HistoryFinalDelete' : 'HistoryDelete',
        '',
        historyItem.NZBID,
      );
    }

    throw new UsenetNotFoundError('nzbget', 'queueJob', id);
  }

  async moveJob(id: string, position: number): Promise<boolean> {
    const queue = await this.listGroups();
    const queueMatch = findQueueItem(queue, id);
    if (!queueMatch) {
      throw new UsenetNotFoundError('nzbget', 'queueJob', id);
    }

    if (!Number.isFinite(position)) {
      throw new TypeError('Invalid queue position');
    }

    if (position <= 0) {
      return this.editQueue('GroupMoveTop', '', queueMatch.item.NZBID);
    }

    if (position >= queue.length - 1) {
      return this.editQueue('GroupMoveBottom', '', queueMatch.item.NZBID);
    }

    const offset = position - queueMatch.index;
    if (offset === 0) {
      return true;
    }

    return this.editQueue('GroupMoveOffset', offset, queueMatch.item.NZBID);
  }

  async setCategory(id: string, category: string): Promise<boolean> {
    return this.editQueueJob('GroupApplyCategory', category, id);
  }

  async setPriority(id: string, priority: UsenetPriority): Promise<boolean> {
    return this.editQueueJob('GroupSetPriority', normalizedPriorityToNzbget(priority), id);
  }

  async addNzbFile(
    nzb: string | Uint8Array,
    options: Partial<NormalizedAddNzbOptions> = {},
  ): Promise<string> {
    const id = await this.append(
      options.name ?? 'upload.nzb',
      toBase64(nzb),
      normalizedAddOptionsToNzbget(options),
    );

    return `${id}`;
  }

  async addNzbUrl(url: string, options: Partial<NormalizedAddNzbOptions> = {}): Promise<string> {
    const id = await this.append(options.name ?? url, url, normalizedAddOptionsToNzbget(options));

    return `${id}`;
  }

  async getQueue(): Promise<NormalizedUsenetJob[]> {
    const [status, groups] = await Promise.all([this.status(), this.listGroups()]);
    return groups.map((item, index) => normalizeNzbgetJob(item, status, index));
  }

  async getHistory(): Promise<NormalizedUsenetHistoryItem[]> {
    const history = await this.history();
    return history.map(normalizeNzbgetHistoryItem);
  }

  async getQueueJob(id: string): Promise<NormalizedUsenetJob> {
    const [status, groups] = await Promise.all([this.status(), this.listGroups()]);
    const queueMatch = findQueueItem(groups, id);
    if (!queueMatch) {
      throw new UsenetNotFoundError('nzbget', 'queueJob', id);
    }

    return normalizeNzbgetJob(queueMatch.item, status, queueMatch.index);
  }

  async getHistoryJob(id: string): Promise<NormalizedUsenetHistoryItem> {
    const history = await this.history();
    const historyItem = findHistoryItem(history, id);
    if (!historyItem) {
      throw new UsenetNotFoundError('nzbget', 'historyJob', id);
    }

    return normalizeNzbgetHistoryItem(historyItem);
  }

  async findJob(id: string): Promise<FoundUsenetJob | null> {
    const [status, groups] = await Promise.all([this.status(), this.listGroups()]);
    const queueMatch = findQueueItem(groups, id);
    if (queueMatch) {
      return {
        source: 'queue',
        job: normalizeNzbgetJob(queueMatch.item, status, queueMatch.index),
      };
    }

    const history = await this.history();
    const historyItem = findHistoryItem(history, id);
    if (historyItem) {
      return {
        source: 'history',
        job: normalizeNzbgetHistoryItem(historyItem),
      };
    }

    return null;
  }

  async getAllData(): Promise<AllClientData> {
    const [status, groups, history, settings, scripts] = await Promise.all([
      this.status(),
      this.listGroups(),
      this.history(),
      this.getConfig(),
      this.getScripts(),
    ]);

    return {
      categories: deriveCategories(settings),
      scripts,
      queue: groups.map((item, index) => normalizeNzbgetJob(item, status, index)),
      history: history.map(normalizeNzbgetHistoryItem),
      status: normalizeNzbgetStatus(status, settings),
      raw: {
        status,
        groups,
        history,
      },
    };
  }

  async normalizedAddNzb(
    input: NzbInput,
    options: Partial<NormalizedAddNzbOptions> = {},
  ): Promise<NormalizedUsenetJob> {
    const id =
      'url' in input
        ? await this.addNzbUrl(input.url, options)
        : await this.addNzbFile(input.file, options);

    if (Number.parseInt(id, 10) <= 0) {
      throw new Error('NZBGet did not return a queue id');
    }

    // NZBGet can send a job straight to history, e.g. `DELETED/COPY` for duplicates.
    for (let attempt = 0; attempt < 10; attempt++) {
      const [status, groups] = await Promise.all([this.status(), this.listGroups()]);
      const queueMatch = findQueueItem(groups, id);
      if (queueMatch) {
        return normalizeNzbgetJob(queueMatch.item, status, queueMatch.index);
      }

      const historyItem = findHistoryItem(await this.history(), id);
      if (historyItem) {
        return normalizeNzbgetHistoryItem(historyItem);
      }

      await sleep(250);
    }

    throw new Error('Unable to load newly added NZBGet job');
  }

  private async rpc<T>(method: string, params: unknown[] = []): Promise<T> {
    const url = joinURL(this.config.baseUrl, this.config.path ?? '/jsonrpc');
    const username = this.config.username ?? '';
    const password = this.config.password ?? '';
    const headers =
      username || password
        ? {
            Authorization: `Basic ${encodeBasicAuth(username, password)}`,
          }
        : undefined;

    const response = await ofetch<JsonRpcResponse<T>>(url, {
      method: 'POST',
      headers,
      body: {
        jsonrpc: '2.0',
        method,
        params,
        id: Date.now(),
      },
      dispatcher: this.config.dispatcher,
      timeout: this.config.timeout,
    });

    if (response.error) {
      throw new Error(response.error.message);
    }

    return response.result;
  }

  private async editQueueJob<TCommand extends NzbGetEditQueueCommand>(
    command: TCommand,
    parameter: NzbGetEditQueueParameter<TCommand>,
    id: string,
  ): Promise<boolean> {
    const queue = await this.listGroups();
    const queueMatch = findQueueItem(queue, id);
    if (!queueMatch) {
      throw new UsenetNotFoundError('nzbget', 'queueJob', id);
    }

    return this.editQueue(command, parameter, queueMatch.item.NZBID);
  }
}
