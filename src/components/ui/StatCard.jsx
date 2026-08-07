import { motion } from 'framer-motion'
import Card from './Card'

export default function StatCard({ label, value, icon: Icon, tint = 'accent', delta }) {
  const tintClasses = {
    accent: 'bg-[var(--color-accent)]/10 text-[var(--color-accent)]',
    success: 'bg-[var(--color-success)]/10 text-[var(--color-success)]',
    warning: 'bg-[var(--color-warning)]/10 text-[var(--color-warning)]',
    danger: 'bg-[var(--color-danger)]/10 text-[var(--color-danger)]',
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <Card className="p-5 h-full">
        <div className="flex items-start justify-between mb-4">
          <p className="text-xs font-medium text-[var(--color-text-muted)]">{label}</p>
          {Icon && (
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${tintClasses[tint]}`}>
              <Icon size={16} />
            </div>
          )}
        </div>
        <p className="text-2xl font-semibold text-[var(--color-text)] tracking-tight">{value}</p>
        {delta && <p className="text-xs text-[var(--color-text-muted)] mt-1">{delta}</p>}
      </Card>
    </motion.div>
  )
}
