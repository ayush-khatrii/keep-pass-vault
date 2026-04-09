'use client'

import { useState } from 'react'
import { LockKeyhole, ShieldCheck, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface VaultLockProps {
  onUnlock: (password: string) => void
}

export function VaultLock({ onUnlock }: VaultLockProps) {
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleUnlock = async () => {
    if (!password.trim()) {
      setError('Please enter your master password')
      return
    }
    setError('')
    setLoading(true)
    // Small delay to show loading state
    await new Promise((r) => setTimeout(r, 200))
    onUnlock(password)
    setLoading(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleUnlock()
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-violet-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] rounded-full bg-indigo-500/8 blur-[100px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-md">
        {/* Glass card */}
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl shadow-black/50 p-8">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="relative mb-4">
              <div className="absolute inset-0 rounded-2xl bg-violet-500/30 blur-xl" />
              <div className="relative flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-500/30">
                <LockKeyhole className="w-8 h-8 text-white" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">SecurePass</h1>
            <p className="text-sm text-white/40 mt-1">Your encrypted password vault</p>
          </div>

          {/* Form */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-white/50 mb-2 uppercase tracking-widest">
                Master Password
              </label>
              <div className="relative">
                <input
                  id="master-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Enter your master password"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 pr-11 text-white placeholder:text-white/20 text-sm outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 transition-all"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {error && (
                <p className="mt-2 text-xs text-red-400">
                  {error}
                </p>
              )}
            </div>

            <Button
              id="unlock-btn"
              onClick={handleUnlock}
              disabled={loading}
              className="w-full h-11 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-lg shadow-violet-500/25 transition-all border-0 disabled:opacity-60"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Unlocking...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" />
                  Unlock Vault
                </span>
              )}
            </Button>
          </div>

          <p className="mt-6 text-center text-xs text-white/20">
            Encrypted with AES-256-GCM · Keys never leave your device
          </p>
        </div>
      </div>
    </div>
  )
}
