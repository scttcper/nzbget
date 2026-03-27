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
  normalizeNzbgetHistoryItem,
  normalizeNzbgetJob,
  normalizeNzbgetStatus,
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
  NzbGetSettings,
  NzbGetStatus,
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

  /** Calls {@link https://nzbget-ng.github.io/api/version | version}. */
  async getVersion(): Promise<string> {
    const version = await this.rpc<string>('version');
    this.state.version = { version };
    return version;
  }

  /** Calls {@link https://nzbget-ng.github.io/api/shutdown | shutdown}. */
  async shutdown(): Promise<boolean> {
    return this.rpc<boolean>('shutdown');
  }

  /** Calls {@link https://nzbget-ng.github.io/api/reload | reload}. */
  async reload(): Promise<boolean> {
    return this.rpc<boolean>('reload');
  }

  /** Calls {@link https://nzbget-ng.github.io/api/status | status}. */
  async status(): Promise<NzbGetStatus> {
    return this.rpc<NzbGetStatus>('status');
  }

  /** Calls {@link https://nzbget-ng.github.io/api/listgroups | listgroups}. */
  async listGroups(): Promise<NzbGetQueueItem[]> {
    return this.rpc<NzbGetQueueItem[]>('listgroups', [0]);
  }

  /** Calls {@link https://nzbget-ng.github.io/api/history | history}. */
  async history(hidden = false): Promise<NzbGetHistoryItem[]> {
    return this.rpc<NzbGetHistoryItem[]>('history', [hidden]);
  }

  /** Calls {@link https://nzbget-ng.github.io/api/config | config}. */
  async getConfig(): Promise<NzbGetSettings> {
    const items = await this.rpc<NzbGetConfigItem[]>('config');
    return configItemsToMap(items);
  }

  /** Calls {@link https://nzbget-ng.github.io/api/configtemplates | configtemplates}. */
  async configTemplates(loadFromDisk = false): Promise<NzbGetConfigTemplate[]> {
    return this.rpc<NzbGetConfigTemplate[]>('configtemplates', [loadFromDisk]);
  }

  /** Calls {@link https://nzbget-ng.github.io/api/listfiles | listfiles}. */
  async listFiles(id: number | string): Promise<NzbGetFile[]> {
    return this.rpc<NzbGetFile[]>('listfiles', [0, 0, Number.parseInt(`${id}`, 10)]);
  }

  /** Calls {@link https://nzbget-ng.github.io/api/pausedownload | pausedownload}. */
  async pauseDownload(): Promise<boolean> {
    return this.rpc<boolean>('pausedownload');
  }

  /** Calls {@link https://nzbget-ng.github.io/api/resumedownload | resumedownload}. */
  async resumeDownload(): Promise<boolean> {
    return this.rpc<boolean>('resumedownload');
  }

  /** Calls {@link https://nzbget-ng.github.io/api/pausepost | pausepost}. */
  async pausePost(): Promise<boolean> {
    return this.rpc<boolean>('pausepost');
  }

  /** Calls {@link https://nzbget-ng.github.io/api/resumepost | resumepost}. */
  async resumePost(): Promise<boolean> {
    return this.rpc<boolean>('resumepost');
  }

  /** Calls {@link https://nzbget-ng.github.io/api/pausescan | pausescan}. */
  async pauseScan(): Promise<boolean> {
    return this.rpc<boolean>('pausescan');
  }

  /** Calls {@link https://nzbget-ng.github.io/api/resumescan | resumescan}. */
  async resumeScan(): Promise<boolean> {
    return this.rpc<boolean>('resumescan');
  }

  /** Calls {@link https://nzbget-ng.github.io/api/scheduleresume | scheduleresume}. */
  async scheduleResume(seconds: number): Promise<boolean> {
    return this.rpc<boolean>('scheduleresume', [seconds]);
  }

  /** Calls {@link https://nzbget-ng.github.io/api/rate | rate}. */
  async setRate(limitBytesPerSecond: number): Promise<boolean> {
    return this.rpc<boolean>('rate', [limitBytesPerSecond]);
  }

  /** Calls {@link https://nzbget-ng.github.io/api/append | append}. */
  async append(
    name: string,
    contentOrUrl: string,
    options: NzbGetAddOptions = {},
  ): Promise<number> {
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
      options.ppParameters ?? [],
    ]);
  }

  /** Calls {@link https://nzbget-ng.github.io/api/editqueue | editqueue}. */
  async editQueue<TCommand extends NzbGetEditQueueCommand>(
    command: TCommand,
    parameter: NzbGetEditQueueParameter<TCommand>,
    ids: Array<number | string> | number | string,
  ): Promise<boolean> {
    const normalizedIds = normalizeIds(ids);

    try {
      return await this.rpc<boolean>('editqueue', [command, `${parameter}`, normalizedIds]);
    } catch {
      return this.rpc<boolean>('editqueue', [command, 0, `${parameter}`, normalizedIds]);
    }
  }

  /** Calls {@link https://nzbget-ng.github.io/api/scan | scan}. */
  async scan(): Promise<boolean> {
    return this.rpc<boolean>('scan');
  }

  /** Calls {@link https://nzbget-ng.github.io/api/log | log}. */
  async log(idFrom: number, numberOfEntries: number): Promise<NzbGetLogEntry[]> {
    return this.rpc<NzbGetLogEntry[]>('log', [idFrom, numberOfEntries]);
  }

  /** Calls {@link https://nzbget-ng.github.io/api/writelog | writelog}. */
  async writeLog(kind: NzbGetLogKind, text: string): Promise<boolean> {
    return this.rpc<boolean>('writelog', [kind, text]);
  }

  /** Calls {@link https://nzbget-ng.github.io/api/loadlog | loadlog}. */
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

  /** Calls {@link https://nzbget-ng.github.io/api/servervolumes | servervolumes}. */
  async serverVolumes(): Promise<NzbGetServerVolume[]> {
    return this.rpc<NzbGetServerVolume[]>('servervolumes');
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
    return this.editQueue('GroupPause', '', id);
  }

  async resumeJob(id: string): Promise<boolean> {
    return this.editQueue('GroupResume', '', id);
  }

  async removeJob(id: string, removeData = false): Promise<boolean> {
    return this.editQueue(removeData ? 'GroupFinalDelete' : 'GroupDelete', '', id);
  }

  async moveJob(id: string, position: number): Promise<boolean> {
    const queue = await this.listGroups();
    const rawId = Number.parseInt(id, 10);
    const currentIndex = queue.findIndex(item => item.NZBID === rawId);
    if (currentIndex === -1) {
      throw new UsenetNotFoundError('nzbget', 'queueJob', id);
    }

    if (!Number.isFinite(position)) {
      throw new TypeError('Invalid queue position');
    }

    if (position <= 0) {
      return this.editQueue('GroupMoveTop', '', id);
    }

    if (position >= queue.length - 1) {
      return this.editQueue('GroupMoveBottom', '', id);
    }

    const offset = position - currentIndex;
    if (offset === 0) {
      return true;
    }

    return this.editQueue('GroupMoveOffset', offset, id);
  }

  async setCategory(id: string, category: string): Promise<boolean> {
    return this.editQueue('GroupApplyCategory', category, id);
  }

  async setPriority(id: string, priority: UsenetPriority): Promise<boolean> {
    return this.editQueue('GroupSetPriority', normalizedPriorityToNzbget(priority), id);
  }

  async addNzbFile(
    nzb: string | Uint8Array,
    options: Partial<NormalizedAddNzbOptions> = {},
  ): Promise<string> {
    const id = await this.append(options.name ?? 'upload.nzb', toBase64(nzb), {
      category: options.category ?? '',
      priority: normalizedPriorityToNzbget(options.priority),
      addPaused: options.startPaused ?? false,
    });

    return `${id}`;
  }

  async addNzbUrl(url: string, options: Partial<NormalizedAddNzbOptions> = {}): Promise<string> {
    const id = await this.append(options.name ?? url, url, {
      category: options.category ?? '',
      priority: normalizedPriorityToNzbget(options.priority),
      addPaused: options.startPaused ?? false,
    });

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
    const rawId = Number.parseInt(id, 10);
    const [status, groups] = await Promise.all([this.status(), this.listGroups()]);
    const index = groups.findIndex(group => group.NZBID === rawId);
    const group = index === -1 ? undefined : groups[index];
    if (!group) {
      throw new UsenetNotFoundError('nzbget', 'queueJob', id);
    }

    return normalizeNzbgetJob(group, status, index);
  }

  async getHistoryJob(id: string): Promise<NormalizedUsenetHistoryItem> {
    const rawId = Number.parseInt(id, 10);
    const history = await this.history();
    const historyItem = history.find(item => item.ID === rawId);
    if (!historyItem) {
      throw new UsenetNotFoundError('nzbget', 'historyJob', id);
    }

    return normalizeNzbgetHistoryItem(historyItem);
  }

  async findJob(id: string): Promise<FoundUsenetJob | null> {
    const rawId = Number.parseInt(id, 10);
    const [status, groups] = await Promise.all([this.status(), this.listGroups()]);
    const index = groups.findIndex(group => group.NZBID === rawId);
    const group = index === -1 ? undefined : groups[index];
    if (group) {
      return {
        source: 'queue',
        job: normalizeNzbgetJob(group, status, index),
      };
    }

    const history = await this.history();
    const historyItem = history.find(item => item.ID === rawId);
    if (historyItem) {
      return {
        source: 'history',
        job: normalizeNzbgetHistoryItem(historyItem),
      };
    }

    return null;
  }

  async getAllData(): Promise<AllClientData> {
    const [status, groups, history, categories, scripts] = await Promise.all([
      this.status(),
      this.listGroups(),
      this.history(),
      this.getCategories(),
      this.getScripts(),
    ]);

    return {
      categories,
      scripts,
      queue: groups.map((item, index) => normalizeNzbgetJob(item, status, index)),
      history: history.map(normalizeNzbgetHistoryItem),
      status: normalizeNzbgetStatus(status),
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
    const rawId = Number.parseInt(id, 10);

    if (rawId <= 0) {
      throw new Error('NZBGet did not return a queue id');
    }

    for (let attempt = 0; attempt < 10; attempt++) {
      const [status, groups] = await Promise.all([this.status(), this.listGroups()]);
      const index = groups.findIndex(group => group.NZBID === rawId);
      const group = index === -1 ? undefined : groups[index];
      if (group) {
        return normalizeNzbgetJob(group, status, index);
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
}
