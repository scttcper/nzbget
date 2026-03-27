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
export interface NzbGetStatus {
  /** Remaining queue size in bytes, low 32 bits of the 64-bit value. */
  RemainingSizeLo: number;
  /** Remaining queue size in bytes, high 32 bits of the 64-bit value. */
  RemainingSizeHi: number;
  /** Amount downloaded since server start in bytes, low 32 bits. */
  DownloadedSizeLo: number;
  /** Amount downloaded since server start in bytes, high 32 bits. */
  DownloadedSizeHi: number;
  /** Current download speed in bytes per second. */
  DownloadRate: number;
  /** Average download speed since server start in bytes per second. */
  AverageDownloadRate: number;
  /** Current download limit in bytes per second. */
  DownloadLimit: number;
  /** True if the download queue is soft-paused. */
  DownloadPaused: boolean;
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
  /** Friendly NZB name without path or extension. */
  NZBName: string;
  /** Assigned category, or an empty string when none is set. */
  Category: string;
  /** Total group size in bytes, low 32 bits. */
  FileSizeLo: number;
  /** Total group size in bytes, high 32 bits. */
  FileSizeHi: number;
  /** Remaining group size in bytes, low 32 bits. */
  RemainingSizeLo: number;
  /** Remaining group size in bytes, high 32 bits. */
  RemainingSizeHi: number;
  /** Total paused file size in bytes, low 32 bits. */
  PausedSizeLo: number;
  /** Total paused file size in bytes, high 32 bits. */
  PausedSizeHi: number;
  /** Lowest file priority in the group. */
  MinPriority: number;
  /** Highest file priority in the group. */
  MaxPriority: number;
  /** Number of files in the group currently downloading. */
  ActiveDownloads: number;
  /** Aggregate group status string. */
  Status?: string;
  /** Per-item parameters attached to the queue entry. */
  Parameters: NzbGetParameter[];
  [key: string]: unknown;
}

/**
 * History item returned by {@link https://nzbget-ng.github.io/api/history | history}.
 */
export interface NzbGetHistoryItem {
  /** Deprecated alias for `NZBID`. */
  ID: number;
  /** Friendly item name without path or extension. */
  Name: string;
  /** Assigned category, or an empty string when none is set. */
  Category: string;
  /** Total group size in bytes, low 32 bits. */
  FileSizeLo: number;
  /** Total group size in bytes, high 32 bits. */
  FileSizeHi: number;
  /** Time when the item was added to history, in Unix seconds. */
  HistoryTime?: number;
  /** Result of par-check or repair. */
  ParStatus: string;
  /** Result of unpacking. */
  UnpackStatus: string;
  /** Result of moving the output to its destination. */
  MoveStatus: string;
  /** Result of post-processing scripts. */
  ScriptStatus: string;
  /** Result of delete or cleanup handling. */
  DeleteStatus: string;
  /** Final mark assigned to the item. */
  MarkStatus: string;
  /** Aggregate history status string. */
  Status?: string;
  /** Destination directory for the item output. */
  DestDir: string;
  /** Final destination directory if overridden during post-processing. */
  FinalDir: string;
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
  dupeMode?: string;
}
