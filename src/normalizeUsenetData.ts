import {
  type Category,
  type NormalizedUsenetHistoryItem,
  type NormalizedUsenetJob,
  type NormalizedUsenetStatus,
  type Script,
  UsenetJobState,
  UsenetPriority,
  UsenetStateMessage,
} from '@ctrl/shared-usenet';

import type {
  NzbGetConfigItem,
  NzbGetSettings,
  NzbGetConfigTemplate,
  NzbGetHistoryItem,
  NzbGetQueueItem,
  NzbGetStatus,
} from './types.js';

const SUCCESS_STATUSES = new Set(['SUCCESS', 'NONE']);
const DELETE_FAILED_STATUSES = new Set(['HEALTH', 'DUPE', 'SCAN', 'COPY', 'BAD']);

export function combineInt64(high: number | undefined, low: number | undefined): number {
  return Number(BigInt(high ?? 0) * 4_294_967_296n + BigInt(low ?? 0));
}

function getParameterValue(
  parameters: Array<{ Name: string; Value: unknown }> | undefined,
  name: string,
): string | undefined {
  const match = parameters?.find(parameter => parameter.Name === name);
  return typeof match?.Value === 'string' ? match.Value : undefined;
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

function buildHistoryMessage(item: NzbGetHistoryItem): string {
  return [
    `par=${item.ParStatus}`,
    `unpack=${item.UnpackStatus}`,
    `move=${item.MoveStatus}`,
    `script=${item.ScriptStatus}`,
    `delete=${item.DeleteStatus}`,
    `mark=${item.MarkStatus}`,
  ].join(', ');
}

export function normalizeNzbgetStatus(status: NzbGetStatus): NormalizedUsenetStatus {
  return {
    isDownloadPaused: status.DownloadPaused,
    speedBytesPerSecond: status.DownloadRate,
    speedLimitBytesPerSecond: status.DownloadLimit,
    totalRemainingSize: combineInt64(status.RemainingSizeHi, status.RemainingSizeLo),
    totalDownloadedSize: combineInt64(status.DownloadedSizeHi, status.DownloadedSizeLo),
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
  const activeId = getParameterValue(item.Parameters, 'drone') ?? `${item.NZBID}`;
  const averagePriority = Math.round((item.MinPriority + item.MaxPriority) / 2);
  const progress = totalSize === 0 ? 0 : ((totalSize - remainingSize) / totalSize) * 100;

  let state = UsenetJobState.downloading;
  let stateMessage = UsenetStateMessage.downloading;

  if (globalStatus.DownloadPaused || (remainingSize === pausedSize && remainingSize !== 0)) {
    state = UsenetJobState.paused;
    stateMessage = UsenetStateMessage.paused;
  } else if (remainingSize === 0) {
    state = UsenetJobState.postProcessing;
    stateMessage = UsenetStateMessage.postProcessing;
  } else if (item.ActiveDownloads === 0) {
    state = UsenetJobState.queued;
    stateMessage = UsenetStateMessage.queued;
  }

  return {
    id: activeId,
    name: item.NZBName,
    progress,
    isCompleted: remainingSize === 0,
    category: item.Category,
    priority: nzbgetPriorityToNormalized(averagePriority),
    state,
    stateMessage,
    downloadSpeed: state === UsenetJobState.downloading ? globalStatus.DownloadRate : 0,
    eta:
      state === UsenetJobState.downloading && globalStatus.DownloadRate > 0
        ? Math.ceil(remainingSize / globalStatus.DownloadRate)
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
  const activeId = getParameterValue(item.Parameters, 'drone') ?? `${item.ID}`;
  const failureMessage = buildHistoryMessage(item);
  let state = UsenetJobState.completed;
  let stateMessage = UsenetStateMessage.completed;
  let succeeded = true;

  if (item.DeleteStatus === 'MANUAL') {
    state = item.MarkStatus === 'BAD' ? UsenetJobState.error : UsenetJobState.deleted;
    stateMessage =
      item.MarkStatus === 'BAD' ? UsenetStateMessage.failed : UsenetStateMessage.deleted;
    succeeded = false;
  }

  if (!SUCCESS_STATUSES.has(item.ParStatus)) {
    state = UsenetJobState.error;
    stateMessage = UsenetStateMessage.failed;
    succeeded = false;
  }

  if (item.UnpackStatus === 'SPACE') {
    state = UsenetJobState.warning;
    stateMessage = UsenetStateMessage.warning;
    succeeded = false;
  } else if (!SUCCESS_STATUSES.has(item.UnpackStatus)) {
    state = UsenetJobState.error;
    stateMessage = UsenetStateMessage.failed;
    succeeded = false;
  }

  if (!SUCCESS_STATUSES.has(item.MoveStatus)) {
    state = UsenetJobState.warning;
    stateMessage = UsenetStateMessage.warning;
    succeeded = false;
  }

  if (!SUCCESS_STATUSES.has(item.ScriptStatus)) {
    state = UsenetJobState.error;
    stateMessage = UsenetStateMessage.failed;
    succeeded = false;
  }

  if (
    item.DeleteStatus &&
    !SUCCESS_STATUSES.has(item.DeleteStatus) &&
    item.DeleteStatus !== 'MANUAL'
  ) {
    state = DELETE_FAILED_STATUSES.has(item.DeleteStatus)
      ? UsenetJobState.error
      : UsenetJobState.warning;
    stateMessage =
      state === UsenetJobState.error ? UsenetStateMessage.failed : UsenetStateMessage.warning;
    succeeded = false;
  }

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

export function deriveCategories(configMap: NzbGetSettings): Category[] {
  const categories: Category[] = [];

  for (let index = 1; index < 100; index++) {
    const name = configMap[`Category${index}.Name`];
    if (!name) {
      break;
    }

    let path = configMap[`Category${index}.DestDir`];
    if (!path) {
      const mainDir = configMap.MainDir ?? '';
      path = (configMap.DestDir ?? '').replace('${MainDir}', mainDir);
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
