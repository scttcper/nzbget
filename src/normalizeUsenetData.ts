import {
  type AddNzbOptions,
  type Category,
  type NormalizedUsenetHistoryItem,
  type NormalizedUsenetJob,
  type NormalizedUsenetStatus,
  type Script,
  UsenetJobState,
  UsenetPostProcess,
  UsenetPriority,
  UsenetStateMessage,
} from '@ctrl/shared-usenet';

import type {
  NzbGetAddOptions,
  NzbGetConfigItem,
  NzbGetParameter,
  NzbGetSettings,
  NzbGetConfigTemplate,
  NzbGetHistoryItem,
  NzbGetQueueItem,
  NzbGetStatus,
} from './types.js';

interface NormalizedJobState {
  state: UsenetJobState;
  stateMessage: UsenetStateMessage;
}

interface NormalizedHistoryState extends NormalizedJobState {
  succeeded: boolean;
}

export function combineInt64(high: number | undefined, low: number | undefined): number {
  return Number(BigInt(high ?? 0) * 4_294_967_296n + BigInt(low ?? 0));
}

/**
 * Prefers the 64-bit `*Lo`/`*Hi` pair (v24.2+) over the deprecated int32 field.
 */
function combineRate(high: number | undefined, low: number | undefined, legacy: number): number {
  return low === undefined ? legacy : combineInt64(high, low);
}

export function getNzbgetDownloadRate(status: NzbGetStatus): number {
  return combineRate(status.DownloadRateHi, status.DownloadRateLo, status.DownloadRate);
}

export function getNzbgetAverageDownloadRate(status: NzbGetStatus): number {
  return combineRate(
    status.AverageDownloadRateHi,
    status.AverageDownloadRateLo,
    status.AverageDownloadRate,
  );
}

export function getNzbgetParameterValue(
  parameters: Array<{ Name: string; Value: unknown }> | undefined,
  name: string,
): string | undefined {
  const value = parameters?.find(parameter => parameter.Name === name)?.Value;
  return value === undefined ? undefined : String(value);
}

export function getNzbgetQueueItemId(item: NzbGetQueueItem): string {
  return getNzbgetParameterValue(item.Parameters, 'drone') ?? `${item.NZBID}`;
}

export function getNzbgetHistoryItemId(item: NzbGetHistoryItem): string {
  return getNzbgetParameterValue(item.Parameters, 'drone') ?? `${item.NZBID}`;
}

export function nzbgetPriorityToNormalized(priority: number): UsenetPriority {
  switch (priority) {
    case -100: {
      return UsenetPriority.veryLow;
    }
    case -50: {
      return UsenetPriority.low;
    }
    case 0: {
      return UsenetPriority.normal;
    }
    case 50: {
      return UsenetPriority.high;
    }
    case 100: {
      return UsenetPriority.veryHigh;
    }
    case 900: {
      return UsenetPriority.force;
    }
    default: {
      return UsenetPriority.normal;
    }
  }
}

export function normalizedPriorityToNzbget(priority: UsenetPriority | undefined): number {
  switch (priority) {
    case UsenetPriority.veryLow: {
      return -100;
    }
    case UsenetPriority.low: {
      return -50;
    }
    case UsenetPriority.high: {
      return 50;
    }
    case UsenetPriority.veryHigh: {
      return 100;
    }
    case UsenetPriority.force: {
      return 900;
    }
    case UsenetPriority.paused: {
      return 0;
    }
    case UsenetPriority.normal:
    case UsenetPriority.default:
    default: {
      return 0;
    }
  }
}

/**
 * Maps the shared add options onto `append` arguments and pp-parameters.
 *
 * `*Unpack:` and `*Unpack:Password` are NZBGet's built-in per-job parameters
 * and `<script>:` = `yes` enables a post-processing script for the job.
 *
 * @link https://nzbget.com/documentation/api/append/
 */
export function normalizedAddOptionsToNzbget(options: Partial<AddNzbOptions>): NzbGetAddOptions {
  const ppParameters: NzbGetParameter[] = [];

  switch (options.postProcess) {
    case UsenetPostProcess.none:
    case UsenetPostProcess.repair: {
      ppParameters.push({ Name: '*Unpack:', Value: 'no' });
      break;
    }
    case UsenetPostProcess.repairUnpack:
    case UsenetPostProcess.repairUnpackDelete: {
      ppParameters.push({ Name: '*Unpack:', Value: 'yes' });
      break;
    }
    default: {
      break;
    }
  }

  if (options.password) {
    ppParameters.push({ Name: '*Unpack:Password', Value: options.password });
  }

  if (options.postProcessScript) {
    ppParameters.push({ Name: `${options.postProcessScript}:`, Value: 'yes' });
  }

  return {
    category: options.category ?? '',
    priority: normalizedPriorityToNzbget(options.priority),
    addPaused: options.startPaused === true || options.priority === UsenetPriority.paused,
    ppParameters,
  };
}

