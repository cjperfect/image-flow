import * as React from "react";
import { cn } from "../../lib/utils";
import { X } from "lucide-react";

interface Toast {
  id: string;
  message: string;
  variant?: "default" | "destructive";
}

interface ToastState {
  toasts: Toast[];
}

type ToastAction =
  | { type: "ADD_TOAST"; toast: Toast }
  | { type: "DISMISS_TOAST"; id: string };

let toastDispatch: React.Dispatch<ToastAction> | null = null;
let toastCount = 0;

export function toast(message: string, variant: "default" | "destructive" = "default") {
  const id = String(++toastCount);
  toastDispatch?.({ type: "ADD_TOAST", toast: { id, message, variant } });
  setTimeout(() => toastDispatch?.({ type: "DISMISS_TOAST", id }), 2000);
}

function toastReducer(state: ToastState, action: ToastAction): ToastState {
  switch (action.type) {
    case "ADD_TOAST":
      return { toasts: [...state.toasts, action.toast] };
    case "DISMISS_TOAST":
      return { toasts: state.toasts.filter((t) => t.id !== action.id) };
    default:
      return state;
  }
}

export function Toaster() {
  const [state, dispatch] = React.useReducer(toastReducer, { toasts: [] });
  React.useEffect(() => { toastDispatch = dispatch; return () => { toastDispatch = null; }; }, []);

  return (
    <div className="pointer-events-none fixed left-1/2 top-5 z-50 flex -translate-x-1/2 flex-col items-center gap-2">
      {state.toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            "pointer-events-auto rounded-2xl border border-white/80 bg-white/82 px-5 py-3 text-sm font-medium shadow-2xl shadow-slate-900/10 backdrop-blur-xl animate-in fade-in slide-in-from-top-2",
            t.variant === "destructive" ? "text-rose-700" : "text-emerald-700"
          )}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
