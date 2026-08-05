interface NoticeBannerProps {
  connected: boolean;
  notice: string;
}

export default function NoticeBanner({ connected, notice }: NoticeBannerProps) {
  return (
    <div className="glass-inset rounded-2xl px-4 py-3 text-sm text-slate-500 animate-in fade-in">
      {notice || (connected ? "已准备好上传素材" : "打开连接设置以开始使用")}
    </div>
  );
}
