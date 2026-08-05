import type { CloudProvider, StorageConfig } from '../types';

const STORAGE_KEY = 'lanhu-assets.credentials.v5';
const LEGACY_STORAGE_KEYS = ['lanhu-assets.credentials.v4', 'lanhu-assets.credentials.v3', 'lanhu-assets.credentials.v2'];
const CIPHER_KEY = 'obs-imageflow-credential-vault';
const encoder = new TextEncoder();
const decoder = new TextDecoder();

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}

function hashText(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function nextByte(state: { value: number }): number {
  state.value ^= state.value << 13;
  state.value ^= state.value >>> 17;
  state.value ^= state.value << 5;
  return state.value & 255;
}

function transformText(value: string | Uint8Array, salt: string): Uint8Array {
  const bytes = typeof value === 'string' ? encoder.encode(value) : value;
  const state = { value: hashText(`${CIPHER_KEY}:${salt}`) || 1 };
  return bytes.map((byte) => byte ^ nextByte(state));
}

function createSalt(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function encryptText(value: string, salt: string): string {
  return bytesToBase64(transformText(value || '', salt));
}

function decryptText(value: string, salt: string): string {
  return decoder.decode(transformText(base64ToBytes(value || ''), salt));
}

function removeLegacyCredentials(): void {
  LEGACY_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
}

interface VaultData {
  version: number;
  provider: string;
  folderUrl: string;
  endpoint: string;
  salt: string;
  accessKeyId: string;
  secretAccessKey: string;
}

export async function saveCredentials(credentials: StorageConfig): Promise<void> {
  const salt = createSalt();
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      version: 5,
      provider: credentials.provider || 'obs',
      folderUrl: credentials.folderUrl,
      endpoint: credentials.endpoint,
      salt,
      accessKeyId: encryptText(credentials.accessKeyId, salt),
      secretAccessKey: encryptText(credentials.secretAccessKey, salt),
    }),
  );
  removeLegacyCredentials();
}

export async function loadCredentials(): Promise<StorageConfig | null> {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      const vault: VaultData = JSON.parse(raw);
      return {
        provider: (vault.provider || 'obs') as CloudProvider,
        folderUrl: vault.folderUrl || '',
        endpoint: vault.endpoint || '',
        accessKeyId: decryptText(vault.accessKeyId, vault.salt),
        secretAccessKey: decryptText(vault.secretAccessKey, vault.salt),
      };
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
  }

  const legacyRaw = LEGACY_STORAGE_KEYS.map((key) => localStorage.getItem(key)).find(Boolean);
  if (!legacyRaw) return null;

  try {
    const legacyVault = JSON.parse(legacyRaw);
    return legacyVault.credentials || null;
  } catch {
    removeLegacyCredentials();
    return null;
  }
}
