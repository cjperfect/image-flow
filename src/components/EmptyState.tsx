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
    <div className={`flex flex-1 flex-col items-center justify-center px-6 py-16 text-center ${className}`}>
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
        <Icon className="h-5 w-5 text-muted-foreground/60" strokeWidth={1.5} />
      </div>
      <p className="text-sm font-medium text-muted-foreground">{title}</p>
      {description && <p className="mt-1.5 text-xs leading-5 text-muted-foreground/60">{description}</p>}
    </div>
  );
}
