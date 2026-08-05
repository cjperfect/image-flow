import { useState, useMemo, useCallback } from "react";
import { Search, RefreshCw, ArrowUpDown, ArrowUp, ArrowDown, Eye, Pencil, Trash2, Copy } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { cn } from "../lib/utils";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { formatBytes, formatDate, getFileName } from "../utils/format";
import ImagePreviewModal from "./ImagePreviewModal";
import ConfirmDialog from "./ConfirmDialog";
import EmptyState from "./EmptyState";
import type { StorageObject, CopyMode, SortDirection } from "../types";

interface ObjectTableProps {
  objects: StorageObject[];
  copiedText: string;
  connected: boolean;
  isLoading: boolean;
  deletingKey: string;
  renamingKey: string;
  onDelete: (object: StorageObject) => Promise<void>;
  onCopy: (text: string) => Promise<void>;
  onRefresh: () => Promise<void>;
  onRename: (object: StorageObject, nextName: string) => Promise<void>;
}

export default function ObjectTable({
  objects, copiedText, connected, isLoading, deletingKey, renamingKey,
  onDelete, onCopy, onRefresh, onRename,
}: ObjectTableProps) {
  const [timeSort, setTimeSort] = useState<SortDirection>("desc");
  const [searchTerm, setSearchTerm] = useState("");
  const [copyMode, setCopyMode] = useState<CopyMode>(() => {
    try { return (localStorage.getItem("obs-copy-mode") as CopyMode) || "css"; }
    catch { return "css"; }
  });
  const [preview, setPreview] = useState<{ src: string; alt: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StorageObject | null>(null);
  const [renameTarget, setRenameTarget] = useState<StorageObject | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [renameError, setRenameError] = useState("");

  const debouncedSearch = useDebouncedValue(searchTerm.trim().toLowerCase(), 250);

  const sortedObjects = useMemo(() => {
    const filtered = debouncedSearch
      ? objects.filter((o) => getFileName(o.Key).toLowerCase().includes(debouncedSearch))
      : objects;
    return [...filtered].sort((a, b) => {
      const diff = new Date(a.LastModified).getTime() - new Date(b.LastModified).getTime();
      return timeSort === "desc" ? -diff : diff;
    });
  }, [objects, debouncedSearch, timeSort]);

  const toggleSort = useCallback(() => setTimeSort((s) => (s === "desc" ? "asc" : "desc")), []);
  const handleCopyMode = useCallback((mode: CopyMode) => {
    setCopyMode(mode);
    localStorage.setItem("obs-copy-mode", mode);
  }, []);

  function getCopyValue(obj: StorageObject) {
    return copyMode === "css"
      ? `background-image: url('${obj.httpsUrl}');\nbackground-size: 100% 100%;`
      : obj.httpsUrl!;
  }

  async function confirmRename(e: React.FormEvent) {
    e.preventDefault();
    setRenameError("");
    try {
      await onRename(renameTarget!, renameDraft);
      setRenameTarget(null);
    } catch (err) { setRenameError((err as Error).message || "重命名失败"); }
  }

  function openRename(obj: StorageObject) {
    setRenameTarget(obj);
    setRenameDraft(getFileName(obj.Key));
    setRenameError("");
  }

  return (
    <section className="glass-panel flex min-h-[520px] flex-col overflow-hidden rounded-[28px] lg:min-h-0">
      {/* Toolbar */}
      <div className="flex flex-col gap-2 border-b border-white/55 px-6 py-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-slate-950">目录文件</h2>
          <p className="mt-1 text-sm text-slate-500">选择复制链接或CSS样式，点击即可复制</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="搜索名称"
              className="w-[180px] pl-9 text-xs"
            />
          </div>
          <span className="text-sm text-slate-400">
            {debouncedSearch ? `${sortedObjects.length} / ${objects.length}` : objects.length} 个对象
          </span>
          {connected && (
            <Button variant="glass" size="sm" onClick={onRefresh} disabled={isLoading}>
              <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
              {isLoading ? "刷新中" : "刷新"}
            </Button>
          )}
        </div>
      </div>

      {objects.length ? (
        <div className="pretty-scrollbar min-h-0 flex-1 overflow-auto">
          <table className="w-full table-fixed border-collapse text-left">
            <colgroup>
              <col className="w-[6%]" />
              <col className="w-[18%]" />
              <col className="w-[9%]" />
              <col className="w-[16%]" />
              <col className="w-[41%]" />
              <col className="w-[10%]" />
            </colgroup>
            <thead className="sticky top-0 z-10 border-b border-white/55 bg-white/70 text-xs font-medium uppercase tracking-wider text-slate-400 backdrop-blur-xl">
              <tr>
                <th className="px-5 py-4">序号</th>
                <th className="px-5 py-4">名称</th>
                <th className="px-4 py-4">大小</th>
                <th className="px-4 py-4">
                  <button onClick={toggleSort} className="inline-flex items-center gap-1 rounded-md px-1 py-0.5 hover:bg-white/60 hover:text-slate-600">
                    上传时间
                    {timeSort === "desc" ? <ArrowDown className="h-3 w-3 text-blue-500" /> : <ArrowUp className="h-3 w-3 text-blue-500" />}
                  </button>
                </th>
                <th className="px-4 py-4">
                  <div className="flex items-center gap-2">
                    <span>图片链接</span>
                    <div className="flex items-center gap-1.5 text-[11px] font-normal">
                      {(["url", "css"] as CopyMode[]).map((mode) => (
                        <label key={mode} className="flex cursor-pointer items-center gap-1 rounded-md px-1.5 py-0.5 text-blue-600/80 hover:bg-white/60">
                          <input type="radio" name="copyMode" checked={copyMode === mode} onChange={() => handleCopyMode(mode)} className="h-3 w-3 accent-blue-600" />
                          {mode === "url" ? "复制链接" : "复制CSS"}
                        </label>
                      ))}
                    </div>
                  </div>
                </th>
                <th className="px-5 py-4 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/55">
              {sortedObjects.map((obj, i) => {
                const fileName = getFileName(obj.Key);
                const copyValue = getCopyValue(obj);
                const isCopied = copiedText === copyValue;
                return (
                  <tr key={obj.Key} className="group transition-colors hover:bg-white/30">
                    <td className="px-5 py-4 text-sm font-medium text-slate-400">{i + 1}</td>
                    <td className="min-w-0 px-5 py-4">
                      <div className="name-preview-trigger relative inline-flex max-w-full">
                        <button
                          type="button"
                          onClick={() => onCopy(fileName.replace(/\.[^.]+$/, ""))}
                          className={cn(
                            "name-preview-text inline-block max-w-full truncate rounded-md px-1 py-0.5 text-left text-sm font-medium transition",
                            copiedText === fileName ? "bg-emerald-50/80 text-emerald-700" : "text-slate-800 hover:bg-white/60 hover:text-blue-700"
                          )}
                          title="点击复制名称"
                        >
                          {fileName}
                        </button>
                        <div className="preview-popover pointer-events-none absolute left-full top-0 z-20 ml-3 w-[220px] overflow-hidden rounded-xl border border-white/80 bg-white/90 p-2 opacity-0 shadow-xl backdrop-blur transition">
                          <button type="button" onClick={() => setPreview({ src: obj.httpsUrl!, alt: fileName })} className="pointer-events-auto flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-lg bg-slate-100">
                            <img src={obj.httpsUrl} alt={fileName} className="h-full w-full object-contain" loading="lazy" />
                          </button>
                          <p className="mt-2 truncate px-1 text-xs font-medium text-slate-700">{fileName}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-600">{formatBytes(Number(obj.Size))}</td>
                    <td className="px-4 py-4 text-sm text-slate-600">{formatDate(obj.LastModified)}</td>
                    <td className="min-w-0 px-4 py-4">
                      <button
                        type="button"
                        onClick={() => onCopy(copyValue)}
                        className={cn(
                          "glass-inset flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left font-mono text-xs transition",
                          isCopied ? "border-emerald-200 bg-emerald-50/70 text-emerald-700" : "text-blue-700 hover:bg-white/55"
                        )}
                      >
                        <span className="min-w-0 truncate">{copyValue}</span>
                        <span className="flex shrink-0 items-center gap-1 font-sans text-[11px] font-semibold">
                          <Copy className="h-3 w-3" />
                          {isCopied ? "已复制" : "复制"}
                        </span>
                      </button>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon-sm" onClick={() => setPreview({ src: obj.httpsUrl!, alt: fileName })} title="预览">
                          <Eye className="h-4 w-4 text-blue-600" />
                        </Button>
                        <Button variant="ghost" size="icon-sm" onClick={() => openRename(obj)} disabled={renamingKey === obj.Key} title="编辑">
                          <Pencil className="h-4 w-4 text-amber-600" />
                        </Button>
                        <Button variant="ghost" size="icon-sm" onClick={() => setDeleteTarget(obj)} disabled={deletingKey === obj.Key} title="删除">
                          <Trash2 className="h-4 w-4 text-rose-500" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState title={connected ? "该目录暂时没有文件" : "尚未连接云存储目录"} description="连接后，这里将以表格展示名称、大小、上传时间与地址" />
      )}

      {/* Image Preview Modal */}
      {preview && (
        <ImagePreviewModal
          open={!!preview}
          src={preview.src}
          alt={preview.alt}
          onClose={() => setPreview(null)}
        />
      )}

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="确认删除图片？"
        description={`将删除 ${deleteTarget ? getFileName(deleteTarget.Key) : ""}，删除后不可恢复。`}
        confirmLabel={deletingKey === deleteTarget?.Key ? "删除中" : "确认删除"}
        loading={deletingKey === deleteTarget?.Key}
        onConfirm={() => { onDelete(deleteTarget!); setDeleteTarget(null); }}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Rename Dialog */}
      {renameTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-700/20 p-5 backdrop-blur-md" onClick={() => setRenameTarget(null)}>
          <div className="glass-modal w-full max-w-[420px] rounded-[26px] p-6 animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
            <div className="mb-5 flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-500">
                <Pencil className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-semibold tracking-tight text-slate-950">修改文件名</h3>
                <p className="mt-1 text-sm text-slate-500">
                  当前文件：<span className="font-medium text-slate-800">{getFileName(renameTarget.Key)}</span>
                </p>
                <form onSubmit={confirmRename} className="mt-3">
                  <Input
                    autoFocus
                    value={renameDraft}
                    onChange={(e) => setRenameDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Escape") setRenameTarget(null); }}
                    disabled={renamingKey === renameTarget.Key}
                    placeholder="输入新的文件名"
                  />
                  {renameError && <p className="mt-2 text-xs text-rose-600">{renameError}</p>}
                </form>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setRenameTarget(null)} disabled={renamingKey === renameTarget.Key}>取消</Button>
              <Button variant="default" className="!bg-amber-500 hover:!bg-amber-600 shadow-amber-500/20" onClick={confirmRename} disabled={renamingKey === renameTarget.Key}>
                {renamingKey === renameTarget.Key ? "修改中" : "确认修改"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
