import { type LucideIcon, Image } from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  className?: string;
}

export default function EmptyState({
  icon: Icon = Image,
  title,
  description,
  className = "",
}: EmptyStateProps) {
  return (
    <div className={`flex flex-1 flex-col items-center justify-center px-6 py-20 text-center ${className}`}>
      <div className="glass-inset mb-4 flex h-14 w-14 items-center justify-center rounded-2xl">
        <Icon className="h-6 w-6 text-slate-400" />
      </div>
      <p className="text-sm font-medium text-slate-600">{title}</p>
      {description && <p className="mt-2 text-xs leading-5 text-slate-400">{description}</p>}
    </div>
  );
}
