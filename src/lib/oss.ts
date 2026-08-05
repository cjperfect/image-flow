import { registerProxyEndpoint } from './proxy';
import type { FolderInfo, StorageConfig, StorageObject } from '../types';

interface OssClient {
  list(params: Record<string, unknown>): Promise<{ objects?: OssObject[]; nextMarker?: string }>;
  put(key: string, blob: Blob, opts?: Record<string, unknown>): Promise<void>;
  copy(newKey: string, oldKey: string): Promise<void>;
  delete(key: string): Promise<void>;
}

interface OssObject {
  name: string;
  size: number;
  lastModified: string | Date;
}

export function parseOssFolder(folderUrl: string): FolderInfo {
  const match = /^oss:\/\/([^/]+)\/?(.*)$/.exec(folderUrl.trim());
  if (!match) {
    throw new Error('OSS 目录格式应为 oss://bucket/path/');
  }

  const prefix = match[2] ? `${match[2].replace(/^\/+|\/+$/g, '')}/` : '';
  return { bucket: match[1], prefix };
}

export async function createOssClient(config: StorageConfig): Promise<OssClient> {
  const OSS = (await import('ali-oss')).default;
  const { bucket } = parseOssFolder(config.folderUrl);
  const region = config.endpoint.trim();

  const client = new OSS({
    accessKeyId: config.accessKeyId.trim(),
    accessKeySecret: config.secretAccessKey.trim(),
    bucket,
    region,
    secure: true,
  });

  if (import.meta.env.DEV) {
    registerProxyEndpoint({
      protocol: 'https:',
      hostname: 'aliyuncs.com',
      proxyPrefix: '/api/oss-proxy/',
    });
  }

  return client;
}

export async function listObjects(client: OssClient, _bucket: string, prefix: string): Promise<StorageObject[]> {
  const contents: StorageObject[] = [];
  let marker: string | undefined;

  do {
    const result = await client.list({ prefix, marker, 'max-keys': 1000 });
    const objects = (result.objects || []).map((item: OssObject) => ({
      Key: item.name,
      Size: item.size,
      LastModified: item.lastModified instanceof Date ? item.lastModified.toISOString() : item.lastModified,
    }));
    contents.push(...objects);
    marker = result.nextMarker;
  } while (marker);

  return contents.filter((item) => item.Key !== prefix);
}

export async function uploadObject(client: OssClient, _bucket: string, key: string, blob: Blob): Promise<void> {
  await client.put(key, blob, { mime: blob.type });
}

export async function renameObject(client: OssClient, _bucket: string, oldKey: string, newKey: string): Promise<void> {
  await client.copy(newKey, oldKey);
  await client.delete(oldKey);
}

export async function deleteObject(client: OssClient, _bucket: string, key: string): Promise<void> {
  await client.delete(key);
}

export function buildObjectLinks(config: StorageConfig, bucket: string, key: string): Pick<StorageObject, 'obsUrl' | 'httpsUrl'> {
  const region = config.endpoint.trim();
  const encodedKey = key.split('/').map(encodeURIComponent).join('/');
  return {
    obsUrl: `oss://${bucket}/${key}`,
    httpsUrl: `https://${bucket}.${region}.aliyuncs.com/${encodedKey}`,
  };
}
