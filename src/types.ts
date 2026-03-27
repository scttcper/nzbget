export interface JsonRpcErrorModel {
  /** JSON-RPC error code. */
  code: number;
  /** Human-readable error message returned by NZBGet. */
  message: string;
  /** Optional server-provided error payload. */
  data?: unknown;
}

export interface JsonRpcResponse<T> {
  /** Request identifier echoed by the server. */
  id: number | string;
  /** JSON-RPC protocol version. */
  jsonrpc: '2.0';
  /** Successful result payload. */
  result: T;
  /** Optional error payload when the request fails. */
  error?: JsonRpcErrorModel | null;
}

/**
 * One config entry from {@link https://nzbget-ng.github.io/api/config | config}.
 */
export interface NzbGetParameter {
  /** Name of the parameter. */
  Name: string;
  /** Raw parameter value. */
  Value: unknown;
}

/**
 * Response from {@link https://nzbget-ng.github.io/api/status | status}.
 */
export interface NzbGetNewsServerStatus {
  /** Server number in the configuration file. */
  ID: number;
  /** True if the server is enabled for downloads. */
  Active: boolean;
}

export interface NzbGetStatus {
  /** Remaining queue size in bytes, low 32 bits of the 64-bit value. */
  RemainingSizeLo: number;
  /** Remaining queue size in bytes, high 32 bits of the 64-bit value. */
  RemainingSizeHi: number;
  /** Remaining queue size in megabytes. */
  RemainingSizeMB?: number;
  /** Remaining forced-priority size, low 32 bits. */
  ForcedSizeLo?: number;
  /** Remaining forced-priority size, high 32 bits. */
  ForcedSizeHi?: number;
  /** Remaining forced-priority size in megabytes. */
  ForcedSizeMB?: number;
  /** Amount downloaded since server start in bytes, low 32 bits. */
  DownloadedSizeLo: number;
  /** Amount downloaded since server start in bytes, high 32 bits. */
  DownloadedSizeHi: number;
  /** Amount downloaded since server start in megabytes. */
  DownloadedSizeMB?: number;
  /** Current article-cache usage, low 32 bits. */
  ArticleCacheLo?: number;
  /** Current article-cache usage, high 32 bits. */
  ArticleCacheHi?: number;
  /** Current article-cache usage in megabytes. */
  ArticleCacheMB?: number;
  /** Current download speed in bytes per second. */
  DownloadRate: number;
  /** Average download speed since server start in bytes per second. */
  AverageDownloadRate: number;
  /** Current download limit in bytes per second. */
  DownloadLimit: number;
  /** Number of running threads. */
  ThreadCount?: number;
  /** Number of jobs in post-processing queue. */
  PostJobCount?: number;
  /** Deprecated par job count. */
  ParJobCount?: number;
  /** Number of URLs in URL queue. */
  UrlCount?: number;
  /** Server uptime in seconds. */
  UpTimeSec?: number;
  /** Server download time in seconds. */
  DownloadTimeSec?: number;
  /** True when there are no active downloads. */
  ServerStandBy?: boolean;
  /** True if the download queue is soft-paused. */
  DownloadPaused: boolean;
  /** Deprecated second download pause flag. */
  Download2Paused?: boolean;
  /** Deprecated server pause flag. */
  ServerPaused?: boolean;
  /** True if post-processing queue is paused. */
  PostPaused?: boolean;
  /** True if scan queue is paused. */
  ScanPaused?: boolean;
  /** Current server time in Unix seconds. */
  ServerTime?: number;
  /** Scheduled resume time in Unix seconds. */
  ResumeTime?: number;
  /** True if any RSS feed is currently active. */
  FeedActive?: boolean;
  /** Free disk space, low 32 bits. */
  FreeDiskSpaceLo?: number;
  /** Free disk space, high 32 bits. */
  FreeDiskSpaceHi?: number;
  /** Free disk space in megabytes. */
  FreeDiskSpaceMB?: number;
  /** Per-server enabled/disabled state. */
  NewsServers?: NzbGetNewsServerStatus[];
  [key: string]: unknown;
}

/**
 * Queue item returned by {@link https://nzbget-ng.github.io/api/listgroups | listgroups}.
 */
