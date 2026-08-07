export function formatCurrency(value) {
  const n = Number(value || 0)
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n)
}

export function formatNumber(value) {
  return new Intl.NumberFormat('en-IN').format(Number(value || 0))
}

export function formatDate(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function formatDateTime(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export const ORDER_STATUSES = ['Confirmed', 'Delivered']

export const PAYMENT_STATUSES = ['Pending', 'Partial', 'Paid']

export function statusTone(status) {
  switch (status) {
    case 'Delivered':
    case 'Paid':
      return 'success'
    case 'Partial':
      return 'warning'
    case 'Confirmed':
      return 'accent'
    default:
      return 'muted'
  }
}