function buildHistoryMessage(item: NzbGetHistoryItem): string {
  const details =
    item.Kind === 'URL'
      ? [`url=${item.UrlStatus}`]
      : [
          `par=${item.ParStatus}`,
          `unpack=${item.UnpackStatus}`,
          `move=${item.MoveStatus}`,
          `script=${item.ScriptStatus}`,
          `delete=${item.DeleteStatus}`,
          `mark=${item.MarkStatus}`,
        ];
  return [`status=${item.Status}`, ...details].join(', ');
}

/**
 * Classifies by the `Status` prefix, which NZBGet derives from all of the
 * individual par/unpack/url/delete/mark fields.
 *
 * @link https://nzbget.com/documentation/api/history/
 * @link https://github.com/nzbgetcom/nzbget/blob/develop/daemon/queue/DownloadInfo.cpp (`NzbInfo::MakeTextStatus`)
 */
function classifyNzbgetHistoryItem(item: NzbGetHistoryItem): NormalizedHistoryState {
  const [kind] = item.Status.split('/');

  switch (kind) {
    case 'SUCCESS': {
      return {
        state: UsenetJobState.completed,
        stateMessage: UsenetStateMessage.completed,
        succeeded: true,
      };
    }
    case 'WARNING': {
      return {
        state: UsenetJobState.warning,
        stateMessage: UsenetStateMessage.warning,
        succeeded: false,
      };
    }
    case 'DELETED': {
      return {
        state: UsenetJobState.deleted,
        stateMessage: UsenetStateMessage.deleted,
        succeeded: false,
      };
    }
    case 'FAILURE': {
      return {
        state: UsenetJobState.error,
        stateMessage: UsenetStateMessage.failed,
        succeeded: false,
      };
    }
    default: {
      return {
        state: UsenetJobState.unknown,
        stateMessage: UsenetStateMessage.unknown,
        succeeded: false,
      };
    }
  }
}

/**
 * Maps the listgroups `Status` field.
 *
 * @link https://nzbget.com/documentation/api/listgroups/
 * @link https://github.com/nzbgetcom/nzbget/blob/develop/daemon/remote/XmlRpc.cpp (`ListGroupsXmlCommand::DetectStatus`)
 */
function classifyNzbgetQueueItem(
  item: NzbGetQueueItem,
  globalStatus: NzbGetStatus,
): NormalizedJobState {
  switch (item.Status) {
    case 'QUEUED': {
      return globalStatus.DownloadPaused
        ? { state: UsenetJobState.paused, stateMessage: UsenetStateMessage.paused }
        : { state: UsenetJobState.queued, stateMessage: UsenetStateMessage.queued };
    }
    case 'PAUSED': {
      return { state: UsenetJobState.paused, stateMessage: UsenetStateMessage.paused };
    }
    case 'DOWNLOADING': {
      // NZBGet checks ActiveDownloads before paused sizes, so a paused group
      // stays DOWNLOADING while in-flight articles drain (or keep retrying).
      const pausedSize = combineInt64(item.PausedSizeHi, item.PausedSizeLo);
      return pausedSize > 0 &&
        pausedSize === combineInt64(item.RemainingSizeHi, item.RemainingSizeLo)
        ? { state: UsenetJobState.paused, stateMessage: UsenetStateMessage.paused }
        : { state: UsenetJobState.downloading, stateMessage: UsenetStateMessage.downloading };
    }
    case 'FETCHING': {
      return { state: UsenetJobState.grabbing, stateMessage: UsenetStateMessage.grabbing };
    }
    case 'PP_QUEUED':
    case 'QS_QUEUED':
    case 'QS_EXECUTING':
    case 'LOADING_PARS':
    case 'VERIFYING_SOURCES':
    case 'REPAIRING':
    case 'VERIFYING_REPAIRED':
    case 'RENAMING':
    case 'UNPACKING':
    case 'MOVING':
    case 'POST_UNPACK_RENAMING':
    case 'EXECUTING_SCRIPT':
    case 'PP_FINISHED':
    case 'POST_DOWNLOAD_RENAMING': {
      return {
        state: UsenetJobState.postProcessing,
        stateMessage: UsenetStateMessage.postProcessing,
      };
    }
    default: {
      return { state: UsenetJobState.unknown, stateMessage: UsenetStateMessage.unknown };
    }
  }
}

