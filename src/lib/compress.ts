import { compressImage as compressWithTinyPng } from './tinify';
import type { CompressionMode } from '../types';

export const compressionModes = {
  tinypng: 'tinypng',
} as const;

export async function compressImage(file: File, mode: CompressionMode) {
  if (mode === compressionModes.tinypng) {
    return compressWithTinyPng(file);
  }
  throw new Error('未知压缩方式');
}
