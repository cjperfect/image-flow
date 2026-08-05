import { Cloud, Settings } from "lucide-react";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import type { CloudProvider } from "../types";

const PROVIDER_LABELS: Record<CloudProvider, string> = { obs: "OBS", oss: "阿里云 OSS" };

function GuideStep({ num, text }: { num: number; text: string }) {
  return (
    <Badge variant="default" className="gap-1.5">
      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-blue-600/10 text-[11px] font-semibold text-blue-700">
        {num}
      </span>
      {text}
    </Badge>
  );
}

interface AppHeaderProps {
  activeFolderUrl: string;
  connected: boolean;
  onOpenConfig: () => void;
  provider: CloudProvider;
}

export default function AppHeader({ activeFolderUrl, connected, onOpenConfig, provider }: AppHeaderProps) {
  const providerLabel = PROVIDER_LABELS[provider] || "云存储";

  return (
    <nav className="glass-panel mb-4 flex flex-col gap-4 rounded-[22px] px-4 py-4 xl:flex-row xl:items-center xl:justify-between">
      <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-center lg:gap-7">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <span className="glass-highlight flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-blue-700">
            <Cloud className="h-6 w-6" strokeWidth={1.8} />
          </span>
          <div>
            <p className="font-semibold tracking-tight text-slate-950">ImageFlow</p>
            <p className="text-xs text-slate-500">图片自动压缩并上传 {providerLabel}</p>
          </div>
        </div>

        <div className="hidden h-10 w-px bg-white/70 lg:block" />

        {/* Guide Steps */}
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-800">图片自动压缩并上传到云存储，生成可直接复制的图片链接</p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
            <GuideStep num={1} text="连接目录" />
            <GuideStep num={2} text="拖入图片" />
            <GuideStep num={3} text="复制地址" />
          </div>
        </div>
      </div>

      {/* Right Side */}
      <div className="flex shrink-0 flex-wrap items-center gap-3 xl:justify-end">
        <div className="glass-inset hidden max-w-[440px] rounded-xl px-4 py-2 sm:block">
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-slate-400">Active folder</p>
          <p className="mt-0.5 truncate font-mono text-xs text-blue-700">
            {activeFolderUrl || `请先配置 ${providerLabel} 目标目录`}
          </p>
        </div>

        <Badge variant={connected ? "success" : "default"}>
          <span className={`h-2 w-2 rounded-full ${connected ? "bg-emerald-500" : "bg-slate-400"}`} />
          {connected ? `${providerLabel} 已连接` : "尚未连接"}
        </Badge>

        <Button onClick={onOpenConfig} size="sm">
          <Settings className="h-4 w-4" />
          连接设置
        </Button>
      </div>
    </nav>
  );
}
