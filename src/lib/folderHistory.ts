import { getItem, setItem, removeItem } from './persist';

const STORAGE_KEY = 'lanhu-assets.obs-folder-history.v1';
const MAX_HISTORY_ITEMS = 10;

export async function loadFolderHistory(): Promise<string[]> {
  try {
    const raw = await getItem(STORAGE_KEY);
    const history = JSON.parse(raw || '[]');
    return Array.isArray(history) ? history.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    await removeItem(STORAGE_KEY);
    return [];
  }
}

export async function saveFolderToHistory(folderUrl: string): Promise<string[]> {
  const normalizedUrl = folderUrl.trim();
  if (!normalizedUrl) return loadFolderHistory();

  const current = await loadFolderHistory();
  const history = [
    normalizedUrl,
    ...current.filter((item) => item !== normalizedUrl),
  ].slice(0, MAX_HISTORY_ITEMS);

  await setItem(STORAGE_KEY, JSON.stringify(history));
  return history;
}

export async function removeFolderFromHistory(folderUrl: string): Promise<string[]> {
  const history = (await loadFolderHistory()).filter((item) => item !== folderUrl);
  await setItem(STORAGE_KEY, JSON.stringify(history));
  return history;
}

export async function clearFolderHistory(preservedFolderUrl = ''): Promise<string[]> {
  await removeItem(STORAGE_KEY);
  return preservedFolderUrl ? saveFolderToHistory(preservedFolderUrl) : [];
}
