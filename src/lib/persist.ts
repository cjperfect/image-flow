/**
 * Unified async storage abstraction.
 *
 * In Tauri → uses tauri-plugin-store (persisted to %APPDATA%/<app>/app-data.json).
 * In browser / dev-server → falls back to localStorage.
 *
 * On first Tauri launch, existing localStorage data is automatically migrated.
 */

let store: any = null;
let storeReady = false;
let storeInitPromise: Promise<void> | null = null;

const MIGRATION_KEYS = [
  "lanhu-assets.credentials.v5",
  "lanhu-assets.credentials.v4",
  "lanhu-assets.credentials.v3",
  "lanhu-assets.credentials.v2",
  "lanhu-assets.compression-mode",
  "lanhu-assets.obs-folder-history.v1",
  "lanhu-assets.naming-prefix",
  "lanhu-assets.naming-start-index",
  "obs-copy-mode",
  "obs-view-mode",
  "theme",
];

async function migrateFromLocalStorage(): Promise<void> {
  if (!store) return;
  for (const key of MIGRATION_KEYS) {
    try {
      const existing = await store.get(key);
      if (existing !== undefined && existing !== null) continue;

      const lsValue = localStorage.getItem(key);
      if (lsValue === null) continue;

      await store.set(key, lsValue);
    } catch {
      // Non-fatal — keep the localStorage copy if migration fails
    }
  }
}

async function ensureStore(): Promise<void> {
  if (storeReady) return;
  if (storeInitPromise) {
    await storeInitPromise;
    return;
  }

  storeInitPromise = (async () => {
    try {
      const { Store } = await import("@tauri-apps/plugin-store");
      store = await Store.load("app-data.json", { autoSave: true });
      await migrateFromLocalStorage();
    } catch {
      // Not running in Tauri — use localStorage fallback
      store = null;
    }
    storeReady = true;
  })();

  await storeInitPromise;
}

export async function getItem(key: string): Promise<string | null> {
  await ensureStore();
  if (store) {
    try {
      const value = await store.get(key);
      return value ?? null;
    } catch {
      return localStorage.getItem(key);
    }
  }
  return localStorage.getItem(key);
}

export async function setItem(key: string, value: string): Promise<void> {
  await ensureStore();
  if (store) {
    try {
      await store.set(key, value);
      return;
    } catch {
      // Fall through to localStorage
    }
  }
  localStorage.setItem(key, value);
}

export async function removeItem(key: string): Promise<void> {
  await ensureStore();
  if (store) {
    try {
      await store.delete(key);
      return;
    } catch {
      // Fall through to localStorage
    }
  }
  localStorage.removeItem(key);
}
