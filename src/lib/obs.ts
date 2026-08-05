import { registerProxyEndpoint } from './proxy';
import type { FolderInfo, StorageConfig, StorageObject } from '../types';

interface ObsClient {
  listObjects(params: Record<string, unknown>, callback: (err: unknown, result: unknown) => void): void;
  putObject(params: Record<string, unknown>, callback: (err: unknown, result: unknown) => void): void;
  copyObject(params: Record<string, unknown>, callback: (err: unknown, result: unknown) => void): void;
  deleteObject(params: Record<string, unknown>, callback: (err: unknown, result: unknown) => void): void;
}

interface ObsResult {
  CommonMsg?: { Status: number; Message?: string };
  InterfaceResult?: Record<string, unknown>;
}

export function parseObsFolder(folderUrl: string): FolderInfo {
  const match = /^obs:\/\/([^/]+)\/?(.*)$/.exec(folderUrl.trim());
  if (!match) {
    throw new Error('OBS 目录格式应为 obs://bucket/path/');
  }

  const prefix = match[2] ? `${match[2].replace(/^\/+|\/+$/g, '')}/` : '';
  return { bucket: match[1], prefix };
}

export async function createObsClient(config: StorageConfig): Promise<ObsClient> {
  const { default: ObsClient } = await import('esdk-obs-browserjs');
  const client = new ObsClient({
    access_key_id: config.accessKeyId.trim(),
    secret_access_key: config.secretAccessKey.trim(),
    server: config.endpoint.trim(),
    path_style: false,
  });

  if (import.meta.env.DEV) {
    const parsed = new URL(config.endpoint.trim());
    registerProxyEndpoint({
      protocol: parsed.protocol,
      hostname: parsed.hostname,
      proxyPrefix: '/api/obs-proxy/',
    });
  }

  return client;
}

function request<T>(client: ObsClient, method: string, params: Record<string, unknown>): Promise<T> {
  return new Promise((resolve, reject) => {
    (client as Record<string, unknown>)[method](params, (error: unknown, result: ObsResult) => {
      if (error) { reject(error); return; }
      if (!result || (result.CommonMsg?.Status ?? 0) >= 300) {
        reject(new Error(result?.CommonMsg?.Message || `OBS ${method} 请求失败`));
        return;
      }
      resolve((result.InterfaceResult || {}) as T);
    });
  });
}

export async function listObjects(client: ObsClient, bucket: string, prefix: string): Promise<StorageObject[]> {
  const contents: StorageObject[] = [];
  let marker: string | undefined;

  do {
    const result = await request<{ Contents?: StorageObject[]; IsTruncated?: string; NextMarker?: string }>(
      client, 'listObjects', { Bucket: bucket, Prefix: prefix, Marker: marker, MaxKeys: 1000 }
    );
    contents.push(...(result.Contents || []));
    marker = result.IsTruncated === 'true' ? result.NextMarker : undefined;
  } while (marker);

  return contents.filter((item) => item.Key !== prefix);
}

export async function uploadObject(client: ObsClient, bucket: string, key: string, blob: Blob): Promise<void> {
  await request(client, 'putObject', { Bucket: bucket, Key: key, SourceFile: blob, ContentType: blob.type });
}

export async function renameObject(client: ObsClient, bucket: string, oldKey: string, newKey: string): Promise<void> {
  await request(client, 'copyObject', { Bucket: bucket, Key: newKey, CopySource: `${bucket}/${oldKey}` });
  await request(client, 'deleteObject', { Bucket: bucket, Key: oldKey });
}

export async function deleteObject(client: ObsClient, bucket: string, key: string): Promise<void> {
  await request(client, 'deleteObject', { Bucket: bucket, Key: key });
}

export function buildObjectLinks(endpoint: string, bucket: string, key: string): Pick<StorageObject, 'obsUrl' | 'httpsUrl'> {
  const url = new URL(endpoint.trim());
  const encodedKey = key.split('/').map(encodeURIComponent).join('/');
  return {
    obsUrl: `obs://${bucket}/${key}`,
    httpsUrl: `${url.protocol}//${bucket}.${url.host}/${encodedKey}`,
  };
}
