export interface JsonRpcErrorModel {
  code: number;
  message: string;
  data?: unknown;
}

export interface JsonRpcResponse<T> {
  id: number | string;
  jsonrpc: '2.0';
  result: T;
  error?: JsonRpcErrorModel | null;
}

export interface NzbGetParameter {
  Name: string;
  Value: unknown;
}

export interface NzbGetStatus {
  RemainingSizeLo: number;
  RemainingSizeHi: number;
  DownloadedSizeLo: number;
  DownloadedSizeHi: number;
  DownloadRate: number;
  AverageDownloadRate: number;
  DownloadLimit: number;
  DownloadPaused: boolean;
  [key: string]: unknown;
}

export interface NzbGetQueueItem {
  NZBID: number;
  FirstID: number;
  LastID: number;
  NZBName: string;
  Category: string;
  FileSizeLo: number;
  FileSizeHi: number;
  RemainingSizeLo: number;
  RemainingSizeHi: number;
  PausedSizeLo: number;
  PausedSizeHi: number;
  MinPriority: number;
  MaxPriority: number;
  ActiveDownloads: number;
  Status?: string;
  Parameters: NzbGetParameter[];
  [key: string]: unknown;
}

export interface NzbGetHistoryItem {
  ID: number;
  Name: string;
  Category: string;
  FileSizeLo: number;
  FileSizeHi: number;
  HistoryTime?: number;
  ParStatus: string;
  UnpackStatus: string;
  MoveStatus: string;
  ScriptStatus: string;
  DeleteStatus: string;
  MarkStatus: string;
  Status?: string;
  DestDir: string;
  FinalDir: string;
  Parameters: NzbGetParameter[];
  [key: string]: unknown;
}

export interface NzbGetConfigItem {
  Name: string;
  Value: string;
}

export interface NzbGetConfigTemplate {
  Name: string;
  DisplayName?: string;
  PostScript?: boolean;
  [key: string]: unknown;
}

export interface NzbGetFile {
  ID: number;
  NZBID: number;
  Filename: string;
  Subject?: string;
  SizeLo?: number;
  SizeHi?: number;
  RemainingSizeLo?: number;
  RemainingSizeHi?: number;
  [key: string]: unknown;
}

export interface NzbGetAddOptions {
  category?: string;
  priority?: number;
  addPaused?: boolean;
  addToTop?: boolean;
  dupeKey?: string;
  dupeScore?: number;
  dupeMode?: string;
}
