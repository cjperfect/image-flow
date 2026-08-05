import { useEffect, useRef, useReducer, useCallback } from "react";
import AppHeader from "./components/AppHeader";
import ConfigModal from "./components/ConfigModal";
import DropOverlay from "./components/DropOverlay";
import NoticeBanner from "./components/NoticeBanner";
import StatsGrid from "./components/StatsGrid";
import UploadQueue from "./components/UploadQueue";
import ObjectTable from "./components/ObjectTable";
import { loadCredentials, saveCredentials } from "./lib/credentialVault";
import { loadCompressionMode, saveCompressionMode } from "./lib/compressionPreference";
import { clearFolderHistory, loadFolderHistory, removeFolderFromHistory, saveFolderToHistory } from "./lib/folderHistory";
import { loadNamingPrefix, loadNamingStartIndex, saveNamingPrefix, saveNamingStartIndex } from "./lib/namingPreference";
import { buildObjectLinks, createClient, deleteObject, listObjects, parseFolderUrl, renameObject, uploadObject } from "./lib/storage";
import { compressImage } from "./lib/compress";
import { useDragDrop } from "./hooks/useDragDrop";
import { useCopyToClipboard } from "./hooks/useCopyToClipboard";
import { createId } from "./utils/id";
import { Toaster, toast } from "./components/ui/toast";
import type { StorageConfig, StorageObject, UploadItem, CompressionMode, CloudProvider } from "./types";

const MAX_PARALLEL_UPLOADS = 3;
const PROVIDER_NAMES: Record<CloudProvider, string> = { obs: "OBS", oss: "OSS" };

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

// ─── App Component ──────────────────────────────────