export interface NzbGetQueueItem {
  /** ID of the NZB entry. */
  NZBID: number;
  /** Deprecated alias for `NZBID`. */
  FirstID: number;
  /** Deprecated alias for `NZBID`. */
  LastID: number;
  /** Source nzb filename, possibly including a path. */
  NZBFilename?: string;
  /** Friendly NZB name without path or extension. */
  NZBName: string;
  /** Deprecated alias for `NZBName`. */
  NZBNicename?: string;
  /** Kind of queue entry. */
  Kind?: NzbGetQueueKind;
  /** URL where the NZB file was fetched or should be fetched. */
  URL?: string;
  /** Destination directory for output file. */
  DestDir?: string;
  /** Final destination set by post-processing scripts. */
  FinalDir?: string;
  /** Assigned category, or an empty string when none is set. */
  Category: string;
  /** Total group size in bytes, low 32 bits. */
  FileSizeLo: number;
  /** Total group size in bytes, high 32 bits. */
  FileSizeHi: number;
  /** Initial group size in megabytes. */
  FileSizeMB?: number;
  /** Remaining group size in bytes, low 32 bits. */
  RemainingSizeLo: number;
  /** Remaining group size in bytes, high 32 bits. */
  RemainingSizeHi: number;
  /** Remaining group size in megabytes. */
  RemainingSizeMB?: number;
  /** Total paused file size in bytes, low 32 bits. */
  PausedSizeLo: number;
  /** Total paused file size in bytes, high 32 bits. */
  PausedSizeHi: number;
  /** Total paused file size in megabytes. */
  PausedSizeMB?: number;
  /** Initial number of files in the group. */
  FileCount?: number;
  /** Remaining number of files in the group. */
  RemainingFileCount?: number;
  /** Remaining number of par files in the group. */
  RemainingParCount?: number;
  /** Oldest article timestamp in Unix seconds. */
  MinPostTime?: number;
  /** Newest article timestamp in Unix seconds. */
  MaxPostTime?: number;
  /** Lowest file priority in the group. */
  MinPriority: number;
  /** Highest file priority in the group. */
  MaxPriority: number;
  /** Number of files in the group currently downloading. */
  ActiveDownloads: number;
  /** Aggregate group status string. */
  Status?: NzbGetQueueStatus;
  /** Total number of articles in the group. */
  TotalArticles?: number;
  /** Number of successfully downloaded articles. */
  SuccessArticles?: number;
  /** Number of failed article downloads. */
  FailedArticles?: number;
  /** Current health of the group, in permille. */
  Health?: number;
  /** Critical health threshold, in permille. */
  CriticalHealth?: number;
  /** Downloaded size, low 32 bits. */
  DownloadedSizeLo?: number;
  /** Downloaded size, high 32 bits. */
  DownloadedSizeHi?: number;
  /** Downloaded size in megabytes. */
  DownloadedSizeMB?: number;
  /** Download time in seconds. */
  DownloadTimeSec?: number;
  /** Number of messages stored in item log. */
  MessageCount?: number;
  /** Duplicate key. */
  DupeKey?: string;
  /** Duplicate score. */
  DupeScore?: number;
  /** Duplicate mode. */
  DupeMode?: NzbGetDupeMode;
  /** Deprecated deleted flag. */
  Deleted?: boolean;
  /** Result of par-check or repair during post-processing. */
  ParStatus?: NzbGetParStatus;
  /** Result of unpacking during post-processing. */
  UnpackStatus?: NzbGetUnpackStatus;
  /** Result of moving output during post-processing. */
  MoveStatus?: NzbGetMoveStatus;
  /** Result of post-processing scripts during post-processing. */
  ScriptStatus?: NzbGetScriptStatus;
  /** Result of delete handling during post-processing. */
  DeleteStatus?: NzbGetDeleteStatus;
  /** Final mark assigned during post-processing. */
  MarkStatus?: NzbGetMarkStatus;
  /** Short description of the current post-processing action. */
  PostInfoText?: string;
  /** Current post-processing stage completion in permille. */
  PostStageProgress?: number;
  /** Total seconds spent in post-processing. */
  PostTotalTimeSec?: number;
  /** Seconds spent in the current post-processing stage. */
  PostStageTimeSec?: number;
  /** Per-item parameters attached to the queue entry. */
  Parameters: NzbGetParameter[];
  [key: string]: unknown;
}

