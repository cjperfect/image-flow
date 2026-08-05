export type CloudProvider = 'obs' | 'oss';

export interface StorageConfig {
  provider: CloudProvider;
  folderUrl: string;
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
}

export interface FolderInfo {
  bucket: string;
  prefix: string;
}

export interface StorageObject {
  Key: string;
  Size: number;
  LastModified: string;
  obsUrl?: string;
  httpsUrl?: string;
}

export type UploadStatus = 'queued' | 'compressing' | 'uploading' | 'success' | 'error';
export type CompressionMode = 'tinypng';
export type CopyMode = 'url' | 'css';
export type SortDirection = 'asc' | 'desc';

export interface UploadItem {
  id: string;
  file: File;
  name: string;
  originalSize: number;
  compressedSize?: number;
  previewUrl: string;
  compressionMode: CompressionMode;
  status: UploadStatus;
  key?: string;
  obsUrl?: string;
  httpsUrl?: string;
  error?: string;
}

export interface ToastMessage {
  id: string;
  message: string;
}
