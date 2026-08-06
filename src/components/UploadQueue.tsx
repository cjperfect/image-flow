import { useRef } from "react";
import { Upload, Copy, Plus } from "lucide-react";
import { Badge } from "../components/ui/badge";
import { cn } from "../lib/utils";
import { formatBytes } from "../utils/format";
import EmptyState from "./EmptyState";
import type { UploadItem, CompressionMode, UploadStatus } from "../types";

const STATUS_CONFIG: Record<
  UploadStatus,
  { label: string; variant: "default" | "success" | "warning" | "destructive" }
> = {
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
  items,
  copiedText,
  compressionMode,
  namingPrefix,
  namingStartIndex,
  isUploading,
  onCompressionModeChange,
  onNamingPrefixChange,
  onNamingStartIndexChange,
  onCopy,
  onSelectFiles,
}: UploadQueueProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files?.length) onSelectFiles(e.target.files);
    e.target.value = "";
  }

  const reversedItems = [...items].reverse();

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFilesSelected}
      />

      <div className="shrink-0 flex flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-lg tracking-tight">上传图片</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">压缩后自动上传到云存储</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Badge variant={items.length ? "primary" : "default"}>{items.length}</Badge>
            {isUploading && <Badge variant="warning">处理中</Badge>}
          </div>
        </div>

        {/* Drop Zone */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border py-6 text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary"
        >
          <Plus className="h-6 w-6" strokeWidth={1.5} />
          <span className="text-xs font-medium">拖入图片或点击选择</span>
        </button>

        {/* Compression Mode */}
        <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/20 px-3 py-2">
          <span className="text-xs font-medium text-muted-foreground">压缩方式</span>
          <label className={cn("flex cursor-pointer items-center gap-1.5 text-xs font-medium text-foreground")}>
            <input
              type="radio"
              name="compression"
              checked={compressionMode === "tinypng"}
              onChange={() => onCompressionModeChange("tinypng")}
              disabled={isUploading}
              className="h-3.5 w-3.5 accent-primary"
            />
            TinyPNG
          </label>
        </div>

        {/* Naming Settings */}
        <div className="flex items-center gap-2 text-xs">
          <label htmlFor="naming-prefix" className="shrink-0 font-medium text-muted-foreground">
            前缀
          </label>
          <input
            id="naming-prefix"
            value={namingPrefix}
            onChange={(e) => onNamingPrefixChange(e.target.value)}
            placeholder="若自动命名，前填写前缀"
            className="min-w-0 flex-1 rounded-md border border-border bg-card px-2 py-1.5 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/10"
          />
          <span className="text-muted-foreground">从</span>
          <input
            type="number"
            min={1}
            value={namingStartIndex}
            onChange={(e) => onNamingStartIndexChange(parseInt(e.target.value, 10) || 1)}
            className="w-14 rounded-md border border-border bg-card px-2 py-1.5 text-center text-foreground focus:outline-none focus:ring-2 focus:ring-primary/10 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          <span className="text-muted-foreground">开始</span>
        </div>

        {namingPrefix.trim() && (
          <div className="rounded-lg border border-border bg-muted/20 px-3 py-2">
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground/80">自动命名预览：</span>
              <span className="font-mono text-foreground/70">
                {namingPrefix}
                {namingStartIndex}
              </span>
              <span className="text-muted-foreground/60">、</span>
              <span className="font-mono text-foreground/70">
                {namingPrefix}
                {namingStartIndex + 1}
              </span>
              <span className="text-muted-foreground/60">、</span>
              <span className="font-mono text-foreground/70">
                {namingPrefix}
                {namingStartIndex + 2}
              </span>
              <span className="text-muted-foreground/60"> …</span>
            </p>
          </div>
        )}
      </div>

      {/* Queue List */}
      {items.length ? (
        <div className="pretty-scrollbar min-h-0 flex-1 overflow-auto border-t border-border px-4 pb-4 pt-2">
          <div className="space-y-2">
            {reversedItems.map((item) => (
              <div
                key={item.id}
                className={cn(
                  "rounded-xl border px-3 py-2.5 animate-in",
                  item.status === "success" ? "border-emerald-200 bg-emerald-50/50" : "border-border bg-muted/20",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{item.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatBytes(item.originalSize)}
                      {item.compressedSize ? ` → ${formatBytes(item.compressedSize)}` : ""}
                    </p>
                  </div>
                  <Badge variant={STATUS_CONFIG[item.status].variant} className="shrink-0 text-[10px]">
                    {STATUS_CONFIG[item.status].label}
                  </Badge>
                </div>
                {item.error && <p className="mt-1.5 text-xs text-destructive">{item.error}</p>}
                {item.httpsUrl && (
                  <button
                    type="button"
                    onClick={() => onCopy(item.httpsUrl!)}
                    className={cn(
                      "mt-2.5 flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-1.5 text-left font-mono text-xs transition",
                      copiedText === item.httpsUrl
                        ? "border-emerald-200 bg-emerald-50/70 text-emerald-700"
                        : "border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-primary",
                    )}
                  >
                    <span className="min-w-0 truncate">{item.httpsUrl}</span>
                    <span className="flex shrink-0 items-center gap-1 font-sans text-[11px] font-medium">
                      <Copy className="h-3 w-3" />
                      {copiedText === item.httpsUrl ? "已复制" : "复制"}
                    </span>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <EmptyState icon={Upload} title="暂无处理任务" description="拖入图片或点击上方区域选择文件" />
      )}
    </div>
  );
}
