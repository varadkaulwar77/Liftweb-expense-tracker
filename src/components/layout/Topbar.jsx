import { Menu, LogOut } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

export default function Topbar({ onMenuClick, title }) {
  const { signOut, user } = useAuth()

  return (
    <header className="h-16 shrink-0 border-b border-[var(--color-border)] bg-[var(--color-bg)]/80 backdrop-blur-sm sticky top-0 z-30 flex items-center justify-between px-4 lg:px-8">
      <div className="flex items-center gap-3">
        <button
          className="lg:hidden text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
          onClick={onMenuClick}
        >
          <Menu size={20} />
        </button>
        <h1 className="text-lg font-semibold text-[var(--color-text)] tracking-tight">{title}</h1>
      </div>

      <div className="flex items-center gap-4">
        <span className="hidden sm:block text-xs text-[var(--color-text-muted)]">{user?.email}</span>
        <button
          onClick={signOut}
          className="flex items-center gap-1.5 text-xs font-medium text-[var(--color-text-muted)] hover:text-[var(--color-danger)] transition-colors"
        >
          <LogOut size={15} />
          Sign out
        </button>
      </div>
    </header>
  )
}
