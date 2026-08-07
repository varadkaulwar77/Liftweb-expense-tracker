import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { Input } from '../components/ui/Field'
import Button from '../components/ui/Button'
import logoUrl from '../assets/logo-transparent.png'

export default function Login() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const from = location.state?.from?.pathname || '/'

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signIn(email, password)
      navigate(from, { replace: true })
    } catch (err) {
      setError(err.message || 'Could not sign in. Check your email and password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)] px-4">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-sm"
      >
        <div className="flex flex-col items-center mb-8">
          <img src={logoUrl} alt="LiftWEB Studio" className="h-14 w-auto mb-4" />
          <p className="text-sm text-[var(--color-text-muted)]">Business Tracker</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-[var(--shadow-card)] p-6 space-y-4"
        >
          <Input
            label="Email"
            type="email"
            required
            autoFocus
            placeholder="you@liftweb.studio"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            label="Password"
            type="password"
            required
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {error && <p className="text-xs text-[var(--color-danger)]">{error}</p>}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 size={16} className="animate-spin" /> : 'Sign in'}
          </Button>
        </form>

        <p className="text-center text-xs text-[var(--color-text-muted)] mt-6">
          Admin access only · LiftWEB Studio internal tool
        </p>
      </motion.div>
    </div>
  )
}