/**
 * History item returned by {@link https://nzbget-ng.github.io/api/history | history}.
 */
export interface NzbGetHistoryItem {
  /** ID of the NZB entry. */
  NZBID?: number;
  /** Deprecated alias for `NZBID`. */
  ID: number;
  /** Kind of history item. */
  Kind?: NzbGetHistoryKind;
  /** Source nzb filename, possibly including a path. */
  NZBFilename?: string;
  /** Friendly item name without path or extension. */
  Name: string;
  /** URL for URL history items. */
  URL?: string;
  /** Assigned category, or an empty string when none is set. */
  Category: string;
  /** Total group size in bytes, low 32 bits. */
  FileSizeLo: number;
  /** Total group size in bytes, high 32 bits. */
  FileSizeHi: number;
  /** Initial group size in megabytes. */
  FileSizeMB?: number;
  /** Initial number of files in the group. */
  FileCount?: number;
  /** Number of parked files in the group. */
  RemainingFileCount?: number;
  /** Time when the item was added to history, in Unix seconds. */
  HistoryTime?: number;
  /** Oldest article timestamp in Unix seconds. */
  MinPostTime?: number;
  /** Newest article timestamp in Unix seconds. */
  MaxPostTime?: number;
  /** Total number of articles in the group. */
  TotalArticles?: number;
  /** Number of successfully downloaded articles. */
  SuccessArticles?: number;
  /** Number of failed article downloads. */
  FailedArticles?: number;
  /** Final health of the group, in permille. */
  Health?: number;
  /** Downloaded size, low 32 bits. */
  DownloadedSizeLo?: number;
  /** Downloaded size, high 32 bits. */
  DownloadedSizeHi?: number;
  /** Downloaded size in megabytes. */
  DownloadedSizeMB?: number;
  /** Download time in seconds. */
  DownloadTimeSec?: number;
  /** Total post-processing time in seconds. */
  PostTotalTimeSec?: number;
  /** Par-check time in seconds. */
  ParTimeSec?: number;
  /** Repair time in seconds. */
  RepairTimeSec?: number;
  /** Unpack time in seconds. */
  UnpackTimeSec?: number;
  /** Number of messages stored in the item log. */
  MessageCount?: number;
  /** Duplicate key. */
  DupeKey?: string;
  /** Duplicate score. */
  DupeScore?: number;
  /** Duplicate mode. */
  DupeMode?: NzbGetDupeMode;
  /** Total status of the download. */
  Status?: NzbGetHistoryStatus;
  /** Result of par-check or repair. */
  ParStatus: NzbGetParStatus;
  /** Duplicate par-scan repair status. */
  ExParStatus?: NzbGetExParStatus;
  /** Result of unpacking. */
  UnpackStatus: NzbGetUnpackStatus;
  /** Result of URL-download. */
  UrlStatus?: NzbGetUrlStatus;
  /** Result of moving the output to its destination. */
  MoveStatus: NzbGetMoveStatus;
  /** Result of post-processing scripts. */
  ScriptStatus: NzbGetScriptStatus;
  /** Result of delete or cleanup handling. */
  DeleteStatus: NzbGetDeleteStatus;
  /** Final mark assigned to the item. */
  MarkStatus: NzbGetMarkStatus;
  /** Destination directory for the item output. */
  DestDir: string;
  /** Final destination directory if overridden during post-processing. */
  FinalDir: string;
  /** Extra par blocks received from or donated to duplicates. */
  ExtraParBlocks?: number;
  /** Per-item parameters attached to the history entry. */
  Parameters: NzbGetParameter[];
  [key: string]: unknown;
}

/**
 * Config item returned by {@link https://nzbget-ng.github.io/api/config | config}.
 */
export interface NzbGetConfigItem {
  /** Config option name. */
  Name: string;
  /** Config option value. */
  Value: string;
}

type NzbGetLooseEnum<TValue extends string> = TValue | (string & Record<never, never>);

