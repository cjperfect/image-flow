const PREFIX_KEY = 'lanhu-assets.naming-prefix';
const START_INDEX_KEY = 'lanhu-assets.naming-start-index';

export function loadNamingPrefix(): string {
  return localStorage.getItem(PREFIX_KEY) || '';
}

export function saveNamingPrefix(prefix: string): void {
  localStorage.setItem(PREFIX_KEY, prefix);
}

export function loadNamingStartIndex(): number {
  const raw = localStorage.getItem(START_INDEX_KEY);
  const parsed = parseInt(raw ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export function saveNamingStartIndex(index: number): void {
  localStorage.setItem(START_INDEX_KEY, String(index));
}
