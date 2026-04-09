import { NextRequest, NextResponse } from 'next/server'
import { createHash, createCipheriv, createDecipheriv, randomBytes } from 'crypto'
import { supabase } from '@/lib/supabase'

const ALGORITHM = 'aes-256-gcm'

/** Derive a fixed 32-byte key from ENCRYPTION_KEY env var */
function getKey(): Buffer {
  const secret = process.env.ENCRYPTION_KEY
  if (!secret) throw new Error('ENCRYPTION_KEY is not set in environment')
  return createHash('sha256').update(secret).digest()
}

/** Encrypt plaintext → "ivHex:authTagHex:ciphertextHex" */
function encrypt(plaintext: string): string {
  const key = getKey()
  const iv = randomBytes(12) // 96-bit IV for AES-GCM
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`
}

/** Decrypt "ivHex:authTagHex:ciphertextHex" → plaintext */
function decrypt(ciphertext: string): string {
  const key = getKey()
  const parts = ciphertext.split(':')
  if (parts.length !== 3) throw new Error('invalid format')
  const [ivHex, authTagHex, dataHex] = parts
  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(authTagHex, 'hex')
  const data = Buffer.from(dataHex, 'hex')
  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()])
  return decrypted.toString('utf8')
}

// GET /api/vault — fetch all entries and decrypt them
export async function GET() {
  const { data, error } = await supabase
    .from('vault')
    .select('id, title, value, created_at')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const decrypted = (data ?? []).map((row: { id: string; title: string; value: string; created_at: string }) => {
    let decTitle = row.title
    let decValue = row.value
    let encrypted = false

    try {
      decTitle = decrypt(row.title)
      decValue = decrypt(row.value)
      encrypted = true
    } catch {
      // Entry not encrypted (legacy/plain row) — return as-is
    }

    return {
      id: row.id,
      title: decTitle,
      value: decValue,
      encrypted,
      created_at: row.created_at,
    }
  })

  return NextResponse.json(decrypted)
}

// POST /api/vault — encrypt and insert a new entry
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { title, value } = body

  if (!title?.trim() || !value?.trim()) {
    return NextResponse.json({ error: 'title and value are required' }, { status: 400 })
  }

  const encryptedTitle = encrypt(title.trim())
  const encryptedValue = encrypt(value.trim())

  const { data, error } = await supabase
    .from('vault')
    .insert({ title: encryptedTitle, value: encryptedValue })
    .select('id, created_at')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    id: data.id,
    title: title.trim(),
    value: value.trim(),
    encrypted: true,
    created_at: data.created_at,
  })
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { error } = await supabase.from('vault').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
