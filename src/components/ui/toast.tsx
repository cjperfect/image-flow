import * as React from "react"
import { cn } from "@/lib/utils"

interface ToastItem {
  id: string
  title?: string
  description?: string
  variant?: "default" | "destructive"
}

const TOAST_LIMIT = 5
const TOAST_DURATION = 2000

// Global state with direct setState access
let setToasts: React.Dispatch<React.SetStateAction<ToastItem[]>> | null = null
let toastCount = 0

function addToast(toast: ToastItem) {
  if (!setToasts) return
  setToasts((prev) => [toast, ...prev].slice(0, TOAST_LIMIT))
  setTimeout(() => {
    setToasts?.((prev) => prev.filter((t) => t.id !== toast.id))
  }, TOAST_DURATION)
}

type ToastInput = string | Omit<ToastItem, "id">

function toastFn(input: ToastInput) {
  const id = String(++toastCount)
  const toast: ToastItem = typeof input === "string" ? { id, title: input } : { id, ...input }
  addToast(toast)
  return { id, dismiss: () => setToasts?.((prev) => prev.filter((t) => t.id !== id)) }
}

export const toast = Object.assign(toastFn, {
  error: (message: string) => toastFn({ title: message, variant: "destructive" as const }),
})

export function Toaster() {
  const [toasts, _setToasts] = React.useState<ToastItem[]>([])
  setToasts = _setToasts

  React.useEffect(() => {
    return () => { setToasts = null }
  }, [])

  if (!toasts.length) return null

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-50 flex flex-col items-end" style={{ perspective: "800px" }}>
      {toasts.map((t, i) => {
        const isFront = i === 0
        return (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto w-fit min-w-[200px] max-w-[360px] rounded-lg border px-4 py-3 shadow-lg transition-all duration-300",
              isFront
                ? "animate-in fade-in slide-in-from-top-2"
                : "animate-none",
              t.variant === "destructive"
                ? "border-destructive/30 bg-destructive/10 text-destructive"
                : "border-border bg-card text-foreground"
            )}
            style={{
              transform: isFront
                ? "translateY(0) scale(1)"
                : `translateY(${-60 * i}px) scale(${1 - i * 0.05})`,
              opacity: isFront ? 1 : Math.max(0, 1 - i * 0.25),
              zIndex: TOAST_LIMIT - i,
              position: isFront ? "relative" : "absolute",
              top: 0,
              right: 0,
            }}
          >
            {t.title && <p className="text-sm font-medium">{t.title}</p>}
            {t.description && <p className="mt-1 text-xs opacity-80">{t.description}</p>}
          </div>
        )
      })}
    </div>
  )
}
