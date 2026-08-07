import { useEffect, useRef, useReducer, useCallback, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { loadCredentials, saveCredentials } from "../lib/credentialVault";
import { loadCompressionMode, saveCompressionMode } from "../lib/compressionPreference";
import { clearFolderHistory, loadFolderHistory, removeFolderFromHistory, saveFolderToHistory } from "../lib/folderHistory";
import { loadNamingPrefix, loadNamingStartIndex, saveNamingPrefix, saveNamingStartIndex } from "../lib/namingPreference";
import { buildObjectLinks, createClient, deleteObject, listObjects, parseFolderUrl, renameObject, uploadObject } from "../lib/storage";
import { compressImage } from "../lib/compress";
import { useDragDrop } from "./useDragDrop";
import { useCopyToClipboard } from "./useCopyToClipboard";
import { createId } from "../utils/id";
import { toast } from "../components/ui/toast";
import type { StorageConfig, StorageObject, UploadItem, CompressionMode, CloudProvider } from "../types";

const MAX_PARALLEL_UPLOADS = 3;

function getErrorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

const initialConfig: StorageConfig = {
  provider: "obs",
  folderUrl: "",
  endpoint: import.meta.env.VITE_OBS_ENDPOINT || "https://obs.cn-south-1.myhuaweicloud.com",
  accessKeyId: "",
  secretAccessKey: "",
};

// ─── Reducers ───────────────────────────────────────

interface ConnectionState {
  config: StorageConfig;
  activeFolderUrl: string;
  objects: StorageObject[];
  connected: boolean;
  isLoading: boolean;
  isConfigOpen: boolean;
  error: string;
  notice: string;
}

type ConnectionAction =
  | { type: "SET_CONFIG"; field: keyof StorageConfig; value: string }
  | { type: "RESTORE_CONFIG"; payload: StorageConfig }
  | { type: "SET_OBJECTS"; payload: StorageObject[] }
  | { type: "ADD_OBJECT"; payload: StorageObject }
  | { type: "UPDATE_OBJECT"; key: string; updates: Partial<StorageObject> }
  | { type: "REMOVE_OBJECT"; key: string }
  | { type: "CONNECTION_START" }
  | { type: "CONNECTION_SUCCESS"; folderUrl: string; objects: StorageObject[]; notice: string }
  | { type: "CONNECTION_ERROR"; message: string }
  | { type: "TOGGLE_CONFIG"; open: boolean }
  | { type: "SET_NOTICE"; notice: string };

function connectionReducer(state: ConnectionState, action: ConnectionAction): ConnectionState {
  switch (action.type) {
    case "SET_CONFIG":
      return { ...state, config: { ...state.config, [action.field]: action.value } };
    case "RESTORE_CONFIG":
      return { ...state, config: action.payload, isLoading: false };
    case "SET_OBJECTS":
      return { ...state, objects: action.payload, isLoading: false };
    case "ADD_OBJECT":
      return { ...state, objects: [action.payload, ...state.objects.filter((o) => o.Key !== action.payload.Key)] };
    case "UPDATE_OBJECT":
      return { ...state, objects: state.objects.map((o) => o.Key === action.key ? { ...o, ...action.updates } : o) };
    case "REMOVE_OBJECT":
      return { ...state, objects: state.objects.filter((o) => o.Key !== action.key) };
    case "CONNECTION_START":
      return { ...state, isLoading: true, error: "", notice: "" };
    case "CONNECTION_SUCCESS":
      return { ...state, isLoading: false, connected: true, error: "",
        activeFolderUrl: action.folderUrl, objects: action.objects, isConfigOpen: false, notice: action.notice };
    case "CONNECTION_ERROR":
      return { ...state, isLoading: false, error: action.message, notice: action.message };
    case "TOGGLE_CONFIG":
      return { ...state, isConfigOpen: action.open };
    case "SET_NOTICE":
      return { ...state, notice: action.notice };
    default:
      return state;
  }
}

interface UploadState {
  queue: UploadItem[];
  isUploading: boolean;
  activeBatches: number;
}

type UploadAction =
  | { type: "ADD_ITEMS"; items: UploadItem[] }
  | { type: "PATCH_ITEM"; id: string; patch: Partial<UploadItem> }
  | { type: "BATCH_START" }
  | { type: "BATCH_END" };

function uploadReducer(state: UploadState, action: UploadAction): UploadState {
  switch (action.type) {
    case "ADD_ITEMS":
      return { ...state, queue: [...state.queue, ...action.items] };
    case "PATCH_ITEM":
      return { ...state, queue: state.queue.map((item) => item.id === action.id ? { ...item, ...action.patch } : item) };
    case "BATCH_START":
      return { ...state, isUploading: true, activeBatches: state.activeBatches + 1 };
    case "BATCH_END": {
      const batches = state.activeBatches - 1;
      return { ...state, activeBatches: batches, isUploading: batches > 0 };
    }
    default:
      return state;
  }
}

// ─── Helpers ─────────────────────────────────────────

interface DropFilePayload {
  name: string;
  size: number;
  type: string;
  base64: string;
}

function base64ToFile({ name, type, base64 }: DropFilePayload): File {
  const arr = base64.split(",");
  const mime = arr[0].match(/:(.*?);/)![1];
  const bstr = atob(arr[1]);
  const n = bstr.length;
  const u8arr = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    u8arr[i] = bstr.charCodeAt(i);
  }
  return new File([u8arr], name, { type: mime });
}

