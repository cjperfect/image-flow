import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { formatBytes, formatDate, getFileName } from "../utils/format";

function PreviewName({ copied, object, onCopy, onPreview }) {
  const fileName = getFileName(object.Key);

  return (
    <div className="name-preview-trigger relative inline-flex max-w-full">
      <button
        type="button"
        onClick={() => onCopy(fileName.replace(/\.[^.]+$/, ""))}
        className={`name-preview-text inline-block max-w-full truncate rounded-md px-1 py-0.5 text-left text-sm font-medium transition ${
          copied ? "bg-emerald-50/80 text-emerald-700" : "text-slate-800 hover:bg-white/60 hover:text-blue-700"
        }`}
        title="点击复制名称"
      >
        {fileName}
      </button>
      <div className="preview-popover pointer-events-none absolute left-full top-0 z-20 ml-3 w-[220px] overflow-hidden rounded-xl border border-white/80 bg-white/90 p-2 opacity-0 shadow-xl shadow-slate-900/10 backdrop-blur transition">
        <button
          type="button"
          onClick={() => onPreview(object)}
          className="pointer-events-auto flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-lg bg-slate-100"
          title="点击预览"
        >
          <img src={object.httpsUrl} alt={fileName} className="h-full w-full object-contain" loading="lazy" />
        </button>
        <p className="mt-2 truncate px-1 text-xs font-medium text-slate-700">{fileName}</p>
      </div>
    </div>
  );
}

function CopyButton({ copiedText, httpsUrl, copyMode, onCopy }) {
  const copyValue =
    copyMode === "css"
      ? `background-image: url('${httpsUrl}');
    background-size: 100% 100%;`
      : httpsUrl;
  const isCopied = copiedText === copyValue;

  return (
    <button
      type="button"
      title={
        copyMode === "css"
          ? `background-image: url('${httpsUrl}');
background-size: 100% 100%;`
          : httpsUrl
      }
      onClick={() => onCopy(copyValue)}
      className={`glass-inset flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left font-mono text-xs transition ${
        isCopied ? "border-emerald-200 bg-emerald-50/70 text-emerald-700" : "text-blue-700 hover:bg-white/55"
      }`}
    >
      <span className="min-w-0 truncate">{copyValue}</span>
      <span className="shrink-0 font-sans text-[11px] font-semibold">
        {isCopied ? "已复制" : copyMode === "css" ? "复制CSS" : "复制"}
      </span>
    </button>
  );
}

