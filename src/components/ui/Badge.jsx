const tones = {
  success: 'bg-[var(--color-success)]/10 text-[var(--color-success)]',
  danger: 'bg-[var(--color-danger)]/10 text-[var(--color-danger)]',
  warning: 'bg-[var(--color-warning)]/10 text-[var(--color-warning)]',
  accent: 'bg-[var(--color-accent)]/10 text-[var(--color-accent)]',
  muted: 'bg-white/5 text-[var(--color-text-muted)]',
}

export default function Badge({ children, tone = 'muted', className = '' }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  )
}
