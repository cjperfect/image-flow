import { useState, useRef, useEffect } from "react";
import { Clock, Trash2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "../components/ui/dialog";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { cn } from "../lib/utils";
import type { CloudProvider, StorageConfig } from "../types";

const PROVIDER_FIELDS = {
  obs: {
    folderLabel: "OBS 文件夹目录",
    folderDesc: "这里填写当前项目的 OBS 地址，格式 obs://bucket/path/",
    folderPlaceholder: "obs://你的桶名/目录路径/",
    endpointLabel: "OBS Endpoint",
    endpointDesc: "华为云 OBS 服务节点地址",
    endpointReadOnly: true,
    title: "OBS 连接设置",
    description: "填写 OBS 连接信息，成功连接后图片会通过 TinyPNG 自动压缩并上传华为云 OBS。",
  },
  oss: {
    folderLabel: "OSS 文件夹目录",
    folderDesc: "这里填写当前项目的 OSS 地址，格式 oss://bucket/path/",
    folderPlaceholder: "oss://你的桶名/目录路径/",
    endpointLabel: "OSS Region",
    endpointDesc: "阿里云 OSS 地域节点，例如 oss-cn-hangzhou、oss-cn-shanghai",
    endpointReadOnly: false,
    title: "OSS 连接设置",
    description: "填写 OSS 连接信息，成功连接后图片会通过 TinyPNG 自动压缩并上传阿里云 OSS。",
  },
} as const;

interface ConfigModalProps {
  config: StorageConfig;
  activeFolderUrl: string;
  folderHistory: string[];
  isLoading: boolean;
  isOpen: boolean;
  errorMessage: string;
  onChange: (field: keyof StorageConfig, value: string) => void;
  onConnect: () => void;
  onClose: () => void;
  onClearFolderHistory: () => void;
  onDeleteFolderHistoryItem: (folderUrl: string) => void;
}

export default function ConfigModal({
  config, activeFolderUrl, folderHistory, isLoading, isOpen,
  errorMessage, onChange, onConnect, onClose, onClearFolderHistory, onDeleteFolderHistoryItem,
}: ConfigModalProps) {
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const historyRef = useRef<HTMLDivElement>(null);
  const fields = PROVIDER_FIELDS[config.provider];

  function handleProviderChange(provider: CloudProvider) {
    if (provider === config.provider) return;
    onChange("provider", provider);
    if (provider === "oss" && config.folderUrl.startsWith("obs://")) {
      onChange("folderUrl", config.folderUrl.replace(/^obs:\/\//, "oss://"));
    } else if (provider === "obs" && config.folderUrl.startsWith("oss://")) {
      onChange("folderUrl", config.folderUrl.replace(/^oss:\/\//, "obs://"));
    }
    onChange("endpoint", provider === "oss"
      ? "oss-cn-shenzhen"
      : "https://obs.cn-south-1.myhuaweicloud.com");
  }

  useEffect(() => {
    if (!isHistoryOpen) return;
    function close(e: MouseEvent) {
      if (!historyRef.current?.contains(e.target as Node)) setIsHistoryOpen(false);
    }
    document.addEventListener("click", close, true);
    return () => document.removeEventListener("click", close, true);
  }, [isHistoryOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-[680px] p-6 md:p-8" onMouseDown={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>{fields.title}</DialogTitle>
          <DialogDescription className="mt-2">{fields.description}</DialogDescription>
        </DialogHeader>

        <div className="mb-5">
          <Label className="mb-2 block">选择云存储服务商</Label>
          <div className="flex gap-3">
            {[
              { label: "华为云 OBS", value: "obs" as CloudProvider, desc: "obs.cn-south-1" },
              { label: "阿里云 OSS", value: "oss" as CloudProvider, desc: "oss-cn-hangzhou" },
            ].map((opt) => {
              const selected = config.provider === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleProviderChange(opt.value)}
                  className={cn(
                    "flex flex-1 items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition",
                    selected
                      ? "border-blue-300 bg-blue-50/70 text-blue-800 shadow-sm"
                      : "border-transparent bg-white/40 text-slate-600 hover:bg-white/70"
                  )}
                >
                  <span className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2",
                    selected ? "border-blue-500" : "border-slate-300"
                  )}>
                    {selected && <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />}
                  </span>
                  <div>
                    <span className="font-medium">{opt.label}</span>
                    <span className="mt-0.5 block text-xs text-slate-400">{opt.desc}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-4">
          <div>
            <Label className="mb-1.5 block">{fields.folderLabel}</Label>
            <p className="mb-2 text-xs text-slate-400">{fields.folderDesc}</p>
            <div ref={historyRef} className="relative">
              <Input
                value={config.folderUrl}
                placeholder={fields.folderPlaceholder}
                onChange={(e) => onChange("folderUrl", e.target.value)}
                className="pr-12"
              />
              <button
                type="button"
                onClick={() => setIsHistoryOpen((v) => !v)}
                className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 hover:bg-white/60 hover:text-blue-600"
              >
                <Clock className="h-5 w-5" strokeWidth={1.8} />
              </button>
              {isHistoryOpen && (
                <div className="glass-modal absolute left-0 right-0 top-full z-10 mt-2 overflow-hidden rounded-xl p-2 shadow-xl">
                  {folderHistory.length ? (
                    <>
                      <div className="flex items-center justify-between px-2 py-1.5">
                        <p className="text-xs font-medium text-slate-500">历史记录</p>
                        <button
                          type="button"
                          onClick={onClearFolderHistory}
                          disabled={!folderHistory.some((u) => u !== activeFolderUrl)}
                          className="rounded-md px-1.5 py-1 text-[11px] font-medium text-rose-500 hover:bg-rose-50/80 disabled:opacity-40"
                        >
                          清空其他
                        </button>
                      </div>
                      <div className="pretty-scrollbar max-h-52 overflow-auto">
                        {folderHistory.map((folderUrl) => {
                          const isActive = folderUrl === activeFolderUrl;
                          return (
                            <div key={folderUrl} className={cn(
                              "group flex items-center gap-1 rounded-lg border",
                              isActive ? "border-emerald-200/80 bg-emerald-50/80" : "border-transparent hover:bg-white/60"
                            )}>
                              <button
                                type="button"
                                onClick={() => { onChange("folderUrl", folderUrl); setIsHistoryOpen(false); }}
                                className={cn(
                                  "min-w-0 flex-1 truncate px-2 py-2.5 text-left font-mono text-xs",
                                  isActive ? "font-medium text-emerald-700" : "text-slate-600 group-hover:text-blue-700"
                                )}
                              >
                                {folderUrl}
                              </button>
                              {isActive ? (
                                <Badge variant="success" className="mr-1 text-[10px]">当前连接</Badge>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => onDeleteFolderHistoryItem(folderUrl)}
                                  className="mr-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-rose-50/80 hover:text-rose-600"
                                >
                                  <Trash2 className="h-4 w-4" strokeWidth={1.8} />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    <p className="px-2 py-3 text-xs text-slate-400">暂无历史记录</p>
                  )}
                </div>
              )}
            </div>
          </div>

          <div>
            <Label className="mb-1.5 block">{fields.endpointLabel}</Label>
            <p className="mb-2 text-xs text-slate-400">{fields.endpointDesc}</p>
            <Input
              value={config.endpoint}
              readOnly={fields.endpointReadOnly}
              onChange={(e) => onChange("endpoint", e.target.value)}
              className={fields.endpointReadOnly ? "cursor-not-allowed opacity-75" : ""}
            />
          </div>

          <div>
            <Label className="mb-1.5 block">Access Key ID</Label>
            <Input value={config.accessKeyId} onChange={(e) => onChange("accessKeyId", e.target.value)} />
          </div>

          <div>
            <Label className="mb-1.5 block">Secret Access Key</Label>
            <Input type="password" value={config.secretAccessKey} onChange={(e) => onChange("secretAccessKey", e.target.value)} />
          </div>
        </div>

        {errorMessage && (
          <p className="mt-4 rounded-xl bg-rose-50/75 px-4 py-3 text-sm text-rose-700">{errorMessage}</p>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>取消</Button>
          <Button onClick={onConnect} disabled={isLoading}>
            {isLoading ? "正在连接..." : "连接并读取目录"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
