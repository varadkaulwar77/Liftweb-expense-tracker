import { useEffect, useMemo, useState } from 'react'
import { Plus, Trash2, Wallet } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useToast } from '../context/ToastContext'
import { formatCurrency, formatDate } from '../lib/format'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import { Input, Select, Textarea } from '../components/ui/Field'
import Table from '../components/ui/Table'
import Badge from '../components/ui/Badge'
import EmptyState from '../components/ui/EmptyState'
import { SkeletonTableRow } from '../components/ui/Skeleton'
import StatCard from '../components/ui/StatCard'

const CATEGORY_INVENTORY_MAP = {
  'NFC Tags': 'nfc_tag',
  'Small Stands': 'small_stand',
  'Large Stands': 'large_stand',
  '3M Sticker': 'sticker',
  'NFC Cards': 'nfc_card',
  'Packaging Box': 'packaging_box',
}

const CATEGORIES = [
  'Printing',
  'NFC Tags',
  'Small Stands',
  'Large Stands',
  '3M Sticker',
  'NFC Cards',
  'Packaging Box',
  'Travel',
  'Others',
]

const emptyForm = {
  category: 'Printing',
  description: '',
  amount: '',
  quantity: '',
  expense_date: new Date().toISOString().slice(0, 10),
}

export default function Expenses() {
  const toast = useToast()
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    const { data, error } = await supabase.from('expenses').select('*').order('expense_date', { ascending: false })
    if (error) toast.error(error.message)
    setExpenses(data || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const filtered = useMemo(() => {
    if (categoryFilter === 'All') return expenses
    return expenses.filter((e) => e.category === categoryFilter)
  }, [expenses, categoryFilter])

  const totals = useMemo(() => {
    const thisMonth = new Date().toISOString().slice(0, 7)
    const total = expenses.reduce((s, e) => s + Number(e.amount || 0), 0)
    const monthTotal = expenses
      .filter((e) => e.expense_date?.slice(0, 7) === thisMonth)
      .reduce((s, e) => s + Number(e.amount || 0), 0)
    return { total, monthTotal }
  }, [expenses])

  function openCreate() {
    setForm(emptyForm)
    setModalOpen(true)
  }

  const inventoryKey = CATEGORY_INVENTORY_MAP[form.category]

  async function addToInventory(itemKey, qty) {
    const { data: inv, error: fetchError } = await supabase
      .from('inventory')
      .select('*')
      .eq('item_key', itemKey)
      .single()

    if (fetchError || !inv) {
      toast.error("Couldn't find that inventory item to update stock.")
      return
    }

    const { error: updateError } = await supabase
      .from('inventory')
      .update({ quantity: Number(inv.quantity || 0) + qty, updated_at: new Date().toISOString() })
      .eq('item_key', itemKey)

    if (updateError) {
      toast.error(updateError.message)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)

    const qty = inventoryKey ? Number(form.quantity || 0) : null
    const payload = {
      category: form.category,
      description: form.description,
      amount: Number(form.amount || 0),
      expense_date: form.expense_date,
      quantity: qty,
    }

    const { error } = await supabase.from('expenses').insert(payload)
    if (error) {
      setSaving(false)
      return toast.error(error.message)
    }

    if (inventoryKey && qty > 0) {
      await addToInventory(inventoryKey, qty)
    }

    setSaving(false)
    toast.success(
      inventoryKey && qty > 0 ? `Expense recorded — ${qty} added to inventory` : 'Expense recorded'
    )
    setModalOpen(false)
    load()
  }

  async function handleDelete(id) {
    const { error } = await supabase.from('expenses').delete().eq('id', id)
    if (error) return toast.error(error.message)
    toast.success('Expense deleted')
    load()
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard label="Total Expenses" value={formatCurrency(totals.total)} icon={Wallet} tint="danger" />
        <StatCard label="This Month" value={formatCurrency(totals.monthTotal)} icon={Wallet} tint="warning" />
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-accent)] w-full sm:w-auto"
        >
          <option>All</option>
          {CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <Button icon={Plus} onClick={openCreate}>
          Add Expense
        </Button>
      </div>

      <Card className="p-0">
        {loading ? (
          <Table columns={['Category', 'Qty', 'Description', 'Date', 'Amount', '']}>
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonTableRow key={i} cols={6} />
            ))}
          </Table>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="No expenses recorded"
            message="Log printing, stock purchases, travel, and other costs here."
            action={
              <Button icon={Plus} onClick={openCreate}>
                Add Expense
              </Button>
            }
          />
        ) : (
          <Table columns={['Category', 'Qty', 'Description', 'Date', 'Amount', '']}>
            {filtered.map((expense) => (
              <tr key={expense.id} className="border-b border-[var(--color-border)] last:border-0">
                <td className="py-3 px-4">
                  <Badge tone="accent">{expense.category}</Badge>
                </td>
                <td className="py-3 px-4 text-[var(--color-text-muted)]">{expense.quantity ?? '—'}</td>
                <td className="py-3 px-4 text-[var(--color-text-muted)]">{expense.description || '—'}</td>
                <td className="py-3 px-4 text-[var(--color-text-muted)]">{formatDate(expense.expense_date)}</td>
                <td className="py-3 px-4 text-[var(--color-text)] font-medium">{formatCurrency(expense.amount)}</td>
                <td className="py-3 px-4">
                  <button
                    onClick={() => setDeleteTarget(expense)}
                    className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-danger)] hover:bg-white/5"
                  >
                    <Trash2 size={15} />
                  </button>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Expense">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Amount"
              type="number"
              min="0"
              step="0.01"
              required
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
            />
            <Input
              label="Date"
              type="date"
              value={form.expense_date}
              onChange={(e) => setForm({ ...form, expense_date: e.target.value })}
            />
          </div>

          {inventoryKey && (
            <Input
              label="Quantity Purchased (pieces)"
              type="number"
              min="0"
              step="1"
              placeholder="e.g. 100"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
            />
          )}
          {inventoryKey && Number(form.quantity) > 0 && (
            <p className="text-xs text-[var(--color-accent)] -mt-2">
              This will add {form.quantity} pieces to Inventory automatically.
            </p>
          )}

          <Textarea
            label="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Add Expense'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => handleDelete(deleteTarget.id)}
        title="Delete expense?"
        message="This will permanently remove this expense record. Inventory already added will not be reversed."
      />
    </div>
  )
}