import { getItem, setItem } from './persist';

const PREFIX_KEY = 'lanhu-assets.naming-prefix';
const START_INDEX_KEY = 'lanhu-assets.naming-start-index';

export async function loadNamingPrefix(): Promise<string> {
  return (await getItem(PREFIX_KEY)) || '';
}

export async function saveNamingPrefix(prefix: string): Promise<void> {
  await setItem(PREFIX_KEY, prefix);
}

export async function loadNamingStartIndex(): Promise<number> {
  const raw = await getItem(START_INDEX_KEY);
  const parsed = parseInt(raw ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export async function saveNamingStartIndex(index: number): Promise<void> {
  await setItem(START_INDEX_KEY, String(index));
}
