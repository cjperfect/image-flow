interface NoticeBannerProps {
  connected: boolean;
  notice: string;
}

export default function NoticeBanner({ connected, notice }: NoticeBannerProps) {
  if (!notice && connected) return null;

  return (
    <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground animate-in">
      {notice || (connected ? "已准备好上传素材" : "打开连接设置以开始使用")}
    </div>
  );
}
