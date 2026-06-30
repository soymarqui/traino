// Consulta ad-hoc a Supabase via Management API (imprime todo).
// Uso: node scripts/q.mjs "select ..."
import { readFileSync } from 'node:fs'

const PROJECT_REF = 'kezmmygyeovmuripgssl'
const token = readFileSync(new URL('../.supabase_pat', import.meta.url), 'utf8').trim()
const sql = process.argv[2]

const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: sql }),
})
const text = await res.text()
console.log(res.status)
try {
  console.log(JSON.stringify(JSON.parse(text), null, 2))
} catch {
  console.log(text)
}
process.exit(res.ok ? 0 : 1)
