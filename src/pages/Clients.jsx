import { useEffect, useMemo, useState } from 'react'
import {
  Plus,
  Search,
  Phone,
  MessageCircle,
  Pencil,
  Trash2,
  Users,
  Star,
  AtSign,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useToast } from '../context/ToastContext'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import { Input, Textarea } from '../components/ui/Field'
import Table from '../components/ui/Table'
import EmptyState from '../components/ui/EmptyState'
import { SkeletonTableRow } from '../components/ui/Skeleton'

const emptyForm = {
  business_name: '',
  owner_name: '',
  phone: '',
  address: '',
  google_review_link: '',
  instagram: '',
  notes: '',
}

export default function Clients() {
  const toast = useToast()
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    const { data, error } = await supabase.from('clients').select('*').order('created_at', { ascending: false })
    if (error) toast.error(error.message)
    setClients(data || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return clients
    return clients.filter((c) =>
      [c.business_name, c.owner_name, c.phone].filter(Boolean).some((v) => v.toLowerCase().includes(q))
    )
  }, [clients, search])

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  function openEdit(client) {
    setEditing(client)
    setForm({ ...emptyForm, ...client })
    setModalOpen(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    const payload = { ...form }
    delete payload.id
    delete payload.created_at

    const { error } = editing
      ? await supabase.from('clients').update(payload).eq('id', editing.id)
      : await supabase.from('clients').insert(payload)

    setSaving(false)
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success(editing ? 'Client updated' : 'Client added')
    setModalOpen(false)
    load()
  }

  async function handleDelete(id) {
    const { error } = await supabase.from('clients').delete().eq('id', id)
    if (error) return toast.error(error.message)
    toast.success('Client deleted')
    load()
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
          <input
            placeholder="Search clients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border)] pl-9 pr-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]/60 outline-none focus:border-[var(--color-accent)]"
          />
        </div>
        <Button icon={Plus} onClick={openCreate}>
          Add Client
        </Button>
      </div>

      <Card className="p-0">
        {loading ? (
          <Table columns={['Store', 'Owner', 'Phone', 'Instagram', 'Actions']}>
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonTableRow key={i} cols={5} />
            ))}
          </Table>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Users}
            title={search ? 'No clients match your search' : 'No clients yet'}
            message={search ? 'Try a different name or phone number.' : 'Add your first store to get started.'}
            action={
              !search && (
                <Button icon={Plus} onClick={openCreate}>
                  Add Client
                </Button>
              )
            }
          />
        ) : (
          <Table columns={['Store', 'Owner', 'Phone', 'Instagram', 'Actions']}>
            {filtered.map((client) => (
              <tr key={client.id} className="border-b border-[var(--color-border)] last:border-0">
                <td className="py-3 px-4">
                  <div className="text-[var(--color-text)] font-medium">{client.business_name}</div>
                  {client.address && <div className="text-xs text-[var(--color-text-muted)] mt-0.5">{client.address}</div>}
                  {client.google_review_link && (
                    <a
                      href={client.google_review_link}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-[var(--color-accent)] mt-1"
                    >
                      <Star size={11} /> Review link
                    </a>
                  )}
                </td>
                <td className="py-3 px-4 text-[var(--color-text-muted)]">{client.owner_name || '—'}</td>
                <td className="py-3 px-4 text-[var(--color-text-muted)]">{client.phone || '—'}</td>
                <td className="py-3 px-4">
                  {client.instagram ? (
                    <a
                      href={`https://instagram.com/${client.instagram.replace('@', '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                    >
                      <AtSign size={12} /> {client.instagram}
                    </a>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-1">
                    {client.phone && (
                      <>
                        <a
                          href={`tel:${client.phone}`}
                          className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-success)] hover:bg-white/5"
                          title="Call"
                        >
                          <Phone size={15} />
                        </a>
                        <a
                          href={`https://wa.me/${client.phone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-success)] hover:bg-white/5"
                          title="WhatsApp"
                        >
                          <MessageCircle size={15} />
                        </a>
                      </>
                    )}
                    <button
                      onClick={() => openEdit(client)}
                      className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-accent)] hover:bg-white/5"
                      title="Edit"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(client)}
                      className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-danger)] hover:bg-white/5"
                      title="Delete"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Client' : 'Add Client'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Business Name"
            required
            value={form.business_name}
            onChange={(e) => setForm({ ...form, business_name: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Owner Name"
              value={form.owner_name}
              onChange={(e) => setForm({ ...form, owner_name: e.target.value })}
            />
            <Input
              label="Phone Number"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
          <Input
            label="Address"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Google Review Link"
              value={form.google_review_link}
              onChange={(e) => setForm({ ...form, google_review_link: e.target.value })}
            />
            <Input
              label="Instagram"
              value={form.instagram}
              onChange={(e) => setForm({ ...form, instagram: e.target.value })}
            />
          </div>
          <Textarea
            label="Notes"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : editing ? 'Save Changes' : 'Add Client'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => handleDelete(deleteTarget.id)}
        title="Delete client?"
        message={`This will permanently remove ${deleteTarget?.business_name}. This can't be undone.`}
      />
    </div>
  )
}
