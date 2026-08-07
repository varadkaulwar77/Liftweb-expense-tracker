export function Label({ children }) {
  return <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">{children}</label>
}

const baseClass =
  'w-full rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]/60 outline-none focus:border-[var(--color-accent)] transition-colors'

export function Input({ label, className = '', ...props }) {
  return (
    <div>
      {label && <Label>{label}</Label>}
      <input className={`${baseClass} ${className}`} {...props} />
    </div>
  )
}

export function Textarea({ label, className = '', rows = 3, ...props }) {
  return (
    <div>
      {label && <Label>{label}</Label>}
      <textarea rows={rows} className={`${baseClass} resize-none ${className}`} {...props} />
    </div>
  )
}

export function Select({ label, className = '', children, ...props }) {
  return (
    <div>
      {label && <Label>{label}</Label>}
      <select className={`${baseClass} ${className}`} {...props}>
        {children}
      </select>
    </div>
  )
}
