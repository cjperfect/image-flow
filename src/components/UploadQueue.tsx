import { useRef } from "react";
import { Upload, Copy } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { cn } from "../lib/utils";
import { formatBytes } from "../utils/format";
import EmptyState from "./EmptyState";
import type { UploadItem, CompressionMode, UploadStatus } from "../types";

const STATUS_CONFIG: Record<UploadStatus, { label: string; variant: "default" | "success" | "warning" | "destructive" }> = {
  queued: { label: "等待上传", variant: "default" },
  compressing: { label: "压缩中", variant: "warning" },
  uploading: { label: "上传中", variant: "warning" },
  success: { label: "已上传", variant: "success" },
  error: { label: "失败", variant: "destructive" },
};

interface UploadQueueProps {
  items: UploadItem[];
  copiedText: string;
  compressionMode: CompressionMode;
  namingPrefix: string;
  namingStartIndex: number;
  isUploading: boolean;
  onCompressionModeChange: (mode: CompressionMode) => void;
  onNamingPrefixChange: (prefix: string) => void;
  onNamingStartIndexChange: (index: number) => void;
  onCopy: (text: string) => Promise<void>;
  onSelectFiles: (files: FileList) => void;
}

export default function UploadQueue({
  items, copiedText, compressionMode, namingPrefix, namingStartIndex,
  isUploading, onCompressionModeChange, onNamingPrefixChange,
  onNamingStartIndexChange, onCopy, onSelectFiles,
}: UploadQueueProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files?.length) onSelectFiles(e.target.files);
    e.target.value = "";
  }

  const reversedItems = [...items].reverse();

  return (
    <div className="glass-panel flex min-h-[260px] flex-col rounded-[28px] p-5 lg:min-h-0 lg:flex-1">
      <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFilesSelected} />

      <div className="mb-4 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">处理队列</h2>
            <p className="mt-1 text-xs text-slate-400">选择压缩方式后批量上传图片</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button size="sm" onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-3.5 w-3.5" />
              选择图片
            </Button>
            <Badge>{items.length}</Badge>
            {isUploading && <Badge variant="warning">处理中</Badge>}
          </div>
        </div>

        {/* Compression Mode */}
        <div className="glass-inset flex flex-wrap gap-4 rounded-xl px-3 py-2">
          <label className={cn("flex cursor-pointer items-center gap-2 text-xs font-medium text-blue-700")}>
            <input
              type="radio"
              name="compression"
              checked={compressionMode === "tinypng"}
              onChange={() => onCompressionModeChange("tinypng")}
              disabled={isUploading}
              className="h-3.5 w-3.5 accent-blue-600"
            />
            TinyPNG 压缩
          </label>
        </div>

        {/* Naming Settings */}
        <div className="glass-inset flex items-center gap-2 rounded-xl px-3 py-2">
          <label htmlFor="naming-prefix" className="shrink-0 text-xs font-medium text-slate-500">命名前缀</label>
          <input
            id="naming-prefix"
            value={namingPrefix}
            onChange={(e) => onNamingPrefixChange(e.target.value)}
            placeholder="请输入命名前缀"
            className="min-w-0 flex-1 bg-transparent text-[11px] text-slate-700 placeholder:text-slate-400 focus:outline-none"
          />
          <span className="text-xs text-slate-400">索引从</span>
          <input
            type="number"
            min={1}
            value={namingStartIndex}
            onChange={(e) => onNamingStartIndexChange(parseInt(e.target.value, 10) || 1)}
            className="w-14 bg-transparent text-center text-[11px] text-emerald-500 focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          <span className="text-xs text-slate-400">开始</span>
        </div>
      </div>

      {items.length ? (
        <div className="pretty-scrollbar h-full space-y-3 overflow-auto pr-1">
          {reversedItems.map((item) => (
            <div
              key={item.id}
              className={cn(
                "rounded-2xl border px-4 py-3 animate-in fade-in slide-in-from-bottom-2",
                item.status === "success" ? "border-emerald-200/70 bg-emerald-50/50" : "border-white/60 bg-white/28"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="preview-trigger relative min-w-0">
                  <p className="truncate text-sm font-medium">{item.name}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {formatBytes(item.originalSize)}
                    {item.compressedSize ? ` → ${formatBytes(item.compressedSize)}` : ""}
                  </p>
                  {item.previewUrl && (
                    <div className="preview-popover pointer-events-none absolute left-0 top-full z-20 mt-2 w-[200px] overflow-hidden rounded-xl border border-white/80 bg-white/90 p-2 opacity-0 shadow-xl backdrop-blur transition">
                      <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-lg bg-slate-100">
                        <img src={item.previewUrl} alt={item.name} className="h-full w-full object-contain" />
                      </div>
                      <p className="mt-2 truncate px-1 text-xs font-medium text-slate-700">{item.name}</p>
                    </div>
                  )}
                </div>
                <Badge variant={STATUS_CONFIG[item.status].variant}>
                  {STATUS_CONFIG[item.status].label}
                </Badge>
              </div>
              {item.error && <p className="mt-2 text-xs text-rose-600">{item.error}</p>}
              {item.httpsUrl && (
                <button
                  type="button"
                  onClick={() => onCopy(item.httpsUrl!)}
                  className={cn(
                    "glass-inset mt-3 flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left font-mono text-xs transition",
                    copiedText === item.httpsUrl ? "border-emerald-200 bg-emerald-50/70 text-emerald-700" : "text-blue-600 hover:bg-white/55"
                  )}
                >
                  <span className="min-w-0 truncate">{item.httpsUrl}</span>
                  <span className="flex shrink-0 items-center gap-1 font-sans text-[11px] font-semibold">
                    <Copy className="h-3 w-3" />
                    {copiedText === item.httpsUrl ? "已复制" : "复制"}
                  </span>
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <EmptyState icon={Upload} title="暂无处理任务" description="点击选择图片或将多张图片拖入页面" />
      )}
    </div>
  );
}
