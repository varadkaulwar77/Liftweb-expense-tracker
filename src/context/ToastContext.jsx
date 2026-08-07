import { createContext, useCallback, useContext, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, XCircle, Info, X } from 'lucide-react'

const ToastContext = createContext(null)

let idCounter = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const push = useCallback(
    (message, type = 'success') => {
      const id = ++idCounter
      setToasts((prev) => [...prev, { id, message, type }])
      setTimeout(() => dismiss(id), 3500)
    },
    [dismiss]
  )

  const toast = {
    success: (msg) => push(msg, 'success'),
    error: (msg) => push(msg, 'error'),
    info: (msg) => push(msg, 'info'),
  }

  const icons = {
    success: <CheckCircle2 size={18} className="text-[var(--color-success)]" />,
    error: <XCircle size={18} className="text-[var(--color-danger)]" />,
    info: <Info size={18} className="text-[var(--color-accent)]" />,
  }

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 w-80">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, transition: { duration: 0.15 } }}
              className="flex items-start gap-2.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] px-4 py-3 shadow-[var(--shadow-soft)]"
            >
              {icons[t.type]}
              <p className="text-sm text-[var(--color-text)] flex-1">{t.message}</p>
              <button
                onClick={() => dismiss(t.id)}
                className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              >
                <X size={14} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