export default function App() {
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

  const [prefs, setPrefs] = useReducer(
    (s: { compressionMode: CompressionMode; folderHistory: string[]; namingPrefix: string; namingStartIndex: number },
     a: Partial<typeof s>) => ({ ...s, ...a }),
    {
      compressionMode: loadCompressionMode(),
      folderHistory: loadFolderHistory(),
      namingPrefix: loadNamingPrefix(),
      namingStartIndex: loadNamingStartIndex(),
    }
  );

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
        setPrefs({ folderHistory: saveFolderToHistory(saved.folderUrl) });
      } catch (err) {
        if (!mounted) return;
        const msg = (err as Error).message || "自动连接失败";
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
      setPrefs({ folderHistory: saveFolderToHistory(cfg.folderUrl) });
      dispatchConn({ type: "CONNECTION_SUCCESS", folderUrl: cfg.folderUrl.trim(), objects: items.map((item) => ({ ...item, ...buildObjectLinks(cfg, folder.bucket, item.Key) })), notice: `已连接 ${folder.bucket}，读取到 ${items.length} 个文件，凭据已保存` });
    } catch (err) {
      dispatchConn({ type: "CONNECTION_ERROR", message: (err as Error).message || "连接失败" });
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
      dispatchConn({ type: "SET_NOTICE", notice: (err as Error).message || "刷新失败" });
    }
  }

  // ─── Upload ───────────────────────────────────────

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
          dispatchUpload({ type: "PATCH_ITEM", id: item.id, patch: { status: "error", error: (err as Error).message || "处理失败" } });
        }
      }
    });
    try {
      await Promise.all(workers);
      dispatchConn({ type: "SET_NOTICE", notice: "批量任务已处理完成，可在文件表格中复制地址" });
    } finally {
      dispatchUpload({ type: "BATCH_END" });
    }
  }

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
      toast((err as Error).message || "删除失败");
      throw err;
    } finally {
      setPendingOps({ deletingKey: "" });
    }
  }

  // ─── Prefs ────────────────────────────────────────

  const updatePref = useCallback(<K extends keyof typeof prefs>(key: K, value: typeof prefs[K]) => {
    setPrefs({ [key]: value });
    if (key === "compressionMode") saveCompressionMode(value as CompressionMode);
    if (key === "namingPrefix") saveNamingPrefix(value as string);
    if (key === "namingStartIndex") saveNamingStartIndex(value as number);
  }, []);

  // ─── Drag & Drop ──────────────────────────────────

  const { isDragging, handleDragEnter, handleDragOver, handleDragLeave, handleDrop } = useDragDrop(addFiles);

  // ─── Derived ──────────────────────────────────────

  const successfulUploads = upload.queue.filter((i) => i.status === "success").length;
  const savedBytes = upload.queue.reduce((t, i) => t + Math.max(0, (i.originalSize || 0) - (i.compressedSize || 0)), 0);

  // ─── Render ───────────────────────────────────────

  return (
    <main
      className="liquid-stage min-h-screen text-slate-800 lg:h-screen lg:overflow-hidden"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="liquid-orb left-[2%] top-[8%] h-[360px] w-[360px] bg-cyan-300/50" />
      <div className="liquid-orb right-[3%] top-[20%] h-[430px] w-[430px] bg-violet-300/45" />
      <div className="liquid-orb bottom-[-8%] left-[35%] h-[470px] w-[470px] bg-blue-300/40" />
      <div className="relative mx-auto flex w-full max-w-[1900px] flex-col px-3 py-3 md:px-5 md:py-4 lg:h-full">
        <AppHeader
          activeFolderUrl={conn.activeFolderUrl}
          connected={conn.connected}
          onOpenConfig={() => dispatchConn({ type: "TOGGLE_CONFIG", open: true })}
          provider={conn.config.provider}
        />

        <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[360px_minmax(0,1fr)] xl:grid-cols-[390px_minmax(0,1fr)]">
          <aside className="flex min-h-0 flex-col gap-4 lg:overflow-hidden">
            <StatsGrid
              connected={conn.connected}
              objectCount={conn.objects.length}
              queueCount={upload.queue.length}
              savedBytes={savedBytes}
              successfulUploads={successfulUploads}
            />
            <NoticeBanner connected={conn.connected} notice={conn.notice} />
            <UploadQueue
              items={upload.queue}
              copiedText={copiedText}
              isUploading={upload.isUploading}
              compressionMode={prefs.compressionMode}
              namingPrefix={prefs.namingPrefix}
              namingStartIndex={prefs.namingStartIndex}
              onCopy={copyText}
              onCompressionModeChange={(m) => updatePref("compressionMode", m)}
              onNamingPrefixChange={(p) => updatePref("namingPrefix", p)}
              onNamingStartIndexChange={(i) => updatePref("namingStartIndex", i)}
              onSelectFiles={addFiles}
            />
          </aside>

          <ObjectTable
            objects={conn.objects}
            copiedText={copiedText}
            connected={conn.connected}
            isLoading={conn.isLoading}
            deletingKey={pendingOps.deletingKey}
            renamingKey={pendingOps.renamingKey}
            onDelete={deleteFile}
            onCopy={copyText}
            onRefresh={refreshObjects}
            onRename={renameFile}
          />
        </div>
      </div>

      <ConfigModal
        config={conn.config}
        activeFolderUrl={conn.activeFolderUrl}
        folderHistory={prefs.folderHistory}
        isLoading={conn.isLoading}
        isOpen={conn.isConfigOpen}
        errorMessage={conn.error}
        onChange={(field, value) => dispatchConn({ type: "SET_CONFIG", field, value })}
        onConnect={connectAndList}
        onClose={() => dispatchConn({ type: "TOGGLE_CONFIG", open: false })}
        onClearFolderHistory={() => setPrefs({ folderHistory: clearFolderHistory(conn.activeFolderUrl) })}
        onDeleteFolderHistoryItem={(url) => setPrefs({ folderHistory: removeFolderFromHistory(url) })}
      />
      <DropOverlay activeFolderUrl={conn.activeFolderUrl} visible={isDragging} />
      <Toaster />
    </main>
  );
}
