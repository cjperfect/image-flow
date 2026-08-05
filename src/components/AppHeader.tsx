import { Settings, Sun, Moon } from "lucide-react";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { AnimatedThemeToggler } from "../components/ui/animated-theme-toggler";
import type { CloudProvider } from "../types";

const PROVIDER_LABELS: Record<CloudProvider, string> = { obs: "OBS", oss: "阿里云 OSS" };

interface AppHeaderProps {
  activeFolderUrl: string;
  connected: boolean;
  onOpenConfig: () => void;
  provider: CloudProvider;
}

export default function AppHeader({ activeFolderUrl, connected, onOpenConfig, provider }: AppHeaderProps) {
  const providerLabel = PROVIDER_LABELS[provider] || "云存储";

  return (
    <header className="flex items-center justify-between border-b border-border bg-card px-4 py-3 shadow-sm">
      <div className="flex items-center gap-4 min-w-0">
        <div className="flex items-center gap-2.5 shrink-0">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
            </svg>
          </span>
          <div>
            <p className="font-display text-lg tracking-tight text-foreground">ImageFlow</p>
          </div>
        </div>

        <div className="hidden h-6 w-px bg-border sm:block" />

        <div className="hidden min-w-0 sm:block">
          <p className="truncate font-mono text-xs text-muted-foreground">
            {activeFolderUrl || `请先配置 ${providerLabel} 目标目录`}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <Badge variant={connected ? "success" : "default"} className="hidden sm:inline-flex px-2 py-2">
          <span className={`h-1.5 w-1.5 rounded-full mr-1 ${connected ? "bg-emerald-500" : "bg-muted-foreground"}`} />
          {connected ? `${providerLabel} 已连接` : "尚未连接"}
        </Badge>
        <AnimatedThemeToggler className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-foreground transition-colors hover:bg-accent">
          <Sun className="h-2 w-2 dark:hidden" />
          <Moon className="hidden h-2 w-2 dark:block" />
        </AnimatedThemeToggler>
        <Button onClick={onOpenConfig} size="sm" variant="outline">
          <Settings className="h-3.5 w-3.5" />
          设置
        </Button>
      </div>
    </header>
  );
}
