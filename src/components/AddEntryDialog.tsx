'use client'

import { useState } from 'react'
import { encrypt } from '@/lib/crypto'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { X, Plus, Eye, EyeOff, Loader2 } from 'lucide-react'

interface AddEntryDialogProps {
  masterPassword: string
  onSuccess: () => void
  onClose: () => void
}

export function AddEntryDialog({ masterPassword, onSuccess, onClose }: AddEntryDialogProps) {
  const [title, setTitle] = useState('')
  const [value, setValue] = useState('')
  const [showValue, setShowValue] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const handleSave = async () => {
    if (!title.trim()) {
      setError('Title is required')
      return
    }
    if (!value.trim()) {
      setError('Value is required')
      return
    }
    setError('')
    setLoading(true)

    try {
      // Encrypt BOTH title and value independently (each gets own salt+IV)
      const [encTitle, encValue] = await Promise.all([
        encrypt(title, masterPassword),
        encrypt(value, masterPassword),
      ])

      const { error: dbError } = await supabase.from('vault').insert({
        title: JSON.stringify({ c: encTitle.ciphertext, s: encTitle.salt, i: encTitle.iv }),
        value: JSON.stringify({ c: encValue.ciphertext, s: encValue.salt, i: encValue.iv }),
      })

      if (dbError) throw dbError

      onSuccess()
      onClose()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save entry'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-[#13131a] shadow-2xl shadow-black/60 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-violet-500/20">
              <Plus className="w-4 h-4 text-violet-400" />
            </div>
            <h2 className="text-base font-semibold text-white">New Vault Entry</h2>
          </div>
          <button
            onClick={onClose}
            className="text-white/30 hover:text-white/70 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-medium text-white/40 mb-2 uppercase tracking-widest">
              Title
            </label>
            <input
              id="entry-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Gmail, GitHub, Bank..."
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/20 text-sm outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 transition-all"
              autoFocus
            />
          </div>

          {/* Value */}
          <div>
            <label className="block text-xs font-medium text-white/40 mb-2 uppercase tracking-widest">
              Value / Password
            </label>
            <div className="relative">
              <input
                id="entry-value"
                type={showValue ? 'text' : 'password'}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="Enter the secret value"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 pr-11 text-white placeholder:text-white/20 text-sm outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowValue(!showValue)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
              >
                {showValue ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              id="cancel-entry-btn"
              onClick={onClose}
              className="flex-1 h-10 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-sm transition-all"
            >
              Cancel
            </Button>
            <Button
              id="save-entry-btn"
              onClick={handleSave}
              disabled={loading}
              className="flex-1 h-10 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-lg shadow-violet-500/25 border-0 transition-all disabled:opacity-60"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Encrypting...
                </span>
              ) : (
                'Save Encrypted'
              )}
            </Button>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-white/15">
          Both fields are AES-256-GCM encrypted before storage
        </p>
      </div>
    </div>
  )
}