// ─── Hook ────────────────────────────────────────────

export function useApp() {
  const [conn, dispatchConn] = useReducer(connectionReducer, {
    config: initialConfig,
    activeFolderUrl: "",
    objects: [],
    connected: false,
    isLoading: true,
    isConfigOpen: false,
    error: "",
    notice: "正在恢复上次连接...",
  });

  const [upload, dispatchUpload] = useReducer(uploadReducer, {
    queue: [], isUploading: false, activeBatches: 0,
  });

  const [prefs, setPrefs] = useState<{
    compressionMode: CompressionMode;
    folderHistory: string[];
    namingPrefix: string;
    namingStartIndex: number;
  }>({
    compressionMode: "tinypng",
    folderHistory: [],
    namingPrefix: "",
    namingStartIndex: 1,
  });

  // Load persisted prefs asynchronously
  useEffect(() => {
    (async () => {
      const [mode, history, prefix, index] = await Promise.all([
        loadCompressionMode(),
        loadFolderHistory(),
        loadNamingPrefix(),
        loadNamingStartIndex(),
      ]);
      setPrefs({ compressionMode: mode, folderHistory: history, namingPrefix: prefix, namingStartIndex: index });
    })();
  }, []);

  const [pendingOps, setPendingOps] = useReducer(
    (s: { renamingKey: string; deletingKey: string }, a: Partial<{ renamingKey: string; deletingKey: string }>) => ({ ...s, ...a }),
    { renamingKey: "", deletingKey: "" }
  );

  const { copiedText, copyText } = useCopyToClipboard();
  const clientRef = useRef<any>(null);
  const folderRef = useRef<{ bucket: string; prefix: string } | null>(null);
  const activeConfigRef = useRef<StorageConfig | null>(null);

  // ─── Init ─────────────────────────────────────────

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const saved = await loadCredentials();
        if (!mounted) return;
        if (!saved) {
          dispatchConn({ type: "RESTORE_CONFIG", payload: initialConfig });
          dispatchConn({ type: "SET_NOTICE", notice: "" });
          dispatchConn({ type: "TOGGLE_CONFIG", open: true });
          return;
        }
        dispatchConn({ type: "RESTORE_CONFIG", payload: { ...initialConfig, ...saved } });
        const folder = parseFolderUrl({ ...initialConfig, ...saved });
        const client = await createClient({ ...initialConfig, ...saved });
        const items = await listObjects(client, { ...initialConfig, ...saved }, folder.bucket, folder.prefix);
        if (!mounted) return;
        clientRef.current = client;
        folderRef.current = folder;
        activeConfigRef.current = { ...initialConfig, ...saved };
        dispatchConn({ type: "CONNECTION_SUCCESS", folderUrl: saved.folderUrl.trim(), objects: items.map((item) => ({ ...item, ...buildObjectLinks({ ...initialConfig, ...saved }, folder.bucket, item.Key) })), notice: `已自动连接 ${folder.bucket}，读取到 ${items.length} 个文件` });
        const history = await saveFolderToHistory(saved.folderUrl);
        setPrefs((prev) => ({ ...prev, folderHistory: history }));
      } catch (err) {
        if (!mounted) return;
        const msg = getErrorMessage(err, "自动连接失败");
        dispatchConn({ type: "CONNECTION_ERROR", message: msg });
        dispatchConn({ type: "TOGGLE_CONFIG", open: true });
      }
    })();
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") dispatchConn({ type: "TOGGLE_CONFIG", open: false }); };
    window.addEventListener("keydown", onEsc);
    return () => { mounted = false; window.removeEventListener("keydown", onEsc); };
  }, []);

  // ─── Connection ───────────────────────────────────

  async function connectAndList() {
    dispatchConn({ type: "CONNECTION_START" });
    try {
      const cfg = conn.config;
      if (!cfg.accessKeyId || !cfg.secretAccessKey) throw new Error("请填写 Access Key ID 与 Secret Access Key");
      const folder = parseFolderUrl(cfg);
      const client = await createClient(cfg);
      const items = await listObjects(client, cfg, folder.bucket, folder.prefix);
      clientRef.current = client;
      folderRef.current = folder;
      activeConfigRef.current = { ...cfg };
      await saveCredentials(cfg);
      const history = await saveFolderToHistory(cfg.folderUrl);
      setPrefs((prev) => ({ ...prev, folderHistory: history }));
      dispatchConn({ type: "CONNECTION_SUCCESS", folderUrl: cfg.folderUrl.trim(), objects: items.map((item) => ({ ...item, ...buildObjectLinks(cfg, folder.bucket, item.Key) })), notice: `已连接 ${folder.bucket}，读取到 ${items.length} 个文件，凭据已保存` });
    } catch (err) {
      dispatchConn({ type: "CONNECTION_ERROR", message: getErrorMessage(err, "连接失败") });
    }
  }

  async function refreshObjects() {
    if (!clientRef.current || !folderRef.current || !activeConfigRef.current) return;
    dispatchConn({ type: "CONNECTION_START" });
    try {
      const items = await listObjects(clientRef.current, activeConfigRef.current, folderRef.current.bucket, folderRef.current.prefix);
      dispatchConn({ type: "SET_OBJECTS", payload: items.map((item) => ({ ...item, ...buildObjectLinks(activeConfigRef.current!, folderRef.current!.bucket, item.Key) })) });
      dispatchConn({ type: "SET_NOTICE", notice: `目录已刷新，共 ${items.length} 个文件` });
    } catch (err) {
      dispatchConn({ type: "SET_NOTICE", notice: getErrorMessage(err, "刷新失败") });
    }
  }

  // ─── Upload ───────────────────────────────────────

  async function processBatch(items: UploadItem[]) {
    if (!items.length) return;
    dispatchUpload({ type: "BATCH_START" });
    let next = 0;
    const workers = Array.from({ length: Math.min(MAX_PARALLEL_UPLOADS, items.length) }, async () => {
      while (next < items.length) {
        const item = items[next++];
        try {
          dispatchUpload({ type: "PATCH_ITEM", id: item.id, patch: { status: "compressing", error: "" } });
          const compressed = await compressImage(item.file, item.compressionMode);
          dispatchUpload({ type: "PATCH_ITEM", id: item.id, patch: { status: "uploading", ...compressed } });
          const key = `${folderRef.current!.prefix}${item.name}`;
          await uploadObject(clientRef.current, activeConfigRef.current!, folderRef.current!.bucket, key, compressed.blob);
          const links = buildObjectLinks(activeConfigRef.current!, folderRef.current!.bucket, key);
          dispatchUpload({ type: "PATCH_ITEM", id: item.id, patch: { status: "success", key, ...links } });
          dispatchConn({ type: "ADD_OBJECT", payload: { Key: key, Size: compressed.compressedSize, LastModified: new Date().toISOString(), ...links } });
        } catch (err) {
          dispatchUpload({ type: "PATCH_ITEM", id: item.id, patch: { status: "error", error: getErrorMessage(err, "处理失败") } });
        }
      }
    });
    try {
      await Promise.all(workers);
      dispatchConn({ type: "SET_NOTICE", notice: "批量任务已处理完成，可在文件目录中复制地址" });
    } finally {
      dispatchUpload({ type: "BATCH_END" });
    }
  }

  const addFiles = useCallback((fileList: FileList) => {
    if (!conn.connected) {
      dispatchConn({ type: "SET_NOTICE", notice: "请先完成连接配置" });
      dispatchConn({ type: "TOGGLE_CONFIG", open: true });
      return;
    }
    const incoming = [...fileList].filter((f) => f.type.startsWith("image/"));
    const entries: UploadItem[] = incoming.map((file, i) => {
      const ext = file.name.includes(".") ? file.name.slice(file.name.lastIndexOf(".")) : "";
      const name = prefs.namingPrefix ? `${prefs.namingPrefix}${prefs.namingStartIndex + upload.queue.length + i}${ext}` : file.name;
      return { id: createId(), file, name, originalSize: file.size, previewUrl: URL.createObjectURL(file), compressionMode: prefs.compressionMode, status: "queued" };
    });
    dispatchUpload({ type: "ADD_ITEMS", items: entries });
    if (entries.length) {
      dispatchConn({ type: "SET_NOTICE", notice: `已加入 ${entries.length} 张图片，开始压缩上传` });
      processBatch(entries);
    }
  }, [conn.connected, prefs, upload.queue.length]);

  // ─── File Operations ──────────────────────────────

  async function renameFile(obj: StorageObject, nextName: string) {
    if (!clientRef.current || !folderRef.current || !activeConfigRef.current) throw new Error("请先连接云存储目录");
    const clean = nextName.trim();
    if (!clean) throw new Error("名称不能为空");
    if (/[\\/]/.test(clean)) throw new Error("名称不能包含路径分隔符");
    const currentName = obj.Key.split("/").filter(Boolean).pop() || obj.Key;
    if (clean === currentName) return;
    const prefix = obj.Key.includes("/") ? obj.Key.slice(0, obj.Key.lastIndexOf("/") + 1) : "";
    const nextKey = `${prefix}${clean}`;
    if (conn.objects.some((o) => o.Key === nextKey)) throw new Error("同名文件已存在");

    setPendingOps({ renamingKey: obj.Key });
    try {
      await renameObject(clientRef.current, activeConfigRef.current, folderRef.current.bucket, obj.Key, nextKey);
      const links = buildObjectLinks(activeConfigRef.current, folderRef.current.bucket, nextKey);
      dispatchConn({ type: "UPDATE_OBJECT", key: obj.Key, updates: { Key: nextKey, LastModified: new Date().toISOString(), ...links } });
      toast("名称已更新");
    } finally {
      setPendingOps({ renamingKey: "" });
    }
  }

  async function deleteFile(obj: StorageObject) {
    if (!clientRef.current || !folderRef.current || !activeConfigRef.current) throw new Error("请先连接云存储目录");
    setPendingOps({ deletingKey: obj.Key });
    try {
      await deleteObject(clientRef.current, activeConfigRef.current, folderRef.current.bucket, obj.Key);
      dispatchConn({ type: "REMOVE_OBJECT", key: obj.Key });
      toast("文件已删除");
    } catch (err) {
      toast.error(getErrorMessage(err, "删除失败"));
      throw err;
    } finally {
      setPendingOps({ deletingKey: "" });
    }
  }

  // ─── Prefs ────────────────────────────────────────

  const updatePref = useCallback(<K extends keyof typeof prefs>(key: K, value: typeof prefs[K]) => {
    setPrefs((prev) => ({ ...prev, [key]: value }));
    if (key === "compressionMode") void saveCompressionMode(value as CompressionMode);
    if (key === "namingPrefix") void saveNamingPrefix(value as string);
    if (key === "namingStartIndex") void saveNamingStartIndex(value as number);
  }, []);

  // ─── Drag & Drop ──────────────────────────────────

  const { isDragging, handleDragEnter, handleDragOver, handleDragLeave, handleDrop } = useDragDrop(addFiles);

  // Ref to avoid re-registering Tauri event listener when addFiles changes
  const addFilesRef = useRef(addFiles);
  addFilesRef.current = addFiles;

  // ── Drop Zone visibility from global mouse hook ────

  useEffect(() => {
    let unlistenEnter: (() => void) | undefined;
    let unlistenLeave: (() => void) | undefined;

    (async () => {
      try {
        unlistenEnter = await listen("imageflow:drag-enter", async () => {
          console.log("[dropzone] drag-enter received");
          try {
            const dropWin = await WebviewWindow.getByLabel("dropzone");
            if (dropWin) {
              console.log("[dropzone] showing window");
              await dropWin.show();
              await dropWin.setAlwaysOnTop(true);
            } else {
              console.log("[dropzone] window not found");
            }
          } catch (e) { console.error("[dropzone] show error:", e); }
        });

        unlistenLeave = await listen("imageflow:drag-leave", async () => {
          console.log("[dropzone] drag-leave received");
          try {
            const dropWin = await WebviewWindow.getByLabel("dropzone");
            if (dropWin) {
              console.log("[dropzone] hiding window");
              await dropWin.hide();
            }
          } catch (e) { console.error("[dropzone] hide error:", e); }
        });
      } catch { /* Tauri API not available */ }
    })();

    return () => {
      if (unlistenEnter) unlistenEnter();
      if (unlistenLeave) unlistenLeave();
    };
  }, []);

  // ── Listen for file drops from the desktop drop-zone window ──

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    (async () => {
      try {
        unlisten = await listen<DropFilePayload[]>("imageflow:drop", (event) => {
          const payload = event.payload;
          if (!payload || !payload.length) return;

          // Filter image files and convert base64 to File objects
          const files = payload
            .filter((f) => f.type.startsWith("image/"))
            .map(base64ToFile);

          if (!files.length) return;

          // Create a FileList via DataTransfer
          const dt = new DataTransfer();
          files.forEach((f) => dt.items.add(f));

          addFilesRef.current(dt.files);
        });
      } catch {
        // Tauri API not available (e.g., running in browser dev mode)
      }
    })();

    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  // ─── Derived ──────────────────────────────────────

  const successfulUploads = upload.queue.filter((i) => i.status === "success").length;
  const savedBytes = upload.queue.reduce((t, i) => t + Math.max(0, (i.originalSize || 0) - (i.compressedSize || 0)), 0);

  return {
    conn,
    dispatchConn,
    upload,
    prefs,
    setPrefs,
    pendingOps,
    copiedText,
    copyText,
    isDragging,
    handleDragEnter,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    successfulUploads,
    savedBytes,
    connectAndList,
    refreshObjects,
    addFiles,
    renameFile,
    deleteFile,
    updatePref,
    clearFolderHistory,
    removeFolderFromHistory,
  };
}
