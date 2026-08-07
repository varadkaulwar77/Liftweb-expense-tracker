import { useEffect, useMemo, useState } from 'react'
import { Plus, Pencil, Trash2, ShoppingCart, X, Search, Wallet } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useToast } from '../context/ToastContext'
import { orderSubtotal, orderGrandTotal, orderRemaining, paymentStatus, manufacturingCost, productComponents } from '../lib/calc'
import { formatCurrency, formatDate, ORDER_STATUSES, statusTone } from '../lib/format'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import { Input, Select } from '../components/ui/Field'
import Table from '../components/ui/Table'
import Badge from '../components/ui/Badge'
import EmptyState from '../components/ui/EmptyState'
import { SkeletonTableRow } from '../components/ui/Skeleton'

function newLineItem() {
  return { key: crypto.randomUUID(), product_id: '', quantity: 1 }
}

export default function Orders() {
  const toast = useToast()
  const [orders, setOrders] = useState([])
  const [items, setItems] = useState([])
  const [clients, setClients] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [saving, setSaving] = useState(false)

  const [clientId, setClientId] = useState('')
  const [status, setStatus] = useState('Confirmed')
  const [advancePaid, setAdvancePaid] = useState('0')
  const [balancePaid, setBalancePaid] = useState('0')
  const [extraCharges, setExtraCharges] = useState('0')
  const [discount, setDiscount] = useState('0')
  const [paymentMode, setPaymentMode] = useState('Cash')
  const [orderDate, setOrderDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [lineItems, setLineItems] = useState([newLineItem()])

  async function load() {
    setLoading(true)
    const [o, oi, c, p] = await Promise.all([
      supabase.from('orders').select('*, client:clients(business_name, phone)').order('order_date', { ascending: false }),
      supabase.from('order_items').select('*'),
      supabase.from('clients').select('id, business_name').order('business_name'),
      supabase.from('products').select('*').eq('active', true),
    ])
    setOrders(o.data || [])
    setItems(oi.data || [])
    setClients(c.data || [])
    setProducts(p.data || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const itemsByOrder = useMemo(() => {
    const map = {}
    for (const it of items) {
      if (!map[it.order_id]) map[it.order_id] = []
      map[it.order_id].push(it)
    }
    return map
  }, [items])

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      if (!search.trim()) return true
      const q = search.toLowerCase()
      return (o.client?.business_name || '').toLowerCase().includes(q) || (o.order_number || '').toLowerCase().includes(q)
    })
  }, [orders, search])

  const confirmedOrders = useMemo(() => filtered.filter((o) => o.status === 'Confirmed'), [filtered])
  const deliveredOrders = useMemo(() => filtered.filter((o) => o.status === 'Delivered'), [filtered])

  function resetForm() {
    setClientId('')
    setStatus('Confirmed')
    setAdvancePaid('0')
    setBalancePaid('0')
    setExtraCharges('0')
    setDiscount('0')
    setPaymentMode('Cash')
    setOrderDate(new Date().toISOString().slice(0, 10))
    setLineItems([newLineItem()])
  }

  function openCreate() {
    setEditing(null)
    resetForm()
    setModalOpen(true)
  }

  function openEdit(order) {
    setEditing(order)
    setClientId(order.client_id || '')
    setStatus(order.status)
    setAdvancePaid(String(order.advance_paid || 0))
    setBalancePaid(String(order.balance_paid || 0))
    setExtraCharges(String(order.extra_charges || 0))
    setDiscount(String(order.discount || 0))
    setPaymentMode(order.payment_mode || 'Cash')
    setOrderDate(order.order_date)
    const existingItems = (itemsByOrder[order.id] || []).map((it) => ({
      key: it.id,
      product_id: it.product_id || '',
      quantity: it.quantity,
    }))
    setLineItems(existingItems.length ? existingItems : [newLineItem()])
    setModalOpen(true)
  }

  function updateLine(key, patch) {
    setLineItems((prev) => prev.map((li) => (li.key === key ? { ...li, ...patch } : li)))
  }

  function addLine() {
    setLineItems((prev) => [...prev, newLineItem()])
  }

  function removeLine(key) {
    setLineItems((prev) => (prev.length > 1 ? prev.filter((li) => li.key !== key) : prev))
  }

  const priceableItems = useMemo(() => {
    return lineItems
      .filter((li) => li.product_id)
      .map((li) => {
        const product = products.find((p) => p.id === li.product_id)
        return {
          ...li,
          unit_price: product?.selling_price || 0,
          unit_cost: product ? manufacturingCost(product) : 0,
        }
      })
  }, [lineItems, products])

  const subtotal = orderSubtotal(priceableItems)
  const grandTotal = orderGrandTotal(priceableItems, extraCharges, discount)
  const totalPaid = Number(advancePaid || 0) + Number(balancePaid || 0)
  const remaining = orderRemaining(priceableItems, totalPaid, extraCharges, discount)

  function handleReceiveFullPayment() {
    if (grandTotal <= 0) {
      toast.error('Add products to the order first.')
      return
    }
    const stillOwed = Math.max(grandTotal - Number(advancePaid || 0), 0)
    setBalancePaid(String(stillOwed))
    setStatus('Delivered')
    toast.info('Marked as fully paid — save the order to confirm delivery.')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (priceableItems.length === 0) {
      toast.error('Add at least one product to the order.')
      return
    }

    const itemRowsPreview = priceableItems.map((li) => ({
      product_id: li.product_id,
      quantity: Number(li.quantity || 1),
    }))

    const shortfall = await checkStock(itemRowsPreview, products)
    if (shortfall.length > 0) {
      toast.error(
        `Not enough stock: ${shortfall
          .map((s) => `${s.item_name} (have ${s.available}, need ${s.needed})`)
          .join(', ')}`
      )
      return
    }

    let previousStatus = editing?.status
    const becomingDelivered = status === 'Delivered' && previousStatus !== 'Delivered'

    setSaving(true)

    const computedPaymentStatus = paymentStatus(grandTotal, totalPaid)
    const orderPayload = {
      client_id: clientId || null,
      status,
      advance_paid: Number(advancePaid || 0),
      balance_paid: Number(balancePaid || 0),
      extra_charges: Number(extraCharges || 0),
      discount: Number(discount || 0),
      payment_status: computedPaymentStatus,
      payment_mode: paymentMode,
      order_date: orderDate,
    }

    let orderId = editing?.id

    if (editing) {
      const { error } = await supabase.from('orders').update(orderPayload).eq('id', editing.id)
      if (error) {
        setSaving(false)
        return toast.error(error.message)
      }
      await supabase.from('order_items').delete().eq('order_id', editing.id)
    } else {
      const orderNumber = `ORD-${Date.now().toString().slice(-8)}`
      const { data, error } = await supabase
        .from('orders')
        .insert({ ...orderPayload, order_number: orderNumber })
        .select()
        .single()
      if (error) {
        setSaving(false)
        return toast.error(error.message)
      }
      orderId = data.id
    }

    const itemRows = priceableItems.map((li) => {
      const product = products.find((p) => p.id === li.product_id)
      return {
        order_id: orderId,
        product_id: li.product_id,
        product_name: product?.name || 'Product',
        quantity: Number(li.quantity || 1),
        unit_price: li.unit_price,
        unit_cost: li.unit_cost,
      }
    })

    const { error: itemsError } = await supabase.from('order_items').insert(itemRows)
    if (itemsError) {
      setSaving(false)
      return toast.error(itemsError.message)
    }

    if (becomingDelivered) {
      await reduceInventory(itemRows, products)
    }

    setSaving(false)
    toast.success(editing ? 'Order updated' : 'Order created')
    setModalOpen(false)
    load()
  }

  async function checkStock(itemRows, productList) {
    const needed = {}
    for (const row of itemRows) {
      const product = productList.find((p) => p.id === row.product_id)
      if (!product) continue
      for (const itemKey of productComponents(product)) {
        needed[itemKey] = (needed[itemKey] || 0) + row.quantity
      }
    }

    const keys = Object.keys(needed)
    if (keys.length === 0) return []

    const { data: invRows } = await supabase.from('inventory').select('*').in('item_key', keys)
    const shortfall = []
    for (const key of keys) {
      const inv = invRows?.find((i) => i.item_key === key)
      const available = Number(inv?.quantity || 0)
      if (available < needed[key]) {
        shortfall.push({ item_name: inv?.item_name || key, available, needed: needed[key] })
      }
    }
    return shortfall
  }

  async function reduceInventory(itemRows, productList) {
    const toDeduct = {}
    for (const row of itemRows) {
      const product = productList.find((p) => p.id === row.product_id)
      if (!product) continue
      for (const itemKey of productComponents(product)) {
        toDeduct[itemKey] = (toDeduct[itemKey] || 0) + row.quantity
      }
    }

    for (const [itemKey, qty] of Object.entries(toDeduct)) {
      const { data: inv } = await supabase.from('inventory').select('*').eq('item_key', itemKey).single()
      if (inv) {
        await supabase
          .from('inventory')
          .update({ quantity: Math.max(inv.quantity - qty, 0), updated_at: new Date().toISOString() })
          .eq('item_key', itemKey)
      }
    }
  }

  async function handleDelete(id) {
    const { error } = await supabase.from('orders').delete().eq('id', id)
    if (error) return toast.error(error.message)
    toast.success('Order deleted')
    load()
  }

  function OrdersTable({ list, emptyTitle, emptyMessage }) {
    if (loading) {
      return (
        <Table columns={['Order', 'Client', 'Date', 'Payment', 'Total', 'Actions']}>
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonTableRow key={i} cols={6} />
          ))}
        </Table>
      )
    }
    if (list.length === 0) {
      return <EmptyState icon={ShoppingCart} title={emptyTitle} message={emptyMessage} />
    }
    return (
      <Table columns={['Order', 'Client', 'Date', 'Payment', 'Total', 'Actions']}>
        {list.map((order) => {
          const orderItems = itemsByOrder[order.id] || []
          const total = orderSubtotal(orderItems) + Number(order.extra_charges || 0) - Number(order.discount || 0)
          return (
            <tr key={order.id} className="border-b border-[var(--color-border)] last:border-0">
              <td className="py-3 px-4 text-[var(--color-text)] font-medium">{order.order_number}</td>
              <td className="py-3 px-4 text-[var(--color-text-muted)]">{order.client?.business_name || '—'}</td>
              <td className="py-3 px-4 text-[var(--color-text-muted)]">{formatDate(order.order_date)}</td>
              <td className="py-3 px-4">
                <Badge tone={statusTone(order.payment_status)}>{order.payment_status}</Badge>
              </td>
              <td className="py-3 px-4 text-[var(--color-text)] font-medium">{formatCurrency(total)}</td>
              <td className="py-3 px-4">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEdit(order)}
                    className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-accent)] hover:bg-white/5"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(order)}
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
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
          <input
            placeholder="Search by client or order #..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border)] pl-9 pr-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]/60 outline-none focus:border-[var(--color-accent)]"
          />
        </div>
        <Button icon={Plus} onClick={openCreate}>
          New Order
        </Button>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-sm font-semibold text-[var(--color-text)]">Confirmed — Advance Paid</h2>
          <Badge tone="accent">{confirmedOrders.length}</Badge>
        </div>
        <Card className="p-0">
          <OrdersTable
            list={confirmedOrders}
            emptyTitle="No orders in progress"
            emptyMessage="Orders you've confirmed and taken an advance for will show here until delivered."
          />
        </Card>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-sm font-semibold text-[var(--color-text)]">Delivered — Fully Paid</h2>
          <Badge tone="success">{deliveredOrders.length}</Badge>
        </div>
        <Card className="p-0">
          <OrdersTable
            list={deliveredOrders}
            emptyTitle="No completed orders yet"
            emptyMessage="Once you receive the remaining balance and deliver, orders move here."
          />
        </Card>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Order' : 'New Order'} width="max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Select label="Customer" value={clientId} onChange={(e) => setClientId(e.target.value)} required>
              <option value="">Select a client</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.business_name}
                </option>
              ))}
            </Select>
            <Input
              label="Order Date"
              type="date"
              value={orderDate}
              onChange={(e) => setOrderDate(e.target.value)}
              required
            />
          </div>

          <div>
            <p className="text-xs font-medium text-[var(--color-text-muted)] mb-1.5">Products</p>
            <div className="space-y-2">
              {lineItems.map((li) => (
                <div key={li.key} className="flex gap-2 items-center">
                  <select
                    value={li.product_id}
                    onChange={(e) => updateLine(li.key, { product_id: e.target.value })}
                    className="flex-1 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-accent)]"
                  >
                    <option value="">Select product</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} — {formatCurrency(p.selling_price)}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="1"
                    value={li.quantity}
                    onChange={(e) => updateLine(li.key, { quantity: e.target.value })}
                    className="w-20 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-accent)]"
                  />
                  <button
                    type="button"
                    onClick={() => removeLine(li.key)}
                    className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-danger)]"
                  >
                    <X size={15} />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addLine}
              className="mt-2 text-xs font-medium text-[var(--color-accent)] hover:brightness-110"
            >
              + Add another product
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
              {ORDER_STATUSES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </Select>
            <Input
              label="Advance Paid"
              type="number"
              min="0"
              step="0.01"
              value={advancePaid}
              onChange={(e) => setAdvancePaid(e.target.value)}
            />
            <Input
              label="Extra Charges"
              type="number"
              min="0"
              step="0.01"
              value={extraCharges}
              onChange={(e) => setExtraCharges(e.target.value)}
            />
          </div>

          <Input
            label="Discount"
            type="number"
            min="0"
            step="0.01"
            placeholder="0"
            value={discount}
            onChange={(e) => setDiscount(e.target.value)}
          />

          <Select label="Payment Mode" value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)}>
            <option>Cash</option>
            <option>UPI</option>
            <option>Bank Transfer</option>
            <option>Card</option>
            <option>Other</option>
          </Select>

          <div className="rounded-xl bg-[var(--color-surface-2)] border border-[var(--color-border)] p-4">
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div>
                <p className="text-xs text-[var(--color-text-muted)] mb-1">Subtotal</p>
                <p className="text-sm font-semibold text-[var(--color-text)]">{formatCurrency(subtotal)}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--color-text-muted)] mb-1">Discount</p>
                <p className="text-sm font-semibold text-[var(--color-accent)]">
                  {Number(discount) > 0 ? `- ${formatCurrency(discount)}` : formatCurrency(0)}
                </p>
              </div>
              <div>
                <p className="text-xs text-[var(--color-text-muted)] mb-1">Grand Total</p>
                <p className="text-sm font-semibold text-[var(--color-text)]">{formatCurrency(grandTotal)}</p>
              </div>
            </div>
            <div className="mb-3">
              <p className="text-xs text-[var(--color-text-muted)] mb-1">Remaining</p>
              <p className="text-sm font-semibold text-[var(--color-warning)]">{formatCurrency(remaining)}</p>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              icon={Wallet}
              onClick={handleReceiveFullPayment}
              disabled={remaining <= 0}
              className="w-full justify-center"
            >
              Receive Full Payment &amp; Mark Delivered
            </Button>
          </div>

          {status === 'Delivered' && (!editing || editing.status !== 'Delivered') && (
            <p className="text-xs text-[var(--color-accent)]">
              Marking this order Delivered will automatically reduce matching inventory stock.
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : editing ? 'Save Changes' : 'Create Order'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => handleDelete(deleteTarget.id)}
        title="Delete order?"
        message={`This will permanently remove order ${deleteTarget?.order_number}. This can't be undone.`}
      />
    </div>
  )
}