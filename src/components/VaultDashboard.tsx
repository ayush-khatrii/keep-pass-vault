'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase, VaultEntry } from '@/lib/supabase'
import { decrypt } from '@/lib/crypto'
import { AddEntryDialog } from '@/components/AddEntryDialog'
import { Button } from '@/components/ui/button'
import {
  Plus, Lock, Eye, EyeOff, Copy, Check, Trash2, Shield,
  KeyRound, RefreshCw, AlertCircle
} from 'lucide-react'

interface DecryptedEntry {
  id: string
  title: string
  value: string
  created_at: string
}

interface VaultDashboardProps {
  masterPassword: string
  onLock: () => void
}

export function VaultDashboard({ masterPassword, onLock }: VaultDashboardProps) {
  const [entries, setEntries] = useState<DecryptedEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set())
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchAndDecrypt = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data, error: dbError } = await supabase
        .from('vault')
        .select('*')
        .order('created_at', { ascending: false })

      if (dbError) throw dbError

      const decrypted: DecryptedEntry[] = await Promise.all(
        (data as VaultEntry[]).map(async (entry) => {
          try {
            // Parse the JSON-wrapped encrypted payloads
            const titlePayload = JSON.parse(entry.title)
            const valuePayload = JSON.parse(entry.value)

            const [decTitle, decValue] = await Promise.all([
              decrypt(titlePayload.c, masterPassword, titlePayload.s, titlePayload.i),
              decrypt(valuePayload.c, masterPassword, valuePayload.s, valuePayload.i),
            ])

            return { id: entry.id, title: decTitle, value: decValue, created_at: entry.created_at }
          } catch {
            return {
              id: entry.id,
              title: '⚠ Decryption failed',
              value: '⚠ Wrong password or corrupted data',
              created_at: entry.created_at,
            }
          }
        })
      )

      setEntries(decrypted)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load vault'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [masterPassword])

  useEffect(() => {
    fetchAndDecrypt()
  }, [fetchAndDecrypt])

  const toggleReveal = (id: string) => {
    setRevealedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const copyToClipboard = async (id: string, value: string) => {
    await navigator.clipboard.writeText(value)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const deleteEntry = async (id: string) => {
    setDeletingId(id)
    try {
      await supabase.from('vault').delete().eq('id', id)
      setEntries((prev) => prev.filter((e) => e.id !== id))
    } finally {
      setDeletingId(null)
    }
  }

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  return (
    <div className="min-h-screen bg-[#0a0a0f] relative overflow-hidden">
      {/* Ambient glows */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-violet-600/8 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-indigo-500/6 blur-[100px] pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 border-b border-white/5 bg-[#0a0a0f]/80 backdrop-blur-xl sticky top-0">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600">
              <KeyRound className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="text-white font-semibold text-sm">SecurePass</span>
              <span className="ml-2 text-xs text-white/30">Vault</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchAndDecrypt}
              className="flex items-center justify-center w-8 h-8 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/5 transition-all"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <Button
              id="add-entry-btn"
              onClick={() => setShowAdd(true)}
              className="h-8 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-semibold px-3 border-0 shadow-md shadow-violet-500/20 transition-all"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Add Entry
            </Button>
            <Button
              id="lock-btn"
              onClick={onLock}
              className="h-8 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-xs px-3 transition-all"
            >
              <Lock className="w-3.5 h-3.5 mr-1" />
              Lock
            </Button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="relative z-10 max-w-4xl mx-auto px-4 py-8">
        {/* Stats bar */}
        <div className="flex items-center gap-4 mb-8">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/5">
            <Shield className="w-3.5 h-3.5 text-violet-400" />
            <span className="text-xs text-white/50">
              <span className="text-white font-medium">{entries.length}</span> encrypted entries
            </span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-emerald-400/80">AES-256-GCM active</span>
          </div>
        </div>

        {/* States */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-10 h-10 rounded-full border-2 border-violet-500/30 border-t-violet-500 animate-spin" />
            <p className="text-sm text-white/30">Decrypting vault entries...</p>
          </div>
        )}

        {!loading && error && (
          <div className="flex items-center gap-3 p-4 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {!loading && !error && entries.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl border border-white/10 bg-white/5">
              <KeyRound className="w-7 h-7 text-white/20" />
            </div>
            <div className="text-center">
              <p className="text-white/40 text-sm font-medium">Your vault is empty</p>
              <p className="text-white/20 text-xs mt-1">Add your first encrypted entry</p>
            </div>
            <Button
              id="add-first-entry-btn"
              onClick={() => setShowAdd(true)}
              className="h-9 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-sm font-semibold px-4 border-0"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Add First Entry
            </Button>
          </div>
        )}

        {!loading && !error && entries.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2">
            {entries.map((entry) => {
              const isRevealed = revealedIds.has(entry.id)
              const isCopied = copiedId === entry.id
              const isDeleting = deletingId === entry.id
              const isFailed = entry.title.startsWith('⚠')

              return (
                <div
                  key={entry.id}
                  className={`group rounded-xl border p-4 transition-all ${
                    isFailed
                      ? 'border-red-500/20 bg-red-500/5'
                      : 'border-white/8 bg-white/4 hover:border-white/15 hover:bg-white/6'
                  }`}
                >
                  {/* Card header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`flex items-center justify-center w-8 h-8 rounded-lg shrink-0 ${
                        isFailed ? 'bg-red-500/20' : 'bg-violet-500/15'
                      }`}>
                        <KeyRound className={`w-4 h-4 ${isFailed ? 'text-red-400' : 'text-violet-400'}`} />
                      </div>
                      <div className="min-w-0">
                        <p className={`text-sm font-medium truncate ${isFailed ? 'text-red-400' : 'text-white'}`}>
                          {entry.title}
                        </p>
                        <p className="text-xs text-white/25">{formatDate(entry.created_at)}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => deleteEntry(entry.id)}
                      disabled={isDeleting}
                      className="opacity-0 group-hover:opacity-100 ml-2 shrink-0 flex items-center justify-center w-7 h-7 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-30"
                    >
                      {isDeleting ? (
                        <div className="w-3.5 h-3.5 border border-current border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  {/* Value row */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 font-mono text-xs bg-black/30 rounded-lg px-3 py-2 min-w-0 border border-white/5">
                      <span className={`block truncate ${isFailed ? 'text-red-400/70' : 'text-white/70'}`}>
                        {isRevealed ? entry.value : '•'.repeat(Math.min(entry.value.length, 20))}
                      </span>
                    </div>

                    {!isFailed && (
                      <>
                        <button
                          onClick={() => toggleReveal(entry.id)}
                          className="flex items-center justify-center w-8 h-8 rounded-lg border border-white/8 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white/80 transition-all"
                          title={isRevealed ? 'Hide' : 'Reveal'}
                        >
                          {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => copyToClipboard(entry.id, entry.value)}
                          className={`flex items-center justify-center w-8 h-8 rounded-lg border transition-all ${
                            isCopied
                              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                              : 'border-white/8 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white/80'
                          }`}
                          title="Copy"
                        >
                          {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* Add entry dialog */}
      {showAdd && (
        <AddEntryDialog
          masterPassword={masterPassword}
          onSuccess={fetchAndDecrypt}
          onClose={() => setShowAdd(false)}
        />
      )}
    </div>
  )
}