export type NzbGetHistoryKind = NzbGetLooseEnum<'NZB' | 'URL' | 'DUP'>;

export type NzbGetDupeMode = NzbGetLooseEnum<'SCORE' | 'ALL' | 'FORCE'>;

export type NzbGetParStatus = NzbGetLooseEnum<
  'NONE' | 'FAILURE' | 'REPAIR_POSSIBLE' | 'SUCCESS' | 'MANUAL'
>;

export type NzbGetExParStatus = NzbGetLooseEnum<'RECIPIENT' | 'DONOR'>;

export type NzbGetUnpackStatus = NzbGetLooseEnum<
  'NONE' | 'FAILURE' | 'SPACE' | 'PASSWORD' | 'SUCCESS'
>;

export type NzbGetUrlStatus = NzbGetLooseEnum<
  'NONE' | 'SUCCESS' | 'FAILURE' | 'SCAN_SKIPPED' | 'SCAN_FAILURE'
>;

export type NzbGetScriptStatus = NzbGetLooseEnum<'NONE' | 'FAILURE' | 'SUCCESS'>;

export type NzbGetMoveStatus = NzbGetLooseEnum<'NONE' | 'SUCCESS' | 'FAILURE'>;

export type NzbGetDeleteStatus = NzbGetLooseEnum<
  'NONE' | 'MANUAL' | 'HEALTH' | 'DUPE' | 'BAD' | 'SCAN' | 'COPY'
>;

export type NzbGetMarkStatus = NzbGetLooseEnum<'NONE' | 'GOOD' | 'BAD'>;

export type NzbGetHistoryStatus = NzbGetLooseEnum<
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
>;

export type NzbGetQueueKind = NzbGetLooseEnum<'NZB' | 'URL'>;

export type NzbGetQueueStatus = NzbGetLooseEnum<
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
>;

type NzbGetServerSettingKey =
  | `Server${number}.Active`
  | `Server${number}.Name`
  | `Server${number}.Level`
  | `Server${number}.Optional`
  | `Server${number}.Group`
  | `Server${number}.Host`
  | `Server${number}.Encryption`
  | `Server${number}.Port`
  | `Server${number}.Username`
  | `Server${number}.Password`
  | `Server${number}.JoinGroup`
  | `Server${number}.Cipher`
  | `Server${number}.Connections`
  | `Server${number}.Retention`
  | `Server${number}.CertVerification`
  | `Server${number}.IpVersion`
  | `Server${number}.Notes`;

type NzbGetCategorySettingKey =
  | `Category${number}.Name`
  | `Category${number}.DestDir`
  | `Category${number}.Unpack`
  | `Category${number}.Extensions`
  | `Category${number}.Aliases`;

