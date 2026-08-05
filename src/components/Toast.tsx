import { AnimatePresence, motion } from 'motion/react'

export default function Toast({ toast }) {
  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          key={toast.id}
          initial={{ opacity: 0, y: -28, x: '-50%', scale: 0.98 }}
          animate={{ opacity: 1, y: 0, x: '-50%', scale: 1 }}
          exit={{ opacity: 0, y: -18, x: '-50%', scale: 0.98 }}
          transition={{ duration: 0.18 }}
          className="pointer-events-none fixed left-1/2 top-5 z-50 rounded-2xl border border-white/80 bg-white/82 px-5 py-3 text-sm font-medium text-emerald-700 shadow-2xl shadow-slate-900/10 backdrop-blur-xl"
        >
          {toast.message}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
