import copy from 'copy-to-clipboard';

export function copyToClipboard(text: string): void {
  const copied = copy(text);
  if (!copied) {
    throw new Error('复制失败，请手动复制');
  }
}
