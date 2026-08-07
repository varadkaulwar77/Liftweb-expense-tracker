export default function EmptyState({ icon: Icon, title, message, action }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      {Icon && (
        <div className="w-12 h-12 rounded-2xl bg-[var(--color-accent)]/10 flex items-center justify-center mb-4">
          <Icon size={22} className="text-[var(--color-accent)]" />
        </div>
      )}
      <h3 className="text-sm font-semibold text-[var(--color-text)] mb-1">{title}</h3>
      {message && <p className="text-sm text-[var(--color-text-muted)] max-w-sm mb-5">{message}</p>}
      {action}
    </div>
  )
}