export default function ObjectTable({
  objects,
  copiedText,
  connected,
  deletingKey,
  isLoading,
  renamingKey,
  onCopy,
  onDelete,
  onRefresh,
  onRename,
}) {
  const [timeSort, setTimeSort] = useState("desc");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [previewImage, setPreviewImage] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [renameTarget, setRenameTarget] = useState(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [renameError, setRenameError] = useState("");
  const [previewScale, setPreviewScale] = useState(1);
  const [previewSize, setPreviewSize] = useState({ width: 0, height: 0 });
  const [copyMode, setCopyMode] = useState(() => {
    try {
      const saved = localStorage.getItem("obs-copy-mode");
      return saved === "url" ? "url" : "css";
    } catch {
      return "css";
    }
  });
  const [previewPan, setPreviewPan] = useState({ x: 0, y: 0 });
  const [isPreviewDragging, setIsPreviewDragging] = useState(false);
  const previewViewportRef = useRef(null);
  const previewDragRef = useRef(null);
  const fitPreviewToViewport = (size = previewSize) => {
    const viewport = previewViewportRef.current;
    if (!viewport || !size.width || !size.height) return;
    const fitScale = Math.min(1, viewport.clientWidth / size.width, viewport.clientHeight / size.height);
    setPreviewScale(Math.max(0.1, fitScale));
    setPreviewPan({ x: 0, y: 0 });
  };
  useEffect(() => {
    const viewport = previewViewportRef.current;
    if (!previewImage || !viewport) return undefined;

    function handlePreviewWheel(event) {
      event.preventDefault();
      setPreviewScale((current) => Math.min(4, Math.max(0.1, current * (event.deltaY < 0 ? 1.1 : 0.9))));
    }

    viewport.addEventListener("wheel", handlePreviewWheel, { passive: false });
    return () => viewport.removeEventListener("wheel", handlePreviewWheel);
  }, [previewImage]);
  useEffect(() => {
    try {
      localStorage.setItem("obs-copy-mode", copyMode);
    } catch {
      console.log("选择复制模式");
    }
  }, [copyMode]);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchTerm(searchTerm.trim().toLowerCase()), 250);
    return () => clearTimeout(timer);
  }, [searchTerm]);
  const sortedObjects = useMemo(() => {
    const filteredObjects = debouncedSearchTerm
      ? objects.filter((object) => getFileName(object.Key).toLowerCase().includes(debouncedSearchTerm))
      : objects;

    return [...filteredObjects].sort((left, right) => {
      const leftTime = new Date(left.LastModified).getTime() || 0;
      const rightTime = new Date(right.LastModified).getTime() || 0;
      return timeSort === "desc" ? rightTime - leftTime : leftTime - rightTime;
    });
  }, [debouncedSearchTerm, objects, timeSort]);

  function openPreview(object) {
    setPreviewScale(1);
    setPreviewSize({ width: 0, height: 0 });
    setPreviewPan({ x: 0, y: 0 });
    setPreviewImage({ src: object.httpsUrl, alt: getFileName(object.Key) });
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    await onDelete(deleteTarget);
    setDeleteTarget(null);
  }

  function openRename(object) {
    setRenameTarget(object);
    setRenameDraft(getFileName(object.Key));
    setRenameError("");
  }

  async function confirmRename(event) {
    event.preventDefault();
    setRenameError("");
    try {
      await onRename(renameTarget, renameDraft);
      setRenameTarget(null);
    } catch (renameErr) {
      setRenameError(renameErr.message || "重命名失败");
    }
  }

  return (
    <section className="glass-panel flex min-h-[520px] flex-col overflow-hidden rounded-[28px] lg:min-h-0">
      <div className="flex flex-col gap-2 border-b border-white/55 px-6 py-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-slate-950">目录文件</h2>
          <p className="mt-1 text-sm text-slate-500">选择复制链接或CSS样式，点击即可复制</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="搜索名称"
            className="glass-input w-[180px] rounded-lg px-3 py-2 text-xs text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-300"
          />
          <span className="text-sm text-slate-400">
            {debouncedSearchTerm ? `${sortedObjects.length} / ${objects.length}` : objects.length} 个对象
          </span>
          {connected && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={isLoading}
              className="glass-button rounded-lg px-3 py-2 text-xs text-slate-600 transition disabled:cursor-wait disabled:opacity-60"
            >
              {isLoading ? "刷新中..." : "刷新"}
            </button>
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
                <th className="px-5 py-4">名称（点击复制）</th>
                <th className="px-4 py-4">大小</th>
                <th className="px-4 py-4">
                  <button
                    type="button"
                    onClick={() => setTimeSort((current) => (current === "desc" ? "asc" : "desc"))}
                    className="inline-flex items-center gap-1 rounded-md px-1 py-0.5 text-left transition hover:bg-white/60 hover:text-slate-600"
                    aria-label={`上传时间${timeSort === "desc" ? "倒序" : "正序"}，点击切换`}
                  >
                    上传时间
                    <span className="text-[11px] text-blue-500">{timeSort === "desc" ? "↓" : "↑"}</span>
                  </button>
                </th>
                <th className="px-4 py-4">
                  <div className="flex items-center gap-2">
                    <span>图片链接</span>
                    <div className="flex items-center gap-1.5 text-[11px] font-normal">
                      <label className="flex cursor-pointer items-center gap-1 rounded-md px-1.5 py-0.5 text-blue-600/80 transition hover:bg-white/60">
                        <input
                          type="radio"
                          name="copyMode"
                          checked={copyMode === "url"}
                          onChange={() => setCopyMode("url")}
                          className="h-3 w-3 accent-blue-600"
                        />
                        <span>复制链接</span>
                      </label>
                      <label className="flex cursor-pointer items-center gap-1 rounded-md px-1.5 py-0.5 text-blue-600/80 transition hover:bg-white/60">
                        <input
                          type="radio"
                          name="copyMode"
                          checked={copyMode === "css"}
                          onChange={() => setCopyMode("css")}
                          className="h-3 w-3 accent-blue-600"
                        />
                        <span>复制CSS</span>
                      </label>
                    </div>
                  </div>
                </th>
                <th className="px-5 py-4 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/55">
              {sortedObjects.map((object, index) => (
                <motion.tr
                  key={object.Key}
                  initial={{ backgroundColor: "rgba(220, 252, 231, 0.65)" }}
                  animate={{ backgroundColor: "rgba(255, 255, 255, 0)" }}
                  className="group hover:bg-white/30"
                >
                  <td className="px-5 py-4 text-sm font-medium text-slate-400">{index + 1}</td>
                  <td className="min-w-0 px-5 py-4">
                    <PreviewName
                      copied={copiedText === getFileName(object.Key)}
                      object={object}
                      onCopy={onCopy}
                      onPreview={openPreview}
                    />
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-600">{formatBytes(Number(object.Size))}</td>
                  <td className="px-4 py-4 text-sm text-slate-600">{formatDate(object.LastModified)}</td>
                  <td className="min-w-0 px-4 py-4">
                    <CopyButton
                      copiedText={copiedText}
                      httpsUrl={object.httpsUrl}
                      copyMode={copyMode}
                      onCopy={onCopy}
                    />
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openPreview(object)}
                        className="text-sm font-medium text-blue-600 transition hover:text-blue-800"
                      >
                        预览
                      </button>
                      <button
                        type="button"
                        onClick={() => openRename(object)}
                        disabled={renamingKey === object.Key}
                        className="text-sm font-medium text-amber-600 transition hover:text-amber-800 disabled:cursor-wait disabled:opacity-50"
                      >
                        {renamingKey === object.Key ? "修改中" : "编辑"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(object)}
                        disabled={deletingKey === object.Key}
                        className="text-sm font-medium text-rose-500 transition hover:text-rose-700 disabled:cursor-wait disabled:opacity-50"
                      >
                        {deletingKey === object.Key ? "删除中" : "删除"}
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center px-6 py-20 text-center">
          <p className="text-sm font-medium text-slate-500">{connected ? "该目录暂时没有文件" : "尚未连接云存储目录"}</p>
          <p className="mt-2 text-sm text-slate-400">连接后，这里将以表格展示名称、大小、上传时间与地址</p>
        </div>
      )}
      <AnimatePresence>
        {deleteTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/35 p-5 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, y: 14, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.18 }}
              className="glass-modal w-full max-w-[420px] rounded-[26px] p-6"
            >
              <div className="mb-5 flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-xl font-semibold text-rose-500">
                  !
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg font-semibold tracking-tight text-slate-950">确认删除图片？</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    将删除
                    <span className="mx-1 font-medium text-slate-800">{getFileName(deleteTarget.Key)}</span>
                    ，删除后不可恢复。
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  disabled={deletingKey === deleteTarget.Key}
                  className="rounded-xl px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-white/60 disabled:opacity-60"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  disabled={deletingKey === deleteTarget.Key}
                  className="rounded-xl bg-rose-500 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-rose-500/20 transition hover:bg-rose-600 disabled:cursor-wait disabled:opacity-60"
                >
                  {deletingKey === deleteTarget.Key ? "删除中" : "确认删除"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {renameTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/35 p-5 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, y: 14, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.18 }}
              className="glass-modal w-full max-w-[420px] rounded-[26px] p-6"
            >
              <div className="mb-5 flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-xl font-semibold text-amber-500">
                  ✎
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-semibold tracking-tight text-slate-950">修改文件名</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    当前文件：
                    <span className="font-medium text-slate-800">{getFileName(renameTarget.Key)}</span>
                  </p>
                  <form onSubmit={confirmRename} className="mt-3">
                    <input
                      autoFocus
                      value={renameDraft}
                      onChange={(event) => setRenameDraft(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Escape") setRenameTarget(null);
                      }}
                      disabled={renamingKey === renameTarget.Key}
                      className="glass-input w-full rounded-lg px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-blue-300 disabled:opacity-60"
                      placeholder="输入新的文件名"
                    />
                    {renameError && (
                      <p className="mt-2 text-xs text-rose-600">{renameError}</p>
                    )}
                  </form>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setRenameTarget(null)}
                  disabled={renamingKey === renameTarget.Key}
                  className="rounded-xl px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-white/60 disabled:opacity-60"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={confirmRename}
                  disabled={renamingKey === renameTarget.Key}
                  className="rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-amber-500/20 transition hover:bg-amber-600 disabled:cursor-wait disabled:opacity-60"
                >
                  {renamingKey === renameTarget.Key ? "修改中" : "确认修改"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {previewImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/45 p-5 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              className="glass-modal max-h-full w-full max-w-[1120px] overflow-hidden rounded-[28px] p-4"
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="truncate text-sm font-medium text-slate-700">{previewImage.alt}</p>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="glass-pill rounded-full px-3 py-1 text-xs font-medium text-slate-500">
                    {Math.round(previewScale * 100)}%
                  </span>
                  <button
                    type="button"
                    onClick={() => fitPreviewToViewport()}
                    className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-500 transition hover:bg-white/60 hover:text-slate-700"
                  >
                    重置
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewImage(null)}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xl text-slate-500 transition hover:bg-white/60"
                    aria-label="关闭图片预览"
                  >
                    ×
                  </button>
                </div>
              </div>
              <div
                ref={previewViewportRef}
                className={`relative flex h-[76vh] items-center justify-center overflow-hidden rounded-2xl bg-white/45 ${isPreviewDragging ? "cursor-grabbing" : "cursor-grab"}`}
                onPointerDown={(event) => {
                  event.currentTarget.setPointerCapture(event.pointerId);
                  previewDragRef.current = {
                    startX: event.clientX,
                    startY: event.clientY,
                    pan: previewPan,
                  };
                  setIsPreviewDragging(true);
                }}
                onPointerMove={(event) => {
                  if (!previewDragRef.current) return;
                  const nextX = previewDragRef.current.pan.x + event.clientX - previewDragRef.current.startX;
                  const nextY = previewDragRef.current.pan.y + event.clientY - previewDragRef.current.startY;
                  setPreviewPan({ x: nextX, y: nextY });
                }}
                onPointerUp={(event) => {
                  if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                    event.currentTarget.releasePointerCapture(event.pointerId);
                  }
                  previewDragRef.current = null;
                  setIsPreviewDragging(false);
                }}
                onPointerCancel={() => {
                  previewDragRef.current = null;
                  setIsPreviewDragging(false);
                }}
              >
                <img
                  src={previewImage.src}
                  alt={previewImage.alt}
                  draggable="false"
                  onLoad={(event) => {
                    const image = event.currentTarget;
                    const viewport = previewViewportRef.current;
                    const nextSize = {
                      width: image.naturalWidth,
                      height: image.naturalHeight,
                    };
                    setPreviewSize(nextSize);
                    if (viewport) fitPreviewToViewport(nextSize);
                  }}
                  className="absolute left-1/2 top-1/2 max-w-none select-none"
                  style={{
                    width: previewSize.width || "auto",
                    height: previewSize.height || "auto",
                    transform: `translate(-50%, -50%) translate(${previewPan.x}px, ${previewPan.y}px) scale(${previewScale})`,
                    transformOrigin: "center center",
                  }}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
