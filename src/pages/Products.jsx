import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Package } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useToast } from '../context/ToastContext'
import { manufacturingCost, productProfit, productMargin } from '../lib/calc'
import { formatCurrency } from '../lib/format'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import { Input, Select } from '../components/ui/Field'
import Table from '../components/ui/Table'
import Badge from '../components/ui/Badge'
import EmptyState from '../components/ui/EmptyState'
import { SkeletonTableRow } from '../components/ui/Skeleton'

const emptyForm = {
  name: '',
  inventory_key: 'small_stand',
  selling_price: '',
  stand_cost: '',
  printing_cost: '',
  nfc_tag_cost: '',
  sticker_cost: '',
  packaging_box_cost: '',
  other_cost: '',
}

const inventoryOptions = [
  { value: 'small_stand', label: 'Small Stands' },
  { value: 'large_stand', label: 'Large Stands' },
  { value: 'nfc_tag', label: 'NFC Tags' },
  { value: 'sticker', label: '3M Stickers' },
  { value: 'nfc_card', label: 'NFC Cards' },
  { value: 'packaging_box', label: 'Packaging Boxes' },
]

export default function Products() {
  const toast = useToast()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: true })
    if (error) toast.error(error.message)
    setProducts(data || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  function openEdit(product) {
    setEditing(product)
    setForm({ ...emptyForm, ...product })
    setModalOpen(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    const payload = {
      name: form.name,
      inventory_key: form.inventory_key,
      selling_price: Number(form.selling_price || 0),
      stand_cost: Number(form.stand_cost || 0),
      printing_cost: Number(form.printing_cost || 0),
      nfc_tag_cost: Number(form.nfc_tag_cost || 0),
      sticker_cost: Number(form.sticker_cost || 0),
      packaging_box_cost: Number(form.packaging_box_cost || 0),
      other_cost: Number(form.other_cost || 0),
    }

    const { error } = editing
      ? await supabase.from('products').update(payload).eq('id', editing.id)
      : await supabase.from('products').insert(payload)

    setSaving(false)
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success(editing ? 'Product updated' : 'Product added')
    setModalOpen(false)
    load()
  }

  async function handleDelete(id) {
    const { error } = await supabase.from('products').delete().eq('id', id)
    if (error) return toast.error(error.message)
    toast.success('Product deleted')
    load()
  }

  const previewCost = manufacturingCost(form)
  const previewProfit = Number(form.selling_price || 0) - previewCost
  const previewMargin = Number(form.selling_price || 0) > 0 ? (previewProfit / Number(form.selling_price)) * 100 : 0

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Button icon={Plus} onClick={openCreate}>
          Add Product
        </Button>
      </div>

      <Card className="p-0">
        {loading ? (
          <Table columns={['Product', 'Selling Price', 'Manufacturing Cost', 'Profit', 'Margin', 'Actions']}>
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonTableRow key={i} cols={6} />
            ))}
          </Table>
        ) : products.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No products yet"
            message="Add Small NFC Stand, Large NFC Stand, or NFC Card to start pricing orders."
            action={
              <Button icon={Plus} onClick={openCreate}>
                Add Product
              </Button>
            }
          />
        ) : (
          <Table columns={['Product', 'Selling Price', 'Manufacturing Cost', 'Profit', 'Margin', 'Actions']}>
            {products.map((product) => {
              const cost = manufacturingCost(product)
              const profit = productProfit(product)
              const margin = productMargin(product)
              return (
                <tr key={product.id} className="border-b border-[var(--color-border)] last:border-0">
                  <td className="py-3 px-4 text-[var(--color-text)] font-medium">{product.name}</td>
                  <td className="py-3 px-4 text-[var(--color-text)]">{formatCurrency(product.selling_price)}</td>
                  <td className="py-3 px-4 text-[var(--color-text-muted)]">{formatCurrency(cost)}</td>
                  <td className={`py-3 px-4 font-medium ${profit >= 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}`}>
                    {formatCurrency(profit)}
                  </td>
                  <td className="py-3 px-4">
                    <Badge tone={margin >= 40 ? 'success' : margin >= 15 ? 'warning' : 'danger'}>
                      {margin.toFixed(1)}%
                    </Badge>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEdit(product)}
                        className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-accent)] hover:bg-white/5"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(product)}
                        className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-danger)] hover:bg-white/5"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </Table>
        )}
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Product' : 'Add Product'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Product Name"
              required
              placeholder="Small NFC Stand"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <Select
              label="Inventory Item"
              value={form.inventory_key}
              onChange={(e) => setForm({ ...form, inventory_key: e.target.value })}
            >
              {inventoryOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </div>

          <Input
            label="Selling Price"
            type="number"
            min="0"
            step="0.01"
            required
            value={form.selling_price}
            onChange={(e) => setForm({ ...form, selling_price: e.target.value })}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Stand Cost"
              type="number"
              min="0"
              step="0.01"
              value={form.stand_cost}
              onChange={(e) => setForm({ ...form, stand_cost: e.target.value })}
            />
            <Input
              label="Printing Cost"
              type="number"
              min="0"
              step="0.01"
              value={form.printing_cost}
              onChange={(e) => setForm({ ...form, printing_cost: e.target.value })}
            />
            <Input
              label="NFC Tag Cost"
              type="number"
              min="0"
              step="0.01"
              value={form.nfc_tag_cost}
              onChange={(e) => setForm({ ...form, nfc_tag_cost: e.target.value })}
            />
            <Input
              label="3M Sticker Cost"
              type="number"
              min="0"
              step="0.01"
              value={form.sticker_cost}
              onChange={(e) => setForm({ ...form, sticker_cost: e.target.value })}
            />
            <Input
              label="Packaging Box Cost"
              type="number"
              min="0"
              step="0.01"
              value={form.packaging_box_cost}
              onChange={(e) => setForm({ ...form, packaging_box_cost: e.target.value })}
            />
          </div>
          <Input
            label="Other Cost"
            type="number"
            min="0"
            step="0.01"
            value={form.other_cost}
            onChange={(e) => setForm({ ...form, other_cost: e.target.value })}
          />

          <div className="rounded-xl bg-[var(--color-surface-2)] border border-[var(--color-border)] p-4 grid grid-cols-3 gap-3">
            <div>
              <p className="text-xs text-[var(--color-text-muted)] mb-1">Mfg. Cost</p>
              <p className="text-sm font-semibold text-[var(--color-text)]">{formatCurrency(previewCost)}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--color-text-muted)] mb-1">Profit</p>
              <p className={`text-sm font-semibold ${previewProfit >= 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}`}>
                {formatCurrency(previewProfit)}
              </p>
            </div>
            <div>
              <p className="text-xs text-[var(--color-text-muted)] mb-1">Margin</p>
              <p className="text-sm font-semibold text-[var(--color-text)]">{previewMargin.toFixed(1)}%</p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : editing ? 'Save Changes' : 'Add Product'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => handleDelete(deleteTarget.id)}
        title="Delete product?"
        message={`This will permanently remove ${deleteTarget?.name}. Existing orders keep their saved price.`}
      />
    </div>
  )
}