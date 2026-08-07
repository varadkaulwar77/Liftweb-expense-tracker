const variants = {
  primary:
    'bg-[var(--color-accent)] text-white hover:brightness-110 shadow-[0_4px_20px_rgba(124,92,255,0.35)]',
  secondary:
    'bg-[var(--color-surface-2)] text-[var(--color-text)] border border-[var(--color-border)] hover:bg-[#20202c]',
  ghost: 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-white/5',
  danger: 'bg-[var(--color-danger)]/10 text-[var(--color-danger)] hover:bg-[var(--color-danger)]/20',
}

const sizes = {
  sm: 'text-xs px-3 py-1.5 gap-1.5',
  md: 'text-sm px-4 py-2 gap-2',
  lg: 'text-sm px-5 py-2.5 gap-2',
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  icon: Icon,
  ...props
}) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-xl font-medium transition-all duration-150 active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {Icon && <Icon size={16} />}
      {children}
    </button>
  )
}