export function normalizeNzbgetStatus(
  status: NzbGetStatus,
  settings?: Partial<NzbGetSettings>,
): NormalizedUsenetStatus {
  return {
    isDownloadPaused: status.DownloadPaused,
    isPostProcessingPaused: status.PostPaused,
    speedBytesPerSecond: getNzbgetDownloadRate(status),
    speedLimitBytesPerSecond: status.DownloadLimit,
    totalRemainingSize: combineInt64(status.RemainingSizeHi, status.RemainingSizeLo),
    totalDownloadedSize: combineInt64(status.DownloadedSizeHi, status.DownloadedSizeLo),
    completeDir: settings?.DestDir ? resolveMainDir(settings.DestDir, settings) : undefined,
    raw: status,
  };
}

export function normalizeNzbgetJob(
  item: NzbGetQueueItem,
  globalStatus: NzbGetStatus,
  queuePosition: number,
): NormalizedUsenetJob {
  const totalSize = combineInt64(item.FileSizeHi, item.FileSizeLo);
  const remainingSize = combineInt64(item.RemainingSizeHi, item.RemainingSizeLo);
  const pausedSize = combineInt64(item.PausedSizeHi, item.PausedSizeLo);
  const activeId = getNzbgetQueueItemId(item);
  const { state, stateMessage } = classifyNzbgetQueueItem(item, globalStatus);
  const downloadRate = getNzbgetDownloadRate(globalStatus);
  // Paused files (usually extra par2 files) are skipped, so leave them out
  // like the web UI does, unless the whole group is paused.
  // https://github.com/nzbgetcom/nzbget/blob/develop/webui/downloads.js (`buildProgress`)
  const isGroupPaused = state === UsenetJobState.paused && pausedSize === remainingSize;
  const skippedSize = isGroupPaused ? 0 : pausedSize;
  const wantedSize = totalSize - skippedSize;
  const wantedRemaining = remainingSize - skippedSize;
  const progress = wantedSize <= 0 ? 0 : ((wantedSize - wantedRemaining) / wantedSize) * 100;

  return {
    id: activeId,
    name: item.NZBName,
    progress,
    isCompleted: state === UsenetJobState.postProcessing,
    category: item.Category,
    priority: nzbgetPriorityToNormalized(item.MaxPriority),
    state,
    stateMessage,
    downloadSpeed: state === UsenetJobState.downloading ? downloadRate : 0,
    eta:
      state === UsenetJobState.downloading && downloadRate > 0
        ? Math.ceil(wantedRemaining / downloadRate)
        : 0,
    queuePosition,
    totalSize,
    remainingSize,
    pausedSize,
    raw: item,
  };
}

export function normalizeNzbgetHistoryItem(item: NzbGetHistoryItem): NormalizedUsenetHistoryItem {
  const totalSize = combineInt64(item.FileSizeHi, item.FileSizeLo);
  const activeId = getNzbgetHistoryItemId(item);
  const failureMessage = buildHistoryMessage(item);
  const { state, stateMessage, succeeded } = classifyNzbgetHistoryItem(item);

  return {
    id: activeId,
    name: item.Name,
    progress: succeeded ? 100 : 0,
    isCompleted: succeeded,
    category: item.Category,
    priority: undefined,
    state,
    stateMessage,
    downloadSpeed: 0,
    eta: 0,
    queuePosition: -1,
    totalSize,
    remainingSize: 0,
    savePath: item.FinalDir || item.DestDir,
    dateCompleted: item.HistoryTime ? new Date(item.HistoryTime * 1000).toISOString() : undefined,
    failureMessage: succeeded ? undefined : failureMessage,
    storagePath: item.FinalDir || item.DestDir,
    succeeded,
    raw: item,
  };
}

export function configItemsToMap(items: NzbGetConfigItem[]): NzbGetSettings {
  return Object.fromEntries(items.map(item => [item.Name, item.Value])) as NzbGetSettings;
}

function resolveMainDir(path: string, configMap: Partial<NzbGetSettings>): string {
  return path.replace('${MainDir}', configMap.MainDir ?? '');
}

export function deriveCategories(configMap: NzbGetSettings): Category[] {
  const categories: Category[] = [];

  for (let index = 1; index < 100; index++) {
    const name = configMap[`Category${index}.Name`];
    if (!name) {
      break;
    }

    let path = configMap[`Category${index}.DestDir`];
    if (!path) {
      path = resolveMainDir(configMap.DestDir ?? '', configMap);
      if ((configMap.AppendCategoryDir ?? 'yes') === 'yes') {
        path = path ? `${path.replace(/\/$/, '')}/${name}` : name;
      }
    }

    categories.push({
      id: name,
      name,
      path,
    });
  }

  return categories;
}

export function deriveScripts(templates: NzbGetConfigTemplate[]): Script[] {
  return templates
    .filter(template => template.PostScript === true)
    .map(template => ({
      id: template.Name,
      name: template.DisplayName ?? template.Name,
    }));
}
