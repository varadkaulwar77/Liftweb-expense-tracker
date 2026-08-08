import { useEffect, useMemo, useState } from 'react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from 'recharts'
import {
  IndianRupee,
  TrendingUp,
  TrendingDown,
  Clock,
  ShoppingCart,
  Users,
  Wallet,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { formatCurrency, formatDate, statusTone } from '../lib/format'
import { orderCost } from '../lib/calc'
import StatCard from '../components/ui/StatCard'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Table from '../components/ui/Table'
import { SkeletonCard, SkeletonTableRow } from '../components/ui/Skeleton'
import EmptyState from '../components/ui/EmptyState'

export default function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState([])
  const [items, setItems] = useState([])
  const [clients, setClients] = useState([])
  const [expenses, setExpenses] = useState([])

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [o, oi, c, exp] = await Promise.all([
        supabase.from('orders').select('*, client:clients(business_name)').order('order_date', { ascending: false }),
        supabase.from('order_items').select('*'),
        supabase.from('clients').select('id'),
        supabase.from('expenses').select('*'),
      ])
      setOrders(o.data || [])
      setItems(oi.data || [])
      setClients(c.data || [])
      setExpenses(exp.data || [])
      setLoading(false)
    }
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

  const today = new Date().toISOString().slice(0, 10)
  const thisMonth = new Date().toISOString().slice(0, 7)

  const stats = useMemo(() => {
    let todayRevenue = 0
    let todayCost = 0
    let pendingPayments = 0
    let ordersThisMonth = 0
    let deliveredRevenue = 0

    for (const order of orders) {
      const orderItems = itemsByOrder[order.id] || []
      const subtotal = orderItems.reduce((s, i) => s + i.unit_price * i.quantity, 0) + Number(order.extra_charges || 0) - Number(order.discount || 0)
      const cost = orderCost(orderItems)

      if (order.order_date === today && order.status !== 'Cancelled') {
        todayRevenue += subtotal
        todayCost += cost
      }
      if (order.order_date?.slice(0, 7) === thisMonth && order.status !== 'Cancelled') {
        ordersThisMonth += 1
      }
      if (order.payment_status !== 'Paid' && order.status !== 'Cancelled') {
        pendingPayments += Math.max(subtotal - Number(order.advance_paid || 0) - Number(order.balance_paid || 0), 0)
      }
      if (order.status === 'Delivered') {
        deliveredRevenue += subtotal
      }
    }

    const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount || 0), 0)
    const totalProfitLoss = deliveredRevenue - totalExpenses

    return {
      todayRevenue,
      todayProfit: todayRevenue - todayCost,
      pendingPayments,
      ordersThisMonth,
      totalClients: clients.length,
      totalExpenses,
      totalProfitLoss,
    }
  }, [orders, itemsByOrder, clients, expenses, today, thisMonth])

  const chartData = useMemo(() => {
    const days = []
    for (let i = 13; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      days.push({ date: key, label: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }), revenue: 0, profit: 0 })
    }
    const map = Object.fromEntries(days.map((d) => [d.date, d]))
    for (const order of orders) {
      if (order.status === 'Cancelled') continue
      const bucket = map[order.order_date]
      if (!bucket) continue
      const orderItems = itemsByOrder[order.id] || []
      const subtotal = orderItems.reduce((s, i) => s + i.unit_price * i.quantity, 0) + Number(order.extra_charges || 0) - Number(order.discount || 0)
      const cost = orderCost(orderItems)
      bucket.revenue += subtotal
      bucket.profit += subtotal - cost
    }
    return days
  }, [orders, itemsByOrder])

  const monthlyOrders = useMemo(() => {
    const months = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      const key = d.toISOString().slice(0, 7)
      months.push({ key, label: d.toLocaleDateString('en-IN', { month: 'short' }), count: 0 })
    }
    const map = Object.fromEntries(months.map((m) => [m.key, m]))
    for (const order of orders) {
      const key = order.order_date?.slice(0, 7)
      if (map[key]) map[key].count += 1
    }
    return months
  }, [orders])

  const recentOrders = orders.slice(0, 6)

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Today's Revenue" value={formatCurrency(stats.todayRevenue)} icon={IndianRupee} tint="accent" />
        <StatCard label="Today's Profit" value={formatCurrency(stats.todayProfit)} icon={TrendingUp} tint="success" />
        <StatCard
          label="Total Profit / Loss"
          value={formatCurrency(stats.totalProfitLoss)}
          icon={stats.totalProfitLoss >= 0 ? TrendingUp : TrendingDown}
          tint={stats.totalProfitLoss >= 0 ? 'success' : 'danger'}
          delta="All delivered orders minus total expenses"
        />
        <StatCard label="Pending Payments" value={formatCurrency(stats.pendingPayments)} icon={Clock} tint="warning" />
        <StatCard label="Orders This Month" value={stats.ordersThisMonth} icon={ShoppingCart} tint="accent" />
        <StatCard label="Total Clients" value={stats.totalClients} icon={Users} tint="accent" />
        <StatCard label="Total Expenses" value={formatCurrency(stats.totalExpenses)} icon={Wallet} tint="danger" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-5 lg:col-span-2">
          <h3 className="text-sm font-semibold text-[var(--color-text)] mb-4">Revenue &amp; Profit — last 14 days</h3>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#7C5CFF" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#7C5CFF" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="prof" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#34D399" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#34D399" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#262633" vertical={false} />
              <XAxis dataKey="label" stroke="#9797A8" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#9797A8" fontSize={11} tickLine={false} axisLine={false} width={40} />
              <Tooltip
                contentStyle={{ background: '#15151D', border: '1px solid #262633', borderRadius: 12, fontSize: 12 }}
                labelStyle={{ color: '#9797A8' }}
                formatter={(value) => formatCurrency(value)}
              />
              <Area type="monotone" dataKey="revenue" stroke="#7C5CFF" fill="url(#rev)" strokeWidth={2} name="Revenue" />
              <Area type="monotone" dataKey="profit" stroke="#34D399" fill="url(#prof)" strokeWidth={2} name="Profit" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-semibold text-[var(--color-text)] mb-4">Monthly Orders</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={monthlyOrders}>
              <CartesianGrid strokeDasharray="3 3" stroke="#262633" vertical={false} />
              <XAxis dataKey="label" stroke="#9797A8" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#9797A8" fontSize={11} tickLine={false} axisLine={false} width={28} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: '#15151D', border: '1px solid #262633', borderRadius: 12, fontSize: 12 }}
                labelStyle={{ color: '#9797A8' }}
              />
              <Bar dataKey="count" fill="#7C5CFF" radius={[6, 6, 0, 0]} name="Orders" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card className="p-5">
        <h3 className="text-sm font-semibold text-[var(--color-text)] mb-2">Recent Orders</h3>
        {recentOrders.length === 0 ? (
          <EmptyState
            icon={ShoppingCart}
            title="No orders yet"
            message="Once you create an order, it'll show up here."
          />
        ) : (
          <Table columns={['Client', 'Date', 'Status', 'Payment', 'Total']}>
            {recentOrders.map((order) => {
              const orderItems = itemsByOrder[order.id] || []
              const total = orderItems.reduce((s, i) => s + i.unit_price * i.quantity, 0) + Number(order.extra_charges || 0) - Number(order.discount || 0)
              return (
                <tr key={order.id} className="border-b border-[var(--color-border)] last:border-0">
                  <td className="py-3 px-4 text-[var(--color-text)]">{order.client?.business_name || '—'}</td>
                  <td className="py-3 px-4 text-[var(--color-text-muted)]">{formatDate(order.order_date)}</td>
                  <td className="py-3 px-4">
                    <Badge tone={statusTone(order.status)}>{order.status}</Badge>
                  </td>
                  <td className="py-3 px-4">
                    <Badge tone={statusTone(order.payment_status)}>{order.payment_status}</Badge>
                  </td>
                  <td className="py-3 px-4 text-[var(--color-text)] font-medium">{formatCurrency(total)}</td>
                </tr>
              )
            })}
          </Table>
        )}
      </Card>
    </div>
  )
}