import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  ShoppingCart,
  Users,
  Package,
  Wallet,
  Boxes,
  FileText,
  Settings as SettingsIcon,
  X,
} from 'lucide-react'
import logoUrl from '../../assets/logo-transparent.png'

const items = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/orders', label: 'Orders', icon: ShoppingCart },
  { to: '/clients', label: 'Clients', icon: Users },
  { to: '/products', label: 'Products', icon: Package },
  { to: '/expenses', label: 'Expenses', icon: Wallet },
  { to: '/inventory', label: 'Inventory', icon: Boxes },
  { to: '/invoices', label: 'Invoices', icon: FileText },
  { to: '/settings', label: 'Settings', icon: SettingsIcon },
]

export default function Sidebar({ open, onClose }) {
  return (
    <>
      {open && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-60 shrink-0 bg-[var(--color-surface)] border-r border-[var(--color-border)] flex flex-col transition-transform duration-200 ${
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex items-center justify-between h-16 px-5 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2">
            <img src={logoUrl} alt="LiftWEB Studio" className="h-8 w-auto" />
          </div>
          <button className="lg:hidden text-[var(--color-text-muted)]" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-[var(--color-accent)]/10 text-[var(--color-accent)]'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-white/5'
                }`
              }
            >
              <item.icon size={17} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-[var(--color-border)]">
          <p className="text-xs text-[var(--color-text-muted)]">LiftWEB Studio · v1.0</p>
        </div>
      </aside>
    </>
  )
}