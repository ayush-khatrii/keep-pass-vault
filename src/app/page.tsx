'use client'

import { useEffect, useState, useTransition } from 'react'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Eye, EyeOff, Copy, Check, Trash2, Plus, RefreshCw, ShieldCheck, ShieldAlert } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { ModeToggle } from "@/components/mode-toggle"

interface VaultRow {
  id: string
  title: string
  value: string
  encrypted: boolean
  created_at: string
}

export default function Page() {
  const [rows, setRows] = useState<VaultRow[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState('')

  // form
  const [title, setTitle] = useState('')
  const [value, setValue] = useState('')
  const [formError, setFormError] = useState('')
  const [isPending, startTransition] = useTransition()

  // per-row visibility
  const [revealed, setRevealed] = useState<Set<string>>(new Set())
  const [copied, setCopied] = useState<string | null>(null)

  async function fetchData() {
    setLoading(true)
    setFetchError('')
    try {
      const res = await fetch('/api/vault')
      if (!res.ok) throw new Error(await res.text())
      setRows(await res.json())
    } catch (e: unknown) {
      setFetchError(e instanceof Error ? e.message : 'Failed to fetch')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  function toggleReveal(id: string) {
    setRevealed(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function copyValue(id: string, val: string) {
    await navigator.clipboard.writeText(val)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  function handleAdd() {
    setFormError('')
    if (!title.trim() || !value.trim()) {
      setFormError('Both title and value are required.')
      return
    }
    startTransition(async () => {
      try {
        const res = await fetch('/api/vault', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, value }),
        })
        if (!res.ok) {
          const data = await res.json()
          setFormError(data.error ?? 'Failed to save')
          return
        }
        const newRow: VaultRow = await res.json()
        setRows(prev => [newRow, ...prev])
        setTitle('')
        setValue('')
      } catch (e: unknown) {
        setFormError(e instanceof Error ? e.message : 'Error')
      }
    })
  }

  async function handleDelete(id: string) {
    await fetch(`/api/vault?id=${id}`, { method: 'DELETE' })
    setRows(prev => prev.filter(r => r.id !== id))
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  }

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">KeepPass Vault</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Entries are encrypted with AES-256-GCM on the server before storage.
            </p>
          </div>
          <ModeToggle />
        </div>

        {/* Add entry */}
        <Card>
          <CardHeader className="">
            <CardTitle className="text-base">
            </CardTitle>
            <CardDescription className="text-xs">
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3 items-end">
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="vault-title" className="text-xs">Title</Label>
                <Input
                  id="vault-title"
                  placeholder="e.g. GitHub, Gmail..."
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAdd()}
                  className="h-9"
                />
              </div>
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="vault-value" className="text-xs">Value / Password</Label>
                <Input
                  id="vault-value"
                  type="password"
                  placeholder="Secret value"
                  value={value}
                  onChange={e => setValue(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAdd()}
                  className="h-9"
                />
              </div>
              <Button
                id="add-vault-btn"
                onClick={handleAdd}
                disabled={isPending}
                size="sm"
                className="h-9 shrink-0"
              >
                {isPending ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" />
                ) : (
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                )}
                {isPending ? 'Saving...' : 'Add'}
              </Button>
            </div>
            {formError && (
              <p className="mt-2 text-xs text-destructive">{formError}</p>
            )}
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Stored Entries</CardTitle>
              <CardDescription className="text-xs">{rows.length} encrypted record{rows.length !== 1 ? 's' : ''}</CardDescription>
            </div>
            <Button
              id="refresh-btn"
              variant="outline"
              size="sm"
              onClick={fetchData}
              disabled={loading}
              className="h-8"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {fetchError && (
              <p className="px-6 py-4 text-sm text-destructive">{fetchError}</p>
            )}

            {!fetchError && (
              <Table className='px-10'>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[180px]">Title</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead className="w-[48px] text-center">Enc</TableHead>
                    <TableHead className="w-[160px]">Created</TableHead>
                    <TableHead className="w-[80px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className='px-10'>
                  {loading && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-10 text-muted-foreground text-sm">
                        <RefreshCw className="w-4 h-4 animate-spin inline mr-2" />
                        Loading...
                      </TableCell>
                    </TableRow>
                  )}

                  {!loading && rows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-10 text-muted-foreground text-sm">
                        No entries yet. Add one above.
                      </TableCell>
                    </TableRow>
                  )}

                  {!loading && rows.map(row => {
                    const isRevealed = revealed.has(row.id)
                    const isCopied = copied === row.id

                    return (
                      <TableRow key={row.id}>
                        {/* Title */}
                        <TableCell className="font-medium text-sm">
                          {row.title}
                        </TableCell>

                        {/* Value */}
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm text-muted-foreground">
                              {isRevealed ? row.value : '•'.repeat(Math.min(row.value.length, 16))}
                            </span>
                          </div>
                        </TableCell>

                        {/* Encrypted badge */}
                        <TableCell className="text-center">
                          {row.encrypted ? (
                            <ShieldCheck className="w-4 h-4 text-green-500 inline" />
                          ) : (
                            <span title="Not encrypted (legacy plain-text row)">
                              <ShieldAlert className="w-4 h-4 text-amber-500 inline" />
                            </span>
                          )}
                        </TableCell>

                        {/* Date */}
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDate(row.created_at)}
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => toggleReveal(row.id)}
                              title={isRevealed ? 'Hide' : 'Reveal'}
                              className="h-7 w-7"
                            >
                              {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => copyValue(row.id, row.value)}
                              title="Copy value"
                              className={`h-7 w-7 ${isCopied ? 'text-green-500' : ''}`}
                            >
                              {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger
                                render={<Button variant="ghost" size="icon-sm" title="Delete" className="h-7 w-7 text-muted-foreground hover:text-destructive" />}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete the entry '{row.title}' from your vault.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(row.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  )
}