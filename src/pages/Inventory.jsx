import { useEffect, useState } from 'react'
import { Boxes, Minus, Plus as PlusIcon, AlertTriangle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useToast } from '../context/ToastContext'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import { SkeletonCard } from '../components/ui/Skeleton'
import EmptyState from '../components/ui/EmptyState'

export default function Inventory() {
  const toast = useToast()
  const [inventory, setInventory] = useState([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('inventory').select('*').order('item_name')
    setInventory(data || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  async function adjust(item, delta) {
    const newQty = Math.max(Number(item.quantity || 0) + delta, 0)
    const { error } = await supabase
      .from('inventory')
      .update({ quantity: newQty, updated_at: new Date().toISOString() })
      .eq('id', item.id)
    if (error) return toast.error(error.message)
    setInventory((prev) => prev.map((i) => (i.id === item.id ? { ...i, quantity: newQty } : i)))
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    )
  }

  if (inventory.length === 0) {
    return (
      <Card className="p-0">
        <EmptyState icon={Boxes} title="No inventory items" message="Inventory is seeded automatically from your database schema." />
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {inventory.map((item) => {
        const low = item.quantity <= (item.low_stock_threshold ?? 5)
        return (
          <Card key={item.id} className="p-5">
            <div className="flex items-start justify-between mb-4">
              <p className="text-sm font-semibold text-[var(--color-text)]">{item.item_name}</p>
              {low && (
                <Badge tone="warning" className="flex items-center gap-1">
                  <AlertTriangle size={11} /> Low stock
                </Badge>
              )}
            </div>

            <div className="flex items-center justify-between">
              <p className="text-3xl font-semibold text-[var(--color-text)] tracking-tight">{item.quantity}</p>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => adjust(item, -1)}
                  className="w-8 h-8 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                >
                  <Minus size={14} />
                </button>
                <button
                  onClick={() => adjust(item, 1)}
                  className="w-8 h-8 rounded-lg bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/30 flex items-center justify-center text-[var(--color-accent)]"
                >
                  <PlusIcon size={14} />
                </button>
              </div>
            </div>
          </Card>
        )
      })}
    </div>
  )
}