type NzbGetSettingsKnownKeys = {
  ConfigFile: string;
  AppBin: string;
  AppDir: string;
  Version: string;
  MainDir: string;
  WebDir: string;
  ConfigTemplate: string;
  TempDir: string;
  DestDir: string;
  InterDir: string;
  QueueDir: string;
  NzbDir: string;
  LockFile: string;
  LogFile: string;
  ScriptDir: string;
  RequiredDir: string;
  WriteLog: string;
  RotateLog: string;
  AppendCategoryDir: string;
  OutputMode: string;
  DupeCheck: string;
  DownloadRate: string;
  ControlIP: string;
  ControlUsername: string;
  ControlPassword: string;
  RestrictedUsername: string;
  RestrictedPassword: string;
  AddUsername: string;
  AddPassword: string;
  ControlPort: string;
  FormAuth: string;
  SecureControl: string;
  SecurePort: string;
  SecureCert: string;
  SecureKey: string;
  CertStore: string;
  CertCheck: string;
  AuthorizedIP: string;
  ArticleTimeout: string;
  ArticleReadChunkSize: string;
  UrlTimeout: string;
  RemoteTimeout: string;
  FlushQueue: string;
  SystemHealthCheck: string;
  NzbLog: string;
  RawArticle: string;
  SkipWrite: string;
  ArticleRetries: string;
  ArticleInterval: string;
  UrlRetries: string;
  UrlInterval: string;
  ContinuePartial: string;
  UrlConnections: string;
  LogBuffer: string;
  InfoTarget: string;
  WarningTarget: string;
  ErrorTarget: string;
  DebugTarget: string;
  DetailTarget: string;
  ParCheck: string;
  ParRepair: string;
  ParScan: string;
  ParQuick: string;
  PostStrategy: string;
  FileNaming: string;
  RenameAfterUnpack: string;
  RenameIgnoreExt: string;
  ParRename: string;
  ParBuffer: string;
  ParThreads: string;
  RarRename: string;
  HealthCheck: string;
  DirectRename: string;
  HardLinking: string;
  HardLinkingIgnoreExt: string;
  ScriptOrder: string;
  Extensions: string;
  DaemonUsername: string;
  UMask: string;
  UpdateInterval: string;
  CursesNzbName: string;
  CursesTime: string;
  CursesGroup: string;
  CrcCheck: string;
  DirectWrite: string;
  WriteBuffer: string;
  NzbDirInterval: string;
  NzbDirFileAge: string;
  DiskSpace: string;
  CrashTrace: string;
  CrashDump: string;
  ParPauseQueue: string;
  ScriptPauseQueue: string;
  NzbCleanupDisk: string;
  ParTimeLimit: string;
  KeepHistory: string;
  Unpack: string;
  DirectUnpack: string;
  UseTempUnpackDir: string;
  UnpackCleanupDisk: string;
  UnrarCmd: string;
  SevenZipCmd: string;
  UnpackPassFile: string;
  UnpackPauseQueue: string;
  ExtCleanupDisk: string;
  ParIgnoreExt: string;
  UnpackIgnoreExt: string;
  FeedHistory: string;
  UrlForce: string;
  TimeCorrection: string;
  PropagationDelay: string;
  ArticleCache: string;
  EventInterval: string;
  ShellOverride: string;
  MonthlyQuota: string;
  QuotaStartDay: string;
  DailyQuota: string;
  ReorderFiles: string;
  UpdateCheck: string;
};

/**
 * Settings map returned by {@link https://nzbget-ng.github.io/api/config | config}.
 *
 * NZBGet exposes a broad string-to-string config object. This type makes the
 * common built-in keys explicit while preserving support for custom or
 * version-specific settings.
 */
export type NzbGetSettings = Record<string, string> &
  NzbGetSettingsKnownKeys &
  Partial<Record<NzbGetServerSettingKey, string>> &
  Partial<Record<NzbGetCategorySettingKey, string>>;

/**
 * Template entry returned by
 * {@link https://nzbget-ng.github.io/api/configtemplates | configtemplates}.
 */
export interface NzbGetConfigTemplate {
  /**
   * Script path, or an empty value for the first record which contains the base
   * NZBGet config template.
   */
  Name: string;
  /** Display-ready script name. */
  DisplayName?: string;
  /** True for post-processing scripts. */
  PostScript?: boolean;
  /** True for scan scripts. */
  ScanScript?: boolean;
  /** True for queue scripts. */
  QueueScript?: boolean;
  /** True for scheduler scripts. */
  SchedulerScript?: boolean;
  /** Multi-line template content. */
  Template?: string;
  [key: string]: unknown;
}

/**
 * File entry returned by {@link https://nzbget-ng.github.io/api/listfiles | listfiles}.
 */
export interface NzbGetFile {
  /** ID of the file. */
  ID: number;
  /** ID of the parent NZB group. */
  NZBID: number;
  /** Source NZB filename, possibly including a path. */
  NZBFilename?: string;
  /** Friendly NZB name without path or extension. */
  NZBName?: string;
  /** Deprecated alias for `NZBName`. */
  NZBNicename?: string;
  /** True if the filename was confirmed from the article body. */
  FilenameConfirmed?: boolean;
  /** Destination directory for the output file. */
  DestDir?: string;
  /** Parsed or confirmed filename for the file entry. */
  Filename: string;
  /** Subject read from the NZB file. */
  Subject?: string;
  /** File size in bytes, low 32 bits. */
  FileSizeLo?: number;
  /** File size in bytes, high 32 bits. */
  FileSizeHi?: number;
  /** Remaining size in bytes, low 32 bits. */
  RemainingSizeLo?: number;
  /** Remaining size in bytes, high 32 bits. */
  RemainingSizeHi?: number;
  /** True if the file is paused. */
  Paused?: boolean;
  /** Post date in Unix seconds. */
  PostTime?: number;
  /** Deprecated file priority. */
  Priority?: number;
  /** Number of active downloads for this file. */
  ActiveDownloads?: number;
  /** Download progress in the range 0..1000. */
  Progress?: number;
  [key: string]: unknown;
}

