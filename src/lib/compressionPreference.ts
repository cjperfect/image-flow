import type { CompressionMode } from '../types';

const STORAGE_KEY = 'lanhu-assets.compression-mode';
const validModes = new Set<string>(['tinypng']);

export function loadCompressionMode(): CompressionMode {
  const savedMode = localStorage.getItem(STORAGE_KEY);
  return validModes.has(savedMode ?? '') ? (savedMode as CompressionMode) : 'tinypng';
}

export function saveCompressionMode(mode: CompressionMode): void {
  if (!validModes.has(mode)) return;
  localStorage.setItem(STORAGE_KEY, mode);
}
