import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
console.log("URL:", url)
console.log("KEY:", key)
export const supabase = createClient(url, key)

export type VaultEntry = {
  id: string
  title: string   // encrypted base64
  value: string   // encrypted base64
  created_at: string
}
