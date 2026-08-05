import { useState, useMemo, useCallback } from "react";
import { Search, RefreshCw, ArrowUp, ArrowDown, Eye, Pencil, Trash2, Copy, LayoutGrid, List } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../components/ui/table";
import { cn } from "../lib/utils";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { formatBytes, formatDate, getFileName } from "../utils/format";
import ImagePreviewModal from "./ImagePreviewModal";
import ConfirmDialog from "./ConfirmDialog";
import EmptyState from "./EmptyState";
import type { StorageObject, CopyMode, SortDirection } from "../types";

const COPY_MODES: CopyMode[] = ["url", "css"];

type ViewMode = "card" | "table";

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
    try {
      const stored = localStorage.getItem("obs-copy-mode");
      if (stored === "url" || stored === "css") return stored;
      return "css";
    } catch { return "css"; }
  });
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    try {
      const stored = localStorage.getItem("obs-view-mode");
      if (stored === "card" || stored === "table") return stored;
      return "table";
    } catch { return "table"; }
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
  const handleViewMode = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem("obs-view-mode", mode);
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
      const original = getFileName(renameTarget!.Key);
      const dot = original.lastIndexOf(".");
      const ext = dot > 0 ? original.slice(dot) : "";
      await onRename(renameTarget!, renameDraft + ext);
      setRenameTarget(null);
    } catch (err) {
      setRenameError(err instanceof Error ? err.message : "重命名失败");
    }
  }

  function openRename(obj: StorageObject) {
    setRenameTarget(obj);
    const name = getFileName(obj.Key);
    const dot = name.lastIndexOf(".");
    setRenameDraft(dot > 0 ? name.slice(0, dot) : name);
    setRenameError("");
  }

  return (
    <section className="flex min-h-0 flex-1 min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-card">
      {/* Toolbar */}
      <div className="shrink-0 flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h2 className="font-display text-lg tracking-tight">文件目录</h2>
          <span className="text-xs text-muted-foreground">
            {debouncedSearch ? `${sortedObjects.length} / ${objects.length}` : objects.length} 项
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Copy mode */}
          <div className="flex items-center rounded-lg border border-border bg-muted/50 p-0.5 text-xs">
            {(COPY_MODES).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => handleCopyMode(mode)}
                className={cn(
                  "rounded-md px-2.5 py-1 font-medium transition",
                  copyMode === mode
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {mode === "url" ? "URL" : "CSS"}
              </button>
            ))}
          </div>

          {/* View toggle */}
          <div className="flex items-center rounded-lg border border-border bg-muted/50 p-0.5">
            <button
              type="button"
              onClick={() => handleViewMode("card")}
              className={cn(
                "rounded-md px-2 py-1 transition",
                viewMode === "card"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title="卡片视图"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleViewMode("table")}
              className={cn(
                "rounded-md px-2 py-1 transition",
                viewMode === "table"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title="表格视图"
            >
              <List className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/50" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="搜索名称"
              className="w-[150px] pl-8 text-xs h-8"
            />
          </div>

          {connected && (
            <Button variant="ghost" size="icon-sm" onClick={onRefresh} disabled={isLoading} title="刷新">
              <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      {objects.length ? (
        viewMode === "card" ? (
          /* ── Card Grid View ── */
          <div className="pretty-scrollbar min-h-0 flex-1 overflow-auto p-4">
            <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
              {sortedObjects.map((obj) => {
                const fileName = getFileName(obj.Key);
                const copyValue = getCopyValue(obj);
                const isCopied = copiedText === copyValue;
                return (
                  <div
                    key={obj.Key}
                    className="group editor-card overflow-hidden animate-in"
                  >
                    {/* Thumbnail */}
                    <button
                      type="button"
                      onClick={() => setPreview({ src: obj.httpsUrl!, alt: fileName })}
                      className="relative block w-full overflow-hidden bg-muted/50"
                      style={{ aspectRatio: "4/3" }}
                    >
                      <img
                        src={obj.httpsUrl}
                        alt={fileName}
                        className="h-full w-full object-contain transition duration-300 group-hover:scale-105"
                        loading="lazy"
                      />
                    </button>

                    {/* Info */}
                    <div className="p-3">
                      <p
                        className="truncate text-sm font-medium cursor-pointer hover:text-primary transition-colors"
                        onClick={() => onCopy(fileName.replace(/\.[^.]+$/, ""))}
                        title="点击复制名称"
                      >
                        {fileName}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {formatBytes(Number(obj.Size))}
                      </p>

                      {/* Copy button */}
                      <button
                        type="button"
                        onClick={() => onCopy(copyValue)}
                        className={cn(
                          "mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all",
                          isCopied
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-border bg-muted/30 text-muted-foreground hover:border-primary/30 hover:text-primary"
                        )}
                      >
                        <Copy className="h-3 w-3" />
                        {isCopied ? "已复制" : copyMode === "css" ? "复制 CSS" : "复制链接"}
                      </button>
                    </div>

                    {/* Actions menu */}
                    <div className="relative flex items-center justify-end gap-1 border-t border-border px-2 py-1.5">
                      <Button variant="ghost" size="icon-sm" onClick={() => setPreview({ src: obj.httpsUrl!, alt: fileName })} title="预览">
                        <Eye className="h-3.5 w-3.5 text-blue-500" />
                      </Button>
                      <Button variant="ghost" size="icon-sm" onClick={() => openRename(obj)} disabled={renamingKey === obj.Key} title="重命名">
                        <Pencil className="h-3.5 w-3.5 text-amber-500" />
                      </Button>
                      <Button variant="ghost" size="icon-sm" onClick={() => setDeleteTarget(obj)} disabled={deletingKey === obj.Key} title="删除">
                        <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* ── Table View ── */
          <div className="pretty-scrollbar min-h-0 flex-1 overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-muted/30">
                <TableRow>
                  <TableHead className="w-[28%]">名称（<b>名称</b>点击复制，<b>图片</b>点击预览）</TableHead>
                  <TableHead className="w-[8%]">大小</TableHead>
                  <TableHead className="w-[14%]">
                    <button onClick={toggleSort} className="inline-flex items-center gap-1 hover:text-foreground transition-colors">
                      上传时间
                      {timeSort === "desc" ? <ArrowDown className="h-3 w-3 text-primary" /> : <ArrowUp className="h-3 w-3 text-primary" />}
                    </button>
                  </TableHead>
                  <TableHead className="w-[36%]">链接（链接可点击复制）</TableHead>
                  <TableHead className="w-[14%] text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedObjects.map((obj) => {
                  const fileName = getFileName(obj.Key);
                  const copyValue = getCopyValue(obj);
                  const isCopied = copiedText === copyValue;
                  return (
                    <TableRow key={obj.Key}>
                      <TableCell>
                        <div className="flex items-center gap-3 min-w-0">
                          <button
                            type="button"
                            onClick={() => setPreview({ src: obj.httpsUrl!, alt: fileName })}
                            className="h-8 w-8 shrink-0 overflow-hidden rounded-md bg-muted/50"
                          >
                            <img src={obj.httpsUrl} alt={fileName} className="h-full w-full object-cover" loading="lazy" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onCopy(fileName.replace(/\.[^.]+$/, ""))}
                            className={cn(
                              "truncate text-sm font-medium transition-colors text-left",
                              copiedText === fileName ? "text-emerald-600" : "hover:text-primary"
                            )}
                            title="点击复制名称"
                          >
                            {fileName}
                          </button>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{formatBytes(Number(obj.Size))}</TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(obj.LastModified)}</TableCell>
                      <TableCell className="max-w-0">
                        <button
                          type="button"
                          onClick={() => onCopy(copyValue)}
                          className={cn(
                            "block w-full truncate text-left font-mono text-xs transition-colors",
                            isCopied ? "text-emerald-600" : "text-muted-foreground hover:text-primary"
                          )}
                          title={copyMode === "css" ? "点击复制 CSS" : "点击复制链接"}
                        >
                          {copyValue}
                        </button>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon-sm" onClick={() => setPreview({ src: obj.httpsUrl!, alt: fileName })} title="预览">
                            <Eye className="h-3.5 w-3.5 text-blue-500" />
                          </Button>
                          <Button variant="ghost" size="icon-sm" onClick={() => openRename(obj)} disabled={renamingKey === obj.Key} title="重命名">
                            <Pencil className="h-3.5 w-3.5 text-amber-500" />
                          </Button>
                          <Button variant="ghost" size="icon-sm" onClick={() => setDeleteTarget(obj)} disabled={deletingKey === obj.Key} title="删除">
                            <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )
      ) : (
        <EmptyState title={connected ? "该目录暂时没有文件" : "尚未连接云存储目录"} description="连接后即可查看文件列表" />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 p-5" onClick={() => setRenameTarget(null)}>
          <div className="w-full max-w-[400px] rounded-2xl border border-border bg-card p-6 shadow-lg animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
            <div className="mb-5 flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <Pencil className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-display text-lg tracking-tight">修改文件名</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  当前文件：<span className="font-medium text-foreground">{getFileName(renameTarget.Key)}</span>
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
                  {renameError && <p className="mt-2 text-xs text-destructive">{renameError}</p>}
                </form>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setRenameTarget(null)} disabled={renamingKey === renameTarget.Key}>取消</Button>
              <Button onClick={confirmRename} disabled={renamingKey === renameTarget.Key}>
                {renamingKey === renameTarget.Key ? "修改中" : "确认修改"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
