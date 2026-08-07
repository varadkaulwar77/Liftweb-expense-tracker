import { useEffect, useMemo, useState } from 'react'
import { FileText, Download, Printer, MessageCircle, Search } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useToast } from '../context/ToastContext'
import { buildAdvanceInvoicePDF } from '../lib/invoice'
import { buildReceiptPDF } from '../lib/receipt'
import { orderSubtotal } from '../lib/calc'
import { formatCurrency, formatDate } from '../lib/format'
import Card from '../components/ui/Card'
import Table from '../components/ui/Table'
import Badge from '../components/ui/Badge'
import EmptyState from '../components/ui/EmptyState'
import { SkeletonTableRow } from '../components/ui/Skeleton'

export default function Invoices() {
  const toast = useToast()
  const [orders, setOrders] = useState([])
  const [items, setItems] = useState([])
  const [invoices, setInvoices] = useState([])
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  async function load() {
    setLoading(true)
    const [o, oi, inv, s] = await Promise.all([
      supabase.from('orders').select('*, client:clients(*)').order('order_date', { ascending: false }),
      supabase.from('order_items').select('*'),
      supabase.from('invoices').select('*'),
      supabase.from('settings').select('*').limit(1).single(),
    ])
    setOrders(o.data || [])
    setItems(oi.data || [])
    setInvoices(inv.data || [])
    setSettings(s.data || null)
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

  const docByOrderAndType = useMemo(() => {
    const map = {}
    for (const inv of invoices) map[`${inv.order_id}:${inv.doc_type}`] = inv
    return map
  }, [invoices])

  const invoiceRows = useMemo(() => orders.map((order) => ({ order, kind: 'invoice' })), [orders])
  const receiptRows = useMemo(
    () => orders.filter((o) => o.status === 'Delivered').map((order) => ({ order, kind: 'receipt' })),
    [orders]
  )

  function matchesSearch(order) {
    const q = search.toLowerCase().trim()
    if (!q) return true
    return (
      (order.client?.business_name || '').toLowerCase().includes(q) ||
      (order.order_number || '').toLowerCase().includes(q)
    )
  }

  const filteredInvoices = useMemo(() => invoiceRows.filter((r) => matchesSearch(r.order)), [invoiceRows, search])
  const filteredReceipts = useMemo(() => receiptRows.filter((r) => matchesSearch(r.order)), [receiptRows, search])

  async function ensureDocNumber(order, kind) {
    const existing = docByOrderAndType[`${order.id}:${kind}`]
    if (existing) return { docNumber: existing.invoice_number, seqNumber: existing.seq_number }

    const sibling = invoices.find((inv) => inv.order_id === order.id)
    let seqNumber = sibling?.seq_number

    if (!seqNumber) {
      seqNumber = Number(settings?.invoice_counter || 0) + 1
      if (settings?.id) {
        await supabase.from('settings').update({ invoice_counter: seqNumber }).eq('id', settings.id)
      }
      setSettings((prev) => (prev ? { ...prev, invoice_counter: seqNumber } : prev))
    }

    const prefix = settings?.invoice_prefix || 'LWS'
    const year = new Date(order.order_date || Date.now()).getFullYear()
    const seqStr = String(seqNumber).padStart(3, '0')
    const docNumber =
      kind === 'invoice' ? `${prefix}-INV-${year}-${seqStr}-ADV` : `${prefix}-REC-${year}-${seqStr}`

    const { error } = await supabase.from('invoices').insert({
      order_id: order.id,
      invoice_number: docNumber,
      doc_type: kind,
      seq_number: seqNumber,
    })
    if (error) throw error

    setInvoices((prev) => [...prev, { order_id: order.id, invoice_number: docNumber, doc_type: kind, seq_number: seqNumber }])
    return { docNumber, seqNumber }
  }

  async function buildDoc(order, kind) {
    const { docNumber } = await ensureDocNumber(order, kind)

    if (kind === 'invoice') {
      const doc = await buildAdvanceInvoicePDF({
        order,
        items: itemsByOrder[order.id] || [],
        client: order.client,
        settings,
        docNumber,
      })
      return { doc, docNumber }
    }

    const advanceDoc =
      docByOrderAndType[`${order.id}:invoice`] || invoices.find((inv) => inv.order_id === order.id && inv.doc_type === 'invoice')
    const doc = await buildReceiptPDF({
      order,
      items: itemsByOrder[order.id] || [],
      client: order.client,
      settings,
      docNumber,
      refDocNumber: advanceDoc?.invoice_number,
    })
    return { doc, docNumber }
  }

  async function handleDownload(order, kind) {
    try {
      const { doc, docNumber } = await buildDoc(order, kind)
      doc.save(`${docNumber}.pdf`)
    } catch (err) {
      toast.error(err.message)
    }
  }

  async function handlePrint(order, kind) {
    try {
      const { doc } = await buildDoc(order, kind)
      doc.autoPrint()
      window.open(doc.output('bloburl'), '_blank')
    } catch (err) {
      toast.error(err.message)
    }
  }

  async function handleShare(order, kind) {
    if (!order.client?.phone) {
      toast.error('This client has no phone number saved.')
      return
    }
    try {
      const { docNumber } = await buildDoc(order, kind)
      const orderItems = itemsByOrder[order.id] || []
      const total = orderSubtotal(orderItems) + Number(order.extra_charges || 0) - Number(order.discount || 0)
      const label = kind === 'invoice' ? 'advance invoice' : 'receipt'
      const message = `Hi ${order.client.business_name}, here's your ${label} ${docNumber} for ${formatCurrency(
        total
      )} from ${settings?.business_name || 'LiftWEB Studio'}. Please find the PDF attached.`
      const phone = order.client.phone.replace(/\D/g, '')
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank')
      toast.info('WhatsApp opened — attach the downloaded PDF to send it.')
    } catch (err) {
      toast.error(err.message)
    }
  }

  function DocTable({ rows, emptyTitle, emptyMessage }) {
    if (loading) {
      return (
        <Table columns={['Document', 'Client', 'Date', 'Total', 'Actions']}>
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonTableRow key={i} cols={5} />
          ))}
        </Table>
      )
    }
    if (rows.length === 0) {
      return <EmptyState icon={FileText} title={emptyTitle} message={emptyMessage} />
    }
    return (
      <Table columns={['Document', 'Client', 'Date', 'Total', 'Actions']}>
        {rows.map(({ order, kind }) => {
          const orderItems = itemsByOrder[order.id] || []
          const total = orderSubtotal(orderItems) + Number(order.extra_charges || 0) - Number(order.discount || 0)
          const existingDoc = docByOrderAndType[`${order.id}:${kind}`]
          return (
            <tr key={`${order.id}:${kind}`} className="border-b border-[var(--color-border)] last:border-0">
              <td className="py-3 px-4 text-[var(--color-text)] font-medium">
                {existingDoc?.invoice_number || (
                  <span className="text-[var(--color-text-muted)] font-normal">Not generated</span>
                )}
                <div className="text-xs text-[var(--color-text-muted)] font-normal mt-0.5">{order.order_number}</div>
              </td>
              <td className="py-3 px-4 text-[var(--color-text-muted)]">{order.client?.business_name || '—'}</td>
              <td className="py-3 px-4 text-[var(--color-text-muted)]">{formatDate(order.order_date)}</td>
              <td className="py-3 px-4 text-[var(--color-text)] font-medium">{formatCurrency(total)}</td>
              <td className="py-3 px-4">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleDownload(order, kind)}
                    className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-accent)] hover:bg-white/5"
                    title="Download PDF"
                  >
                    <Download size={15} />
                  </button>
                  <button
                    onClick={() => handlePrint(order, kind)}
                    className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-accent)] hover:bg-white/5"
                    title="Print"
                  >
                    <Printer size={15} />
                  </button>
                  <button
                    onClick={() => handleShare(order, kind)}
                    className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-success)] hover:bg-white/5"
                    title="Share via WhatsApp"
                  >
                    <MessageCircle size={15} />
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
      <div className="relative w-full sm:max-w-xs">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
        <input
          placeholder="Search by client or order #..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border)] pl-9 pr-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]/60 outline-none focus:border-[var(--color-accent)]"
        />
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-sm font-semibold text-[var(--color-text)]">Advance Invoices</h2>
          <Badge tone="accent">{filteredInvoices.length}</Badge>
        </div>
        <p className="text-xs text-[var(--color-text-muted)] mb-3">
          Given to the customer when they pay the advance to confirm an order.
        </p>
        <Card className="p-0">
          <DocTable
            rows={filteredInvoices}
            emptyTitle="No advance invoices yet"
            emptyMessage="These generate automatically once you create an order."
          />
        </Card>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-sm font-semibold text-[var(--color-text)]">Final Receipts</h2>
          <Badge tone="success">{filteredReceipts.length}</Badge>
        </div>
        <p className="text-xs text-[var(--color-text-muted)] mb-3">
          Given to the customer once the order is fully paid and delivered.
        </p>
        <Card className="p-0">
          <DocTable
            rows={filteredReceipts}
            emptyTitle="No receipts yet"
            emptyMessage="A receipt appears here as soon as an order is marked Delivered."
          />
        </Card>
      </div>
    </div>
  )
}