export interface NzbGetAddOptions {
  /** Category assigned to the added download. */
  category?: string;
  /** Raw NZBGet priority value. */
  priority?: number;
  /** True to add the item paused. */
  addPaused?: boolean;
  /** True to place the item at the top of the queue. */
  addToTop?: boolean;
  /** Duplicate key used by NZBGet duplicate handling. */
  dupeKey?: string;
  /** Duplicate score used by NZBGet duplicate handling. */
  dupeScore?: number;
  /** Duplicate mode used by NZBGet duplicate handling. */
  dupeMode?: NzbGetDupeMode;
  /** Post-processing parameters sent with the append call. */
  ppParameters?: NzbGetParameter[];
}

export type NzbGetEditQueueCommand =
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
  | 'GroupMoveOffset'
  | 'GroupMoveTop'
  | 'GroupMoveBottom'
  | 'GroupPause'
  | 'GroupResume'
  | 'GroupDelete'
  | 'GroupDupeDelete'
  | 'GroupFinalDelete'
  | 'GroupPauseAllPars'
  | 'GroupPauseExtraPars'
  | 'GroupSetPriority'
  | 'GroupSetCategory'
  | 'GroupApplyCategory'
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
  | 'HistoryMarkSuccess';

export type NzbGetSortField = 'name' | 'priority' | 'category' | 'size' | 'left';

export type NzbGetSortDirection = '+' | '-';

export type NzbGetSortParam = NzbGetSortField | `${NzbGetSortField}${NzbGetSortDirection}`;

export type NzbGetParameterAssignment = `${string}=${string}`;

export interface NzbGetEditQueueParameterMap {
  FileMoveOffset: number | `${number}`;
  FileMoveTop: '';
  FileMoveBottom: '';
  FilePause: '';
  FileResume: '';
  FileDelete: '';
  FilePauseAllPars: '';
  FilePauseExtraPars: '';
  FileSetPriority: number;
  FileReorder: '';
  FileSplit: '';
  GroupMoveOffset: number | `${number}`;
  GroupMoveTop: '';
  GroupMoveBottom: '';
  GroupPause: '';
  GroupResume: '';
  GroupDelete: '';
  GroupDupeDelete: '';
  GroupFinalDelete: '';
  GroupPauseAllPars: '';
  GroupPauseExtraPars: '';
  GroupSetPriority: number;
  GroupSetCategory: string;
  GroupApplyCategory: string;
  GroupMerge: '';
  GroupSetParameter: NzbGetParameterAssignment;
  GroupSetName: string;
  GroupSetDupeKey: string;
  GroupSetDupeScore: number | `${number}`;
  GroupSetDupeMode: NzbGetDupeMode;
  GroupSort: NzbGetSortParam;
  PostMoveOffset: number | `${number}`;
  PostMoveTop: '';
  PostMoveBottom: '';
  PostDelete: '';
  HistoryDelete: '';
  HistoryFinalDelete: '';
  HistoryReturn: '';
  HistoryProcess: '';
  HistoryRedownload: '';
  HistorySetName: string;
  HistorySetCategory: string;
  HistorySetParameter: NzbGetParameterAssignment;
  HistorySetDupeKey: string;
  HistorySetDupeScore: number | `${number}`;
  HistorySetDupeMode: NzbGetDupeMode;
  HistorySetDupeBackup: '0' | '1' | 0 | 1;
  HistoryMarkBad: '';
  HistoryMarkGood: '';
  HistoryMarkSuccess: '';
}

export type NzbGetEditQueueParameter<TCommand extends NzbGetEditQueueCommand> =
  NzbGetEditQueueParameterMap[TCommand];
