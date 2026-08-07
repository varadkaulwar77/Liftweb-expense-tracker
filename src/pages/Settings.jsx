import { useEffect, useState } from 'react'
import { Save } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useToast } from '../context/ToastContext'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import { Input } from '../components/ui/Field'
import { SkeletonLine } from '../components/ui/Skeleton'

export default function Settings() {
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data, error } = await supabase.from('settings').select('*').limit(1).single()
      if (error) toast.error(error.message)
      setForm(data || {})
      setLoading(false)
    }
    load()
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    const payload = { ...form, updated_at: new Date().toISOString() }
    delete payload.id
    const { error } = await supabase.from('settings').update(payload).eq('id', form.id)
    setSaving(false)
    if (error) return toast.error(error.message)
    toast.success('Settings saved')
  }

  if (loading || !form) {
    return (
      <Card className="p-6 max-w-2xl space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonLine key={i} className="h-10 w-full" />
        ))}
      </Card>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-5">
      <Card className="p-6 space-y-4">
        <h3 className="text-sm font-semibold text-[var(--color-text)]">Business Info</h3>
        <Input
          label="Business Name"
          value={form.business_name || ''}
          onChange={(e) => setForm({ ...form, business_name: e.target.value })}
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Phone"
            value={form.phone || ''}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
          <Input
            label="Email"
            value={form.email || ''}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>
        <Input
          label="Logo URL"
          placeholder="https://..."
          value={form.logo_url || ''}
          onChange={(e) => setForm({ ...form, logo_url: e.target.value })}
        />
      </Card>

      <Card className="p-6 space-y-4">
        <h3 className="text-sm font-semibold text-[var(--color-text)]">Default Prices</h3>
        <div className="grid grid-cols-3 gap-3">
          <Input
            label="Small Stand"
            type="number"
            value={form.default_small_stand_price || ''}
            onChange={(e) => setForm({ ...form, default_small_stand_price: e.target.value })}
          />
          <Input
            label="Large Stand"
            type="number"
            value={form.default_large_stand_price || ''}
            onChange={(e) => setForm({ ...form, default_large_stand_price: e.target.value })}
          />
          <Input
            label="NFC Card"
            type="number"
            value={form.default_nfc_card_price || ''}
            onChange={(e) => setForm({ ...form, default_nfc_card_price: e.target.value })}
          />
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <h3 className="text-sm font-semibold text-[var(--color-text)]">Invoice Numbering</h3>
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Invoice Prefix"
            value={form.invoice_prefix || ''}
            onChange={(e) => setForm({ ...form, invoice_prefix: e.target.value })}
          />
          <Input label="Next Invoice #" type="number" value={form.invoice_counter || 0} disabled />
        </div>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" icon={Save} disabled={saving}>
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </form>
  )
}
