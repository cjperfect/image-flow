import { Card, CardContent } from "../components/ui/card";
import { formatBytes } from "../utils/format";

interface StatCardProps {
  label: string;
  value: string;
  detail: string;
  accent?: boolean;
}

function StatCard({ label, value, detail, accent }: StatCardProps) {
  return (
    <Card className={`p-4 md:p-5 ${accent ? "!bg-primary !text-primary-foreground !border-white/34 shadow-lg shadow-primary/20" : ""}`}>
      <p className={`text-xs font-medium ${accent ? "text-blue-50" : "text-slate-500"}`}>{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
      <p className={`mt-1 text-xs ${accent ? "text-blue-100" : "text-slate-400"}`}>{detail}</p>
    </Card>
  );
}

interface StatsGridProps {
  connected: boolean;
  objectCount: number;
  queueCount: number;
  successfulUploads: number;
  savedBytes: number;
}

export default function StatsGrid({ connected, objectCount, queueCount, successfulUploads, savedBytes }: StatsGridProps) {
  return (
    <section className="grid grid-cols-2 gap-3">
      <StatCard label="目录文件" value={connected ? String(objectCount) : "--"} detail="当前对象数量" />
      <StatCard label="上传队列" value={String(queueCount)} detail="本次选择文件" />
      <StatCard label="完成上传" value={String(successfulUploads)} detail="已获得地址" accent />
      <StatCard label="节省体积" value={formatBytes(savedBytes)} detail="本次压缩结果" />
    </section>
  );
}
