import type { CompressionMode } from '../types';
import { getItem, setItem } from './persist';

const STORAGE_KEY = 'lanhu-assets.compression-mode';
const validModes = new Set<string>(['tinypng']);

export async function loadCompressionMode(): Promise<CompressionMode> {
  const savedMode = await getItem(STORAGE_KEY);
  return validModes.has(savedMode ?? '') ? (savedMode as CompressionMode) : 'tinypng';
}

export async function saveCompressionMode(mode: CompressionMode): Promise<void> {
  if (!validModes.has(mode)) return;
  await setItem(STORAGE_KEY, mode);
}
