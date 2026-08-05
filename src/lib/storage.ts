import * as obs from './obs';
import * as oss from './oss';
import type { FolderInfo, StorageConfig, StorageObject } from '../types';

type ProviderModule = typeof obs;

function selectProvider(config: StorageConfig): ProviderModule {
  return config.provider === 'oss' ? oss : obs;
}

export function parseFolderUrl(config: StorageConfig): FolderInfo {
  if (config.provider === 'oss') return oss.parseOssFolder(config.folderUrl);
  return obs.parseObsFolder(config.folderUrl);
}

export async function createClient(config: StorageConfig) {
  if (config.provider === 'oss') return oss.createOssClient(config);
  return obs.createObsClient(config);
}

export async function listObjects(
  client: ReturnType<typeof selectProvider> extends { createObsClient: infer F } ? F : never,
  config: StorageConfig,
  bucket: string,
  prefix: string,
): Promise<StorageObject[]> {
  return selectProvider(config).listObjects(client as never, bucket, prefix);
}

export async function uploadObject(
  client: unknown,
  config: StorageConfig,
  bucket: string,
  key: string,
  blob: Blob,
): Promise<void> {
  return selectProvider(config).uploadObject(client as never, bucket, key, blob);
}

export async function renameObject(
  client: unknown,
  config: StorageConfig,
  bucket: string,
  oldKey: string,
  newKey: string,
): Promise<void> {
  return selectProvider(config).renameObject(client as never, bucket, oldKey, newKey);
}

export async function deleteObject(
  client: unknown,
  config: StorageConfig,
  bucket: string,
  key: string,
): Promise<void> {
  return selectProvider(config).deleteObject(client as never, bucket, key);
}

export function buildObjectLinks(
  config: StorageConfig,
  bucket: string,
  key: string,
): Pick<StorageObject, 'obsUrl' | 'httpsUrl'> {
  if (config.provider === 'oss') return oss.buildObjectLinks(config, bucket, key);
  return obs.buildObjectLinks(config.endpoint, bucket, key);
}
